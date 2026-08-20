package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"frame-24/internal/app"
	"frame-24/internal/platform/config"
)

func main() {
	// Logger estruturado JSON
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("configuracao invalida", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	appInstance, err := app.Build(ctx, cfg)
	if err != nil {
		slog.Error("falha ao inicializar aplicacao", "error", err)
		os.Exit(1)
	}
	defer appInstance.Close()

	go func() {
		slog.Info("Servidor Frame-24 ouvindo requisicoes", "porta", cfg.Port)
		if err := appInstance.Server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Erro fatal no servidor HTTP", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Sinal de encerramento recebido, finalizando servidor...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := appInstance.Server.Shutdown(shutdownCtx); err != nil {
		slog.Error("Erro no graceful shutdown", "error", err)
	}

	slog.Info("Servidor Frame-24 encerrado com sucesso.")
}
