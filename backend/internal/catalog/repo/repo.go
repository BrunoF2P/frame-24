package repo

import (
	"context"

	"frame-24/internal/catalog/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repository interface {
	// Filmes
	CreateMovie(ctx context.Context, tx pgx.Tx, m *domain.Movie) error
	GetMovieByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Movie, error)
	ListMovies(ctx context.Context, tenantID uuid.UUID) ([]domain.Movie, error)

	// Unidades
	CreateUnit(ctx context.Context, tx pgx.Tx, u *domain.ProductUnit) error
	GetUnitByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.ProductUnit, error)
	ListUnits(ctx context.Context, tenantID uuid.UUID) ([]domain.ProductUnit, error)

	// Produtos & Barcodes
	CreateProduct(ctx context.Context, tx pgx.Tx, p *domain.Product) error
	GetProductByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Product, error)
	ListProducts(ctx context.Context, tenantID uuid.UUID) ([]domain.Product, error)
	CreateBarcode(ctx context.Context, tx pgx.Tx, b *domain.ProductBarcode) error
	GetProductByBarcode(ctx context.Context, tenantID uuid.UUID, barcode string) (*domain.Product, *domain.ProductUnit, error)

	// Combos
	CreateCombo(ctx context.Context, tx pgx.Tx, c *domain.Combo, items []domain.ComboItem) error
	GetComboByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Combo, error)
	ListCombos(ctx context.Context, tenantID uuid.UUID) ([]domain.Combo, error)
}
