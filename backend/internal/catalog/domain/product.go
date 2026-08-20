package domain

import (
	"fmt"
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type Product struct {
	ID          uuid.UUID     `json:"id"`
	TenantID    uuid.UUID     `json:"tenantId"`
	Name        string        `json:"name"`
	Description *string       `json:"description,omitempty"`
	Category    string        `json:"category"` // popcorn | beverage | candy | combo | merch | service
	BaseUnitID  uuid.UUID     `json:"baseUnitId"`
	NCM         *string       `json:"ncm,omitempty"`
	CEST        *string       `json:"cest,omitempty"`
	CostPrice   money.Subcent `json:"costPrice"`
	SalePrice   money.Cents   `json:"salePrice"`
	IsActive    bool          `json:"isActive"`
	IsCombo     bool          `json:"isCombo"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

func NewProduct(tenantID uuid.UUID, name, category string, baseUnitID uuid.UUID, ncm, cest *string, costPrice money.Subcent, salePrice money.Cents) (*Product, error) {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return nil, fmt.Errorf("nome do produto obrigatorio")
	}
	cleanCategory := strings.ToLower(strings.TrimSpace(category))
	switch cleanCategory {
	case "popcorn", "beverage", "candy", "combo", "merch", "service", "snack":
		// Categoria válida
	case "":
		cleanCategory = "snack"
	default:
		return nil, fmt.Errorf("categoria de produto invalida: use popcorn, beverage, candy, combo, merch, service ou snack")
	}
	if ncm != nil && *ncm != "" {
		cleanNCM := strings.ReplaceAll(strings.TrimSpace(*ncm), ".", "")
		if len(cleanNCM) != 8 {
			return nil, ErrInvalidNCM
		}
		ncm = &cleanNCM
	}

	now := time.Now()
	return &Product{
		ID:         uuid.New(),
		TenantID:   tenantID,
		Name:       cleanName,
		Category:   category,
		BaseUnitID: baseUnitID,
		NCM:        ncm,
		CEST:       cest,
		CostPrice:  costPrice,
		SalePrice:  salePrice,
		IsActive:   true,
		IsCombo:    false,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

type ProductBarcode struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	ProductID uuid.UUID `json:"productId"`
	UnitID    uuid.UUID `json:"unitId"`
	Barcode   string    `json:"barcode"`
	IsPrimary bool      `json:"isPrimary"`
	CreatedAt time.Time `json:"createdAt"`
}

func NewProductBarcode(tenantID, productID, unitID uuid.UUID, barcode string, isPrimary bool) (*ProductBarcode, error) {
	cleanBarcode := strings.TrimSpace(barcode)
	if cleanBarcode == "" {
		return nil, fmt.Errorf("codigo de barras obrigatorio")
	}

	return &ProductBarcode{
		ID:        uuid.New(),
		TenantID:  tenantID,
		ProductID: productID,
		UnitID:    unitID,
		Barcode:   cleanBarcode,
		IsPrimary: isPrimary,
		CreatedAt: time.Now(),
	}, nil
}
