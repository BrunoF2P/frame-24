package repo

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/payments/domain"
	"frame-24/internal/platform/db"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreatePaymentAttempt(ctx context.Context, tx pgx.Tx, p *domain.PaymentAttempt) error {
	query := `
		INSERT INTO payments.payment_attempts (
			id, tenant_id, sale_id, idempotency_key, payment_method, provider,
			amount, status, external_reference, qr_code_pix, qr_code_url, error_message, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			p.ID, p.TenantID, p.SaleID, p.IdempotencyKey, string(p.PaymentMethod), p.Provider,
			p.Amount, string(p.Status), p.ExternalReference, p.QRCodePix, p.QRCodeURL, p.ErrorMessage, p.CreatedAt, p.UpdatedAt,
		)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, p.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query,
				p.ID, p.TenantID, p.SaleID, p.IdempotencyKey, string(p.PaymentMethod), p.Provider,
				p.Amount, string(p.Status), p.ExternalReference, p.QRCodePix, p.QRCodeURL, p.ErrorMessage, p.CreatedAt, p.UpdatedAt,
			)
			return e
		})
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrDuplicateIdempotencyKey
		}
		return fmt.Errorf("falha ao criar tentativa de pagamento: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetPaymentAttemptByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PaymentAttempt, error) {
	var p domain.PaymentAttempt
	var method, status string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, sale_id, idempotency_key, payment_method, provider,
			       amount, status, external_reference, qr_code_pix, qr_code_url, error_message, created_at, updated_at
			FROM payments.payment_attempts
			WHERE id = $1
		`
		return tx.QueryRow(ctx, query, id).Scan(
			&p.ID, &p.TenantID, &p.SaleID, &p.IdempotencyKey, &method, &p.Provider,
			&p.Amount, &status, &p.ExternalReference, &p.QRCodePix, &p.QRCodeURL, &p.ErrorMessage, &p.CreatedAt, &p.UpdatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentNotFound
		}
		return nil, fmt.Errorf("falha ao buscar tentativa de pagamento: %w", err)
	}
	p.PaymentMethod = domain.PaymentMethod(method)
	p.Status = domain.PaymentStatus(status)
	return &p, nil
}

func (r *PostgresRepository) GetPaymentAttemptByIdempotencyKey(ctx context.Context, tenantID uuid.UUID, key string) (*domain.PaymentAttempt, error) {
	var p domain.PaymentAttempt
	var method, status string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, sale_id, idempotency_key, payment_method, provider,
			       amount, status, external_reference, qr_code_pix, qr_code_url, error_message, created_at, updated_at
			FROM payments.payment_attempts
			WHERE idempotency_key = $1
		`
		return tx.QueryRow(ctx, query, key).Scan(
			&p.ID, &p.TenantID, &p.SaleID, &p.IdempotencyKey, &method, &p.Provider,
			&p.Amount, &status, &p.ExternalReference, &p.QRCodePix, &p.QRCodeURL, &p.ErrorMessage, &p.CreatedAt, &p.UpdatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrPaymentNotFound
		}
		return nil, fmt.Errorf("falha ao buscar tentativa por idempotency key: %w", err)
	}
	p.PaymentMethod = domain.PaymentMethod(method)
	p.Status = domain.PaymentStatus(status)
	return &p, nil
}

func (r *PostgresRepository) UpdatePaymentAttempt(ctx context.Context, tx pgx.Tx, p *domain.PaymentAttempt) error {
	query := `
		UPDATE payments.payment_attempts
		SET status = $1, external_reference = $2, error_message = $3, updated_at = $4
		WHERE id = $5
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, string(p.Status), p.ExternalReference, p.ErrorMessage, p.UpdatedAt, p.ID)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, p.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query, string(p.Status), p.ExternalReference, p.ErrorMessage, p.UpdatedAt, p.ID)
			return e
		})
	}
	if err != nil {
		return fmt.Errorf("falha ao atualizar tentativa de pagamento: %w", err)
	}
	return nil
}

func (r *PostgresRepository) CreateTefTransaction(ctx context.Context, tx pgx.Tx, t *domain.TefTransaction) error {
	query := `
		INSERT INTO payments.tef_transactions (
			id, tenant_id, sale_id, pos_terminal_id, nsu, authorization_code, card_brand,
			transaction_type, installments, amount, status, terminal_mac, receipt_merchant, receipt_customer, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT ON CONSTRAINT unique_tef_nsu_per_terminal DO NOTHING
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			t.ID, t.TenantID, t.SaleID, t.POSTerminalID, t.NSU, t.AuthorizationCode, t.CardBrand,
			string(t.TransactionType), t.Installments, t.Amount, string(t.Status), t.TerminalMAC,
			t.ReceiptMerchant, t.ReceiptCustomer, t.CreatedAt, t.UpdatedAt,
		)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, t.TenantID, func(txx pgx.Tx) error {
			_, e := txx.Exec(ctx, query,
				t.ID, t.TenantID, t.SaleID, t.POSTerminalID, t.NSU, t.AuthorizationCode, t.CardBrand,
				string(t.TransactionType), t.Installments, t.Amount, string(t.Status), t.TerminalMAC,
				t.ReceiptMerchant, t.ReceiptCustomer, t.CreatedAt, t.UpdatedAt,
			)
			return e
		})
	}
	if err != nil {
		return fmt.Errorf("falha ao criar transacao TEF: %w", err)
	}
	// Re-populate t com o registro vencedor (se a race fez ON CONFLICT DO NOTHING,
	// o caller deve re-buscar via GetTefTransactionByNSU — aqui apenas sinaliza idempotência)
	return nil
}

func (r *PostgresRepository) GetTefTransactionByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.TefTransaction, error) {
	var t domain.TefTransaction
	var txType, status string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, sale_id, pos_terminal_id, nsu, authorization_code, card_brand,
			       transaction_type, installments, amount, status, terminal_mac, receipt_merchant, receipt_customer, created_at, updated_at
			FROM payments.tef_transactions
			WHERE id = $1
		`
		return tx.QueryRow(ctx, query, id).Scan(
			&t.ID, &t.TenantID, &t.SaleID, &t.POSTerminalID, &t.NSU, &t.AuthorizationCode, &t.CardBrand,
			&txType, &t.Installments, &t.Amount, &status, &t.TerminalMAC, &t.ReceiptMerchant, &t.ReceiptCustomer, &t.CreatedAt, &t.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTefTransactionNotFound
		}
		return nil, fmt.Errorf("falha ao consultar transacao TEF: %w", err)
	}
	t.TransactionType = domain.TefTransactionType(txType)
	t.Status = domain.TefStatus(status)
	return &t, nil
}

func (r *PostgresRepository) GetTefTransactionByNSU(ctx context.Context, tenantID uuid.UUID, terminalID, nsu string) (*domain.TefTransaction, error) {
	var t domain.TefTransaction
	var txType, status string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, sale_id, pos_terminal_id, nsu, authorization_code, card_brand,
			       transaction_type, installments, amount, status, terminal_mac, receipt_merchant, receipt_customer, created_at, updated_at
			FROM payments.tef_transactions
			WHERE pos_terminal_id = $1 AND nsu = $2
		`
		return tx.QueryRow(ctx, query, terminalID, nsu).Scan(
			&t.ID, &t.TenantID, &t.SaleID, &t.POSTerminalID, &t.NSU, &t.AuthorizationCode, &t.CardBrand,
			&txType, &t.Installments, &t.Amount, &status, &t.TerminalMAC, &t.ReceiptMerchant, &t.ReceiptCustomer, &t.CreatedAt, &t.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTefTransactionNotFound
		}
		return nil, fmt.Errorf("falha ao buscar transacao TEF por NSU: %w", err)
	}
	t.TransactionType = domain.TefTransactionType(txType)
	t.Status = domain.TefStatus(status)
	return &t, nil
}

func (r *PostgresRepository) UpdateTefTransaction(ctx context.Context, tx pgx.Tx, t *domain.TefTransaction) error {
	query := `
		UPDATE payments.tef_transactions
		SET status = $1, sale_id = $2, updated_at = $3
		WHERE id = $4
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, string(t.Status), t.SaleID, t.UpdatedAt, t.ID)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, t.TenantID, func(txx pgx.Tx) error {
			_, e := txx.Exec(ctx, query, string(t.Status), t.SaleID, t.UpdatedAt, t.ID)
			return e
		})
	}
	if err != nil {
		return fmt.Errorf("falha ao atualizar status da transacao TEF: %w", err)
	}
	return nil
}
