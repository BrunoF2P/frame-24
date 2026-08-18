package http

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"frame-24/internal/operations/app"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/httputil"
)

type Handler struct {
	svc *app.Service
}

func NewHandler(svc *app.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) CreateComplex(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant context ausente"})
		return
	}

	var req CreateComplexRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo da requisicao invalido"})
		return
	}
	if err := req.Validate(); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	c, err := h.svc.CreateComplex(r.Context(), app.CreateComplexCommand{
		TenantID:            tenantID,
		Name:                req.Name,
		CNPJFilial:          req.CNPJFilial,
		StateRegistration:   req.StateRegistration,
		AncineCode:          req.AncineCode,
		Timezone:            req.Timezone,
		AddressStreet:       req.AddressStreet,
		AddressNumber:       req.AddressNumber,
		AddressNeighborhood: req.AddressNeighborhood,
		AddressCity:         req.AddressCity,
		AddressState:        req.AddressState,
		AddressZipCode:      req.AddressZipCode,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, c)
}

func (h *Handler) ListComplexes(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	list, err := h.svc.ListComplexes(r.Context(), tenantID)
	if err != nil {
		respondError(w, r, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"complexes": list})
}

func (h *Handler) CreateRoom(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	cID, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	rm, err := h.svc.CreateRoom(r.Context(), app.CreateRoomCommand{
		TenantID:       tenantID,
		ComplexID:      cID,
		Name:           req.Name,
		RoomNumber:     req.RoomNumber,
		AncineRoomCode: req.AncineRoomCode,
		SoundSystem:    req.SoundSystem,
		ScreenType:     req.ScreenType,
		RowCount:       req.RowCount,
		ColumnCount:    req.ColumnCount,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, rm)
}

func (h *Handler) ListRooms(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	complexIDStr := chi.URLParam(r, "complexID")
	cID, err := uuid.Parse(complexIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "complexID invalido na URL", nil)
		return
	}

	rooms, err := h.svc.ListRoomsByComplex(r.Context(), tenantID, cID)
	if err != nil {
		respondError(w, r, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"rooms": rooms})
}

func (h *Handler) GetRoomSeats(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	roomIDStr := chi.URLParam(r, "roomID")
	rmID, err := uuid.Parse(roomIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "roomID invalido na URL", nil)
		return
	}

	seats, err := h.svc.GetRoomSeats(r.Context(), tenantID, rmID)
	if err != nil {
		respondError(w, r, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"seats": seats})
}

func (h *Handler) ScheduleShowtime(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req ScheduleShowtimeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	cID, rmID, mvID, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	st, err := h.svc.ScheduleShowtime(r.Context(), app.ScheduleShowtimeCommand{
		TenantID:             tenantID,
		ComplexID:            cID,
		RoomID:               rmID,
		MovieID:              mvID,
		AudioType:            req.AudioType,
		ProjectionType:       req.ProjectionType,
		StartTime:            req.StartTime,
		MovieDurationMinutes: req.MovieDurationMinutes,
		CleaningMinutes:      req.CleaningMinutes,
		BaseTicketPrice:      req.BaseTicketPrice,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, st)
}

func (h *Handler) ListShowtimes(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	complexIDStr := chi.URLParam(r, "complexID")
	cID, err := uuid.Parse(complexIDStr)
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "complexID invalido na URL", nil)
		return
	}

	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	var from, to time.Time
	if fromStr != "" {
		from, _ = time.Parse(time.RFC3339, fromStr)
	}
	if toStr != "" {
		to, _ = time.Parse(time.RFC3339, toStr)
	}

	showtimes, err := h.svc.ListShowtimesByComplex(r.Context(), tenantID, cID, from, to)
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"showtimes": showtimes})
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	httputil.RespondJSON(w, status, data)
}

func respondError(w http.ResponseWriter, r *http.Request, err error) {
	httputil.RespondDomainError(w, r, err)
}
