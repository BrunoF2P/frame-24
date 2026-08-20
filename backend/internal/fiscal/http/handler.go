package http

import (
	"encoding/json"
	"net/http"

	"frame-24/internal/fiscal/app"
	"frame-24/internal/fiscal/domain"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/httputil"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type Handler struct {
	svc *app.Service
}

func NewHandler(svc *app.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) ConfigureProfile(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant context ausente", nil)
		return
	}

	var req ConfigureProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	profile, err := h.svc.ConfigureFiscalProfile(
		r.Context(), tenantID, req.ComplexID,
		domain.FiscalEnvironment(req.Environment), domain.TaxRegime(req.TaxRegime),
		req.NFCeSeries, req.NFCeCSCID, req.NFCeCSCToken, req.NFSeSeries, req.CNAE, req.AliquotaISS,
	)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, profile)
}

func (h *Handler) CancelSaleFiscal(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant context ausente", nil)
		return
	}

	saleIDStr := chi.URLParam(r, "saleId")
	saleID, err := uuid.Parse(saleIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "saleId invalido", nil)
		return
	}

	var req CancelSaleFiscalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	docs, err := h.svc.CancelFiscalSale(r.Context(), tenantID, req.ComplexID, saleID, req.Reason)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, docs)
}
