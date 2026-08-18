package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// ProductUnit representa uma unidade de medida (ex: UN, CX24, FD12, KG, LT) com fator de conversão
type ProductUnit struct {
	ID               uuid.UUID  `json:"id"`
	TenantID         uuid.UUID  `json:"tenantId"`
	Name             string     `json:"name"`
	Acronym          string     `json:"acronym"`
	IsBaseUnit       bool       `json:"isBaseUnit"`
	BaseUnitID       *uuid.UUID `json:"baseUnitId,omitempty"`
	ConversionFactor float64    `json:"conversionFactor"`
	IsActive         bool       `json:"isActive"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

func NewProductUnit(tenantID uuid.UUID, name, acronym string, isBaseUnit bool, baseUnitID *uuid.UUID, factor float64) (*ProductUnit, error) {
	cleanName := strings.TrimSpace(name)
	cleanAcronym := strings.ToUpper(strings.TrimSpace(acronym))
	if cleanName == "" || cleanAcronym == "" {
		return nil, ErrUnitNotFound
	}
	if factor <= 0 {
		return nil, ErrInvalidConversion
	}
	if isBaseUnit {
		factor = 1.0
		baseUnitID = nil
	}

	now := time.Now()
	return &ProductUnit{
		ID:               uuid.New(),
		TenantID:         tenantID,
		Name:             cleanName,
		Acronym:          cleanAcronym,
		IsBaseUnit:       isBaseUnit,
		BaseUnitID:       baseUnitID,
		ConversionFactor: factor,
		IsActive:         true,
		CreatedAt:        now,
		UpdatedAt:        now,
	}, nil
}

// ConvertToBaseUnit calcula a quantidade equivalente na unidade base
func (u *ProductUnit) ConvertToBaseUnit(quantity float64) float64 {
	return quantity * u.ConversionFactor
}
