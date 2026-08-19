package http

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"frame-24/internal/finance/app"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/httputil"
)

type Handler struct {
	svc *app.Service
}

func NewHandler(svc *app.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) ListAccounts(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	accounts, err := h.svc.ListAccounts(r.Context(), tenantID)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, accounts)
}

func (h *Handler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	var req CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	acc, err := h.svc.CreateAccount(r.Context(), tenantID, req.Code, req.Name, req.AccountType)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusCreated, acc)
}

func (h *Handler) PostTransaction(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	var req PostTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	var entries []app.LedgerEntryInput
	for _, e := range req.Entries {
		entries = append(entries, app.LedgerEntryInput{
			AccountCode: e.AccountCode,
			EntryType:   e.EntryType,
			Amount:      e.Amount,
		})
	}

	tx, err := h.svc.PostLedgerTransaction(r.Context(), tenantID, req.Description, req.ReferenceType, req.ReferenceID, entries)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusCreated, tx)
}

func (h *Handler) ListTransactions(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	limit := 50
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	list, err := h.svc.ListTransactions(r.Context(), tenantID, limit)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, list)
}

// ---------------------------------------------------------------------
// Handlers de Caixa de PDV
// ---------------------------------------------------------------------

func (h *Handler) OpenCashSession(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Operador nao identificado no contexto", nil)
		return
	}

	var req OpenCashSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	session, err := h.svc.OpenCashSession(r.Context(), tenantID, req.ComplexID, req.POSTerminalID, userID, req.OpeningFloat)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusCreated, session)
}

func (h *Handler) GetCurrentSession(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Operador nao identificado no contexto", nil)
		return
	}

	complexIDStr := r.URL.Query().Get("complexId")
	posTerminalID := r.URL.Query().Get("posTerminalId")
	if complexIDStr == "" || posTerminalID == "" {
		httputil.RespondError(w, r, http.StatusBadRequest, "MISSING_QUERY_PARAMS", "complexId e posTerminalId sao obrigatorios", nil)
		return
	}
	complexID, err := uuid.Parse(complexIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_QUERY_PARAMS", "complexId invalido", nil)
		return
	}

	session, err := h.svc.GetOpenCashSession(r.Context(), tenantID, complexID, posTerminalID, userID)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}
	if session == nil {
		httputil.RespondError(w, r, http.StatusNotFound, "CASH_SESSION_NOT_OPEN", "Nao ha sessao de caixa aberta para este terminal/operador", nil)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, session)
}

func (h *Handler) RecordBleed(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}
	callerUserID, _ := auth.GetUserID(r.Context())

	sessionIDStr := chi.URLParam(r, "sessionId")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "sessionId invalido", nil)
		return
	}

	var req CashMovementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	authID := req.AuthorizedByID
	if authID == nil && callerUserID != uuid.Nil {
		authID = &callerUserID
	}

	if err := h.svc.RecordCashBleed(r.Context(), tenantID, sessionID, req.Amount, req.Reason, authID); err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, map[string]string{"status": "sangria_registrada"})
}

func (h *Handler) RecordSupply(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}
	callerUserID, _ := auth.GetUserID(r.Context())

	sessionIDStr := chi.URLParam(r, "sessionId")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "sessionId invalido", nil)
		return
	}

	var req CashMovementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	authID := req.AuthorizedByID
	if authID == nil && callerUserID != uuid.Nil {
		authID = &callerUserID
	}

	if err := h.svc.RecordCashSupply(r.Context(), tenantID, sessionID, req.Amount, req.Reason, authID); err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, map[string]string{"status": "suprimento_registrado"})
}

func (h *Handler) CloseBlind(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	sessionIDStr := chi.URLParam(r, "sessionId")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "sessionId invalido", nil)
		return
	}

	var req CloseBlindRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	closedSession, err := h.svc.CloseCashSessionBlind(r.Context(), tenantID, sessionID, req.CashCounted, req.CardCounted, req.PixCounted, req.Notes)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, closedSession)
}
