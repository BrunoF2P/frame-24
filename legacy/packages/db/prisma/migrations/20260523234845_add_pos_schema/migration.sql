-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pos";

-- DropForeignKey
ALTER TABLE "sales"."checkout_session_concessions" DROP CONSTRAINT "checkout_session_concessions_checkout_session_id_fkey";

-- DropForeignKey
ALTER TABLE "sales"."checkout_session_tickets" DROP CONSTRAINT "checkout_session_tickets_checkout_session_id_fkey";

-- DropForeignKey
ALTER TABLE "sales"."payment_attempts" DROP CONSTRAINT "payment_attempts_checkout_session_id_fkey";

-- DropForeignKey
ALTER TABLE "sales"."refund_request_items" DROP CONSTRAINT "refund_request_items_refund_request_id_fkey";

-- DropIndex
DROP INDEX "catalog"."movies_slug_key";

-- DropIndex
DROP INDEX "finance"."contingency_reserves_status_idx";

-- DropIndex
DROP INDEX "identity"."companies_active_idx";

-- DropIndex
DROP INDEX "identity"."companies_suspended_idx";

-- AlterTable
ALTER TABLE "sales"."checkout_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."payment_attempts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."refund_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "pos"."pos_session_status" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_session_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_payment_methods" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "requires_change" BOOLEAN DEFAULT false,
    "auto_settle" BOOLEAN NOT NULL DEFAULT true,
    "settlement_days" INTEGER DEFAULT 0,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_sessions" (
    "id" TEXT NOT NULL DEFAULT 0,
    "company_id" TEXT NOT NULL,
    "cinema_complex_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "session_number" VARCHAR(50) NOT NULL,
    "opening_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cash_withdrawn" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cash_counted" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "total_sales_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_sales_count" INTEGER NOT NULL DEFAULT 0,
    "total_refunds_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_refunds_count" INTEGER NOT NULL DEFAULT 0,
    "total_discounts_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_received_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_change_given" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "opened_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(0),
    "closing_notes" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos"."pos_transactions" (
    "id" TEXT NOT NULL DEFAULT 0,
    "pos_session_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "company_id" TEXT NOT NULL,
    "cinema_complex_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "transaction_type" VARCHAR(30) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "change_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "description" TEXT,
    "reference_type" VARCHAR(50),
    "reference_id" VARCHAR(100),
    "performed_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_session_status_company_id_idx" ON "pos"."pos_session_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_session_status_company_id_name_key" ON "pos"."pos_session_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "pos_payment_methods_company_id_idx" ON "pos"."pos_payment_methods"("company_id");

-- CreateIndex
CREATE INDEX "pos_payment_methods_active_idx" ON "pos"."pos_payment_methods"("active");

-- CreateIndex
CREATE UNIQUE INDEX "pos_payment_methods_company_id_name_key" ON "pos"."pos_payment_methods"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sessions_session_number_key" ON "pos"."pos_sessions"("session_number");

-- CreateIndex
CREATE INDEX "pos_sessions_company_id_idx" ON "pos"."pos_sessions"("company_id");

-- CreateIndex
CREATE INDEX "pos_sessions_cinema_complex_id_idx" ON "pos"."pos_sessions"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "pos_sessions_operator_id_idx" ON "pos"."pos_sessions"("operator_id");

-- CreateIndex
CREATE INDEX "pos_sessions_status_idx" ON "pos"."pos_sessions"("status");

-- CreateIndex
CREATE INDEX "pos_sessions_opened_at_idx" ON "pos"."pos_sessions"("opened_at");

-- CreateIndex
CREATE INDEX "pos_sessions_company_id_status_idx" ON "pos"."pos_sessions"("company_id", "status");

-- CreateIndex
CREATE INDEX "pos_sessions_cinema_complex_id_opened_at_idx" ON "pos"."pos_sessions"("cinema_complex_id", "opened_at");

-- CreateIndex
CREATE INDEX "pos_sessions_operator_id_opened_at_idx" ON "pos"."pos_sessions"("operator_id", "opened_at");

-- CreateIndex
CREATE INDEX "pos_transactions_pos_session_id_idx" ON "pos"."pos_transactions"("pos_session_id");

-- CreateIndex
CREATE INDEX "pos_transactions_sale_id_idx" ON "pos"."pos_transactions"("sale_id");

-- CreateIndex
CREATE INDEX "pos_transactions_company_id_idx" ON "pos"."pos_transactions"("company_id");

-- CreateIndex
CREATE INDEX "pos_transactions_cinema_complex_id_idx" ON "pos"."pos_transactions"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "pos_transactions_operator_id_idx" ON "pos"."pos_transactions"("operator_id");

-- CreateIndex
CREATE INDEX "pos_transactions_transaction_type_idx" ON "pos"."pos_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "pos_transactions_payment_method_idx" ON "pos"."pos_transactions"("payment_method");

-- CreateIndex
CREATE INDEX "pos_transactions_performed_at_idx" ON "pos"."pos_transactions"("performed_at");

-- CreateIndex
CREATE INDEX "pos_transactions_reference_type_reference_id_idx" ON "pos"."pos_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "payable_transactions_account_payable_id_idx" ON "finance"."payable_transactions"("account_payable_id");

-- CreateIndex
CREATE INDEX "payable_transactions_transaction_date_idx" ON "finance"."payable_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "payable_transactions_bank_account_id_idx" ON "finance"."payable_transactions"("bank_account_id");

-- CreateIndex
CREATE INDEX "receivable_transactions_account_receivable_id_idx" ON "finance"."receivable_transactions"("account_receivable_id");

-- CreateIndex
CREATE INDEX "receivable_transactions_transaction_date_idx" ON "finance"."receivable_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "receivable_transactions_bank_account_id_idx" ON "finance"."receivable_transactions"("bank_account_id");

-- CreateIndex
CREATE INDEX "companies_active_suspended_idx" ON "identity"."companies"("active", "suspended");

-- CreateIndex
CREATE INDEX "idx_showtime_overlap_check" ON "operations"."showtime_schedule"("room_id", "start_time", "end_time");

-- AddForeignKey
ALTER TABLE "finance"."contingency_reserves" ADD CONSTRAINT "contingency_reserves_contingency_type_fkey" FOREIGN KEY ("contingency_type") REFERENCES "finance"."contingency_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."contingency_reserves" ADD CONSTRAINT "contingency_reserves_status_fkey" FOREIGN KEY ("status") REFERENCES "finance"."contingency_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."checkout_session_tickets" ADD CONSTRAINT "checkout_session_tickets_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "sales"."checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."checkout_session_concessions" ADD CONSTRAINT "checkout_session_concessions_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "sales"."checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."payment_attempts" ADD CONSTRAINT "payment_attempts_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "sales"."checkout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."refund_request_items" ADD CONSTRAINT "refund_request_items_refund_request_id_fkey" FOREIGN KEY ("refund_request_id") REFERENCES "sales"."refund_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."pos_sessions" ADD CONSTRAINT "pos_sessions_status_fkey" FOREIGN KEY ("status") REFERENCES "pos"."pos_session_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."pos_transactions" ADD CONSTRAINT "pos_transactions_pos_session_id_fkey" FOREIGN KEY ("pos_session_id") REFERENCES "pos"."pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos"."pos_transactions" ADD CONSTRAINT "pos_transactions_payment_method_fkey" FOREIGN KEY ("payment_method") REFERENCES "pos"."pos_payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
