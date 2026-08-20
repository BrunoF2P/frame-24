-- ==============================================================================
-- Migration: 0007_money_integer_cents.down.sql
-- Reverte BIGINT (centavos) -> NUMERIC com 2 casas (ou 4 para custos unitários).
-- ==============================================================================

ALTER TABLE catalog.products
    ALTER COLUMN cost_price TYPE numeric(12,4) USING (cost_price::numeric / 10000),
    ALTER COLUMN cost_price SET DEFAULT 0.0000,
    ALTER COLUMN sale_price TYPE numeric(12,2) USING (sale_price::numeric / 100),
    ALTER COLUMN sale_price SET DEFAULT 0.00;

ALTER TABLE catalog.combos
    ALTER COLUMN combo_price TYPE numeric(12,2) USING (combo_price::numeric / 100);

ALTER TABLE catalog.combo_items
    ALTER COLUMN additional_price TYPE numeric(12,2) USING (additional_price::numeric / 100),
    ALTER COLUMN additional_price SET DEFAULT 0.00;

ALTER TABLE operations.showtimes
    ALTER COLUMN base_ticket_price TYPE numeric(12,2) USING (base_ticket_price::numeric / 100),
    ALTER COLUMN base_ticket_price SET DEFAULT 0.00;

ALTER TABLE sales.sales
    ALTER COLUMN subtotal_tickets TYPE numeric(10,2) USING (subtotal_tickets::numeric / 100),
    ALTER COLUMN subtotal_tickets SET DEFAULT 0.00,
    ALTER COLUMN subtotal_concession TYPE numeric(10,2) USING (subtotal_concession::numeric / 100),
    ALTER COLUMN subtotal_concession SET DEFAULT 0.00,
    ALTER COLUMN discount_amount TYPE numeric(10,2) USING (discount_amount::numeric / 100),
    ALTER COLUMN discount_amount SET DEFAULT 0.00,
    ALTER COLUMN total_amount TYPE numeric(10,2) USING (total_amount::numeric / 100);

ALTER TABLE sales.sale_items
    ALTER COLUMN unit_price TYPE numeric(10,2) USING (unit_price::numeric / 100),
    ALTER COLUMN total_price TYPE numeric(10,2) USING (total_price::numeric / 100);

ALTER TABLE sales.tickets
    ALTER COLUMN price TYPE numeric(10,2) USING (price::numeric / 100);

ALTER TABLE sales.payments
    ALTER COLUMN amount TYPE numeric(10,2) USING (amount::numeric / 100);

ALTER TABLE inventory.movements
    ALTER COLUMN unit_cost TYPE numeric(10,4) USING (unit_cost::numeric / 10000),
    ALTER COLUMN unit_cost SET DEFAULT 0.0000,
    ALTER COLUMN total_cost TYPE numeric(10,2) USING (total_cost::numeric / 100),
    ALTER COLUMN total_cost SET DEFAULT 0.00;

ALTER TABLE finance.ledger_entries
    ALTER COLUMN amount TYPE numeric(12,2) USING (amount::numeric / 100);

ALTER TABLE finance.cash_sessions
    ALTER COLUMN opening_balance TYPE numeric(10,2) USING (opening_balance::numeric / 100),
    ALTER COLUMN opening_balance SET DEFAULT 0.00,
    ALTER COLUMN closing_cash_counted TYPE numeric(10,2) USING (closing_cash_counted::numeric / 100),
    ALTER COLUMN closing_card_counted TYPE numeric(10,2) USING (closing_card_counted::numeric / 100),
    ALTER COLUMN closing_pix_counted TYPE numeric(10,2) USING (closing_pix_counted::numeric / 100),
    ALTER COLUMN expected_cash_balance TYPE numeric(10,2) USING (expected_cash_balance::numeric / 100),
    ALTER COLUMN difference_amount TYPE numeric(10,2) USING (difference_amount::numeric / 100);

ALTER TABLE finance.cash_movements
    ALTER COLUMN amount TYPE numeric(10,2) USING (amount::numeric / 100);

ALTER TABLE payments.payment_attempts
    ALTER COLUMN amount TYPE numeric(10,2) USING (amount::numeric / 100);

ALTER TABLE payments.tef_transactions
    ALTER COLUMN amount TYPE numeric(10,2) USING (amount::numeric / 100);

ALTER TABLE fiscal.fiscal_documents
    ALTER COLUMN total_amount TYPE numeric(12,2) USING (total_amount::numeric / 100),
    ALTER COLUMN icms_amount TYPE numeric(10,2) USING (icms_amount::numeric / 100),
    ALTER COLUMN icms_amount SET DEFAULT 0.00,
    ALTER COLUMN iss_amount TYPE numeric(10,2) USING (iss_amount::numeric / 100),
    ALTER COLUMN iss_amount SET DEFAULT 0.00,
    ALTER COLUMN pis_amount TYPE numeric(10,2) USING (pis_amount::numeric / 100),
    ALTER COLUMN pis_amount SET DEFAULT 0.00,
    ALTER COLUMN cofins_amount TYPE numeric(10,2) USING (cofins_amount::numeric / 100),
    ALTER COLUMN cofins_amount SET DEFAULT 0.00,
    ALTER COLUMN cbs_amount TYPE numeric(10,2) USING (cbs_amount::numeric / 100),
    ALTER COLUMN cbs_amount SET DEFAULT 0.00,
    ALTER COLUMN ibs_amount TYPE numeric(10,2) USING (ibs_amount::numeric / 100),
    ALTER COLUMN ibs_amount SET DEFAULT 0.00;

ALTER TABLE fiscal.fiscal_document_items
    ALTER COLUMN unit_price TYPE numeric(12,2) USING (unit_price::numeric / 100),
    ALTER COLUMN total_price TYPE numeric(12,2) USING (total_price::numeric / 100),
    ALTER COLUMN cbs_amount TYPE numeric(10,2) USING (cbs_amount::numeric / 100),
    ALTER COLUMN cbs_amount SET DEFAULT 0.00,
    ALTER COLUMN ibs_amount TYPE numeric(10,2) USING (ibs_amount::numeric / 100),
    ALTER COLUMN ibs_amount SET DEFAULT 0.00;

ALTER TABLE finance.transactions DROP CONSTRAINT IF EXISTS transactions_reference_type_check;

ALTER TABLE finance.transactions ADD CONSTRAINT transactions_reference_type_check
    CHECK (reference_type IN ('sale', 'cash_session', 'inventory_discard', 'purchase', 'manual', 'split_tax'));