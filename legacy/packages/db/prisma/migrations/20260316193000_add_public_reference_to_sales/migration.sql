ALTER TABLE "sales"."sales"
ADD COLUMN "public_reference" VARCHAR(64);

UPDATE "sales"."sales"
SET "public_reference" = md5(random()::text || clock_timestamp()::text || id)
WHERE "public_reference" IS NULL;

ALTER TABLE "sales"."sales"
ALTER COLUMN "public_reference" SET NOT NULL;

CREATE UNIQUE INDEX "sales_public_reference_key"
ON "sales"."sales"("public_reference");

CREATE INDEX "sales_public_reference_idx"
ON "sales"."sales"("public_reference");
