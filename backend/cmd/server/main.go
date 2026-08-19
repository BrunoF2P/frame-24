package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/redis/go-redis/v9"
	catalogApp "frame-24/internal/catalog/app"
	catalogHttp "frame-24/internal/catalog/http"
	catalogRepo "frame-24/internal/catalog/repo"
	identityApp "frame-24/internal/identity/app"
	identityHttp "frame-24/internal/identity/http"
	identityRepo "frame-24/internal/identity/repo"
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

	// 5. Inicializar Bounded Contexts (Identidade, Operações, Catálogo, Vendas)
	var identityHandler *identityHttp.Handler
	var operationsHandler *operationsHttp.Handler
	var catalogHandler *catalogHttp.Handler
	var salesHandler *salesHttp.Handler

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
		_, _ = w.Write([]byte(`{"app":"Frame-24 ERP","version":"2.3.0","arch":"Modular Monolith (Go)","phase":"Phase 3 - Sales, Concurrency & POS"}`))
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
