package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPasswordHashing(t *testing.T) {
	password := "Secret@2026"

	hash, err := HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)

	assert.True(t, CheckPassword(password, hash))
	assert.False(t, CheckPassword("WrongPassword", hash))

	_, errShort := HashPassword("123")
	assert.Error(t, errShort)
}

func TestTokenManager_GenerateAndValidate(t *testing.T) {
	tm := NewTokenManager("test-super-secret-key-32-chars-length", 1*time.Hour)

	userID := uuid.New()
	tenantID := uuid.New()
	complexID := uuid.New()

	token, err := tm.GenerateToken(
		userID,
		tenantID,
		"gerente@cinemax.com.br",
		"Gerente Regional",
		[]string{"manager", "financial_viewer"},
		[]string{"sales.read", "finance.read"},
		[]uuid.UUID{complexID},
	)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	claims, err := tm.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, tenantID, claims.TenantID)
	assert.Equal(t, "gerente@cinemax.com.br", claims.Email)
	assert.Equal(t, "Gerente Regional", claims.FullName)
	assert.Equal(t, []string{"manager", "financial_viewer"}, claims.Roles)
	assert.Equal(t, []string{"sales.read", "finance.read"}, claims.Permissions)
	assert.Equal(t, []uuid.UUID{complexID}, claims.ComplexIDs)
}

func TestTokenManager_ExpiredToken(t *testing.T) {
	tm := NewTokenManager("test-super-secret-key-32-chars-length", -1*time.Minute)

	token, err := tm.GenerateToken(
		uuid.New(), uuid.New(), "user@test.com", "User", []string{"staff"}, nil, nil,
	)
	require.NoError(t, err)

	_, err = tm.ValidateToken(token)
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestAuthMiddleware(t *testing.T) {
	tm := NewTokenManager("test-super-secret-key-32-chars-length", 1*time.Hour)
	userID := uuid.New()
	tenantID := uuid.New()

	token, err := tm.GenerateToken(userID, tenantID, "user@test.com", "Test User", []string{"operator"}, nil, nil)
	require.NoError(t, err)

	var extractedTenantID uuid.UUID
	var extractedUserID uuid.UUID

	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tid, okT := GetTenantID(r.Context())
		uid, okU := GetUserID(r.Context())
		if okT {
			extractedTenantID = tid
		}
		if okU {
			extractedUserID = uid
		}
		w.WriteHeader(http.StatusOK)
	})

	handlerToTest := Middleware(tm)(testHandler)

	// 1. Requisição válida com Bearer
	req := httptest.NewRequest("GET", "/api/v1/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, tenantID, extractedTenantID)
	assert.Equal(t, userID, extractedUserID)

	// 2. Requisição sem token (Unauthorized)
	reqNoAuth := httptest.NewRequest("GET", "/api/v1/protected", nil)
	recNoAuth := httptest.NewRecorder()
	handlerToTest.ServeHTTP(recNoAuth, reqNoAuth)
	assert.Equal(t, http.StatusUnauthorized, recNoAuth.Code)

	// 3. Requisição com token inválido
	reqBadToken := httptest.NewRequest("GET", "/api/v1/protected", nil)
	reqBadToken.Header.Set("Authorization", "Bearer invalid-token-string")
	recBadToken := httptest.NewRecorder()
	handlerToTest.ServeHTTP(recBadToken, reqBadToken)
	assert.Equal(t, http.StatusUnauthorized, recBadToken.Code)
}

func TestRequireRole(t *testing.T) {
	tm := NewTokenManager("test-super-secret-key-32-chars-length", 1*time.Hour)

	adminToken, _ := tm.GenerateToken(uuid.New(), uuid.New(), "admin@test.com", "Admin", []string{"admin"}, nil, nil)
	operatorToken, _ := tm.GenerateToken(uuid.New(), uuid.New(), "op@test.com", "Operator", []string{"operator"}, nil, nil)

	guardedHandler := Middleware(tm)(RequireRole("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))

	// Admin tem acesso
	reqAdmin := httptest.NewRequest("POST", "/admin-only", nil)
	reqAdmin.Header.Set("Authorization", "Bearer "+adminToken)
	recAdmin := httptest.NewRecorder()
	guardedHandler.ServeHTTP(recAdmin, reqAdmin)
	assert.Equal(t, http.StatusOK, recAdmin.Code)

	// Operator é bloqueado com 403 Forbidden
	reqOp := httptest.NewRequest("POST", "/admin-only", nil)
	reqOp.Header.Set("Authorization", "Bearer "+operatorToken)
	recOp := httptest.NewRecorder()
	guardedHandler.ServeHTTP(recOp, reqOp)
	assert.Equal(t, http.StatusForbidden, recOp.Code)
}
