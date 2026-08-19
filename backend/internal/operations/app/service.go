package app

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	catalogDomain "frame-24/internal/catalog/domain"
	"frame-24/internal/operations/domain"
	"frame-24/internal/operations/repo"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/outbox"
)

type MovieGetter interface {
	GetMovieByID(ctx context.Context, tenantID, id uuid.UUID) (*catalogDomain.Movie, error)
}

type Service struct {
	pool        *pgxpool.Pool
	repo        repo.Repository
	movieGetter MovieGetter
}

func NewService(pool *pgxpool.Pool, r repo.Repository, mg MovieGetter) *Service {
	return &Service{pool: pool, repo: r, movieGetter: mg}
}

type CreateComplexCommand struct {
	TenantID            uuid.UUID
	Name                string
	CNPJFilial          string
	StateRegistration   *string
	AncineCode          *string
	Timezone            string
	AddressStreet       *string
	AddressNumber       *string
	AddressNeighborhood *string
	AddressCity         *string
	AddressState        *string
	AddressZipCode      *string
}

type CreateRoomCommand struct {
	TenantID       uuid.UUID
	ComplexID      uuid.UUID
	Name           string
	RoomNumber     int
	AncineRoomCode *string
	SoundSystem    string
	ScreenType     string
	RowCount       int
	ColumnCount    int
}

type ScheduleShowtimeCommand struct {
	TenantID             uuid.UUID
	ComplexID            uuid.UUID
	RoomID               uuid.UUID
	MovieID              uuid.UUID
	AudioType            string
	ProjectionType       string
	StartTime            time.Time
	MovieDurationMinutes int
	CleaningMinutes      int
	BaseTicketPrice      float64
}

func (s *Service) CreateComplex(ctx context.Context, cmd CreateComplexCommand) (*domain.CinemaComplex, error) {
	c, err := domain.NewCinemaComplex(cmd.TenantID, cmd.Name, cmd.CNPJFilial, cmd.Timezone, cmd.AncineCode, cmd.StateRegistration)
	if err != nil {
		return nil, err
	}
	c.AddressStreet = cmd.AddressStreet
	c.AddressNumber = cmd.AddressNumber
	c.AddressNeighborhood = cmd.AddressNeighborhood
	c.AddressCity = cmd.AddressCity
	c.AddressState = cmd.AddressState
	c.AddressZipCode = cmd.AddressZipCode

	err = db.RunInTenantTx(ctx, s.pool, cmd.TenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateComplex(ctx, tx, c); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, cmd.TenantID, "operations.complex.created", c.ID, map[string]any{
			"complexId":  c.ID,
			"name":       c.Name,
			"cnpjFilial": c.CNPJFilial,
			"timezone":   c.Timezone,
		})
	})

	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Service) CreateRoom(ctx context.Context, cmd CreateRoomCommand) (*domain.Room, error) {
	complex, err := s.repo.GetComplexByID(ctx, cmd.TenantID, cmd.ComplexID)
	if err != nil {
		return nil, err
	}

	rm, err := domain.NewRoom(cmd.TenantID, complex.ID, cmd.Name, cmd.RoomNumber, cmd.SoundSystem, cmd.ScreenType, cmd.RowCount, cmd.ColumnCount)
	if err != nil {
		return nil, err
	}
	rm.AncineRoomCode = cmd.AncineRoomCode

	// Gerar automaticamente a grade de assentos (A1..A15, B1..B15...)
	var seats []domain.Seat
	for r := 0; r < cmd.RowCount; r++ {
		rowLetter := string(rune('A' + r))
		for col := 1; col <= cmd.ColumnCount; col++ {
			seatType := "standard"
			seat, err := domain.NewSeat(cmd.TenantID, rm.ID, rowLetter, col, seatType)
			if err == nil {
				seats = append(seats, *seat)
			}
		}
	}

	err = db.RunInTenantTx(ctx, s.pool, cmd.TenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateRoom(ctx, tx, rm); err != nil {
			return err
		}
		if err := s.repo.CreateSeatsBulk(ctx, tx, seats); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, cmd.TenantID, "operations.room.created", rm.ID, map[string]any{
			"roomId":    rm.ID,
			"complexId": rm.ComplexID,
			"name":      rm.Name,
			"capacity":  rm.Capacity,
		})
	})

	if err != nil {
		return nil, err
	}
	return rm, nil
}

func (s *Service) ScheduleShowtime(ctx context.Context, cmd ScheduleShowtimeCommand) (*domain.Showtime, error) {
	complex, err := s.repo.GetComplexByID(ctx, cmd.TenantID, cmd.ComplexID)
	if err != nil {
		return nil, err
	}

	// Busca a duração oficial do filme no catálogo
	movieDuration := cmd.MovieDurationMinutes
	if s.movieGetter != nil {
		movie, err := s.movieGetter.GetMovieByID(ctx, cmd.TenantID, cmd.MovieID)
		if err == nil && movie != nil {
			movieDuration = movie.DurationMinutes
		}
	}

	// Ajusta fuso horário de acordo com o complexo
	loc, err := time.LoadLocation(complex.Timezone)
	if err == nil {
		cmd.StartTime = cmd.StartTime.In(loc)
	}

	st, err := domain.NewShowtime(
		cmd.TenantID, cmd.ComplexID, cmd.RoomID, cmd.MovieID,
		cmd.AudioType, cmd.ProjectionType, cmd.StartTime,
		movieDuration, cmd.CleaningMinutes, cmd.BaseTicketPrice,
	)
	if err != nil {
		return nil, err
	}

	err = db.RunInTenantTx(ctx, s.pool, cmd.TenantID, func(tx pgx.Tx) error {
		if err := s.repo.CreateShowtime(ctx, tx, st); err != nil {
			return err
		}
		return outbox.InsertEvent(ctx, tx, cmd.TenantID, "operations.showtime.scheduled", st.ID, map[string]any{
			"showtimeId": st.ID,
			"complexId":  st.ComplexID,
			"roomId":     st.RoomID,
			"movieId":    st.MovieID,
			"startTime":  st.StartTime,
			"endTime":    st.EndTime,
		})
	})

	if err != nil {
		return nil, err
	}
	return st, nil
}

func (s *Service) ListComplexes(ctx context.Context, tenantID uuid.UUID) ([]domain.CinemaComplex, error) {
	return s.repo.ListComplexes(ctx, tenantID)
}

func (s *Service) ListRoomsByComplex(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Room, error) {
	return s.repo.ListRoomsByComplex(ctx, tenantID, complexID)
}

func (s *Service) ListShowtimesByComplex(ctx context.Context, tenantID, complexID uuid.UUID, from, to time.Time) ([]domain.Showtime, error) {
	if from.IsZero() {
		from = time.Now().Add(-24 * time.Hour)
	}
	if to.IsZero() {
		to = time.Now().Add(7 * 24 * time.Hour)
	}
	return s.repo.ListShowtimesByComplex(ctx, tenantID, complexID, from, to)
}

func (s *Service) GetShowtimeByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Showtime, error) {
	return s.repo.GetShowtimeByID(ctx, tenantID, id)
}

func (s *Service) GetRoomByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Room, error) {
	return s.repo.GetRoomByID(ctx, tenantID, id)
}

func (s *Service) ListSeatsByRoom(ctx context.Context, tenantID, roomID uuid.UUID) ([]domain.Seat, error) {
	return s.repo.ListSeatsByRoom(ctx, tenantID, roomID)
}

func (s *Service) GetRoomSeats(ctx context.Context, tenantID, roomID uuid.UUID) ([]domain.Seat, error) {
	return s.repo.ListSeatsByRoom(ctx, tenantID, roomID)
}
