package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// User representa a pessoa física global no Frame-24
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"fullName"`
	CPF          *string   `json:"cpf,omitempty"`
	Phone        *string   `json:"phone,omitempty"`
	IsActive     bool      `json:"isActive"`
	MFASecret    *string   `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// NewUser instancia e valida uma nova pessoa física no sistema
func NewUser(email, passwordHash, fullName string, cpf, phone *string) (*User, error) {
	cleanEmail := strings.TrimSpace(strings.ToLower(email))
	if cleanEmail == "" || !strings.Contains(cleanEmail, "@") {
		return nil, ErrInvalidEmail
	}
	cleanName := strings.TrimSpace(fullName)
	if cleanName == "" {
		return nil, ErrInvalidCredentials
	}

	now := time.Now()
	return &User{
		ID:           uuid.New(),
		Email:        cleanEmail,
		PasswordHash: passwordHash,
		FullName:     cleanName,
		CPF:          cpf,
		Phone:        phone,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}, nil
}
