-- ==============================================================================
-- Migration: 0002_catalog_and_operations.up.sql
-- Frame-24 ERP: Schemas operations e catalog com PostgreSQL RLS e GiST Exclusion
-- ==============================================================================

-- 1. Extensões para índices GiST e operações temporais
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Schemas
CREATE SCHEMA IF NOT EXISTS operations;
CREATE SCHEMA IF NOT EXISTS catalog;

GRANT USAGE ON SCHEMA operations TO frame24_app;
GRANT USAGE ON SCHEMA catalog TO frame24_app;

-- ==============================================================================
-- SCHEMA OPERATIONS (Cinema, Salas, Assentos e Sessões)
-- ==============================================================================

-- 3. Complexos Físicos de Cinema (operations.cinema_complexes)
CREATE TABLE operations.cinema_complexes (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    name                  text NOT NULL,                                           -- Nome do Complexo (ex: CineMax Shopping SP)
    cnpj_filial           text NOT NULL,                                           -- CNPJ Filial
    state_registration    text,                                                    -- Inscrição Estadual
    ancine_code           text,                                                    -- Código de registro ANCINE do Complexo
    timezone              text NOT NULL DEFAULT 'America/Sao_Paulo',               -- Fuso Horário IANA do local
    address_street        text,
    address_number        text,
    address_neighborhood  text,
    address_city          text,
    address_state         text,
    address_zip_code      text,
    status                text NOT NULL DEFAULT 'active',                          -- active | inactive
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON operations.cinema_complexes TO frame24_app;

ALTER TABLE operations.cinema_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.cinema_complexes FORCE ROW LEVEL SECURITY;

CREATE POLICY complexes_isolation_policy ON operations.cinema_complexes
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

CREATE INDEX idx_complexes_tenant ON operations.cinema_complexes (tenant_id);

-- 4. Salas de Cinema (operations.rooms)
CREATE TABLE operations.rooms (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    complex_id        uuid NOT NULL REFERENCES operations.cinema_complexes(id) ON DELETE CASCADE,
    name              text NOT NULL,                                               -- ex: "Sala 1 VIP Dolby Atmos"
    room_number       int NOT NULL,
    ancine_room_code  text,                                                        -- Código ANCINE da Sala
    capacity          int NOT NULL DEFAULT 0,
    sound_system      text NOT NULL DEFAULT '7.1',                                 -- 5.1 | 7.1 | Dolby Atmos
    screen_type       text NOT NULL DEFAULT 'standard',                            -- standard | 3d | imax | macro_xe
    row_count         int NOT NULL DEFAULT 10,
    column_count      int NOT NULL DEFAULT 15,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE(complex_id, room_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON operations.rooms TO frame24_app;

ALTER TABLE operations.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.rooms FORCE ROW LEVEL SECURITY;

CREATE POLICY rooms_isolation_policy ON operations.rooms
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

CREATE INDEX idx_rooms_complex ON operations.rooms (complex_id);

-- 5. Assentos da Sala (operations.seats)
CREATE TABLE operations.seats (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    room_id       uuid NOT NULL REFERENCES operations.rooms(id) ON DELETE CASCADE,
    row_code      text NOT NULL,                                                   -- Fileira (A, B, C...)
    column_number int NOT NULL,                                                    -- Número do assento (1, 2, 3...)
    seat_type     text NOT NULL DEFAULT 'standard',                                -- standard | vip | dbox | wheelchair | reduced_mobility | companion
    status        text NOT NULL DEFAULT 'active',                                  -- active | maintenance | blocked
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE(room_id, row_code, column_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON operations.seats TO frame24_app;

ALTER TABLE operations.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.seats FORCE ROW LEVEL SECURITY;

CREATE POLICY seats_isolation_policy ON operations.seats
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

CREATE INDEX idx_seats_room ON operations.seats (room_id);

-- ==============================================================================
-- SCHEMA CATALOG (Filmes, Unidades de Medida, Produtos, Barcodes e Combos)
-- ==============================================================================

-- 6. Filmes (catalog.movies)
CREATE TABLE catalog.movies (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    title             text NOT NULL,                                               -- Título em Português
    original_title    text,                                                        -- Título Original
    duration_minutes  int NOT NULL,                                                -- Duração em minutos
    rating            text NOT NULL DEFAULT 'L',                                   -- L | 10 | 12 | 14 | 16 | 18
    synopsis          text,
    poster_url        text,
    backdrop_url      text,
    trailer_url       text,
    distributor       text,                                                        -- Distribuidora (Warner, Disney, etc.)
    ancine_cpb_crt    text,                                                        -- Registro ANCINE (CPB/CRT)
    release_date      date,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON catalog.movies TO frame24_app;

ALTER TABLE catalog.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.movies FORCE ROW LEVEL SECURITY;

CREATE POLICY movies_isolation_policy ON catalog.movies
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

CREATE INDEX idx_movies_tenant ON catalog.movies (tenant_id);

-- 7. Unidades de Medida (catalog.product_units)
CREATE TABLE catalog.product_units (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    name              text NOT NULL,                                               -- ex: "Caixa com 24", "Unidade", "Quilo"
    acronym           text NOT NULL,                                               -- ex: CX24, UN, KG, LT, PCT
    is_base_unit      boolean NOT NULL DEFAULT false,                              -- Se é a unidade base de estoque
    base_unit_id      uuid REFERENCES catalog.product_units(id) ON DELETE SET NULL, -- Unidade pai para conversão
    conversion_factor numeric(12,4) NOT NULL DEFAULT 1.0000,                       -- Fator de multiplicação em relação à base
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, acronym)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON catalog.product_units TO frame24_app;

ALTER TABLE catalog.product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_units FORCE ROW LEVEL SECURITY;

CREATE POLICY product_units_isolation_policy ON catalog.product_units
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

-- 8. Produtos da Bomboniere / Estoque (catalog.products)
CREATE TABLE catalog.products (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    name              text NOT NULL,
    description       text,
    category          text NOT NULL DEFAULT 'snack',                              -- popcorn | beverage | candy | combo | merch | service
    base_unit_id      uuid NOT NULL REFERENCES catalog.product_units(id),
    ncm               text,                                                        -- Nomenclatura Comum do Mercosul (8 digitos)
    cest              text,                                                        -- Código Especificador da Substituição Tributária (7 digitos)
    cost_price        numeric(12,4) NOT NULL DEFAULT 0.0000,                       -- Preço de custo médio
    sale_price        numeric(12,2) NOT NULL DEFAULT 0.00,                         -- Preço de venda padrão
    is_active         boolean NOT NULL DEFAULT true,
    is_combo          boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON catalog.products TO frame24_app;

ALTER TABLE catalog.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.products FORCE ROW LEVEL SECURITY;

CREATE POLICY products_isolation_policy ON catalog.products
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

CREATE INDEX idx_products_tenant ON catalog.products (tenant_id);

-- 9. Códigos de Barra por Unidade de Medida (catalog.product_barcodes)
CREATE TABLE catalog.product_barcodes (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    product_id    uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    unit_id       uuid NOT NULL REFERENCES catalog.product_units(id),
    barcode       text NOT NULL,                                                   -- EAN-13, EAN-8, Código Interno
    is_primary    boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, barcode)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON catalog.product_barcodes TO frame24_app;

ALTER TABLE catalog.product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.product_barcodes FORCE ROW LEVEL SECURITY;

CREATE POLICY barcodes_isolation_policy ON catalog.product_barcodes
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

-- 10. Combos e Itens de Combo (catalog.combos & catalog.combo_items)
CREATE TABLE catalog.combos (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    product_id    uuid NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE, -- Produto pai que representa o combo
    name          text NOT NULL,
    combo_price   numeric(12,2) NOT NULL,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON catalog.combos TO frame24_app;

ALTER TABLE catalog.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.combos FORCE ROW LEVEL SECURITY;

CREATE POLICY combos_isolation_policy ON catalog.combos
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

CREATE TABLE catalog.combo_items (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    combo_id          uuid NOT NULL REFERENCES catalog.combos(id) ON DELETE CASCADE,
    group_name        text NOT NULL,                                               -- ex: "Escolha a Pipoca", "Escolha a Bebida"
    product_id        uuid NOT NULL REFERENCES catalog.products(id),
    unit_id           uuid NOT NULL REFERENCES catalog.product_units(id),
    quantity          numeric(12,4) NOT NULL DEFAULT 1.0000,
    additional_price  numeric(12,2) NOT NULL DEFAULT 0.00                        -- Adicional de preço para upgrade (ex: + R$ 3,00)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON catalog.combo_items TO frame24_app;

ALTER TABLE catalog.combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.combo_items FORCE ROW LEVEL SECURITY;

CREATE POLICY combo_items_isolation_policy ON catalog.combo_items
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

-- ==============================================================================
-- RETORNO AO OPERATIONS: SESSÕES COM EXCLUSION CONSTRAINT GIST
-- ==============================================================================

-- 11. Sessões de Cinema (operations.showtimes)
CREATE TABLE operations.showtimes (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
    complex_id         uuid NOT NULL REFERENCES operations.cinema_complexes(id) ON DELETE CASCADE,
    room_id            uuid NOT NULL REFERENCES operations.rooms(id) ON DELETE CASCADE,
    movie_id           uuid NOT NULL REFERENCES catalog.movies(id) ON DELETE CASCADE,
    audio_type         text NOT NULL DEFAULT 'DUB',                                -- DUB | LEG | ORIG | NAC
    projection_type    text NOT NULL DEFAULT '2D',                                 -- 2D | 3D | IMAX | 4DX
    start_time         timestamptz NOT NULL,
    end_time           timestamptz NOT NULL,
    cleaning_minutes   int NOT NULL DEFAULT 15,
    base_ticket_price  numeric(12,2) NOT NULL DEFAULT 0.00,
    status             text NOT NULL DEFAULT 'scheduled',                          -- scheduled | open_for_sale | in_progress | finished | canceled
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_showtime_end_after_start CHECK (end_time > start_time)
);

-- Constraint de exclusão temporal GiST: impede atômica e nativamente no banco 2 sessões sobrepostas na mesma sala
ALTER TABLE operations.showtimes ADD CONSTRAINT no_overlapping_showtimes_per_room
    EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_time, end_time + (cleaning_minutes || ' minutes')::interval, '[)') WITH &&
    ) WHERE (status != 'canceled');

GRANT SELECT, INSERT, UPDATE, DELETE ON operations.showtimes TO frame24_app;

ALTER TABLE operations.showtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations.showtimes FORCE ROW LEVEL SECURITY;

CREATE POLICY showtimes_isolation_policy ON operations.showtimes
    AS RESTRICTIVE
    USING (tenant_id = current_tenant())
    WITH CHECK (tenant_id = current_tenant());

CREATE INDEX idx_showtimes_room_time ON operations.showtimes (room_id, start_time);
CREATE INDEX idx_showtimes_movie ON operations.showtimes (movie_id);
