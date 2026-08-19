package http

import (
	"github.com/go-chi/chi/v5"
	"frame-24/internal/platform/auth"
)

func MountRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	r.Route("/api/v1/sales", func(r chi.Router) {
		// Rotas autenticadas do Bounded Context Sales
		r.Use(auth.Middleware(tm))

		// Concorrência e Reserva de Assentos
		r.Post("/seats/lock", h.LockSeats)
		r.Post("/seats/heartbeat", h.RenewHeartbeat)
		r.Post("/seats/release", h.ReleaseSeats)
		r.Get("/seats/{showtimeId}", h.GetShowtimeSeatMap)
		r.Get("/seats/{showtimeId}/ws", h.StreamSeatMap)

		// Vendas e Checkout
		r.Post("/checkout", h.CheckoutSale)
		r.Get("/{id}", h.GetSaleByID)
	})
}
