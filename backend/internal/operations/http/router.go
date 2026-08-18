package http

import (
	"github.com/go-chi/chi/v5"
	"frame-24/internal/platform/auth"
)

// MountRoutes registra as rotas do Bounded Context de Operações
func MountRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	r.Route("/api/v1/operations", func(r chi.Router) {
		r.Use(auth.Middleware(tm))

		// Complexos Físicos
		r.Post("/complexes", h.CreateComplex)
		r.Get("/complexes", h.ListComplexes)
		r.Get("/complexes/{complexID}/rooms", h.ListRooms)
		r.Get("/complexes/{complexID}/showtimes", h.ListShowtimes)

		// Salas & Assentos
		r.Post("/rooms", h.CreateRoom)
		r.Get("/rooms/{roomID}/seats", h.GetRoomSeats)

		// Sessões
		r.Post("/showtimes", h.ScheduleShowtime)
	})
}
