package repo

import (
	"context"

	"frame-24/internal/identity/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Repository define os métodos de persistência de identidade
type Repository interface {
	// Usuários
	CreateUser(ctx context.Context, tx pgx.Tx, user *domain.User) error
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)

	// Tenants
	CreateTenant(ctx context.Context, tx pgx.Tx, tenant *domain.Tenant) error
	GetTenantByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error)
	GetTenantByCNPJ(ctx context.Context, cnpj string) (*domain.Tenant, error)
	ListTenantsByParentID(ctx context.Context, parentID uuid.UUID) ([]domain.Tenant, error)

	// Memberships
	CreateMembership(ctx context.Context, tx pgx.Tx, membership *domain.TenantMembership) error
	GetMembership(ctx context.Context, userID, tenantID uuid.UUID) (*domain.TenantMembership, error)
	ListMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]domain.TenantMembershipView, error)
	UpdateMembershipRoles(ctx context.Context, tx pgx.Tx, membershipID uuid.UUID, roles []string, permissions []string) error

	// Auditoria
	LogAudit(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, userID *uuid.UUID, action, resource string, details any, ipAddress string) error
}
