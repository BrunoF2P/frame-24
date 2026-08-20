package http

import (
	"frame-24/internal/platform/auth"
	"github.com/go-chi/chi/v5"
)

// MountRoutes registra as rotas de identidade no roteador Chi
func MountRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	// Rotas públicas (sem token)
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/register", h.Register)
		r.Post("/login", h.Login)

		// Rotas autenticadas
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware(tm))
			r.Post("/switch-tenant", h.SwitchTenant)
			r.Get("/me", h.GetMe)
			r.Get("/memberships", h.GetMyMemberships)
		})
	})

	// Rotas de gestão de tenants
	r.Route("/api/v1/tenants", func(r chi.Router) {
		r.Use(auth.Middleware(tm))
		r.Post("/", h.CreateTenant) // Cadastrar novo cinema/filial
		r.Post("/{tenantID}/members", h.AddMember)
	})
}
