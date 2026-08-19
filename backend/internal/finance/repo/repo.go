package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"frame-24/internal/finance/domain"
)

type Repository interface {
	CreateAccount(ctx context.Context, tx pgx.Tx, acc *domain.Account) error
	GetAccountByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Account, error)
	ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]domain.Account, error)
	CreateStandardAccountsIfMissing(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID) error

	RecordTransaction(ctx context.Context, tx pgx.Tx, t *domain.Transaction) error
	ListTransactions(ctx context.Context, tenantID uuid.UUID, limit int) ([]domain.Transaction, error)

	CreateCashSession(ctx context.Context, tx pgx.Tx, s *domain.CashSession) error
	GetOpenCashSession(ctx context.Context, tenantID, complexID uuid.UUID, posTerminalID string, operatorID uuid.UUID) (*domain.CashSession, error)
	GetCashSessionByID(ctx context.Context, tenantID, sessionID uuid.UUID) (*domain.CashSession, error)
	GetCashSessionByIDForUpdate(ctx context.Context, tx pgx.Tx, tenantID, sessionID uuid.UUID) (*domain.CashSession, error)
	RecordCashMovement(ctx context.Context, tx pgx.Tx, m *domain.CashMovement) error
	GetCashMovementsTotals(ctx context.Context, tenantID, sessionID uuid.UUID) (cashSales, deposits, bleeds float64, err error)
	CloseCashSession(ctx context.Context, tx pgx.Tx, s *domain.CashSession) error
}
