ALTER TABLE "sales"."payment_methods"
ADD COLUMN "auto_settle" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "sales"."sales_public_reference_idx";
DROP INDEX IF EXISTS "identity"."user_sessions_session_id_idx";

CREATE INDEX IF NOT EXISTS "idx_user_sessions_validation"
ON "identity"."user_sessions"(
  "identity_id",
  "company_id",
  "session_context",
  "active",
  "revoked",
  "expires_at"
);

CREATE INDEX IF NOT EXISTS "idx_exhibition_contract_active_lookup"
ON "contracts"."exhibition_contracts"(
  "movie_id",
  "cinema_complex_id",
  "active",
  "start_date",
  "end_date"
);
