package httputil

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Page é a resposta padrão para listagens paginadas por cursor.
type Page struct {
	Items      any     `json:"items"`
	NextCursor *string `json:"nextCursor,omitempty"`
}

// ParseLimit lê o parâmetro ?limit= aplicando um teto rígido.
func ParseLimit(r *http.Request, defaultLimit, maxLimit int) int {
	limit := defaultLimit
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	return limit
}

// EncodeCursor serializa (ts, id) numa string opaca para navegação por chave.
func EncodeCursor(ts time.Time, id uuid.UUID) string {
	return base64.RawURLEncoding.EncodeToString(fmt.Appendf(nil,
		"%s|%s", ts.UTC().Format(time.RFC3339Nano), id.String(),
	))
}

// DecodeCursor interpreta o cursor opaco produzido por EncodeCursor.
func DecodeCursor(raw string) (time.Time, uuid.UUID, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return time.Time{}, uuid.Nil, fmt.Errorf("cursor invalido: %w", err)
	}
	parts := strings.SplitN(string(decoded), "|", 2)
	if len(parts) != 2 {
		return time.Time{}, uuid.Nil, fmt.Errorf("cursor invalido: formato desconhecido")
	}
	ts, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, uuid.Nil, fmt.Errorf("cursor invalido: timestamp")
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		return time.Time{}, uuid.Nil, fmt.Errorf("cursor invalido: id")
	}
	return ts, id, nil
}

// NextCursor gera o cursor da próxima página a partir do último item retornado.
func NextCursor(ts time.Time, id uuid.UUID) *string {
	s := EncodeCursor(ts, id)
	return &s
}
