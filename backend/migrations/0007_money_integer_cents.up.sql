-- ==============================================================================
-- Migration: 0007_money_integer_cents.up.sql
-- Frame-24: valores monetários NUMERIC -> BIGINT em centavos.
-- scale 2 (centavos): preços, totais, valores de pagamento, ledger, fiscal.
-- scale 4 (décimos de milésimo): custos unitários (catalog.products.cost_price,
--   inventory.movements.unit_cost) que exigem precisão sub-centavo.
-- Percentuais/alíquotas (iss, cbs, ibs, cbs_aliquot) e conversões NÃO mudam.
-- ==============================================================================

-- Catálogo
ALTER TABLE catalog.products
    ALTER COLUMN cost_price TYPE bigint USING (cost_price * 10000)::bigint,
    ALTER COLUMN cost_price SET DEFAULT 0,
    ALTER COLUMN sale_price TYPE bigint USING (sale_price * 100)::bigint,
    ALTER COLUMN sale_price SET DEFAULT 0;

ALTER TABLE catalog.combos
    ALTER COLUMN combo_price TYPE bigint USING (combo_price * 100)::bigint;

ALTER TABLE catalog.combo_items
    ALTER COLUMN additional_price TYPE bigint USING (additional_price * 100)::bigint,
    ALTER COLUMN additional_price SET DEFAULT 0;

-- Operações
ALTER TABLE operations.showtimes
    ALTER COLUMN base_ticket_price TYPE bigint USING (base_ticket_price * 100)::bigint,
    ALTER COLUMN base_ticket_price SET DEFAULT 0;

-- Vendas
ALTER TABLE sales.sales
    ALTER COLUMN subtotal_tickets TYPE bigint USING (subtotal_tickets * 100)::bigint,
    ALTER COLUMN subtotal_tickets SET DEFAULT 0,
    ALTER COLUMN subtotal_concession TYPE bigint USING (subtotal_concession * 100)::bigint,
    ALTER COLUMN subtotal_concession SET DEFAULT 0,
    ALTER COLUMN discount_amount TYPE bigint USING (discount_amount * 100)::bigint,
    ALTER COLUMN discount_amount SET DEFAULT 0,
    ALTER COLUMN total_amount TYPE bigint USING (total_amount * 100)::bigint;

ALTER TABLE sales.sale_items
    ALTER COLUMN unit_price TYPE bigint USING (unit_price * 100)::bigint,
    ALTER COLUMN total_price TYPE bigint USING (total_price * 100)::bigint;

ALTER TABLE sales.tickets
    ALTER COLUMN price TYPE bigint USING (price * 100)::bigint;

ALTER TABLE sales.payments
    ALTER COLUMN amount TYPE bigint USING (amount * 100)::bigint;

-- Estoque
ALTER TABLE inventory.movements
    ALTER COLUMN unit_cost TYPE bigint USING (unit_cost * 10000)::bigint,
    ALTER COLUMN unit_cost SET DEFAULT 0,
    ALTER COLUMN total_cost TYPE bigint USING (total_cost * 100)::bigint,
    ALTER COLUMN total_cost SET DEFAULT 0;

-- Financeiro
ALTER TABLE finance.ledger_entries
    ALTER COLUMN amount TYPE bigint USING (amount * 100)::bigint;

ALTER TABLE finance.cash_sessions
    ALTER COLUMN opening_balance TYPE bigint USING (opening_balance * 100)::bigint,
    ALTER COLUMN opening_balance SET DEFAULT 0,
    ALTER COLUMN closing_cash_counted TYPE bigint USING (closing_cash_counted * 100)::bigint,
    ALTER COLUMN closing_card_counted TYPE bigint USING (closing_card_counted * 100)::bigint,
    ALTER COLUMN closing_pix_counted TYPE bigint USING (closing_pix_counted * 100)::bigint,
    ALTER COLUMN expected_cash_balance TYPE bigint USING (expected_cash_balance * 100)::bigint,
    ALTER COLUMN difference_amount TYPE bigint USING (difference_amount * 100)::bigint;

ALTER TABLE finance.cash_movements
    ALTER COLUMN amount TYPE bigint USING (amount * 100)::bigint;

-- Pagamentos
ALTER TABLE payments.payment_attempts
    ALTER COLUMN amount TYPE bigint USING (amount * 100)::bigint;

ALTER TABLE payments.tef_transactions
    ALTER COLUMN amount TYPE bigint USING (amount * 100)::bigint;

-- Fiscal
ALTER TABLE fiscal.fiscal_documents
    ALTER COLUMN total_amount TYPE bigint USING (total_amount * 100)::bigint,
    ALTER COLUMN icms_amount TYPE bigint USING (icms_amount * 100)::bigint,
    ALTER COLUMN icms_amount SET DEFAULT 0,
    ALTER COLUMN iss_amount TYPE bigint USING (iss_amount * 100)::bigint,
    ALTER COLUMN iss_amount SET DEFAULT 0,
    ALTER COLUMN pis_amount TYPE bigint USING (pis_amount * 100)::bigint,
    ALTER COLUMN pis_amount SET DEFAULT 0,
    ALTER COLUMN cofins_amount TYPE bigint USING (cofins_amount * 100)::bigint,
    ALTER COLUMN cofins_amount SET DEFAULT 0,
    ALTER COLUMN cbs_amount TYPE bigint USING (cbs_amount * 100)::bigint,
    ALTER COLUMN cbs_amount SET DEFAULT 0,
    ALTER COLUMN ibs_amount TYPE bigint USING (ibs_amount * 100)::bigint,
    ALTER COLUMN ibs_amount SET DEFAULT 0;

ALTER TABLE fiscal.fiscal_document_items
    ALTER COLUMN unit_price TYPE bigint USING (unit_price * 100)::bigint,
    ALTER COLUMN total_price TYPE bigint USING (total_price * 100)::bigint,
    ALTER COLUMN cbs_amount TYPE bigint USING (cbs_amount * 100)::bigint,
    ALTER COLUMN cbs_amount SET DEFAULT 0,
    ALTER COLUMN ibs_amount TYPE bigint USING (ibs_amount * 100)::bigint,
    ALTER COLUMN ibs_amount SET DEFAULT 0;

-- ==============================================================================
-- Correção: a constraint CHECK de reference_type não incluía 'payment',
-- quebrando o lançamento de recebimentos online no Ledger (partida 1.1.1.02).
-- ==============================================================================
ALTER TABLE finance.transactions DROP CONSTRAINT IF EXISTS transactions_reference_type_check;

ALTER TABLE finance.transactions ADD CONSTRAINT transactions_reference_type_check
    CHECK (reference_type IN ('sale', 'cash_session', 'inventory_discard', 'purchase', 'manual', 'split_tax', 'payment'));