package outbox

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// staleProcessingWindow define quanto tempo um evento marcado como 'processing'
// pode permanecer travado antes de ser reivindicado novamente (crash de worker).
const staleProcessingWindow = 5 * time.Minute

// DispatcherConfig define as opções do worker de Outbox
type DispatcherConfig struct {
	PollInterval time.Duration
	BatchSize    int
	MaxRetries   int
	Workers      int
	EventTimeout time.Duration
}

// DefaultDispatcherConfig retorna parâmetros ideais para produção
func DefaultDispatcherConfig() DispatcherConfig {
	return DispatcherConfig{
		PollInterval: 500 * time.Millisecond,
		BatchSize:    50,
		MaxRetries:   5,
		Workers:      8,
		EventTimeout: 30 * time.Second,
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

// ProcessBatch reivindica, processa em paralelo e finaliza cada evento em
// transações curtas e independentes — a transação não fica mais aberta durante o dispatch.
func (d *Dispatcher) ProcessBatch(ctx context.Context) error {
	events, err := d.claimEvents(ctx, d.cfg.BatchSize)
	if err != nil {
		return err
	}
	if len(events) == 0 {
		return nil
	}

	var wg sync.WaitGroup
	sem := make(chan struct{}, d.cfg.Workers)
	errCh := make(chan error, len(events))

	for i := range events {
		event := events[i]
		wg.Add(1)
		sem <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-sem }()

			eventCtx, cancel := context.WithTimeout(ctx, d.cfg.EventTimeout)
			defer cancel()

			if err := d.bus.Dispatch(eventCtx, event); err != nil {
				errCh <- d.finalizeFailure(ctx, event, err)
			} else {
				errCh <- d.finalizeSuccess(ctx, event.ID)
			}
		}()
	}
	wg.Wait()
	close(errCh)

	var result error
	for err := range errCh {
		if err != nil {
			result = errors.Join(result, err)
		}
	}
	return result
}

// claimEvents marca até n eventos como 'processing' em uma única transação,
// reivindicando também eventos órfãos de workers que falharam (processing há > 5 min).
func (d *Dispatcher) claimEvents(ctx context.Context, n int) ([]Event, error) {
	query := `
		UPDATE platform.outbox_events
		SET status = 'processing', started_at = now()
		WHERE id IN (
			SELECT id
			FROM platform.outbox_events
			WHERE (
					status = 'pending'
					OR (status = 'processing' AND started_at IS NOT NULL AND started_at < now() - interval '5 minutes')
				)
			  AND scheduled_for <= now()
			ORDER BY scheduled_for ASC, created_at ASC
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, tenant_id, event_type, aggregate_id, payload, headers, retry_count, max_retries
	`

	rows, err := d.pool.Query(ctx, query, n)
	if err != nil {
		return nil, fmt.Errorf("falha ao reivindicar eventos da outbox: %w", err)
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var e Event
		var payloadBytes []byte
		var headersBytes []byte
		if err := rows.Scan(
			&e.ID,
			&e.TenantID,
			&e.EventType,
			&e.AggregateID,
			&payloadBytes,
			&headersBytes,
			&e.RetryCount,
			&e.MaxRetries,
		); err != nil {
			return nil, fmt.Errorf("falha ao scanear evento da outbox: %w", err)
		}
		e.Payload = payloadBytes
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("falha ao iterar eventos da outbox: %w", err)
	}

	return events, nil
}

// finalizeSuccess marca o evento como processado na sua própria transação.
func (d *Dispatcher) finalizeSuccess(ctx context.Context, eventID uuid.UUID) error {
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("falha ao iniciar transacao de finalizacao: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		UPDATE platform.outbox_events
		SET status = 'processed', processed_at = now(), started_at = NULL
		WHERE id = $1
	`, eventID); err != nil {
		return fmt.Errorf("falha ao marcar evento como processado: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("falha ao confirmar finalizacao do evento: %w", err)
	}
	return nil
}

// finalizeFailure aplica backoff exponencial ou marca como falho definitivamente.
func (d *Dispatcher) finalizeFailure(ctx context.Context, event Event, err error) error {
	newRetryCount := event.RetryCount + 1
	status, backoff := computeRetryState(newRetryCount, event.MaxRetries)

	nextSchedule := time.Now().Add(backoff)
	if status == "failed" {
		nextSchedule = time.Now()
		d.logger.Error("Evento na outbox atingiu maximo de retentativas e falhou definitivamente",
			"event_id", event.ID,
			"event_type", event.EventType,
			"error", err,
		)
	} else {
		d.logger.Warn("Falha ao processar evento na outbox, reagendando com backoff",
			"event_id", event.ID,
			"event_type", event.EventType,
			"retry", newRetryCount,
			"next_retry", nextSchedule,
			"error", err,
		)
	}

	errMsg := err.Error()
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("falha ao iniciar transacao de falha: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		UPDATE platform.outbox_events
		SET status = $1, retry_count = $2, last_error = $3, scheduled_for = $4, started_at = NULL
		WHERE id = $5
	`, status, newRetryCount, errMsg, nextSchedule, event.ID); err != nil {
		return fmt.Errorf("falha ao registrar falha do evento: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("falha ao confirmar falha do evento: %w", err)
	}
	return nil
}

// computeRetryState decide o próximo estado do evento com backoff exponencial.
func computeRetryState(newRetryCount, maxRetries int) (status string, backoff time.Duration) {
	if newRetryCount >= maxRetries {
		return "failed", 0
	}
	return "pending", time.Duration(math.Pow(2, float64(newRetryCount))) * time.Second
}
