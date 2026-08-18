package httputil

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	identityDomain "frame-24/internal/identity/domain"
	opsDomain "frame-24/internal/operations/domain"
)

func TestMapDomainError(t *testing.T) {
	status, code := MapDomainError(identityDomain.ErrInvalidCredentials)
	assert.Equal(t, http.StatusUnauthorized, status)
	assert.Equal(t, "INVALID_CREDENTIALS", code)

	status, code = MapDomainError(opsDomain.ErrShowtimeOverlap)
	assert.Equal(t, http.StatusConflict, status)
	assert.Equal(t, "SHOWTIME_OVERLAP", code)

	status, code = MapDomainError(errors.New("unmapped error"))
	assert.Equal(t, http.StatusInternalServerError, status)
	assert.Equal(t, "INTERNAL_SERVER_ERROR", code)
}

func TestRespondError_EnvelopeFormat(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	fields := map[string]string{
		"email": "E-mail invalido",
	}

	RespondError(rec, req, http.StatusBadRequest, "VALIDATION_FAILED", "Falha de validacao no formulario", fields)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))

	var resp ErrorResponse
	err := json.Unmarshal(rec.Body.Bytes(), &resp)
	require.NoError(t, err)

	assert.Equal(t, "VALIDATION_FAILED", resp.Code)
	assert.Equal(t, "Falha de validacao no formulario", resp.Message)
	assert.NotEmpty(t, resp.Timestamp)
	assert.Equal(t, "E-mail invalido", resp.Fields["email"])
}
