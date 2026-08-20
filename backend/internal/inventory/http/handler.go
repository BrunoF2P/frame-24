package http

import (
	"encoding/json"
	"net/http"
	"time"

	"frame-24/internal/inventory/app"
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

func (h *Handler) CreateWarehouse(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	var req CreateWarehouseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	wh, err := h.svc.CreateWarehouse(r.Context(), tenantID, req.ComplexID, req.Name, req.Code, req.IsDefault)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusCreated, wh)
}

func (h *Handler) ListWarehouses(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	complexIDStr := r.URL.Query().Get("complexId")
	if complexIDStr == "" {
		httputil.RespondError(w, r, http.StatusBadRequest, "MISSING_QUERY_PARAM", "complexId e obrigatorio", nil)
		return
	}
	complexID, err := uuid.Parse(complexIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_QUERY_PARAM", "complexId invalido", nil)
		return
	}

	list, err := h.svc.ListWarehouses(r.Context(), tenantID, complexID)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, list)
}

func (h *Handler) GetStockLevels(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	warehouseIDStr := chi.URLParam(r, "warehouseId")
	warehouseID, err := uuid.Parse(warehouseIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "warehouseId invalido", nil)
		return
	}

	levels, err := h.svc.GetStockLevels(r.Context(), tenantID, warehouseID)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, levels)
}

func (h *Handler) RecordPurchase(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}
	userID, _ := auth.GetUserID(r.Context())
	var opID *uuid.UUID
	if userID != uuid.Nil {
		opID = &userID
	}

	var req RecordPurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	sl, err := h.svc.RecordPurchase(
		r.Context(), tenantID, req.WarehouseID, req.ProductID, req.UnitID,
		req.Quantity, req.UnitCost, req.InvoiceID, opID, req.Notes,
	)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, sl)
}

func (h *Handler) RecordDiscard(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}
	userID, _ := auth.GetUserID(r.Context())
	var opID *uuid.UUID
	if userID != uuid.Nil {
		opID = &userID
	}

	var req RecordDiscardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	sl, err := h.svc.RecordDiscard(
		r.Context(), tenantID, req.WarehouseID, req.ProductID, req.UnitID,
		req.Quantity, req.Reason, opID,
	)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, sl)
}

func (h *Handler) AuditAdjustment(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}
	userID, _ := auth.GetUserID(r.Context())
	var opID *uuid.UUID
	if userID != uuid.Nil {
		opID = &userID
	}

	var req AuditAdjustmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_REQUEST_BODY", "Corpo da requisicao invalido", nil)
		return
	}

	sl, err := h.svc.AuditAdjustment(
		r.Context(), tenantID, req.WarehouseID, req.ProductID, req.UnitID,
		req.CountedQuantity, opID, req.Notes,
	)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	httputil.RespondJSON(w, http.StatusOK, sl)
}

func (h *Handler) ListMovements(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "Tenant nao identificado no contexto", nil)
		return
	}

	warehouseIDStr := chi.URLParam(r, "warehouseId")
	warehouseID, err := uuid.Parse(warehouseIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "warehouseId invalido", nil)
		return
	}

	limit := httputil.ParseLimit(r, 50, 100)

	var beforeTS *time.Time
	var beforeID *uuid.UUID
	if raw := r.URL.Query().Get("before"); raw != "" {
		ts, id, err := httputil.DecodeCursor(raw)
		if err != nil {
			httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_CURSOR", "Cursor de paginacao invalido", nil)
			return
		}
		beforeTS = &ts
		beforeID = &id
	}

	list, err := h.svc.ListMovements(r.Context(), tenantID, warehouseID, limit+1, beforeTS, beforeID)
	if err != nil {
		httputil.RespondDomainError(w, r, err)
		return
	}

	hasMore := len(list) > limit
	if hasMore {
		list = list[:limit]
	}

	var nextCursor *string
	if hasMore && len(list) > 0 {
		last := list[len(list)-1]
		nextCursor = httputil.NextCursor(last.CreatedAt, last.ID)
	}

	httputil.RespondJSON(w, http.StatusOK, httputil.Page{Items: list, NextCursor: nextCursor})
}
