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

- [x] **2.1 Bounded Context `operations` (Cinema & Programação):**
  - [x] Migration `operations.cinema_complexes` (CNPJ Filial, Inscrição Estadual, `timezone` IANA, código Ancine).
  - [x] Migration `operations.rooms` (Capacidade, layout de assentos, código Ancine).
  - [x] Migration `operations.seats` (Coordenadas de grade, tipos: convencional, VIP, D-BOX, cadeirante, reduzida, namoradeira).
  - [x] Migration `operations.showtimes` com **constraint de exclusão temporal** (`EXCLUDE USING gist`) impedindo 2 sessões no mesmo horário/sala.
  - [x] Casos de uso de agendamento de sessões com conversão e validação no fuso horário do complexo e tempo de limpeza.
- [x] **2.2 Bounded Context `catalog` (Filmes, Produtos & Unidades):**
  - [x] Migration `catalog.movies` (Título, classificação indicativa, duração, formato 2D/3D, áudio DUB/LEG/ORIG, CPB/CRT Ancine).
  - [x] Migration `catalog.products` (Itens de bomboniere, NCM, CEST, preços de custo e venda).
  - [x] Migration `catalog.product_units` (Conversão de unidades: CX, UN, KG, LT com fator multiplicador e cálculo automático).
  - [x] Migration `catalog.product_barcodes` (Múltiplos códigos EAN por unidade de medida).
  - [x] Migration `catalog.combos` (Combos de pipoca + refrigerante com itens selecionáveis e adicionais de preço).

---

### Fase 3: Núcleo de Vendas (Sales), PDV Touch e Concorrência
*Objetivo: Checkout unificado de ingressos e bomboniere, reserva atômica de assentos no Redis e PDV com contingência.*

- [x] **3.1 Motor de Reserva Atômica de Assentos:**
  - [x] Implementar script Lua no Redis para lock atômico de assento em $< 1\text{ms}$ com TTL de 5 minutos (`All-or-Nothing`).
  - [x] Implementar endpoint de heartbeat de renovação da reserva durante o checkout.
  - [x] Broadcast de mapa de assentos via WebSocket (`SeatMapHub`) quando assentos forem reservados/liberados/vendidos.
- [x] **3.2 Caso de Uso `CreateSale` (Venda de Ingressos e Concessão):**
  - [x] Migration `0003_sales_and_pos.up.sql` com `sales.sales`, `sales.sale_items`, `sales.tickets` e `sales.payments` com RLS ativado.
  - [x] Validação legal da **cota de 40% de meia-entrada** por sessão (Lei Federal 12.933/2013).
  - [x] Validação de integridade: $\text{Total da Venda} = \sum \text{Itens de Ingresso} + \sum \text{Itens de Bomboniere} - \text{Descontos}$.
  - [x] Gravação transacional da venda $+$ tickets $+$ evento `sales.sale.completed` na Outbox.
- [ ] **3.3 PDV Touch no Frontend Backoffice (Consolidação de Frontend no Fim do Projeto):**
  - [ ] Construção da interface de PDV em tela cheia (touch-screen e atalhos de teclado `F1-F12`).
  - [ ] Suporte a leitura de código de barras USB/Serial para bomboniere e busca rápida.
  - [ ] **Modo Contingência Offline:** Armazenamento em IndexedDB local com sincronização assíncrona ao reconectar.

---

### Fase 4: Pagamentos, TEF e Emissão Fiscal Dual (Concluída ✅)
*Objetivo: Pagamentos online e presenciais via TEF, e emissão desacoplada de NFC-e (mercadoria) e NFS-e (ingresso).*

- [x] **4.1 Bounded Context `payments` (Gateways & TEF):**
  - [x] Migration `0005_combos_payments_and_fiscal.up.sql` com `payments.payment_attempts` (chave de idempotência estrita) e `payments.tef_transactions` com RLS restritivo.
  - [x] Integração de pagamento online (PIX imediato BACEN com QR Code dinâmico + Copia e Cola EMVCo).
  - [x] Implementação da interface `TefAdapter` para comunicação com PinPad físico no PDV (2-phase commit CNC / NCN).
  - [x] Processamento idempotente de webhooks de confirmação de pagamento.
- [x] **4.2 Bounded Context `fiscal` (NFC-e, NFS-e e Reforma Tributária):**
  - [x] Migration `fiscal.fiscal_profiles` (Certificado digital A1 por complexo, regime tributário, ambiente homologação/produção, CSC token).
  - [x] Migration `fiscal.fiscal_documents` e `fiscal.fiscal_document_items` com RLS restritivo.
  - [x] Consumer do evento `sales.sale.completed`:
    * Separação dual: Ingressos $\rightarrow$ **NFS-e** (ISS LC 116 12.01); Bomboniere $\rightarrow$ **NFC-e** (ICMS modelo 65).
    * Cálculo de impostos por vigência (PIS/COFINS atual vs. destaque informativo CBS 0.90% e IBS 0.10% em 2026 / Ato Conjunto RFB/CGIBS 4/2026).
  - [x] Geração e autorização de notas fiscais com chave de acesso SEFAZ de 44 dígitos e protocolo.
  - [x] **Regra SEFAZ de Cancelamento:**
    * $\le 30$ min: cancelamento direto da NFC-e (SEFAZ evento 110111).
    * $> 30$ min: emissão automática de **NF-e de Devolução/Estorno de Entrada** (modelo 55, CFOP 1.202) com chave referenciada da NFC-e original.

---

### Fase 5: Financeiro (Ledger Double-Entry, Fechamento Cego) e Estoque
*Objetivo: Contabilidade imutável, fechamento seguro de caixas físicos e controle de estoque.*

- [x] **5.1 Bounded Context `inventory` (Estoque de Bomboniere):**
  - [x] Migration `0004_finance_and_inventory.up.sql` (`inventory.warehouses`, `inventory.stock_levels`, `inventory.movements` com RLS restritivo).
  - [x] Baixa automática e controle de movimentações na unidade base física com `CHECK (current_quantity >= 0)` e concorrência ACID (`FOR UPDATE`).
  - [x] Casos de uso: entrada por compra, descarte por avaria, balanço/inventário físico e baixa por venda.
- [x] **5.2 Bounded Context `finance` (Ledger Contábil & Caixas):**
  - [x] Migration `0004_finance_and_inventory.up.sql` (`finance.accounts`, `finance.transactions`, `finance.ledger_entries`, `finance.cash_sessions`, `finance.cash_movements`).
  - [x] Lançamentos automáticos balanceados de partidas dobradas ($\sum \text{Débitos} = \sum \text{Créditos}$) para Vendas, CMV, Quebras e Sobras.
  - [x] Suporte nativo a contas de retenção na fonte para **Split Payment da CBS/IBS (2027)** (`2.1.2.01` e `2.1.2.02`).
  - [x] **Módulo de Caixa de PDV:**
    * Abertura de Caixa com Suprimento (Troco inicial);
    * Registro de Sangrias periódicas com autorizador;
    * **Fechamento Cego de Caixa (*Blind Close*):** Operador digita valores contados sem ver o saldo esperado; o sistema gera borderô de conferência e lança automaticamente a Quebra (despesa) ou Sobra (receita) no Ledger.
- [x] **5.3 Evolução do RLS de Plataforma (Multi-Claims):**
  - [x] Injetar `app.user_id` em conjunto com `app.tenant_id` em `RunInTenantTx` (`SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)`) e função PostgreSQL `platform.current_user_id()`.

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
- [ ] **7.2 Frontend `frontend/storefront` (Venda Online Pública & Totem):**
  - [ ] Programação de filmes por cidade e cinema com SEO otimizado (SSR/SSG).
  - [ ] Seleção visual interativa de assentos conectada ao WebSocket de tempo real.
  - [ ] Checkout online fluido com login único OIDC, PIX imediato e cartão de crédito.
  - [ ] Modo quiosque (*kiosk mode*) para totem com leitor de cartão de crédito e impressora térmica ESC/POS.
  - [ ] **`ALLOWED_ORIGINS` por variável de ambiente:** Substituir a lista estática de origens permitidas no `CheckOrigin` do `SeatMapHub` (`ws.go`) por uma variável de ambiente `ALLOWED_ORIGINS` (lista separada por vírgula), garantindo que o WebSocket aceite conexões do domínio real do storefront e do backoffice em produção sem alterar código.
  - [ ] **Autenticação WebSocket por handler:** Remover a rota `/ws/showtimes/:showtimeId/seats` do middleware de auth HTTP e validar o token JWT dentro do handler via subprotocolo WebSocket (`Sec-WebSocket-Protocol`) — o fallback `?token=` atual nunca é alcançado pois a rota está sob `auth.Middleware`.
- [ ] **7.3 Portal de Suporte & Offboarding de Dados:**
  - [ ] Backoffice com visualização cross-tenant para equipe de suporte com roles de `staff`.
  - [ ] **CLI de Exportação de Dados por Tenant (`frame24 export-tenant`):** Geração de `.tar.gz` contendo dumps SQL, CSVs e XMLs fiscais para offboarding / compliance LGPD.

---

### Fase 8: Hardening, Performance (pgx.Batch), Observabilidade e Cutover
*Objetivo: Garantir resiliência, latência ultra-baixa em rotas críticas com pgx.Batch e entrega final.*

- [ ] **8.1 Otimização de Throughput RLS com `pgx.Batch`:**
  - [ ] Consolidar `set_config` e queries em lote via `pgx.Batch` nas rotas mais críticas (Checkout PDV, Ingressos em lote, Leitura de catálogo) para atingir **1 único round-trip TCP**.
- [ ] **8.2 Hardening Financeiro — Migração de `float64` para centavos inteiros (`int64`):**
  - [ ] Substituir todos os campos de valor monetário (`total_amount`, `unit_price`, `subtotal_tickets`, etc.) de `float64` para representação em centavos inteiros (`int64` no domínio Go / `BIGINT` no PostgreSQL).
  - [ ] O epsilon `0.01` em `ValidatePayments` e `NewSale` é um workaround temporário para drift de ponto flutuante; com `int64` a comparação passa a ser exata (`sum == s.TotalAmountCents`).
  - [ ] Esta refatoração impacta: `domain/sale.go`, `domain/ticket.go`, `domain/payment.go`, todas as migrations e os handlers HTTP (serialização/deserialização de centavos ↔ reais).
- [ ] **8.3 Hardening de Resiliência — Flag `SEATLOCK_REQUIRE` (fail-fast em produção):**
  - [ ] Adicionar variável de ambiente `SEATLOCK_REQUIRE=1` (padrão `0` em dev, `1` em prod).
  - [ ] Quando `SEATLOCK_REQUIRE=1` e o Redis estiver indisponível, `VerifySeatLocks` deve retornar `ErrSeatLockFailed` imediatamente em vez de `nil` — o `UNIQUE (showtime_id, seat_id)` ainda impede venda dupla, mas a reserva transitória deixa de ser inócua em caso de queda do Redis.
- [ ] **8.4 Observabilidade e Logs Estruturados:**
  - [ ] Configuração de logs estruturados em JSON (`log/slog`) com `tenant_id` e `trace_id`.
  - [ ] Configuração de métricas Prometheus em `/metrics` e healthchecks `/healthz/live` e `/healthz/ready`.
  - [ ] Tracing distribuído OpenTelemetry.
- [ ] **8.5 Homologação e Testes de Carga:**
  - [ ] Testes de carga com k6 simulando pico de abertura de vendas de grande lançamento (1.000 req/s em mapa de assentos).
  - [ ] Testes E2E de ponta a ponta: *Reserva $\rightarrow$ Pagamento $\rightarrow$ Baixa Estoque $\rightarrow$ Emissão NFC-e/NFS-e $\rightarrow$ Ledger Double-Entry*.
  - [ ] Geração automática da documentação Swagger/OpenAPI em `/swagger`.
- [ ] **8.6 Arquivamento Final do Legado:**
  - [ ] Validação de que 100% das regras do legado foram absorvidas.
  - [ ] Atualização do `README.md` principal com as instruções de execução do novo ecossistema Go.
- [ ] **8.7 Débitos Técnicos & Resiliência de Estoque/Financeiro:**
  - [ ] **Decomposição de Combos em Estoque (`catalog.combo_components`):** Atualmente `ProductID == nil` em itens tipo combo não gera baixa em `inventory.movements` nem CMV no subscriber de vendas. Implementar a tabela `catalog.combo_components` para decompor combos nos seus produtos e insumos base (ex: 1 Pipoca + 1 Refri) e computar a baixa física e CMV correspondentes.
  - [ ] **Reserva/Baixa Síncrona de Estoque:** No momento, a baixa de estoque ocorre assincronamente pelo evento `sales.sale.completed` (logando `Warn` se falhar). Implementar pré-baixa/reserva síncrona no `CreateSale` para que vendas sem estoque físico sejam rejeitadas imediatamente (`ErrInsufficientStock`), mantendo o evento assíncrono para a contabilização no Ledger.
  - [ ] **Custo Histórico/FIFO no Cálculo de CMV:** O subscriber do evento de venda lê o `CostPrice` atual do produto no momento da execução. Migrar para custo histórico registrado na foto da venda (`sale_items.unit_cost`) ou custeio médio/FIFO.
  - [ ] **Lock de Caixa em Operações Concorrentes:** Reforçar lock transacional na sessão de caixa para impedir sangrias/suprimentos no instante em que o Fechamento Cego estiver apurando o saldo esperado.

