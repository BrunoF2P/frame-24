package http

import (
	"github.com/go-chi/chi/v5"
	"frame-24/internal/platform/auth"
)

// MountRoutes registra as rotas do Bounded Context de Catálogo
func MountRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	r.Route("/api/v1/catalog", func(r chi.Router) {
		r.Use(auth.Middleware(tm))

		// Filmes
		r.Post("/movies", h.CreateMovie)
		r.Get("/movies", h.ListMovies)

		// Unidades de Medida
		r.Post("/units", h.CreateUnit)
		r.Get("/units", h.ListUnits)

		// Produtos & Barcodes
		r.Post("/products", h.CreateProduct)
		r.Get("/products", h.ListProducts)
		r.Post("/products/barcodes", h.AddBarcode)
		r.Get("/products/barcodes/{barcode}", h.GetProductByBarcode)

		// Combos
		r.Post("/combos", h.CreateCombo)
		r.Get("/combos", h.ListCombos)
	})
}
