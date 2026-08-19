package repo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/inventory/domain"
	"frame-24/internal/platform/db"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateWarehouse(ctx context.Context, tx pgx.Tx, w *domain.Warehouse) error {
	query := `
		INSERT INTO inventory.warehouses (id, tenant_id, complex_id, name, code, is_default, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, w.ID, w.TenantID, w.ComplexID, w.Name, w.Code, w.IsDefault, w.CreatedAt, w.UpdatedAt)
	} else {
		err = db.RunInTenantTx(ctx, r.pool, w.TenantID, func(t pgx.Tx) error {
			_, e := t.Exec(ctx, query, w.ID, w.TenantID, w.ComplexID, w.Name, w.Code, w.IsDefault, w.CreatedAt, w.UpdatedAt)
			return e
		})
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrWarehouseAlreadyExists
		}
		return fmt.Errorf("falha ao criar almoxarifado: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetDefaultWarehouse(ctx context.Context, tenantID, complexID uuid.UUID) (*domain.Warehouse, error) {
	var w domain.Warehouse
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, name, code, is_default, created_at, updated_at
			FROM inventory.warehouses
			WHERE complex_id = $1 AND is_default = true
			LIMIT 1
		`
		return tx.QueryRow(ctx, query, complexID).Scan(
			&w.ID, &w.TenantID, &w.ComplexID, &w.Name, &w.Code, &w.IsDefault, &w.CreatedAt, &w.UpdatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Se não houver padrão explícito, busca o primeiro cadastrado
			err2 := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
				query := `
					SELECT id, tenant_id, complex_id, name, code, is_default, created_at, updated_at
					FROM inventory.warehouses
					WHERE complex_id = $1
					ORDER BY created_at ASC
					LIMIT 1
				`
				return tx.QueryRow(ctx, query, complexID).Scan(
					&w.ID, &w.TenantID, &w.ComplexID, &w.Name, &w.Code, &w.IsDefault, &w.CreatedAt, &w.UpdatedAt,
				)
			})
			if err2 != nil {
				return nil, domain.ErrWarehouseNotFound
			}
			return &w, nil
		}
		return nil, fmt.Errorf("falha ao buscar almoxarifado padrao: %w", err)
	}
	return &w, nil
}

func (r *PostgresRepository) GetWarehouseByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Warehouse, error) {
	var w domain.Warehouse
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, name, code, is_default, created_at, updated_at
			FROM inventory.warehouses
			WHERE id = $1
		`
		return tx.QueryRow(ctx, query, id).Scan(
			&w.ID, &w.TenantID, &w.ComplexID, &w.Name, &w.Code, &w.IsDefault, &w.CreatedAt, &w.UpdatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrWarehouseNotFound
		}
		return nil, fmt.Errorf("falha ao buscar almoxarifado por id: %w", err)
	}
	return &w, nil
}

func (r *PostgresRepository) ListWarehouses(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Warehouse, error) {
	var list []domain.Warehouse
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, complex_id, name, code, is_default, created_at, updated_at
			FROM inventory.warehouses
			WHERE complex_id = $1
			ORDER BY is_default DESC, name ASC
		`
		rows, err := tx.Query(ctx, query, complexID)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var w domain.Warehouse
			if err := rows.Scan(&w.ID, &w.TenantID, &w.ComplexID, &w.Name, &w.Code, &w.IsDefault, &w.CreatedAt, &w.UpdatedAt); err != nil {
				return err
			}
			list = append(list, w)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("falha ao listar almoxarifados: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) GetStockLevel(ctx context.Context, tenantID, warehouseID, productID, unitID uuid.UUID) (*domain.StockLevel, error) {
	var sl domain.StockLevel
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, warehouse_id, product_id, unit_id, current_quantity, minimum_quantity, updated_at
			FROM inventory.stock_levels
			WHERE warehouse_id = $1 AND product_id = $2 AND unit_id = $3
		`
		return tx.QueryRow(ctx, query, warehouseID, productID, unitID).Scan(
			&sl.ID, &sl.TenantID, &sl.WarehouseID, &sl.ProductID, &sl.UnitID, &sl.CurrentQuantity, &sl.MinimumQuantity, &sl.UpdatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrStockItemNotFound
		}
		return nil, fmt.Errorf("falha ao buscar saldo de estoque: %w", err)
	}
	return &sl, nil
}

func (r *PostgresRepository) ListStockLevels(ctx context.Context, tenantID, warehouseID uuid.UUID) ([]domain.StockLevel, error) {
	var list []domain.StockLevel
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, warehouse_id, product_id, unit_id, current_quantity, minimum_quantity, updated_at
			FROM inventory.stock_levels
			WHERE warehouse_id = $1
			ORDER BY updated_at DESC
		`
		rows, err := tx.Query(ctx, query, warehouseID)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var sl domain.StockLevel
			if err := rows.Scan(&sl.ID, &sl.TenantID, &sl.WarehouseID, &sl.ProductID, &sl.UnitID, &sl.CurrentQuantity, &sl.MinimumQuantity, &sl.UpdatedAt); err != nil {
				return err
			}
			list = append(list, sl)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("falha ao listar saldos de estoque: %w", err)
	}
	return list, nil
}

// RecordMovement grava uma movimentação física append-only e atualiza atomicamente o saldo de estoque
func (r *PostgresRepository) RecordMovement(ctx context.Context, tx pgx.Tx, m *domain.Movement) (*domain.StockLevel, error) {
	now := time.Now()

	// 0. Early-return de idempotência para movimentos de venda:
	//    Se já existe um movimento com o mesmo (warehouse_id, product_id, reference_id WHERE reference_type='sale'),
	//    retornamos o saldo atual sem alterar nada — retry do Outbox não duplica baixa de estoque.
	if m.ReferenceType != nil && *m.ReferenceType == "sale" && m.ReferenceID != nil {
		var existingID uuid.UUID
		checkQuery := `
			SELECT id FROM inventory.movements
			WHERE warehouse_id = $1 AND product_id = $2 AND reference_id = $3 AND reference_type = 'sale'
			LIMIT 1
		`
		if scanErr := tx.QueryRow(ctx, checkQuery, m.WarehouseID, m.ProductID, m.ReferenceID).Scan(&existingID); scanErr == nil {
			// Já processado — retornar o saldo atual sem tocar em nada
			var sl domain.StockLevel
			selectQuery := `
				SELECT id, tenant_id, warehouse_id, product_id, unit_id, current_quantity, minimum_quantity, updated_at
				FROM inventory.stock_levels
				WHERE tenant_id = $1 AND warehouse_id = $2 AND product_id = $3 AND unit_id = $4
			`
			if scanErr2 := tx.QueryRow(ctx, selectQuery, m.TenantID, m.WarehouseID, m.ProductID, m.UnitID).Scan(
				&sl.ID, &sl.TenantID, &sl.WarehouseID, &sl.ProductID, &sl.UnitID,
				&sl.CurrentQuantity, &sl.MinimumQuantity, &sl.UpdatedAt,
			); scanErr2 == nil {
				return &sl, nil
			}
		}
	}

	// 1. Lock exclusivo FOR UPDATE no saldo atual (ou cria com 0 se não existir)
	upsertStockQuery := `
		INSERT INTO inventory.stock_levels (id, tenant_id, warehouse_id, product_id, unit_id, current_quantity, minimum_quantity, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, 0.000, 0.000, $5)
		ON CONFLICT (tenant_id, warehouse_id, product_id, unit_id) DO NOTHING
	`
	if _, err := tx.Exec(ctx, upsertStockQuery, m.TenantID, m.WarehouseID, m.ProductID, m.UnitID, now); err != nil {
		return nil, fmt.Errorf("falha ao inicializar saldo de estoque: %w", err)
	}

	lockQuery := `
		SELECT id, current_quantity, minimum_quantity
		FROM inventory.stock_levels
		WHERE tenant_id = $1 AND warehouse_id = $2 AND product_id = $3 AND unit_id = $4
		FOR UPDATE
	`
	var stockID uuid.UUID
	var currentQty, minQty float64
	if err := tx.QueryRow(ctx, lockQuery, m.TenantID, m.WarehouseID, m.ProductID, m.UnitID).Scan(&stockID, &currentQty, &minQty); err != nil {
		return nil, fmt.Errorf("falha ao bloquear linha de saldo para atualizacao: %w", err)
	}

	// 2. Calcular nova quantidade com base no tipo da movimentação
	var newQty float64
	switch m.MovementType {
	case domain.MovementTypePurchaseIn, domain.MovementTypeTransferIn:
		newQty = currentQty + m.Quantity
	case domain.MovementTypeSaleOut, domain.MovementTypeDiscardOut, domain.MovementTypeTransferOut:
		if currentQty < m.Quantity {
			return nil, domain.ErrInsufficientStock
		}
		newQty = currentQty - m.Quantity
	case domain.MovementTypeAuditAdjustment:
		newQty = m.Quantity // No ajuste/balanço físico, quantity é o novo saldo conferido
	default:
		return nil, domain.ErrInvalidMovementType
	}

	if newQty < 0 {
		return nil, domain.ErrInsufficientStock
	}

	// 3. Atualizar saldo de estoque
	updateStockQuery := `
		UPDATE inventory.stock_levels
		SET current_quantity = $1, updated_at = $2
		WHERE id = $3
	`
	if _, err := tx.Exec(ctx, updateStockQuery, newQty, now, stockID); err != nil {
		return nil, fmt.Errorf("falha ao atualizar quantidade em estoque: %w", err)
	}

	// 4. Inserir registro append-only no livro de movimentações
	insertMovementQuery := `
		INSERT INTO inventory.movements (
			id, tenant_id, warehouse_id, product_id, unit_id,
			movement_type, quantity, unit_cost, total_cost,
			reference_type, reference_id, operator_id, notes, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	if _, err := tx.Exec(
		ctx, insertMovementQuery,
		m.ID, m.TenantID, m.WarehouseID, m.ProductID, m.UnitID,
		string(m.MovementType), m.Quantity, m.UnitCost, m.TotalCost,
		m.ReferenceType, m.ReferenceID, m.OperatorID, m.Notes, m.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("falha ao inserir registro append-only de movimentacao: %w", err)
	}

	return &domain.StockLevel{
		ID:              stockID,
		TenantID:        m.TenantID,
		WarehouseID:     m.WarehouseID,
		ProductID:       m.ProductID,
		UnitID:          m.UnitID,
		CurrentQuantity: newQty,
		MinimumQuantity: minQty,
		UpdatedAt:       now,
	}, nil
}

func (r *PostgresRepository) ListMovements(ctx context.Context, tenantID, warehouseID uuid.UUID, limit int) ([]domain.Movement, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var list []domain.Movement
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		query := `
			SELECT id, tenant_id, warehouse_id, product_id, unit_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, operator_id, notes, created_at
			FROM inventory.movements
			WHERE warehouse_id = $1
			ORDER BY created_at DESC
			LIMIT $2
		`
		rows, err := tx.Query(ctx, query, warehouseID, limit)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var m domain.Movement
			var mType string
			if err := rows.Scan(
				&m.ID, &m.TenantID, &m.WarehouseID, &m.ProductID, &m.UnitID,
				&mType, &m.Quantity, &m.UnitCost, &m.TotalCost,
				&m.ReferenceType, &m.ReferenceID, &m.OperatorID, &m.Notes, &m.CreatedAt,
			); err != nil {
				return err
			}
			m.MovementType = domain.MovementType(mType)
			list = append(list, m)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("falha ao listar movimentacoes de estoque: %w", err)
	}
	return list, nil
}
