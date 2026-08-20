package app

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	catalogApp "frame-24/internal/catalog/app"
	catalogHttp "frame-24/internal/catalog/http"
	catalogRepo "frame-24/internal/catalog/repo"
	financeApp "frame-24/internal/finance/app"
	financeHttp "frame-24/internal/finance/http"
	financeRepo "frame-24/internal/finance/repo"
	fiscalApp "frame-24/internal/fiscal/app"
	fiscalHttp "frame-24/internal/fiscal/http"
	fiscalRepo "frame-24/internal/fiscal/repo"
	identityApp "frame-24/internal/identity/app"
	identityHttp "frame-24/internal/identity/http"
	identityRepo "frame-24/internal/identity/repo"
	inventoryApp "frame-24/internal/inventory/app"
	inventoryHttp "frame-24/internal/inventory/http"
	inventoryRepo "frame-24/internal/inventory/repo"
	operationsApp "frame-24/internal/operations/app"
	operationsHttp "frame-24/internal/operations/http"
	operationsRepo "frame-24/internal/operations/repo"
	paymentsApp "frame-24/internal/payments/app"
	paymentsHttp "frame-24/internal/payments/http"
	paymentsRepo "frame-24/internal/payments/repo"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/config"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/money"
	"frame-24/internal/platform/outbox"
	"frame-24/internal/platform/seatlock"
	salesApp "frame-24/internal/sales/app"
	salesHttp "frame-24/internal/sales/http"
	salesRepo "frame-24/internal/sales/repo"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// App agrega o servidor HTTP montado e os recursos que precisam de cleanup.
type App struct {
	Server  *http.Server
	cleanup []func()
}

// Close libera os recursos na ordem inversa da criação.
func (a *App) Close() {
	for i := len(a.cleanup) - 1; i >= 0; i-- {
		a.cleanup[i]()
	}
}

// Build monta todo o grafo de dependências do monólito modular:
// banco, outbox, redis/seatlock, JWT, bounded contexts, subscribers e router.
func Build(ctx context.Context, cfg config.Config) (*App, error) {
	a := &App{}

	// 1. Pool de Banco de Dados
	dbCfg := db.Config{
		URL:         cfg.DatabaseURL,
		MaxConns:    cfg.DBMaxConns,
		MinConns:    cfg.DBMinConns,
		MaxConnIdle: cfg.DBMaxConnIdle,
		MaxConnLife: cfg.DBMaxConnLife,
	}
	pool, err := db.NewPool(ctx, dbCfg)
	if err != nil {
		if cfg.IsProduction {
			return nil, fmt.Errorf("banco de dados inacessivel em producao: %w", err)
		}
		slog.Warn("Banco de dados indisponivel na inicializacao (modo dev apenas)", "error", err)
	} else {
		a.cleanup = append(a.cleanup, pool.Close)
		slog.Info("Conexao com PostgreSQL estabelecida com sucesso")
	}

	// 2. Outbox Engine & EventBus
	eventBus := outbox.NewInProcessBus()
	if pool != nil {
		dispatcher := outbox.NewDispatcher(pool, eventBus, outbox.DefaultDispatcherConfig())
		go dispatcher.Start(ctx)
	}

	// 3. Redis para Concorrência e Lock de Assentos
	var redisClient *redis.Client
	if redisOpts, err := redis.ParseURL(cfg.RedisURL); err == nil {
		redisClient = redis.NewClient(redisOpts)
		if err := redisClient.Ping(ctx).Err(); err != nil {
			slog.Warn("Redis indisponivel na inicializacao (modo fallback/mock ativado)", "error", err)
			redisClient = nil
		} else {
			slog.Info("Conexao com Redis estabelecida com sucesso")
		}
	}
	if redisClient != nil {
		a.cleanup = append(a.cleanup, func() { _ = redisClient.Close() })
	}
	seatLockMgr := seatlock.NewManager(redisClient)
	wsSeatHub := salesHttp.NewSeatMapHub()
	go wsSeatHub.Run(ctx.Done())

	// 4. Auth Token Manager (JWT)
	tokenManager := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTExpiration)

	// 5. Bounded Contexts
	var identityHandler *identityHttp.Handler
	var operationsHandler *operationsHttp.Handler
	var catalogHandler *catalogHttp.Handler
	var salesHandler *salesHttp.Handler
	var inventoryHandler *inventoryHttp.Handler
	var financeHandler *financeHttp.Handler
	var paymentsHandler *paymentsHttp.Handler
	var fiscalHandler *fiscalHttp.Handler

	var catService *catalogApp.Service
	var invService *inventoryApp.Service
	var finService *financeApp.Service
	var fiscService *fiscalApp.Service

	if pool != nil {
		idRepo := identityRepo.NewPostgresRepository(pool)
		idService := identityApp.NewService(pool, idRepo, tokenManager)
		identityHandler = identityHttp.NewHandler(idService)

		catRepo := catalogRepo.NewPostgresRepository(pool)
		catService = catalogApp.NewService(pool, catRepo)
		catalogHandler = catalogHttp.NewHandler(catService)

		opsRepo := operationsRepo.NewPostgresRepository(pool)
		opsService := operationsApp.NewService(pool, opsRepo, catRepo)
		operationsHandler = operationsHttp.NewHandler(opsService)

		salesRepo := salesRepo.NewPostgresRepository(pool)
		salesService := salesApp.NewService(pool, salesRepo, seatLockMgr, opsService, catService, wsSeatHub)
		salesHandler = salesHttp.NewHandler(salesService, wsSeatHub)

		invRepo := inventoryRepo.NewPostgresRepository(pool)
		invService = inventoryApp.NewService(pool, invRepo)
		inventoryHandler = inventoryHttp.NewHandler(invService)

		finRepo := financeRepo.NewPostgresRepository(pool)
		finService = financeApp.NewService(pool, finRepo)
		financeHandler = financeHttp.NewHandler(finService)

		payRepo := paymentsRepo.NewPostgresRepository(pool)
		payService := paymentsApp.NewService(pool, payRepo, nil, nil)
		paymentsHandler = paymentsHttp.NewHandler(payService)

		fiscRepo := fiscalRepo.NewPostgresRepository(pool)
		fiscService = fiscalApp.NewService(pool, fiscRepo)
		fiscalHandler = fiscalHttp.NewHandler(fiscService)

		registerSaleCompletedSubscriber(eventBus, finService, invService, catService, fiscService)
		registerPaymentApprovedSubscriber(eventBus, finService)
	}

	// 6. Router HTTP
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	// Endpoints de Verificação e Healthcheck
	r.Get("/healthz/live", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"live"}`))
	})

	r.Get("/healthz/ready", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if pool != nil {
			if err := pool.Ping(r.Context()); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				_, _ = w.Write([]byte(`{"status":"unhealthy","db":"disconnected"}`))
				return
			}
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ready","db":"connected"}`))
	})

	r.Get("/api/v1/info", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"app":"Frame-24 ERP","version":"2.5.0","arch":"Modular Monolith (Go)","phase":"Phase 4 - Payments, TEF & Dual Fiscal"}`))
	})

	// Rotas dos Bounded Contexts
	if identityHandler != nil {
		identityHttp.MountRoutes(r, identityHandler, tokenManager)
	}
	if operationsHandler != nil {
		operationsHttp.MountRoutes(r, operationsHandler, tokenManager)
	}
	if catalogHandler != nil {
		catalogHttp.MountRoutes(r, catalogHandler, tokenManager)
	}
	if salesHandler != nil {
		salesHttp.MountRoutes(r, salesHandler, tokenManager)
	}
	if inventoryHandler != nil {
		inventoryHttp.RegisterRoutes(r, inventoryHandler, tokenManager)
	}
	if financeHandler != nil {
		financeHttp.RegisterRoutes(r, financeHandler, tokenManager)
	}
	if paymentsHandler != nil {
		paymentsHttp.RegisterRoutes(r, paymentsHandler, tokenManager)
	}
	if fiscalHandler != nil {
		fiscalHttp.RegisterRoutes(r, fiscalHandler, tokenManager)
	}

	a.Server = &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	return a, nil
}

// registerSaleCompletedSubscriber liga as automações assíncronas de uma venda concluída:
// estoque/CMV, caixa, ledger e emissão fiscal dual.
func registerSaleCompletedSubscriber(
	eventBus outbox.EventBus,
	finService *financeApp.Service,
	invService *inventoryApp.Service,
	catService *catalogApp.Service,
	fiscService *fiscalApp.Service,
) {
	eventBus.Subscribe("sales.sale.completed", func(ctx context.Context, event outbox.Event) error {
		var payload struct {
			SaleID             uuid.UUID   `json:"saleId"`
			ComplexID          uuid.UUID   `json:"complexId"`
			POSTerminalID      *string     `json:"posTerminalId"`
			OperatorID         *uuid.UUID  `json:"operatorId"`
			TotalAmount        money.Cents `json:"totalAmount"`
			SubtotalTickets    money.Cents `json:"subtotalTickets"`
			SubtotalConcession money.Cents `json:"subtotalConcession"`
			DiscountAmount     money.Cents `json:"discountAmount"`
			Payments           []struct {
				PaymentMethod string      `json:"paymentMethod"`
				Amount        money.Cents `json:"amount"`
			} `json:"payments"`
			Items []struct {
				ItemID     uuid.UUID   `json:"itemId"`
				ItemType   string      `json:"itemType"`
				ProductID  *uuid.UUID  `json:"productId"`
				ComboID    *uuid.UUID  `json:"comboId"`
				UnitID     uuid.UUID   `json:"unitId"`
				Quantity   float64     `json:"quantity"`
				UnitPrice  money.Cents `json:"unitPrice"`
				TotalPrice money.Cents `json:"totalPrice"`
			} `json:"items"`
			Tickets []struct {
				TicketID   uuid.UUID   `json:"ticketId"`
				ShowtimeID uuid.UUID   `json:"showtimeId"`
				SeatID     uuid.UUID   `json:"seatId"`
				TicketType string      `json:"ticketType"`
				Price      money.Cents `json:"price"`
			} `json:"tickets"`
		}

		if err := json.Unmarshal(event.Payload, &payload); err != nil {
			slog.Error("falha ao desserializar payload de sales.sale.completed", "error", err)
			return err
		}

		// 1. Decomposição de Combos e Agregação de Quantidades por Produto para Baixa de Estoque e CMV
		type stockKey struct {
			ProductID uuid.UUID
			UnitID    uuid.UUID
		}
		stockAggregation := make(map[stockKey]float64)
		var concessionCMVItems []financeApp.SaleConcessionItemPayload
		var fiscalConcessionItems []fiscalApp.SaleConcessionInput

		for _, item := range payload.Items {
			if item.ProductID != nil && item.Quantity > 0 {
				// Produto avulso
				key := stockKey{ProductID: *item.ProductID, UnitID: item.UnitID}
				stockAggregation[key] += item.Quantity

				unitCost := money.Subcent(0)
				description := "Item de Bomboniere"
				var ncm, cest *string
				if catService != nil {
					prod, err := catService.GetProductByID(ctx, event.TenantID, *item.ProductID)
					if err == nil && prod != nil {
						unitCost = prod.CostPrice
						description = prod.Name
						ncm = prod.NCM
						cest = prod.CEST
					}
				}
				concessionCMVItems = append(concessionCMVItems, financeApp.SaleConcessionItemPayload{
					ProductID: item.ProductID,
					Quantity:  item.Quantity,
					UnitCost:  unitCost,
				})
				fiscalConcessionItems = append(fiscalConcessionItems, fiscalApp.SaleConcessionInput{
					ItemID:      item.ItemID,
					ItemType:    item.ItemType,
					Description: description,
					NCM:         ncm,
					CEST:        cest,
					UnitPrice:   item.UnitPrice,
					Quantity:    item.Quantity,
				})
			} else if item.ComboID != nil && item.Quantity > 0 {
				// Decomposição de Combo em Insumos de Estoque e CMV
				comboDesc := "Combo Bomboniere"
				var comboNCM, comboCEST *string
				if catService != nil {
					combo, err := catService.GetComboByID(ctx, event.TenantID, *item.ComboID)
					if err == nil && combo != nil {
						comboDesc = combo.Name
						// Buscar NCM/CEST do produto-pai do combo no catálogo fiscal
						parentProd, errParent := catService.GetProductByID(ctx, event.TenantID, combo.ProductID)
						if errParent == nil && parentProd != nil {
							comboNCM = parentProd.NCM
							comboCEST = parentProd.CEST
						}

						for _, ci := range combo.Items {
							expandedQty := item.Quantity * ci.Quantity
							key := stockKey{ProductID: ci.ProductID, UnitID: ci.UnitID}
							stockAggregation[key] += expandedQty

							unitCost := money.Subcent(0)
							prod, errP := catService.GetProductByID(ctx, event.TenantID, ci.ProductID)
							if errP == nil && prod != nil {
								unitCost = prod.CostPrice
							}
							concessionCMVItems = append(concessionCMVItems, financeApp.SaleConcessionItemPayload{
								ProductID: &ci.ProductID,
								Quantity:  expandedQty,
								UnitCost:  unitCost,
							})
						}
					}
				}
				fiscalConcessionItems = append(fiscalConcessionItems, fiscalApp.SaleConcessionInput{
					ItemID:      item.ItemID,
					ItemType:    "combo",
					Description: comboDesc,
					NCM:         comboNCM,
					CEST:        comboCEST,
					UnitPrice:   item.UnitPrice,
					Quantity:    item.Quantity,
				})
			}
		}

		// 2. Baixa de estoque consolidada (1 chamada agregada por produto/unidade, prevenindo colisão de dedup)
		for key, totalQty := range stockAggregation {
			if err := invService.DeductSaleItem(ctx, event.TenantID, payload.ComplexID, key.ProductID, key.UnitID, totalQty, payload.SaleID); err != nil {
				slog.Warn("aviso: baixa de estoque falhou para item de venda", "saleId", payload.SaleID, "productId", key.ProductID, "error", err)
			}
		}

		// 3. Registro de vendas em dinheiro físico na sessão aberta de caixa do PDV
		var cashAmount money.Cents
		paymentsMap := make(map[string]money.Cents)
		for _, pm := range payload.Payments {
			paymentsMap[pm.PaymentMethod] += pm.Amount
			if pm.PaymentMethod == "cash" {
				cashAmount += pm.Amount
			}
		}

		if cashAmount > 0 && payload.POSTerminalID != nil && payload.OperatorID != nil {
			openSession, err := finService.GetOpenCashSession(ctx, event.TenantID, payload.ComplexID, *payload.POSTerminalID, *payload.OperatorID)
			if err == nil && openSession != nil {
				if err := finService.RecordCashSale(ctx, event.TenantID, openSession.ID, payload.SaleID, cashAmount); err != nil {
					slog.Warn("aviso: falha ao registrar venda em dinheiro na sessao de caixa", "sessionId", openSession.ID, "error", err)
				}
			}
		}

		// 4. Reconhecimento Contábil no Livro-Razão (Partidas Dobradas + CMV consolidado)
		if err := finService.ProcessSaleCompletedEvent(
			ctx, event.TenantID, payload.SaleID,
			payload.SubtotalTickets, payload.SubtotalConcession,
			payload.DiscountAmount, payload.TotalAmount,
			paymentsMap, concessionCMVItems,
		); err != nil {
			slog.Error("falha ao processar lancamento contabil da venda", "saleId", payload.SaleID, "error", err)
			return err
		}

		// 5. Emissão Fiscal Dual (NFS-e para Ingressos + NFC-e para Bomboniere) com Reforma Tributária
		var fiscalTickets []fiscalApp.SaleTicketInput
		for _, tk := range payload.Tickets {
			fiscalTickets = append(fiscalTickets, fiscalApp.SaleTicketInput{
				TicketID:    tk.TicketID,
				Description: fmt.Sprintf("Ingresso Cinematografico (%s)", tk.TicketType),
				UnitPrice:   tk.Price,
				Quantity:    1,
			})
		}

		if fiscService != nil && (len(fiscalTickets) > 0 || len(fiscalConcessionItems) > 0) {
			if _, err := fiscService.ProcessSaleCompleted(ctx, event.TenantID, payload.ComplexID, payload.SaleID, fiscalTickets, fiscalConcessionItems); err != nil {
				slog.Error("falha ao emitir documentos fiscais da venda", "saleId", payload.SaleID, "error", err)
				return err
			}
		}

		return nil
	})
}

// registerPaymentApprovedSubscriber liquida o recebível no Ledger quando o gateway confirma o pagamento.
func registerPaymentApprovedSubscriber(eventBus outbox.EventBus, finService *financeApp.Service) {
	eventBus.Subscribe("payments.payment.approved", func(ctx context.Context, event outbox.Event) error {
		var payload struct {
			PaymentAttemptID uuid.UUID   `json:"paymentAttemptId"`
			SaleID           *uuid.UUID  `json:"saleId"`
			Amount           money.Cents `json:"amount"`
			PaymentMethod    string      `json:"paymentMethod"`
		}
		if err := json.Unmarshal(event.Payload, &payload); err != nil {
			slog.Error("falha ao desserializar payload de payments.payment.approved", "error", err)
			return err
		}
		if payload.SaleID == nil {
			slog.Warn("payments.payment.approved sem saleId — nenhuma acao de reconciliacao", "attemptId", payload.PaymentAttemptID)
			return nil
		}
		if finService != nil {
			if err := finService.RecordOnlinePaymentReceipt(ctx, event.TenantID, *payload.SaleID, payload.PaymentAttemptID, payload.Amount, payload.PaymentMethod); err != nil {
				slog.Error("falha ao registrar recebimento de pagamento online no ledger",
					"saleId", payload.SaleID, "attemptId", payload.PaymentAttemptID, "error", err)
				return err
			}
		}
		slog.Info("pagamento online reconciliado com a venda",
			"saleId", payload.SaleID, "attemptId", payload.PaymentAttemptID,
			"method", payload.PaymentMethod, "amount", payload.Amount)
		return nil
	})
}
