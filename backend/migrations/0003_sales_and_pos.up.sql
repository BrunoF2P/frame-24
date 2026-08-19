-- Migration 0003: Núcleo de Vendas (Sales), Ingressos, Pagamentos e RLS
-- Frame-24 Greenfield v2.3.0

CREATE SCHEMA IF NOT EXISTS sales;

-- 1. Tabela de Vendas Unificadas (Ingressos + Bomboniere)
CREATE TABLE IF NOT EXISTS sales.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    complex_id UUID NOT NULL REFERENCES operations.cinema_complexes(id) ON DELETE RESTRICT,
    pos_terminal_id VARCHAR(50),
    operator_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'canceled', 'refunded')),
    subtotal_tickets NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal_tickets >= 0),
    subtotal_concession NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal_concession >= 0),
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de Itens da Venda (Produtos e Combos da Bomboniere)
CREATE TABLE IF NOT EXISTS sales.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales.sales(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('product', 'combo')),
    product_id UUID REFERENCES catalog.products(id) ON DELETE RESTRICT,
    combo_id UUID REFERENCES catalog.combos(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES catalog.product_units(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Ingressos Emitidos (Tickets)
CREATE TABLE IF NOT EXISTS sales.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales.sales(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES operations.showtimes(id) ON DELETE RESTRICT,
    seat_id UUID NOT NULL REFERENCES operations.seats(id) ON DELETE RESTRICT,
    ticket_type VARCHAR(30) NOT NULL CHECK (ticket_type IN ('inteira', 'meia_estudante', 'meia_idoso', 'meia_pcd', 'meia_jovem_baixa_renda', 'cortesia')),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    document_number VARCHAR(50),
    qr_code_hash VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'canceled')),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_seat_per_showtime UNIQUE (showtime_id, seat_id)
);

-- 4. Tabela de Formas de Pagamento
CREATE TABLE IF NOT EXISTS sales.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales.sales(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix', 'voucher')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded')),
    external_reference VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Índices de Otimização e Segurança RLS
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_complex_id ON sales.sales(complex_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales.sales(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sales.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_id ON sales.sale_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON sales.tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_showtime_id ON sales.tickets(showtime_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code_hash ON sales.tickets(qr_code_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type ON sales.tickets(showtime_id, ticket_type) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON sales.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON sales.payments(tenant_id);

-- 6. Habilitação de RLS e Políticas Restritivas
ALTER TABLE sales.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.sales FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_sales_tenant_isolation ON sales.sales
    AS RESTRICTIVE
    USING (tenant_id = current_tenant());

ALTER TABLE sales.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.sale_items FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_sale_items_tenant_isolation ON sales.sale_items
    AS RESTRICTIVE
    USING (tenant_id = current_tenant());

ALTER TABLE sales.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tickets_tenant_isolation ON sales.tickets
    AS RESTRICTIVE
    USING (tenant_id = current_tenant());

ALTER TABLE sales.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.payments FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_payments_tenant_isolation ON sales.payments
    AS RESTRICTIVE
    USING (tenant_id = current_tenant());

-- 7. Permissões de Acesso para a Role de Aplicação
GRANT USAGE ON SCHEMA sales TO frame24_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sales TO frame24_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sales TO frame24_app;
