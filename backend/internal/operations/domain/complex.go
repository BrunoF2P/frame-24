package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type CinemaComplex struct {
	ID                  uuid.UUID `json:"id"`
	TenantID            uuid.UUID `json:"tenantId"`
	Name                string    `json:"name"`
	CNPJFilial          string    `json:"cnpjFilial"`
	StateRegistration   *string   `json:"stateRegistration,omitempty"`
	AncineCode          *string   `json:"ancineCode,omitempty"`
	Timezone            string    `json:"timezone"`
	AddressStreet       *string   `json:"addressStreet,omitempty"`
	AddressNumber       *string   `json:"addressNumber,omitempty"`
	AddressNeighborhood *string   `json:"addressNeighborhood,omitempty"`
	AddressCity         *string   `json:"addressCity,omitempty"`
	AddressState        *string   `json:"addressState,omitempty"`
	AddressZipCode      *string   `json:"addressZipCode,omitempty"`
	Status              string    `json:"status"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

func NewCinemaComplex(tenantID uuid.UUID, name, cnpjFilial, timezone string, ancineCode, stateReg *string) (*CinemaComplex, error) {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return nil, ErrComplexNotFound
	}
	cleanCNPJ := strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSpace(cnpjFilial), ".", ""), "-", ""), "/", "")
	if len(cleanCNPJ) != 14 {
		return nil, ErrComplexAlreadyExists
	}
	if timezone == "" {
		timezone = "America/Sao_Paulo"
	}
	_, err := time.LoadLocation(timezone)
	if err != nil {
		return nil, ErrInvalidTimezone
	}

	now := time.Now()
	return &CinemaComplex{
		ID:                uuid.New(),
		TenantID:          tenantID,
		Name:              cleanName,
		CNPJFilial:        cleanCNPJ,
		StateRegistration: stateReg,
		AncineCode:        ancineCode,
		Timezone:          timezone,
		Status:            "active",
		CreatedAt:         now,
		UpdatedAt:         now,
	}, nil
}
