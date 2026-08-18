package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Combo struct {
	ID         uuid.UUID   `json:"id"`
	TenantID   uuid.UUID   `json:"tenantId"`
	ProductID  uuid.UUID   `json:"productId"`
	Name       string      `json:"name"`
	ComboPrice float64     `json:"comboPrice"`
	IsActive   bool        `json:"isActive"`
	Items      []ComboItem `json:"items,omitempty"`
	CreatedAt  time.Time   `json:"createdAt"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}

type ComboItem struct {
	ID              uuid.UUID `json:"id"`
	TenantID        uuid.UUID `json:"tenantId"`
	ComboID         uuid.UUID `json:"comboId"`
	GroupName       string    `json:"groupName"` // ex: "Escolha a Pipoca", "Escolha a Bebida"
	ProductID       uuid.UUID `json:"productId"`
	UnitID          uuid.UUID `json:"unitId"`
	Quantity        float64   `json:"quantity"`
	AdditionalPrice float64   `json:"additionalPrice"`
}

func NewCombo(tenantID, productID uuid.UUID, name string, comboPrice float64) (*Combo, error) {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return nil, fmt.Errorf("nome do combo obrigatorio")
	}
	if comboPrice < 0 {
		return nil, fmt.Errorf("preco do combo invalido")
	}

	now := time.Now()
	return &Combo{
		ID:         uuid.New(),
		TenantID:   tenantID,
		ProductID:  productID,
		Name:       cleanName,
		ComboPrice: comboPrice,
		IsActive:   true,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}
