package domain

import (
	"time"

	"github.com/google/uuid"
)

// TenantMembership representa o vínculo de trabalho/papel de um usuário em um Tenant específico
type TenantMembership struct {
	ID          uuid.UUID   `json:"id"`
	UserID      uuid.UUID   `json:"userId"`
	TenantID    uuid.UUID   `json:"tenantId"`
	Roles       []string    `json:"roles"`
	Permissions []string    `json:"permissions"`
	ComplexIDs  []uuid.UUID `json:"complexIds,omitempty"`
	IsActive    bool        `json:"isActive"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
}

// TenantMembershipView agrega dados do Tenant para visualização amigável no Tenant Switcher
type TenantMembershipView struct {
	MembershipID uuid.UUID   `json:"membershipId"`
	TenantID     uuid.UUID   `json:"tenantId"`
	TenantName   string      `json:"tenantName"`
	TradeName    *string     `json:"tradeName,omitempty"`
	CNPJ         string      `json:"cnpj"`
	Roles        []string    `json:"roles"`
	Permissions  []string    `json:"permissions"`
	ComplexIDs   []uuid.UUID `json:"complexIds,omitempty"`
	IsActive     bool        `json:"isActive"`
}

// NewMembership cria um novo vínculo de trabalho
func NewMembership(userID, tenantID uuid.UUID, roles []string, permissions []string, complexIDs []uuid.UUID) *TenantMembership {
	if len(roles) == 0 {
		roles = []string{"staff"}
	}
	if permissions == nil {
		permissions = []string{}
	}

	now := time.Now()
	return &TenantMembership{
		ID:          uuid.New(),
		UserID:      userID,
		TenantID:    tenantID,
		Roles:       roles,
		Permissions: permissions,
		ComplexIDs:  complexIDs,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}
