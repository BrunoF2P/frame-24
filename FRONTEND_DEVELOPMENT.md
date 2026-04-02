# Frame-24 Frontend - Estado Atual

## Resumo

Este documento descreve o estado atual do frontend no monorepo, alinhado com o contrato de autenticacao vigente.

Stack principal:

- Next.js 16
- React 19
- TypeScript
- Auth.js (next-auth v5 beta)
- Keycloak (OIDC)

Apps frontend no workspace:

- `apps/web` (experiencia do cliente final)
- `apps/admin` (painel administrativo)
- `apps/landing-page` (site institucional e cadastro)

## Contrato de Autenticacao (Fonte de Verdade)

Fluxo oficial de login:

1. Usuario inicia login no frontend.
2. Frontend redireciona para Keycloak via Auth.js (`signIn("keycloak")`).
3. Keycloak autentica e retorna ao callback do app (`/api/auth/callback/keycloak`).
4. Sessao Auth.js passa a fornecer `accessToken`.
5. Requisicoes para a API enviam `Authorization: Bearer <access-token>`.

Pontos importantes:

- Login canonico e OIDC/Keycloak.
- A API nao usa endpoint oficial de login por credenciais para colaboradores.
- `POST /v1/customer/auth/login` existe apenas por compatibilidade e retorna 401 (fluxo legado desativado).

## Arquitetura por App

### 1) `apps/web`

Responsabilidades:

- Jornada do cliente final (tenant-based routes)
- Login/logout via Keycloak
- Consumo de API autenticada com token da sessao Auth.js
- Integracao de socket autenticado

Pontos de implementacao:

- Auth.js configurado em `src/auth.ts`
- Handlers em `src/app/api/auth/[...nextauth]/route.ts`
- Session provider em `src/components/providers.tsx`
- Contexto de auth integrado ao `useSession` em `src/contexts/auth-context.tsx`
- Interceptores HTTP leem token via `getSession()`
- Socket client envia token da sessao para autenticacao no gateway

Rotas de autenticacao relevantes:

- `/:tenant_slug/auth/login`
- fluxo de callback em `/api/auth/*`

### 2) `apps/admin`

Responsabilidades:

- Painel administrativo
- Protecao de rotas administrativas
- Sessao OIDC centralizada

Pontos de implementacao:

- Auth.js em `src/auth.ts`
- Handlers em `src/app/api/auth/[...nextauth]/route.ts`
- Middleware/proxy com redirect para login em `src/proxy.ts`
- Layout integra `SessionProvider` e controla acesso por estado de sessao

Rota principal de login:

- `/login` (aciona Keycloak)

### 3) `apps/landing-page`

Responsabilidades:

- Site publico
- Fluxo de cadastro de empresa/admin
- Entrada para login OIDC

Pontos de implementacao:

- Auth.js configurado em `auth.ts`
- Handlers em `app/api/auth/[...nextauth]/route.ts`
- Paginas dedicadas de login/logout:
  - `app/auth/login/page.tsx`
  - `app/auth/logout/page.tsx`
- Action de cadastro integrada ao endpoint atual de registro

## Integracao com Backend (API)

Endpoints de auth relevantes para frontend:

- `POST /v1/auth/register`
  - cadastro de nova empresa + provisioning de admin no Keycloak
- `POST /v1/customer/auth/register`
  - cadastro de cliente + provisioning no Keycloak
- `POST /v1/customer/auth/login`
  - legado desativado (retorna 401)

Demais modulos (users, movies, products, showtimes etc.) seguem consumo via bearer token OIDC.

## Variaveis de Ambiente Frontend

Cada app possui seu `.env` proprio (`apps/*/.env`).

Exemplos comuns:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
AUTH_TRUST_HOST=true
AUTH_SECRET=change-me
AUTH_KEYCLOAK_ID=frame24-web
AUTH_KEYCLOAK_SECRET=frame24-web-dev-secret
AUTH_KEYCLOAK_ISSUER=http://localhost:8080/realms/frame-24-realm
```

Obs:

- IDs/secrets variam por app (`frame24-web`, `frame24-admin`, `frame24-landing`).
- Base de configuracao detalhada em:
  - `apps/web/.env.example`
  - `apps/admin/.env.example`
  - `apps/landing-page/.env.example`

## Execucao Local

1. Infra:

```bash
docker-compose up -d
```

1. API:

```bash
pnpm dev:api
```

1. Frontends (em terminais separados):

```bash
pnpm dev:web
pnpm dev:admin
pnpm dev:landing-page
```

## Status Funcional (High-Level)

Implementado e alinhado ao contrato atual:

- Login OIDC via Keycloak nos apps frontend
- Sessao centralizada com Auth.js
- Injeção de bearer token OIDC nas chamadas para API
- Cadastro com provisioning no Keycloak
- Endpoint de login legado explicitamente desativado

## Nao Usar Como Referencia

As orientacoes abaixo sao consideradas obsoletas e nao se aplicam ao estado atual:

- Login JWT local com `localStorage`
- Fluxo principal baseado em `POST /v1/auth/login`
- Auth context desacoplado da sessao Auth.js

## Referencias

- `README.md` (contrato de autenticacao e visao geral)
- `QUICK_START.md` (bootstrap e setup rapido)
- `API_ENDPOINTS.md` (mapa resumido de endpoints)
