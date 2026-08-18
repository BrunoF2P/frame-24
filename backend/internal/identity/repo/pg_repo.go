package repo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/identity/domain"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// CreateUser insere uma pessoa física global no banco
func (r *PostgresRepository) CreateUser(ctx context.Context, tx pgx.Tx, user *domain.User) error {
	query := `
		INSERT INTO identity.users (id, email, password_hash, full_name, cpf, phone, is_active, mfa_secret, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, user.ID, user.Email, user.PasswordHash, user.FullName, user.CPF, user.Phone, user.IsActive, user.MFASecret, user.CreatedAt, user.UpdatedAt)
	} else {
		_, err = r.pool.Exec(ctx, query, user.ID, user.Email, user.PasswordHash, user.FullName, user.CPF, user.Phone, user.IsActive, user.MFASecret, user.CreatedAt, user.UpdatedAt)
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // Unique violation
			return domain.ErrUserAlreadyExists
		}
		return fmt.Errorf("falha ao inserir usuario: %w", err)
	}
	return nil
}

// GetUserByID busca usuário por ID
func (r *PostgresRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, cpf, phone, is_active, mfa_secret, created_at, updated_at
		FROM identity.users
		WHERE id = $1
	`
	var u domain.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.CPF, &u.Phone, &u.IsActive, &u.MFASecret, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, fmt.Errorf("falha ao buscar usuario por ID: %w", err)
	}
	return &u, nil
}

// GetUserByEmail busca usuário por e-mail (case-insensitive)
func (r *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, cpf, phone, is_active, mfa_secret, created_at, updated_at
		FROM identity.users
		WHERE LOWER(email) = LOWER($1)
	`
	var u domain.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.FullName, &u.CPF, &u.Phone, &u.IsActive, &u.MFASecret, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, fmt.Errorf("falha ao buscar usuario por e-mail: %w", err)
	}
	return &u, nil
}

// CreateTenant insere uma empresa/cinema no banco
func (r *PostgresRepository) CreateTenant(ctx context.Context, tx pgx.Tx, tenant *domain.Tenant) error {
	query := `
		INSERT INTO identity.tenants (
			id, parent_id, name, trade_name, cnpj, state_registration, municipal_registration, timezone, plan_type, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			tenant.ID, tenant.ParentID, tenant.Name, tenant.TradeName, tenant.CNPJ,
			tenant.StateRegistration, tenant.MunicipalRegistration, tenant.Timezone,
			tenant.PlanType, tenant.Status, tenant.CreatedAt, tenant.UpdatedAt,
		)
	} else {
		_, err = r.pool.Exec(ctx, query,
			tenant.ID, tenant.ParentID, tenant.Name, tenant.TradeName, tenant.CNPJ,
			tenant.StateRegistration, tenant.MunicipalRegistration, tenant.Timezone,
			tenant.PlanType, tenant.Status, tenant.CreatedAt, tenant.UpdatedAt,
		)
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrTenantAlreadyExists
		}
		return fmt.Errorf("falha ao inserir tenant: %w", err)
	}
	return nil
}

// GetTenantByID busca empresa por ID
func (r *PostgresRepository) GetTenantByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	query := `
		SELECT id, parent_id, name, trade_name, cnpj, state_registration, municipal_registration, timezone, plan_type, status, created_at, updated_at
		FROM identity.tenants
		WHERE id = $1
	`
	var t domain.Tenant
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.ParentID, &t.Name, &t.TradeName, &t.CNPJ,
		&t.StateRegistration, &t.MunicipalRegistration, &t.Timezone,
		&t.PlanType, &t.Status, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTenantNotFound
		}
		return nil, fmt.Errorf("falha ao buscar tenant por ID: %w", err)
	}
	return &t, nil
}

// GetTenantByCNPJ busca empresa por CNPJ
func (r *PostgresRepository) GetTenantByCNPJ(ctx context.Context, cnpj string) (*domain.Tenant, error) {
	query := `
		SELECT id, parent_id, name, trade_name, cnpj, state_registration, municipal_registration, timezone, plan_type, status, created_at, updated_at
		FROM identity.tenants
		WHERE cnpj = $1
	`
	var t domain.Tenant
	err := r.pool.QueryRow(ctx, query, cnpj).Scan(
		&t.ID, &t.ParentID, &t.Name, &t.TradeName, &t.CNPJ,
		&t.StateRegistration, &t.MunicipalRegistration, &t.Timezone,
		&t.PlanType, &t.Status, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTenantNotFound
		}
		return nil, fmt.Errorf("falha ao buscar tenant por CNPJ: %w", err)
	}
	return &t, nil
}

// ListTenantsByParentID lista todas as filiais de uma rede/holding
func (r *PostgresRepository) ListTenantsByParentID(ctx context.Context, parentID uuid.UUID) ([]domain.Tenant, error) {
	query := `
		SELECT id, parent_id, name, trade_name, cnpj, state_registration, municipal_registration, timezone, plan_type, status, created_at, updated_at
		FROM identity.tenants
		WHERE parent_id = $1 OR id = $1
		ORDER BY name ASC
	`
	rows, err := r.pool.Query(ctx, query, parentID)
	if err != nil {
		return nil, fmt.Errorf("falha ao listar filiais do tenant: %w", err)
	}
	defer rows.Close()

	var tenants []domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		err := rows.Scan(
			&t.ID, &t.ParentID, &t.Name, &t.TradeName, &t.CNPJ,
			&t.StateRegistration, &t.MunicipalRegistration, &t.Timezone,
			&t.PlanType, &t.Status, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		tenants = append(tenants, t)
	}
	return tenants, nil
}

// CreateMembership registra o vínculo de trabalho
func (r *PostgresRepository) CreateMembership(ctx context.Context, tx pgx.Tx, m *domain.TenantMembership) error {
	query := `
		INSERT INTO identity.tenant_memberships (id, user_id, tenant_id, roles, permissions, complex_ids, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, m.ID, m.UserID, m.TenantID, m.Roles, m.Permissions, m.ComplexIDs, m.IsActive, m.CreatedAt, m.UpdatedAt)
	} else {
		_, err = r.pool.Exec(ctx, query, m.ID, m.UserID, m.TenantID, m.Roles, m.Permissions, m.ComplexIDs, m.IsActive, m.CreatedAt, m.UpdatedAt)
	}

	if err != nil {
		return fmt.Errorf("falha ao criar membership: %w", err)
	}
	return nil
}

// GetMembership busca o vínculo de um usuário em um tenant específico
func (r *PostgresRepository) GetMembership(ctx context.Context, userID, tenantID uuid.UUID) (*domain.TenantMembership, error) {
	query := `
		SELECT id, user_id, tenant_id, roles, permissions, complex_ids, is_active, created_at, updated_at
		FROM identity.tenant_memberships
		WHERE user_id = $1 AND tenant_id = $2
	`
	var m domain.TenantMembership
	err := r.pool.QueryRow(ctx, query, userID, tenantID).Scan(
		&m.ID, &m.UserID, &m.TenantID, &m.Roles, &m.Permissions, &m.ComplexIDs, &m.IsActive, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrMembershipNotFound
		}
		return nil, fmt.Errorf("falha ao buscar membership: %w", err)
	}
	return &m, nil
}

// ListMembershipsByUserID busca todas as empresas que o usuário tem acesso (para o Tenant Switcher)
func (r *PostgresRepository) ListMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]domain.TenantMembershipView, error) {
	query := `
		SELECT 
			m.id AS membership_id,
			t.id AS tenant_id,
			t.name AS tenant_name,
			t.trade_name,
			t.cnpj,
			m.roles,
			m.permissions,
			m.complex_ids,
			m.is_active
		FROM identity.tenant_memberships m
		JOIN identity.tenants t ON t.id = m.tenant_id
		WHERE m.user_id = $1 AND t.status = 'active'
		ORDER BY t.name ASC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("falha ao listar memberships do usuario: %w", err)
	}
	defer rows.Close()

	var views []domain.TenantMembershipView
	for rows.Next() {
		var v domain.TenantMembershipView
		err := rows.Scan(
			&v.MembershipID, &v.TenantID, &v.TenantName, &v.TradeName, &v.CNPJ,
			&v.Roles, &v.Permissions, &v.ComplexIDs, &v.IsActive,
		)
		if err != nil {
			return nil, err
		}
		views = append(views, v)
	}
	return views, nil
}

// UpdateMembershipRoles atualiza papéis e permissões
func (r *PostgresRepository) UpdateMembershipRoles(ctx context.Context, tx pgx.Tx, membershipID uuid.UUID, roles []string, permissions []string) error {
	query := `
		UPDATE identity.tenant_memberships
		SET roles = $1, permissions = $2, updated_at = now()
		WHERE id = $3
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, roles, permissions, membershipID)
	} else {
		_, err = r.pool.Exec(ctx, query, roles, permissions, membershipID)
	}
	if err != nil {
		return fmt.Errorf("falha ao atualizar roles do membership: %w", err)
	}
	return nil
}

// LogAudit grava log de auditoria com isolamento de tenant
func (r *PostgresRepository) LogAudit(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, userID *uuid.UUID, action, resource string, details any, ipAddress string) error {
	detailsBytes, _ := json.Marshal(details)
	query := `
		INSERT INTO identity.tenant_audit_logs (tenant_id, user_id, action, resource, details, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, tenantID, userID, action, resource, detailsBytes, ipAddress)
	} else {
		_, err = r.pool.Exec(ctx, query, tenantID, userID, action, resource, detailsBytes, ipAddress)
	}
	return err
}
