package app

import (
	"context"
	"fmt"
	"testing"

	catalogDomain "frame-24/internal/catalog/domain"
	operationsDomain "frame-24/internal/operations/domain"
	"frame-24/internal/platform/money"
	"frame-24/internal/platform/seatlock"
	"frame-24/internal/sales/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// FakeSalesRepo implementa repo.Repository em memória
type FakeSalesRepo struct {
	sales   map[uuid.UUID]*domain.Sale
	tickets map[uuid.UUID][]domain.Ticket
}

func NewFakeSalesRepo() *FakeSalesRepo {
	return &FakeSalesRepo{
		sales:   make(map[uuid.UUID]*domain.Sale),
		tickets: make(map[uuid.UUID][]domain.Ticket),
	}
}

func (f *FakeSalesRepo) CreateSale(
	ctx context.Context,
	tx pgx.Tx,
	sale *domain.Sale,
	items []domain.SaleItem,
	tickets []domain.Ticket,
	payments []domain.Payment,
) error {
	// Verificar se algum assento já foi vendido nesta sessão
	for _, tk := range tickets {
		for _, existing := range f.tickets[tk.ShowtimeID] {
			if existing.SeatID == tk.SeatID && existing.Status == "active" {
				return domain.ErrSeatAlreadySold
			}
		}
	}

	sale.Tickets = tickets
	sale.Items = items
	sale.Payments = payments
	f.sales[sale.ID] = sale

	for _, tk := range tickets {
		f.tickets[tk.ShowtimeID] = append(f.tickets[tk.ShowtimeID], tk)
	}
	return nil
}

func (f *FakeSalesRepo) GetSaleByID(ctx context.Context, tenantID, saleID uuid.UUID) (*domain.Sale, error) {
	s, ok := f.sales[saleID]
	if !ok {
		return nil, domain.ErrSaleNotFound
	}
	return s, nil
}

func (f *FakeSalesRepo) GetSoldSeatIDsForShowtime(ctx context.Context, tenantID, showtimeID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	for _, tk := range f.tickets[showtimeID] {
		if tk.Status == "active" {
			ids = append(ids, tk.SeatID)
		}
	}
	return ids, nil
}

func (f *FakeSalesRepo) CountSoldTicketsByShowtime(ctx context.Context, tenantID, showtimeID uuid.UUID) (int, int, error) {
	total := 0
	half := 0
	for _, tk := range f.tickets[showtimeID] {
		if tk.Status == "active" {
			total++
			if domain.IsHalfPriceTicket(tk.TicketType) {
				half++
			}
		}
	}
	return total, half, nil
}

func (f *FakeSalesRepo) LockShowtimeAndCountHalfTickets(ctx context.Context, tx pgx.Tx, tenantID, showtimeID uuid.UUID) (int, money.Cents, int, error) {
	// Retorna erro proposital para forçar o fallback do opsProvider no modo teste (pool == nil)
	return 0, 0, 0, fmt.Errorf("fake repo: sem conexao postgresql ativa (modo teste unitario)")
}

func (f *FakeSalesRepo) GetTicketByHash(ctx context.Context, tenantID uuid.UUID, qrCodeHash string) (*domain.Ticket, error) {
	for _, ticketList := range f.tickets {
		for _, tk := range ticketList {
			if tk.QRCodeHash == qrCodeHash {
				return &tk, nil
			}
		}
	}
	return nil, domain.ErrTicketNotFound
}

// FakeOperationsProvider para testes de vendas
type FakeOpsProvider struct {
	showtimes map[uuid.UUID]*operationsDomain.Showtime
	rooms     map[uuid.UUID]*operationsDomain.Room
	seats     map[uuid.UUID][]operationsDomain.Seat
}

func NewFakeOpsProvider() *FakeOpsProvider {
	return &FakeOpsProvider{
		showtimes: make(map[uuid.UUID]*operationsDomain.Showtime),
		rooms:     make(map[uuid.UUID]*operationsDomain.Room),
		seats:     make(map[uuid.UUID][]operationsDomain.Seat),
	}
}

func (f *FakeOpsProvider) GetShowtimeByID(ctx context.Context, tenantID, id uuid.UUID) (*operationsDomain.Showtime, error) {
	st, ok := f.showtimes[id]
	if !ok {
		return nil, operationsDomain.ErrShowtimeNotFound
	}
	return st, nil
}

func (f *FakeOpsProvider) GetRoomByID(ctx context.Context, tenantID, id uuid.UUID) (*operationsDomain.Room, error) {
	rm, ok := f.rooms[id]
	if !ok {
		return nil, operationsDomain.ErrRoomNotFound
	}
	return rm, nil
}

func (f *FakeOpsProvider) ListSeatsByRoom(ctx context.Context, tenantID, roomID uuid.UUID) ([]operationsDomain.Seat, error) {
	return f.seats[roomID], nil
}

// FakeCatalogProvider para testes de preços autoritativos
type FakeCatProvider struct {
	products map[uuid.UUID]*catalogDomain.Product
	combos   map[uuid.UUID]*catalogDomain.Combo
}

func NewFakeCatProvider() *FakeCatProvider {
	return &FakeCatProvider{
		products: make(map[uuid.UUID]*catalogDomain.Product),
		combos:   make(map[uuid.UUID]*catalogDomain.Combo),
	}
}

func (f *FakeCatProvider) GetProductByID(ctx context.Context, tenantID, id uuid.UUID) (*catalogDomain.Product, error) {
	p, ok := f.products[id]
	if !ok {
		return nil, catalogDomain.ErrProductNotFound
	}
	return p, nil
}

func (f *FakeCatProvider) GetComboByID(ctx context.Context, tenantID, id uuid.UUID) (*catalogDomain.Combo, error) {
	c, ok := f.combos[id]
	if !ok {
		return nil, catalogDomain.ErrComboNotFound
	}
	return c, nil
}

func TestSalesService_HalfPriceQuota40Percent(t *testing.T) {
	fakeRepo := NewFakeSalesRepo()
	fakeOps := NewFakeOpsProvider()
	fakeCat := NewFakeCatProvider()
	lockMgr := seatlock.NewManager(nil)
	svc := NewService(nil, fakeRepo, lockMgr, fakeOps, fakeCat, nil)

	tenantID := uuid.New()
	complexID := uuid.New()
	roomID := uuid.New()
	showtimeID := uuid.New()
	ctx := context.Background()

	// Sala com capacidade de 100 lugares -> Cota legal de 40% = 40 ingressos meia-entrada
	fakeOps.rooms[roomID] = &operationsDomain.Room{
		ID:       roomID,
		Capacity: 100,
	}
	fakeOps.showtimes[showtimeID] = &operationsDomain.Showtime{
		ID:              showtimeID,
		RoomID:          roomID,
		BaseTicketPrice: money.FromFloat64(40.00),
	}

	// 1. Venda de 30 ingressos de meia-estudante -> Permitida (30 <= 40). Preço calculado pelo servidor: R$ 20 cada = R$ 600
	var tickets30 []TicketInput
	for i := 0; i < 30; i++ {
		tickets30 = append(tickets30, TicketInput{
			ShowtimeID: showtimeID,
			SeatID:     uuid.New(),
			TicketType: "meia_estudante",
		})
	}
	sale1, err := svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:  tenantID,
		ComplexID: complexID,
		Tickets:   tickets30,
		Payments: []PaymentInput{
			{PaymentMethod: "credit_card", Amount: money.FromFloat64(600.00)},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, money.FromFloat64(600.00), sale1.TotalAmount)

	// 2. Tentativa de vender mais 15 ingressos de meia-idoso -> Total seria 45 > 40 -> Bloqueio por cota legal
	var tickets15 []TicketInput
	for i := 0; i < 15; i++ {
		tickets15 = append(tickets15, TicketInput{
			ShowtimeID: showtimeID,
			SeatID:     uuid.New(),
			TicketType: "meia_idoso",
		})
	}
	_, err = svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:  tenantID,
		ComplexID: complexID,
		Tickets:   tickets15,
		Payments: []PaymentInput{
			{PaymentMethod: "pix", Amount: money.FromFloat64(300.00)},
		},
	})
	assert.ErrorIs(t, err, domain.ErrHalfPriceLimitExceeded)

	// 3. Venda de 10 ingressos de meia -> Total atinge exatamente 40 (limite exato) -> Sucesso
	var tickets10 []TicketInput
	for i := 0; i < 10; i++ {
		tickets10 = append(tickets10, TicketInput{
			ShowtimeID: showtimeID,
			SeatID:     uuid.New(),
			TicketType: "meia_pcd",
		})
	}
	sale2, err := svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:  tenantID,
		ComplexID: complexID,
		Tickets:   tickets10,
		Payments: []PaymentInput{
			{PaymentMethod: "cash", Amount: money.FromFloat64(200.00)},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, money.FromFloat64(200.00), sale2.TotalAmount)

	// 4. Com a cota de 40% esgotada, ingressos INTEIRA ainda podem ser vendidos normalmente
	sale3, err := svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:  tenantID,
		ComplexID: complexID,
		Tickets: []TicketInput{
			{ShowtimeID: showtimeID, SeatID: uuid.New(), TicketType: "inteira"},
		},
		Payments: []PaymentInput{
			{PaymentMethod: "debit_card", Amount: money.FromFloat64(40.00)},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, money.FromFloat64(40.00), sale3.TotalAmount)
}

func TestSalesService_InvalidShowtimePriceAndCortesia(t *testing.T) {
	fakeRepo := NewFakeSalesRepo()
	fakeOps := NewFakeOpsProvider()
	fakeCat := NewFakeCatProvider()
	lockMgr := seatlock.NewManager(nil)
	svc := NewService(nil, fakeRepo, lockMgr, fakeOps, fakeCat, nil)

	tenantID := uuid.New()
	complexID := uuid.New()
	roomID := uuid.New()
	showtimeID := uuid.New()
	ctx := context.Background()

	// Sessão sem preço configurado (base_ticket_price = 0)
	fakeOps.rooms[roomID] = &operationsDomain.Room{ID: roomID, Capacity: 100}
	fakeOps.showtimes[showtimeID] = &operationsDomain.Showtime{ID: showtimeID, RoomID: roomID, BaseTicketPrice: money.FromFloat64(0.00)}

	// 1. Tentativa de vender ingresso INTEIRA com sessão sem preço → deve rejeitar
	_, err := svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:  tenantID,
		ComplexID: complexID,
		Tickets: []TicketInput{
			{ShowtimeID: showtimeID, SeatID: uuid.New(), TicketType: "inteira", Price: money.FromFloat64(50.00)}, // preço do cliente deve ser ignorado
		},
		Payments: []PaymentInput{
			{PaymentMethod: "cash", Amount: money.FromFloat64(50.00)},
		},
	})
	assert.ErrorIs(t, err, domain.ErrInvalidShowtimePrice, "ingresso inteira em sessão sem preço deve retornar ErrInvalidShowtimePrice")

	// 2. Ingresso CORTESIA com sessão sem preço → deve passar (cortesia é R$ 0 por definição, sem pagamento)
	sale, err := svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:  tenantID,
		ComplexID: complexID,
		Tickets: []TicketInput{
			{ShowtimeID: showtimeID, SeatID: uuid.New(), TicketType: "cortesia"},
		},
		// Nenhum pagamento necessário — total da venda é R$ 0,00
	})
	require.NoError(t, err)
	assert.Equal(t, money.FromFloat64(0.00), sale.TotalAmount)
	assert.Equal(t, money.FromFloat64(0.00), sale.Tickets[0].Price)
}

func TestSalesService_FinancialIntegrityAndAuthoritativePrices(t *testing.T) {
	fakeRepo := NewFakeSalesRepo()
	fakeOps := NewFakeOpsProvider()
	fakeCat := NewFakeCatProvider()
	lockMgr := seatlock.NewManager(nil)
	svc := NewService(nil, fakeRepo, lockMgr, fakeOps, fakeCat, nil)

	tenantID := uuid.New()
	complexID := uuid.New()
	roomID := uuid.New()
	showtimeID := uuid.New()
	unitID := uuid.New()
	productID := uuid.New()
	ctx := context.Background()

	fakeOps.rooms[roomID] = &operationsDomain.Room{ID: roomID, Capacity: 50}
	fakeOps.showtimes[showtimeID] = &operationsDomain.Showtime{ID: showtimeID, RoomID: roomID, BaseTicketPrice: money.FromFloat64(35.00)}

	// Preço do catálogo: R$ 25,00 por pipoca
	fakeCat.products[productID] = &catalogDomain.Product{ID: productID, SalePrice: money.FromFloat64(25.00)}

	// 1 Ticket Inteira (R$ 35,00) + 2 Pipocas Grandes (2 x R$ 25,00 = R$ 50,00) - Desconto (R$ 5,00) = R$ 80,00
	tickets := []TicketInput{
		{ShowtimeID: showtimeID, SeatID: uuid.New(), TicketType: "inteira", Price: money.FromFloat64(0.01)}, // Tentativa de fraude de preço é ignorada
	}
	items := []ConcessionItemInput{
		{ItemType: "product", ProductID: &productID, UnitID: unitID, Quantity: 2, UnitPrice: money.FromFloat64(0.01)}, // Tentativa de fraude é ignorada
	}

	// 1. Pagamento insuficiente (R$ 70,00 em vez do total calculado pelo servidor R$ 80,00) -> Falha de integridade
	_, err := svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:        tenantID,
		ComplexID:       complexID,
		Tickets:         tickets,
		ConcessionItems: items,
		DiscountAmount:  money.FromFloat64(5.00),
		Payments: []PaymentInput{
			{PaymentMethod: "cash", Amount: money.FromFloat64(70.00)},
		},
	})
	assert.ErrorIs(t, err, domain.ErrInvalidPaymentAmount)

	// 2. Pagamento exato dividido em 2 formas (R$ 50 no Cartão + R$ 30 no PIX = R$ 80,00) -> Sucesso
	sale, err := svc.CreateSale(ctx, CreateSaleCommand{
		TenantID:        tenantID,
		ComplexID:       complexID,
		Tickets:         tickets,
		ConcessionItems: items,
		DiscountAmount:  money.FromFloat64(5.00),
		Payments: []PaymentInput{
			{PaymentMethod: "credit_card", Amount: money.FromFloat64(50.00)},
			{PaymentMethod: "pix", Amount: money.FromFloat64(30.00)},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, money.FromFloat64(80.00), sale.TotalAmount)
	assert.Equal(t, money.FromFloat64(35.00), sale.SubtotalTickets)
	assert.Equal(t, money.FromFloat64(50.00), sale.SubtotalConcession)
	assert.Equal(t, money.FromFloat64(5.00), sale.DiscountAmount)
	assert.Len(t, sale.Tickets, 1)
	assert.Equal(t, money.FromFloat64(35.00), sale.Tickets[0].Price) // Servidor aplicou o preço oficial de R$ 35,00
	assert.NotEmpty(t, sale.Tickets[0].QRCodeHash)
	assert.Len(t, sale.Items, 1)
	assert.Equal(t, money.FromFloat64(25.00), sale.Items[0].UnitPrice) // Servidor aplicou o preço do catálogo de R$ 25,00
	assert.Len(t, sale.Payments, 2)
}
