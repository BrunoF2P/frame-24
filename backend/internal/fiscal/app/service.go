package app

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/fiscal/domain"
	"frame-24/internal/fiscal/repo"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/outbox"
)

type SaleTicketInput struct {
	TicketID    uuid.UUID
	Description string
	UnitPrice   float64
	Quantity    float64
}

type SaleConcessionInput struct {
	ItemID      uuid.UUID
	ItemType    string // product, combo_item
	Description string
	NCM         *string
	CEST        *string
	UnitPrice   float64
	Quantity    float64
}

type Service struct {
	pool *pgxpool.Pool
	repo repo.Repository
}

func NewService(pool *pgxpool.Pool, repo repo.Repository) *Service {
	return &Service{
		pool: pool,
		repo: repo,
	}
}

// ConfigureFiscalProfile cadastra ou atualiza os parâmetros de emissão fiscal do complexo
func (s *Service) ConfigureFiscalProfile(
	ctx context.Context,
	tenantID, complexID uuid.UUID,
	env domain.FiscalEnvironment,
	regime domain.TaxRegime,
	nfceSeries int,
	cscID string,
	cscToken *string,
	nfseSeries string,
	cnae string,
	issRate float64,
) (*domain.FiscalProfile, error) {
	profile, err := s.repo.GetFiscalProfileByComplexID(ctx, tenantID, complexID)
	if err != nil {
		profile, err = domain.NewFiscalProfile(tenantID, complexID, env, regime, nfceSeries, cscID, cscToken, nfseSeries, cnae, issRate)
		if err != nil {
			return nil, err
		}
		err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
			return s.repo.CreateFiscalProfile(ctx, tx, profile)
		})
		if err != nil {
			return nil, err
		}
		return profile, nil
	}

	profile.Environment = env
	profile.TaxRegime = regime
	profile.NFCeSeries = nfceSeries
	profile.NFCeCSCID = cscID
	profile.NFCeCSCToken = cscToken
	profile.NFSeSeries = nfseSeries
	profile.CNAE = cnae
	profile.AliquotaISS = issRate
	profile.UpdatedAt = time.Now()

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		return s.repo.UpdateFiscalProfile(ctx, tx, profile)
	})
	if err != nil {
		return nil, err
	}
	return profile, nil
}

// ProcessSaleCompleted processa a emissão fiscal dual (Ingressos -> NFS-e / Bomboniere -> NFC-e) com Reforma Tributária
func (s *Service) ProcessSaleCompleted(
	ctx context.Context,
	tenantID, complexID, saleID uuid.UUID,
	tickets []SaleTicketInput,
	concessionItems []SaleConcessionInput,
) ([]domain.FiscalDocument, error) {
	var documents []domain.FiscalDocument
	now := time.Now()

	err := db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		profile, err := s.repo.GetFiscalProfileByComplexIDForUpdate(ctx, tx, tenantID, complexID)
		if err != nil {
			// Se perfil não existe ainda, cria um padrão em homologação
			profile, err = domain.NewFiscalProfile(
				tenantID, complexID, domain.FiscalEnvHomologation, domain.TaxRegimeLucroPresumido,
				1, "000001", nil, "1", "5914-6/00", 5.00,
			)
			if err != nil {
				return err
			}
			if err := s.repo.CreateFiscalProfile(ctx, tx, profile); err != nil {
				return err
			}
		}

		// 1. Emissão de NFS-e para Ingressos de Cinema (ISS LC 116 12.01)
		// Ignora emissão caso a soma de ingressos seja R$ 0,00 (cortesia integral - prefeituras rejeitam RPS zero)
		totalTicketAmount := 0.0
		for _, tk := range tickets {
			totalTicketAmount += tk.UnitPrice * tk.Quantity
		}

		if len(tickets) > 0 && totalTicketAmount > 0.009 {
			nfseNumber := profile.NextNFSeNumber()
			doc, err := domain.NewFiscalDocument(tenantID, complexID, saleID, domain.DocTypeNFSe, profile.NFSeSeries, nfseNumber)
			if err != nil {
				return err
			}

			for _, tk := range tickets {
				totalItemPrice := tk.UnitPrice * tk.Quantity
				taxRes := domain.CalculateItemTaxes("ticket", totalItemPrice, profile.TaxRegime, now, profile.AliquotaISS)

				doc.ISSAmount += taxRes.ISSAmount
				doc.PISAmount += taxRes.PISAmount
				doc.COFINSAmount += taxRes.COFINSAmount
				// Alíquotas CBS/IBS são por regime tributário (constantes por documento).
				// Usar max() para não sobrescrever com valor menor em caso de futuras alíquotas mistas.
				if taxRes.CBSRate > doc.CBSAliquot {
					doc.CBSAliquot = taxRes.CBSRate
				}
				if taxRes.IBSRate > doc.IBSAliquot {
					doc.IBSAliquot = taxRes.IBSRate
				}

				doc.AddItem(domain.FiscalDocumentItem{
					ItemType:     "ticket",
					ReferenceID:  &tk.TicketID,
					Description:  tk.Description,
					CFOP:         taxRes.CFOP,
					Unit:         "UN",
					Quantity:     tk.Quantity,
					UnitPrice:    tk.UnitPrice,
					TotalPrice:   totalItemPrice,
					CSTPISCOFINS: &taxRes.CSTPISCOFINS,
					CSTCBSIBS:    &taxRes.CSTCBSIBS,
					CBSRate:      taxRes.CBSRate,
					CBSAmount:    taxRes.CBSAmount,
					IBSRate:      taxRes.IBSRate,
					IBSAmount:    taxRes.IBSAmount,
				})
			}

			// Simular autorização de NFS-e (em produção via Gateway Fiscal)
			protocol := fmt.Sprintf("PROTO-NFSE-%d", nfseNumber)
			xml := fmt.Sprintf("<nfse><numero>%d</numero><valor>%.2f</valor></nfse>", nfseNumber, doc.TotalAmount)
			pdfURL := fmt.Sprintf("https://fiscal.frame24.internal/nfse/%s.pdf", doc.ID.String())
			doc.Authorize("", protocol, xml, pdfURL, "")

			if err := s.repo.CreateFiscalDocument(ctx, tx, doc); err != nil {
				return err
			}
			documents = append(documents, *doc)
		}

		// 2. Emissão de NFC-e para Mercadorias da Bomboniere (ICMS Modelo 65)
		if len(concessionItems) > 0 {
			nfceNumber := profile.NextNFCeNumber()
			doc, err := domain.NewFiscalDocument(tenantID, complexID, saleID, domain.DocTypeNFCe, fmt.Sprintf("%d", profile.NFCeSeries), nfceNumber)
			if err != nil {
				return err
			}

			for _, it := range concessionItems {
				totalItemPrice := it.UnitPrice * it.Quantity
				taxRes := domain.CalculateItemTaxes(it.ItemType, totalItemPrice, profile.TaxRegime, now, profile.AliquotaISS)

				doc.ICMSAmount += taxRes.ICMSAmount
				doc.PISAmount += taxRes.PISAmount
				doc.COFINSAmount += taxRes.COFINSAmount
				// Alíquotas CBS/IBS são constantes por regime tributário (max para robustez futura)
				if taxRes.CBSRate > doc.CBSAliquot {
					doc.CBSAliquot = taxRes.CBSRate
				}
				if taxRes.IBSRate > doc.IBSAliquot {
					doc.IBSAliquot = taxRes.IBSRate
				}

				doc.AddItem(domain.FiscalDocumentItem{
					ItemType:     it.ItemType,
					ReferenceID:  &it.ItemID,
					Description:  it.Description,
					NCM:          it.NCM,
					CEST:         it.CEST,
					CFOP:         taxRes.CFOP,
					Unit:         "UN",
					Quantity:     it.Quantity,
					UnitPrice:    it.UnitPrice,
					TotalPrice:   totalItemPrice,
					CSTICMS:      &taxRes.CSTICMS,
					CSTPISCOFINS: &taxRes.CSTPISCOFINS,
					CSTCBSIBS:    &taxRes.CSTCBSIBS,
					CBSRate:      taxRes.CBSRate,
					CBSAmount:    taxRes.CBSAmount,
					IBSRate:      taxRes.IBSRate,
					IBSAmount:    taxRes.IBSAmount,
				})
			}

			// Chave de Acesso de 44 dígitos da NFC-e (modelo 65)
			accessKey := generateAccessKey("35", now, "65", profile.NFCeSeries, nfceNumber)
			protocol := fmt.Sprintf("PROTO-NFCE-%d", nfceNumber)
			xml := fmt.Sprintf("<nfeProc><chNFe>%s</chNFe><vNF>%.2f</vNF></nfeProc>", accessKey, doc.TotalAmount)
			pdfURL := fmt.Sprintf("https://fiscal.frame24.internal/danfe/%s.pdf", accessKey)
			qrCodeURL := fmt.Sprintf("https://sefaz.sp.gov.br/nfce/qrcode?p=%s", accessKey)
			doc.Authorize(accessKey, protocol, xml, pdfURL, qrCodeURL)

			if err := s.repo.CreateFiscalDocument(ctx, tx, doc); err != nil {
				return err
			}
			documents = append(documents, *doc)
		}

		// Atualizar números sequenciais do perfil emissor
		if err := s.repo.UpdateFiscalProfile(ctx, tx, profile); err != nil {
			return err
		}

		// Emitir evento outbox para cada documento
		for _, doc := range documents {
			_ = outbox.InsertEvent(ctx, tx, tenantID, "fiscal.document.emitted", doc.ID, map[string]any{
				"documentId":  doc.ID,
				"saleId":      saleID,
				"docType":     doc.DocType,
				"series":      doc.Series,
				"number":      doc.Number,
				"accessKey":   doc.AccessKey,
				"totalAmount": doc.TotalAmount,
			})
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return documents, nil
}

// CancelFiscalSale aplica a regra SEFAZ de cancelamento: <= 30 min (cancelamento direto) vs > 30 min (NF-e de Devolução CFOP 1.202)
func (s *Service) CancelFiscalSale(
	ctx context.Context,
	tenantID, complexID, saleID uuid.UUID,
	reason string,
) ([]domain.FiscalDocument, error) {
	var processedDocs []domain.FiscalDocument

	err := db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		docs, err := s.repo.ListFiscalDocumentsBySale(ctx, tenantID, saleID)
		if err != nil {
			return err
		}
		if len(docs) == 0 {
			return domain.ErrFiscalDocumentNotFound
		}

		profile, err := s.repo.GetFiscalProfileByComplexIDForUpdate(ctx, tx, tenantID, complexID)
		if err != nil {
			return err
		}

		now := time.Now()
		for _, doc := range docs {
			if doc.Status == domain.DocStatusCancelled || doc.Status == domain.DocStatusRefunded {
				continue
			}

			if doc.DocType == domain.DocTypeNFCe {
				emittedAt := now
				if doc.EmittedAt != nil {
					emittedAt = *doc.EmittedAt
				}
				elapsedMinutes := now.Sub(emittedAt).Minutes()

				if elapsedMinutes <= 30.0 {
					// 1. Cancelamento Direto SEFAZ (dentro de 30 minutos)
					if err := doc.Cancel(reason); err != nil {
						return err
					}
					if err := s.repo.UpdateFiscalDocument(ctx, tx, &doc); err != nil {
						return err
					}
					_ = outbox.InsertEvent(ctx, tx, tenantID, "fiscal.document.cancelled", doc.ID, map[string]any{
						"documentId": doc.ID,
						"saleId":     saleID,
						"reason":     reason,
					})
					processedDocs = append(processedDocs, doc)
				} else {
					// 2. Cancelamento Extemporâneo (> 30 min): Emissão de NF-e de Devolução/Estorno de Entrada (CFOP 1.202)
					doc.Status = domain.DocStatusRefunded
					if err := s.repo.UpdateFiscalDocument(ctx, tx, &doc); err != nil {
						return err
					}

					devNumber := profile.NextNFeDevolutionNumber()
					devSeries := profile.NFeDevolutionSeries
					devDoc, err := domain.NewFiscalDocument(tenantID, complexID, saleID, domain.DocTypeNFeDevolution, fmt.Sprintf("%d", devSeries), devNumber)
					if err != nil {
						return err
					}
					devDoc.ReferencedAccessKey = doc.AccessKey
					devDoc.TotalAmount = doc.TotalAmount
					devDoc.ICMSAmount = doc.ICMSAmount

					devKey := generateAccessKey("35", now, "55", devSeries, devNumber)
					protocol := fmt.Sprintf("PROTO-DEV-%d", devNumber)
					xml := fmt.Sprintf("<nfeProc><chNFe>%s</chNFe><refNFe>%s</refNFe></nfeProc>", devKey, *doc.AccessKey)
					devDoc.Authorize(devKey, protocol, xml, "", "")

					if err := s.repo.CreateFiscalDocument(ctx, tx, devDoc); err != nil {
						return err
					}
					_ = outbox.InsertEvent(ctx, tx, tenantID, "fiscal.document.devolution_emitted", devDoc.ID, map[string]any{
						"devolutionDocumentId": devDoc.ID,
						"originalAccessKey":    doc.AccessKey,
						"saleId":               saleID,
						"reason":               reason,
					})
					processedDocs = append(processedDocs, *devDoc)
				}
			} else if doc.DocType == domain.DocTypeNFSe {
				// NFS-e de Serviços: Cancelamento municipal
				if err := doc.Cancel(reason); err != nil {
					return err
				}
				if err := s.repo.UpdateFiscalDocument(ctx, tx, &doc); err != nil {
					return err
				}
				_ = outbox.InsertEvent(ctx, tx, tenantID, "fiscal.document.cancelled", doc.ID, map[string]any{
					"documentId": doc.ID,
					"saleId":     saleID,
					"reason":     reason,
				})
				processedDocs = append(processedDocs, doc)
			}
		}

		return s.repo.UpdateFiscalProfile(ctx, tx, profile)
	})

	if err != nil {
		return nil, err
	}
	return processedDocs, nil
}

func generateAccessKey(uf string, date time.Time, model string, series int, number int64) string {
	n, _ := rand.Int(rand.Reader, big.NewInt(89999999))
	randCode := n.Int64() + 10000000
	dateStr := date.Format("0601") // AAMM
	rawKey := fmt.Sprintf("%s%s00000000000000%s%03d%09d1%08d", uf, dateStr, model, series, number, randCode)
	dv := calculateDV(rawKey[:43])
	return fmt.Sprintf("%s%d", rawKey[:43], dv)
}

func calculateDV(key string) int {
	weights := []int{2, 3, 4, 5, 6, 7, 8, 9}
	sum := 0
	wIdx := 0
	for i := len(key) - 1; i >= 0; i-- {
		digit := int(key[i] - '0')
		sum += digit * weights[wIdx%len(weights)]
		wIdx++
	}
	rem := sum % 11
	if rem == 0 || rem == 1 {
		return 0
	}
	return 11 - rem
}
