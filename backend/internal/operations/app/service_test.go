package app

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	catalogDomain "frame-24/internal/catalog/domain"
	"frame-24/internal/operations/domain"
)

// FakeOperationsRepo implementa repo.Repository com tenantID nas leituras
type FakeOperationsRepo struct {
	complexes map[uuid.UUID]*domain.CinemaComplex
	rooms     map[uuid.UUID]*domain.Room
	seats     map[uuid.UUID][]domain.Seat
	showtimes map[uuid.UUID]*domain.Showtime
}

func NewFakeOperationsRepo() *FakeOperationsRepo {
	return &FakeOperationsRepo{
		complexes: make(map[uuid.UUID]*domain.CinemaComplex),
		rooms:     make(map[uuid.UUID]*domain.Room),
		seats:     make(map[uuid.UUID][]domain.Seat),
		showtimes: make(map[uuid.UUID]*domain.Showtime),
	}
}

func (f *FakeOperationsRepo) CreateComplex(ctx context.Context, tx pgx.Tx, c *domain.CinemaComplex) error {
	f.complexes[c.ID] = c
	return nil
}

func (f *FakeOperationsRepo) GetComplexByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CinemaComplex, error) {
	c, ok := f.complexes[id]
	if !ok {
		return nil, domain.ErrComplexNotFound
	}
	return c, nil
}

func (f *FakeOperationsRepo) ListComplexes(ctx context.Context, tenantID uuid.UUID) ([]domain.CinemaComplex, error) {
	var list []domain.CinemaComplex
	for _, c := range f.complexes {
		list = append(list, *c)
	}
	return list, nil
}

func (f *FakeOperationsRepo) CreateRoom(ctx context.Context, tx pgx.Tx, r *domain.Room) error {
	f.rooms[r.ID] = r
	return nil
}

func (f *FakeOperationsRepo) GetRoomByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Room, error) {
	r, ok := f.rooms[id]
	if !ok {
		return nil, domain.ErrRoomNotFound
	}
	return r, nil
}

func (f *FakeOperationsRepo) ListRoomsByComplex(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Room, error) {
	var list []domain.Room
	for _, r := range f.rooms {
		if r.ComplexID == complexID {
			list = append(list, *r)
		}
	}
	return list, nil
}

func (f *FakeOperationsRepo) CreateSeatsBulk(ctx context.Context, tx pgx.Tx, seats []domain.Seat) error {
	if len(seats) == 0 {
		return nil
	}
	rID := seats[0].RoomID
	f.seats[rID] = append(f.seats[rID], seats...)
	return nil
}

func (f *FakeOperationsRepo) ListSeatsByRoom(ctx context.Context, tenantID, roomID uuid.UUID) ([]domain.Seat, error) {
	return f.seats[roomID], nil
}

func (f *FakeOperationsRepo) CreateShowtime(ctx context.Context, tx pgx.Tx, s *domain.Showtime) error {
	// Simulação simples de sobreposição em memória
	for _, existing := range f.showtimes {
		if existing.RoomID == s.RoomID && existing.Status != "canceled" {
			existingEndWithCleaning := existing.EndTime.Add(time.Duration(existing.CleaningMinutes) * time.Minute)
			sEndWithCleaning := s.EndTime.Add(time.Duration(s.CleaningMinutes) * time.Minute)

			if s.StartTime.Before(existingEndWithCleaning) && existing.StartTime.Before(sEndWithCleaning) {
				return domain.ErrShowtimeOverlap
			}
		}
	}
	f.showtimes[s.ID] = s
	return nil
}

func (f *FakeOperationsRepo) GetShowtimeByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Showtime, error) {
	s, ok := f.showtimes[id]
	if !ok {
		return nil, domain.ErrShowtimeNotFound
	}
	return s, nil
}

func (f *FakeOperationsRepo) ListShowtimesByRoom(ctx context.Context, tenantID, roomID uuid.UUID, from, to time.Time) ([]domain.Showtime, error) {
	var list []domain.Showtime
	for _, s := range f.showtimes {
		if s.RoomID == roomID {
			list = append(list, *s)
		}
	}
	return list, nil
}

func (f *FakeOperationsRepo) ListShowtimesByComplex(ctx context.Context, tenantID, complexID uuid.UUID, from, to time.Time) ([]domain.Showtime, error) {
	var list []domain.Showtime
	for _, s := range f.showtimes {
		if s.ComplexID == complexID {
			list = append(list, *s)
		}
	}
	return list, nil
}

// FakeMovieGetter retorna filmes em memória para uso pelo operations service
type FakeMovieGetter struct {
	movies map[uuid.UUID]*catalogDomain.Movie
}

func NewFakeMovieGetter() *FakeMovieGetter {
	return &FakeMovieGetter{movies: make(map[uuid.UUID]*catalogDomain.Movie)}
}

func (f *FakeMovieGetter) AddMovie(m *catalogDomain.Movie) {
	f.movies[m.ID] = m
}

func (f *FakeMovieGetter) GetMovieByID(ctx context.Context, tenantID, id uuid.UUID) (*catalogDomain.Movie, error) {
	m, ok := f.movies[id]
	if !ok {
		return nil, catalogDomain.ErrMovieNotFound
	}
	return m, nil
}

func TestOperationsService_ComplexRoomAndSeats(t *testing.T) {
	fakeRepo := NewFakeOperationsRepo()
	movieGetter := NewFakeMovieGetter()
	svc := NewService(nil, fakeRepo, movieGetter)
	tenantID := uuid.New()

	ctx := context.Background()

	// 1. Criar Complexo com Fuso de Manaus
	complex, err := svc.CreateComplex(ctx, CreateComplexCommand{
		TenantID: tenantID,
		Name:     "Cinesystem Manaus Millennium",
		CNPJFilial: "12345678000195",
		Timezone: "America/Manaus",
	})
	require.NoError(t, err)
	assert.Equal(t, "America/Manaus", complex.Timezone)

	// 2. Criar Sala 5x10 = 50 assentos gerados automaticamente
	room, err := svc.CreateRoom(ctx, CreateRoomCommand{
		TenantID:    tenantID,
		ComplexID:   complex.ID,
		Name:        "Sala IMAX",
		RoomNumber:  1,
		SoundSystem: "dolby_atmos",
		ScreenType:  "imax",
		RowCount:    5,
		ColumnCount: 10,
	})
	require.NoError(t, err)
	assert.Equal(t, 50, room.Capacity)

	seats, err := svc.GetRoomSeats(ctx, tenantID, room.ID)
	require.NoError(t, err)
	assert.Equal(t, 50, len(seats))
	assert.Equal(t, "A", seats[0].RowCode)
	assert.Equal(t, 1, seats[0].ColumnNumber)

	// 3. Agendar sessão derivando duração do filme do catálogo
	movieID := uuid.New()
	movie, err := catalogDomain.NewMovie(tenantID, "Avatar 3", 192, "12")
	require.NoError(t, err)
	movie.ID = movieID
	movieGetter.AddMovie(movie)

	// StartTime no UTC; o service ajusta para o fuso do complexo internamente
	startTime := time.Date(2026, 8, 20, 20, 0, 0, 0, time.UTC)

	st, err := svc.ScheduleShowtime(ctx, ScheduleShowtimeCommand{
		TenantID:             tenantID,
		ComplexID:            complex.ID,
		RoomID:               room.ID,
		MovieID:              movieID,
		AudioType:            "DUB",
		ProjectionType:       "IMAX",
		StartTime:            startTime,
		MovieDurationMinutes: 0, // Ignorado; duração vem do MovieGetter (192 min)
		CleaningMinutes:      15,
		BaseTicketPrice:      49.90,
	})
	require.NoError(t, err)
	assert.Equal(t, 192.0, st.EndTime.Sub(st.StartTime).Minutes())

	// 4. Conflito de horário na mesma sala deve ser bloqueado
	_, err = svc.ScheduleShowtime(ctx, ScheduleShowtimeCommand{
		TenantID:             tenantID,
		ComplexID:            complex.ID,
		RoomID:               room.ID,
		MovieID:              movieID,
		AudioType:            "LEG",
		ProjectionType:       "IMAX",
		StartTime:            startTime.Add(30 * time.Minute), // Dentro do intervalo da sessão anterior
		MovieDurationMinutes: 0,
		CleaningMinutes:      15,
		BaseTicketPrice:      49.90,
	})
	assert.ErrorIs(t, err, domain.ErrShowtimeOverlap)

	// 5. Validação de enum inválido
	_, err = catalogDomain.NewMovie(tenantID, "Test", 100, "INVALID")
	assert.Error(t, err)

	_, err = domain.NewShowtime(tenantID, complex.ID, room.ID, movieID, "INVALID", "2D", startTime, 100, 15, 30.0)
	assert.Error(t, err)
}
