package repo

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"frame-24/internal/catalog/domain"
	"frame-24/internal/platform/db"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateMovie(ctx context.Context, tx pgx.Tx, m *domain.Movie) error {
	query := `
		INSERT INTO catalog.movies (
			id, tenant_id, title, original_title, duration_minutes, rating, synopsis,
			poster_url, backdrop_url, trailer_url, distributor, ancine_cpb_crt, release_date, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			m.ID, m.TenantID, m.Title, m.OriginalTitle, m.DurationMinutes, m.Rating, m.Synopsis,
			m.PosterURL, m.BackdropURL, m.TrailerURL, m.Distributor, m.AncineCPBCRT, m.ReleaseDate, m.IsActive, m.CreatedAt, m.UpdatedAt,
		)
	} else {
		_, err = r.pool.Exec(ctx, query,
			m.ID, m.TenantID, m.Title, m.OriginalTitle, m.DurationMinutes, m.Rating, m.Synopsis,
			m.PosterURL, m.BackdropURL, m.TrailerURL, m.Distributor, m.AncineCPBCRT, m.ReleaseDate, m.IsActive, m.CreatedAt, m.UpdatedAt,
		)
	}
	if err != nil {
		return fmt.Errorf("falha ao cadastrar filme: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetMovieByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Movie, error) {
	query := `
		SELECT id, tenant_id, title, original_title, duration_minutes, rating, synopsis,
		       poster_url, backdrop_url, trailer_url, distributor, ancine_cpb_crt, release_date, is_active, created_at, updated_at
		FROM catalog.movies
		WHERE id = $1
	`
	var m domain.Movie
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, id)
		} else {
			exec = r.pool.QueryRow(ctx, query, id)
		}
		return exec.Scan(
			&m.ID, &m.TenantID, &m.Title, &m.OriginalTitle, &m.DurationMinutes, &m.Rating, &m.Synopsis,
			&m.PosterURL, &m.BackdropURL, &m.TrailerURL, &m.Distributor, &m.AncineCPBCRT, &m.ReleaseDate, &m.IsActive, &m.CreatedAt, &m.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrMovieNotFound
		}
		return nil, fmt.Errorf("falha ao buscar filme por ID: %w", err)
	}
	return &m, nil
}

func (r *PostgresRepository) ListMovies(ctx context.Context, tenantID uuid.UUID) ([]domain.Movie, error) {
	query := `
		SELECT id, tenant_id, title, original_title, duration_minutes, rating, synopsis,
		       poster_url, backdrop_url, trailer_url, distributor, ancine_cpb_crt, release_date, is_active, created_at, updated_at
		FROM catalog.movies
		WHERE is_active = true
		ORDER BY title ASC
	`
	var list []domain.Movie
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query)
		} else {
			rows, err = r.pool.Query(ctx, query)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var m domain.Movie
			err := rows.Scan(
				&m.ID, &m.TenantID, &m.Title, &m.OriginalTitle, &m.DurationMinutes, &m.Rating, &m.Synopsis,
				&m.PosterURL, &m.BackdropURL, &m.TrailerURL, &m.Distributor, &m.AncineCPBCRT, &m.ReleaseDate, &m.IsActive, &m.CreatedAt, &m.UpdatedAt,
			)
			if err != nil {
				return err
			}
			list = append(list, m)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar filmes: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateUnit(ctx context.Context, tx pgx.Tx, u *domain.ProductUnit) error {
	query := `
		INSERT INTO catalog.product_units (
			id, tenant_id, name, acronym, is_base_unit, base_unit_id, conversion_factor, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, u.ID, u.TenantID, u.Name, u.Acronym, u.IsBaseUnit, u.BaseUnitID, u.ConversionFactor, u.IsActive, u.CreatedAt, u.UpdatedAt)
	} else {
		_, err = r.pool.Exec(ctx, query, u.ID, u.TenantID, u.Name, u.Acronym, u.IsBaseUnit, u.BaseUnitID, u.ConversionFactor, u.IsActive, u.CreatedAt, u.UpdatedAt)
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrUnitAlreadyExists
		}
		return fmt.Errorf("falha ao criar unidade de medida: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetUnitByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.ProductUnit, error) {
	query := `
		SELECT id, tenant_id, name, acronym, is_base_unit, base_unit_id, conversion_factor, is_active, created_at, updated_at
		FROM catalog.product_units
		WHERE id = $1
	`
	var u domain.ProductUnit
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, id)
		} else {
			exec = r.pool.QueryRow(ctx, query, id)
		}
		return exec.Scan(
			&u.ID, &u.TenantID, &u.Name, &u.Acronym, &u.IsBaseUnit, &u.BaseUnitID, &u.ConversionFactor, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUnitNotFound
		}
		return nil, fmt.Errorf("falha ao buscar unidade de medida: %w", err)
	}
	return &u, nil
}

func (r *PostgresRepository) ListUnits(ctx context.Context, tenantID uuid.UUID) ([]domain.ProductUnit, error) {
	query := `
		SELECT id, tenant_id, name, acronym, is_base_unit, base_unit_id, conversion_factor, is_active, created_at, updated_at
		FROM catalog.product_units
		WHERE is_active = true
		ORDER BY name ASC
	`
	var list []domain.ProductUnit
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query)
		} else {
			rows, err = r.pool.Query(ctx, query)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var u domain.ProductUnit
			err := rows.Scan(
				&u.ID, &u.TenantID, &u.Name, &u.Acronym, &u.IsBaseUnit, &u.BaseUnitID, &u.ConversionFactor, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
			)
			if err != nil {
				return err
			}
			list = append(list, u)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar unidades: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateProduct(ctx context.Context, tx pgx.Tx, p *domain.Product) error {
	query := `
		INSERT INTO catalog.products (
			id, tenant_id, name, description, category, base_unit_id, ncm, cest, cost_price, sale_price, is_active, is_combo, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			p.ID, p.TenantID, p.Name, p.Description, p.Category, p.BaseUnitID, p.NCM, p.CEST,
			p.CostPrice, p.SalePrice, p.IsActive, p.IsCombo, p.CreatedAt, p.UpdatedAt,
		)
	} else {
		_, err = r.pool.Exec(ctx, query,
			p.ID, p.TenantID, p.Name, p.Description, p.Category, p.BaseUnitID, p.NCM, p.CEST,
			p.CostPrice, p.SalePrice, p.IsActive, p.IsCombo, p.CreatedAt, p.UpdatedAt,
		)
	}
	if err != nil {
		return fmt.Errorf("falha ao criar produto: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetProductByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Product, error) {
	query := `
		SELECT id, tenant_id, name, description, category, base_unit_id, ncm, cest, cost_price, sale_price, is_active, is_combo, created_at, updated_at
		FROM catalog.products
		WHERE id = $1
	`
	var p domain.Product
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, id)
		} else {
			exec = r.pool.QueryRow(ctx, query, id)
		}
		return exec.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Category, &p.BaseUnitID, &p.NCM, &p.CEST,
			&p.CostPrice, &p.SalePrice, &p.IsActive, &p.IsCombo, &p.CreatedAt, &p.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrProductNotFound
		}
		return nil, fmt.Errorf("falha ao buscar produto: %w", err)
	}
	return &p, nil
}

func (r *PostgresRepository) ListProducts(ctx context.Context, tenantID uuid.UUID) ([]domain.Product, error) {
	query := `
		SELECT id, tenant_id, name, description, category, base_unit_id, ncm, cest, cost_price, sale_price, is_active, is_combo, created_at, updated_at
		FROM catalog.products
		WHERE is_active = true
		ORDER BY name ASC
	`
	var list []domain.Product
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query)
		} else {
			rows, err = r.pool.Query(ctx, query)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var p domain.Product
			err := rows.Scan(
				&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Category, &p.BaseUnitID, &p.NCM, &p.CEST,
				&p.CostPrice, &p.SalePrice, &p.IsActive, &p.IsCombo, &p.CreatedAt, &p.UpdatedAt,
			)
			if err != nil {
				return err
			}
			list = append(list, p)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar produtos: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateBarcode(ctx context.Context, tx pgx.Tx, b *domain.ProductBarcode) error {
	query := `
		INSERT INTO catalog.product_barcodes (id, tenant_id, product_id, unit_id, barcode, is_primary, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, b.ID, b.TenantID, b.ProductID, b.UnitID, b.Barcode, b.IsPrimary, b.CreatedAt)
	} else {
		_, err = r.pool.Exec(ctx, query, b.ID, b.TenantID, b.ProductID, b.UnitID, b.Barcode, b.IsPrimary, b.CreatedAt)
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrBarcodeAlreadyExists
		}
		return fmt.Errorf("falha ao associar codigo de barras: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetProductByBarcode(ctx context.Context, tenantID uuid.UUID, barcode string) (*domain.Product, *domain.ProductUnit, error) {
	query := `
		SELECT p.id, p.tenant_id, p.name, p.description, p.category, p.base_unit_id, p.ncm, p.cest, p.cost_price, p.sale_price, p.is_active, p.is_combo, p.created_at, p.updated_at,
		       u.id, u.tenant_id, u.name, u.acronym, u.is_base_unit, u.base_unit_id, u.conversion_factor, u.is_active, u.created_at, u.updated_at
		FROM catalog.product_barcodes b
		JOIN catalog.products p ON p.id = b.product_id
		JOIN catalog.product_units u ON u.id = b.unit_id
		WHERE b.barcode = $1 AND p.is_active = true
	`
	var p domain.Product
	var u domain.ProductUnit
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, barcode)
		} else {
			exec = r.pool.QueryRow(ctx, query, barcode)
		}
		return exec.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Category, &p.BaseUnitID, &p.NCM, &p.CEST, &p.CostPrice, &p.SalePrice, &p.IsActive, &p.IsCombo, &p.CreatedAt, &p.UpdatedAt,
			&u.ID, &u.TenantID, &u.Name, &u.Acronym, &u.IsBaseUnit, &u.BaseUnitID, &u.ConversionFactor, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, domain.ErrProductNotFound
		}
		return nil, nil, fmt.Errorf("falha ao buscar produto por código de barras: %w", err)
	}
	return &p, &u, nil
}

func (r *PostgresRepository) CreateCombo(ctx context.Context, tx pgx.Tx, c *domain.Combo, items []domain.ComboItem) error {
	queryCombo := `
		INSERT INTO catalog.combos (id, tenant_id, product_id, name, combo_price, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, queryCombo, c.ID, c.TenantID, c.ProductID, c.Name, c.ComboPrice, c.IsActive, c.CreatedAt, c.UpdatedAt)
	} else {
		_, err = r.pool.Exec(ctx, queryCombo, c.ID, c.TenantID, c.ProductID, c.Name, c.ComboPrice, c.IsActive, c.CreatedAt, c.UpdatedAt)
	}
	if err != nil {
		return fmt.Errorf("falha ao cadastrar combo: %w", err)
	}

	queryItem := `
		INSERT INTO catalog.combo_items (id, tenant_id, combo_id, group_name, product_id, unit_id, quantity, additional_price)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	for _, item := range items {
		if tx != nil {
			_, err = tx.Exec(ctx, queryItem, item.ID, item.TenantID, c.ID, item.GroupName, item.ProductID, item.UnitID, item.Quantity, item.AdditionalPrice)
		} else {
			_, err = r.pool.Exec(ctx, queryItem, item.ID, item.TenantID, c.ID, item.GroupName, item.ProductID, item.UnitID, item.Quantity, item.AdditionalPrice)
		}
		if err != nil {
			return fmt.Errorf("falha ao inserir item do combo: %w", err)
		}
	}
	return nil
}

func (r *PostgresRepository) GetComboByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Combo, error) {
	queryCombo := `
		SELECT id, tenant_id, product_id, name, combo_price, is_active, created_at, updated_at
		FROM catalog.combos
		WHERE id = $1
	`
	var c domain.Combo
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, queryCombo, id)
		} else {
			exec = r.pool.QueryRow(ctx, queryCombo, id)
		}
		err := exec.Scan(
			&c.ID, &c.TenantID, &c.ProductID, &c.Name, &c.ComboPrice, &c.IsActive, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return err
		}

		queryItems := `
			SELECT id, tenant_id, combo_id, group_name, product_id, unit_id, quantity, additional_price
			FROM catalog.combo_items
			WHERE combo_id = $1
		`
		var rows pgx.Rows
		if tx != nil {
			rows, err = tx.Query(ctx, queryItems, id)
		} else {
			rows, err = r.pool.Query(ctx, queryItems, id)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var item domain.ComboItem
			err := rows.Scan(&item.ID, &item.TenantID, &item.ComboID, &item.GroupName, &item.ProductID, &item.UnitID, &item.Quantity, &item.AdditionalPrice)
			if err != nil {
				return err
			}
			c.Items = append(c.Items, item)
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrComboNotFound
		}
		return nil, fmt.Errorf("falha ao buscar combo: %w", err)
	}
	return &c, nil
}

func (r *PostgresRepository) ListCombos(ctx context.Context, tenantID uuid.UUID) ([]domain.Combo, error) {
	query := `
		SELECT id, tenant_id, product_id, name, combo_price, is_active, created_at, updated_at
		FROM catalog.combos
		WHERE is_active = true
		ORDER BY name ASC
	`
	var list []domain.Combo
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query)
		} else {
			rows, err = r.pool.Query(ctx, query)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var c domain.Combo
			err := rows.Scan(&c.ID, &c.TenantID, &c.ProductID, &c.Name, &c.ComboPrice, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
			if err != nil {
				return err
			}
			list = append(list, c)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar combos: %w", err)
	}
	return list, nil
}
