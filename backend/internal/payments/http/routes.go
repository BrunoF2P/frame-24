package http

import (
	"frame-24/internal/platform/auth"
	"github.com/go-chi/chi/v5"
)

func RegisterRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	r.Route("/api/v1/payments", func(r chi.Router) {
		// Webhook aberto (autenticação por assinatura / token de parceiro)
		r.Post("/webhooks/{provider}", h.ProcessWebhook)

		// Rotas autenticadas do PDV e Storefront
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware(tm))

			r.Post("/pix", h.CreatePix)
			r.Post("/tef/initiate", h.InitiateTef)
			r.Post("/tef/confirm", h.ConfirmTef)
			r.Post("/tef/reverse", h.ReverseTef)
		})
	})
}
