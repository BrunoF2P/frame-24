package app

import (
	"context"
	"fmt"
	"time"

	"frame-24/internal/catalog/domain"
	"frame-24/internal/catalog/repo"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/money"
	"frame-24/internal/platform/outbox"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool *pgxpool.Pool
	repo repo.Repository
}

func NewService(pool *pgxpool.Pool, r repo.Repository) *Service {
	return &Service{pool: pool, repo: r}
}

type CreateMovieCommand struct {
	TenantID        uuid.UUID
	Title           string
	OriginalTitle   *string
	DurationMinutes int
	Rating          string
	Synopsis        *string
	PosterURL       *string
	BackdropURL     *string
	TrailerURL      *string
	Distributor     *string
	AncineCPBCRT    *string
	ReleaseDate     *time.Time
}

type CreateUnitCommand struct {
	TenantID         uuid.UUID
	Name             string
	Acronym          string
	IsBaseUnit       bool
	BaseUnitID       *uuid.UUID
	ConversionFactor float64
}

type CreateProductCommand struct {
	TenantID    uuid.UUID
	Name        string
	Description *string
	Category    string
	BaseUnitID  uuid.UUID
	NCM         *string
	CEST        *string
	CostPrice   money.Subcent
	SalePrice   money.Cents
}

type CreateComboCommand struct {
	TenantID   uuid.UUID
	Name       string
	BaseUnitID uuid.UUID
	ComboPrice money.Cents
	Items      []ComboItemInput
}

type ComboItemInput struct {
	GroupName       string
	ProductID       uuid.UUID
	UnitID          uuid.UUID
	Quantity        float64
	AdditionalPrice money.Cents
}

func (s *Service) CreateMovie(ctx context.Context, cmd CreateMovieCommand) (*domain.Movie, error) {
	m, err := domain.NewMovie(cmd.TenantID, cmd.Title, cmd.DurationMinutes, cmd.Rating)
	if err != nil {
		return nil, err
	}
	m.OriginalTitle = cmd.OriginalTitle
	m.Synopsis = cmd.Synopsis
	m.PosterURL = cmd.PosterURL
	m.BackdropURL = cmd.BackdropURL
	m.TrailerURL = cmd.TrailerURL
	m.Distributor = cmd.Distributor
	m.AncineCPBCRT = cmd.AncineCPBCRT
	m.ReleaseDate = cmd.ReleaseDate

	err = db.RunInTenantTx(ctx, s.pool, cmd.TenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateMovie(ctx, tx, m); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, cmd.TenantID, "catalog.movie.created", m.ID, map[string]any{
			"movieId":  m.ID,
			"title":    m.Title,
			"duration": m.DurationMinutes,
			"rating":   m.Rating,
		})
	})

	if err != nil {
		return nil, err
	}
	return m, nil
}

func (s *Service) CreateUnit(ctx context.Context, cmd CreateUnitCommand) (*domain.ProductUnit, error) {
	u, err := domain.NewProductUnit(cmd.TenantID, cmd.Name, cmd.Acronym, cmd.IsBaseUnit, cmd.BaseUnitID, cmd.ConversionFactor)
	if err != nil {
		return nil, err
	}

	err = db.RunInTenantTx(ctx, s.pool, cmd.TenantID, func(tx pgx.Tx) error {
		return s.repo.CreateUnit(ctx, tx, u)
	})

	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Service) CreateProduct(ctx context.Context, cmd CreateProductCommand) (*domain.Product, error) {
	p, err := domain.NewProduct(cmd.TenantID, cmd.Name, cmd.Category, cmd.BaseUnitID, cmd.NCM, cmd.CEST, cmd.CostPrice, cmd.SalePrice)
	if err != nil {
		return nil, err
	}
	p.Description = cmd.Description

	err = db.RunInTenantTx(ctx, s.pool, cmd.TenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateProduct(ctx, tx, p); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, cmd.TenantID, "catalog.product.created", p.ID, map[string]any{
			"productId": p.ID,
			"name":      p.Name,
			"category":  p.Category,
			"salePrice": p.SalePrice,
		})
	})

	if err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Service) AddProductBarcode(ctx context.Context, tenantID, productID, unitID uuid.UUID, barcode string, isPrimary bool) (*domain.ProductBarcode, error) {
	b, err := domain.NewProductBarcode(tenantID, productID, unitID, barcode, isPrimary)
	if err != nil {
		return nil, err
	}

	err = db.RunInTenantTx(ctx, s.pool, tenantID, func(tx pgx.Tx) error {
		return s.repo.CreateBarcode(ctx, tx, b)
	})

	if err != nil {
		return nil, err
	}
	return b, nil
}

func (s *Service) CreateCombo(ctx context.Context, cmd CreateComboCommand) (*domain.Combo, error) {
	if cmd.BaseUnitID == uuid.Nil {
		return nil, fmt.Errorf("baseUnitId obrigatorio para cadastro de combo")
	}

	prod, err := domain.NewProduct(cmd.TenantID, cmd.Name, "combo", cmd.BaseUnitID, nil, nil, money.Subcent(0), cmd.ComboPrice)
	if err != nil {
		return nil, err
	}
	prod.IsCombo = true

	combo, err := domain.NewCombo(cmd.TenantID, prod.ID, cmd.Name, cmd.ComboPrice)
	if err != nil {
		return nil, err
	}

	var items []domain.ComboItem
	for _, item := range cmd.Items {
		items = append(items, domain.ComboItem{
			ID:              uuid.New(),
			TenantID:        cmd.TenantID,
			ComboID:         combo.ID,
			GroupName:       item.GroupName,
			ProductID:       item.ProductID,
			UnitID:          item.UnitID,
			Quantity:        item.Quantity,
			AdditionalPrice: item.AdditionalPrice,
		})
	}
	combo.Items = items

	err = db.RunInTenantTx(ctx, s.pool, cmd.TenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateProduct(ctx, tx, prod); err != nil {
			return err
		}
		if err := s.repo.CreateCombo(ctx, tx, combo, items); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, cmd.TenantID, "catalog.combo.created", combo.ID, map[string]any{
			"comboId":    combo.ID,
			"name":       combo.Name,
			"comboPrice": combo.ComboPrice,
		})
	})

	if err != nil {
		return nil, err
	}
	return combo, nil
}

func (s *Service) ListMovies(ctx context.Context, tenantID uuid.UUID) ([]domain.Movie, error) {
	return s.repo.ListMovies(ctx, tenantID)
}

func (s *Service) GetMovieByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Movie, error) {
	return s.repo.GetMovieByID(ctx, tenantID, id)
}

func (s *Service) ListUnits(ctx context.Context, tenantID uuid.UUID) ([]domain.ProductUnit, error) {
	return s.repo.ListUnits(ctx, tenantID)
}

func (s *Service) ListProducts(ctx context.Context, tenantID uuid.UUID) ([]domain.Product, error) {
	return s.repo.ListProducts(ctx, tenantID)
}

func (s *Service) GetProductByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Product, error) {
	return s.repo.GetProductByID(ctx, tenantID, id)
}

func (s *Service) GetProductByBarcode(ctx context.Context, tenantID uuid.UUID, barcode string) (*domain.Product, *domain.ProductUnit, error) {
	return s.repo.GetProductByBarcode(ctx, tenantID, barcode)
}

func (s *Service) ListCombos(ctx context.Context, tenantID uuid.UUID) ([]domain.Combo, error) {
	return s.repo.ListCombos(ctx, tenantID)
}

func (s *Service) GetComboByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Combo, error) {
	return s.repo.GetComboByID(ctx, tenantID, id)
}
