package app

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"frame-24/internal/finance/domain"
)

// FakeFinanceRepo em memória para testes unitários
type FakeFinanceRepo struct {
	accounts     map[string]*domain.Account // key: code
	transactions map[uuid.UUID]*domain.Transaction
	sessions     map[uuid.UUID]*domain.CashSession
	movements    []domain.CashMovement
}

func NewFakeFinanceRepo() *FakeFinanceRepo {
	return &FakeFinanceRepo{
		accounts:     make(map[string]*domain.Account),
		transactions: make(map[uuid.UUID]*domain.Transaction),
		sessions:     make(map[uuid.UUID]*domain.CashSession),
		movements:    make([]domain.CashMovement, 0),
	}
}

func (f *FakeFinanceRepo) CreateAccount(ctx context.Context, tx pgx.Tx, acc *domain.Account) error {
	if _, ok := f.accounts[acc.Code]; ok {
		return domain.ErrAccountAlreadyExists
	}
	f.accounts[acc.Code] = acc
	return nil
}

func (f *FakeFinanceRepo) GetAccountByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Account, error) {
	acc, ok := f.accounts[code]
	if !ok {
		return nil, domain.ErrAccountNotFound
	}
	return acc, nil
}

func (f *FakeFinanceRepo) ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]domain.Account, error) {
	var list []domain.Account
	for _, acc := range f.accounts {
		list = append(list, *acc)
	}
	return list, nil
}

func (f *FakeFinanceRepo) CreateStandardAccountsIfMissing(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID) error {
	defaults := domain.GetStandardAccountsTemplate(tenantID)
	for _, acc := range defaults {
		if _, ok := f.accounts[acc.Code]; !ok {
			accCopy := acc
			f.accounts[acc.Code] = &accCopy
		}
	}
	return nil
}

func (f *FakeFinanceRepo) RecordTransaction(ctx context.Context, tx pgx.Tx, t *domain.Transaction) error {
	if err := t.Validate(); err != nil {
		return err
	}
	f.transactions[t.ID] = t
	return nil
}

func (f *FakeFinanceRepo) ListTransactions(ctx context.Context, tenantID uuid.UUID, limit int) ([]domain.Transaction, error) {
	var list []domain.Transaction
	for _, t := range f.transactions {
		list = append(list, *t)
	}
	return list, nil
}

func (f *FakeFinanceRepo) CreateCashSession(ctx context.Context, tx pgx.Tx, s *domain.CashSession) error {
	f.sessions[s.ID] = s
	return nil
}

func (f *FakeFinanceRepo) GetOpenCashSession(ctx context.Context, tenantID, complexID uuid.UUID, posTerminalID string, operatorID uuid.UUID) (*domain.CashSession, error) {
	for _, s := range f.sessions {
		if s.ComplexID == complexID && s.POSTerminalID == posTerminalID && s.OperatorID == operatorID && s.Status == "open" {
			return s, nil
		}
	}
	return nil, nil
}

func (f *FakeFinanceRepo) GetCashSessionByID(ctx context.Context, tenantID, sessionID uuid.UUID) (*domain.CashSession, error) {
	s, ok := f.sessions[sessionID]
	if !ok {
		return nil, domain.ErrCashSessionNotFound
	}
	return s, nil
}

func (f *FakeFinanceRepo) GetCashSessionByIDForUpdate(ctx context.Context, tx pgx.Tx, tenantID, sessionID uuid.UUID) (*domain.CashSession, error) {
	return f.GetCashSessionByID(ctx, tenantID, sessionID)
}

func (f *FakeFinanceRepo) RecordCashMovement(ctx context.Context, tx pgx.Tx, m *domain.CashMovement) error {
	session, ok := f.sessions[m.SessionID]
	if !ok {
		return domain.ErrCashSessionNotFound
	}
	if session.Status != "open" {
		return domain.ErrCashSessionClosed
	}
	f.movements = append(f.movements, *m)
	return nil
}

func (f *FakeFinanceRepo) GetCashMovementsTotals(ctx context.Context, tenantID, sessionID uuid.UUID) (float64, float64, float64, error) {
	var cashSales, deposits, bleeds float64
	for _, m := range f.movements {
		if m.SessionID == sessionID {
			switch m.MovementType {
			case domain.CashMovementCashSale:
				cashSales += m.Amount
			case domain.CashMovementDepositReinforcement:
				deposits += m.Amount
			case domain.CashMovementBleedWithdrawal:
				bleeds += m.Amount
			}
		}
	}
	return cashSales, deposits, bleeds, nil
}

func (f *FakeFinanceRepo) CloseCashSession(ctx context.Context, tx pgx.Tx, s *domain.CashSession) error {
	f.sessions[s.ID] = s
	return nil
}

func TestFinanceService_DoubleEntryLedgerBalance(t *testing.T) {
	repo := NewFakeFinanceRepo()
	svc := NewService(nil, repo)
	tenantID := uuid.New()
	ctx := context.Background()

	// 1. Transação Desbalanceada (Débito R$ 100 / Crédito R$ 80) -> Rejeitada
	_, err := svc.PostLedgerTransaction(ctx, tenantID, "Venda desbalanceada", "sale", nil, []LedgerEntryInput{
		{AccountCode: domain.CodeCaixaPDV, EntryType: "debit", Amount: 100.0},
		{AccountCode: domain.CodeReceitaBilheteria, EntryType: "credit", Amount: 80.0},
	})
	assert.ErrorIs(t, err, domain.ErrUnbalancedTransaction)

	// 2. Transação Balanceada (Débito R$ 100 / Crédito R$ 100) -> Sucesso
	tx, err := svc.PostLedgerTransaction(ctx, tenantID, "Venda equilibrada", "sale", nil, []LedgerEntryInput{
		{AccountCode: domain.CodeCaixaPDV, EntryType: "debit", Amount: 100.0},
		{AccountCode: domain.CodeReceitaBilheteria, EntryType: "credit", Amount: 100.0},
	})
	require.NoError(t, err)
	assert.Len(t, tx.Entries, 2)
}

func TestFinanceService_BlindCloseCashSession(t *testing.T) {
	repo := NewFakeFinanceRepo()
	svc := NewService(nil, repo)
	tenantID := uuid.New()
	complexID := uuid.New()
	operatorID := uuid.New()
	terminalID := "POS-01"
	ctx := context.Background()

	// 1. Abertura de Caixa com Fundo de Troco R$ 200,00
	session, err := svc.OpenCashSession(ctx, tenantID, complexID, terminalID, operatorID, 200.0)
	require.NoError(t, err)
	assert.Equal(t, "open", session.Status)
	assert.Equal(t, 200.0, session.OpeningBalance)

	// 2. Tentativa de abrir segunda sessão concomitante no mesmo terminal -> Bloqueada
	_, err = svc.OpenCashSession(ctx, tenantID, complexID, terminalID, operatorID, 100.0)
	assert.ErrorIs(t, err, domain.ErrCashSessionAlreadyOpen)

	// 3. Registrar Suprimento de R$ 50,00 e Venda em Dinheiro de R$ 300,00
	err = svc.RecordCashSupply(ctx, tenantID, session.ID, 50.0, "Reforço de moedas", nil)
	require.NoError(t, err)
	err = svc.RecordCashSale(ctx, tenantID, session.ID, uuid.New(), 300.0)
	require.NoError(t, err)

	// 4. Registrar Sangria periódica de R$ 150,00
	err = svc.RecordCashBleed(ctx, tenantID, session.ID, 150.0, "Sangria para o cofre", nil)
	require.NoError(t, err)

	// Saldo esperado em dinheiro físico:
	// Expected = Opening (200) + Supply (50) + Sales (300) - Bleed (150) = R$ 400,00

	// 5. Fechamento Cego com Sobra de Caixa: Operador conta R$ 420,00 (+ R$ 20 de sobra)
	closedSession, err := svc.CloseCashSessionBlind(ctx, tenantID, session.ID, 420.0, 1500.0, 350.0, nil)
	require.NoError(t, err)
	assert.Equal(t, "closed", closedSession.Status)
	assert.Equal(t, 400.0, *closedSession.ExpectedCashBalance)
	assert.Equal(t, 20.0, *closedSession.DifferenceAmount)

	// 6. Validar que o lançamento contábil de Sobra de Caixa foi gerado no Ledger
	txs, err := svc.ListTransactions(ctx, tenantID, 10)
	require.NoError(t, err)
	assert.NotEmpty(t, txs)
	assert.Equal(t, "cash_session", txs[0].ReferenceType)

	// 7. Tentativa de registrar sangria em caixa já fechado -> Rejeitada
	err = svc.RecordCashBleed(ctx, tenantID, session.ID, 50.0, "Sangria tardia", nil)
	assert.ErrorIs(t, err, domain.ErrCashSessionClosed)
}

func TestFinanceService_SaleCompletedWithCMV(t *testing.T) {
	repo := NewFakeFinanceRepo()
	svc := NewService(nil, repo)
	tenantID := uuid.New()
	saleID := uuid.New()
	prodID := uuid.New()
	ctx := context.Background()

	// Venda: R$ 40 Bilheteria + R$ 30 Bomboniere (Custo da mercadoria: R$ 12) = R$ 70 Total
	// Pagamento: R$ 50 no Cartão + R$ 20 no PIX
	paymentsMap := map[string]float64{
		"credit_card": 50.0,
		"pix":         20.0,
	}
	items := []SaleConcessionItemPayload{
		{ProductID: &prodID, Quantity: 2, UnitCost: 6.0}, // CMV = 2 x 6 = R$ 12,00
	}

	err := svc.ProcessSaleCompletedEvent(
		ctx, tenantID, saleID,
		40.0, 30.0, 0.0, 70.0,
		paymentsMap, items,
	)
	require.NoError(t, err)

	txs, err := svc.ListTransactions(ctx, tenantID, 10)
	require.NoError(t, err)
	assert.NotEmpty(t, txs)
	assert.Equal(t, "sale", txs[0].ReferenceType)
	// Deve conter: 2 débitos (cartão, pix) + 2 créditos (bilheteria, bomboniere) + 1 débito CMV + 1 crédito Estoque = 6 pernas
	assert.Len(t, txs[0].Entries, 6)
}
