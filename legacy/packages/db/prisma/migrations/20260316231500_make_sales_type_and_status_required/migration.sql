-- 1) Garantir tipos de venda padrão para empresas com dados legados
INSERT INTO "sales"."sale_types" (
  "id",
  "company_id",
  "name",
  "description",
  "convenience_fee",
  "created_at"
)
SELECT
  CONCAT('st_migr_balcao_', base.company_id),
  base.company_id,
  'Balcão',
  'Criado automaticamente para backfill de sale_type',
  0.00,
  NOW()
FROM (
  SELECT DISTINCT cc.company_id
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.sale_type IS NULL
) base
ON CONFLICT ("company_id", "name") DO NOTHING;

INSERT INTO "sales"."sale_types" (
  "id",
  "company_id",
  "name",
  "description",
  "convenience_fee",
  "created_at"
)
SELECT
  CONCAT('st_migr_online_', base.company_id),
  base.company_id,
  'Online',
  'Criado automaticamente para backfill de sale_type',
  0.00,
  NOW()
FROM (
  SELECT DISTINCT cc.company_id
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.sale_type IS NULL
) base
ON CONFLICT ("company_id", "name") DO NOTHING;

-- 2) Garantir status padrão para empresas com dados legados
INSERT INTO "sales"."sale_status" (
  "id",
  "company_id",
  "name",
  "description",
  "allows_modification",
  "created_at"
)
SELECT
  CONCAT('ss_migr_pendente_', base.company_id),
  base.company_id,
  'Pendente',
  'Criado automaticamente para backfill de status',
  true,
  NOW()
FROM (
  SELECT DISTINCT cc.company_id
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.status IS NULL
) base
ON CONFLICT ("company_id", "name") DO NOTHING;

INSERT INTO "sales"."sale_status" (
  "id",
  "company_id",
  "name",
  "description",
  "allows_modification",
  "created_at"
)
SELECT
  CONCAT('ss_migr_confirmada_', base.company_id),
  base.company_id,
  'Confirmada',
  'Criado automaticamente para backfill de status',
  false,
  NOW()
FROM (
  SELECT DISTINCT cc.company_id
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.status IS NULL
) base
ON CONFLICT ("company_id", "name") DO NOTHING;

INSERT INTO "sales"."sale_status" (
  "id",
  "company_id",
  "name",
  "description",
  "allows_modification",
  "created_at"
)
SELECT
  CONCAT('ss_migr_cancelada_', base.company_id),
  base.company_id,
  'Cancelada',
  'Criado automaticamente para backfill de status',
  false,
  NOW()
FROM (
  SELECT DISTINCT cc.company_id
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.status IS NULL
) base
ON CONFLICT ("company_id", "name") DO NOTHING;

-- 3) Backfill de sale_type (heurística: venda de cliente sem user_id => Online, demais => Balcão)
WITH sales_with_company AS (
  SELECT
    s.id AS sale_id,
    cc.company_id,
    CASE
      WHEN s.user_id IS NULL THEN 'Online'
      ELSE 'Balcão'
    END AS target_sale_type_name
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.sale_type IS NULL
)
UPDATE "sales"."sales" s
SET sale_type = st.id
FROM sales_with_company swc
INNER JOIN "sales"."sale_types" st
  ON st.company_id = swc.company_id
 AND st.name = swc.target_sale_type_name
WHERE s.id = swc.sale_id
  AND s.sale_type IS NULL;

-- 4) Backfill de status (cancelada, confirmada ou pendente)
WITH sales_status_target AS (
  SELECT
    s.id AS sale_id,
    cc.company_id,
    CASE
      WHEN s.cancellation_date IS NOT NULL THEN 'Cancelada'
      WHEN COALESCE(pm.auto_settle, true) THEN 'Confirmada'
      ELSE 'Pendente'
    END AS target_status_name
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  LEFT JOIN "sales"."payment_methods" pm
    ON pm.id = s.payment_method
  WHERE s.status IS NULL
)
UPDATE "sales"."sales" s
SET status = ss.id
FROM sales_status_target sst
INNER JOIN "sales"."sale_status" ss
  ON ss.company_id = sst.company_id
 AND ss.name = sst.target_status_name
WHERE s.id = sst.sale_id
  AND s.status IS NULL;

-- 5) Segurança: abortar se ainda houver nulls
DO $$
DECLARE
  remaining_null_sale_type INTEGER;
  remaining_null_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_null_sale_type
  FROM "sales"."sales"
  WHERE sale_type IS NULL;

  SELECT COUNT(*) INTO remaining_null_status
  FROM "sales"."sales"
  WHERE status IS NULL;

  IF remaining_null_sale_type > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % vendas continuam com sale_type NULL', remaining_null_sale_type;
  END IF;

  IF remaining_null_status > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % vendas continuam com status NULL', remaining_null_status;
  END IF;
END $$;

-- 6) Tornar obrigatório no banco
ALTER TABLE "sales"."sales"
ALTER COLUMN "sale_type" SET NOT NULL;

ALTER TABLE "sales"."sales"
ALTER COLUMN "status" SET NOT NULL;

-- 7) Índice adicional para consultas por tipo de venda
CREATE INDEX IF NOT EXISTS "sales_sale_type_idx"
ON "sales"."sales" ("sale_type");
