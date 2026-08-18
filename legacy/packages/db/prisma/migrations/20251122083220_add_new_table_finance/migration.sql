/*
  Warnings:

  - You are about to drop the `exhibition_contract_terms` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "contracts"."exhibition_contract_terms" DROP CONSTRAINT "exhibition_contract_terms_contract_id_fkey";

-- AlterTable
ALTER TABLE "contracts"."exhibition_contract_sliding_scales" ALTER COLUMN "id" SET DEFAULT '',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(0);

-- DropTable
DROP TABLE "contracts"."exhibition_contract_terms";

-- CreateTable
CREATE TABLE "finance"."bank_accounts" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "bank_code" VARCHAR(10),
    "agency" VARCHAR(20) NOT NULL,
    "agency_digit" VARCHAR(2),
    "account_number" VARCHAR(20) NOT NULL,
    "account_digit" VARCHAR(2),
    "account_type" VARCHAR(20) NOT NULL,
    "initial_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "active" BOOLEAN DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."cash_flow_entries" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "cinema_complex_id" TEXT,
    "bank_account_id" TEXT NOT NULL,
    "entry_type" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "entry_date" DATE NOT NULL,
    "competence_date" DATE,
    "description" TEXT NOT NULL,
    "document_number" VARCHAR(50),
    "source_type" VARCHAR(50),
    "source_id" TEXT,
    "counterpart_type" VARCHAR(50),
    "counterpart_id" TEXT,
    "status" VARCHAR(20),
    "reconciled" BOOLEAN DEFAULT false,
    "reconciled_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "cash_flow_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."bank_reconciliations" (
    "id" TEXT NOT NULL DEFAULT '',
    "bank_account_id" TEXT NOT NULL,
    "reference_month" DATE NOT NULL,
    "opening_balance" DECIMAL(15,2) NOT NULL,
    "closing_balance" DECIMAL(15,2) NOT NULL,
    "bank_statement_balance" DECIMAL(15,2) NOT NULL,
    "total_receipts" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "total_payments" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "pending_receipts" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "pending_payments" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "reconciled_balance" DECIMAL(15,2) NOT NULL,
    "difference" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "status" VARCHAR(20),
    "notes" TEXT,
    "reconciled_by" TEXT,
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_accounts_company_id_idx" ON "finance"."bank_accounts"("company_id");

-- CreateIndex
CREATE INDEX "bank_accounts_active_idx" ON "finance"."bank_accounts"("active");

-- CreateIndex
CREATE INDEX "cash_flow_entries_company_id_idx" ON "finance"."cash_flow_entries"("company_id");

-- CreateIndex
CREATE INDEX "cash_flow_entries_bank_account_id_idx" ON "finance"."cash_flow_entries"("bank_account_id");

-- CreateIndex
CREATE INDEX "cash_flow_entries_entry_date_idx" ON "finance"."cash_flow_entries"("entry_date");

-- CreateIndex
CREATE INDEX "cash_flow_entries_entry_type_idx" ON "finance"."cash_flow_entries"("entry_type");

-- CreateIndex
CREATE INDEX "cash_flow_entries_category_idx" ON "finance"."cash_flow_entries"("category");

-- CreateIndex
CREATE INDEX "cash_flow_entries_status_idx" ON "finance"."cash_flow_entries"("status");

-- CreateIndex
CREATE INDEX "cash_flow_entries_source_type_source_id_idx" ON "finance"."cash_flow_entries"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "bank_reconciliations_bank_account_id_idx" ON "finance"."bank_reconciliations"("bank_account_id");

-- CreateIndex
CREATE INDEX "bank_reconciliations_reference_month_idx" ON "finance"."bank_reconciliations"("reference_month");

-- CreateIndex
CREATE INDEX "bank_reconciliations_status_idx" ON "finance"."bank_reconciliations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_reconciliations_bank_account_id_reference_month_key" ON "finance"."bank_reconciliations"("bank_account_id", "reference_month");

-- AddForeignKey
ALTER TABLE "finance"."cash_flow_entries" ADD CONSTRAINT "cash_flow_entries_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "finance"."bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."bank_reconciliations" ADD CONSTRAINT "bank_reconciliations_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "finance"."bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
