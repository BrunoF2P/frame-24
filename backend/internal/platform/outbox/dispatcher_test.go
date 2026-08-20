package outbox

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestComputeRetryState_Backoff(t *testing.T) {
	cases := []struct {
		name       string
		retryCount int
		maxRetries int
		wantStatus string
		wantDelay  time.Duration
	}{
		{"primeira falha", 1, 5, "pending", 2 * time.Second},
		{"segunda falha", 2, 5, "pending", 4 * time.Second},
		{"terceira falha", 3, 5, "pending", 8 * time.Second},
		{"quarta falha", 4, 5, "pending", 16 * time.Second},
		{"atingiu maximo de retentativas", 5, 5, "failed", 0},
		{"excedeu maximo", 6, 5, "failed", 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			status, backoff := computeRetryState(tc.retryCount, tc.maxRetries)
			assert.Equal(t, tc.wantStatus, status)
			assert.Equal(t, tc.wantDelay, backoff)
		})
	}
}
