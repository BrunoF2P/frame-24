package repo

import (
	"context"

	"frame-24/internal/platform/money"
	"frame-24/internal/sales/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repository interface {
	CreateSale(ctx context.Context, tx pgx.Tx, sale *domain.Sale, items []domain.SaleItem, tickets []domain.Ticket, payments []domain.Payment) error
	GetSaleByID(ctx context.Context, tenantID, saleID uuid.UUID) (*domain.Sale, error)
	GetSoldSeatIDsForShowtime(ctx context.Context, tenantID, showtimeID uuid.UUID) ([]uuid.UUID, error)
	CountSoldTicketsByShowtime(ctx context.Context, tenantID, showtimeID uuid.UUID) (totalSold int, halfPriceSold int, err error)
	LockShowtimeAndCountHalfTickets(ctx context.Context, tx pgx.Tx, tenantID, showtimeID uuid.UUID) (roomCapacity int, baseTicketPrice money.Cents, currentHalfSold int, err error)
	GetTicketByHash(ctx context.Context, tenantID uuid.UUID, qrCodeHash string) (*domain.Ticket, error)
}
