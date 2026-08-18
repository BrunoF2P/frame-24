# Frame-24 — Sistema de Gestão Integrada para Redes de Cinema (ERP)

> **ERP de alta performance para exibidores de cinema:** Bilheteria, Bomboniere (Concessões), PDV Touch, Fiscal Dual (NFC-e / NFS-e), Contabilidade Double-Entry, Gestão de Contratos com Distribuidoras e Compliance Ancine (SCB).

---

## 🏗️ Arquitetura do Sistema

O Frame-24 adota a arquitetura de **Monólito Modular em Go** com desacoplamento estrito de domínios em memória e persistência nativa isolada com PostgreSQL Row-Level Security (RLS).

```text
frame-24/
├── backend/                      # Backend em Go (Monólito Modular)
│   ├── cmd/server/main.go        # Ponto de entrada (HTTP Server + Outbox Engine)
│   ├── internal/                 # Bounded Contexts isolados (identity, catalog, operations, sales, etc.)
│   ├── migrations/               # Migrações SQL versionadas (golang-migrate)
│   └── sqlc.yaml                 # Geração de queries SQL tipadas
│
├── frontend/                     # Frontends Desacoplados
│   ├── backoffice/               # SPA Administrativa ERP + PDV Touch (Vite + React 19)
│   └── storefront/               # Catálogo público e checkout online com SEO (Next.js / Astro)
│
├── infra/                        # Infraestrutura Lean
│   └── docker-compose.dev.yml    # Postgres 16 + Redis 7 para desenvolvimento local
│
├── docs/                         # Documentação Oficial e Especificações Técnicas
│   ├── REARQUITETURA-PROPOSTA.md # Master Architecture RFC (v2.1.0)
│   └── ROADMAP.md                # Roadmap de Execução Fase a Fase
│
└── legacy/                       # Código legado arquivado (utilizado como spec de domínio)
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
* [Go 1.22+](https://golang.org/dl/)
* [Docker & Docker Compose](https://www.docker.com/)

### 1. Subir a Infraestrutura (PostgreSQL 16 + Redis 7)
```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

### 2. Configurar o Ambiente
```bash
cp .env.example .env
```

### 3. Rodar o Backend em Go
```bash
cd backend
go run ./cmd/server
```

A API estará respondendo em `http://localhost:8080`.

#### Endpoints de Verificação:
* `GET http://localhost:8080/healthz/live` $\rightarrow$ `{"status":"live"}`
* `GET http://localhost:8080/healthz/ready` $\rightarrow$ `{"status":"ready"}`
* `GET http://localhost:8080/api/v1/info` $\rightarrow$ `{"app":"Frame-24 ERP","version":"2.1.0","arch":"Modular Monolith (Go)"}`

---

## 📖 Documentação & Especificações

* [Master Architecture RFC (`docs/REARQUITETURA-PROPOSTA.md`)](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/REARQUITETURA-PROPOSTA.md) — Diretrizes arquiteturais completas, modelos SQL, invariantes e regras fiscais/regulatórias.
* [Roadmap de Execução (`docs/ROADMAP.md`)](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/ROADMAP.md) — Checklist detalhado fase a fase até a entrega final.
