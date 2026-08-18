package repo

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"frame-24/internal/operations/domain"
)

type Repository interface {
	// Complexos
	CreateComplex(ctx context.Context, tx pgx.Tx, c *domain.CinemaComplex) error
	GetComplexByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CinemaComplex, error)
	ListComplexes(ctx context.Context, tenantID uuid.UUID) ([]domain.CinemaComplex, error)

	// Salas & Assentos
	CreateRoom(ctx context.Context, tx pgx.Tx, r *domain.Room) error
	GetRoomByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Room, error)
	ListRoomsByComplex(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Room, error)
	CreateSeatsBulk(ctx context.Context, tx pgx.Tx, seats []domain.Seat) error
	ListSeatsByRoom(ctx context.Context, tenantID, roomID uuid.UUID) ([]domain.Seat, error)

	// Sessões
	CreateShowtime(ctx context.Context, tx pgx.Tx, s *domain.Showtime) error
	GetShowtimeByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Showtime, error)
	ListShowtimesByRoom(ctx context.Context, tenantID, roomID uuid.UUID, from, to time.Time) ([]domain.Showtime, error)
	ListShowtimesByComplex(ctx context.Context, tenantID, complexID uuid.UUID, from, to time.Time) ([]domain.Showtime, error)
}
