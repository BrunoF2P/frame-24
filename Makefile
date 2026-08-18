ROOT_DIR := $(dir $(realpath $(lastword $(MAKEFILE_LIST))))
BACKEND_DIR := $(ROOT_DIR)backend
FRONTEND_BACKOFFICE_DIR := $(ROOT_DIR)frontend/backoffice
FRONTEND_STOREFRONT_DIR := $(ROOT_DIR)frontend/storefront
INFRA_DIR := $(ROOT_DIR)infra
MIGRATE_DIR := $(BACKEND_DIR)/migrations
DB_URL ?= postgres://postgres:password@localhost:5432/frame24?sslmode=disable

.PHONY: help dev dev-infra dev-backend dev-stop \
        migrate migrate-down migrate-create \
        sqlc lint test test-race build clean

# ────────────────────────────────────────────
# 📖 Ajuda
# ────────────────────────────────────────────
help: ## Exibe esta ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ────────────────────────────────────────────
# 🚀 Desenvolvimento
# ────────────────────────────────────────────
dev: dev-infra ## Sobe toda a infra e roda o backend em modo watch
	@echo ">> Backend rodando em http://localhost:8080"
	cd $(BACKEND_DIR) && go run ./cmd/server

dev-infra: ## Sobe PostgreSQL 16 + Redis 7 via Docker Compose
	docker compose -f $(INFRA_DIR)/docker-compose.dev.yml up -d
	@echo ">> Aguardando Postgres ficar saudavel..."
	@until docker exec frame24-postgres-dev pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	@echo ">> Infra pronta: Postgres :5432 | Redis :6379"

dev-stop: ## Para e remove os containers de infra
	docker compose -f $(INFRA_DIR)/docker-compose.dev.yml down

# ────────────────────────────────────────────
# 🗄️  Migrações SQL
# ────────────────────────────────────────────
migrate: ## Roda todas as migrações pendentes (UP)
	@which migrate > /dev/null 2>&1 || (echo "ERRO: golang-migrate nao instalado. Rode: go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest" && exit 1)
	migrate -path $(MIGRATE_DIR) -database "$(DB_URL)" up

migrate-down: ## Reverte a última migração (DOWN)
	migrate -path $(MIGRATE_DIR) -database "$(DB_URL)" down 1

migrate-create: ## Cria novos arquivos de migração (uso: make migrate-create NAME=nome_da_migracao)
	@test -n "$(NAME)" || (echo "ERRO: informe o nome: make migrate-create NAME=nome_da_migracao" && exit 1)
	migrate create -ext sql -dir $(MIGRATE_DIR) -seq $(NAME)

# ────────────────────────────────────────────
# ⚙️  Geração de Código
# ────────────────────────────────────────────
sqlc: ## Gera queries Go tipadas a partir do SQL (sqlc generate)
	@which sqlc > /dev/null 2>&1 || (echo "ERRO: sqlc nao instalado. Rode: go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest" && exit 1)
	cd $(BACKEND_DIR) && sqlc generate

# ────────────────────────────────────────────
# 🔍 Qualidade de Código
# ────────────────────────────────────────────
lint: ## Roda o golangci-lint no backend
	@which golangci-lint > /dev/null 2>&1 || (echo "ERRO: golangci-lint nao instalado. Veja: https://golangci-lint.run/usage/install/" && exit 1)
	cd $(BACKEND_DIR) && golangci-lint run ./...

# ────────────────────────────────────────────
# 🧪 Testes
# ────────────────────────────────────────────
test: ## Roda todos os testes do backend
	cd $(BACKEND_DIR) && go test ./... -v -count=1

test-race: ## Roda testes com detector de corrida de dados (-race)
	cd $(BACKEND_DIR) && go test ./... -v -race -count=1 -coverprofile=coverage.txt
	cd $(BACKEND_DIR) && go tool cover -func=coverage.txt

# ────────────────────────────────────────────
# 🏗️  Build
# ────────────────────────────────────────────
build: ## Compila o binário de produção do servidor
	cd $(BACKEND_DIR) && go build -buildvcs=false -ldflags="-s -w" -o bin/server ./cmd/server
	@echo ">> Binário gerado em backend/bin/server"

clean: ## Remove binários e arquivos temporários
	rm -rf $(BACKEND_DIR)/bin
	rm -f $(BACKEND_DIR)/coverage.txt
