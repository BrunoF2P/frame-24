# Frontend Files Summary (Estado Atual)

## Escopo

Resumo dos arquivos e areas frontend relevantes no estado atual do projeto, com foco em autenticacao OIDC/Keycloak e estrutura real de apps.

Apps:

- `apps/web`
- `apps/admin`
- `apps/landing-page`

## Auth.js + Keycloak

### `apps/web`

- `apps/web/src/auth.ts`
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- `apps/web/src/proxy.ts`
- `apps/web/src/components/providers.tsx`
- `apps/web/src/contexts/auth-context.tsx`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/socket-client.ts`
- `apps/web/src/app/[tenant_slug]/auth/login/page.tsx`
- `apps/web/src/app/[tenant_slug]/auth/register/page.tsx`

### `apps/admin`

- `apps/admin/src/auth.ts`
- `apps/admin/src/app/api/auth/[...nextauth]/route.ts`
- `apps/admin/src/proxy.ts`
- `apps/admin/src/app/layout.tsx`
- `apps/admin/src/app/login/page.tsx`
- `apps/admin/src/services/api-config.ts`
- `apps/admin/src/services/sales-services.ts`

### `apps/landing-page`

- `apps/landing-page/auth.ts`
- `apps/landing-page/app/api/auth/[...nextauth]/route.ts`
- `apps/landing-page/app/auth/login/page.tsx`
- `apps/landing-page/app/auth/logout/page.tsx`
- `apps/landing-page/app/actions/register.ts`
- `apps/landing-page/components/RegisterForm.tsx`

## Ambiente por App

- `apps/web/.env.example`
- `apps/admin/.env.example`
- `apps/landing-page/.env.example`

Variaveis centrais:

- `AUTH_TRUST_HOST`
- `AUTH_SECRET`
- `AUTH_KEYCLOAK_ID`
- `AUTH_KEYCLOAK_SECRET`
- `AUTH_KEYCLOAK_ISSUER`
- `NEXT_PUBLIC_API_URL`

## Backend/Contrato Relacionado

Arquivos backend que definem o contrato consumido pelos frontends:

- `apps/api/src/main.ts` (bearer auth no OpenAPI)
- `apps/api/src/swagger.config.ts` (descricao de auth por dominio)
- `apps/api/src/modules/identity/auth/controllers/public-auth.controller.ts`
- `apps/api/src/modules/identity/auth/services/public-registration.service.ts`
- `apps/api/src/modules/crm/controllers/customer-auth.controller.ts`
- `apps/api/src/modules/crm/services/customer-auth.service.ts`

## Documentacao Relacionada

- `README.md`
- `QUICK_START.md`
- `API_ENDPOINTS.md`
- `FRONTEND_DEVELOPMENT.md`
