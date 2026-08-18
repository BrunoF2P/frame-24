# DEVELOPMENT.md - Guia de Onboarding

> Leia primeiro o [`README.md`](./README.md) para visão geral da arquitetura.
> Este guia cobre o _fluxo do dia a dia_: setup local, padrões de código, scripts úteis,
> debugging de problemas comuns, e como contribuir com PRs.

---

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Setup em 5 minutos](#setup-em-5-minutos)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Scripts e comandos](#scripts-e-comandos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados (Prisma)](#banco-de-dados-prisma)
- [Trabalhando contra a VPS (remoto)](#trabalhando-contra-a-vps-remoto)
- [Padrões de código](#padrões-de-código)
- [Git flow e Pull Requests](#git-flow-e-pull-requests)
- [Ambiente de staging (preview)](#ambiente-de-staging-preview)
- [Debugging comum](#debugging-comum)
- [CI/CD](#cicd)
- [Backup e restore](#backup-e-restore)

---

## Pré-requisitos

| Ferramenta              | Versão                         | Notas                                                  |
| ----------------------- | ------------------------------ | ------------------------------------------------------ |
| Node.js                 | `>= 18` (recomendado 20 LTS)   | `dockerfile` usa `node:20-alpine`                      |
| pnpm                    | `10.33.0` (exato)              | `corepack enable && corepack prepare pnpm@10.33.0`     |
| Docker / Docker Compose | latest (plugin v2)             | usado apenas para infra local (Postgres, Redis, etc.)  |
| Git                     | >= 2.30                         |                                                        |

> **Dica:** use [VS Code + extensão "Dev Containers"](https://code.visualstudio.com/docs/devcontainers/containers)
> ou o conjunto de extensões do [`@repo/eslint-config`](packages/eslint-config) para Prisma, NestJS e Next.js.

---

## Setup em 5 minutos

```bash
# 1. Clone e entre no diretório
git clone <repo-url> frame-24
cd frame-24

# 2. Instale dependências
pnpm install

# 3. Suba a infraestrutura local (PostgreSQL, Redis, RabbitMQ, MinIO, Mailpit)
docker compose up -d

# 4. Configure os .env de cada app
cp apps/api/.env.example          apps/api/.env
cp apps/web/.env.example          apps/web/.env
cp apps/admin/.env.example        apps/admin/.env
cp apps/landing-page/.env.example apps/landing-page/.env

# 5. Prepare o Prisma Client + migrations
pnpm --filter @repo/db run db:generate
pnpm --filter @repo/db run db:migrate:dev
pnpm --filter @repo/db run build

# 6. (Opcional) Popule dados de desenvolvimento via API
pnpm --filter api run seed:web-e2e

# 7. Rode tudo
pnpm dev
```

URLs locais:

| App          | URL                          |
| ------------ | ---------------------------- |
| API (Swagger/Scalar) | <http://localhost:4000/api/docs> |
| Web          | <http://localhost:3000>       |
| Admin        | <http://localhost:3004>       |
| Landing page | <http://localhost:3003>       |
| Mailpit UI   | <http://localhost:8025>       |
| RabbitMQ UI  | <http://localhost:15672> (frame24 / frame24pass) |
| MinIO Console| <http://localhost:9001> (frame24-storage-key / frame24-storage-secret-2026) |

---

## Estrutura do monorepo

```
frame-24/
├── apps/
│   ├── api/            # NestJS 11 - REST /v1 + /api/auth (Better Auth)
│   ├── web/           # Next.js 16 - site público (PDV, checkout)
│   ├── admin/         # Next.js 16 - dashboard interno
│   └── landing-page/  # Next.js 16 - site institucional
├── packages/
│   ├── db/            # Prisma schema + client compartilhado (@repo/db)
│   ├── ui/            # @repo/ui
│   ├── eslint-config/ # @repo/eslint-config
│   ├── tailwind-config/
│   └── typescript-config/
├── infra/
│   ├── nginx.conf     # config do nginx da VPS
│   └── keycloak/      # bootstrap do Keycloak (opcional)
├── scripts/
│   ├── deploy-vps.sh        # deploy SSH para a VPS (main)
│   ├── seed-prod.sh         # checa popula o BD de produção
│   ├── bootstrap-authentik.mjs
│   ├── fix-missing-complex.cjs
│   └── docker/
│       ├── api-entrypoint.sh
│       └── seed-prod-entrypoint.sh
├── docker-compose.yaml             # infra local dev
├── docker-compose.prod.yml         # stack de produção
├── docker-compose.override.yml     # overrides locais (api/web dev)
├── docker-compose.coolify.yml      # stack Coolify
├── turbo.json               # pipeline Turborepo
├── pnpm-workspace.yaml
├── deploy                  # script unificado de deploy (build gate + envia VPS)
├── .github/workflows/        # CI + deploy automatizado
```

### Domínios por schema (15 schemas PostgreSQL)

`identity`, `hr`, `finance`, `crm`, `sales`, `inventory`, `marketing`,
`operations`, `projects`, `stock`, `tax`, `catalog`, `contracts`, `audit`, `core`.

Os domínios não têm dependência cíclica — quando precisar de uma queryset
que cruza schemas, use o Prisma client (`@repo/db`) normal.

---

## Scripts e comandos

### Raiz (Turborepo)

```bash
pnpm dev                  # roda todos os apps em paralelo (watch)
pnpm dev:api              # só API
pnpm dev:web              # só web
pnpm dev:admin            # só admin
pnpm build                # build de todos os apps (cache Turbo)
pnpm lint                 # lint de todos os apps
pnpm check-types          # tsc --noEmit de tudo
pnpm format              # prettier --write
pnpm format:check        # prettier --check
```

### Por app

```bash
pnpm --filter api run dev
pnpm --filter api run test            # Jest
pnpm --filter api run test:e2e        # jest e2e
pnpm --filter api run seed:web-e2e    # popula BD para Playwright
pnpm --filter web run e2e             # Playwright
pnpm --filter web run e2e:ui
```

### Banco (em `packages/db`)

```bash
pnpm --filter @repo/db run db:generate        # prisma generate
pnpm --filter @repo/db run db:migrate:dev --name <nome>   # cria migration
pnpm --filter @repo/db run db:push            # sync schema (dev rápido)
pnpm --filter @repo/db run db:reset            # DROP + recria tudo (cuidado!)
pnpm --filter @repo/db run db:studio           # Prisma Studio UI
pnpm --filter @repo/db run build              # build do package (gera client + tipos)
```

---

## Variáveis de ambiente

Cada app tem seu `.env.example`. **Nunca comite secrets reais** — apenas `.example`.

| Arquivo                                | App         | Variáveis-chave                                              |
| -------------------------------------- | ----------- | ----------------------------------------------------------- |
| `apps/api/.env`                        | api         | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `BETTER_AUTH_SECRET`, `RABBITMQ_*`, `MINIO_*`, `OIDC_INTERNAL_SECRET` |
| `apps/web/.env`                        | web         | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_SOCKET_URL` |
| `apps/admin/.env`                      | admin       | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AUTH_URL`, `NEXT_PUBLIC_TMDB_API_KEY` |
| `apps/landing-page/.env`               | landing     | `NEXT_PUBLIC_API_URL`                                        |
| `.env` (raiz)                          | docker      | Lidas por `docker-compose.prod.yml`                         |

Regras de ouro:

- `NEXT_PUBLIC_*` é injetado **no build** do Next.js. Mudou? Rebuild.
- `JWT_SECRET` e `BETTER_AUTH_SECRET` precisam de **>= 32 chars** em produção.
- `OIDC_INTERNAL_SECRET` é obrigatório no boot da API (>= 32 chars).

### Sobrescrever local sem comitar

```bash
touch apps/web/.env.local
touch apps/admin/.env.local
```

`.env.local` é lido automaticamente pelo Next e fica ignorado pelo git.

---

## Deploy (script `./deploy`)

O script **`./deploy`** na raiz compila localmente (lint, check-types, build), decide o
ambiente pela branch atual, sincroniza o código para a VPS, builda as imagens Docker
remotamente e sobe os containers.

### Ambientes

| Ambiente    | Branch              | Diretório VPS           | Containers                       | Domínios                                  | Compose                       | Env file          | Database          |
| ----------- | ------------------- | ----------------------- | -------------------------------- | ----------------------------------------- | ----------------------------- | ----------------- | ----------------- |
| **prod**    | `main` / `v*`       | `/opt/frame24`          | `frame24-api/web/admin/landing-page` (+ nginx)| `lawtrel.dev` (tudo path-based: `/`, `/admin`, `/app`, `/api`, `/v1`) | `docker-compose.prod.yml`     | `.env`            | `frame24`         |
| **staging** | `staging`           | `/opt/frame24-staging`  | `frame24-staging-api/web/admin`  | `test.lawtrel.dev` (web em `/`, admin em `/admin`, API em `/api/*` e `/v1/*`) | `docker-compose.staging.yml`  | `.env.staging`    | `frame24_staging` |

- Staging **reusa** os mesmos containers de infraestrutura do prod (postgres, redis,
  rabbitmq, minio, nginx). Só sobe 3 containers: `frame24-staging-api`, `frame24-staging-web`,
  `frame24-staging-admin`.
- Banco: o mesmo container `frame24-postgres` hospeda os databases `frame24` (prod) e
  `frame24_staging` (staging). Isolamento total de dados.
- Redis: staging usa `REDIS_DB=1` (prod usa `REDIS_DB=0`) — sem colisão de chaves.

### Uso

```bash
# Staging (branch staging)
git checkout staging
./deploy                    # detecta staging automaticamente
./deploy staging            # explícito

# Produção (branch main ou tags v*)
git checkout main
./deploy                    # detecta prod, pede confirmação
./deploy prod              # explícito (também pede confirmação interativa)
./deploy prod --skip-seed  # pula seed

# Dry-run (mostra o que faria, não envia)
./deploy --dry-run

# Só alguns serviços
./deploy --services api,web
```

### Opções

| Flag               | Efeito                                                        |
| -------------------| ------------------------------------------------------------ |
| `staging`          | Força deploy em staging (`/opt/frame24-staging/`)            |
| `prod`             | Força deploy em produção (`/opt/frame24/`)                   |
| `--skip-build`     | Pula o gate de build/lint local (**use só em emergência**)    |
| `--skip-seed`      | Pula seed do banco no destino                                  |
| `--services a,b`   | Só sobe os serviços listados (ex: `--services api,web`)       |
| `--force-env=ENV`  | Sobrescreve decisão de branch (staging|prod)                  |
| `--dry-run`        | Não envia nada, só valida e mostra o plano                     |
| `--help`           | Ajuda completa                                                |

### Como ele decide o ambiente

| Branch atual       | Ambiente         | Destino VPS           | Containers                |
| ------------------ | ---------------- | --------------------- | ------------------------- |
| `main`             | **produção**     | `/opt/frame24`        | `frame24-api/web/admin`   |
| `v*` (tag release) | **produção**     | `/opt/frame24`        | `frame24-api/web/admin`   |
| `staging`          | **staging**      | `/opt/frame24-staging`| `frame24-staging-api/web/admin` |
| qualquer outra     | **ERRA**         | –                     | – (use `./deploy staging` ou `prod` explicitamente) |

### Pré-requisitos

- Chave SSH autorizada para `root@174.138.79.19`
- Em **prod**: `/opt/frame24/.env` já deve existir (script não cria)
- Em **staging**: `/opt/frame24-staging/.env.staging` já deve existir (script não cria)
- Para criar `.env.staging` do zero, copie do prod e ajuste URLs:
  ```bash
  ssh root@174.138.79.19 'mkdir -p /opt/frame24-staging && \
    cp /opt/frame24/.env /opt/frame24-staging/.env.staging && \
    cd /opt/frame24-staging && \
    sed -i "s|lawtrel.dev|test.lawtrel.dev|g; \
            s|frame24-prod-jwt-secret|frame24-staging-jwt-secret|g; \
            s|frame24-prod-better-auth|frame24-staging-better-auth|g; \
            s|/frame24?schema|/frame24_staging?schema|g" .env.staging && \
    echo "NEXT_PUBLIC_ADMIN_BASE_PATH=admin" >> .env.staging'
  ```
- Para o admin funcionar em `/admin`, é necessário `NEXT_PUBLIC_ADMIN_BASE_PATH=admin`

### Fluxo completo

1. **Gate local** — roda `pnpm lint`, `pnpm check-types`, `pnpm build` (falha = para)
2. **Decisão** — detecta branch atual → production (`main`/`v*`) ou staging (`staging`)
3. **Confirmação** — prompt interativo para deploy de produção (staging não pede)
4. **Sincronização** — `rsync` do código fonte (exclui node_modules, .next, etc.)
5. **Build remoto** — `docker compose build api web admin` na VPS
6. **Up** — `docker compose up -d` (recria containers com `--force-recreate --remove-orphans`)
7. **Seed** — verifica se DB tem dados; se vazio, roda scripts de seed
8. **Staging extra** — copia `infra/nginx-staging.conf` para o nginx e recarrega

### Workflow recomendado para a equipe

1. Desenvolvedor cria branch `feature/foo` a partir de `main`
2. Abre PR → `main` (CI roda lint + check-types + build)
3. Você revisa o PR → merge em `staging` (não em `main` direto)
4. `./deploy staging` sobe o staging com o novo código
5. Homologa em `https://test.lawtrel.dev` (web) e `https://test.lawtrel.dev/admin` (admin)
6. Quando aprovado, faz merge de `staging` → `main` e roda `./deploy prod`

---

## Banco de dados (Prisma)

- Schema único em `packages/db/prisma/schema.prisma` — todos os 15 schemas.
- O client (`@repo/db`) é **buildado** (`tsc`) e exportado via `dist/`. Após qualquer
  mudança no schema:
  ```bash
  pnpm --filter @repo/db run db:generate
  pnpm --filter @repo/db run build         # refresh dos tipos no dist
  ```
- Em desenvolvimento, prefira `db:migrate:dev` para criar migrations versionadas.
  Use `db:push` só para protótipos (ele reescreve o schema sem versionar).
- Em **produção**, a entrypoint `scripts/docker/api-entrypoint.sh` roda
  `prisma db push --accept-data-loss`. Se quiser migrations versionadas em prod,
  troque para `prisma migrate deploy` nesse script.

### Adicionar uma migration de dev

```bash
cd packages/db
pnpm db:migrate:dev --name adiciona_campo_xyz
git add prisma/migrations/
git commit -m "db: adiciona migration adiciona_campo_xyz"
```

### Prisma Studio

```bash
pnpm --filter @repo/db run db:studio
# abre em http://localhost:5555
```

---

## Trabalhando contra a VPS (remoto)

Se quiser desenvolver contra o banco/Redis/MinIO da VPS sem subir tudo localmente,
siga o [`DEV_SETUP_REMOTE.md`](./DEV_SETUP_REMOTE.md). Em resumo:

1. **Túnel SSH** (recomendado):
   ```bash
   ssh -L 5432:localhost:5432 -L 6379:localhost:6379 root@174.138.79.19 -N
   ```
2. (Ou) exponha as portas no firewall e use o IP `174.138.79.19` direto.
3. Copie `.env.remote.example` → `.env.remote`, ajuste secrets (PEGUE DO `/opt/frame24/.env` DA VPS).
4. Suba só `web` + `api`: `docker compose -f docker-compose.yaml -f docker-compose.prod.yml -f docker-compose.override.yml up -d --build web api`

> **Nunca** comite `.env.remote` — só `.env.remote.example`.

---

## Padrões de código

- **TypeScript 6 strict** via `@repo/typescript-config`. Não use `any` sem justificativa em comentário.
- **Lint**: ESLint 9 flat config via `@repo/eslint-config`.
  - Apps `web` e `admin` têm `lint:strict` que falha em warnings: rode antes de PR.
- **Prettier** único (`@prisma`, `@nestjs`, etc mantém configs próprias mas o Prettier da raiz vale).
- **Imports**: quando possível, use os path-aliases configurados (`@/...`).
- **Zod** para validar input de controllers/request — já está incluso (`nestjs-zod`).
- **NUNCA** adicione comentários explicativos a não ser que o código seja não-óbvio.
- **Não use emojis** em código, mensagens de commit, ou docs (exceto quando explicitamente pedido).

### Convenção de commits (Conventional Commits light)

```
feat: adiciona página de clientes no admin
fix: corrige off-by-one no contador de tickets
db: adiciona migration de admin_access
chore: bump dependências
docs: atualiza DEVELOPMENT.md
```

Apps da API: prefira prefixar o módulo quando ajuda: `feat(crm):`, `fix(auth):`.

---

## Git flow e Pull Requests

```
main              ── estável, deploya em produção
preview/*         ── staging, deploy automático
feature/*         ─– feature branch normal
bugfix/*          ─– bug fix
```

1. `git checkout main && git pull`
2. `git checkout -b feature/descricao-breve`
3. Faça commits pequenos e descritivos.
4. Rode antes de abrir PR:
   ```bash
   pnpm lint
   pnpm check-types
   pnpm build
   ```
5. Abra PR contra `main`. Squash-merge recomendado.
6. Após merge em `main`: deploy roda sozinho (ver [CI/CD](#cicd)).

> Para preview de uma feature sem merge, faça push de uma branch `preview/<nome>`.
> O GitHub Actions sobe um ambiente em `staging.lawtrel.dev` (ver abaixo).

---

## Ambiente de staging

O staging é gerenciado via branch `staging` e deploy manual (`./deploy staging`).
Veja a [seção Deploy](#deploy-script-deploy) acima para instruções completas.

**URLs de staging:**

- Web: <https://test.lawtrel.dev> (tenant prefix: /lawtrel-admin)
- Admin: <https://test.lawtrel.dev/admin>
- API: <https://test.lawtrel.dev/api> e <https://test.lawtrel.dev/v1>

Secrets necessários no GitHub (repo → Settings → Secrets):

| Secret                | Uso                                         |
| --------------------- | ------------------------------------------- |
| `VPS_HOST`            | `174.138.79.19`                             |
| `VPS_USER`            | `root`                                      |
| `VPS_SSH_KEY`         | chave privada SSH                           |
| `GHCR_USERNAME`       | usuário do GitHub Container Registry        |
| `GHCR_TOKEN`          | PAT com `read:packages`                     |
| `STAGING_DOMAIN`      | (opcional) override do domínio de staging   |

> A stack de staging é _reativa_: criação/destroy automático via workflow `workflow_dispatch`.

---

## Debugging comum

### API não conecta no banco

```bash
docker compose ps postgres redis rabbitmq
docker compose logs -f postgres

# Reinicie só o postgres
docker compose restart postgres

# Regen client (schema mudou mas não pegou)
pnpm --filter @repo/db run db:generate
pnpm --filter @repo/db run build
```

### `prisma migrate dev` trava (lock)

```bash
docker compose exec postgres psql -U frame24 -d frame24 \
  -c "SELECT pid, query FROM pg_stat_activity WHERE state='idle in transaction';"
# KILL no pid ofensor
docker compose exec postgres psql -U frame24 -d frame24 -c "SELECT pg_terminate_backend(<pid>);"
```

### 401 no admin mesmo logado

- Cookie da Better Auth é domain-scoped. Verifique `BETTER_AUTH_URL` bate com o host que o admin usa.
- Rode `node dist/scripts/create-betterauth-admin.js` no container API se faltar admin seed.
- Cache da Better Auth invalida em keys `auth:user:*` no Redis. `redis-cli FLUSHDB` se precisar resetar tudo (cuidado).

### Porta em uso

```bash
lsof -i :3000
docker compose ps
#	override via env:
POSTGRES_HOST_PORT=15432 docker compose up -d
```

### Cache Turbo corrompido

```bash
rm -rf .turbo node_modules/.cache
pnpm install
```

### Next.js "hydratation mismatch"

- Garanta que código client não está chamando `new Date()`, `Math.random()`, `localStorage`
  no render server-side. Use `useEffect`.

### Admin atualizou roles mas o usuário ainda vê o cache antigo

A API invalida keys `auth:user:*` ao alterar roles. Se mesmo assim persistir:
```bash
docker exec -it frame24-redis redis-cli -a $REDIS_PASSWORD
> KEYS auth:user:*
> FLUSHDB    # nuclear option
```

---

## CI/CD

### Workflows ativos

| Workflow                                        | Trigger                          | O que faz                                              |
| ----------------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| [.github/workflows/ci.yml](.github/workflows/ci.yml)                  | push em `**`, PR p/ `main`/`preview/*`       | `lint`, `check-types`, `build`                          |
| [.github/workflows/deploy-preview.yml](.github/workflows/deploy-preview.yml) | push em `preview/*`             | Build + deploy pra staging em `/opt/frame24-preview/` |
| [.github/workflows/deploy-prod.yml](.github/workflows/deploy-prod.yml)        | push em `main`, tag `v*`        | Build + deploy pra VPS `/opt/frame24/`                 |

### Desligar um deploy automático

- Push de `main` que você não quer deployar ainda? Use `[skip ci]` no commit ou
  adicione `if: github.event.head_commit.message contains '[skip deploy]'` — contanto
  que use commit message check no `deploy-prod.yml`.

### Rodar deploy manualmente

```bash
# Na raiz, imitando CI mas via SSH direto
./scripts/deploy-vps.sh
```

---

## Backup e restore

Procedimento completo em [`docs/BACKUP.md`](./docs/BACKUP.md).

Resumo dos comandos essenciais:

```bash
# Backup (roda na VPS)
ssh root@174.138.79.19 'docker exec frame24-postgres pg_dump -U frame24 -Fc frame24 > /opt/backups/frame24_$(date +%F).dump'

# Restore
ssh root@174.138.79.19 'docker exec -i frame24-postgres pg_restore -U frame24 -d frame24 -c < /opt/backups/frame24_2025-01-01.dump'
```

Há um cron sugerido em `docs/BACKUP.md` para backup diário + retenção de 14 dias.

---

## Roadmap de Dev Experience

Acompanhe em [`TODO.md`](./TODO.md). Pendências em "Dev Experience":

- [x] Criar `DEVELOPMENT.md` ← **este arquivo**
- [x] GitHub Actions para auto-deploy em `preview/*`
- [x] Subdomínio de staging
- [x] Documentar backup/restore de BD

Próximos itens:

- [ ] Staging sub-tenants para múltiplos colegas simularem ambiente
- [ ] Métricas de coverage obrigatório em PR
- [ ] Preview por PR (Visual Regression)

---

## Onde pedir ajuda

- **Bugs/Issues**: crie issue no GitHub com label `bug`.
- **Discussões de arquitetura**: chat do time + documento ADR em `docs/adr/`.
- **Domínios**: domínio base `lawtrel.dev`. Tudo path-based: `/` (web/tenant), `/admin`, `/app` (landing), `/api`, `/v1`. Staging: `test.lawtrel.dev` (mesmo esquema).
