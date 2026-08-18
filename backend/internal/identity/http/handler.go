package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"frame-24/internal/identity/app"
	"frame-24/internal/identity/domain"
	"frame-24/internal/platform/auth"
)

type Handler struct {
	svc *app.Service
}

func NewHandler(svc *app.Service) *Handler {
	return &Handler{svc: svc}
}

// Register cadastra uma nova pessoa física global
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo da requisicao invalido"})
		return
	}
	if err := req.Validate(); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	user, err := h.svc.RegisterUser(r.Context(), app.RegisterCommand{
		Email:    req.Email,
		Password: req.Password,
		FullName: req.FullName,
		CPF:      req.CPF,
		Phone:    req.Phone,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"id":       user.ID,
		"email":    user.Email,
		"fullName": user.FullName,
	})
}

// Login valida credenciais globais e lista empresas acessíveis (Tenant Switcher)
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo da requisicao invalido"})
		return
	}
	if err := req.Validate(); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.svc.Authenticate(r.Context(), req.Email, req.Password, req.PreferredTenantID)
	if err != nil {
		respondError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// SwitchTenant altera o contexto de empresa ativa (Tenant Switcher)
func (h *Handler) SwitchTenant(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "usuario nao autenticado"})
		return
	}

	var req SwitchTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo da requisicao invalido"})
		return
	}
	targetTenantID, err := req.Validate()
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.svc.SwitchTenantContext(r.Context(), userID, targetTenantID)
	if err != nil {
		respondError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, result)
}

// GetMe retorna o perfil do usuário e as claims ativas no contexto
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "usuario nao autenticado"})
		return
	}

	memberships, err := h.svc.ListUserMemberships(r.Context(), claims.UserID)
	if err != nil {
		respondError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"userId":         claims.UserID,
		"email":          claims.Email,
		"fullName":       claims.FullName,
		"activeTenantId": claims.TenantID,
		"activeRoles":    claims.Roles,
		"permissions":    claims.Permissions,
		"complexIds":     claims.ComplexIDs,
		"memberships":    memberships,
	})
}

// GetMyMemberships lista todas as empresas às quais o usuário tem acesso
func (h *Handler) GetMyMemberships(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "usuario nao autenticado"})
		return
	}

	memberships, err := h.svc.ListUserMemberships(r.Context(), userID)
	if err != nil {
		respondError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"memberships": memberships})
}

// CreateTenant cadastra uma nova empresa/cinema no SaaS
func (h *Handler) CreateTenant(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "usuario nao autenticado"})
		return
	}

	var req CreateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo da requisicao invalido"})
		return
	}
	if err := req.Validate(); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	var parentUUID *uuid.UUID
	if req.ParentID != nil && *req.ParentID != "" {
		pID, err := uuid.Parse(*req.ParentID)
		if err == nil {
			parentUUID = &pID
		}
	}

	tenant, err := h.svc.CreateTenant(r.Context(), app.CreateTenantCommand{
		ParentID:              parentUUID,
		Name:                  req.Name,
		TradeName:             req.TradeName,
		CNPJ:                  req.CNPJ,
		StateRegistration:     req.StateRegistration,
		MunicipalRegistration: req.MunicipalRegistration,
		Timezone:              req.Timezone,
		AdminUserID:           userID,
	})
	if err != nil {
		respondError(w, err)
		return
	}

	respondJSON(w, http.StatusCreated, tenant)
}

// AddMember adiciona uma pessoa à empresa atual
func (h *Handler) AddMember(w http.ResponseWriter, r *http.Request) {
	tenantIDParam := chi.URLParam(r, "tenantID")
	targetTenantID, err := uuid.Parse(tenantIDParam)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "tenantID invalido na URL"})
		return
	}

	var req AddMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "corpo da requisicao invalido"})
		return
	}
	uID, complexUUIDs, err := req.Validate()
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	err = h.svc.AddTenantMember(r.Context(), targetTenantID, uID, req.Roles, req.Permissions, complexUUIDs)
	if err != nil {
		respondError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "membro adicionado com sucesso"})
}

func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, err error) {
	statusCode := http.StatusInternalServerError
	switch {
	case errors.Is(err, domain.ErrInvalidCredentials), errors.Is(err, domain.ErrUserInactive):
		statusCode = http.StatusUnauthorized
	case errors.Is(err, domain.ErrUserAlreadyExists), errors.Is(err, domain.ErrTenantAlreadyExists):
		statusCode = http.StatusConflict
	case errors.Is(err, domain.ErrUserNotFound), errors.Is(err, domain.ErrTenantNotFound), errors.Is(err, domain.ErrMembershipNotFound):
		statusCode = http.StatusNotFound
	case errors.Is(err, domain.ErrMembershipInactive), errors.Is(err, domain.ErrTenantInactive):
		statusCode = http.StatusForbidden
	case errors.Is(err, domain.ErrInvalidEmail), errors.Is(err, domain.ErrInvalidPassword), errors.Is(err, domain.ErrInvalidCNPJ):
		statusCode = http.StatusUnprocessableEntity
	}
	respondJSON(w, statusCode, map[string]string{"error": err.Error()})
}
