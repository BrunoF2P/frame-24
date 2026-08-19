package seatlock

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const (
	DefaultLockTTLSeconds = 300 // 5 minutos de reserva temporária
)

var (
	// Script Lua para Lock Atômico Multi-Assentos (All-or-Nothing)
	lockSeatsScript = redis.NewScript(`
		local owner = ARGV[1]
		local ttl = tonumber(ARGV[2])

		-- 1. Verificar disponibilidade de TODOS os assentos solicitados
		for i, key in ipairs(KEYS) do
			local current = redis.call('GET', key)
			if current and current ~= owner then
				return {0, key}
			end
		end

		-- 2. Gravar o lock atômico em todos os assentos
		for i, key in ipairs(KEYS) do
			redis.call('SET', key, owner, 'EX', ttl)
		end

		return {1, "OK"}
	`)

	// Script Lua para Renovação Atômica de Heartbeat
	renewHeartbeatScript = redis.NewScript(`
		local owner = ARGV[1]
		local ttl = tonumber(ARGV[2])

		for i, key in ipairs(KEYS) do
			local current = redis.call('GET', key)
			if current ~= owner then
				return 0
			end
		end

		for i, key in ipairs(KEYS) do
			redis.call('EXPIRE', key, ttl)
		end

		return 1
	`)

	// Script Lua para Liberação Atômica Segura (apenas o dono pode liberar)
	releaseSeatsScript = redis.NewScript(`
		local owner = ARGV[1]

		for i, key in ipairs(KEYS) do
			local current = redis.call('GET', key)
			if current == owner then
				redis.call('DEL', key)
			end
		end

		return 1
	`)
)

type Manager struct {
	client *redis.Client
}

func NewManager(client *redis.Client) *Manager {
	return &Manager{client: client}
}

func makeSeatKey(tenantID, showtimeID, seatID uuid.UUID) string {
	return fmt.Sprintf("seatlock:{%s:%s}:%s", tenantID, showtimeID, seatID)
}

// LockResult representa o resultado da tentativa de lock de assentos
type LockResult struct {
	Success      bool
	ConflictSeat *uuid.UUID
	ExpiresAt    time.Time
}

// LockSeats tenta reservar atomicamente um conjunto de assentos para um cliente/sessão
func (m *Manager) LockSeats(ctx context.Context, tenantID, showtimeID uuid.UUID, seatIDs []uuid.UUID, ownerID string, ttlSeconds int) (*LockResult, error) {
	if len(seatIDs) == 0 {
		return &LockResult{Success: true, ExpiresAt: time.Now()}, nil
	}
	if m.client == nil {
		// Mock/in-memory para testes sem Redis ativo
		return &LockResult{Success: true, ExpiresAt: time.Now().Add(time.Duration(ttlSeconds) * time.Second)}, nil
	}

	if ttlSeconds <= 0 {
		ttlSeconds = DefaultLockTTLSeconds
	}

	keys := make([]string, len(seatIDs))
	for i, seatID := range seatIDs {
		keys[i] = makeSeatKey(tenantID, showtimeID, seatID)
	}

	res, err := lockSeatsScript.Run(ctx, m.client, keys, ownerID, ttlSeconds).Slice()
	if err != nil {
		return nil, fmt.Errorf("falha ao executar lock atômico no redis: %w", err)
	}

	status, ok := res[0].(int64)
	if !ok {
		return nil, fmt.Errorf("resposta inesperada do script de lock lua")
	}

	if status == 0 {
		conflictKey, _ := res[1].(string)
		var conflictUUID *uuid.UUID
		parts := strings.Split(conflictKey, ":")
		if len(parts) > 0 {
			if id, err := uuid.Parse(parts[len(parts)-1]); err == nil {
				conflictUUID = &id
			}
		}
		return &LockResult{
			Success:      false,
			ConflictSeat: conflictUUID,
		}, nil
	}

	return &LockResult{
		Success:   true,
		ExpiresAt: time.Now().Add(time.Duration(ttlSeconds) * time.Second),
	}, nil
}

// RenewHeartbeat estende a expiração de assentos reservados pelo proprietário
func (m *Manager) RenewHeartbeat(ctx context.Context, tenantID, showtimeID uuid.UUID, seatIDs []uuid.UUID, ownerID string, ttlSeconds int) (bool, error) {
	if len(seatIDs) == 0 {
		return true, nil
	}
	if m.client == nil {
		return true, nil
	}
	if ttlSeconds <= 0 {
		ttlSeconds = DefaultLockTTLSeconds
	}

	keys := make([]string, len(seatIDs))
	for i, seatID := range seatIDs {
		keys[i] = makeSeatKey(tenantID, showtimeID, seatID)
	}

	res, err := renewHeartbeatScript.Run(ctx, m.client, keys, ownerID, ttlSeconds).Int64()
	if err != nil {
		return false, fmt.Errorf("falha ao renovar heartbeat no redis: %w", err)
	}

	return res == 1, nil
}

// ReleaseSeats libera os assentos bloqueados pelo proprietário
func (m *Manager) ReleaseSeats(ctx context.Context, tenantID, showtimeID uuid.UUID, seatIDs []uuid.UUID, ownerID string) error {
	if len(seatIDs) == 0 || m.client == nil {
		return nil
	}

	keys := make([]string, len(seatIDs))
	for i, seatID := range seatIDs {
		keys[i] = makeSeatKey(tenantID, showtimeID, seatID)
	}

	_, err := releaseSeatsScript.Run(ctx, m.client, keys, ownerID).Result()
	if err != nil {
		return fmt.Errorf("falha ao liberar assentos no redis: %w", err)
	}

	return nil
}

// VerifySeatLocks verifica se todos os assentos estão livres ou pertencem à sessão do comprador
func (m *Manager) VerifySeatLocks(ctx context.Context, tenantID, showtimeID uuid.UUID, seatIDs []uuid.UUID, ownerID string) error {
	if len(seatIDs) == 0 || m.client == nil {
		return nil
	}

	keys := make([]string, len(seatIDs))
	for i, seatID := range seatIDs {
		keys[i] = makeSeatKey(tenantID, showtimeID, seatID)
	}

	// Script Lua para checagem estrita de ownership do lock
	checkScript := redis.NewScript(`
		local owner = ARGV[1]
		for i, key in ipairs(KEYS) do
			local current = redis.call('GET', key)
			if current and current ~= owner then
				return 0
			end
		end
		return 1
	`)

	res, err := checkScript.Run(ctx, m.client, keys, ownerID).Int64()
	if err != nil {
		return fmt.Errorf("falha ao verificar propriedade dos locks no redis: %w", err)
	}

	if res == 0 {
		return fmt.Errorf("um ou mais assentos estao reservados por outro cliente")
	}

	return nil
}

// GetLockedSeats verifica o status de um lote de assentos conhecidos
func (m *Manager) GetLockedSeats(ctx context.Context, tenantID, showtimeID uuid.UUID, allSeatIDs []uuid.UUID) (map[uuid.UUID]string, error) {
	locked := make(map[uuid.UUID]string)
	if len(allSeatIDs) == 0 || m.client == nil {
		return locked, nil
	}

	pipe := m.client.Pipeline()
	cmds := make(map[uuid.UUID]*redis.StringCmd)

	for _, seatID := range allSeatIDs {
		key := makeSeatKey(tenantID, showtimeID, seatID)
		cmds[seatID] = pipe.Get(ctx, key)
	}

	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		// Ignora redis.Nil (chave não encontrada = assento livre)
	}

	for seatID, cmd := range cmds {
		val, err := cmd.Result()
		if err == nil && val != "" {
			locked[seatID] = val
		}
	}

	return locked, nil
}
