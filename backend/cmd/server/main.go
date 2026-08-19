package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	catalogApp "frame-24/internal/catalog/app"
	catalogHttp "frame-24/internal/catalog/http"
	catalogRepo "frame-24/internal/catalog/repo"
	financeApp "frame-24/internal/finance/app"
	financeHttp "frame-24/internal/finance/http"
	financeRepo "frame-24/internal/finance/repo"
	identityApp "frame-24/internal/identity/app"
	identityHttp "frame-24/internal/identity/http"
	identityRepo "frame-24/internal/identity/repo"
	inventoryApp "frame-24/internal/inventory/app"
	inventoryHttp "frame-24/internal/inventory/http"
	inventoryRepo "frame-24/internal/inventory/repo"
	operationsApp "frame-24/internal/operations/app"
	operationsHttp "frame-24/internal/operations/http"
	operationsRepo "frame-24/internal/operations/repo"
	salesApp "frame-24/internal/sales/app"
	salesHttp "frame-24/internal/sales/http"
	salesRepo "frame-24/internal/sales/repo"
	"frame-24/internal/platform/auth"
	"frame-24/internal/platform/db"
	"frame-24/internal/platform/outbox"
	"frame-24/internal/platform/seatlock"
)

func main() {
	// Logger estruturado JSON
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://frame24_app:changeme_in_production@localhost:5432/frame24?sslmode=disable"
		slog.Warn("DATABASE_URL nao definida, usando valor padrao de desenvolvimento")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default-dev-secret-key-change-in-production-min-32-chars"
		slog.Warn("JWT_SECRET nao definida — usando valor padrao. NAO use em producao!")
	}

	appEnv := os.Getenv("APP_ENV")
	isProd := appEnv == "production"

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 1. Inicializar Pool de Banco de Dados
	poolCfg := db.DefaultConfig(dbURL)
	pool, err := db.NewPool(ctx, poolCfg)
	if err != nil {
		if isProd {
			slog.Error("Banco de dados inacessivel em producao — encerrando servidor", "error", err)
			os.Exit(1)
		}
		slog.Warn("Banco de dados indisponivel na inicializacao (modo dev apenas)", "error", err)
	} else {
		defer pool.Close()
		slog.Info("Conexao com PostgreSQL estabelecida com sucesso")
	}

	// 2. Inicializar Outbox Engine & EventBus
	eventBus := outbox.NewInProcessBus()
	if pool != nil {
		dispatcher := outbox.NewDispatcher(pool, eventBus, outbox.DefaultDispatcherConfig())
		go dispatcher.Start(ctx)
	}

	// 3. Inicializar Conexão com Redis para Concorrência e Lock de Assentos
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}
	redisOpts, err := redis.ParseURL(redisURL)
	var redisClient *redis.Client
	if err == nil {
		redisClient = redis.NewClient(redisOpts)
		if err := redisClient.Ping(ctx).Err(); err != nil {
			slog.Warn("Redis indisponivel na inicializacao (modo fallback/mock ativado)", "error", err)
			redisClient = nil
		} else {
			slog.Info("Conexao com Redis estabelecida com sucesso")
		}
	}
	seatLockMgr := seatlock.NewManager(redisClient)
	wsSeatHub := salesHttp.NewSeatMapHub()
	go wsSeatHub.Run(ctx.Done())

	// 4. Inicializar Auth Token Manager (JWT)
	tokenManager := auth.NewTokenManager(jwtSecret, 24*time.Hour)

	// 5. Inicializar Bounded Contexts (Identidade, Operações, Catálogo, Vendas, Estoque, Financeiro)
	var identityHandler *identityHttp.Handler
	var operationsHandler *operationsHttp.Handler
	var catalogHandler *catalogHttp.Handler
	var salesHandler *salesHttp.Handler
	var inventoryHandler *inventoryHttp.Handler
	var financeHandler *financeHttp.Handler

	if pool != nil {
		idRepo := identityRepo.NewPostgresRepository(pool)
		idService := identityApp.NewService(pool, idRepo, tokenManager)
		identityHandler = identityHttp.NewHandler(idService)

		catRepo := catalogRepo.NewPostgresRepository(pool)
		catService := catalogApp.NewService(pool, catRepo)
		catalogHandler = catalogHttp.NewHandler(catService)

		opsRepo := operationsRepo.NewPostgresRepository(pool)
		opsService := operationsApp.NewService(pool, opsRepo, catRepo)
		operationsHandler = operationsHttp.NewHandler(opsService)

		salesRepo := salesRepo.NewPostgresRepository(pool)
		salesService := salesApp.NewService(pool, salesRepo, seatLockMgr, opsService, catService, wsSeatHub)
		salesHandler = salesHttp.NewHandler(salesService, wsSeatHub)

		invRepo := inventoryRepo.NewPostgresRepository(pool)
		invService := inventoryApp.NewService(pool, invRepo)
		inventoryHandler = inventoryHttp.NewHandler(invService)

		finRepo := financeRepo.NewPostgresRepository(pool)
		finService := financeApp.NewService(pool, finRepo)
		financeHandler = financeHttp.NewHandler(finService)

		// Registrar automações assíncronas do EventBus para o evento sales.sale.completed
		eventBus.Subscribe("sales.sale.completed", func(ctx context.Context, event outbox.Event) error {
			var payload struct {
				SaleID             uuid.UUID  `json:"saleId"`
				ComplexID          uuid.UUID  `json:"complexId"`
				POSTerminalID      *string    `json:"posTerminalId"`
				OperatorID         *uuid.UUID `json:"operatorId"`
				TotalAmount        float64    `json:"totalAmount"`
				SubtotalTickets    float64    `json:"subtotalTickets"`
				SubtotalConcession float64    `json:"subtotalConcession"`
				DiscountAmount     float64    `json:"discountAmount"`
				Payments           []struct {
					PaymentMethod string  `json:"paymentMethod"`
					Amount        float64 `json:"amount"`
				} `json:"payments"`
				Items []struct {
					ItemID     uuid.UUID  `json:"itemId"`
					ItemType   string     `json:"itemType"`
					ProductID  *uuid.UUID `json:"productId"`
					ComboID    *uuid.UUID `json:"comboId"`
					UnitID     uuid.UUID  `json:"unitId"`
					Quantity   float64    `json:"quantity"`
					UnitPrice  float64    `json:"unitPrice"`
					TotalPrice float64    `json:"totalPrice"`
				} `json:"items"`
			}

			if err := json.Unmarshal(event.Payload, &payload); err != nil {
				slog.Error("falha ao desserializar payload de sales.sale.completed", "error", err)
				return err
			}

			// 1. Baixa automática de Estoque para itens de bomboniere
			for _, item := range payload.Items {
				if item.ProductID != nil && item.Quantity > 0 {
					if err := invService.DeductSaleItem(ctx, event.TenantID, payload.ComplexID, *item.ProductID, item.UnitID, item.Quantity, payload.SaleID); err != nil {
						slog.Warn("aviso: baixa de estoque falhou para item de venda", "saleId", payload.SaleID, "productId", item.ProductID, "error", err)
					}
				}
			}

			// 2. Registro de vendas em dinheiro físico na sessão aberta de caixa do PDV
			var cashAmount float64
			paymentsMap := make(map[string]float64)
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

			// 3. Reconhecimento Contábil no Livro-Razão (Partidas Dobradas + CMV)
			var concessionItems []financeApp.SaleConcessionItemPayload
			for _, it := range payload.Items {
				if it.ProductID != nil {
					unitCost := 0.0
					if catService != nil {
						prod, err := catService.GetProductByID(ctx, event.TenantID, *it.ProductID)
						if err == nil && prod != nil {
							unitCost = prod.CostPrice
						}
					}
					concessionItems = append(concessionItems, financeApp.SaleConcessionItemPayload{
						ProductID: it.ProductID,
						Quantity:  it.Quantity,
						UnitCost:  unitCost,
					})
				}
			}

			if err := finService.ProcessSaleCompletedEvent(
				ctx, event.TenantID, payload.SaleID,
				payload.SubtotalTickets, payload.SubtotalConcession,
				payload.DiscountAmount, payload.TotalAmount,
				paymentsMap, concessionItems,
			); err != nil {
				slog.Error("falha ao processar lancamento contabil da venda", "saleId", payload.SaleID, "error", err)
				return err
			}

			return nil
		})
	}

	// 6. Configurar Roteador HTTP com Chi
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
		_, _ = w.Write([]byte(`{"app":"Frame-24 ERP","version":"2.4.0","arch":"Modular Monolith (Go)","phase":"Phase 5 - Finance, Blind Close & Inventory"}`))
	})

	// Montar rotas dos Bounded Contexts
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

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("Servidor Frame-24 ouvindo requisicoes", "porta", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Erro fatal no servidor HTTP", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Sinal de encerramento recebido, finalizando servidor...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Erro no graceful shutdown", "error", err)
	}

	slog.Info("Servidor Frame-24 encerrado com sucesso.")
}
