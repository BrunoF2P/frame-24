-- Teardown Migration 0004: Financeiro e Estoque
-- Frame-24 Greenfield v2.4.0

DROP TABLE IF EXISTS finance.cash_movements CASCADE;
DROP TABLE IF EXISTS finance.cash_sessions CASCADE;
DROP TABLE IF EXISTS finance.ledger_entries CASCADE;
DROP TABLE IF EXISTS finance.transactions CASCADE;
DROP TABLE IF EXISTS finance.accounts CASCADE;

DROP TABLE IF EXISTS inventory.movements CASCADE;
DROP TABLE IF EXISTS inventory.stock_levels CASCADE;
DROP TABLE IF EXISTS inventory.warehouses CASCADE;

DROP SCHEMA IF EXISTS finance CASCADE;
DROP SCHEMA IF EXISTS inventory CASCADE;
