-- CreateTable
CREATE TABLE "finance"."accounts_receivable" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "cinema_complex_id" TEXT,
    "customer_id" TEXT,
    "sale_id" TEXT,
    "document_number" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "competence_date" DATE NOT NULL,
    "original_amount" DECIMAL(15,2) NOT NULL,
    "interest_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "penalty_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "remaining_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."accounts_payable" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "cinema_complex_id" TEXT,
    "supplier_id" TEXT,
    "source_type" TEXT,
    "source_id" TEXT,
    "document_number" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "competence_date" DATE NOT NULL,
    "original_amount" DECIMAL(15,2) NOT NULL,
    "interest_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "penalty_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "remaining_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."receivable_transactions" (
    "id" TEXT NOT NULL DEFAULT '',
    "account_receivable_id" TEXT NOT NULL,
    "transaction_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "bank_account_id" TEXT,
    "payment_method" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."payable_transactions" (
    "id" TEXT NOT NULL DEFAULT '',
    "account_payable_id" TEXT NOT NULL,
    "transaction_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "bank_account_id" TEXT,
    "payment_method" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payable_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_receivable_company_id_idx" ON "finance"."accounts_receivable"("company_id");

-- CreateIndex
CREATE INDEX "accounts_receivable_due_date_idx" ON "finance"."accounts_receivable"("due_date");

-- CreateIndex
CREATE INDEX "accounts_receivable_status_idx" ON "finance"."accounts_receivable"("status");

-- CreateIndex
CREATE INDEX "accounts_receivable_customer_id_idx" ON "finance"."accounts_receivable"("customer_id");

-- CreateIndex
CREATE INDEX "accounts_payable_company_id_idx" ON "finance"."accounts_payable"("company_id");

-- CreateIndex
CREATE INDEX "accounts_payable_due_date_idx" ON "finance"."accounts_payable"("due_date");

-- CreateIndex
CREATE INDEX "accounts_payable_status_idx" ON "finance"."accounts_payable"("status");

-- CreateIndex
CREATE INDEX "accounts_payable_supplier_id_idx" ON "finance"."accounts_payable"("supplier_id");

-- AddForeignKey
ALTER TABLE "finance"."receivable_transactions" ADD CONSTRAINT "receivable_transactions_account_receivable_id_fkey" FOREIGN KEY ("account_receivable_id") REFERENCES "finance"."accounts_receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."payable_transactions" ADD CONSTRAINT "payable_transactions_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "finance"."accounts_payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
