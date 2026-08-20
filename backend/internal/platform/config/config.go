package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config concentra toda a configuração carregada do ambiente, com validação
// estrita em produção para evitar arranques com valores padrão inseguros.
type Config struct {
	AppEnv        string
	IsProduction  bool
	Port          string
	DatabaseURL   string
	JWTSecret     string
	RedisURL      string
	DBMaxConns    int32
	DBMinConns    int32
	DBMaxConnIdle time.Duration
	DBMaxConnLife time.Duration
	JWTExpiration time.Duration
}

// Load lê as variáveis de ambiente e valida os valores críticos.
// Em produção, DATABASE_URL e JWT_SECRET são obrigatórias.
func Load() (Config, error) {
	cfg := Config{
		AppEnv:        getEnv("APP_ENV", "development"),
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379/0"),
		DBMaxConns:    int32(getEnvInt("DB_MAX_CONNS", 25)),
		DBMinConns:    int32(getEnvInt("DB_MIN_CONNS", 5)),
		DBMaxConnIdle: time.Duration(getEnvInt("DB_MAX_CONN_IDLE_MINUTES", 5)) * time.Minute,
		DBMaxConnLife: time.Duration(getEnvInt("DB_MAX_CONN_LIFE_MINUTES", 60)) * time.Minute,
		JWTExpiration: time.Duration(getEnvInt("JWT_EXPIRATION_HOURS", 24)) * time.Hour,
	}
	cfg.IsProduction = strings.ToLower(strings.TrimSpace(cfg.AppEnv)) == "production"

	if cfg.Port == "" {
		return Config{}, fmt.Errorf("PORT nao pode ser vazia")
	}

	if cfg.IsProduction {
		if cfg.DatabaseURL == "" {
			return Config{}, fmt.Errorf("DATABASE_URL e obrigatoria em producao")
		}
		if cfg.JWTSecret == "" {
			return Config{}, fmt.Errorf("JWT_SECRET e obrigatoria em producao")
		}
	}
	if len(cfg.JWTSecret) > 0 && len(cfg.JWTSecret) < 32 {
		return Config{}, fmt.Errorf("JWT_SECRET deve ter pelo menos 32 caracteres")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
