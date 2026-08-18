package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"frame-24/internal/platform/httputil"
)

type contextKey string

const (
	claimsContextKey   contextKey = "frame24_claims"
	tenantIDContextKey contextKey = "frame24_tenant_id"
	userIDContextKey   contextKey = "frame24_user_id"
)

// Middleware intercepta requisições HTTP e valida o token Bearer JWT
func Middleware(tm *TokenManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httputil.RespondError(w, r, http.StatusUnauthorized, "AUTH_HEADER_MISSING", "Cabecalho de autorizacao ausente", nil)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				httputil.RespondError(w, r, http.StatusUnauthorized, "INVALID_TOKEN_FORMAT", "Formato de token invalido, use 'Bearer <token>'", nil)
				return
			}

			tokenString := parts[1]
			claims, err := tm.ValidateToken(tokenString)
			if err != nil {
				httputil.RespondError(w, r, http.StatusUnauthorized, "INVALID_OR_EXPIRED_TOKEN", "Token de autorizacao invalido ou expirado", nil)
				return
			}

			// Injeta claims no contexto da requisição
			ctx := r.Context()
			ctx = context.WithValue(ctx, claimsContextKey, claims)
			ctx = context.WithValue(ctx, tenantIDContextKey, claims.TenantID)
			ctx = context.WithValue(ctx, userIDContextKey, claims.UserID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims extrai as claims do JWT do contexto
func GetClaims(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(claimsContextKey).(*Claims)
	return claims, ok
}

// GetTenantID extrai o ID do tenant ativo do contexto
func GetTenantID(ctx context.Context) (uuid.UUID, bool) {
	tid, ok := ctx.Value(tenantIDContextKey).(uuid.UUID)
	return tid, ok
}

// GetUserID extrai o ID do usuário do contexto
func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	uid, ok := ctx.Value(userIDContextKey).(uuid.UUID)
	return uid, ok
}

// RequireRole cria um middleware que exige que o usuário possua ao menos um dos papéis informados
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaims(r.Context())
			if !ok || claims == nil {
				httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Acesso nao autenticado", nil)
				return
			}

			hasRole := false
			for _, userRole := range claims.Roles {
				for _, allowed := range allowedRoles {
					if strings.EqualFold(userRole, allowed) || userRole == "admin" || userRole == "superadmin" {
						hasRole = true
						break
					}
				}
				if hasRole {
					break
				}
			}

			if !hasRole {
				httputil.RespondError(w, r, http.StatusForbidden, "INSUFFICIENT_PERMISSIONS", "Acesso negado: permissao insuficiente", nil)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
