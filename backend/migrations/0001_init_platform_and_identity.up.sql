-- ==============================================================================
-- Migration: 0001_init_platform_and_identity.up.sql
-- Frame-24 ERP: Schemas platform e identity com PostgreSQL RLS nativo
-- ==============================================================================

-- 1. Extensões essenciais
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Schemas
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS identity;

-- 3. Role de aplicação (não-superuser) — ESSENCIAL para que RLS funcione de verdade.
--    Superuser bypassa RLS silenciosamente; a conexão da app DEVE usar esta role.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'frame24_app') THEN
        CREATE ROLE frame24_app LOGIN PASSWORD 'changeme_in_production';
    END IF;
END
$$;

GRANT USAGE ON SCHEMA platform TO frame24_app;
GRANT USAGE ON SCHEMA identity TO frame24_app;

-- 4. Função de RLS estrita com bloqueio e exceção caso tenant não seja definido
CREATE OR REPLACE FUNCTION current_tenant() RETURNS uuid AS $$
DECLARE
    t text := current_setting('app.tenant_id', true);
BEGIN
    IF t IS NULL OR t = '' THEN
        RAISE EXCEPTION 'RLS_SECURITY_VIOLATION: Contexto de tenant (app.tenant_id) nao foi definido na transacao.';
    END IF;
    RETURN t::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION current_tenant() TO frame24_app;

-- 5. Tabela de Transactional Outbox (platform.outbox_events)
--    IMPORTANTE: SEM RLS — o Outbox é infraestrutura de plataforma.
--    O Dispatcher precisa ler eventos de TODOS os tenants de uma vez.
--    O isolamento real de tenant fica nas tabelas de domínio (identity, sales, operations, etc.)
CREATE TABLE platform.outbox_events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL,
    event_type    text NOT NULL,
    aggregate_id  uuid NOT NULL,
    payload       jsonb NOT NULL,
    headers       jsonb NOT NULL DEFAULT '{}'::jsonb,
    status        text NOT NULL DEFAULT 'pending', -- pending | processing | processed | failed
    retry_count   int NOT NULL DEFAULT 0,
    max_retries   int NOT NULL DEFAULT 5,
    last_error    text,
    scheduled_for timestamptz NOT NULL DEFAULT now(),
    created_at    timestamptz NOT NULL DEFAULT now(),
    processed_at  timestamptz
);

-- Outbox: NÃO habilita RLS — é infraestrutura cross-tenant
GRANT SELECT, INSERT, UPDATE ON platform.outbox_events TO frame24_app;

CREATE INDEX idx_outbox_pending_events ON platform.outbox_events (status, scheduled_for, created_at)
WHERE status IN ('pending', 'processing');

CREATE INDEX idx_outbox_tenant_aggregate ON platform.outbox_events (tenant_id, aggregate_id);

-- 6. Tabela de Tenants / Empresas / Cinemas (identity.tenants)
--    Sem RLS — é catálogo global do SaaS, gerenciado por superadmins da plataforma.
CREATE TABLE identity.tenants (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id              uuid REFERENCES identity.tenants(id) ON DELETE SET NULL, -- Para Redes/Holdings com filiais
    name                   text NOT NULL,                                           -- Razão Social / Nome da Rede
    trade_name             text,                                                    -- Nome Fantasia
    cnpj                   text NOT NULL UNIQUE,                                    -- CNPJ único
    state_registration     text,                                                    -- Inscrição Estadual
    municipal_registration text,                                                    -- Inscrição Municipal
    timezone               text NOT NULL DEFAULT 'America/Sao_Paulo',               -- Fuso Horário IANA
    plan_type              text NOT NULL DEFAULT 'standard',                        -- standard | enterprise
    status                 text NOT NULL DEFAULT 'active',                          -- active | suspended | inactive
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON identity.tenants TO frame24_app;

CREATE INDEX idx_tenants_cnpj ON identity.tenants (cnpj);
CREATE INDEX idx_tenants_status ON identity.tenants (status);
CREATE INDEX idx_tenants_parent ON identity.tenants (parent_id);

-- 7. Tabela de Usuários Globais (identity.users)
--    Sem RLS — usuários são globais ao sistema, não isolados por tenant.
CREATE TABLE identity.users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    full_name     text NOT NULL,
    cpf           text UNIQUE,
    phone         text,
    is_active     boolean NOT NULL DEFAULT true,
    mfa_secret    text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON identity.users TO frame24_app;

CREATE INDEX idx_users_email ON identity.users (email);
CREATE INDEX idx_users_cpf ON identity.users (cpf);

-- 8. Tabela de Vínculos de Trabalho / Membros (identity.tenant_memberships)
--    Sem RLS individual, mas controlada por foreign keys e lógica de app.
CREATE TABLE identity.tenant_memberships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    tenant_id   uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    roles       text[] NOT NULL DEFAULT '{"staff"}',
    permissions text[] NOT NULL DEFAULT '{}',
    complex_ids uuid[],
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

GRANT SELECT, INSERT, UPDATE ON identity.tenant_memberships TO frame24_app;

CREATE INDEX idx_memberships_user ON identity.tenant_memberships (user_id);
CREATE INDEX idx_memberships_tenant ON identity.tenant_memberships (tenant_id);

-- 9. Tabela de Auditoria Tenant-Scoped (identity.tenant_audit_logs)
--    ESTA sim tem RLS — é dado de negócio isolado por tenant.
CREATE TABLE identity.tenant_audit_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    user_id     uuid REFERENCES identity.users(id) ON DELETE SET NULL,
    action      text NOT NULL,
    resource    text NOT NULL,
    details     jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address  text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON identity.tenant_audit_logs TO frame24_app;

ALTER TABLE identity.tenant_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.tenant_audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_audit_logs_isolation_policy ON identity.tenant_audit_logs
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

-- ==============================================================================
-- NOTA SOBRE ESTRATÉGIA RLS:
--
-- Tabelas COM RLS (dados de negócio tenant-scoped):
--   identity.tenant_audit_logs
--   [Fase 2+]: operations.cinema_complexes, sales.*, inventory.*, etc.
--
-- Tabelas SEM RLS (infraestrutura de plataforma ou catálogos globais):
--   platform.outbox_events   — dispatcher lê TODOS os eventos; isolamento via tenant_id no payload
--   identity.users           — identidade global; login não tem contexto de tenant ainda
--   identity.tenants         — catálogo global do SaaS
--   identity.tenant_memberships — gerenciado pela lógica da aplicação com FK
-- ==============================================================================
