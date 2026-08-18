package httputil

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	catalogDomain "frame-24/internal/catalog/domain"
	identityDomain "frame-24/internal/identity/domain"
	opsDomain "frame-24/internal/operations/domain"
)

// ErrorResponse define o envelope canônico de erros da API para consumo seguro pelo Frontend (React/Next.js).
// Segue o padrão de observabilidade com código único, mensagem amigável, trace ID (RequestID) e mapa de campos.
type ErrorResponse struct {
	Code      string            `json:"code"`
	Message   string            `json:"message"`
	RequestID string            `json:"requestId,omitempty"`
	Timestamp string            `json:"timestamp"`
	Fields    map[string]string `json:"fields,omitempty"`
}

// RespondJSON envia uma resposta JSON formatada com o status HTTP informado
func RespondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

// RespondError envia um erro estruturado no envelope canônico
func RespondError(w http.ResponseWriter, r *http.Request, status int, code, message string, fields map[string]string) {
	reqID := middleware.GetReqID(r.Context())
	resp := ErrorResponse{
		Code:      code,
		Message:   message,
		RequestID: reqID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Fields:    fields,
	}
	RespondJSON(w, status, resp)
}

// MapDomainError mapeia erros de domínio para status HTTP e código canônico constante
func MapDomainError(err error) (status int, code string) {
	if err == nil {
		return http.StatusOK, "OK"
	}

	switch {
	// Bounded Context: Identity
	case errors.Is(err, identityDomain.ErrInvalidCredentials):
		return http.StatusUnauthorized, "INVALID_CREDENTIALS"
	case errors.Is(err, identityDomain.ErrUserInactive):
		return http.StatusUnauthorized, "USER_INACTIVE"
	case errors.Is(err, identityDomain.ErrUserAlreadyExists):
		return http.StatusConflict, "USER_ALREADY_EXISTS"
	case errors.Is(err, identityDomain.ErrTenantAlreadyExists):
		return http.StatusConflict, "TENANT_ALREADY_EXISTS"
	case errors.Is(err, identityDomain.ErrUserNotFound):
		return http.StatusNotFound, "USER_NOT_FOUND"
	case errors.Is(err, identityDomain.ErrTenantNotFound):
		return http.StatusNotFound, "TENANT_NOT_FOUND"
	case errors.Is(err, identityDomain.ErrMembershipNotFound):
		return http.StatusNotFound, "MEMBERSHIP_NOT_FOUND"
	case errors.Is(err, identityDomain.ErrMembershipInactive):
		return http.StatusForbidden, "MEMBERSHIP_INACTIVE"
	case errors.Is(err, identityDomain.ErrTenantInactive):
		return http.StatusForbidden, "TENANT_INACTIVE"
	case errors.Is(err, identityDomain.ErrInvalidEmail):
		return http.StatusUnprocessableEntity, "INVALID_EMAIL"
	case errors.Is(err, identityDomain.ErrInvalidPassword):
		return http.StatusUnprocessableEntity, "INVALID_PASSWORD"
	case errors.Is(err, identityDomain.ErrInvalidCNPJ):
		return http.StatusUnprocessableEntity, "INVALID_CNPJ"

	// Bounded Context: Operations
	case errors.Is(err, opsDomain.ErrComplexNotFound):
		return http.StatusNotFound, "COMPLEX_NOT_FOUND"
	case errors.Is(err, opsDomain.ErrRoomNotFound):
		return http.StatusNotFound, "ROOM_NOT_FOUND"
	case errors.Is(err, opsDomain.ErrShowtimeNotFound):
		return http.StatusNotFound, "SHOWTIME_NOT_FOUND"
	case errors.Is(err, opsDomain.ErrComplexAlreadyExists):
		return http.StatusConflict, "COMPLEX_ALREADY_EXISTS"
	case errors.Is(err, opsDomain.ErrRoomAlreadyExists):
		return http.StatusConflict, "ROOM_ALREADY_EXISTS"
	case errors.Is(err, opsDomain.ErrShowtimeOverlap):
		return http.StatusConflict, "SHOWTIME_OVERLAP"
	case errors.Is(err, opsDomain.ErrInvalidTimezone):
		return http.StatusUnprocessableEntity, "INVALID_TIMEZONE"
	case errors.Is(err, opsDomain.ErrInvalidShowtimeRange):
		return http.StatusUnprocessableEntity, "INVALID_SHOWTIME_RANGE"

	// Bounded Context: Catalog
	case errors.Is(err, catalogDomain.ErrMovieNotFound):
		return http.StatusNotFound, "MOVIE_NOT_FOUND"
	case errors.Is(err, catalogDomain.ErrProductNotFound):
		return http.StatusNotFound, "PRODUCT_NOT_FOUND"
	case errors.Is(err, catalogDomain.ErrUnitNotFound):
		return http.StatusNotFound, "UNIT_NOT_FOUND"
	case errors.Is(err, catalogDomain.ErrComboNotFound):
		return http.StatusNotFound, "COMBO_NOT_FOUND"
	case errors.Is(err, catalogDomain.ErrUnitAlreadyExists):
		return http.StatusConflict, "UNIT_ALREADY_EXISTS"
	case errors.Is(err, catalogDomain.ErrBarcodeAlreadyExists):
		return http.StatusConflict, "BARCODE_ALREADY_EXISTS"
	case errors.Is(err, catalogDomain.ErrInvalidConversion):
		return http.StatusUnprocessableEntity, "INVALID_UNIT_CONVERSION"
	case errors.Is(err, catalogDomain.ErrInvalidNCM):
		return http.StatusUnprocessableEntity, "INVALID_NCM"

	default:
		return http.StatusInternalServerError, "INTERNAL_SERVER_ERROR"
	}
}

// RespondDomainError mapeia e responde automaticamente um erro de domínio no padrão da plataforma
func RespondDomainError(w http.ResponseWriter, r *http.Request, err error) {
	status, code := MapDomainError(err)
	RespondError(w, r, status, code, err.Error(), nil)
}
