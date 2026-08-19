package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/platform/auth"
)

// Config contém as opções de configuração do pool PostgreSQL
type Config struct {
	URL          string
	MaxConns     int32
	MinConns     int32
	MaxConnIdle  time.Duration
	MaxConnLife  time.Duration
}

// DefaultConfig retorna uma configuração padrão balanceada
func DefaultConfig(dbURL string) Config {
	return Config{
		URL:         dbURL,
		MaxConns:    25,
		MinConns:    5,
		MaxConnIdle: 5 * time.Minute,
		MaxConnLife: 1 * time.Hour,
	}
}

// NewPool cria e inicializa um novo pool de conexões pgxpool
func NewPool(ctx context.Context, cfg Config) (*pgxpool.Pool, error) {
	pgxCfg, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("falha ao analisar DATABASE_URL: %w", err)
	}

	if cfg.MaxConns > 0 {
		pgxCfg.MaxConns = cfg.MaxConns
	}
	if cfg.MinConns > 0 {
		pgxCfg.MinConns = cfg.MinConns
	}
	if cfg.MaxConnIdle > 0 {
		pgxCfg.MaxConnIdleTime = cfg.MaxConnIdle
	}
	if cfg.MaxConnLife > 0 {
		pgxCfg.MaxConnLifetime = cfg.MaxConnLife
	}

	pool, err := pgxpool.NewWithConfig(ctx, pgxCfg)
	if err != nil {
		return nil, fmt.Errorf("falha ao instanciar pgxpool: %w", err)
	}

	// Ping inicial com timeout para garantir conectividade
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("falha ao conectar ao PostgreSQL: %w", err)
	}

	return pool, nil
}

// RunInTenantTx executa uma função atômica sob o escopo estrito de um Tenant no PostgreSQL RLS.
// Usa 'SET LOCAL app.tenant_id' e 'SET LOCAL app.user_id' para isolamento e auditoria multi-claims,
// garantindo que conexões reutilizadas no pool nunca vazem dados para outros tenants ou usuários.
func RunInTenantTx(ctx context.Context, pool *pgxpool.Pool, tenantID uuid.UUID, fn func(tx pgx.Tx) error) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("tenant_id invalido para execucao transacional")
	}

	if pool == nil {
		return fn(nil)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("falha ao iniciar transacao: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Injeta o tenant_id e user_id (se presente no contexto) estritamente nesta transação (SET LOCAL)
	var query string
	var args []any

	userID, hasUser := auth.GetUserID(ctx)
	if hasUser && userID != uuid.Nil {
		query = "SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)"
		args = []any{tenantID.String(), userID.String()}
	} else {
		query = "SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', '', true)"
		args = []any{tenantID.String()}
	}

	_, err = tx.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("falha ao definir contexto de tenant RLS: %w", err)
	}

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("falha ao confirmar transacao: %w", err)
	}

	return nil
}

// RunTx executa uma função transacional global/de sistema (sem isolamento de tenant específico).
func RunTx(ctx context.Context, pool *pgxpool.Pool, fn func(tx pgx.Tx) error) error {
	if pool == nil {
		return fn(nil)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("falha ao iniciar transacao: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("falha ao confirmar transacao: %w", err)
	}

	return nil
}
