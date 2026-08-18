-- CreateTable
CREATE TABLE "contracts"."exhibition_contract_terms" (
    "id" TEXT NOT NULL DEFAULT '',
    "contract_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "distributor_percentage" DECIMAL(5,2) NOT NULL,
    "exhibitor_percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibition_contract_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exhibition_contract_terms_contract_id_idx" ON "contracts"."exhibition_contract_terms"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "exhibition_contract_terms_contract_id_week_number_key" ON "contracts"."exhibition_contract_terms"("contract_id", "week_number");

-- AddForeignKey
ALTER TABLE "contracts"."exhibition_contract_terms" ADD CONSTRAINT "exhibition_contract_terms_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"."exhibition_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
