# Frame-24 — TODO & Status de Desenvolvimento

> **Status:** Transição para Reescrita Greenfield em Go (v2.1.0)  
> **Documento de Arquitetura:** [REARQUITETURA-PROPOSTA.md](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/REARQUITETURA-PROPOSTA.md)  
> **Roadmap Detalhado de Implementação:** [ROADMAP.md](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/ROADMAP.md)

---

## 🎯 Status Atual do Projeto

### [x] Fase 0: Setup da Estrutura e Isolamento do Legado (Concluída ✅)
### [x] Fase 1: Fundação de Plataforma, RLS Nativo e Identidade OIDC (Concluída ✅)
### [x] Fase 2: Catálogo, Unidades de Medida e Cinema/Operações (Concluída ✅)
- [x] Migração `0002_catalog_and_operations.up.sql` com extensão `btree_gist` e RLS em todas as tabelas.
- [x] Constraint GiST nativa no PostgreSQL `no_overlapping_showtimes_per_room` impedindo sessões sobrepostas na mesma sala.
- [x] Suporte a fuso horário IANA por complexo (`America/Manaus`, `America/Sao_Paulo`, etc.).
- [x] Gerador automático de grade de assentos (`A1..Z15`).
- [x] Catálogo de Filmes com regulatório ANCINE (CPB/CRT).
- [x] Produtos de bomboniere, NCM/CEST fiscais e unidades de medida com conversão automática (CX24 $\rightarrow$ 24 UN).
- [x] Múltiplos EANs por produto e formulação de combos com adicionais de preço.
- [x] 100% dos testes unitários passando.

### [x] Fase 3: Núcleo de Vendas (Sales), Concorrência e Backend PDV (Concluída ✅)
- [x] Script Lua atômico no Redis (`All-or-Nothing`) para lock de múltiplos assentos com TTL (5 min) e heartbeat de renovação.
- [x] Hub WebSocket (`SeatMapHub`) de mapa de assentos para broadcast em tempo real (`SEATS_LOCKED`, `SEATS_RELEASED`, `SEATS_SOLD`).
- [x] Migration `0003_sales_and_pos.up.sql` (`sales.sales`, `sales.sale_items`, `sales.tickets`, `sales.payments`) com RLS restritivo.
- [x] Validação jurídica estrita da **cota de 40% de meia-entrada** por sessão (Lei Federal 12.933/2013).
- [x] Validação de integridade contábil: $\text{Total Venda} = \sum \text{Itens de Ingresso} + \sum \text{Itens de Bomboniere} - \text{Descontos}$.
- [x] Emissão de tickets com QR Code seguro (SHA-256) e evento transacional `sales.sale.completed` na Outbox.
- [x] 100% dos testes unitários passando.
- *(Nota: Interface visual do PDV Touch e frontends serão desenvolvidos na fase consolidada de frontend no fim do projeto)*

### [ ] Próximo Foco: Fase 4 — Pagamentos, TEF e Emissão Fiscal Dual (NFC-e / NFS-e)

---

## 📌 Dívidas Técnicas Registradas por Fase

> Itens identificados em revisão de código e agendados para a fase correta.

### Fase 7 — WebSocket & Autenticação do Storefront
- [ ] **`ALLOWED_ORIGINS` por env:** Substituir a lista estática `localhost/127.0.0.1` no `CheckOrigin` do `SeatMapHub` por variável de ambiente `ALLOWED_ORIGINS` (lista separada por vírgula) para suportar o domínio real do storefront/backoffice em produção sem alterar código.
- [ ] **Auth WebSocket por handler:** A rota `/ws/showtimes/:id/seats` está sob `auth.Middleware`; o fallback `?token=` é código morto. Para o storefront público, mover a validação JWT para dentro do handler via subprotocolo WebSocket (`Sec-WebSocket-Protocol`) e retirar a rota do middleware global.

### Fase 8 — Hardening Financeiro e Resiliência
- [ ] **`float64` → `int64` (centavos):** Todos os campos monetários (`total_amount`, `unit_price`, `base_ticket_price`, etc.) devem migrar de `float64` para centavos inteiros `int64`/`BIGINT`. O epsilon `0.01` em `ValidatePayments` e `NewSale` é um workaround temporário para drift de ponto flutuante. A refatoração impacta `domain/sale.go`, `domain/ticket.go`, `domain/payment.go`, todas as migrations e a camada HTTP.
- [ ] **Flag `SEATLOCK_REQUIRE`:** Adicionar env `SEATLOCK_REQUIRE=1` (padrão `0` em dev). Quando ativo e o Redis estiver indisponível, `VerifySeatLocks` retorna `ErrSeatLockFailed` imediatamente (fail-fast) em vez de `nil` — o `UNIQUE (showtime_id, seat_id)` impede venda dupla, mas a reserva transitória se torna inócua sem o Redis.

---

*(Para a lista completa de tarefas até o fim do projeto, consulte o arquivo oficial [ROADMAP.md](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/ROADMAP.md))*