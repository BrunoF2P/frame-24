package repo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"frame-24/internal/finance/domain"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/money"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateAccount(ctx context.Context, tx pgx.Tx, acc *domain.Account) error {
	query := `
		INSERT INTO finance.accounts (id, tenant_id, code, name, account_type, is_system, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, acc.ID, acc.TenantID, acc.Code, acc.Name, string(acc.AccountType), acc.IsSystem, acc.CreatedAt)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, acc.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query, acc.ID, acc.TenantID, acc.Code, acc.Name, string(acc.AccountType), acc.IsSystem, acc.CreatedAt)
			return e
		})
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrAccountAlreadyExists
		}
		return fmt.Errorf("falha ao criar conta contabil: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetAccountByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Account, error) {
	var acc domain.Account
	var accType string
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, code, name, account_type, is_system, created_at
			FROM finance.accounts
			WHERE code = $1
		`
		return tx.QueryRow(ctx, query, code).Scan(
			&acc.ID, &acc.TenantID, &acc.Code, &acc.Name, &accType, &acc.IsSystem, &acc.CreatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, fmt.Errorf("falha ao buscar conta contabil por codigo: %w", err)
	}
	acc.AccountType = domain.AccountType(accType)
	return &acc, nil
}

func (r *PostgresRepository) ListAccounts(ctx context.Context, tenantID uuid.UUID) ([]domain.Account, error) {
	var list []domain.Account
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, code, name, account_type, is_system, created_at
			FROM finance.accounts
			ORDER BY code ASC
		`
		rows, err := tx.Query(ctx, query)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var acc domain.Account
			var accType string
			if err := rows.Scan(&acc.ID, &acc.TenantID, &acc.Code, &acc.Name, &accType, &acc.IsSystem, &acc.CreatedAt); err != nil {
				return err
			}
			acc.AccountType = domain.AccountType(accType)
			list = append(list, acc)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("falha ao listar contas contabeis: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateStandardAccountsIfMissing(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID) error {
	defaults := domain.GetStandardAccountsTemplate(tenantID)
	query := `
		INSERT INTO finance.accounts (id, tenant_id, code, name, account_type, is_system, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (tenant_id, code) DO NOTHING
	`
	for _, acc := range defaults {
		_, err := tx.Exec(ctx, query, acc.ID, acc.TenantID, acc.Code, acc.Name, string(acc.AccountType), acc.IsSystem, acc.CreatedAt)
		if err != nil {
			return fmt.Errorf("falha ao provisionar plano de contas padrao: %w", err)
		}
	}
	return nil
}

func (r *PostgresRepository) RecordTransaction(ctx context.Context, tx pgx.Tx, t *domain.Transaction) error {
	if err := t.Validate(); err != nil {
		return err
	}

	// Idempotência: para vendas, só uma transação contábil pode existir por reference_id.
	// ON CONFLICT DO NOTHING absorve o retry do Outbox dispatcher silenciosamente.
	txQuery := `
		INSERT INTO finance.transactions (id, tenant_id, transaction_date, description, reference_type, reference_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT DO NOTHING
	`
	tag, err := tx.Exec(ctx, txQuery, t.ID, t.TenantID, t.TransactionDate, t.Description, t.ReferenceType, t.ReferenceID, t.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil // já processado — retry idempotente
		}
		return fmt.Errorf("falha ao gravar transacao contabil: %w", err)
	}
	// Se o conflict foi absorvido (referência de venda já existia), não inserir pernas novamente.
	if tag.RowsAffected() == 0 {
		return nil
	}

	entryQuery := `
		INSERT INTO finance.ledger_entries (id, tenant_id, transaction_id, account_id, entry_type, amount, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	batch := &pgx.Batch{}
	for _, entry := range t.Entries {
		batch.Queue(entryQuery, entry.ID, entry.TenantID, entry.TransactionID, entry.AccountID, string(entry.EntryType), int64(entry.Amount), entry.CreatedAt)
	}

	br := tx.SendBatch(ctx, batch)
	for i := 0; i < len(t.Entries); i++ {
		if _, err := br.Exec(); err != nil {
			_ = br.Close()
			return fmt.Errorf("falha ao gravar lancamento no ledger batch: %w", err)
		}
	}
	_ = br.Close()

	return nil
}

func (r *PostgresRepository) ListTransactions(ctx context.Context, tenantID uuid.UUID, limit int, beforeTS *time.Time, beforeID *uuid.UUID) ([]domain.Transaction, error) {
	if limit <= 0 {
		limit = 51
	}
	if limit > 101 {
		limit = 101
	}

	var list []domain.Transaction
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, transaction_date, description, reference_type, reference_id, created_at
			FROM finance.transactions
			WHERE ($2::timestamptz IS NULL OR (transaction_date, id) < ($2, $3))
			ORDER BY transaction_date DESC, id DESC
			LIMIT $1
		`
		rows, err := tx.Query(ctx, query, limit, beforeTS, beforeID)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var t domain.Transaction
			if err := rows.Scan(&t.ID, &t.TenantID, &t.TransactionDate, &t.Description, &t.ReferenceType, &t.ReferenceID, &t.CreatedAt); err != nil {
				return err
			}
			list = append(list, t)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("falha ao listar transacoes contabeis: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateCashSession(ctx context.Context, tx pgx.Tx, s *domain.CashSession) error {
	query := `
		INSERT INTO finance.cash_sessions (
			id, tenant_id, complex_id, pos_terminal_id, operator_id,
			status, opened_at, opening_balance, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(
			ctx, query,
			s.ID, s.TenantID, s.ComplexID, s.POSTerminalID, s.OperatorID,
			s.Status, s.OpenedAt, int64(s.OpeningBalance), s.CreatedAt, s.UpdatedAt,
		)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, s.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(
				ctx, query,
				s.ID, s.TenantID, s.ComplexID, s.POSTerminalID, s.OperatorID,
				s.Status, s.OpenedAt, int64(s.OpeningBalance), s.CreatedAt, s.UpdatedAt,
			)
			return e
		})
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrCashSessionAlreadyOpen
		}
		return fmt.Errorf("falha ao abrir sessao de caixa: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetOpenCashSession(ctx context.Context, tenantID, complexID uuid.UUID, posTerminalID string, operatorID uuid.UUID) (*domain.CashSession, error) {
	var s domain.CashSession
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, pos_terminal_id, operator_id, status, opened_at, closed_at,
			       opening_balance, closing_cash_counted, closing_card_counted, closing_pix_counted,
			       expected_cash_balance, difference_amount, notes, created_at, updated_at
			FROM finance.cash_sessions
			WHERE complex_id = $1 AND pos_terminal_id = $2 AND operator_id = $3 AND status = 'open'
			LIMIT 1
		`
		var openingBalance int64
		var closingCashCounted, closingCardCounted, closingPixCounted *int64
		var expectedCashBalance, differenceAmount *int64
		if err := tx.QueryRow(ctx, query, complexID, posTerminalID, operatorID).Scan(
			&s.ID, &s.TenantID, &s.ComplexID, &s.POSTerminalID, &s.OperatorID, &s.Status, &s.OpenedAt, &s.ClosedAt,
			&openingBalance, &closingCashCounted, &closingCardCounted, &closingPixCounted,
			&expectedCashBalance, &differenceAmount, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return err
		}
		s.OpeningBalance = money.Cents(openingBalance)
		s.ClosingCashCounted = centsPtr(closingCashCounted)
		s.ClosingCardCounted = centsPtr(closingCardCounted)
		s.ClosingPixCounted = centsPtr(closingPixCounted)
		s.ExpectedCashBalance = centsPtr(expectedCashBalance)
		s.DifferenceAmount = centsPtr(differenceAmount)
		return nil
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("falha ao consultar sessao de caixa aberta: %w", err)
	}
	return &s, nil
}

func (r *PostgresRepository) GetCashSessionByID(ctx context.Context, tenantID, sessionID uuid.UUID) (*domain.CashSession, error) {
	var s domain.CashSession
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, pos_terminal_id, operator_id, status, opened_at, closed_at,
			       opening_balance, closing_cash_counted, closing_card_counted, closing_pix_counted,
			       expected_cash_balance, difference_amount, notes, created_at, updated_at
			FROM finance.cash_sessions
			WHERE id = $1
		`
		var openingBalance int64
		var closingCashCounted, closingCardCounted, closingPixCounted *int64
		var expectedCashBalance, differenceAmount *int64
		if err := tx.QueryRow(ctx, query, sessionID).Scan(
			&s.ID, &s.TenantID, &s.ComplexID, &s.POSTerminalID, &s.OperatorID, &s.Status, &s.OpenedAt, &s.ClosedAt,
			&openingBalance, &closingCashCounted, &closingCardCounted, &closingPixCounted,
			&expectedCashBalance, &differenceAmount, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return err
		}
		s.OpeningBalance = money.Cents(openingBalance)
		s.ClosingCashCounted = centsPtr(closingCashCounted)
		s.ClosingCardCounted = centsPtr(closingCardCounted)
		s.ClosingPixCounted = centsPtr(closingPixCounted)
		s.ExpectedCashBalance = centsPtr(expectedCashBalance)
		s.DifferenceAmount = centsPtr(differenceAmount)
		return nil
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCashSessionNotFound
		}
		return nil, fmt.Errorf("falha ao buscar sessao de caixa por id: %w", err)
	}
	return &s, nil
}

func (r *PostgresRepository) GetCashSessionByIDForUpdate(ctx context.Context, tx pgx.Tx, tenantID, sessionID uuid.UUID) (*domain.CashSession, error) {
	var s domain.CashSession
	query := `
		SELECT id, tenant_id, complex_id, pos_terminal_id, operator_id, status, opened_at, closed_at,
		       opening_balance, closing_cash_counted, closing_card_counted, closing_pix_counted,
		       expected_cash_balance, difference_amount, notes, created_at, updated_at
		FROM finance.cash_sessions
		WHERE id = $1
		FOR UPDATE
	`
	var openingBalance int64
	var closingCashCounted, closingCardCounted, closingPixCounted *int64
	var expectedCashBalance, differenceAmount *int64
	if err := tx.QueryRow(ctx, query, sessionID).Scan(
		&s.ID, &s.TenantID, &s.ComplexID, &s.POSTerminalID, &s.OperatorID, &s.Status, &s.OpenedAt, &s.ClosedAt,
		&openingBalance, &closingCashCounted, &closingCardCounted, &closingPixCounted,
		&expectedCashBalance, &differenceAmount, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCashSessionNotFound
		}
		return nil, fmt.Errorf("falha ao adquirir lock exclusivo na sessao de caixa: %w", err)
	}
	s.OpeningBalance = money.Cents(openingBalance)
	s.ClosingCashCounted = centsPtr(closingCashCounted)
	s.ClosingCardCounted = centsPtr(closingCardCounted)
	s.ClosingPixCounted = centsPtr(closingPixCounted)
	s.ExpectedCashBalance = centsPtr(expectedCashBalance)
	s.DifferenceAmount = centsPtr(differenceAmount)
	return &s, nil
}

func (r *PostgresRepository) RecordCashMovement(ctx context.Context, tx pgx.Tx, m *domain.CashMovement) error {
	// Validar que a sessão está aberta
	statusQuery := `SELECT status FROM finance.cash_sessions WHERE id = $1`
	var status string
	var err error
	if tx != nil {
		err = tx.QueryRow(ctx, statusQuery, m.SessionID).Scan(&status)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, m.TenantID, func(t pgx.Tx) error {
			return t.QueryRow(ctx, statusQuery, m.SessionID).Scan(&status)
		})
	}
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrCashSessionNotFound
		}
		return fmt.Errorf("falha ao verificar status da sessao de caixa: %w", err)
	}
	if status != "open" {
		return domain.ErrCashSessionClosed
	}

	query := `
		INSERT INTO finance.cash_movements (
			id, tenant_id, session_id, movement_type, amount, reason,
			authorized_by_id, reference_type, reference_id, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT DO NOTHING
	`
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			m.ID, m.TenantID, m.SessionID, string(m.MovementType), int64(m.Amount), m.Reason,
			m.AuthorizedByID, m.ReferenceType, m.ReferenceID, m.CreatedAt)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, m.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query,
				m.ID, m.TenantID, m.SessionID, string(m.MovementType), int64(m.Amount), m.Reason,
				m.AuthorizedByID, m.ReferenceType, m.ReferenceID, m.CreatedAt)
			return e
		})
	}

	if err != nil {
		return fmt.Errorf("falha ao registrar movimentacao de caixa: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetCashMovementsTotals(ctx context.Context, tenantID, sessionID uuid.UUID) (money.Cents, money.Cents, money.Cents, error) {
	var cashSales, deposits, bleeds int64
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT
				COALESCE(SUM(CASE WHEN movement_type = 'cash_sale' THEN amount ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN movement_type = 'deposit_reinforcement' THEN amount ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN movement_type = 'bleed_withdrawal' THEN amount ELSE 0 END), 0)
			FROM finance.cash_movements
			WHERE session_id = $1
		`
		return tx.QueryRow(ctx, query, sessionID).Scan(&cashSales, &deposits, &bleeds)
	})

	if err != nil {
		return 0, 0, 0, fmt.Errorf("falha ao apurar totais de movimentacao de caixa: %w", err)
	}
	return money.Cents(cashSales), money.Cents(deposits), money.Cents(bleeds), nil
}

func (r *PostgresRepository) CloseCashSession(ctx context.Context, tx pgx.Tx, s *domain.CashSession) error {
	query := `
		UPDATE finance.cash_sessions
		SET status = $1, closed_at = $2,
		    closing_cash_counted = $3, closing_card_counted = $4, closing_pix_counted = $5,
		    expected_cash_balance = $6, difference_amount = $7, notes = $8, updated_at = $9
		WHERE id = $10
	`
	_, err := tx.Exec(
		ctx, query,
		s.Status, s.ClosedAt,
		int64Ptr(s.ClosingCashCounted), int64Ptr(s.ClosingCardCounted), int64Ptr(s.ClosingPixCounted),
		int64Ptr(s.ExpectedCashBalance), int64Ptr(s.DifferenceAmount), s.Notes, s.UpdatedAt,
		s.ID,
	)
	if err != nil {
		return fmt.Errorf("falha ao atualizar status de fechamento de caixa: %w", err)
	}
	return nil
}

// centsPtr converte *int64 (scan de coluna BIGINT) em *money.Cents.
func centsPtr(p *int64) *money.Cents {
	if p == nil {
		return nil
	}
	v := money.Cents(*p)
	return &v
}

// int64Ptr converte *money.Cents em *int64 (encode para coluna BIGINT).
func int64Ptr(p *money.Cents) *int64 {
	if p == nil {
		return nil
	}
	v := int64(*p)
	return &v
}
