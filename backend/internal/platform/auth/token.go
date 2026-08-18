package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("token JWT invalido ou expirado")
	ErrMissingToken = errors.New("token de autorizacao ausente no cabecalho")
)

// Claims contém a estrutura de payload de autenticação do Frame-24
type Claims struct {
	UserID      uuid.UUID   `json:"uid"`
	TenantID    uuid.UUID   `json:"tid"`
	Email       string      `json:"email"`
	FullName    string      `json:"name"`
	Roles       []string    `json:"roles"`
	Permissions []string    `json:"permissions"`
	ComplexIDs  []uuid.UUID `json:"complexIds,omitempty"`
	jwt.RegisteredClaims
}

// TokenManager gerencia emissão e validação de tokens JWT
type TokenManager struct {
	secretKey     []byte
	issuer        string
	tokenDuration time.Duration
}

// NewTokenManager instancia um TokenManager
func NewTokenManager(secretKey string, tokenDuration time.Duration) *TokenManager {
	if tokenDuration == 0 {
		tokenDuration = 24 * time.Hour
	}
	return &TokenManager{
		secretKey:     []byte(secretKey),
		issuer:        "frame-24-auth",
		tokenDuration: tokenDuration,
	}
}

// GenerateToken cria um novo JWT assinado com claims de usuário e tenant ativo
func (tm *TokenManager) GenerateToken(
	userID uuid.UUID,
	tenantID uuid.UUID,
	email string,
	fullName string,
	roles []string,
	permissions []string,
	complexIDs []uuid.UUID,
) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:      userID,
		TenantID:    tenantID,
		Email:       email,
		FullName:    fullName,
		Roles:       roles,
		Permissions: permissions,
		ComplexIDs:  complexIDs,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			Issuer:    tm.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.tokenDuration)),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(tm.secretKey)
	if err != nil {
		return "", fmt.Errorf("falha ao assinar JWT: %w", err)
	}

	return tokenString, nil
}

// ValidateToken decodifica e valida a assinatura e expiração do JWT
func (tm *TokenManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metodo de assinatura inesperado: %v", token.Header["alg"])
		}
		return tm.secretKey, nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
