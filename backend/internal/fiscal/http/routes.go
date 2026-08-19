package http

import (
	"github.com/go-chi/chi/v5"
	"frame-24/internal/platform/auth"
)

func RegisterRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	r.Route("/api/v1/fiscal", func(r chi.Router) {
		r.Use(auth.Middleware(tm))

		// Configuração de Perfil Fiscal (restrito a Gerente/Admin/Contador)
		r.With(auth.RequireRole("manager", "admin", "accountant")).Post("/profiles", h.ConfigureProfile)

		// Cancelamento Fiscal de Vendas (restrito a Gerente/Admin/Supervisor)
		r.With(auth.RequireRole("manager", "admin", "supervisor")).Post("/sales/{saleId}/cancel", h.CancelSaleFiscal)
	})
}
