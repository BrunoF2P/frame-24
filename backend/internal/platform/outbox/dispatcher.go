package outbox

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DispatcherConfig define as opções do worker de Outbox
type DispatcherConfig struct {
	PollInterval time.Duration
	BatchSize    int
	MaxRetries   int
}

// DefaultDispatcherConfig retorna parâmetros ideais para produção
func DefaultDispatcherConfig() DispatcherConfig {
	return DispatcherConfig{
		PollInterval: 500 * time.Millisecond,
		BatchSize:    50,
		MaxRetries:   5,
	}
}

// Dispatcher executa o ciclo de leitura e disparo de eventos pendentes da Outbox
type Dispatcher struct {
	pool   *pgxpool.Pool
	bus    EventBus
	cfg    DispatcherConfig
	logger *slog.Logger
}

// NewDispatcher instancia um novo Dispatcher
func NewDispatcher(pool *pgxpool.Pool, bus EventBus, cfg DispatcherConfig) *Dispatcher {
	return &Dispatcher{
		pool:   pool,
		bus:    bus,
		cfg:    cfg,
		logger: slog.Default().With("component", "outbox_dispatcher"),
	}
}

// Start inicia o loop de processamento em background
func (d *Dispatcher) Start(ctx context.Context) {
	d.logger.Info("Iniciando Outbox Dispatcher Worker...")
	ticker := time.NewTicker(d.cfg.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			d.logger.Info("Outbox Dispatcher finalizado.")
			return
		case <-ticker.C:
			if err := d.ProcessBatch(ctx); err != nil {
				d.logger.Error("Erro ao processar lote de eventos outbox", "error", err)
			}
		}
	}
}

// ProcessBatch busca e consome um lote atômico de eventos pendentes usando SKIP LOCKED
func (d *Dispatcher) ProcessBatch(ctx context.Context) error {
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("falha ao iniciar transacao do dispatcher: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Busca eventos pendentes garantindo que outros nós/workers não peguem os mesmos registros (SKIP LOCKED)
	query := `
		SELECT id, tenant_id, event_type, aggregate_id, payload, headers, retry_count, max_retries
		FROM platform.outbox_events
		WHERE status IN ('pending', 'processing')
		  AND scheduled_for <= now()
		ORDER BY scheduled_for ASC, created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`

	rows, err := tx.Query(ctx, query, d.cfg.BatchSize)
	if err != nil {
		return fmt.Errorf("falha na query de outbox events: %w", err)
	}

	var events []Event
	for rows.Next() {
		var e Event
		var payloadBytes []byte
		var headersBytes []byte
		err := rows.Scan(
			&e.ID,
			&e.TenantID,
			&e.EventType,
			&e.AggregateID,
			&payloadBytes,
			&headersBytes,
			&e.RetryCount,
			&e.MaxRetries,
		)
		if err != nil {
			rows.Close()
			return fmt.Errorf("falha ao scanear evento da outbox: %w", err)
		}
		e.Payload = payloadBytes
		events = append(events, e)
	}
	rows.Close()

	if len(events) == 0 {
		return nil
	}

	// Processa cada evento chamando o EventBus
	for _, event := range events {
		dispatchErr := d.bus.Dispatch(ctx, event)
		if dispatchErr != nil {
			d.handleFailure(ctx, tx, event, dispatchErr)
		} else {
			d.handleSuccess(ctx, tx, event.ID)
		}
	}

	return tx.Commit(ctx)
}

func (d *Dispatcher) handleSuccess(ctx context.Context, tx pgx.Tx, eventID uuid.UUID) {
	query := `
		UPDATE platform.outbox_events
		SET status = 'processed', processed_at = now()
		WHERE id = $1
	`
	_, _ = tx.Exec(ctx, query, eventID)
}

func (d *Dispatcher) handleFailure(ctx context.Context, tx pgx.Tx, event Event, err error) {
	newRetryCount := event.RetryCount + 1
	var status string
	var nextSchedule time.Time

	if newRetryCount >= event.MaxRetries {
		status = "failed"
		nextSchedule = time.Now()
		d.logger.Error("Evento na outbox atingiu maximo de retentativas e falhou definitivamente",
			"event_id", event.ID,
			"event_type", event.EventType,
			"error", err,
		)
	} else {
		status = "pending"
		// Backoff exponencial: 2s, 4s, 8s, 16s...
		backoffSeconds := math.Pow(2, float64(newRetryCount))
		nextSchedule = time.Now().Add(time.Duration(backoffSeconds) * time.Second)
		d.logger.Warn("Falha ao processar evento na outbox, reagendando com backoff",
			"event_id", event.ID,
			"event_type", event.EventType,
			"retry", newRetryCount,
			"next_retry", nextSchedule,
			"error", err,
		)
	}

	errMsg := err.Error()
	query := `
		UPDATE platform.outbox_events
		SET status = $1, retry_count = $2, last_error = $3, scheduled_for = $4
		WHERE id = $5
	`
	_, _ = tx.Exec(ctx, query, status, newRetryCount, errMsg, nextSchedule, event.ID)
}
