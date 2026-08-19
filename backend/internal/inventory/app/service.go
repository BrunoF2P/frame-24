package app

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/inventory/domain"
	"frame-24/internal/inventory/repo"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/outbox"
)

type Service struct {
	pool *pgxpool.Pool
	repo repo.Repository
}

func NewService(pool *pgxpool.Pool, r repo.Repository) *Service {
	return &Service{
		pool: pool,
		repo: r,
	}
}

func (s *Service) CreateWarehouse(ctx context.Context, tenantID, complexID uuid.UUID, name, code string, isDefault bool) (*domain.Warehouse, error) {
	w, err := domain.NewWarehouse(tenantID, complexID, name, code, isDefault)
	if err != nil {
		return nil, err
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateWarehouse(ctx, tx, w); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, tenantID, "inventory.warehouse.created", w.ID, map[string]any{
			"warehouseId": w.ID,
			"complexId":   w.ComplexID,
			"code":        w.Code,
			"name":        w.Name,
		})
	})

	if err != nil {
		return nil, err
	}
	return w, nil
}

func (s *Service) ListWarehouses(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Warehouse, error) {
	return s.repo.ListWarehouses(ctx, tenantID, complexID)
}

func (s *Service) GetStockLevels(ctx context.Context, tenantID, warehouseID uuid.UUID) ([]domain.StockLevel, error) {
	return s.repo.ListStockLevels(ctx, tenantID, warehouseID)
}

func (s *Service) RecordPurchase(
	ctx context.Context,
	tenantID, warehouseID, productID, unitID uuid.UUID,
	quantity, unitCost float64,
	invoiceID, operatorID *uuid.UUID,
	notes *string,
) (*domain.StockLevel, error) {
	refType := "invoice"
	m, err := domain.NewMovement(
		tenantID, warehouseID, productID, unitID,
		string(domain.MovementTypePurchaseIn),
		quantity, unitCost,
		&refType, invoiceID, operatorID, notes,
	)
	if err != nil {
		return nil, err
	}

	var sl *domain.StockLevel
	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		var e error
		sl, e = s.repo.RecordMovement(ctx, tx, m)
		if e != nil {
			return e
		}
		return outbox.InsertEvent(ctx, tx, tenantID, "inventory.stock.received", m.ID, map[string]any{
			"movementId":  m.ID,
			"warehouseId": warehouseID,
			"productId":   productID,
			"unitId":      unitID,
			"quantity":    quantity,
			"newStock":    sl.CurrentQuantity,
		})
	})

	if err != nil {
		return nil, err
	}
	return sl, nil
}

func (s *Service) RecordDiscard(
	ctx context.Context,
	tenantID, warehouseID, productID, unitID uuid.UUID,
	quantity float64,
	reason string,
	operatorID *uuid.UUID,
) (*domain.StockLevel, error) {
	refType := "discard"
	m, err := domain.NewMovement(
		tenantID, warehouseID, productID, unitID,
		string(domain.MovementTypeDiscardOut),
		quantity, 0,
		&refType, nil, operatorID, &reason,
	)
	if err != nil {
		return nil, err
	}

	var sl *domain.StockLevel
	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		var e error
		sl, e = s.repo.RecordMovement(ctx, tx, m)
		if e != nil {
			return e
		}
		return outbox.InsertEvent(ctx, tx, tenantID, "inventory.stock.discarded", m.ID, map[string]any{
			"movementId":  m.ID,
			"warehouseId": warehouseID,
			"productId":   productID,
			"unitId":      unitID,
			"quantity":    quantity,
			"reason":      reason,
			"newStock":    sl.CurrentQuantity,
		})
	})

	if err != nil {
		return nil, err
	}
	return sl, nil
}

func (s *Service) AuditAdjustment(
	ctx context.Context,
	tenantID, warehouseID, productID, unitID uuid.UUID,
	countedQuantity float64,
	operatorID *uuid.UUID,
	notes *string,
) (*domain.StockLevel, error) {
	if countedQuantity < 0 {
		return nil, domain.ErrInvalidQuantity
	}

	refType := "audit"
	m, err := domain.NewMovement(
		tenantID, warehouseID, productID, unitID,
		string(domain.MovementTypeAuditAdjustment),
		countedQuantity, 0,
		&refType, nil, operatorID, notes,
	)
	if err != nil {
		return nil, err
	}

	var sl *domain.StockLevel
	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		var e error
		sl, e = s.repo.RecordMovement(ctx, tx, m)
		if e != nil {
			return e
		}
		return outbox.InsertEvent(ctx, tx, tenantID, "inventory.stock.adjusted", m.ID, map[string]any{
			"movementId":   m.ID,
			"warehouseId":  warehouseID,
			"productId":    productID,
			"unitId":       unitID,
			"countedStock": countedQuantity,
		})
	})

	if err != nil {
		return nil, err
	}
	return sl, nil
}

// DeductSaleItem realiza a baixa física de um produto vendido
func (s *Service) DeductSaleItem(
	ctx context.Context,
	tenantID, complexID, productID, unitID uuid.UUID,
	quantity float64,
	saleID uuid.UUID,
) error {
	wh, err := s.repo.GetDefaultWarehouse(ctx, tenantID, complexID)
	if err != nil {
		return fmt.Errorf("almoxarifado padrao nao encontrado para o complexo: %w", err)
	}

	refType := "sale"
	m, err := domain.NewMovement(
		tenantID, wh.ID, productID, unitID,
		string(domain.MovementTypeSaleOut),
		quantity, 0,
		&refType, &saleID, nil, nil,
	)
	if err != nil {
		return err
	}

	return db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		_, e := s.repo.RecordMovement(ctx, tx, m)
		return e
	})
}

func (s *Service) ListMovements(ctx context.Context, tenantID, warehouseID uuid.UUID, limit int) ([]domain.Movement, error) {
	return s.repo.ListMovements(ctx, tenantID, warehouseID, limit)
}
