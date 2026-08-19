-- Teardown da Migration 0003: Núcleo de Vendas (Sales)

DROP TABLE IF EXISTS sales.payments CASCADE;
DROP TABLE IF EXISTS sales.tickets CASCADE;
DROP TABLE IF EXISTS sales.sale_items CASCADE;
DROP TABLE IF EXISTS sales.sales CASCADE;

DROP SCHEMA IF EXISTS sales CASCADE;
