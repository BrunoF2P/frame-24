package app

import (
	"context"
	"testing"

	"frame-24/internal/catalog/domain"
	"frame-24/internal/platform/money"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type FakeCatalogRepo struct {
	movies   map[uuid.UUID]*domain.Movie
	units    map[uuid.UUID]*domain.ProductUnit
	products map[uuid.UUID]*domain.Product
	barcodes map[string]*domain.ProductBarcode
	combos   map[uuid.UUID]*domain.Combo
}

func NewFakeCatalogRepo() *FakeCatalogRepo {
	return &FakeCatalogRepo{
		movies:   make(map[uuid.UUID]*domain.Movie),
		units:    make(map[uuid.UUID]*domain.ProductUnit),
		products: make(map[uuid.UUID]*domain.Product),
		barcodes: make(map[string]*domain.ProductBarcode),
		combos:   make(map[uuid.UUID]*domain.Combo),
	}
}

func (f *FakeCatalogRepo) CreateMovie(ctx context.Context, tx pgx.Tx, m *domain.Movie) error {
	f.movies[m.ID] = m
	return nil
}

func (f *FakeCatalogRepo) GetMovieByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Movie, error) {
	m, ok := f.movies[id]
	if !ok {
		return nil, domain.ErrMovieNotFound
	}
	return m, nil
}

func (f *FakeCatalogRepo) ListMovies(ctx context.Context, tenantID uuid.UUID) ([]domain.Movie, error) {
	var list []domain.Movie
	for _, m := range f.movies {
		list = append(list, *m)
	}
	return list, nil
}

func (f *FakeCatalogRepo) CreateUnit(ctx context.Context, tx pgx.Tx, u *domain.ProductUnit) error {
	f.units[u.ID] = u
	return nil
}

func (f *FakeCatalogRepo) GetUnitByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.ProductUnit, error) {
	u, ok := f.units[id]
	if !ok {
		return nil, domain.ErrUnitNotFound
	}
	return u, nil
}

func (f *FakeCatalogRepo) ListUnits(ctx context.Context, tenantID uuid.UUID) ([]domain.ProductUnit, error) {
	var list []domain.ProductUnit
	for _, u := range f.units {
		list = append(list, *u)
	}
	return list, nil
}

func (f *FakeCatalogRepo) CreateProduct(ctx context.Context, tx pgx.Tx, p *domain.Product) error {
	f.products[p.ID] = p
	return nil
}

func (f *FakeCatalogRepo) GetProductByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Product, error) {
	p, ok := f.products[id]
	if !ok {
		return nil, domain.ErrProductNotFound
	}
	return p, nil
}

func (f *FakeCatalogRepo) ListProducts(ctx context.Context, tenantID uuid.UUID) ([]domain.Product, error) {
	var list []domain.Product
	for _, p := range f.products {
		list = append(list, *p)
	}
	return list, nil
}

func (f *FakeCatalogRepo) CreateBarcode(ctx context.Context, tx pgx.Tx, b *domain.ProductBarcode) error {
	f.barcodes[b.Barcode] = b
	return nil
}

func (f *FakeCatalogRepo) GetProductByBarcode(ctx context.Context, tenantID uuid.UUID, barcode string) (*domain.Product, *domain.ProductUnit, error) {
	b, ok := f.barcodes[barcode]
	if !ok {
		return nil, nil, domain.ErrProductNotFound
	}
	p := f.products[b.ProductID]
	u := f.units[b.UnitID]
	return p, u, nil
}

func (f *FakeCatalogRepo) CreateCombo(ctx context.Context, tx pgx.Tx, c *domain.Combo, items []domain.ComboItem) error {
	c.Items = items
	f.combos[c.ID] = c
	return nil
}

func (f *FakeCatalogRepo) GetComboByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Combo, error) {
	c, ok := f.combos[id]
	if !ok {
		return nil, domain.ErrComboNotFound
	}
	return c, nil
}

func (f *FakeCatalogRepo) ListCombos(ctx context.Context, tenantID uuid.UUID) ([]domain.Combo, error) {
	var list []domain.Combo
	for _, c := range f.combos {
		list = append(list, *c)
	}
	return list, nil
}

func TestCatalogService_UnitsProductsAndCombos(t *testing.T) {
	fakeRepo := NewFakeCatalogRepo()
	svc := NewService(nil, fakeRepo)
	tenantID := uuid.New()
	ctx := context.Background()

	// 1. Criar Unidade Base (UN) e Unidade Derivada (CX24)
	unitUN, err := svc.CreateUnit(ctx, CreateUnitCommand{
		TenantID:         tenantID,
		Name:             "Unidade",
		Acronym:          "UN",
		IsBaseUnit:       true,
		ConversionFactor: 1.0,
	})
	require.NoError(t, err)

	unitCX24, err := svc.CreateUnit(ctx, CreateUnitCommand{
		TenantID:         tenantID,
		Name:             "Caixa com 24",
		Acronym:          "CX24",
		IsBaseUnit:       false,
		BaseUnitID:       &unitUN.ID,
		ConversionFactor: 24.0,
	})
	require.NoError(t, err)

	// Testa a conversão: 2 Caixas de 24 = 48 Unidades
	assert.Equal(t, 48.0, unitCX24.ConvertToBaseUnit(2))

	// 2. Criar Produtos da Bomboniere
	ncm := "20081900" // NCM Amendoin / Pipoca
	pipoca, err := svc.CreateProduct(ctx, CreateProductCommand{
		TenantID:   tenantID,
		Name:       "Pipoca Salgada Grande",
		Category:   "popcorn",
		BaseUnitID: unitUN.ID,
		NCM:        &ncm,
		CostPrice:  money.SubcentFromFloat64(3.50),
		SalePrice:  money.FromFloat64(25.00),
	})
	require.NoError(t, err)

	refri, err := svc.CreateProduct(ctx, CreateProductCommand{
		TenantID:   tenantID,
		Name:       "Refrigerante 700ml",
		Category:   "beverage",
		BaseUnitID: unitUN.ID,
		CostPrice:  money.SubcentFromFloat64(2.00),
		SalePrice:  money.FromFloat64(14.00),
	})
	require.NoError(t, err)

	// 3. Associar Código de Barras EAN-13 ao Refrigerante
	barcode, err := svc.AddProductBarcode(ctx, tenantID, refri.ID, unitUN.ID, "7891234567890", true)
	require.NoError(t, err)
	assert.Equal(t, "7891234567890", barcode.Barcode)

	// Busca produto por código de barras (com tenantID)
	foundProd, foundUnit, err := svc.GetProductByBarcode(ctx, tenantID, "7891234567890")
	require.NoError(t, err)
	assert.Equal(t, refri.ID, foundProd.ID)
	assert.Equal(t, unitUN.ID, foundUnit.ID)

	// 4. Criar Combo com baseUnitID obrigatório (R$ 32,00)
	combo, err := svc.CreateCombo(ctx, CreateComboCommand{
		TenantID:   tenantID,
		Name:       "Combo Individual",
		BaseUnitID: unitUN.ID,
		ComboPrice: money.FromFloat64(32.00),
		Items: []ComboItemInput{
			{GroupName: "Pipoca", ProductID: pipoca.ID, UnitID: unitUN.ID, Quantity: 1, AdditionalPrice: money.Cents(0)},
			{GroupName: "Bebida", ProductID: refri.ID, UnitID: unitUN.ID, Quantity: 1, AdditionalPrice: money.Cents(0)},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, money.FromFloat64(32.00), combo.ComboPrice)
	assert.Len(t, combo.Items, 2)

	// 5. Criar Combo sem BaseUnitID deve falhar
	_, err = svc.CreateCombo(ctx, CreateComboCommand{
		TenantID:   tenantID,
		Name:       "Combo Sem Unidade",
		BaseUnitID: uuid.Nil, // Inválido
		ComboPrice: money.FromFloat64(10.00),
	})
	assert.Error(t, err)

	// 6. Rating inválido deve falhar no domínio
	_, err = domain.NewMovie(tenantID, "Teste", 90, "20") // "20" não é válido
	assert.Error(t, err)

	// 7. Category inválida deve falhar no domínio
	_, err = domain.NewProduct(tenantID, "Teste", "INVALID_CATEGORY", unitUN.ID, nil, nil, money.Subcent(0), money.FromFloat64(10.00))
	assert.Error(t, err)
}
