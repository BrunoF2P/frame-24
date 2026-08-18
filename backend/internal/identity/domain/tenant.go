package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// Tenant representa a empresa/cinema (Matriz, Filial ou Cinema individual)
type Tenant struct {
	ID                    uuid.UUID  `json:"id"`
	ParentID              *uuid.UUID `json:"parentId,omitempty"`
	Name                  string     `json:"name"`
	TradeName             *string    `json:"tradeName,omitempty"`
	CNPJ                  string     `json:"cnpj"`
	StateRegistration     *string    `json:"stateRegistration,omitempty"`
	MunicipalRegistration *string    `json:"municipalRegistration,omitempty"`
	Timezone              string     `json:"timezone"`
	PlanType              string     `json:"planType"`
	Status                string     `json:"status"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

// NewTenant instancia um novo Tenant com validação de dados
func NewTenant(parentID *uuid.UUID, name string, tradeName *string, cnpj string, stateReg, munReg *string, timezone string) (*Tenant, error) {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return nil, ErrTenantNotFound
	}
	cleanCNPJ := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(cnpj), ".", ""), "-", ""), "/", "")
	if len(cleanCNPJ) != 14 {
		return nil, ErrInvalidCNPJ
	}
	if timezone == "" {
		timezone = "America/Sao_Paulo"
	}

	now := time.Now()
	return &Tenant{
		ID:                    uuid.New(),
		ParentID:              parentID,
		Name:                  cleanName,
		TradeName:             tradeName,
		CNPJ:                  cleanCNPJ,
		StateRegistration:     stateReg,
		MunicipalRegistration: munReg,
		Timezone:              timezone,
		PlanType:              "standard",
		Status:                "active",
		CreatedAt:             now,
		UpdatedAt:             now,
	}, nil
}
