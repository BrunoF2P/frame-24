package main

import (
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	dir := flag.String("dir", "./migrations", "Diretorio com os arquivos SQL de migracao")
	flag.Parse()

	args := flag.Args()
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "Uso: migrate [up|down|version|drop] [--dir=<caminho>]")
		os.Exit(1)
	}

	command := args[0]

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		slog.Error("DATABASE_URL nao definida")
		os.Exit(1)
	}

	sourceURL := fmt.Sprintf("file://%s", *dir)
	m, err := migrate.New(sourceURL, dbURL)
	if err != nil {
		slog.Error("Falha ao inicializar migrate", "error", err)
		os.Exit(1)
	}
	defer func() {
		srcErr, dbErr := m.Close()
		if srcErr != nil {
			slog.Warn("Erro ao fechar source de migration", "error", srcErr)
		}
		if dbErr != nil {
			slog.Warn("Erro ao fechar conexao do migrate", "error", dbErr)
		}
	}()

	switch command {
	case "up":
		if err := m.Up(); err != nil {
			if errors.Is(err, migrate.ErrNoChange) {
				slog.Info("Nenhuma migration pendente (banco ja esta na versao mais recente)")
				return
			}
			slog.Error("Falha ao aplicar migrations UP", "error", err)
			os.Exit(1)
		}
		slog.Info("Migrations aplicadas com sucesso (UP)")

	case "down":
		steps := 1
		if len(args) > 1 {
			fmt.Sscanf(args[1], "%d", &steps)
		}
		if err := m.Steps(-steps); err != nil {
			if errors.Is(err, migrate.ErrNoChange) {
				slog.Info("Nenhuma migration para reverter")
				return
			}
			slog.Error("Falha ao reverter migration DOWN", "error", err)
			os.Exit(1)
		}
		slog.Info("Migration revertida com sucesso (DOWN)", "steps", steps)

	case "version":
		version, dirty, err := m.Version()
		if err != nil {
			if errors.Is(err, migrate.ErrNilVersion) {
				slog.Info("Nenhuma migration aplicada ainda (versao 0)")
				return
			}
			slog.Error("Falha ao obter versao do banco", "error", err)
			os.Exit(1)
		}
		slog.Info("Versao atual do banco", "version", version, "dirty", dirty)

	case "drop":
		slog.Warn("ATENCAO: drop vai apagar TODAS as tabelas e dados do banco!")
		if err := m.Drop(); err != nil {
			slog.Error("Falha no drop", "error", err)
			os.Exit(1)
		}
		slog.Info("Drop executado com sucesso")

	default:
		slog.Error("Comando desconhecido", "comando", command, "opcoes", "up|down|version|drop")
		os.Exit(1)
	}
}
