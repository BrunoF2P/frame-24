package app

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"frame-24/internal/fiscal/domain"
)

type FakeFiscalRepo struct {
	profiles  map[uuid.UUID]*domain.FiscalProfile
	documents map[uuid.UUID]*domain.FiscalDocument
}

func NewFakeFiscalRepo() *FakeFiscalRepo {
	return &FakeFiscalRepo{
		profiles:  make(map[uuid.UUID]*domain.FiscalProfile),
		documents: make(map[uuid.UUID]*domain.FiscalDocument),
	}
}

func (f *FakeFiscalRepo) CreateFiscalProfile(ctx context.Context, tx pgx.Tx, p *domain.FiscalProfile) error {
	f.profiles[p.ComplexID] = p
	return nil
}

func (f *FakeFiscalRepo) GetFiscalProfileByComplexID(ctx context.Context, tenantID, complexID uuid.UUID) (*domain.FiscalProfile, error) {
	if p, ok := f.profiles[complexID]; ok {
		return p, nil
	}
	return nil, domain.ErrFiscalProfileNotFound
}

func (f *FakeFiscalRepo) GetFiscalProfileByComplexIDForUpdate(ctx context.Context, tx pgx.Tx, tenantID, complexID uuid.UUID) (*domain.FiscalProfile, error) {
	return f.GetFiscalProfileByComplexID(ctx, tenantID, complexID)
}

func (f *FakeFiscalRepo) UpdateFiscalProfile(ctx context.Context, tx pgx.Tx, p *domain.FiscalProfile) error {
	f.profiles[p.ComplexID] = p
	return nil
}

func (f *FakeFiscalRepo) CreateFiscalDocument(ctx context.Context, tx pgx.Tx, d *domain.FiscalDocument) error {
	f.documents[d.ID] = d
	return nil
}

func (f *FakeFiscalRepo) GetFiscalDocumentByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.FiscalDocument, error) {
	if d, ok := f.documents[id]; ok {
		return d, nil
	}
	return nil, domain.ErrFiscalDocumentNotFound
}

func (f *FakeFiscalRepo) GetFiscalDocumentBySaleAndType(ctx context.Context, tenantID, saleID uuid.UUID, docType domain.DocumentType) (*domain.FiscalDocument, error) {
	for _, d := range f.documents {
		if d.SaleID == saleID && d.DocType == docType {
			return d, nil
		}
	}
	return nil, domain.ErrFiscalDocumentNotFound
}

func (f *FakeFiscalRepo) ListFiscalDocumentsBySale(ctx context.Context, tenantID, saleID uuid.UUID) ([]domain.FiscalDocument, error) {
	var list []domain.FiscalDocument
	for _, d := range f.documents {
		if d.SaleID == saleID {
			list = append(list, *d)
		}
	}
	return list, nil
}

func (f *FakeFiscalRepo) UpdateFiscalDocument(ctx context.Context, tx pgx.Tx, d *domain.FiscalDocument) error {
	f.documents[d.ID] = d
	return nil
}

func TestFiscalService_DualEmissionWithTaxReform(t *testing.T) {
	repo := NewFakeFiscalRepo()
	svc := NewService(nil, repo)
	tenantID := uuid.New()
	complexID := uuid.New()
	saleID := uuid.New()
	ctx := context.Background()

	// 1. Configurar Perfil Fiscal do Cinema
	profile, err := svc.ConfigureFiscalProfile(
		ctx, tenantID, complexID, domain.FiscalEnvHomologation, domain.TaxRegimeLucroPresumido,
		1, "000001", nil, "1", "5914-6/00", 5.00,
	)
	require.NoError(t, err)
	assert.Equal(t, domain.TaxRegimeLucroPresumido, profile.TaxRegime)

	// 2. Venda combinada: 2 Ingressos (R$ 60) + 1 Pipoca (R$ 25)
	ticketID1 := uuid.New()
	ticketID2 := uuid.New()
	concessionID := uuid.New()
	ncm := "1904.10.00"

	tickets := []SaleTicketInput{
		{TicketID: ticketID1, Description: "Ingresso Inteira", UnitPrice: 30.0, Quantity: 1},
		{TicketID: ticketID2, Description: "Ingresso Meia", UnitPrice: 30.0, Quantity: 1},
	}
	concessionItems := []SaleConcessionInput{
		{ItemID: concessionID, ItemType: "product", Description: "Pipoca Grande Salgada", NCM: &ncm, UnitPrice: 25.0, Quantity: 1},
	}

	docs, err := svc.ProcessSaleCompleted(ctx, tenantID, complexID, saleID, tickets, concessionItems)
	require.NoError(t, err)

	// Devem ser emitidos 2 documentos fiscais (Separação Dual)
	assert.Len(t, docs, 2)

	var nfseDoc, nfceDoc *domain.FiscalDocument
	for i := range docs {
		if docs[i].DocType == domain.DocTypeNFSe {
			nfseDoc = &docs[i]
		} else if docs[i].DocType == domain.DocTypeNFCe {
			nfceDoc = &docs[i]
		}
	}

	require.NotNil(t, nfseDoc, "NFS-e de ingressos deve ser gerada")
	require.NotNil(t, nfceDoc, "NFC-e de bomboniere deve ser gerada")

	// Validar NFS-e (Ingressos)
	assert.Equal(t, 60.00, nfseDoc.TotalAmount)
	assert.Equal(t, 3.00, nfseDoc.ISSAmount) // 5% de R$ 60,00
	assert.Equal(t, domain.DocStatusAuthorized, nfseDoc.Status)

	// Validar NFC-e (Bomboniere)
	assert.Equal(t, 25.00, nfceDoc.TotalAmount)
	assert.Equal(t, 4.50, nfceDoc.ICMSAmount) // 18% de R$ 25,00
	assert.NotEmpty(t, *nfceDoc.AccessKey)
	assert.Len(t, *nfceDoc.AccessKey, 44) // Chave SEFAZ 44 dígitos
}

func TestFiscalService_SefazCancellationRules(t *testing.T) {
	repo := NewFakeFiscalRepo()
	svc := NewService(nil, repo)
	tenantID := uuid.New()
	complexID := uuid.New()
	ctx := context.Background()

	_, err := svc.ConfigureFiscalProfile(
		ctx, tenantID, complexID, domain.FiscalEnvHomologation, domain.TaxRegimeLucroPresumido,
		1, "000001", nil, "1", "5914-6/00", 5.00,
	)
	require.NoError(t, err)

	// Caso A: Cancelamento dentro da janela de 30 minutos (Cancelamento Direto)
	saleA := uuid.New()
	concessionA := []SaleConcessionInput{
		{ItemID: uuid.New(), ItemType: "product", Description: "Refrigerante", UnitPrice: 10.0, Quantity: 1},
	}
	docsA, err := svc.ProcessSaleCompleted(ctx, tenantID, complexID, saleA, nil, concessionA)
	require.NoError(t, err)
	require.Len(t, docsA, 1)

	cancelledDocsA, err := svc.CancelFiscalSale(ctx, tenantID, complexID, saleA, "Cliente desistiu antes da sessao")
	require.NoError(t, err)
	require.Len(t, cancelledDocsA, 1)
	assert.Equal(t, domain.DocStatusCancelled, cancelledDocsA[0].Status)
	assert.Equal(t, domain.DocTypeNFCe, cancelledDocsA[0].DocType)

	// Caso B: Cancelamento extemporâneo após 30 minutos (> 30 min)
	saleB := uuid.New()
	concessionB := []SaleConcessionInput{
		{ItemID: uuid.New(), ItemType: "product", Description: "Pipoca", UnitPrice: 20.0, Quantity: 1},
	}
	docsB, err := svc.ProcessSaleCompleted(ctx, tenantID, complexID, saleB, nil, concessionB)
	require.NoError(t, err)
	require.Len(t, docsB, 1)

	// Forçar data de emissão para 45 minutos atrás
	docBInRepo := repo.documents[docsB[0].ID]
	pastTime := time.Now().Add(-45 * time.Minute)
	docBInRepo.EmittedAt = &pastTime

	devolutionDocs, err := svc.CancelFiscalSale(ctx, tenantID, complexID, saleB, "Devolucao tardia")
	require.NoError(t, err)
	require.Len(t, devolutionDocs, 1)
	// Deve ter sido emitida uma NF-e de Devolução (modelo 55, CFOP 1.202)
	assert.Equal(t, domain.DocTypeNFeDevolution, devolutionDocs[0].DocType)
	assert.Equal(t, domain.DocStatusAuthorized, devolutionDocs[0].Status)
	// E o documento original deve ter sido marcado como refunded
	docBAfter, err := repo.GetFiscalDocumentByID(ctx, tenantID, docsB[0].ID)
	require.NoError(t, err)
	assert.Equal(t, domain.DocStatusRefunded, docBAfter.Status)
}
