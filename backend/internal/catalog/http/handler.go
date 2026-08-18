package http

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"frame-24/internal/catalog/app"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/httputil"
)

type Handler struct {
	svc *app.Service
}

func NewHandler(svc *app.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) CreateMovie(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "tenant context ausente"})
		return
	}

	var req CreateMovieRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo da requisicao invalido"})
		return
	}
	if err := req.Validate(); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	movie, err := h.svc.CreateMovie(r.Context(), app.CreateMovieCommand{
		TenantID:        tenantID,
		Title:           req.Title,
		OriginalTitle:   req.OriginalTitle,
		DurationMinutes: req.DurationMinutes,
		Rating:          req.Rating,
		Synopsis:        req.Synopsis,
		PosterURL:       req.PosterURL,
		BackdropURL:     req.BackdropURL,
		TrailerURL:      req.TrailerURL,
		Distributor:     req.Distributor,
		AncineCPBCRT:    req.AncineCPBCRT,
		ReleaseDate:     req.ReleaseDate,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, movie)
}

func (h *Handler) ListMovies(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	movies, err := h.svc.ListMovies(r.Context(), tenantID)
	if err != nil {
		respondError(w, r, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"movies": movies})
}

func (h *Handler) CreateUnit(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req CreateUnitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	baseUUID, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	unit, err := h.svc.CreateUnit(r.Context(), app.CreateUnitCommand{
		TenantID:         tenantID,
		Name:             req.Name,
		Acronym:          req.Acronym,
		IsBaseUnit:       req.IsBaseUnit,
		BaseUnitID:       baseUUID,
		ConversionFactor: req.ConversionFactor,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, unit)
}

func (h *Handler) ListUnits(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	units, err := h.svc.ListUnits(r.Context(), tenantID)
	if err != nil {
		respondError(w, r, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"units": units})
}

func (h *Handler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req CreateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	unitUUID, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	prod, err := h.svc.CreateProduct(r.Context(), app.CreateProductCommand{
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		BaseUnitID:  unitUUID,
		NCM:         req.NCM,
		CEST:        req.CEST,
		CostPrice:   req.CostPrice,
		SalePrice:   req.SalePrice,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, prod)
}

func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	products, err := h.svc.ListProducts(r.Context(), tenantID)
	if err != nil {
		respondError(w, r, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"products": products})
}

func (h *Handler) AddBarcode(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req AddBarcodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	pID, uID, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	b, err := h.svc.AddProductBarcode(r.Context(), tenantID, pID, uID, req.Barcode, req.IsPrimary)
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, b)
}

func (h *Handler) GetProductByBarcode(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	barcode := chi.URLParam(r, "barcode")
	if barcode == "" {
		httputil.RespondError(w, r, http.StatusBadRequest, "INVALID_URL_PARAM", "codigo de barras invalido na URL", nil)
		return
	}

	prod, unit, err := h.svc.GetProductByBarcode(r.Context(), tenantID, barcode)
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"product": prod,
		"unit":    unit,
	})
}

func (h *Handler) CreateCombo(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	var req CreateComboRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "BAD_REQUEST", "corpo da requisicao invalido", nil)
		return
	}
	baseUnitUUID, err := req.Validate()
	if err != nil {
		httputil.RespondError(w, r, http.StatusBadRequest, "VALIDATION_FAILED", err.Error(), nil)
		return
	}

	var items []app.ComboItemInput
	for _, item := range req.Items {
		pID, _ := uuid.Parse(item.ProductID)
		uID, _ := uuid.Parse(item.UnitID)
		items = append(items, app.ComboItemInput{
			GroupName:       item.GroupName,
			ProductID:       pID,
			UnitID:          uID,
			Quantity:        item.Quantity,
			AdditionalPrice: item.AdditionalPrice,
		})
	}

	combo, err := h.svc.CreateCombo(r.Context(), app.CreateComboCommand{
		TenantID:   tenantID,
		Name:       req.Name,
		BaseUnitID: baseUnitUUID,
		ComboPrice: req.ComboPrice,
		Items:      items,
	})
	if err != nil {
		respondError(w, r, err)
		return
	}

	respondJSON(w, http.StatusCreated, combo)
}

func (h *Handler) ListCombos(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httputil.RespondError(w, r, http.StatusUnauthorized, "UNAUTHENTICATED", "tenant context ausente", nil)
		return
	}

	combos, err := h.svc.ListCombos(r.Context(), tenantID)
	if err != nil {
		respondError(w, r, err)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"combos": combos})
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	httputil.RespondJSON(w, status, data)
}

func respondError(w http.ResponseWriter, r *http.Request, err error) {
	httputil.RespondDomainError(w, r, err)
}
