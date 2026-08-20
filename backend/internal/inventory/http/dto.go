package http

import (
	"frame-24/internal/platform/money"
	"github.com/google/uuid"
)

type CreateWarehouseRequest struct {
	ComplexID uuid.UUID `json:"complexId"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	IsDefault bool      `json:"isDefault"`
}

type RecordPurchaseRequest struct {
	WarehouseID uuid.UUID     `json:"warehouseId"`
	ProductID   uuid.UUID     `json:"productId"`
	UnitID      uuid.UUID     `json:"unitId"`
	Quantity    float64       `json:"quantity"`
	UnitCost    money.Subcent `json:"unitCost"`
	InvoiceID   *uuid.UUID    `json:"invoiceId,omitempty"`
	Notes       *string       `json:"notes,omitempty"`
}

type RecordDiscardRequest struct {
	WarehouseID uuid.UUID `json:"warehouseId"`
	ProductID   uuid.UUID `json:"productId"`
	UnitID      uuid.UUID `json:"unitId"`
	Quantity    float64   `json:"quantity"`
	Reason      string    `json:"reason"`
}

type AuditAdjustmentRequest struct {
	WarehouseID     uuid.UUID `json:"warehouseId"`
	ProductID       uuid.UUID `json:"productId"`
	UnitID          uuid.UUID `json:"unitId"`
	CountedQuantity float64   `json:"countedQuantity"`
	Notes           *string   `json:"notes,omitempty"`
}
