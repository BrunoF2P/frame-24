-- Migration 0005: Teardown dos schemas payments e fiscal
DROP INDEX IF EXISTS finance.idx_unique_finance_payment_transaction;
DROP SCHEMA IF EXISTS fiscal CASCADE;
DROP SCHEMA IF EXISTS payments CASCADE;
