package outbox

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Event representa um evento de domínio gravado na tabela outbox
type Event struct {
	ID           uuid.UUID      `json:"id"`
	TenantID     uuid.UUID      `json:"tenantId"`
	EventType    string         `json:"eventType"`
	AggregateID  uuid.UUID      `json:"aggregateId"`
	Payload      jsonbRaw       `json:"payload"`
	Headers      map[string]any `json:"headers,omitempty"`
	Status       string         `json:"status"`
	RetryCount   int            `json:"retryCount"`
	MaxRetries   int            `json:"maxRetries"`
	LastError    *string        `json:"lastError,omitempty"`
	ScheduledFor time.Time      `json:"scheduledFor"`
	CreatedAt    time.Time      `json:"createdAt"`
	ProcessedAt  *time.Time     `json:"processedAt,omitempty"`
}

type jsonbRaw []byte

func (j jsonbRaw) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

func (j *jsonbRaw) UnmarshalJSON(data []byte) error {
	*j = append((*j)[0:0], data...)
	return nil
}

// HandlerFunc define a assinatura de uma função consumidora de evento assíncrono
type HandlerFunc func(ctx context.Context, event Event) error

// EventBus é a interface de publicação e subscrição interna de eventos
type EventBus interface {
	Subscribe(eventType string, handler HandlerFunc)
	Dispatch(ctx context.Context, event Event) error
}

// InProcessBus é a implementação padrão de barramento em memória no mesmo processo
type InProcessBus struct {
	mu       sync.RWMutex
	handlers map[string][]HandlerFunc
}

// NewInProcessBus cria um novo barramento de eventos
func NewInProcessBus() *InProcessBus {
	return &InProcessBus{
		handlers: make(map[string][]HandlerFunc),
	}
}

// Subscribe registra um handler para um tipo específico de evento
func (b *InProcessBus) Subscribe(eventType string, handler HandlerFunc) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[eventType] = append(b.handlers[eventType], handler)
}

// Dispatch executa todos os handlers registrados para o evento
func (b *InProcessBus) Dispatch(ctx context.Context, event Event) error {
	b.mu.RLock()
	handlers, exists := b.handlers[event.EventType]
	wildcards := b.handlers["*"]
	b.mu.RUnlock()

	var allHandlers []HandlerFunc
	if exists {
		allHandlers = append(allHandlers, handlers...)
	}
	if len(wildcards) > 0 {
		allHandlers = append(allHandlers, wildcards...)
	}

	for _, h := range allHandlers {
		if err := h(ctx, event); err != nil {
			return fmt.Errorf("erro no handler para evento '%s': %w", event.EventType, err)
		}
	}

	return nil
}

// InsertEvent grava um novo evento de domínio na tabela outbox na MESMA transação do negócio
func InsertEvent(ctx context.Context, tx pgx.Tx, tenantID uuid.UUID, eventType string, aggregateID uuid.UUID, payload any) error {
	if tx == nil {
		return nil
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("falha ao serializar payload do evento: %w", err)
	}

	query := `
		INSERT INTO platform.outbox_events (
			tenant_id, event_type, aggregate_id, payload, headers, status, retry_count, max_retries, scheduled_for, created_at
		) VALUES (
			$1, $2, $3, $4, '{}'::jsonb, 'pending', 0, 5, now(), now()
		)
	`
	_, err = tx.Exec(ctx, query, tenantID, eventType, aggregateID, payloadBytes)
	if err != nil {
		return fmt.Errorf("falha ao gravar evento na outbox: %w", err)
	}

	return nil
}
