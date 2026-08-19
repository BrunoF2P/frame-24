package http

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/httputil"
	"frame-24/internal/sales/app"
)

type Handler struct {
	svc   *app.Service
	wsHub *SeatMapHub
}

func NewHandler(svc *app.Service, wsHub *SeatMapHub) *Handler {
	return &Handler{
		svc:   svc,
		wsHub: wsHub,
	}
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, r *http.Request, err error) {
	httputil.RespondDomainError(w, r, err)
}

// 1. POST /api/v1/sales/seats/lock
func (h *Handler) LockSeats(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req LockSeatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	showtimeID, seatIDs, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	res, err := h.svc.LockSeats(r.Context(), tenantID, showtimeID, seatIDs, req.SessionID, req.TTLSeconds)
	if err != nil {
		respondError(w, r, err)
		return
	}

	if !res.Success {
		httputil.RespondError(w, r, http.StatusConflict, "SEAT_LOCK_CONFLICT", "um ou mais assentos selecionados estao bloqueados por outro cliente", map[string]string{
			"conflictSeat": func() string {
				if res.ConflictSeat != nil {
					return res.ConflictSeat.String()
				}
				return ""
			}(),
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success":   true,
		"expiresAt": res.ExpiresAt,
	})
}

// 2. POST /api/v1/sales/seats/heartbeat
func (h *Handler) RenewHeartbeat(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req RenewHeartbeatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	showtimeID, seatIDs, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	renewed, err := h.svc.RenewHeartbeat(r.Context(), tenantID, showtimeID, seatIDs, req.SessionID, req.TTLSeconds)
	if err != nil {
		respondError(w, r, err)
		return
	}

	if !renewed {
		httputil.RespondError(w, r, http.StatusGone, "SEAT_LOCK_EXPIRED", "o lock dos assentos expirou ou foi liberado", nil)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"renewed": true})
}

// 3. POST /api/v1/sales/seats/release
func (h *Handler) ReleaseSeats(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req ReleaseSeatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	showtimeID, seatIDs, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	err = h.svc.ReleaseSeats(r.Context(), tenantID, showtimeID, seatIDs, req.SessionID)
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"released": true})
}

// 4. GET /api/v1/sales/seats/:showtimeId
func (h *Handler) GetShowtimeSeatMap(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	showtimeIDStr := chi.URLParam(r, "showtimeId")
	showtimeID, err := uuid.Parse(showtimeIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "showtimeId invalido na URL", nil)
		return
	}

	requesterSessionID := r.URL.Query().Get("sessionId")
	seatMap, err := h.svc.GetShowtimeSeatMap(r.Context(), tenantID, showtimeID, requesterSessionID)
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusOK, seatMap)
}

// 5. GET /api/v1/sales/seats/:showtimeId/ws (WebSocket upgrade)
func (h *Handler) StreamSeatMap(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		// Pode receber token na query string para conexões WS do browser
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "token ausente na conexao websocket", nil)
			return
		}
	}

	showtimeIDStr := chi.URLParam(r, "showtimeId")
	showtimeID, err := uuid.Parse(showtimeIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "showtimeId invalido na URL", nil)
		return
	}

	h.wsHub.ServeWS(w, r, tenantID, showtimeID)
}

// 6. POST /api/v1/sales/checkout
func (h *Handler) CheckoutSale(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req CheckoutSaleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	complexID, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	var customerUUID *uuid.UUID
	if req.CustomerID != nil && *req.CustomerID != "" {
		if id, err := uuid.Parse(*req.CustomerID); err == nil {
			customerUUID = &id
		}
	}

	var tickets []app.TicketInput
	for _, tk := range req.Tickets {
		stID, _ := uuid.Parse(tk.ShowtimeID)
		seatID, _ := uuid.Parse(tk.SeatID)
		tickets = append(tickets, app.TicketInput{
			ShowtimeID:     stID,
			SeatID:         seatID,
			TicketType:     tk.TicketType,
			Price:          tk.Price,
			DocumentNumber: tk.DocumentNumber,
		})
	}

	var concessionItems []app.ConcessionItemInput
	for _, it := range req.ConcessionItems {
		var pID, cID *uuid.UUID
		if it.ProductID != nil && *it.ProductID != "" {
			if id, err := uuid.Parse(*it.ProductID); err == nil {
				pID = &id
			}
		}
		if it.ComboID != nil && *it.ComboID != "" {
			if id, err := uuid.Parse(*it.ComboID); err == nil {
				cID = &id
			}
		}
		uID, _ := uuid.Parse(it.UnitID)
		concessionItems = append(concessionItems, app.ConcessionItemInput{
			ItemType:  it.ItemType,
			ProductID: pID,
			ComboID:   cID,
			UnitID:    uID,
			Quantity:  it.Quantity,
			UnitPrice: it.UnitPrice,
		})
	}

	var payments []app.PaymentInput
	for _, pm := range req.Payments {
		payments = append(payments, app.PaymentInput{
			PaymentMethod:     pm.PaymentMethod,
			Amount:            pm.Amount,
			ExternalReference: pm.ExternalReference,
		})
	}

	sale, err := h.svc.CreateSale(r.Context(), app.CreateSaleCommand{
		TenantID:        tenantID,
		ComplexID:       complexID,
		POSTerminalID:   req.POSTerminalID,
		OperatorID:      nil,
		CustomerID:      customerUUID,
		LockSessionID:   req.LockSessionID,
		Tickets:         tickets,
		ConcessionItems: concessionItems,
		Payments:        payments,
		DiscountAmount:  req.DiscountAmount,
		Notes:           req.Notes,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, sale)
}

// 7. GET /api/v1/sales/:id
func (h *Handler) GetSaleByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	saleIDStr := chi.URLParam(r, "id")
	saleID, err := uuid.Parse(saleIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "id da venda invalido", nil)
		return
	}

	sale, err := h.svc.GetSaleByID(r.Context(), tenantID, saleID)
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusOK, sale)
}
