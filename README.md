<div align="center">

# Frame-24

### Sistema de Gestão Integrada para Cinema

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.33.0-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
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

| App            | Descrição                                               | Porta  | Stack           |
| -------------- | ------------------------------------------------------- | ------ | --------------- |
| `api`          | Backend REST API versionada (`/v1`) com Swagger/Scalar  | `4000` | NestJS          |
| `web`          | Aplicação web principal para operações                  | `3000` | Next.js + React |
| `admin`        | Dashboard administrativo com componentes compartilhados | `3004` | Next.js + React |
| `landing-page` | Site institucional e fluxo de aquisição                 | `3003` | Next.js + React |

### Packages

| Package                   | Responsabilidade                                 |
| ------------------------- | ------------------------------------------------ |
| `@repo/db`                | Prisma schema, migrations e client compartilhado |
| `@repo/ui`                | Biblioteca de componentes UI reutilizáveis       |
| `@repo/eslint-config`     | Configurações de lint padronizadas               |
| `@repo/tailwind-config`   | Configurações compartilhadas de estilo           |
| `@repo/typescript-config` | Bases TypeScript reutilizáveis                   |

## Stack Tecnológica

### Core

- Node.js `>= 18`
- TypeScript `6.0.2`
- pnpm `10.33.0`
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

| Ferramenta              | Versão mínima |
| ----------------------- | ------------- |
| Node.js                 | `>= 18`       |
| pnpm                    | `10.33.0`     |
| Podman / Podman Compose | latest        |
| Git                     | latest        |

### Instalar pnpm

Via npm:

```bash
npm install -g pnpm@10.33.0
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

| Serviço             | URL                              | Credenciais               |
| ------------------- | -------------------------------- | ------------------------- |
| API (Swagger)       | <http://localhost:4000/api/docs> | -                         |
| Web App             | <http://localhost:3000>          | -                         |
| Admin App           | <http://localhost:3004>          | -                         |
| Landing Page        | <http://localhost:3003>          | -                         |
| RabbitMQ Management | <http://localhost:15672>         | `frame24` / `frame24pass` |
| MailHog             | <http://localhost:8025>          | -                         |

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

- Cadastro admin legado: `POST /v1/auth/register`
- Cadastro cliente legado: `POST /v1/customer/auth/register`
- Login/cadastro oficial: Better Auth em `/api/auth/*` (email/senha, sessão e recuperação de sessão).
- Endpoints legados de login (`/v1/auth/login` e `/v1/customer/auth/login`) foram removidos.

Headers aceitos na API:

```http
Authorization: Bearer <access-token>
```

Variáveis principais da API:

```env
JWT_SECRET=change-me-to-a-long-random-secret
JWT_AUDIENCE=frame24-api
JWT_ISSUER=frame24-api
JWT_EXPIRES_IN=8h
BETTER_AUTH_SECRET=change-me-to-a-long-random-secret
BETTER_AUTH_SECRETS=change-me-old-secret,change-me-new-secret
BETTER_AUTH_URL=http://localhost:4000
```

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

## Deploy Docker (Coolify/VPS)

### Arquivos de deploy

- `dockerfile`: imagem de produção da API (`apps/api`) com build NestJS.
- `scripts/docker/api-entrypoint.sh`: aplica `prisma migrate deploy` antes de iniciar a API.
- `docker-compose.coolify.yml`: stack de produção com `api` + `postgres` + `minio`.
- `.env.coolify.example`: template de variáveis para produção.

### Subir na VPS com Docker Compose

```bash
cp .env.coolify.example .env.coolify
# ajuste os secrets e domínios no arquivo .env.coolify
docker compose --env-file .env.coolify -f docker-compose.coolify.yml up -d --build
```

Portas publicadas no host podem ser ajustadas no `.env.coolify`:

- `API_HOST_PORT` (default: `4000`)
- `POSTGRES_HOST_PORT` (default: `5432`)
- `MINIO_HOST_PORT` (default: `9000`)
- `MINIO_CONSOLE_HOST_PORT` (default: `9001`)

Topologia de produção recomendada:

- Coolify/VPS: `api` + `postgres` + `minio`.
- Redis: serviço externo gerenciado.
- RabbitMQ: serviço externo gerenciado.
- Frontends (`web`, `admin`, `landing-page`): hospedados na Vercel.

Atualização após novo push no `main`:

```bash
git pull origin main
docker compose --env-file .env.coolify -f docker-compose.coolify.yml pull api postgres minio
docker compose --env-file .env.coolify -f docker-compose.coolify.yml up -d --remove-orphans
```

### Integração com GitHub Actions

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica a imagem em `ghcr.io/<owner>/frame-24-api` e suporta dois modos:

- Coolify por webhook (`COOLIFY_DEPLOY_WEBHOOK_URL`).
- VPS por SSH + Docker Compose (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_USERNAME`, `GHCR_TOKEN`).

No modo VPS, o limite de 1GB fica definido diretamente no `docker-compose.coolify.yml` via limites de memória dos serviços, distribuido entre `api + postgres + minio`.

Secrets recomendados no GitHub:

- `COOLIFY_DEPLOY_WEBHOOK_URL` (opcional, para deploy automático no Coolify)
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `GHCR_USERNAME`
- `GHCR_TOKEN` (PAT com `read:packages`)
- `N8N_WEBHOOK_URL` (opcional para notificação de falha)

### Variáveis obrigatórias de produção

No mínimo:

- `JWT_SECRET`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` ou `API_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `FRONTEND_URL` (domínios Vercel permitidos por CORS, separados por vírgula)
- `REDIS_URL` + `REDIS_HOST` + `REDIS_PORT` (externos)
- `RABBITMQ_URI` + `RABBITMQ_HOST` + `RABBITMQ_PORT` + `RABBITMQ_USER` + `RABBITMQ_PASSWORD` (externos)
- `MINIO_ACCESS_KEY` + `MINIO_SECRET_KEY` + (`STORAGE_PUBLIC_URL` ou `MINIO_PUBLIC_URL`) (MinIO no VPS)

Em produção, use secrets fortes (>= 32 caracteres para `JWT_SECRET` e `BETTER_AUTH_SECRET`).

## Prontidão da Fase Atual

A fase atual fecha somente quando não houver brecha crítica conhecida, os riscos médios mais perigosos tiverem owner funcional, a documentação OpenAPI refletir o comportamento real, e os fluxos críticos tiverem testes e observabilidade mínima.

Status de fechamento:

| Área                               | Owner funcional                           | Status                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity/Auth/CRM/Public           | Backend/API Security + Privacy/Compliance | Segredo interno obrigatório, throttling, payload público mínimo e validação de tenant endereçados. Direitos do titular, retenção e descarte seguem como plano de compliance, sem implementação completa nesta fase. |
| Sales/Public/Operations            | Backend/Sales + Infra/Ops                 | Idempotência pública, seat locking forte, cancelamento por regra temporal e throttling endereçados. Fluxos críticos precisam permanecer cobertos por testes focados.                                                |
| Finance/Payments                   | Finance/Payments                          | Fora da fase atual: PIX real, webhook PSP, ledger interno, refund e chargeback não devem ser declarados como corrigidos.                                                                                            |
| Tax/Fiscal/Catalog/Stock/Contracts | Fiscal/Tax + Backend                      | Validação de tenant em filtros e coerência de contratos/fiscal endereçadas. Pipeline de atualização normativa e revisão fiscal completa seguem como plano fiscal.                                                   |
| Storage/Email/Audit/Workers        | Infra/Ops + Privacy/Compliance            | Auditoria com retry e DLQ endereçada. Storage por prefixo/contexto, redaction de logs e alarmes operacionais seguem como plano de observabilidade/incidente.                                                        |
| Marketing/Recommendations          | Backend/Sales + Privacy/Compliance        | Finalização de campanha/cupom sob lock transacional endereçada. Separação completa entre dados operacionais e promocionais segue como plano de privacidade.                                                         |

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
