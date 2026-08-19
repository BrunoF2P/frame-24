package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"frame-24/internal/payments/domain"
)

type Repository interface {
	CreatePaymentAttempt(ctx context.Context, tx pgx.Tx, p *domain.PaymentAttempt) error
	GetPaymentAttemptByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PaymentAttempt, error)
	GetPaymentAttemptByIdempotencyKey(ctx context.Context, tenantID uuid.UUID, key string) (*domain.PaymentAttempt, error)
	UpdatePaymentAttempt(ctx context.Context, tx pgx.Tx, p *domain.PaymentAttempt) error

	CreateTefTransaction(ctx context.Context, tx pgx.Tx, t *domain.TefTransaction) error
	GetTefTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.TefTransaction, error)
	GetTefTransactionByNSU(ctx context.Context, tenantID uuid.UUID, terminalID, nsu string) (*domain.TefTransaction, error)
	UpdateTefTransaction(ctx context.Context, tx pgx.Tx, t *domain.TefTransaction) error
}
