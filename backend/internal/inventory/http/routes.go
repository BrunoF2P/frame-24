package http

import (
	"github.com/go-chi/chi/v5"
	"frame-24/internal/platform/auth"
)

func RegisterRoutes(r chi.Router, h *Handler, tm *auth.TokenManager) {
	r.Route("/api/v1/inventory", func(r chi.Router) {
		r.Use(auth.Middleware(tm))

		// Almoxarifados
		r.Post("/warehouses", h.CreateWarehouse)
		r.Get("/warehouses", h.ListWarehouses)

		// Saldos e Movimentações
		r.Get("/warehouses/{warehouseId}/stock", h.GetStockLevels)
		r.Get("/warehouses/{warehouseId}/movements", h.ListMovements)
		r.Post("/purchases", h.RecordPurchase)
		r.Post("/discards", h.RecordDiscard)
		r.Post("/adjustments", h.AuditAdjustment)
	})
}
