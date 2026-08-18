-- 1) Garantir que cada empresa com vendas sem payment_method tenha pelo menos
-- um método de pagamento padrão para backfill
INSERT INTO "sales"."payment_methods" (
  "id",
  "company_id",
  "name",
  "description",
  "operator_fee",
  "settlement_days",
  "auto_settle",
  "created_at"
)
SELECT
  CONCAT('pm_migrated_', base.company_id),
  base.company_id,
  'AUTO_MIGRADO',
  'Criado automaticamente para backfill de payment_method em vendas legadas',
  0.00,
  0,
  true,
  NOW()
FROM (
  SELECT DISTINCT cc.company_id
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.payment_method IS NULL
) base
ON CONFLICT ("company_id", "name") DO NOTHING;

-- 2) Escolher método de pagamento padrão por empresa
WITH company_default_payment AS (
  SELECT
    pm.company_id,
    pm.id AS payment_method_id,
    ROW_NUMBER() OVER (
      PARTITION BY pm.company_id
      ORDER BY
        pm.auto_settle DESC,
        pm.created_at ASC NULLS LAST,
        pm.id ASC
    ) AS rn
  FROM "sales"."payment_methods" pm
),
sales_with_company AS (
  SELECT
    s.id AS sale_id,
    cc.company_id
  FROM "sales"."sales" s
  INNER JOIN "operations"."cinema_complexes" cc
    ON cc.id = s.cinema_complex_id
  WHERE s.payment_method IS NULL
)
UPDATE "sales"."sales" s
SET payment_method = d.payment_method_id
FROM sales_with_company swc
INNER JOIN company_default_payment d
  ON d.company_id = swc.company_id
 AND d.rn = 1
WHERE s.id = swc.sale_id
  AND s.payment_method IS NULL;

-- 3) Segurança: abortar migration se ainda restar valor nulo
DO $$
DECLARE
  remaining_nulls INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_nulls
  FROM "sales"."sales"
  WHERE payment_method IS NULL;

  IF remaining_nulls > 0 THEN
    RAISE EXCEPTION 'Backfill incompleto: % vendas continuam com payment_method NULL', remaining_nulls;
  END IF;
END $$;

-- 4) Tornar obrigatório no banco
ALTER TABLE "sales"."sales"
ALTER COLUMN "payment_method" SET NOT NULL;

-- 5) Índice para consultas/joins por método de pagamento
CREATE INDEX IF NOT EXISTS "sales_payment_method_idx"
ON "sales"."sales" ("payment_method");
