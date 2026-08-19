package repo

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"frame-24/internal/inventory/domain"
)

type Repository interface {
	CreateWarehouse(ctx context.Context, tx pgx.Tx, w *domain.Warehouse) error
	GetDefaultWarehouse(ctx context.Context, tenantID, complexID uuid.UUID) (*domain.Warehouse, error)
	GetWarehouseByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Warehouse, error)
	ListWarehouses(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Warehouse, error)
	GetStockLevel(ctx context.Context, tenantID, warehouseID, productID, unitID uuid.UUID) (*domain.StockLevel, error)
	ListStockLevels(ctx context.Context, tenantID, warehouseID uuid.UUID) ([]domain.StockLevel, error)
	RecordMovement(ctx context.Context, tx pgx.Tx, m *domain.Movement) (*domain.StockLevel, error)
	ListMovements(ctx context.Context, tenantID, warehouseID uuid.UUID, limit int) ([]domain.Movement, error)
}
