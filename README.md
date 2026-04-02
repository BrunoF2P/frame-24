<div align="center">

# Frame-24

### Sistema de Gestão Integrada para Cinema

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.20.0-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.x-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)

Monorepo full-stack com TypeScript para operação de redes de cinema, com arquitetura multi-tenant, API REST versionada, dashboard web e landing page.

</div>

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura do Monorepo](#arquitetura-do-monorepo)
- [Stack Tecnológica](#stack-tecnológica)
- [Pré-requisitos](#pré-requisitos)
- [Quick Start](#quick-start)
- [Scripts do Projeto](#scripts-do-projeto)
- [Serviços e Portas](#serviços-e-portas)
- [Banco de Dados e Schemas](#banco-de-dados-e-schemas)
- [Autenticação](#autenticação)
- [Multi-Tenancy](#multi-tenancy)
- [Troubleshooting](#troubleshooting)
- [Documentação Complementar](#documentação-complementar)
- [Contribuição](#contribuição)
- [Licença](#licença)

## Visão Geral

O Frame-24 é um sistema para gestão integrada de operações de cinema, incluindo catálogo, sessões, vendas, fiscal, CRM e processos administrativos.

### Principais capacidades

- Gestão de complexos, salas e assentos.
- Programação de sessões com validação de conflitos.
- Venda de ingressos e produtos de concessão.
- Módulos fiscal e financeiro com apurações e repasses.
- CRM com fidelidade e histórico de relacionamento.
- Base multi-tenant com isolamento de dados por empresa.

## Arquitetura do Monorepo

O repositório utiliza Turborepo + pnpm workspaces, organizado em apps e packages reutilizáveis.

### Apps

| App | Descrição | Porta | Stack |
| --- | --- | --- | --- |
| `api` | Backend REST API versionada (`/v1`) com Swagger/Scalar | `4000` | NestJS |
| `web` | Aplicação web principal para operações | `3000` | Next.js + React |
| `admin` | Dashboard administrativo com componentes compartilhados | `3004` | Next.js + React |
| `landing-page` | Site institucional e fluxo de aquisição | `3003` | Next.js + React |

### Packages

| Package | Responsabilidade |
| --- | --- |
| `@repo/db` | Prisma schema, migrations e client compartilhado |
| `@repo/ui` | Biblioteca de componentes UI reutilizáveis |
| `@repo/api-types` | Tipos gerados para integração com a API |
| `@repo/eslint-config` | Configurações de lint padronizadas |
| `@repo/tailwind-config` | Configurações compartilhadas de estilo |
| `@repo/typescript-config` | Bases TypeScript reutilizáveis |

## Stack Tecnológica

### Core

- Node.js `>= 18`
- TypeScript `5.9.3`
- pnpm `10.20.0`
- Turborepo `2.x`

### Backend

- NestJS `11`
- Prisma ORM
- JWT para autenticação/autorização
- RabbitMQ para mensageria assíncrona

### Frontend

- Next.js `16`
- React `19`
- Tailwind CSS `4`

### Infraestrutura local (Podman)

- PostgreSQL
- RabbitMQ
- MinIO
- MailHog

## Pré-requisitos

| Ferramenta | Versão mínima |
| --- | --- |
| Node.js | `>= 18` |
| pnpm | `10.20.0` |
| Podman / Podman Compose | latest |
| Git | latest |

### Instalar pnpm

Via npm:

```bash
npm install -g pnpm@10.20.0
```

Via Homebrew (macOS/Linux):

```bash
brew install pnpm
```

Via Chocolatey (Windows):

```bash
choco install pnpm
```

Verificação:

```bash
pnpm --version
```

## Quick Start

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd frame-24
```

### 2. Suba a infraestrutura

```bash
podman compose -f docker-compose.yaml up -d
podman compose -f docker-compose.yaml ps
```

### 3. Configure variáveis de ambiente

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/landing-page/.env.example apps/landing-page/.env
cp packages/db/.env.example packages/db/.env
```

Opcional para sobrescrever localmente sem versionar:

```bash
touch apps/web/.env.local
touch apps/admin/.env.local
```

### 4. Instale dependências

```bash
pnpm install
```

### 5. Prepare o banco

```bash
cd packages/db
pnpm db:generate
pnpm db:migrate:dev
pnpm build
cd ../..
```

### 6. Inicie o ambiente

Todos os serviços de desenvolvimento:

```bash
pnpm dev
```

Apenas API:

```bash
pnpm dev:api
```

Apenas aplicação web:

```bash
pnpm dev:web
```

Apenas dashboard admin:

```bash
pnpm dev:admin
```

## Scripts do Projeto

Comandos na raiz:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check-types
pnpm format
```

Execução por app com Turbo:

```bash
turbo dev --filter=api
turbo dev --filter=web
turbo dev --filter=admin
turbo dev --filter=landing-page
```

Comandos úteis de banco (em `packages/db`):

```bash
pnpm db:generate
pnpm db:migrate:dev --name nome-da-migration
pnpm db:studio
pnpm db:reset
```

## Serviços e Portas

| Serviço | URL | Credenciais |
| --- | --- | --- |
| API (Swagger) | <http://localhost:4000/api/docs> | - |
| Web App | <http://localhost:3000> | - |
| Admin App | <http://localhost:3004> | - |
| Landing Page | <http://localhost:3003> | - |
| RabbitMQ Management | <http://localhost:15672> | `frame24` / `frame24pass` |
| MailHog | <http://localhost:8025> | - |

Prisma Studio:

```bash
cd packages/db
pnpm db:studio
```

## Banco de Dados e Schemas

O sistema usa modelagem multi-schema com isolamento por domínio.

Schemas principais:

- `identity` (usuários, empresas, autenticação, permissões)
- `hr` (recursos humanos)
- `finance` (contabilidade e lançamentos)
- `crm` (clientes e fidelidade)
- `sales` (ingressos, concessão e transações)
- `inventory` (fornecedores, produtos, estoque)
- `marketing` (campanhas, cupons, descontos)
- `operations` (complexos, salas, sessões, assentos)
- `projects` (projetos RECINE)
- `stock` (movimentação de estoque)
- `tax` (tributos e apurações fiscais)
- `catalog` (filmes, produtos, combos)
- `contracts` (contratos com distribuidoras)

## Autenticação

Contrato de autenticação (padrão do projeto):

- Login canônico: OIDC/Authentik (frontend web/admin/landing via Auth.js).
- A API valida access token RS256 emitido pelo Authentik (issuer/JWKS).
- `POST /v1/auth/register` e `POST /v1/customer/auth/register` fazem provisioning de usuários no Authentik.
- `POST /v1/customer/auth/login` permanece apenas por compatibilidade e retorna 401 (fluxo legado desativado).

Headers aceitos na API:

```http
Authorization: Bearer <access-token>
```

Variáveis principais da API para o fluxo OIDC/Authentik:

```env
AUTH_PROVIDER=authentik
OIDC_ISSUER=http://localhost:9080/application/o/frame24-app/
OIDC_JWKS_URI=http://localhost:9080/application/o/frame24-app/jwks/
OIDC_API_AUDIENCE=frame24-app

# Provisioning de usuarios (cadastro publico / cadastro de cliente)
AUTHENTIK_URL=http://localhost:9080
AUTHENTIK_TOKEN=frame24-authentik-bootstrap-token
AUTHENTIK_PROVISIONING_ENABLED=true
```

Observação: as credenciais de provisioning são separadas do runtime normal da API.
Sem `AUTHENTIK_PROVISIONING_ENABLED=true`, os fluxos de cadastro/provisioning no Authentik ficam desabilitados.

## Multi-Tenancy

Arquitetura multi-tenant com separação lógica de dados por empresa:

- Cada empresa possui `tenant_slug` único.
- Requisições são filtradas por `company_id` do usuário autenticado.
- Controle de acesso por papéis e permissões granulares.
- Isolamento de dados entre tenants.

## Troubleshooting

### Porta em uso

```bash
podman compose -f docker-compose.yaml ps
```

Se necessário, ajuste portas no `docker-compose.yaml` e arquivos `.env`.

### Banco não conecta

```bash
podman compose -f docker-compose.yaml ps postgres
podman compose -f docker-compose.yaml restart postgres
```

### RabbitMQ indisponível

```bash
podman compose -f docker-compose.yaml ps rabbitmq
podman compose -f docker-compose.yaml logs -f rabbitmq
```

### Prisma Client desatualizado

```bash
cd packages/db
pnpm db:generate
pnpm build
```

## Documentação Complementar

- `API_ENDPOINTS.md`
- `QUICK_START.md`
- `FRONTEND_DEVELOPMENT.md`
- `FRONTEND_FILES_SUMMARY.md`
- `FRONTEND_FINAL_SUMMARY.md`

## Contribuição

1. Crie uma branch para sua feature ou correção.
2. Faça commits pequenos e descritivos.
3. Rode lint e checagem de tipos antes de abrir PR.
4. Abra um Pull Request com contexto técnico claro.

Fluxo sugerido:

```bash
git checkout -b feature/nova-feature
git commit -m "feat: adiciona nova feature"
git push origin feature/nova-feature
```

## Licença

Projeto privado sob licença **UNLICENSED**.

---

<div align="center">

Desenvolvido para o projeto de Banco de Dados da UNEB Campus 2.

</div>
