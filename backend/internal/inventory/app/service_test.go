package app

import (
	"context"
	"testing"
	"time"

	"frame-24/internal/inventory/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// FakeInventoryRepo em memória para testes unitários
type FakeInventoryRepo struct {
	warehouses map[uuid.UUID]*domain.Warehouse
	stock      map[string]*domain.StockLevel // key: warehouseID:productID:unitID
	movements  []domain.Movement
}

func NewFakeInventoryRepo() *FakeInventoryRepo {
	return &FakeInventoryRepo{
		warehouses: make(map[uuid.UUID]*domain.Warehouse),
		stock:      make(map[string]*domain.StockLevel),
		movements:  make([]domain.Movement, 0),
	}
}

func (f *FakeInventoryRepo) makeKey(wID, pID, uID uuid.UUID) string {
	return wID.String() + ":" + pID.String() + ":" + uID.String()
}

func (f *FakeInventoryRepo) CreateWarehouse(ctx context.Context, tx pgx.Tx, w *domain.Warehouse) error {
	for _, existing := range f.warehouses {
		if existing.ComplexID == w.ComplexID && existing.Code == w.Code {
			return domain.ErrWarehouseAlreadyExists
		}
	}
	f.warehouses[w.ID] = w
	return nil
}

func (f *FakeInventoryRepo) GetDefaultWarehouse(ctx context.Context, tenantID, complexID uuid.UUID) (*domain.Warehouse, error) {
	for _, w := range f.warehouses {
		if w.ComplexID == complexID && w.IsDefault {
			return w, nil
		}
	}
	for _, w := range f.warehouses {
		if w.ComplexID == complexID {
			return w, nil
		}
	}
	return nil, domain.ErrWarehouseNotFound
}

func (f *FakeInventoryRepo) GetWarehouseByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Warehouse, error) {
	w, ok := f.warehouses[id]
	if !ok {
		return nil, domain.ErrWarehouseNotFound
	}
	return w, nil
}

func (f *FakeInventoryRepo) ListWarehouses(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Warehouse, error) {
	var list []domain.Warehouse
	for _, w := range f.warehouses {
		if w.ComplexID == complexID {
			list = append(list, *w)
		}
	}
	return list, nil
}

func (f *FakeInventoryRepo) GetStockLevel(ctx context.Context, tenantID, warehouseID, productID, unitID uuid.UUID) (*domain.StockLevel, error) {
	key := f.makeKey(warehouseID, productID, unitID)
	sl, ok := f.stock[key]
	if !ok {
		return nil, domain.ErrStockItemNotFound
	}
	return sl, nil
}

func (f *FakeInventoryRepo) ListStockLevels(ctx context.Context, tenantID, warehouseID uuid.UUID) ([]domain.StockLevel, error) {
	var list []domain.StockLevel
	for _, sl := range f.stock {
		if sl.WarehouseID == warehouseID {
			list = append(list, *sl)
		}
	}
	return list, nil
}

func (f *FakeInventoryRepo) RecordMovement(ctx context.Context, tx pgx.Tx, m *domain.Movement) (*domain.StockLevel, error) {
	key := f.makeKey(m.WarehouseID, m.ProductID, m.UnitID)
	sl, exists := f.stock[key]
	if !exists {
		sl = &domain.StockLevel{
			ID:              uuid.New(),
			TenantID:        m.TenantID,
			WarehouseID:     m.WarehouseID,
			ProductID:       m.ProductID,
			UnitID:          m.UnitID,
			CurrentQuantity: 0,
		}
		f.stock[key] = sl
	}

	var newQty float64
	switch m.MovementType {
	case domain.MovementTypePurchaseIn, domain.MovementTypeTransferIn:
		newQty = sl.CurrentQuantity + m.Quantity
	case domain.MovementTypeSaleOut, domain.MovementTypeDiscardOut, domain.MovementTypeTransferOut:
		if sl.CurrentQuantity < m.Quantity {
			return nil, domain.ErrInsufficientStock
		}
		newQty = sl.CurrentQuantity - m.Quantity
	case domain.MovementTypeAuditAdjustment:
		newQty = m.Quantity
	default:
		return nil, domain.ErrInvalidMovementType
	}

	sl.CurrentQuantity = newQty
	f.movements = append(f.movements, *m)
	return sl, nil
}

func (f *FakeInventoryRepo) ListMovements(ctx context.Context, tenantID, warehouseID uuid.UUID, limit int, beforeTS *time.Time, beforeID *uuid.UUID) ([]domain.Movement, error) {
	var list []domain.Movement
	for _, m := range f.movements {
		if m.WarehouseID == warehouseID {
			list = append(list, m)
		}
	}
	return list, nil
}

func TestInventoryService_PurchaseSaleAndStockProtection(t *testing.T) {
	repo := NewFakeInventoryRepo()
	svc := NewService(nil, repo)

	tenantID := uuid.New()
	complexID := uuid.New()
	productID := uuid.New()
	unitID := uuid.New()
	ctx := context.Background()

	// 1. Criar Almoxarifado Padrão
	wh, err := svc.CreateWarehouse(ctx, tenantID, complexID, "Almoxarifado Geral", "ALMOX-01", true)
	require.NoError(t, err)
	assert.Equal(t, "ALMOX-01", wh.Code)

	// 2. Entrada de Estoque (Compra de 100 UN a R$ 5,00 cada)
	sl1, err := svc.RecordPurchase(ctx, tenantID, wh.ID, productID, unitID, 100.0, 5.0, nil, nil, nil)
	require.NoError(t, err)
	assert.Equal(t, 100.0, sl1.CurrentQuantity)

	// 3. Baixa por Venda de 15 UN
	saleID := uuid.New()
	err = svc.DeductSaleItem(ctx, tenantID, complexID, productID, unitID, 15.0, saleID)
	require.NoError(t, err)

	sl2, err := repo.GetStockLevel(ctx, tenantID, wh.ID, productID, unitID)
	require.NoError(t, err)
	assert.Equal(t, 85.0, sl2.CurrentQuantity)

	// 4. Descarte de 5 UN por avaria
	sl3, err := svc.RecordDiscard(ctx, tenantID, wh.ID, productID, unitID, 5.0, "Pacote rasgado", nil)
	require.NoError(t, err)
	assert.Equal(t, 80.0, sl3.CurrentQuantity)

	// 5. Tentativa de venda de 90 UN (Saldo atual é 80 UN) -> Bloqueio por saldo insuficiente
	err = svc.DeductSaleItem(ctx, tenantID, complexID, productID, unitID, 90.0, uuid.New())
	assert.ErrorIs(t, err, domain.ErrInsufficientStock)

	// 6. Inventário/Ajuste Físico (Contagem apurou 75 UN)
	sl4, err := svc.AuditAdjustment(ctx, tenantID, wh.ID, productID, unitID, 75.0, nil, nil)
	require.NoError(t, err)
	assert.Equal(t, 75.0, sl4.CurrentQuantity)

	// 7. Inventário Físico zerando o item (Contagem = 0 UN) -> Deve ser permitido com sucesso
	sl5, err := svc.AuditAdjustment(ctx, tenantID, wh.ID, productID, unitID, 0.0, nil, nil)
	require.NoError(t, err)
	assert.Equal(t, 0.0, sl5.CurrentQuantity)
}
