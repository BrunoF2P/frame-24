package seatlock

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSeatLockManager_NilClientFallback(t *testing.T) {
	mgr := NewManager(nil)
	ctx := context.Background()

	tenantID := uuid.New()
	showtimeID := uuid.New()
	seat1 := uuid.New()
	seat2 := uuid.New()

	// 1. Lock com client nil deve ter sucesso gracioso para modo mock/testes
	res, err := mgr.LockSeats(ctx, tenantID, showtimeID, []uuid.UUID{seat1, seat2}, "session-123", 300)
	require.NoError(t, err)
	assert.True(t, res.Success)
	assert.Nil(t, res.ConflictSeat)
	assert.True(t, res.ExpiresAt.After(time.Now()))

	// 2. Heartbeat com client nil
	ok, err := mgr.RenewHeartbeat(ctx, tenantID, showtimeID, []uuid.UUID{seat1}, "session-123", 300)
	require.NoError(t, err)
	assert.True(t, ok)

	// 3. Release com client nil
	err = mgr.ReleaseSeats(ctx, tenantID, showtimeID, []uuid.UUID{seat1}, "session-123")
	require.NoError(t, err)

	// 4. GetLockedSeats com client nil
	locked, err := mgr.GetLockedSeats(ctx, tenantID, showtimeID, []uuid.UUID{seat1, seat2})
	require.NoError(t, err)
	assert.Empty(t, locked)
}
