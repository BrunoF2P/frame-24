package app

import (
	"context"
	"testing"
	"time"

	"frame-24/internal/identity/domain"
	"frame-24/internal/platform/auth"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// FakeRepository simula o banco de dados em memória para testes unitários do Service
type FakeRepository struct {
	users       map[string]*domain.User
	usersByID   map[uuid.UUID]*domain.User
	tenants     map[uuid.UUID]*domain.Tenant
	tenantsCNPJ map[string]*domain.Tenant
	memberships map[string]*domain.TenantMembership // key: userID_tenantID
}

func NewFakeRepository() *FakeRepository {
	return &FakeRepository{
		users:       make(map[string]*domain.User),
		usersByID:   make(map[uuid.UUID]*domain.User),
		tenants:     make(map[uuid.UUID]*domain.Tenant),
		tenantsCNPJ: make(map[string]*domain.Tenant),
		memberships: make(map[string]*domain.TenantMembership),
	}
}

func (f *FakeRepository) CreateUser(ctx context.Context, tx pgx.Tx, user *domain.User) error {
	if _, exists := f.users[user.Email]; exists {
		return domain.ErrUserAlreadyExists
	}
	f.users[user.Email] = user
	f.usersByID[user.ID] = user
	return nil
}

func (f *FakeRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	u, ok := f.usersByID[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (f *FakeRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	u, ok := f.users[email]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (f *FakeRepository) CreateTenant(ctx context.Context, tx pgx.Tx, tenant *domain.Tenant) error {
	if _, exists := f.tenantsCNPJ[tenant.CNPJ]; exists {
		return domain.ErrTenantAlreadyExists
	}
	f.tenants[tenant.ID] = tenant
	f.tenantsCNPJ[tenant.CNPJ] = tenant
	return nil
}

func (f *FakeRepository) GetTenantByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	t, ok := f.tenants[id]
	if !ok {
		return nil, domain.ErrTenantNotFound
	}
	return t, nil
}

func (f *FakeRepository) GetTenantByCNPJ(ctx context.Context, cnpj string) (*domain.Tenant, error) {
	t, ok := f.tenantsCNPJ[cnpj]
	if !ok {
		return nil, domain.ErrTenantNotFound
	}
	return t, nil
}

func (f *FakeRepository) ListTenantsByParentID(ctx context.Context, parentID uuid.UUID) ([]domain.Tenant, error) {
	var list []domain.Tenant
	for _, t := range f.tenants {
		if (t.ParentID != nil && *t.ParentID == parentID) || t.ID == parentID {
			list = append(list, *t)
		}
	}
	return list, nil
}

func (f *FakeRepository) CreateMembership(ctx context.Context, tx pgx.Tx, m *domain.TenantMembership) error {
	key := m.UserID.String() + "_" + m.TenantID.String()
	f.memberships[key] = m
	return nil
}

func (f *FakeRepository) GetMembership(ctx context.Context, userID, tenantID uuid.UUID) (*domain.TenantMembership, error) {
	key := userID.String() + "_" + tenantID.String()
	m, ok := f.memberships[key]
	if !ok {
		return nil, domain.ErrMembershipNotFound
	}
	return m, nil
}

func (f *FakeRepository) ListMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]domain.TenantMembershipView, error) {
	var views []domain.TenantMembershipView
	for _, m := range f.memberships {
		if m.UserID == userID {
			tenant, ok := f.tenants[m.TenantID]
			if ok && tenant.Status == "active" {
				views = append(views, domain.TenantMembershipView{
					MembershipID: m.ID,
					TenantID:     tenant.ID,
					TenantName:   tenant.Name,
					TradeName:    tenant.TradeName,
					CNPJ:         tenant.CNPJ,
					Roles:        m.Roles,
					Permissions:  m.Permissions,
					ComplexIDs:   m.ComplexIDs,
					IsActive:     m.IsActive,
				})
			}
		}
	}
	return views, nil
}

func (f *FakeRepository) UpdateMembershipRoles(ctx context.Context, tx pgx.Tx, membershipID uuid.UUID, roles []string, permissions []string) error {
	for _, m := range f.memberships {
		if m.ID == membershipID {
			m.Roles = roles
			m.Permissions = permissions
			return nil
		}
	}
	return domain.ErrMembershipNotFound
}

func (f *FakeRepository) LogAudit(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, userID *uuid.UUID, action, resource string, details any, ipAddress string) error {
	return nil
}

func TestIdentityService_MultiTenantAndSwitchTenant(t *testing.T) {
	fakeRepo := NewFakeRepository()
	tm := auth.NewTokenManager("test-super-secret-key-32-chars-length", 1*time.Hour)
	svc := NewService(nil, fakeRepo, tm)

	ctx := context.Background()

	// 1. Cadastrar usuário global
	userPass := "Secret@2026"
	userHash, _ := auth.HashPassword(userPass)
	user, err := domain.NewUser("gerente@cinemax.com.br", userHash, "Gerente Operacional", nil, nil)
	require.NoError(t, err)
	err = fakeRepo.CreateUser(ctx, nil, user)
	require.NoError(t, err)

	// 2. Criar Empresa 1 (Cinema São Paulo) e Empresa 2 (Cinema Manaus)
	tenantSP, err := domain.NewTenant(nil, "CineMax SP Ltda", nil, "12345678000190", nil, nil, "America/Sao_Paulo")
	require.NoError(t, err)
	err = fakeRepo.CreateTenant(ctx, nil, tenantSP)
	require.NoError(t, err)

	tenantAM, err := domain.NewTenant(nil, "CineMax Manaus Ltda", nil, "98765432000100", nil, nil, "America/Manaus")
	require.NoError(t, err)
	err = fakeRepo.CreateTenant(ctx, nil, tenantAM)
	require.NoError(t, err)

	// 3. Vincular o usuário às duas empresas (Operador em SP, Gerente em Manaus)
	mSP := domain.NewMembership(user.ID, tenantSP.ID, []string{"operator"}, []string{"pos.sell"}, nil)
	err = fakeRepo.CreateMembership(ctx, nil, mSP)
	require.NoError(t, err)

	mAM := domain.NewMembership(user.ID, tenantAM.ID, []string{"manager"}, []string{"finance.all", "reports.all"}, nil)
	err = fakeRepo.CreateMembership(ctx, nil, mAM)
	require.NoError(t, err)

	// 4. Teste de Login sem especificar tenant (Retorna lista de empresas para o Tenant Switcher)
	authRes, err := svc.Authenticate(ctx, "gerente@cinemax.com.br", userPass, nil)
	require.NoError(t, err)
	assert.Equal(t, user.ID, authRes.User.ID)
	assert.Len(t, authRes.Memberships, 2, "Usuario deve ver ambas as empresas")

	// 5. Teste de Troca para o Cinema de Manaus (Tenant Switcher)
	switchRes, err := svc.SwitchTenantContext(ctx, user.ID, tenantAM.ID)
	require.NoError(t, err)
	assert.NotEmpty(t, switchRes.AccessToken)
	assert.Equal(t, tenantAM.ID, switchRes.Tenant.TenantID)
	assert.Equal(t, []string{"manager"}, switchRes.Tenant.Roles)

	// Valida que o token emitido tem a claim do Tenant de Manaus
	claims, err := tm.ValidateToken(switchRes.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, tenantAM.ID, claims.TenantID)
	assert.Equal(t, user.ID, claims.UserID)
	assert.Equal(t, []string{"manager"}, claims.Roles)

	// 6. Teste de Troca para o Cinema de SP
	switchResSP, err := svc.SwitchTenantContext(ctx, user.ID, tenantSP.ID)
	require.NoError(t, err)
	claimsSP, err := tm.ValidateToken(switchResSP.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, tenantSP.ID, claimsSP.TenantID)
	assert.Equal(t, []string{"operator"}, claimsSP.Roles)

	// 7. Tentativa de switch para tenant que o usuário NÃO tem vínculo
	unauthorizedTenantID := uuid.New()
	_, errUnauthorized := svc.SwitchTenantContext(ctx, user.ID, unauthorizedTenantID)
	assert.ErrorIs(t, errUnauthorized, domain.ErrMembershipNotFound)
}
