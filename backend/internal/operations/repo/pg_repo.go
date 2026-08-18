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
	"frame-24/internal/operations/domain"
	"frame-24/internal/platform/db"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateComplex(ctx context.Context, tx pgx.Tx, c *domain.CinemaComplex) error {
	query := `
		INSERT INTO operations.cinema_complexes (
			id, tenant_id, name, cnpj_filial, state_registration, ancine_code, timezone,
			address_street, address_number, address_neighborhood, address_city, address_state, address_zip_code, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			c.ID, c.TenantID, c.Name, c.CNPJFilial, c.StateRegistration, c.AncineCode, c.Timezone,
			c.AddressStreet, c.AddressNumber, c.AddressNeighborhood, c.AddressCity, c.AddressState, c.AddressZipCode,
			c.Status, c.CreatedAt, c.UpdatedAt,
		)
	} else {
		_, err = r.pool.Exec(ctx, query,
			c.ID, c.TenantID, c.Name, c.CNPJFilial, c.StateRegistration, c.AncineCode, c.Timezone,
			c.AddressStreet, c.AddressNumber, c.AddressNeighborhood, c.AddressCity, c.AddressState, c.AddressZipCode,
			c.Status, c.CreatedAt, c.UpdatedAt,
		)
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrComplexAlreadyExists
		}
		return fmt.Errorf("falha ao criar complexo: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetComplexByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CinemaComplex, error) {
	query := `
		SELECT id, tenant_id, name, cnpj_filial, state_registration, ancine_code, timezone,
		       address_street, address_number, address_neighborhood, address_city, address_state, address_zip_code, status, created_at, updated_at
		FROM operations.cinema_complexes
		WHERE id = $1
	`
	var c domain.CinemaComplex
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, id)
		} else {
			exec = r.pool.QueryRow(ctx, query, id)
		}
		return exec.Scan(
			&c.ID, &c.TenantID, &c.Name, &c.CNPJFilial, &c.StateRegistration, &c.AncineCode, &c.Timezone,
			&c.AddressStreet, &c.AddressNumber, &c.AddressNeighborhood, &c.AddressCity, &c.AddressState, &c.AddressZipCode,
			&c.Status, &c.CreatedAt, &c.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrComplexNotFound
		}
		return nil, fmt.Errorf("falha ao buscar complexo: %w", err)
	}
	return &c, nil
}

func (r *PostgresRepository) ListComplexes(ctx context.Context, tenantID uuid.UUID) ([]domain.CinemaComplex, error) {
	query := `
		SELECT id, tenant_id, name, cnpj_filial, state_registration, ancine_code, timezone,
		       address_street, address_number, address_neighborhood, address_city, address_state, address_zip_code, status, created_at, updated_at
		FROM operations.cinema_complexes
		ORDER BY name ASC
	`
	var list []domain.CinemaComplex
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
			var c domain.CinemaComplex
			err := rows.Scan(
				&c.ID, &c.TenantID, &c.Name, &c.CNPJFilial, &c.StateRegistration, &c.AncineCode, &c.Timezone,
				&c.AddressStreet, &c.AddressNumber, &c.AddressNeighborhood, &c.AddressCity, &c.AddressState, &c.AddressZipCode,
				&c.Status, &c.CreatedAt, &c.UpdatedAt,
			)
			if err != nil {
				return err
			}
			list = append(list, c)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar complexos: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateRoom(ctx context.Context, tx pgx.Tx, rm *domain.Room) error {
	query := `
		INSERT INTO operations.rooms (
			id, tenant_id, complex_id, name, room_number, ancine_room_code, capacity, sound_system, screen_type, row_count, column_count, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query, rm.ID, rm.TenantID, rm.ComplexID, rm.Name, rm.RoomNumber, rm.AncineRoomCode, rm.Capacity, rm.SoundSystem, rm.ScreenType, rm.RowCount, rm.ColumnCount, rm.IsActive, rm.CreatedAt, rm.UpdatedAt)
	} else {
		_, err = r.pool.Exec(ctx, query, rm.ID, rm.TenantID, rm.ComplexID, rm.Name, rm.RoomNumber, rm.AncineRoomCode, rm.Capacity, rm.SoundSystem, rm.ScreenType, rm.RowCount, rm.ColumnCount, rm.IsActive, rm.CreatedAt, rm.UpdatedAt)
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrRoomAlreadyExists
		}
		return fmt.Errorf("falha ao criar sala: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetRoomByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Room, error) {
	query := `
		SELECT id, tenant_id, complex_id, name, room_number, ancine_room_code, capacity, sound_system, screen_type, row_count, column_count, is_active, created_at, updated_at
		FROM operations.rooms
		WHERE id = $1
	`
	var rm domain.Room
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, id)
		} else {
			exec = r.pool.QueryRow(ctx, query, id)
		}
		return exec.Scan(
			&rm.ID, &rm.TenantID, &rm.ComplexID, &rm.Name, &rm.RoomNumber, &rm.AncineRoomCode, &rm.Capacity, &rm.SoundSystem, &rm.ScreenType, &rm.RowCount, &rm.ColumnCount, &rm.IsActive, &rm.CreatedAt, &rm.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrRoomNotFound
		}
		return nil, fmt.Errorf("falha ao buscar sala: %w", err)
	}
	return &rm, nil
}

func (r *PostgresRepository) ListRoomsByComplex(ctx context.Context, tenantID, complexID uuid.UUID) ([]domain.Room, error) {
	query := `
		SELECT id, tenant_id, complex_id, name, room_number, ancine_room_code, capacity, sound_system, screen_type, row_count, column_count, is_active, created_at, updated_at
		FROM operations.rooms
		WHERE complex_id = $1
		ORDER BY room_number ASC
	`
	var list []domain.Room
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query, complexID)
		} else {
			rows, err = r.pool.Query(ctx, query, complexID)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var rm domain.Room
			err := rows.Scan(
				&rm.ID, &rm.TenantID, &rm.ComplexID, &rm.Name, &rm.RoomNumber, &rm.AncineRoomCode, &rm.Capacity, &rm.SoundSystem, &rm.ScreenType, &rm.RowCount, &rm.ColumnCount, &rm.IsActive, &rm.CreatedAt, &rm.UpdatedAt,
			)
			if err != nil {
				return err
			}
			list = append(list, rm)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar salas: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateSeatsBulk(ctx context.Context, tx pgx.Tx, seats []domain.Seat) error {
	if len(seats) == 0 {
		return nil
	}
	query := `
		INSERT INTO operations.seats (id, tenant_id, room_id, row_code, column_number, seat_type, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	// Usar pgx.Batch para inserção massiva em lote eficiente
	batch := &pgx.Batch{}
	for _, s := range seats {
		batch.Queue(query, s.ID, s.TenantID, s.RoomID, s.RowCode, s.ColumnNumber, s.SeatType, s.Status, s.CreatedAt, s.UpdatedAt)
	}

	if tx != nil {
		br := tx.SendBatch(ctx, batch)
		defer br.Close()
		for range seats {
			if _, err := br.Exec(); err != nil {
				return fmt.Errorf("falha na inserção em lote de assentos: %w", err)
			}
		}
	} else if r.pool != nil {
		br := r.pool.SendBatch(ctx, batch)
		defer br.Close()
		for range seats {
			if _, err := br.Exec(); err != nil {
				return fmt.Errorf("falha na inserção em lote de assentos: %w", err)
			}
		}
	}
	return nil
}

func (r *PostgresRepository) ListSeatsByRoom(ctx context.Context, tenantID, roomID uuid.UUID) ([]domain.Seat, error) {
	query := `
		SELECT id, tenant_id, room_id, row_code, column_number, seat_type, status, created_at, updated_at
		FROM operations.seats
		WHERE room_id = $1
		ORDER BY row_code ASC, column_number ASC
	`
	var list []domain.Seat
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query, roomID)
		} else {
			rows, err = r.pool.Query(ctx, query, roomID)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var s domain.Seat
			err := rows.Scan(&s.ID, &s.TenantID, &s.RoomID, &s.RowCode, &s.ColumnNumber, &s.SeatType, &s.Status, &s.CreatedAt, &s.UpdatedAt)
			if err != nil {
				return err
			}
			list = append(list, s)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar assentos: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) CreateShowtime(ctx context.Context, tx pgx.Tx, s *domain.Showtime) error {
	query := `
		INSERT INTO operations.showtimes (
			id, tenant_id, complex_id, room_id, movie_id, audio_type, projection_type,
			start_time, end_time, cleaning_minutes, base_ticket_price, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	var err error
	if tx != nil {
		_, err = tx.Exec(ctx, query,
			s.ID, s.TenantID, s.ComplexID, s.RoomID, s.MovieID, s.AudioType, s.ProjectionType,
			s.StartTime, s.EndTime, s.CleaningMinutes, s.BaseTicketPrice, s.Status, s.CreatedAt, s.UpdatedAt,
		)
	} else {
		_, err = r.pool.Exec(ctx, query,
			s.ID, s.TenantID, s.ComplexID, s.RoomID, s.MovieID, s.AudioType, s.ProjectionType,
			s.StartTime, s.EndTime, s.CleaningMinutes, s.BaseTicketPrice, s.Status, s.CreatedAt, s.UpdatedAt,
		)
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && (pgErr.Code == "23P01" || pgErr.ConstraintName == "no_overlapping_showtimes_per_room") {
			return domain.ErrShowtimeOverlap
		}
		return fmt.Errorf("falha ao agendar sessao: %w", err)
	}
	return nil
}

func (r *PostgresRepository) GetShowtimeByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Showtime, error) {
	query := `
		SELECT id, tenant_id, complex_id, room_id, movie_id, audio_type, projection_type,
		       start_time, end_time, cleaning_minutes, base_ticket_price, status, created_at, updated_at
		FROM operations.showtimes
		WHERE id = $1
	`
	var s domain.Showtime
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, id)
		} else {
			exec = r.pool.QueryRow(ctx, query, id)
		}
		return exec.Scan(
			&s.ID, &s.TenantID, &s.ComplexID, &s.RoomID, &s.MovieID, &s.AudioType, &s.ProjectionType,
			&s.StartTime, &s.EndTime, &s.CleaningMinutes, &s.BaseTicketPrice, &s.Status, &s.CreatedAt, &s.UpdatedAt,
		)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrShowtimeNotFound
		}
		return nil, fmt.Errorf("falha ao buscar sessao: %w", err)
	}
	return &s, nil
}

func (r *PostgresRepository) ListShowtimesByRoom(ctx context.Context, tenantID, roomID uuid.UUID, from, to time.Time) ([]domain.Showtime, error) {
	query := `
		SELECT id, tenant_id, complex_id, room_id, movie_id, audio_type, projection_type,
		       start_time, end_time, cleaning_minutes, base_ticket_price, status, created_at, updated_at
		FROM operations.showtimes
		WHERE room_id = $1 AND start_time >= $2 AND start_time <= $3
		ORDER BY start_time ASC
	`
	var list []domain.Showtime
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query, roomID, from, to)
		} else {
			rows, err = r.pool.Query(ctx, query, roomID, from, to)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var s domain.Showtime
			err := rows.Scan(
				&s.ID, &s.TenantID, &s.ComplexID, &s.RoomID, &s.MovieID, &s.AudioType, &s.ProjectionType,
				&s.StartTime, &s.EndTime, &s.CleaningMinutes, &s.BaseTicketPrice, &s.Status, &s.CreatedAt, &s.UpdatedAt,
			)
			if err != nil {
				return err
			}
			list = append(list, s)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar sessoes da sala: %w", err)
	}
	return list, nil
}

func (r *PostgresRepository) ListShowtimesByComplex(ctx context.Context, tenantID, complexID uuid.UUID, from, to time.Time) ([]domain.Showtime, error) {
	query := `
		SELECT id, tenant_id, complex_id, room_id, movie_id, audio_type, projection_type,
		       start_time, end_time, cleaning_minutes, base_ticket_price, status, created_at, updated_at
		FROM operations.showtimes
		WHERE complex_id = $1 AND start_time >= $2 AND start_time <= $3
		ORDER BY start_time ASC
	`
	var list []domain.Showtime
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query, complexID, from, to)
		} else {
			rows, err = r.pool.Query(ctx, query, complexID, from, to)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var s domain.Showtime
			err := rows.Scan(
				&s.ID, &s.TenantID, &s.ComplexID, &s.RoomID, &s.MovieID, &s.AudioType, &s.ProjectionType,
				&s.StartTime, &s.EndTime, &s.CleaningMinutes, &s.BaseTicketPrice, &s.Status, &s.CreatedAt, &s.UpdatedAt,
			)
			if err != nil {
				return err
			}
			list = append(list, s)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("falha ao listar sessoes do complexo: %w", err)
	}
	return list, nil
}
