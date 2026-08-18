# Frame-24 — Roadmap Executivo de Implementação Greenfield

> **Guia Passo a Passo para Reestruturação do Repositório e Construção do ERP em Go**  
> Status: **Aprovado para Execução**  
> Modelo: **Monólito Modular Go + Frontends Desacoplados (Backoffice SPA + Storefront)**

---

## Estrutura de Diretórios Alvo

```text
frame-24/
├── backend/                      # Backend em Go (Monólito Modular)
│   ├── cmd/
│   │   ├── server/main.go        # Servidor principal (HTTP + Outbox Dispatcher)
│   │   └── migrate/main.go       # CLI de migrações
│   ├── internal/
│   │   ├── identity/             # OIDC, Users, Memberships, Tenants
│   │   ├── catalog/              # Filmes, Produtos, Unidades (CX/UN/KG)
│   │   ├── operations/           # Complexos, Salas, Sessões, Timezones
│   │   ├── sales/                # Vendas, PDV, Lock Redis/Lua, Meia-entrada
│   │   ├── payments/             # Gateways, TEF Adapter, Webhooks
│   │   ├── inventory/            # Estoque Append-Only
│   │   ├── finance/              # Ledger Double-entry, Fechamento cego
│   │   ├── fiscal/               # NFC-e, NFS-e, Gateway Fiscal, Reforma Trib.
│   │   ├── contracts/            # Distribuidoras, Escalas, VPF, Ancine SCB
│   │   ├── crm/                  # Fidelidade, Clientes, Cupons
│   │   └── platform/             # DB Pool, RLS Context, Outbox, Auth
│   ├── migrations/               # Migrações SQL versionadas (golang-migrate)
│   ├── sqlc.yaml                 # Configuração do gerador de queries tipadas
│   ├── go.mod
│   └── go.sum
│
├── frontend/                     # Frontends desacoplados (mesmo nível da API)
│   ├── backoffice/               # SPA Vite + React 19 (Admin ERP + PDV Touch Fullscreen)
│   └── storefront/               # Next.js / Astro (Venda Online Pública com SEO)
│
├── infra/                        # Infraestrutura (Docker Compose, Nginx, configs)
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
│
├── docs/                         # Documentações e RFCs
│   ├── REARQUITETURA-PROPOSTA.md
│   └── ROADMAP.md
│
└── legacy/                       # CÓDIGO ANTIGO ARQUIVADO (Apenas Spec de Domínio)
    ├── api/                      # Antigo apps/api (NestJS)
    ├── admin/                    # Antigo apps/admin (Next.js)
    ├── web/                      # Antigo apps/web (Next.js)
    ├── landing-page/             # Antigo apps/landing-page (Next.js)
    ├── packages/                 # Antigo packages/db, ui, etc.
    └── mlops_project-main/       # Projeto DVC arquivado
```

---

## 📋 Checklist Detalhado de Implementação

---

### Fase 0: Higienização, Estruturação do Monorepo e Setup Go
*Objetivo: Reorganizar o repositório, mover o monólito TypeScript para `legacy/` e inicializar o projeto Go com tooling moderno.*

- [x] **0.1 Mover Código Antigo para `legacy/`:**
  - [x] Criar diretório `legacy/`.
  - [x] Mover `apps/api` $\rightarrow$ `legacy/api`.
  - [x] Mover `apps/admin` $\rightarrow$ `legacy/admin`.
  - [x] Mover `apps/web` $\rightarrow$ `legacy/web`.
  - [x] Mover `apps/landing-page` $\rightarrow$ `legacy/landing-page`.
  - [x] Mover `packages/` $\rightarrow$ `legacy/packages`.
  - [x] Mover `mlops_project-main/` $\rightarrow$ `legacy/mlops_project-main`.
  - [x] Remover arquivos órfãos de build e caches antigos (`.turbo`, `pnpm-lock.yaml`, `turbo.json`).
- [x] **0.2 Inicialização do Backend Go (`backend/`):**
  - [x] Criar diretório `backend/` e rodar `go mod init frame-24`.
  - [x] Configurar `golangci-lint` com regras estritas (`backend/.golangci.yml`).
  - [x] Configurar `sqlc.yaml` para geração tipada de queries.
  - [x] Configurar `golang-migrate` para controle de migrações SQL.
  - [x] Instalar dependências essenciais: `chi/v5`, `pgx/v5`, `redis/go-redis/v9`, `google/uuid`, `stretchr/testify`, `testcontainers-go`.
- [x] **0.3 Inicialização do Frontend Desacoplado (`frontend/`):**
  - [x] Criar `frontend/backoffice` (Vite + React + TypeScript + npm install).
  - [x] Criar `frontend/storefront` (Next.js 15 App Router + Tailwind + ESLint + TypeScript).
- [x] **0.4 Infraestrutura de Desenvolvimento Enxuta (`infra/`):**
  - [x] Criar `infra/docker-compose.dev.yml` contendo apenas: PostgreSQL 16 (porta 5432) e Redis 7 Alpine (porta 6379).
  - [x] Configurar script `Makefile` com comandos: `make dev`, `make migrate`, `make sqlc`, `make test`, `make lint`, `make build`.

---

### Fase 1: Fundação de Plataforma, Multi-Tenancy (RLS) & Identidade OIDC
*Objetivo: Estabelecer o isolamento nativo de banco de dados, motor de Outbox e autenticação unificada.*

- [x] **1.1 Infraestrutura de Banco e RLS Nativo:**
  - [x] Migration inicial `0001_init_platform_and_identity.up.sql`: Schemas `platform`, `identity`.
  - [x] Implementar função PostgreSQL `current_tenant()` com bloqueio estrito e exceção se `app.tenant_id` for nulo.
  - [x] Implementar helper Go `RunInTenantTx(ctx, pool, tenantID, fn)` com `SET LOCAL app.tenant_id`.
  - [x] Testes unitários e de integração validando isolamento e transações.
- [x] **1.2 Transactional Outbox Engine:**
  - [x] Criar tabela `platform.outbox_events` (`id`, `tenant_id`, `event_type`, `aggregate_id`, `payload`, `status`, `retry_count`).
  - [x] Implementar worker em goroutine Go consumindo eventos com `SELECT ... FOR UPDATE SKIP LOCKED` e backoff exponencial.
  - [x] Implementar barramento interno de handlers assíncronos (`InProcessBus.Subscribe` e `Dispatch`).
- [x] **1.3 Identidade Global, Memberships e OIDC:**
  - [x] Migration `identity.users` (Pessoa física global com `email UNIQUE`, senha com bcrypt, CPF opcional).
  - [x] Migration `identity.tenants` (Empresas/Cinemas cadastrados no SaaS) com suporte a Holding e Filiais.
  - [x] Migration `identity.tenant_memberships` (`user_id`, `tenant_id`, `roles[]`, `complex_ids[]`).
  - [x] Implementar casos de uso: `RegisterUser`, `Authenticate`, `SwitchTenantContext`, `AddTenantMember`.
  - [x] Emissão e validação de JWT assinado com claims (`sub`, `tenant_id`, `roles`, `complex_ids`).
  - [x] Middleware HTTP de autenticação OIDC injetando `tenant_id` e claims no `context.Context` e guard `RequireRole`.

---

### Fase 2: Catálogo, Unidades de Medida e Cinema/Operações
*Objetivo: Cadastrar complexos físicos com fusos horários, salas, sessões e catálogo com conversão de unidades.*

- [ ] **2.1 Bounded Context `operations` (Cinema & Programação):**
  - [ ] Migration `operations.cinema_complexes` (CNPJ Filial, Inscrição Estadual, `timezone` IANA, código Ancine).
  - [ ] Migration `operations.rooms` (Capacidade, layout de assentos, código Ancine).
  - [ ] Migration `operations.seats` (Coordenadas de grade, tipos: convencional, VIP, D-BOX, cadeirante, namoradeira).
  - [ ] Migration `operations.showtimes` com **constraint de exclusão temporal** (`EXCLUDE USING gist`) impedindo 2 sessões no mesmo horário/sala.
  - [ ] Casos de uso de agendamento de sessões com conversão e validação no fuso horário do complexo.
- [ ] **2.2 Bounded Context `catalog` (Filmes, Produtos & Unidades):**
  - [ ] Migration `catalog.movies` (Título, classificação indicativa, duração, formato 2D/3D, áudio DUB/LEG/ORIG).
  - [ ] Migration `catalog.products` (Itens de bomboniere, NCM, CEST).
  - [ ] Migration `catalog.product_units` (Conversão de unidades: CX, UN, KG, LT com fator multiplicador).
  - [ ] Migration `catalog.product_barcodes` (Múltiplos códigos EAN por unidade de medida).
  - [ ] Migration `catalog.combos` (Combos de pipoca + refrigerante com preços promocionais).

---

### Fase 3: Núcleo de Vendas (Sales), PDV Touch e Concorrência
*Objetivo: Checkout unificado de ingressos e bomboniere, reserva atômica de assentos no Redis e PDV com contingência.*

- [ ] **3.1 Motor de Reserva Atômica de Assentos:**
  - [ ] Implementar script Lua no Redis para lock atômico de assento em $< 1\text{ms}$ com TTL de 5 minutos.
  - [ ] Implementar endpoint de heartbeat de renovação da reserva durante o checkout.
  - [ ] Broadcast de mapa de assentos via WebSocket quando assentos forem reservados/liberados.
- [ ] **3.2 Caso de Uso `CreateSale` (Venda de Ingressos e Concessão):**
  - [ ] Migration `sales.sales` e `sales.tickets` com RLS ativado.
  - [ ] Validação legal da **cota de 40% de meia-entrada** por sessão (Lei Federal 12.933/2013).
  - [ ] Validação de integridade: $\text{Total da Venda} = \sum \text{Itens}$.
  - [ ] Gravação transacional da venda $+$ tickets $+$ evento `sales.sale.completed` na Outbox.
- [ ] **3.3 PDV Touch no Frontend Backoffice:**
  - [ ] Construção da interface de PDV em tela cheia (touch-screen e atalhos de teclado `F1-F12`).
  - [ ] Suporte a leitura de código de barras USB/Serial para bomboniere e busca rápida.
  - [ ] **Modo Contingência Offline:** Armazenamento em IndexedDB local com sincronização assíncrona ao reconectar.

---

### Fase 4: Pagamentos, TEF e Emissão Fiscal Dual
*Objetivo: Pagamentos online e presenciais via TEF, e emissão desacoplada de NFC-e (mercadoria) e NFS-e (ingresso).*

- [ ] **4.1 Bounded Context `payments` (Gateways & TEF):**
  - [ ] Migration `payments.payment_attempts` com chave de idempotência estrita.
  - [ ] Integração de pagamento online (PIX imediato BACEN com QR Code dinâmico + Cartão).
  - [ ] Implementação da interface `TefAdapter` para comunicação com PinPad físico no PDV.
  - [ ] Processamento idempotente de webhooks de confirmação de pagamento.
- [ ] **4.2 Bounded Context `fiscal` (NFC-e, NFS-e e Reforma Tributária):**
  - [ ] Migration `fiscal.fiscal_profiles` (Certificado digital A1 por complexo, regime tributário).
  - [ ] Migration `fiscal.fiscal_documents` e `fiscal.fiscal_document_items`.
  - [ ] Consumer do evento `sales.sale.completed`:
    * Separação dual: Ingressos $\rightarrow$ **NFS-e** (ISS); Bomboniere $\rightarrow$ **NFC-e** (ICMS).
    * Cálculo de impostos por vigência (PIS/COFINS atual vs. CBS/IBS 2026/2027).
  - [ ] Worker de transmissão assíncrona para Gateway Fiscal (Nuvem Fiscal / SpeedFe).
  - [ ] **Regra SEFAZ de Cancelamento:**
    * $\le 30$ min: cancelamento direto da NFC-e.
    * $> 30$ min: emissão automática de **NF-e de Devolução/Estorno de Entrada** (CFOP 1.202).

---

### Fase 5: Financeiro (Ledger Double-Entry, Fechamento Cego) e Estoque
*Objetivo: Contabilidade imutável, fechamento seguro de caixas físicos e controle de estoque.*

- [ ] **5.1 Bounded Context `inventory` (Estoque de Bomboniere):**
  - [ ] Migration `inventory.movements` (Append-only: Venda, Entrada por NF, Descarte, Inventário).
  - [ ] Baixa automática de estoque na unidade base física ao consumir `sales.sale.completed`.
  - [ ] Constraint `CHECK (quantity >= 0)` impedindo saldo físico negativo.
- [ ] **5.2 Bounded Context `finance` (Ledger Contábil & Caixas):**
  - [ ] Migration `finance.accounts` e `finance.ledger_entries` (Lançamentos de débito e crédito balanceados).
  - [ ] Lançamentos automáticos para Venda, Custo de Mercadoria Vendida (CMV) e Taxas de Cartão/MDR.
  - [ ] Suporte a contas de retenção na fonte para **Split Payment da CBS/IBS (2027)**.
  - [ ] **Módulo de Caixa de PDV:**
    * Abertura de Caixa com Suprimento (Troco inicial);
    * Registro de Sangrias periódicas com impressão de recibo;
    * **Fechamento Cego de Caixa (*Blind Close*):** Operador digita valores contados sem ver o saldo esperado; o sistema gera borderô de conferência e lançamentos de ajuste contábil.

---

### Fase 6: Contratos de Exibição, Distribuidoras e Ancine SCB
*Objetivo: Apuração de percentuais de filmes com distribuidoras, VPF e transmissão obrigatória para a Ancine.*

- [ ] **6.1 Bounded Context `contracts` (Licenciamento de Filmes):**
  - [ ] Migration `contracts.exhibition_contracts` (Filme, Complexo, Distribuidora, Vigência).
  - [ ] Migration `contracts.contract_sliding_scales` (Escala deslizante por semana: ex. Sem 1: 55%/45%).
  - [ ] Migration `contracts.contract_advances` (Garantia Mínima - MG amortizada na apuração).
  - [ ] Migration `contracts.vpf_payments` (Virtual Print Fee pago pela distribuidora ao exibidor por sessão).
  - [ ] Caso de uso de geração do **Borderô de Prestação de Contas (*Settlement Statement*)**.
- [ ] **6.2 Integração Regulatória com a Ancine (SCB / SADIS):**
  - [ ] Motor de consolidação diária: CPB/CRT do filme, salas, público pagante, meias, cortesias e renda bruta.
  - [ ] Gerador e validador de lotes de arquivos de transmissão diária/semanal para o **SCB da Ancine (IN 86/102)**.

---

### Fase 7: CRM/Fidelidade, Storefront Público e Portal de Suporte
*Objetivo: Experiência do consumidor final, fidelidade e ferramentas de operação para a equipe de suporte.*

- [ ] **7.1 Bounded Context `crm` & `marketing`:**
  - [ ] Migration `crm.customer_profiles` (Pontuação de fidelidade *Cinema Club*, histórico).
  - [ ] Motor de regras de cupons e promoções (ex.: pipoca em dobro, descontos por dia da semana).
- [ ] **7.2 Frontend `frontend/storefront` (Venda Online Pública):**
  - [ ] Programação de filmes por cidade e cinema com SEO otimizado (SSR/SSG).
  - [ ] Seleção visual interativa de assentos conectada ao WebSocket de tempo real.
  - [ ] Checkout online fluido com login único OIDC, PIX imediato e cartão de crédito.
- [ ] **7.3 Portal de Suporte & Offboarding de Dados:**
  - [ ] Backoffice com visualização cross-tenant para equipe de suporte com roles de `staff`.
  - [ ] **CLI de Exportação de Dados por Tenant (`frame24 export-tenant`):** Geração de `.tar.gz` contendo dumps SQL, CSVs e XMLs fiscais para offboarding / compliance LGPD.

---

### Fase 8: Homologação, Observabilidade e Cutover
*Objetivo: Testes de carga, validação de produção e entrega final.*

- [ ] **8.1 Observabilidade e Hardening:**
  - [ ] Configuração de logs estruturados em JSON (`log/slog`) com `tenant_id` e `trace_id`.
  - [ ] Configuração de métricas Prometheus em `/metrics` e healthchecks `/healthz/live` e `/healthz/ready`.
  - [ ] Geração automática da documentação Swagger/OpenAPI em `/swagger` a partir das structs Go.
- [ ] **8.2 Testes de Carga e Homologação:**
  - [ ] Testes de carga de concorrência com `k6` simulando abertura de vendas de blockbuster (1.000 req/s em assentos).
  - [ ] Testes E2E de ponta a ponta: *Reserva $\rightarrow$ Pagamento $\rightarrow$ Baixa Estoque $\rightarrow$ Emissão NFC-e/NFS-e $\rightarrow$ Ledger Double-Entry*.
- [ ] **8.3 Arquivamento Final do Legado:**
  - [ ] Validação de que 100% das regras do legado foram absorvidas.
  - [ ] Atualização do `README.md` principal com as instruções de execução do novo ecossistema Go.
