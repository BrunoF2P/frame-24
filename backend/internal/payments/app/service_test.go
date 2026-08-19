package app

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"frame-24/internal/payments/domain"
)

type FakePaymentsRepo struct {
	attempts map[string]*domain.PaymentAttempt
	tefTxs   map[string]*domain.TefTransaction
}

func NewFakePaymentsRepo() *FakePaymentsRepo {
	return &FakePaymentsRepo{
		attempts: make(map[string]*domain.PaymentAttempt),
		tefTxs:   make(map[string]*domain.TefTransaction),
	}
}

func (f *FakePaymentsRepo) CreatePaymentAttempt(ctx context.Context, tx pgx.Tx, p *domain.PaymentAttempt) error {
	if _, exists := f.attempts[p.IdempotencyKey]; exists {
		return domain.ErrDuplicateIdempotencyKey
	}
	f.attempts[p.IdempotencyKey] = p
	return nil
}

func (f *FakePaymentsRepo) GetPaymentAttemptByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PaymentAttempt, error) {
	for _, p := range f.attempts {
		if p.ID == id {
			return p, nil
		}
	}
	return nil, domain.ErrPaymentNotFound
}

func (f *FakePaymentsRepo) GetPaymentAttemptByIdempotencyKey(ctx context.Context, tenantID uuid.UUID, key string) (*domain.PaymentAttempt, error) {
	if p, ok := f.attempts[key]; ok {
		return p, nil
	}
	return nil, domain.ErrPaymentNotFound
}

func (f *FakePaymentsRepo) UpdatePaymentAttempt(ctx context.Context, tx pgx.Tx, p *domain.PaymentAttempt) error {
	f.attempts[p.IdempotencyKey] = p
	return nil
}

func (f *FakePaymentsRepo) CreateTefTransaction(ctx context.Context, tx pgx.Tx, t *domain.TefTransaction) error {
	key := t.POSTerminalID + ":" + t.NSU
	f.tefTxs[key] = t
	return nil
}

func (f *FakePaymentsRepo) GetTefTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.TefTransaction, error) {
	for _, t := range f.tefTxs {
		if t.ID == id {
			return t, nil
		}
	}
	return nil, domain.ErrTefTransactionNotFound
}

func (f *FakePaymentsRepo) GetTefTransactionByNSU(ctx context.Context, tenantID uuid.UUID, terminalID, nsu string) (*domain.TefTransaction, error) {
	key := terminalID + ":" + nsu
	if t, ok := f.tefTxs[key]; ok {
		return t, nil
	}
	return nil, domain.ErrTefTransactionNotFound
}

func (f *FakePaymentsRepo) UpdateTefTransaction(ctx context.Context, tx pgx.Tx, t *domain.TefTransaction) error {
	key := t.POSTerminalID + ":" + t.NSU
	f.tefTxs[key] = t
	return nil
}

func TestPaymentsService_PixCreationAndIdempotency(t *testing.T) {
	repo := NewFakePaymentsRepo()
	svc := NewService(nil, repo, nil, nil)
	tenantID := uuid.New()
	saleID := uuid.New()
	ctx := context.Background()

	// 1. Criar tentativa de PIX
	attempt1, err := svc.CreatePixPayment(ctx, tenantID, saleID, "idemp-pix-001", 55.50, "Venda de ingressos")
	require.NoError(t, err)
	assert.Equal(t, domain.PaymentStatusPending, attempt1.Status)
	assert.NotEmpty(t, *attempt1.QRCodePix)

	// 2. Chamada idempotente com a mesma chave -> Retorna o mesmo registro
	attempt2, err := svc.CreatePixPayment(ctx, tenantID, saleID, "idemp-pix-001", 55.50, "Venda de ingressos")
	require.NoError(t, err)
	assert.Equal(t, attempt1.ID, attempt2.ID)

	// 3. Processar Webhook de aprovação do PIX
	approved, err := svc.ProcessWebhook(ctx, tenantID, "idemp-pix-001", *attempt1.ExternalReference, "approved", nil, nil)
	require.NoError(t, err)
	assert.Equal(t, domain.PaymentStatusApproved, approved.Status)
	assert.Equal(t, *attempt1.ExternalReference, *approved.ExternalReference)

	// 4. Webhook duplicado -> Idempotência preservada
	approvedAgain, err := svc.ProcessWebhook(ctx, tenantID, "idemp-pix-001", *attempt1.ExternalReference, "approved", nil, nil)
	require.NoError(t, err)
	assert.Equal(t, domain.PaymentStatusApproved, approvedAgain.Status)
}

func TestPaymentsService_TefLifecycle2PhaseCommit(t *testing.T) {
	repo := NewFakePaymentsRepo()
	svc := NewService(nil, repo, nil, nil)
	tenantID := uuid.New()
	saleID := uuid.New()
	terminalID := "POS-01"
	ctx := context.Background()

	// 1. Fase 1: Autorização TEF no PinPad
	tx1, err := svc.InitiateTef(
		ctx, tenantID, &saleID, terminalID, "001234", "AUTH9988", "Mastercard",
		domain.TefTypeCredit, 1, 80.00, nil, nil,
	)
	require.NoError(t, err)
	assert.Equal(t, domain.TefStatusAuthorized, tx1.Status)

	// 2. Fase 2 (Sucesso): Confirmação TEF (CNC)
	confirmed, err := svc.ConfirmTef(ctx, tenantID, terminalID, "001234")
	require.NoError(t, err)
	assert.Equal(t, domain.TefStatusConfirmed, confirmed.Status)

	// 3. Tentativa de desfazimento após confirmação -> Erro
	_, err = svc.ReverseTef(ctx, tenantID, terminalID, "001234", "Tentativa invalida")
	assert.ErrorIs(t, err, domain.ErrTefAlreadyConfirmed)

	// 4. Teste de Desfazimento (NCN) quando venda é abortada
	tx2, err := svc.InitiateTef(
		ctx, tenantID, &saleID, terminalID, "001235", "AUTH9989", "Visa",
		domain.TefTypeDebit, 1, 30.00, nil, nil,
	)
	require.NoError(t, err)

	reversed, err := svc.ReverseTef(ctx, tenantID, terminalID, "001235", "Timeout impressora")
	require.NoError(t, err)
	assert.Equal(t, domain.TefStatusReversed, reversed.Status)
	assert.Equal(t, tx2.ID, reversed.ID)
}
