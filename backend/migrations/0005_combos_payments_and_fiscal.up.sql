-- Migration 0005: Pagamentos (PIX BACEN, TEF PinPad) e Emissão Fiscal Dual (NFC-e / NFS-e) com Reforma Tributária (CBS/IBS)
-- Frame-24 Greenfield v2.5.0

CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS fiscal;

-- =====================================================================
-- 1. TABELAS DO BOUNDED CONTEXT PAYMENTS
-- =====================================================================

-- 1.1 Tentativas de Pagamento com Idempotência Estrita
CREATE TABLE IF NOT EXISTS payments.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales.sales(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(100) NOT NULL,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'cash', 'voucher')),
    provider VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'failed', 'refunded', 'cancelled')),
    external_reference VARCHAR(100),
    qr_code_pix TEXT,
    qr_code_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_idempotency_key_per_tenant UNIQUE (tenant_id, idempotency_key)
);

-- 1.2 Transações TEF de PinPad (2-Phase Commit CNC / NCN)
CREATE TABLE IF NOT EXISTS payments.tef_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales.sales(id) ON DELETE SET NULL,
    pos_terminal_id VARCHAR(50) NOT NULL,
    nsu VARCHAR(50) NOT NULL,
    authorization_code VARCHAR(50) NOT NULL,
    card_brand VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'voucher')),
    installments INT NOT NULL DEFAULT 1 CHECK (installments >= 1),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'authorized' CHECK (status IN ('authorized', 'confirmed', 'reversed', 'pending')),
    terminal_mac VARCHAR(50),
    receipt_merchant TEXT,
    receipt_customer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tef_nsu_per_terminal UNIQUE (tenant_id, pos_terminal_id, nsu)
);

-- =====================================================================
-- 2. TABELAS DO BOUNDED CONTEXT FISCAL
-- =====================================================================

-- 2.1 Perfis Fiscais Emissores por Complexo de Cinema
CREATE TABLE IF NOT EXISTS fiscal.fiscal_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    complex_id UUID NOT NULL REFERENCES operations.cinema_complexes(id) ON DELETE RESTRICT,
    certificate_a1_vault_id VARCHAR(100),
    certificate_password_encrypted VARCHAR(255),
    certificate_valid_until TIMESTAMPTZ,
    environment VARCHAR(20) NOT NULL DEFAULT 'homologation' CHECK (environment IN ('production', 'homologation')),
    tax_regime VARCHAR(30) NOT NULL DEFAULT 'lucro_presumido' CHECK (tax_regime IN ('simples_nacional', 'lucro_presumido', 'lucro_real')),
    nfce_series INT NOT NULL DEFAULT 1 CHECK (nfce_series > 0),
    nfce_last_number BIGINT NOT NULL DEFAULT 0 CHECK (nfce_last_number >= 0),
    nfce_csc_id VARCHAR(10) NOT NULL DEFAULT '000001',
    nfce_csc_token VARCHAR(100),
    nfse_series VARCHAR(10) NOT NULL DEFAULT '1',
    nfse_last_number BIGINT NOT NULL DEFAULT 0 CHECK (nfse_last_number >= 0),
    nfse_municipal_registration VARCHAR(50),
    nfe_devolution_series INT NOT NULL DEFAULT 1 CHECK (nfe_devolution_series > 0),
    nfe_devolution_last_number BIGINT NOT NULL DEFAULT 0 CHECK (nfe_devolution_last_number >= 0),
    cnae VARCHAR(20) NOT NULL DEFAULT '5914-6/00',
    aliquota_iss NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (aliquota_iss >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_fiscal_profile_per_complex UNIQUE (tenant_id, complex_id)
);

-- 2.2 Documentos Fiscais Emitidos (NFC-e, NFS-e, NF-e de Devolução)
CREATE TABLE IF NOT EXISTS fiscal.fiscal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    complex_id UUID NOT NULL REFERENCES operations.cinema_complexes(id) ON DELETE RESTRICT,
    sale_id UUID NOT NULL REFERENCES sales.sales(id) ON DELETE CASCADE,
    doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('nfce', 'nfse', 'nfe_devolution')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'emitted', 'authorized', 'rejected', 'cancelled', 'refunded')),
    series VARCHAR(10) NOT NULL,
    number BIGINT NOT NULL,
    access_key VARCHAR(44),
    protocol_number VARCHAR(50),
    referenced_access_key VARCHAR(44),
    xml_content TEXT,
    pdf_danfe_url TEXT,
    qr_code_url TEXT,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    icms_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (icms_amount >= 0),
    iss_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (iss_amount >= 0),
    pis_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (pis_amount >= 0),
    cofins_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (cofins_amount >= 0),
    cbs_aliquot NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (cbs_aliquot >= 0),
    cbs_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (cbs_amount >= 0),
    ibs_aliquot NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (ibs_aliquot >= 0),
    ibs_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (ibs_amount >= 0),
    rejection_reason TEXT,
    emitted_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_doc_per_sale_and_type UNIQUE (tenant_id, sale_id, doc_type)
);

-- 2.3 Itens do Documento Fiscal com Discriminação Tributária
CREATE TABLE IF NOT EXISTS fiscal.fiscal_document_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    fiscal_document_id UUID NOT NULL REFERENCES fiscal.fiscal_documents(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ticket', 'product', 'combo', 'combo_item')),
    reference_id UUID,
    description VARCHAR(255) NOT NULL,
    ncm VARCHAR(10),
    cest VARCHAR(10),
    cfop VARCHAR(10) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'UN',
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    cst_icms VARCHAR(10),
    cst_pis_cofins VARCHAR(10),
    cst_cbs_ibs VARCHAR(10),
    cbs_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cbs_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    ibs_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    ibs_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 3. ÍNDICES DE PERFORMANCE E AUDITORIA
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_payment_attempts_sale ON payments.payment_attempts (tenant_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payments.payment_attempts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tef_transactions_pos ON payments.tef_transactions (tenant_id, pos_terminal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_sale ON fiscal.fiscal_documents (tenant_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_access_key ON fiscal.fiscal_documents (tenant_id, access_key);
CREATE INDEX IF NOT EXISTS idx_fiscal_document_items_doc ON fiscal.fiscal_document_items (tenant_id, fiscal_document_id);

-- Garante que o recebimento online de um payment_attempt aprovado é lançado no máximo 1x no Ledger.
-- Retry do subscriber payments.payment.approved não duplica a partida contábil.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_finance_payment_transaction
ON finance.transactions (tenant_id, reference_id)
WHERE reference_type = 'payment';

-- =====================================================================
-- 4. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS) RESTRICTIVE
-- =====================================================================

ALTER TABLE payments.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.payment_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payment_attempts ON payments.payment_attempts
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE payments.tef_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.tef_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_tef_transactions ON payments.tef_transactions
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE fiscal.fiscal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.fiscal_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fiscal_profiles ON fiscal.fiscal_profiles
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE fiscal.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.fiscal_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fiscal_documents ON fiscal.fiscal_documents
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

ALTER TABLE fiscal.fiscal_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.fiscal_document_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fiscal_document_items ON fiscal.fiscal_document_items
    AS RESTRICTIVE
    USING (tenant_id = platform.current_tenant());

-- =====================================================================
-- 5. PERMISSÕES PARA O PAPEL DE APLICAÇÃO (frame24_app)
-- =====================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'frame24_app') THEN
        GRANT USAGE ON SCHEMA payments TO frame24_app;
        GRANT USAGE ON SCHEMA fiscal TO frame24_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payments TO frame24_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fiscal TO frame24_app;
    END IF;
END $$;
