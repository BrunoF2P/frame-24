package http

import (
	"frame-24/internal/platform/auth"
	"github.com/go-chi/chi/v5"
)

func RegisterRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	r.Route("/api/v1/finance", func(r chi.Router) {
		r.Use(auth.Middleware(tm))

		// Plano de Contas e Ledger (Leitura aberta a operadores; Escrita restrita a Gerente/Admin/Contador)
		r.Get("/accounts", h.ListAccounts)
		r.Get("/ledger/transactions", h.ListTransactions)
		r.With(auth.RequireRole("manager", "admin", "accountant")).Post("/accounts", h.CreateAccount)
		r.With(auth.RequireRole("manager", "admin", "accountant")).Post("/ledger/transactions", h.PostTransaction)

		// Módulo de Caixa de PDV
		r.Post("/cash-sessions/open", h.OpenCashSession)
		r.Get("/cash-sessions/current", h.GetCurrentSession)
		r.Post("/cash-sessions/{sessionId}/close-blind", h.CloseBlind)

		// Sangrias e Suprimentos (Exigem perfil gerencial / supervisor)
		r.With(auth.RequireRole("manager", "admin", "supervisor")).Post("/cash-sessions/{sessionId}/bleed", h.RecordBleed)
		r.With(auth.RequireRole("manager", "admin", "supervisor")).Post("/cash-sessions/{sessionId}/supply", h.RecordSupply)
	})
}
