package http

import "github.com/google/uuid"

type CreateWarehouseRequest struct {
	ComplexID uuid.UUID `json:"complexId"`
	Name      string    `json:"name"`
	Code      string    `json:"code"`
	IsDefault bool      `json:"isDefault"`
}

type RecordPurchaseRequest struct {
	WarehouseID uuid.UUID  `json:"warehouseId"`
	ProductID   uuid.UUID  `json:"productId"`
	UnitID      uuid.UUID  `json:"unitId"`
	Quantity    float64    `json:"quantity"`
	UnitCost    float64    `json:"unitCost"`
	InvoiceID   *uuid.UUID `json:"invoiceId,omitempty"`
	Notes       *string    `json:"notes,omitempty"`
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
