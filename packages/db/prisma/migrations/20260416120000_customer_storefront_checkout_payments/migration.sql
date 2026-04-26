-- Stable storefront slugs for tenant-scoped cinema sites.
ALTER TABLE "operations"."cinema_complexes"
ADD COLUMN IF NOT EXISTS "slug" VARCHAR(200),
ADD COLUMN IF NOT EXISTS "city_slug" VARCHAR(120);

UPDATE "operations"."cinema_complexes"
SET
  "slug" = COALESCE(
    NULLIF("slug", ''),
    CONCAT(
      TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')),
      '-',
      SUBSTRING("id" FROM 1 FOR 8)
    )
  ),
  "city_slug" = COALESCE(
    NULLIF("city_slug", ''),
    NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE("city", 'cidade')), '[^a-z0-9]+', '-', 'g')), '')
  );

CREATE UNIQUE INDEX IF NOT EXISTS "cinema_complexes_company_id_slug_key"
ON "operations"."cinema_complexes" ("company_id", "slug");

CREATE INDEX IF NOT EXISTS "cinema_complexes_company_id_city_slug_idx"
ON "operations"."cinema_complexes" ("company_id", "city_slug");

ALTER TABLE "catalog"."movies"
DROP CONSTRAINT IF EXISTS "movies_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "movies_company_id_slug_key"
ON "catalog"."movies" ("company_id", "slug");

CREATE TABLE IF NOT EXISTS "sales"."checkout_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "tenant_slug" VARCHAR(50) NOT NULL,
  "showtime_id" TEXT NOT NULL,
  "cinema_complex_id" TEXT NOT NULL,
  "reservation_uuid" VARCHAR(100) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
  "fiscal_cpf" VARCHAR(14),
  "promotion_code" VARCHAR(100),
  "subtotal_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "expires_at" TIMESTAMP(0) NOT NULL,
  "metadata_json" TEXT,
  "sale_id" TEXT,
  "public_reference" VARCHAR(64),
  "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sales"."checkout_session_tickets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "checkout_session_id" TEXT NOT NULL,
  "showtime_id" TEXT NOT NULL,
  "seat_id" TEXT NOT NULL,
  "ticket_type" TEXT,
  "face_value" DECIMAL(10,2) NOT NULL,
  "service_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "total_amount" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkout_session_tickets_checkout_session_id_fkey"
    FOREIGN KEY ("checkout_session_id")
    REFERENCES "sales"."checkout_sessions"("id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "sales"."checkout_session_concessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "checkout_session_id" TEXT NOT NULL,
  "complex_id" TEXT NOT NULL,
  "item_type" "sales"."concession_item_type" NOT NULL,
  "item_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "total_price" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkout_session_concessions_checkout_session_id_fkey"
    FOREIGN KEY ("checkout_session_id")
    REFERENCES "sales"."checkout_sessions"("id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "sales"."payment_attempts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "checkout_session_id" TEXT NOT NULL,
  "sale_id" TEXT,
  "provider" VARCHAR(50) NOT NULL DEFAULT 'internal',
  "method" VARCHAR(30) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
  "provider_reference" VARCHAR(120) NOT NULL UNIQUE,
  "idempotency_key" VARCHAR(120),
  "payment_data_json" TEXT,
  "error_code" VARCHAR(80),
  "error_message" TEXT,
  "paid_at" TIMESTAMP(0),
  "expires_at" TIMESTAMP(0),
  "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_attempts_checkout_session_id_fkey"
    FOREIGN KEY ("checkout_session_id")
    REFERENCES "sales"."checkout_sessions"("id")
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "sales"."payment_webhook_events" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" VARCHAR(50) NOT NULL,
  "external_event_id" VARCHAR(160) NOT NULL,
  "provider_reference" VARCHAR(120),
  "status" VARCHAR(30) NOT NULL DEFAULT 'received',
  "payload_json" TEXT NOT NULL,
  "error_message" TEXT,
  "processed_at" TIMESTAMP(0),
  "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_webhook_events_provider_external_event_id_key"
    UNIQUE ("provider", "external_event_id")
);

CREATE TABLE IF NOT EXISTS "sales"."refund_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'requested',
  "reason" TEXT,
  "requested_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(0),
  "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sales"."refund_request_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "refund_request_id" TEXT NOT NULL,
  "item_type" VARCHAR(30) NOT NULL,
  "item_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "requested_quantity" INTEGER NOT NULL DEFAULT 1,
  "eligibility_json" TEXT,
  "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_request_items_refund_request_id_fkey"
    FOREIGN KEY ("refund_request_id")
    REFERENCES "sales"."refund_requests"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "checkout_session_tickets_checkout_session_id_seat_id_key"
ON "sales"."checkout_session_tickets" ("checkout_session_id", "seat_id");

CREATE INDEX IF NOT EXISTS "checkout_sessions_company_id_idx" ON "sales"."checkout_sessions" ("company_id");
CREATE INDEX IF NOT EXISTS "checkout_sessions_customer_id_idx" ON "sales"."checkout_sessions" ("customer_id");
CREATE INDEX IF NOT EXISTS "checkout_sessions_showtime_id_idx" ON "sales"."checkout_sessions" ("showtime_id");
CREATE INDEX IF NOT EXISTS "checkout_sessions_reservation_uuid_idx" ON "sales"."checkout_sessions" ("reservation_uuid");
CREATE INDEX IF NOT EXISTS "checkout_sessions_status_idx" ON "sales"."checkout_sessions" ("status");
CREATE INDEX IF NOT EXISTS "checkout_sessions_sale_id_idx" ON "sales"."checkout_sessions" ("sale_id");
CREATE INDEX IF NOT EXISTS "checkout_sessions_public_reference_idx" ON "sales"."checkout_sessions" ("public_reference");
CREATE INDEX IF NOT EXISTS "checkout_session_tickets_showtime_id_idx" ON "sales"."checkout_session_tickets" ("showtime_id");
CREATE INDEX IF NOT EXISTS "checkout_session_tickets_ticket_type_idx" ON "sales"."checkout_session_tickets" ("ticket_type");
CREATE INDEX IF NOT EXISTS "checkout_session_concessions_checkout_session_id_idx" ON "sales"."checkout_session_concessions" ("checkout_session_id");
CREATE INDEX IF NOT EXISTS "checkout_session_concessions_complex_id_idx" ON "sales"."checkout_session_concessions" ("complex_id");
CREATE INDEX IF NOT EXISTS "checkout_session_concessions_item_type_item_id_idx" ON "sales"."checkout_session_concessions" ("item_type", "item_id");
CREATE INDEX IF NOT EXISTS "payment_attempts_checkout_session_id_idx" ON "sales"."payment_attempts" ("checkout_session_id");
CREATE INDEX IF NOT EXISTS "payment_attempts_sale_id_idx" ON "sales"."payment_attempts" ("sale_id");
CREATE INDEX IF NOT EXISTS "payment_attempts_provider_status_idx" ON "sales"."payment_attempts" ("provider", "status");
CREATE INDEX IF NOT EXISTS "payment_attempts_idempotency_key_idx" ON "sales"."payment_attempts" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_provider_reference_idx" ON "sales"."payment_webhook_events" ("provider_reference");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_status_idx" ON "sales"."payment_webhook_events" ("status");
CREATE INDEX IF NOT EXISTS "refund_requests_company_id_idx" ON "sales"."refund_requests" ("company_id");
CREATE INDEX IF NOT EXISTS "refund_requests_customer_id_idx" ON "sales"."refund_requests" ("customer_id");
CREATE INDEX IF NOT EXISTS "refund_requests_order_id_idx" ON "sales"."refund_requests" ("order_id");
CREATE INDEX IF NOT EXISTS "refund_requests_status_idx" ON "sales"."refund_requests" ("status");
CREATE INDEX IF NOT EXISTS "refund_request_items_refund_request_id_idx" ON "sales"."refund_request_items" ("refund_request_id");
CREATE INDEX IF NOT EXISTS "refund_request_items_item_type_item_id_idx" ON "sales"."refund_request_items" ("item_type", "item_id");
