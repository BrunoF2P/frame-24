-- ==============================================================================
-- Migration: 0002_catalog_and_operations.down.sql
-- ==============================================================================

DROP TABLE IF EXISTS operations.showtimes;
DROP TABLE IF EXISTS catalog.combo_items;
DROP TABLE IF EXISTS catalog.combos;
DROP TABLE IF EXISTS catalog.product_barcodes;
DROP TABLE IF EXISTS catalog.products;
DROP TABLE IF EXISTS catalog.product_units;
DROP TABLE IF EXISTS catalog.movies;
DROP TABLE IF EXISTS operations.seats;
DROP TABLE IF EXISTS operations.rooms;
DROP TABLE IF EXISTS operations.cinema_complexes;

DROP SCHEMA IF EXISTS catalog CASCADE;
DROP SCHEMA IF EXISTS operations CASCADE;
