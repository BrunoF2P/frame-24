package outbox

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInProcessBus_SubscribeAndDispatch(t *testing.T) {
	bus := NewInProcessBus()

	receivedEvent := false
	var capturedEventType string
	var capturedAggregateID uuid.UUID

	bus.Subscribe("sales.sale.completed", func(ctx context.Context, e Event) error {
		receivedEvent = true
		capturedEventType = e.EventType
		capturedAggregateID = e.AggregateID
		return nil
	})

	testEvent := Event{
		ID:          uuid.New(),
		TenantID:    uuid.New(),
		EventType:   "sales.sale.completed",
		AggregateID: uuid.New(),
		CreatedAt:   time.Now(),
	}

	err := bus.Dispatch(context.Background(), testEvent)
	require.NoError(t, err)
	assert.True(t, receivedEvent)
	assert.Equal(t, "sales.sale.completed", capturedEventType)
	assert.Equal(t, testEvent.AggregateID, capturedAggregateID)
}

func TestInProcessBus_WildcardSubscriber(t *testing.T) {
	bus := NewInProcessBus()
	wildcardCalled := false

	bus.Subscribe("*", func(ctx context.Context, e Event) error {
		wildcardCalled = true
		return nil
	})

	err := bus.Dispatch(context.Background(), Event{EventType: "identity.user.registered"})
	require.NoError(t, err)
	assert.True(t, wildcardCalled)
}

func TestInProcessBus_HandlerError(t *testing.T) {
	bus := NewInProcessBus()

	bus.Subscribe("order.failed", func(ctx context.Context, e Event) error {
		return errors.New("falha na notificacao de email")
	})

	err := bus.Dispatch(context.Background(), Event{EventType: "order.failed"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "falha na notificacao de email")
}
