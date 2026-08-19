-- Migration 0004: Financeiro (Ledger Double-Entry, Fechamento Cego de Caixa) e Estoque Append-Only
-- Frame-24 Greenfield v2.4.0

CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS finance;

-- 1. Helper function para leitura do usuário ativo no RLS
CREATE OR REPLACE FUNCTION platform.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Tabela de Almoxarifados / Locais de Estoque
CREATE TABLE IF NOT EXISTS inventory.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    complex_id UUID NOT NULL REFERENCES operations.cinema_complexes(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_warehouse_code_per_complex UNIQUE (tenant_id, complex_id, code)
);

-- 3. Tabela Materializada de Saldos de Estoque com Proteção Não-Negativa
CREATE TABLE IF NOT EXISTS inventory.stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES catalog.product_units(id) ON DELETE RESTRICT,
    current_quantity NUMERIC(12,3) NOT NULL DEFAULT 0.000 CHECK (current_quantity >= 0),
    minimum_quantity NUMERIC(12,3) NOT NULL DEFAULT 0.000 CHECK (minimum_quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_stock_item_per_warehouse UNIQUE (tenant_id, warehouse_id, product_id, unit_id)
);

-- 4. Tabela Append-Only de Movimentações de Estoque (Ledger Físico)
CREATE TABLE IF NOT EXISTS inventory.movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES catalog.product_units(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('purchase_in', 'sale_out', 'discard_out', 'transfer_in', 'transfer_out', 'audit_adjustment')),
    quantity NUMERIC(12,3) NOT NULL CHECK (
        (movement_type = 'audit_adjustment' AND quantity >= 0) OR
        (movement_type != 'audit_adjustment' AND quantity > 0)
    ),
    unit_cost NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (unit_cost >= 0),
    total_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    reference_type VARCHAR(50),
    reference_id UUID,
    operator_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Plano de Contas Contábil (Chart of Accounts)
CREATE TABLE IF NOT EXISTS finance.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_account_code_per_tenant UNIQUE (tenant_id, code)
);

-- 6. Transações Contábeis (Cabeçalho da Partida Dobrada)
CREATE TABLE IF NOT EXISTS finance.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description VARCHAR(255) NOT NULL,
    reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('sale', 'cash_session', 'inventory_discard', 'purchase', 'manual', 'split_tax')),
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Lançamentos Contábeis Individuais (Pernas de Débito e Crédito)
CREATE TABLE IF NOT EXISTS finance.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES finance.transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Sessões de Caixa de PDV (Abertura, Operação e Fechamento Cego)
CREATE TABLE IF NOT EXISTS finance.cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    complex_id UUID NOT NULL REFERENCES operations.cinema_complexes(id) ON DELETE RESTRICT,
    pos_terminal_id VARCHAR(50) NOT NULL,
    operator_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
    closing_cash_counted NUMERIC(10,2),
    closing_card_counted NUMERIC(10,2),
    closing_pix_counted NUMERIC(10,2),
    expected_cash_balance NUMERIC(10,2),
    difference_amount NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Movimentações Físicas de Caixa (Suprimento, Sangria e Vendas em Dinheiro)
CREATE TABLE IF NOT EXISTS finance.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES finance.cash_sessions(id) ON DELETE CASCADE,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('opening_float', 'bleed_withdrawal', 'deposit_reinforcement', 'cash_sale')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reason VARCHAR(255),
    authorized_by_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    -- Colunas de referência para idempotência no retry do Outbox dispatcher
    reference_type VARCHAR(50),
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance e Auditoria
CREATE INDEX IF NOT EXISTS idx_stock_levels_lookup ON inventory.stock_levels (tenant_id, warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse ON inventory.movements (tenant_id, warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON finance.ledger_entries (tenant_id, account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON finance.transactions (tenant_id, reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_operator ON finance.cash_sessions (tenant_id, operator_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON finance.cash_movements (tenant_id, session_id);

-- Constraint anti-race de sessão de caixa aberta
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_cash_session 
ON finance.cash_sessions (tenant_id, complex_id, pos_terminal_id, operator_id) 
WHERE status = 'open';

-- ==========================================================================
-- Índices de Idempotência (Deduplicação no retry do Outbox dispatcher)
-- ==========================================================================

-- Garante que a mesma venda (reference_id) gera no máximo 1 movimento de baixa
-- por produto no almoxarifado (1 linha por product_id + sale_id).
-- Retry do subscriber não duplica baixa de estoque.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_inventory_sale_movement
ON inventory.movements (tenant_id, warehouse_id, product_id, reference_id)
WHERE reference_type = 'sale';

-- Garante que a mesma venda gera no máximo 1 transação contábil no Ledger.
-- Retry do subscriber não duplica partidas dobradas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_finance_sale_transaction
ON finance.transactions (tenant_id, reference_id)
WHERE reference_type = 'sale';

-- Garante que a mesma venda em dinheiro é registrada no máximo 1x por sessão de caixa.
-- Retry do subscriber não infla o saldo esperado do Fechamento Cego.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_cash_sale_movement
ON finance.cash_movements (tenant_id, session_id, reference_id)
WHERE reference_type = 'sale' AND movement_type = 'cash_sale';

-- =====================================================================
-- Habilitação de Row Level Security (RLS) e Políticas RESTRICTIVE
-- =====================================================================

ALTER TABLE inventory.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.warehouses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_warehouses ON inventory.warehouses
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE inventory.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock_levels FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_stock_levels ON inventory.stock_levels
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE inventory.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.movements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_movements ON inventory.movements
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE finance.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_accounts ON finance.accounts
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE finance.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_transactions ON finance.transactions
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE finance.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.ledger_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ledger_entries ON finance.ledger_entries
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE finance.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.cash_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_cash_sessions ON finance.cash_sessions
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE finance.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.cash_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_cash_movements ON finance.cash_movements
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

-- =====================================================================
-- Permissões para o papel de aplicação (frame24_app)
-- =====================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'frame24_app') THEN
        GRANT USAGE ON SCHEMA inventory TO frame24_app;
        GRANT USAGE ON SCHEMA finance TO frame24_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA inventory TO frame24_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA finance TO frame24_app;
    END IF;
END $$;
