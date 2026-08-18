CREATE TABLE "contracts"."exhibition_contract_sliding_scales" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "distributor_percentage" DECIMAL(5,2) NOT NULL,
    "exhibitor_percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exhibition_contract_sliding_scales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exhibition_contract_sliding_scales_contract_id_week_number_key"
    ON "contracts"."exhibition_contract_sliding_scales"("contract_id", "week_number");

CREATE INDEX "exhibition_contract_sliding_scales_contract_id_idx"
    ON "contracts"."exhibition_contract_sliding_scales"("contract_id");

ALTER TABLE "contracts"."exhibition_contract_sliding_scales"
    ADD CONSTRAINT "exhibition_contract_sliding_scales_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"."exhibition_contracts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

