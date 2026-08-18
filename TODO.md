# Frame-24 — TODO & Status de Desenvolvimento

> **Status:** Transição para Reescrita Greenfield em Go (v2.1.0)  
> **Documento de Arquitetura:** [REARQUITETURA-PROPOSTA.md](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/REARQUITETURA-PROPOSTA.md)  
> **Roadmap Detalhado de Implementação:** [ROADMAP.md](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/ROADMAP.md)

---

## 🎯 Status Atual do Projeto

### [x] Fase 0: Setup da Estrutura e Isolamento do Legado (Concluída ✅)
### [x] Fase 1: Fundação de Plataforma, RLS Nativo e Identidade OIDC (Concluída ✅)
- [x] Migração inicial `0001_init_platform_and_identity.up.sql` com schemas `platform`, `identity` e função `current_tenant()` com RLS nativo.
- [x] Wrapper Go `RunInTenantTx` para injeção segura de `SET LOCAL app.tenant_id` no `pgxpool`.
- [x] Transactional Outbox Worker em goroutine Go (`SELECT ... FOR UPDATE SKIP LOCKED`) e `InProcessBus`.
- [x] Modelos `identity.users`, `identity.tenants` (Holdings/Filiais) e `identity.tenant_memberships`.
- [x] Casos de uso de autenticação, registro, emissão de JWT com claims e **Tenant Switcher** (`/api/v1/auth/switch-tenant`).
- [x] Middleware HTTP de autenticação OIDC e guards de role `RequireRole`.
- [x] 100% dos testes unitários e de integração HTTP passando.

### [ ] Próximo Foco: Fase 2 — Catálogo, Unidades de Medida e Cinema/Operações

---

*(Para a lista completa de tarefas até o fim do projeto, consulte o arquivo oficial [ROADMAP.md](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/ROADMAP.md))*