package domain

import (
	"strings"
	"time"

	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type MovementType string

const (
	MovementTypePurchaseIn      MovementType = "purchase_in"
	MovementTypeSaleOut         MovementType = "sale_out"
	MovementTypeDiscardOut      MovementType = "discard_out"
	MovementTypeTransferIn      MovementType = "transfer_in"
	MovementTypeTransferOut     MovementType = "transfer_out"
	MovementTypeAuditAdjustment MovementType = "audit_adjustment"
)

func IsValidMovementType(m string) bool {
	switch MovementType(strings.ToLower(strings.TrimSpace(m))) {
	case MovementTypePurchaseIn, MovementTypeSaleOut, MovementTypeDiscardOut,
		MovementTypeTransferIn, MovementTypeTransferOut, MovementTypeAuditAdjustment:
		return true
	default:
		return false
	}
}

// Warehouse representa um local físico de armazenagem no complexo
type Warehouse struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	ComplexID uuid.UUID `json:"complexId"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	IsDefault bool      `json:"isDefault"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func NewWarehouse(tenantID, complexID uuid.UUID, name, code string, isDefault bool) (*Warehouse, error) {
	cleanName := strings.TrimSpace(name)
	cleanCode := strings.ToUpper(strings.TrimSpace(code))
	if cleanName == "" || cleanCode == "" {
		return nil, ErrInvalidQuantity // ou erro de validação
	}

	now := time.Now()
	return &Warehouse{
		ID:        uuid.New(),
		TenantID:  tenantID,
		ComplexID: complexID,
		Name:      cleanName,
		Code:      cleanCode,
		IsDefault: isDefault,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// StockLevel é a visão materializada do saldo de um produto no almoxarifado
type StockLevel struct {
	ID              uuid.UUID `json:"id"`
	TenantID        uuid.UUID `json:"tenantId"`
	WarehouseID     uuid.UUID `json:"warehouseId"`
	ProductID       uuid.UUID `json:"productId"`
	UnitID          uuid.UUID `json:"unitId"`
	CurrentQuantity float64   `json:"currentQuantity"`
	MinimumQuantity float64   `json:"minimumQuantity"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Movement representa um lançamento físico imutável no livro de movimentações
type Movement struct {
	ID            uuid.UUID     `json:"id"`
	TenantID      uuid.UUID     `json:"tenantId"`
	WarehouseID   uuid.UUID     `json:"warehouseId"`
	ProductID     uuid.UUID     `json:"productId"`
	UnitID        uuid.UUID     `json:"unitId"`
	MovementType  MovementType  `json:"movementType"`
	Quantity      float64       `json:"quantity"`
	UnitCost      money.Subcent `json:"unitCost"`
	TotalCost     money.Cents   `json:"totalCost"`
	ReferenceType *string       `json:"referenceType,omitempty"`
	ReferenceID   *uuid.UUID    `json:"referenceId,omitempty"`
	OperatorID    *uuid.UUID    `json:"operatorId,omitempty"`
	Notes         *string       `json:"notes,omitempty"`
	CreatedAt     time.Time     `json:"createdAt"`
}

func NewMovement(
	tenantID, warehouseID, productID, unitID uuid.UUID,
	mType string,
	quantity float64, unitCost money.Subcent,
	refType *string,
	refID, operatorID *uuid.UUID,
	notes *string,
) (*Movement, error) {
	if !IsValidMovementType(mType) {
		return nil, ErrInvalidMovementType
	}
	cleanType := MovementType(strings.ToLower(strings.TrimSpace(mType)))
	if cleanType == MovementTypeAuditAdjustment {
		if quantity < 0 {
			return nil, ErrInvalidQuantity
		}
	} else {
		if quantity <= 0 {
			return nil, ErrInvalidQuantity
		}
	}

	totalCost := unitCost.MulQuantityToCents(quantity)
	if totalCost < 0 {
		totalCost = 0
	}

	return &Movement{
		ID:            uuid.New(),
		TenantID:      tenantID,
		WarehouseID:   warehouseID,
		ProductID:     productID,
		UnitID:        unitID,
		MovementType:  cleanType,
		Quantity:      quantity,
		UnitCost:      unitCost,
		TotalCost:     totalCost,
		ReferenceType: refType,
		ReferenceID:   refID,
		OperatorID:    operatorID,
		Notes:         notes,
		CreatedAt:     time.Now(),
	}, nil
}
