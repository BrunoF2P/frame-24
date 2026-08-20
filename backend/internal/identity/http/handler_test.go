package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"frame-24/internal/identity/app"
	"frame-24/internal/identity/domain"
	"frame-24/internal/platform/auth"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type memoryRepo struct {
	users       map[string]*domain.User
	usersByID   map[uuid.UUID]*domain.User
	tenants     map[uuid.UUID]*domain.Tenant
	tenantsCNPJ map[string]*domain.Tenant
	memberships map[string]*domain.TenantMembership
}

func newMemoryRepo() *memoryRepo {
	return &memoryRepo{
		users:       make(map[string]*domain.User),
		usersByID:   make(map[uuid.UUID]*domain.User),
		tenants:     make(map[uuid.UUID]*domain.Tenant),
		tenantsCNPJ: make(map[string]*domain.Tenant),
		memberships: make(map[string]*domain.TenantMembership),
	}
}

func (m *memoryRepo) CreateUser(ctx context.Context, tx pgx.Tx, user *domain.User) error {
	if _, exists := m.users[user.Email]; exists {
		return domain.ErrUserAlreadyExists
	}
	m.users[user.Email] = user
	m.usersByID[user.ID] = user
	return nil
}

func (m *memoryRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	u, ok := m.usersByID[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (m *memoryRepo) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	u, ok := m.users[email]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return u, nil
}

func (m *memoryRepo) CreateTenant(ctx context.Context, tx pgx.Tx, tenant *domain.Tenant) error {
	if _, exists := m.tenantsCNPJ[tenant.CNPJ]; exists {
		return domain.ErrTenantAlreadyExists
	}
	m.tenants[tenant.ID] = tenant
	m.tenantsCNPJ[tenant.CNPJ] = tenant
	return nil
}

func (m *memoryRepo) GetTenantByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	t, ok := m.tenants[id]
	if !ok {
		return nil, domain.ErrTenantNotFound
	}
	return t, nil
}

func (m *memoryRepo) GetTenantByCNPJ(ctx context.Context, cnpj string) (*domain.Tenant, error) {
	t, ok := m.tenantsCNPJ[cnpj]
	if !ok {
		return nil, domain.ErrTenantNotFound
	}
	return t, nil
}

func (m *memoryRepo) ListTenantsByParentID(ctx context.Context, parentID uuid.UUID) ([]domain.Tenant, error) {
	var list []domain.Tenant
	for _, t := range m.tenants {
		if (t.ParentID != nil && *t.ParentID == parentID) || t.ID == parentID {
			list = append(list, *t)
		}
	}
	return list, nil
}

func (m *memoryRepo) CreateMembership(ctx context.Context, tx pgx.Tx, mem *domain.TenantMembership) error {
	key := mem.UserID.String() + "_" + mem.TenantID.String()
	m.memberships[key] = mem
	return nil
}

func (m *memoryRepo) GetMembership(ctx context.Context, userID, tenantID uuid.UUID) (*domain.TenantMembership, error) {
	key := userID.String() + "_" + tenantID.String()
	mem, ok := m.memberships[key]
	if !ok {
		return nil, domain.ErrMembershipNotFound
	}
	return mem, nil
}

func (m *memoryRepo) ListMembershipsByUserID(ctx context.Context, userID uuid.UUID) ([]domain.TenantMembershipView, error) {
	var views []domain.TenantMembershipView
	for _, mem := range m.memberships {
		if mem.UserID == userID {
			t, ok := m.tenants[mem.TenantID]
			if ok && t.Status == "active" {
				views = append(views, domain.TenantMembershipView{
					MembershipID: mem.ID,
					TenantID:     t.ID,
					TenantName:   t.Name,
					TradeName:    t.TradeName,
					CNPJ:         t.CNPJ,
					Roles:        mem.Roles,
					Permissions:  mem.Permissions,
					ComplexIDs:   mem.ComplexIDs,
					IsActive:     mem.IsActive,
				})
			}
		}
	}
	return views, nil
}

func (m *memoryRepo) UpdateMembershipRoles(ctx context.Context, tx pgx.Tx, membershipID uuid.UUID, roles []string, permissions []string) error {
	for _, mem := range m.memberships {
		if mem.ID == membershipID {
			mem.Roles = roles
			mem.Permissions = permissions
			return nil
		}
	}
	return domain.ErrMembershipNotFound
}

func (m *memoryRepo) LogAudit(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, userID *uuid.UUID, action, resource string, details any, ipAddress string) error {
	return nil
}

func setupTestServer() (http.Handler, *memoryRepo, *auth.TokenManager) {
	repo := newMemoryRepo()
	tm := auth.NewTokenManager("test-jwt-secret-key-32-chars-length", 2*time.Hour)
	svc := app.NewService(nil, repo, tm)
	handler := NewHandler(svc)

	r := chi.NewRouter()
	MountRoutes(r, handler, tm)
	return r, repo, tm
}

func TestHTTP_RegisterAndLogin(t *testing.T) {
	router, repo, _ := setupTestServer()

	// 1. Registro de Usuário
	regBody, _ := json.Marshal(RegisterRequest{
		Email:    "operador@cinema.com",
		Password: "Password@123",
		FullName: "Operador de Bilheteria",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusCreated, rec.Code)
	var regResp map[string]any
	err := json.Unmarshal(rec.Body.Bytes(), &regResp)
	require.NoError(t, err)
	assert.Equal(t, "operador@cinema.com", regResp["email"])
	userIDStr := regResp["id"].(string)
	userID := uuid.MustParse(userIDStr)

	// Cria Tenant e Membership diretamente no repo para testar login
	tenant, _ := domain.NewTenant(nil, "Cine Shopping", nil, "11222333000144", nil, nil, "America/Sao_Paulo")
	_ = repo.CreateTenant(context.Background(), nil, tenant)
	mem := domain.NewMembership(userID, tenant.ID, []string{"pos_operator"}, []string{"sales.create"}, nil)
	_ = repo.CreateMembership(context.Background(), nil, mem)

	// 2. Login
	loginBody, _ := json.Marshal(LoginRequest{
		Email:    "operador@cinema.com",
		Password: "Password@123",
	})
	reqLogin := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(loginBody))
	reqLogin.Header.Set("Content-Type", "application/json")
	recLogin := httptest.NewRecorder()
	router.ServeHTTP(recLogin, reqLogin)

	assert.Equal(t, http.StatusOK, recLogin.Code)
	var loginResp app.AuthResult
	err = json.Unmarshal(recLogin.Body.Bytes(), &loginResp)
	require.NoError(t, err)
	assert.NotNil(t, loginResp.ActiveToken)
	assert.Equal(t, tenant.ID, *loginResp.ActiveTenant)
	assert.Len(t, loginResp.Memberships, 1)

	// 3. /api/v1/auth/me autenticado
	reqMe := httptest.NewRequest("GET", "/api/v1/auth/me", nil)
	reqMe.Header.Set("Authorization", "Bearer "+*loginResp.ActiveToken)
	recMe := httptest.NewRecorder()
	router.ServeHTTP(recMe, reqMe)

	assert.Equal(t, http.StatusOK, recMe.Code)
	var meResp map[string]any
	err = json.Unmarshal(recMe.Body.Bytes(), &meResp)
	require.NoError(t, err)
	assert.Equal(t, "operador@cinema.com", meResp["email"])
	assert.Equal(t, tenant.ID.String(), meResp["activeTenantId"])
}

func TestHTTP_SwitchTenant(t *testing.T) {
	router, repo, tm := setupTestServer()

	// Cadastrar usuário
	userHash, _ := auth.HashPassword("Pass@123")
	user, _ := domain.NewUser("diretor@redes.com", userHash, "Diretor Regional", nil, nil)
	_ = repo.CreateUser(context.Background(), nil, user)

	// Criar Cinema 1 (Rio) e Cinema 2 (Belo Horizonte)
	tenantRio, _ := domain.NewTenant(nil, "Cinema Rio", nil, "11111111000111", nil, nil, "America/Sao_Paulo")
	_ = repo.CreateTenant(context.Background(), nil, tenantRio)
	tenantBH, _ := domain.NewTenant(nil, "Cinema BH", nil, "22222222000122", nil, nil, "America/Sao_Paulo")
	_ = repo.CreateTenant(context.Background(), nil, tenantBH)

	_ = repo.CreateMembership(context.Background(), nil, domain.NewMembership(user.ID, tenantRio.ID, []string{"manager"}, nil, nil))
	_ = repo.CreateMembership(context.Background(), nil, domain.NewMembership(user.ID, tenantBH.ID, []string{"director"}, nil, nil))

	// Token inicial conectado ao Rio
	initialToken, _ := tm.GenerateToken(user.ID, tenantRio.ID, user.Email, user.FullName, []string{"manager"}, nil, nil)

	// Executa Switch para o Cinema BH
	switchBody, _ := json.Marshal(SwitchTenantRequest{TargetTenantID: tenantBH.ID.String()})
	reqSwitch := httptest.NewRequest("POST", "/api/v1/auth/switch-tenant", bytes.NewReader(switchBody))
	reqSwitch.Header.Set("Authorization", "Bearer "+initialToken)
	reqSwitch.Header.Set("Content-Type", "application/json")
	recSwitch := httptest.NewRecorder()
	router.ServeHTTP(recSwitch, reqSwitch)

	assert.Equal(t, http.StatusOK, recSwitch.Code)
	var switchResp app.SwitchTenantResult
	err := json.Unmarshal(recSwitch.Body.Bytes(), &switchResp)
	require.NoError(t, err)
	assert.NotEmpty(t, switchResp.AccessToken)
	assert.Equal(t, tenantBH.ID, switchResp.Tenant.TenantID)
	assert.Equal(t, []string{"director"}, switchResp.Tenant.Roles)

	// Valida que o novo token tem a claim do Tenant BH
	claims, err := tm.ValidateToken(switchResp.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, tenantBH.ID, claims.TenantID)
	assert.Equal(t, []string{"director"}, claims.Roles)
}
