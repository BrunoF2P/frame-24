package db_test

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"frame-24/internal/platform/db"
)

// migrationsDir retorna o caminho absoluto da pasta migrations/
func migrationsDir() string {
	_, filename, _, _ := runtime.Caller(0)
	// Sobe de internal/platform/db até a raiz do backend
	root := filepath.Join(filepath.Dir(filename), "..", "..", "..", "..")
	return filepath.Join(root, "migrations")
}

func startPostgres(t *testing.T) (superuserURL, appRoleURL string, cleanup func()) {
	t.Helper()
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("frame24_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("testpassword"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	require.NoError(t, err, "Falha ao iniciar container Postgres")

	host, err := pgContainer.Host(ctx)
	require.NoError(t, err)
	port, err := pgContainer.MappedPort(ctx, "5432")
	require.NoError(t, err)

	superuserURL = fmt.Sprintf("postgres://postgres:testpassword@%s:%s/frame24_test?sslmode=disable", host, port.Port())

	// Aplicar migrações com o superuser
	migPool, err := db.NewPool(ctx, db.DefaultConfig(superuserURL))
	require.NoError(t, err)
	defer migPool.Close()

	migSQL, err := os.ReadFile(filepath.Join(migrationsDir(), "0001_init_platform_and_identity.up.sql"))
	require.NoError(t, err, "Arquivo de migração não encontrado")
	_, err = migPool.Exec(ctx, string(migSQL))
	require.NoError(t, err, "Falha ao aplicar migration")

	// Definir senha para a role de app criada pela migration
	_, err = migPool.Exec(ctx, "ALTER ROLE frame24_app PASSWORD 'apppassword'")
	require.NoError(t, err)
	_, err = migPool.Exec(ctx, "GRANT frame24_app TO postgres")
	require.NoError(t, err)

	appRoleURL = fmt.Sprintf("postgres://frame24_app:apppassword@%s:%s/frame24_test?sslmode=disable", host, port.Port())

	cleanup = func() {
		_ = pgContainer.Terminate(ctx)
	}
	return
}

// TestRLS_AuditLog_RequiresTenantContext verifica que consultas na tabela com RLS
// sem SET LOCAL app.tenant_id lançam exceção do PostgreSQL com a role de app não-superuser.
func TestRLS_AuditLog_RequiresTenantContext(t *testing.T) {
	superuserURL, appRoleURL, cleanup := startPostgres(t)
	defer cleanup()
	ctx := context.Background()

	// Pool com a role de app — NÃO é superuser — RLS é aplicada de verdade
	appPool, err := pgxpool.New(ctx, appRoleURL)
	require.NoError(t, err)
	defer appPool.Close()

	// 1. Preparar dados como superuser (sem restrição de RLS para seed de teste)
	superPool, err := pgxpool.New(ctx, superuserURL)
	require.NoError(t, err)
	defer superPool.Close()

	tenantID := uuid.New()
	_, err = superPool.Exec(ctx, `
		INSERT INTO identity.tenants (id, name, cnpj, timezone, plan_type, status, updated_at)
		VALUES ($1, 'Cine Teste', '11222333000144', 'America/Sao_Paulo', 'standard', 'active', now())
	`, tenantID)
	require.NoError(t, err)

	_, err = superPool.Exec(ctx, `
		INSERT INTO identity.tenant_audit_logs (tenant_id, action, resource)
		VALUES ($1, 'TEST', 'test_resource')
	`, tenantID)
	require.NoError(t, err)

	// 2. QUERY SEM CONTEXTO DE TENANT — deve lançar RLS_SECURITY_VIOLATION
	_, errNoCtx := appPool.Exec(ctx, "SELECT * FROM identity.tenant_audit_logs")
	require.Error(t, errNoCtx, "Query sem tenant deve lançar erro RLS")
	assert.Contains(t, errNoCtx.Error(), "RLS_SECURITY_VIOLATION",
		"Erro deve ser de violação de segurança RLS")

	// 3. INSERT SEM CONTEXTO DE TENANT — deve ser bloqueado pelo WITH CHECK
	_, errInsert := appPool.Exec(ctx,
		"INSERT INTO identity.tenant_audit_logs (tenant_id, action, resource) VALUES ($1, 'HACK', 'resource')",
		tenantID,
	)
	require.Error(t, errInsert, "INSERT sem tenant context deve falhar via WITH CHECK do RLS")
	assert.Contains(t, errInsert.Error(), "RLS_SECURITY_VIOLATION")

	// 4. QUERY COM CONTEXTO CORRETO — deve funcionar
	err = db.RunInTenantTx(ctx, appPool, tenantID, func(tx pgx.Tx) error {
		// O RunInTenantTx injeta SET LOCAL app.tenant_id — RLS libera o acesso
		return nil
	})
	require.NoError(t, err)
}

// TestRLS_CrossTenant_Isolation verifica que Tenant A não consegue ler logs do Tenant B
func TestRLS_CrossTenant_Isolation(t *testing.T) {
	superuserURL, appRoleURL, cleanup := startPostgres(t)
	defer cleanup()
	ctx := context.Background()

	superPool, err := pgxpool.New(ctx, superuserURL)
	require.NoError(t, err)
	defer superPool.Close()

	appPool, err := pgxpool.New(ctx, appRoleURL)
	require.NoError(t, err)
	defer appPool.Close()

	tenantA := uuid.New()
	tenantB := uuid.New()

	// Seed de ambos os tenants
	for _, tid := range []uuid.UUID{tenantA, tenantB} {
		cnpj := fmt.Sprintf("%014d", tid.ID())
		_, err = superPool.Exec(ctx, `
			INSERT INTO identity.tenants (id, name, cnpj, timezone, plan_type, status, updated_at)
			VALUES ($1, $2, $3, 'America/Sao_Paulo', 'standard', 'active', now())
		`, tid, "Cinema "+tid.String()[:8], cnpj[:14])
		require.NoError(t, err)
	}

	// Inserir log para o Tenant A
	_, err = superPool.Exec(ctx, `
		INSERT INTO identity.tenant_audit_logs (tenant_id, action, resource)
		VALUES ($1, 'A_ACTION', 'resourceA')
	`, tenantA)
	require.NoError(t, err)

	// Tenant A consulta com contexto correto — deve ver apenas seus próprios logs
	var countA int
	err = db.RunInTenantTx(ctx, appPool, tenantA, func(tx pgx.Tx) error {
		return tx.QueryRow(ctx, "SELECT COUNT(*) FROM identity.tenant_audit_logs").Scan(&countA)
	})
	require.NoError(t, err)
	assert.Equal(t, 1, countA, "Tenant A deve ver apenas seus próprios logs")

	// Tenant B consulta com contexto correto — NÃO deve ver logs do Tenant A
	var countB int
	txB, err := appPool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = txB.Rollback(ctx) }()
	_, err = txB.Exec(ctx, "SELECT set_config('app.tenant_id', $1, true)", tenantB.String())
	require.NoError(t, err)
	err = txB.QueryRow(ctx, "SELECT COUNT(*) FROM identity.tenant_audit_logs").Scan(&countB)
	require.NoError(t, err)
	assert.Equal(t, 0, countB, "Tenant B não deve ver logs do Tenant A")
	_ = txB.Commit(ctx)
}

// TestOutbox_NoRLS_DispatcherCanReadAllTenants verifica que o outbox NÃO tem RLS
// e que o Dispatcher pode ler eventos de múltiplos tenants sem contexto de tenant.
func TestOutbox_NoRLS_DispatcherCanReadAllTenants(t *testing.T) {
	superuserURL, appRoleURL, cleanup := startPostgres(t)
	defer cleanup()
	ctx := context.Background()

	superPool, err := pgxpool.New(ctx, superuserURL)
	require.NoError(t, err)
	defer superPool.Close()

	appPool, err := pgxpool.New(ctx, appRoleURL)
	require.NoError(t, err)
	defer appPool.Close()

	tenantA, tenantB := uuid.New(), uuid.New()

	// Inserir eventos de outbox de dois tenants distintos
	for _, tid := range []uuid.UUID{tenantA, tenantB} {
		_, err = superPool.Exec(ctx, `
			INSERT INTO platform.outbox_events (tenant_id, event_type, aggregate_id, payload)
			VALUES ($1, 'test.event', $2, '{}')
		`, tid, uuid.New())
		require.NoError(t, err)
	}

	// O Dispatcher (sem contexto de tenant) deve conseguir ler TODOS os eventos
	var count int
	err = appPool.QueryRow(ctx, "SELECT COUNT(*) FROM platform.outbox_events WHERE status = 'pending'").Scan(&count)
	require.NoError(t, err, "Dispatcher deve ler outbox sem erro — tabela não tem RLS")
	assert.Equal(t, 2, count, "Dispatcher deve ver eventos de todos os tenants")
}
