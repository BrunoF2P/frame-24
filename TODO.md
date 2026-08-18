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

### [ ] Próximo Foco: Fase 3 — Núcleo de Vendas (Sales), PDV Touch e Concorrência

---

*(Para a lista completa de tarefas até o fim do projeto, consulte o arquivo oficial [ROADMAP.md](file:///c:/Users/bruno/Documents/Desenvolvimento/frame-24/docs/ROADMAP.md))*