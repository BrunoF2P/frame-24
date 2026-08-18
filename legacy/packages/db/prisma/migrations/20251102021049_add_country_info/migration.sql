-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "contracts";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "finance";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "hr";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "marketing";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "operations";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "projects";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sales";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "stock";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tax";

-- CreateEnum
CREATE TYPE "identity"."identity_type" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "identity"."company_plan_type" AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "identity"."session_context" AS ENUM ('EMPLOYEE', 'CUSTOMER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "crm"."customers_gender" AS ENUM ('NOT_INFORMED', 'MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "crm"."customer_points_movement_type" AS ENUM ('EARNED', 'SPENT', 'ADJUSTMENT', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "crm"."customer_preferences_preferred_position" AS ENUM ('FRONT', 'MIDDLE', 'BACK');

-- CreateEnum
CREATE TYPE "sales"."concession_item_type" AS ENUM ('PRODUCT', 'COMBO');

-- CreateTable
CREATE TABLE "identity"."companies" (
    "id" TEXT NOT NULL DEFAULT '',
    "corporate_name" VARCHAR(200) NOT NULL,
    "trade_name" VARCHAR(200),
    "cnpj" VARCHAR(18) NOT NULL,
    "zip_code" VARCHAR(10),
    "street_address" VARCHAR(300),
    "address_number" VARCHAR(20),
    "address_complement" VARCHAR(100),
    "neighborhood" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "country" VARCHAR(2) DEFAULT 'BR',
    "phone" VARCHAR(20),
    "mobile" VARCHAR(20),
    "email" VARCHAR(100),
    "website" VARCHAR(200),
    "state_registration" VARCHAR(20),
    "municipal_registration" VARCHAR(20),
    "tax_regime" TEXT,
    "pis_cofins_regime" TEXT,
    "recine_opt_in" BOOLEAN DEFAULT false,
    "recine_join_date" DATE,
    "tenant_slug" VARCHAR(50) NOT NULL,
    "logo_url" VARCHAR(500),
    "max_complexes" INTEGER DEFAULT 5,
    "max_employees" INTEGER DEFAULT 50,
    "max_storage_gb" INTEGER DEFAULT 10,
    "plan_type" "identity"."company_plan_type" NOT NULL DEFAULT 'BASIC',
    "plan_expires_at" DATE,
    "active" BOOLEAN DEFAULT true,
    "suspended" BOOLEAN DEFAULT false,
    "suspension_reason" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."persons" (
    "id" TEXT NOT NULL DEFAULT '',
    "cpf" VARCHAR(14),
    "passport_number" VARCHAR(50),
    "full_name" VARCHAR(200) NOT NULL,
    "birth_date" DATE,
    "phone" VARCHAR(20),
    "mobile" VARCHAR(20),
    "email" VARCHAR(100),
    "zip_code" VARCHAR(10),
    "street_address" VARCHAR(300),
    "address_number" VARCHAR(20),
    "address_complement" VARCHAR(100),
    "neighborhood" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(2),
    "country" VARCHAR(2) DEFAULT 'BR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."identities" (
    "id" TEXT NOT NULL DEFAULT '',
    "person_id" TEXT,
    "email" VARCHAR(100) NOT NULL,
    "external_id" VARCHAR(200),
    "identity_type" "identity"."identity_type" NOT NULL DEFAULT 'CUSTOMER',
    "password_hash" VARCHAR(255),
    "password_changed_at" TIMESTAMP(0),
    "password_expires_at" TIMESTAMP(0),
    "active" BOOLEAN DEFAULT true,
    "email_verified" BOOLEAN DEFAULT false,
    "email_verification_token" VARCHAR(100),
    "email_verification_expires_at" TIMESTAMP(0),
    "blocked_until" TIMESTAMP(0),
    "block_reason" TEXT,
    "failed_login_attempts" INTEGER DEFAULT 0,
    "last_failed_login" TIMESTAMP(0),
    "requires_2fa" BOOLEAN DEFAULT false,
    "secret_2fa" VARCHAR(100),
    "backup_codes_2fa" TEXT,
    "reset_token" VARCHAR(100),
    "reset_token_expires_at" TIMESTAMP(0),
    "last_login_date" TIMESTAMP(0),
    "last_login_ip" VARCHAR(45),
    "last_user_agent" VARCHAR(500),
    "login_count" INTEGER DEFAULT 0,
    "linked_identity_id" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."custom_roles" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "hierarchy_level" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."permissions" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "code" VARCHAR(150) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(50),
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."role_permissions" (
    "id" TEXT NOT NULL DEFAULT '',
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "conditions" TEXT,
    "granted_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."company_users" (
    "id" TEXT NOT NULL DEFAULT '',
    "identity_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "department" VARCHAR(100),
    "job_level" VARCHAR(50),
    "location" VARCHAR(100),
    "allowed_complexes" TEXT,
    "ip_whitelist" TEXT,
    "active" BOOLEAN DEFAULT true,
    "start_date" DATE DEFAULT CURRENT_TIMESTAMP,
    "end_date" DATE,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_access" TIMESTAMP(0),
    "access_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."user_attributes" (
    "id" TEXT NOT NULL DEFAULT '',
    "user_id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "data_type" VARCHAR(20),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT,

    CONSTRAINT "user_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."user_sessions" (
    "id" TEXT NOT NULL DEFAULT '',
    "identity_id" TEXT NOT NULL,
    "company_id" TEXT,
    "access_token_hash" VARCHAR(255) NOT NULL,
    "refresh_token_hash" VARCHAR(255),
    "session_id" VARCHAR(100) NOT NULL,
    "session_context" "identity"."session_context" NOT NULL,
    "expires_at" TIMESTAMP(0) NOT NULL,
    "last_activity" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "device_fingerprint" VARCHAR(255),
    "active" BOOLEAN DEFAULT true,
    "revoked" BOOLEAN DEFAULT false,
    "revoked_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."tax_regimes" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_regimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."pis_cofins_regimes" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "allows_credit" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pis_cofins_regimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."employment_contract_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_contract_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."departments" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "complex_id" TEXT NOT NULL,
    "manager_id" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "cost_center" VARCHAR(50),
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."positions" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "base_salary" DECIMAL(10,2),
    "weekly_hours" INTEGER DEFAULT 44,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr"."employees" (
    "id" TEXT NOT NULL DEFAULT '',
    "person_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "complex_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "work_email" VARCHAR(100),
    "hire_date" DATE NOT NULL,
    "termination_date" DATE,
    "contract_type" TEXT NOT NULL,
    "current_salary" DECIMAL(10,2) NOT NULL,
    "photo_url" VARCHAR(500),
    "address" TEXT,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."settlement_bases" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."distributor_settlements" (
    "id" TEXT NOT NULL DEFAULT '',
    "contract_id" TEXT NOT NULL,
    "distributor_id" TEXT NOT NULL,
    "cinema_complex_id" TEXT NOT NULL,
    "calculation_base" TEXT,
    "status" TEXT,
    "competence_start_date" DATE NOT NULL,
    "competence_end_date" DATE NOT NULL,
    "total_tickets_sold" INTEGER DEFAULT 0,
    "gross_box_office_revenue" DECIMAL(15,2) NOT NULL,
    "taxes_deducted_amount" DECIMAL(15,2) DEFAULT 0.00,
    "settlement_base_amount" DECIMAL(15,2) NOT NULL,
    "distributor_percentage" DECIMAL(5,2) NOT NULL,
    "calculated_settlement_amount" DECIMAL(15,2) NOT NULL,
    "minimum_guarantee" DECIMAL(15,2) DEFAULT 0.00,
    "final_settlement_amount" DECIMAL(15,2) NOT NULL,
    "deductions_amount" DECIMAL(15,2) DEFAULT 0.00,
    "net_settlement_amount" DECIMAL(15,2) NOT NULL,
    "irrf_rate" DECIMAL(5,2) DEFAULT 0.00,
    "irrf_calculation_base" DECIMAL(15,2) DEFAULT 0.00,
    "irrf_amount" DECIMAL(15,2) DEFAULT 0.00,
    "irrf_exempt" BOOLEAN DEFAULT false,
    "retained_iss_amount" DECIMAL(15,2) DEFAULT 0.00,
    "net_payment_amount" DECIMAL(15,2) NOT NULL,
    "calculation_date" DATE,
    "approval_date" DATE,
    "payment_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "distributor_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."distributor_settlement_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distributor_settlement_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."journal_entry_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."journal_entry_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "nature" VARCHAR(20),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."journal_entries" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "status" TEXT,
    "entry_type" TEXT,
    "origin_type" TEXT,
    "origin_id" TEXT,
    "entry_number" TEXT NOT NULL,
    "entry_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."journal_entry_items" (
    "id" TEXT NOT NULL DEFAULT '',
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "movement_type" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "item_description" TEXT,

    CONSTRAINT "journal_entry_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."account_natures" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_natures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."account_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."accounting_movement_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_movement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."chart_of_accounts" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "account_code" VARCHAR(20) NOT NULL,
    "account_name" VARCHAR(200) NOT NULL,
    "account_type" TEXT,
    "account_nature" TEXT,
    "parent_account_id" TEXT,
    "level" INTEGER NOT NULL,
    "allows_entry" BOOLEAN DEFAULT true,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."monthly_income_statement" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "total_gross_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "sales_deductions" DECIMAL(15,2) DEFAULT 0.00,
    "net_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "cost_of_goods_sold" DECIMAL(15,2) DEFAULT 0.00,
    "distributor_payouts" DECIMAL(15,2) DEFAULT 0.00,
    "gross_profit" DECIMAL(15,2) DEFAULT 0.00,
    "administrative_expenses" DECIMAL(15,2) DEFAULT 0.00,
    "selling_expenses" DECIMAL(15,2) DEFAULT 0.00,
    "financial_expenses" DECIMAL(15,2) DEFAULT 0.00,
    "financial_income" DECIMAL(15,2) DEFAULT 0.00,
    "operational_result" DECIMAL(15,2) DEFAULT 0.00,
    "irpj_provision" DECIMAL(15,2) DEFAULT 0.00,
    "csll_provision" DECIMAL(15,2) DEFAULT 0.00,
    "net_result" DECIMAL(15,2) DEFAULT 0.00,
    "gross_margin_percent" DECIMAL(5,2),
    "net_margin_percent" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "monthly_income_statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."contingency_reserves" (
    "id" TEXT NOT NULL DEFAULT '',
    "complex_id" TEXT NOT NULL,
    "contingency_type" TEXT,
    "reserve_amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "inclusion_date" DATE NOT NULL,
    "clearance_date" DATE,
    "status" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contingency_reserves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."contingency_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contingency_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."contingency_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contingency_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_preferences" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "preferred_session_type" VARCHAR(30),
    "preferred_language" VARCHAR(30),
    "preferred_position" "crm"."customer_preferences_preferred_position",
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_preferred_rows" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "row_code" VARCHAR(5) NOT NULL,
    "usage_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_preferred_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_preferred_times" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "time_slot" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_preferred_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_preferred_weekdays" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_preferred_weekdays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_favorite_combos" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "combo_id" TEXT NOT NULL,
    "purchase_count" INTEGER DEFAULT 0,
    "last_purchase" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorite_combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_favorite_genres" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "genre" VARCHAR(100) NOT NULL,
    "preference_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorite_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_interactions" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "interaction_type" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(30),
    "description" TEXT,
    "metadata" TEXT,
    "origin_id" TEXT,
    "origin_type" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_points" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "movement_type" "crm"."customer_points_movement_type" NOT NULL,
    "points" INTEGER NOT NULL,
    "previous_balance" INTEGER NOT NULL,
    "current_balance" INTEGER NOT NULL,
    "origin_type" TEXT,
    "origin_id" TEXT,
    "description" TEXT,
    "expiration_date" DATE,
    "valid" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customer_favorite_products" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_customer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "purchase_count" INTEGER DEFAULT 0,
    "last_purchase" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorite_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."customers" (
    "id" TEXT NOT NULL DEFAULT '',
    "identity_id" TEXT NOT NULL,
    "cpf" VARCHAR(14) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "birth_date" DATE,
    "gender" "crm"."customers_gender" DEFAULT 'NOT_INFORMED',
    "zip_code" VARCHAR(10),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" CHAR(2),
    "accepts_marketing" BOOLEAN DEFAULT false,
    "accepts_sms" BOOLEAN DEFAULT false,
    "accepts_email" BOOLEAN DEFAULT true,
    "terms_accepted" BOOLEAN DEFAULT false,
    "terms_acceptance_date" TIMESTAMP(0),
    "data_anonymized" BOOLEAN DEFAULT false,
    "anonymization_date" TIMESTAMP(0),
    "acceptance_ip" VARCHAR(45),
    "anonymization_requested" BOOLEAN DEFAULT false,
    "collection_purposes" TEXT,
    "subject_aware_rights" BOOLEAN DEFAULT false,
    "rights_awareness_date" TIMESTAMP(0),
    "active" BOOLEAN DEFAULT true,
    "blocked" BOOLEAN DEFAULT false,
    "block_reason" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),
    "registration_source" VARCHAR(50),
    "registration_responsible" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."company_customers" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "is_active_in_loyalty" BOOLEAN DEFAULT true,
    "tenant_loyalty_number" VARCHAR(50),
    "accumulated_points" INTEGER DEFAULT 0,
    "loyalty_level" VARCHAR(20) DEFAULT 'BRONZE',
    "loyalty_join_date" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "company_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."sale_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "convenience_fee" DECIMAL(5,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."sale_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."payment_methods" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "operator_fee" DECIMAL(5,2) DEFAULT 0.00,
    "settlement_days" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."ticket_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_percentage" DECIMAL(5,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."concession_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concession_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."sales" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "user_id" TEXT,
    "customer_id" TEXT,
    "sale_type" TEXT,
    "payment_method" TEXT,
    "status" TEXT,
    "sale_number" VARCHAR(50) NOT NULL,
    "sale_date" TIMESTAMP(0) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0.00,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "cancellation_date" TIMESTAMP(0),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."tickets" (
    "id" TEXT NOT NULL DEFAULT '',
    "sale_id" TEXT NOT NULL,
    "showtime_id" TEXT NOT NULL,
    "seat_id" TEXT,
    "ticket_type" TEXT,
    "ticket_number" TEXT NOT NULL,
    "seat" TEXT,
    "face_value" DECIMAL(10,2) NOT NULL,
    "service_fee" DECIMAL(10,2) DEFAULT 0.00,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "usage_date" TIMESTAMP(0),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."concession_sales" (
    "id" TEXT NOT NULL DEFAULT '',
    "sale_id" TEXT NOT NULL,
    "status" TEXT,
    "sale_date" TIMESTAMP(0) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0.00,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concession_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."concession_sale_items" (
    "id" TEXT NOT NULL DEFAULT '',
    "concession_sale_id" TEXT NOT NULL,
    "item_type" "sales"."concession_item_type" NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concession_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."promotions_used" (
    "id" TEXT NOT NULL DEFAULT '',
    "sale_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "coupon_id" TEXT,
    "customer_id" TEXT,
    "promotion_type_code" VARCHAR(50),
    "discount_applied" DECIMAL(10,2) NOT NULL,
    "original_value" DECIMAL(10,2) NOT NULL,
    "final_value" DECIMAL(10,2) NOT NULL,
    "points_earned" INTEGER DEFAULT 0,
    "usage_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_used_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."supplier_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."suppliers" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "supplier_type" TEXT,
    "corporate_name" VARCHAR(200) NOT NULL,
    "trade_name" VARCHAR(200),
    "cnpj" VARCHAR(18),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "address" TEXT,
    "contact_name" VARCHAR(200),
    "contact_phone" VARCHAR(20),
    "delivery_days" INTEGER DEFAULT 7,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),
    "is_film_distributor" BOOLEAN DEFAULT false,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."campaign_categories" (
    "id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."campaign_complexes" (
    "id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT NOT NULL,
    "complex_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_complexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."campaign_movies" (
    "id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT NOT NULL,
    "movie_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."campaign_rooms" (
    "id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."campaign_session_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT NOT NULL,
    "projection_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_session_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."campaign_weekdays" (
    "id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_weekdays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."promotion_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."promotional_campaigns" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "promotion_type_id" TEXT NOT NULL,
    "campaign_code" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(0) NOT NULL,
    "end_date" TIMESTAMP(0) NOT NULL,
    "start_time" TIME(0),
    "end_time" TIME(0),
    "min_age" INTEGER,
    "max_age" INTEGER,
    "min_loyalty_level" VARCHAR(20),
    "new_customers_only" BOOLEAN DEFAULT false,
    "discount_value" DECIMAL(10,2),
    "discount_percentage" DECIMAL(5,2),
    "buy_quantity" INTEGER,
    "get_quantity" INTEGER,
    "fixed_price" DECIMAL(10,2),
    "points_multiplier" DECIMAL(5,2) DEFAULT 1.00,
    "max_total_uses" INTEGER,
    "used_count" INTEGER DEFAULT 0,
    "max_uses_per_customer" INTEGER,
    "min_purchase_value" DECIMAL(10,2),
    "combinable" BOOLEAN DEFAULT false,
    "priority" INTEGER DEFAULT 0,
    "active" BOOLEAN DEFAULT true,
    "requires_coupon" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "promotional_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing"."promotional_coupons" (
    "id" TEXT NOT NULL DEFAULT '',
    "campaign_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "coupon_code" TEXT NOT NULL,
    "start_date" TIMESTAMP(0) NOT NULL,
    "end_date" TIMESTAMP(0) NOT NULL,
    "max_uses" INTEGER DEFAULT 1,
    "used_count" INTEGER DEFAULT 0,
    "active" BOOLEAN DEFAULT true,
    "used" BOOLEAN DEFAULT false,
    "first_use_date" TIMESTAMP(0),
    "last_use_date" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotional_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."projection_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "additional_value" DECIMAL(10,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projection_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."audio_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "additional_value" DECIMAL(10,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."session_languages" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "abbreviation" VARCHAR(10),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."session_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."rooms" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "room_number" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100),
    "capacity" INTEGER NOT NULL,
    "projection_type" TEXT,
    "audio_type" TEXT,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "seat_layout" TEXT,
    "total_rows" INTEGER,
    "total_columns" INTEGER,
    "room_design" VARCHAR(30),
    "layout_image" VARCHAR(255),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."cinema_complexes" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "cnpj" VARCHAR(18),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" CHAR(2),
    "postal_code" VARCHAR(10),
    "ibge_municipality_code" VARCHAR(7) NOT NULL,
    "ancine_registry" VARCHAR(50),
    "opening_date" DATE,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "cinema_complexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."showtime_schedule" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "movie_id" TEXT NOT NULL,
    "session_date" DATE NOT NULL,
    "session_time" TIME(0) NOT NULL,
    "projection_type" TEXT,
    "audio_type" TEXT,
    "session_language" TEXT,
    "status" TEXT,
    "available_seats" INTEGER DEFAULT 0,
    "sold_seats" INTEGER DEFAULT 0,
    "blocked_seats" INTEGER DEFAULT 0,
    "base_ticket_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showtime_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."seat_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "additional_value" DECIMAL(10,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."seat_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."session_seat_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "showtime_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sale_id" TEXT,
    "reservation_uuid" VARCHAR(100),
    "reservation_date" TIMESTAMP(0),
    "expiration_date" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "session_seat_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."seats" (
    "id" TEXT NOT NULL DEFAULT '',
    "room_id" TEXT NOT NULL,
    "seat_type" TEXT,
    "seat_code" VARCHAR(10) NOT NULL,
    "row_code" VARCHAR(5) NOT NULL,
    "column_number" INTEGER NOT NULL,
    "position_x" INTEGER,
    "position_y" INTEGER,
    "accessible" BOOLEAN DEFAULT false,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations"."courtesy_parameters" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "courtesy_taxation_percentage" DECIMAL(5,2) DEFAULT 0.00,
    "monthly_courtesy_limit" INTEGER DEFAULT 1000,
    "validity_start" DATE NOT NULL,
    "validity_end" DATE,

    CONSTRAINT "courtesy_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_projects" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "project_number" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "project_type" TEXT,
    "total_project_value" DECIMAL(15,2) NOT NULL,
    "estimated_benefit_value" DECIMAL(15,2) NOT NULL,
    "pis_cofins_suspended" DECIMAL(15,2) DEFAULT 0.00,
    "ipi_exempt" DECIMAL(15,2) DEFAULT 0.00,
    "ii_exempt" DECIMAL(15,2) DEFAULT 0.00,
    "start_date" DATE NOT NULL,
    "expected_completion_date" DATE NOT NULL,
    "actual_completion_date" DATE,
    "status" TEXT,
    "ancine_process_number" VARCHAR(50),
    "ancine_approval_date" DATE,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "recine_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_acquisitions" (
    "id" TEXT NOT NULL DEFAULT '',
    "recine_project_id" TEXT NOT NULL,
    "acquisition_type" TEXT,
    "item_type" TEXT,
    "item_description" TEXT NOT NULL,
    "supplier" VARCHAR(200),
    "invoice_number" VARCHAR(50),
    "acquisition_date" DATE NOT NULL,
    "item_value" DECIMAL(15,2) NOT NULL,
    "pis_cofins_saved" DECIMAL(15,2) DEFAULT 0.00,
    "ipi_saved" DECIMAL(15,2) DEFAULT 0.00,
    "ii_saved" DECIMAL(15,2) DEFAULT 0.00,
    "total_benefit_value" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recine_acquisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_deadlines" (
    "id" TEXT NOT NULL DEFAULT '',
    "project_id" TEXT NOT NULL,
    "deadline_type" TEXT,
    "due_date" DATE NOT NULL,
    "completion_date" DATE,
    "estimated_penalty" DECIMAL(15,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recine_deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_project_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recine_project_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_project_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recine_project_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_item_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recine_item_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_acquisition_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recine_acquisition_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects"."recine_deadline_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recine_deadline_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."stock_movement_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "affects_stock" BOOLEAN DEFAULT true,
    "operation_type" VARCHAR(10),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."stock_movements" (
    "id" TEXT NOT NULL DEFAULT '',
    "product_id" TEXT NOT NULL,
    "complex_id" TEXT NOT NULL,
    "user_id" TEXT,
    "movement_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previous_quantity" INTEGER NOT NULL,
    "current_quantity" INTEGER NOT NULL,
    "origin_type" TEXT,
    "origin_id" TEXT,
    "unit_value" DECIMAL(10,2),
    "total_value" DECIMAL(15,2),
    "observations" TEXT,
    "movement_date" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."product_stock" (
    "id" TEXT NOT NULL DEFAULT '',
    "product_id" TEXT NOT NULL,
    "complex_id" TEXT NOT NULL,
    "current_quantity" INTEGER DEFAULT 0,
    "minimum_quantity" INTEGER DEFAULT 10,
    "maximum_quantity" INTEGER DEFAULT 100,
    "location" VARCHAR(100),
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "product_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."settlement_status" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "allows_modification" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."tax_entries" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "source_type" TEXT,
    "source_id" TEXT,
    "pis_cofins_regime" TEXT,
    "processing_user_id" TEXT,
    "competence_date" DATE NOT NULL,
    "entry_date" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "deductions_amount" DECIMAL(15,2) DEFAULT 0.00,
    "calculation_base" DECIMAL(15,2) NOT NULL,
    "apply_iss" BOOLEAN DEFAULT true,
    "iss_rate" DECIMAL(5,2) DEFAULT 0.00,
    "iss_amount" DECIMAL(15,2) DEFAULT 0.00,
    "ibge_municipality_code" VARCHAR(7),
    "iss_service_code" VARCHAR(10),
    "withheld_at_source" BOOLEAN DEFAULT false,
    "snapshot_rates" TEXT,
    "pis_rate" DECIMAL(5,2) NOT NULL,
    "pis_debit_amount" DECIMAL(15,2) NOT NULL,
    "pis_credit_amount" DECIMAL(15,2) DEFAULT 0.00,
    "pis_amount_payable" DECIMAL(15,2) NOT NULL,
    "cofins_rate" DECIMAL(5,2) NOT NULL,
    "cofins_debit_amount" DECIMAL(15,2) NOT NULL,
    "cofins_credit_amount" DECIMAL(15,2) DEFAULT 0.00,
    "cofins_amount_payable" DECIMAL(15,2) NOT NULL,
    "irpj_csll_base" DECIMAL(15,2),
    "presumed_percentage" DECIMAL(5,2),
    "processed" BOOLEAN DEFAULT false,
    "processing_date" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."monthly_tax_settlement" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "status" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "settlement_date" DATE NOT NULL,
    "tax_regime" TEXT,
    "pis_cofins_regime" TEXT,
    "gross_box_office_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "gross_concession_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "gross_advertising_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "gross_other_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "total_gross_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "total_deductions" DECIMAL(15,2) DEFAULT 0.00,
    "calculation_base_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "total_iss_box_office" DECIMAL(15,2) DEFAULT 0.00,
    "total_iss_concession" DECIMAL(15,2) DEFAULT 0.00,
    "total_iss" DECIMAL(15,2) DEFAULT 0.00,
    "total_pis_debit" DECIMAL(15,2) DEFAULT 0.00,
    "total_pis_credit" DECIMAL(15,2) DEFAULT 0.00,
    "total_pis_payable" DECIMAL(15,2) DEFAULT 0.00,
    "total_cofins_debit" DECIMAL(15,2) DEFAULT 0.00,
    "total_cofins_credit" DECIMAL(15,2) DEFAULT 0.00,
    "total_cofins_payable" DECIMAL(15,2) DEFAULT 0.00,
    "irpj_base" DECIMAL(15,2) DEFAULT 0.00,
    "irpj_base_15" DECIMAL(15,2) DEFAULT 0.00,
    "irpj_additional_10" DECIMAL(15,2) DEFAULT 0.00,
    "total_irpj" DECIMAL(15,2) DEFAULT 0.00,
    "csll_base" DECIMAL(15,2) DEFAULT 0.00,
    "total_csll" DECIMAL(15,2) DEFAULT 0.00,
    "gross_revenue_12m" DECIMAL(15,2),
    "effective_simples_rate" DECIMAL(5,2),
    "total_simples_amount" DECIMAL(15,2),
    "total_distributor_payment" DECIMAL(15,2) DEFAULT 0.00,
    "net_revenue_taxed" DECIMAL(15,2) DEFAULT 0.00,
    "net_total_revenue" DECIMAL(15,2) DEFAULT 0.00,
    "declaration_date" DATE,
    "payment_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "monthly_tax_settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."federal_tax_rates" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "tax_regime" TEXT,
    "pis_cofins_regime" TEXT,
    "revenue_type" TEXT,
    "pis_rate" DECIMAL(5,2) NOT NULL,
    "cofins_rate" DECIMAL(5,2) NOT NULL,
    "credit_allowed" BOOLEAN DEFAULT false,
    "irpj_base_rate" DECIMAL(5,2),
    "irpj_additional_rate" DECIMAL(5,2),
    "irpj_additional_limit" DECIMAL(15,2),
    "csll_rate" DECIMAL(5,2),
    "presumed_profit_percentage" DECIMAL(5,2),
    "validity_start" DATE NOT NULL,
    "validity_end" DATE,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "federal_tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."municipal_tax_parameters" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "ibge_municipality_code" VARCHAR(7) NOT NULL,
    "municipality_name" VARCHAR(100) NOT NULL,
    "state" CHAR(2) NOT NULL,
    "iss_rate" DECIMAL(5,2) NOT NULL,
    "iss_service_code" VARCHAR(10),
    "iss_concession_applicable" BOOLEAN DEFAULT false,
    "iss_concession_service_code" VARCHAR(10),
    "iss_withholding" BOOLEAN DEFAULT false,
    "validity_start" DATE NOT NULL,
    "validity_end" DATE,
    "notes" TEXT,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipal_tax_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."simple_national_brackets" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "annex" VARCHAR(10) NOT NULL,
    "bracket" INTEGER NOT NULL,
    "gross_revenue_12m_from" DECIMAL(15,2) NOT NULL,
    "gross_revenue_12m_to" DECIMAL(15,2) NOT NULL,
    "nominal_rate" DECIMAL(5,2) NOT NULL,
    "irpj_percentage" DECIMAL(5,2),
    "csll_percentage" DECIMAL(5,2),
    "cofins_percentage" DECIMAL(5,2),
    "pis_percentage" DECIMAL(5,2),
    "cpp_percentage" DECIMAL(5,2),
    "iss_percentage" DECIMAL(5,2),
    "validity_start" DATE NOT NULL,
    "validity_end" DATE,
    "active" BOOLEAN DEFAULT true,

    CONSTRAINT "simple_national_brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."state_icms_parameters" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "icms_rate" DECIMAL(5,2),
    "mva_percentage" DECIMAL(5,2),
    "tax_substitution_applicable" BOOLEAN DEFAULT false,
    "validity_start" DATE NOT NULL,
    "validity_end" DATE,
    "active" BOOLEAN DEFAULT true,

    CONSTRAINT "state_icms_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."pis_cofins_credits" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "credit_type" TEXT,
    "description" TEXT NOT NULL,
    "fiscal_document" VARCHAR(100),
    "document_date" DATE NOT NULL,
    "competence_date" DATE NOT NULL,
    "base_amount" DECIMAL(15,2) NOT NULL,
    "pis_credit_rate" DECIMAL(5,2) NOT NULL,
    "pis_credit_amount" DECIMAL(15,2) NOT NULL,
    "cofins_credit_rate" DECIMAL(5,2) NOT NULL,
    "cofins_credit_amount" DECIMAL(15,2) NOT NULL,
    "processed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pis_cofins_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."iss_withholdings" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "service_received_id" TEXT,
    "service_description" VARCHAR(200),
    "withholding_rate" DECIMAL(5,2) NOT NULL,
    "withholding_amount" DECIMAL(15,2) NOT NULL,
    "service_code" VARCHAR(10),
    "withholding_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iss_withholdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."tax_compensations" (
    "id" TEXT NOT NULL DEFAULT '',
    "cinema_complex_id" TEXT NOT NULL,
    "tax_type" TEXT,
    "credit_amount" DECIMAL(15,2) NOT NULL,
    "compensated_amount" DECIMAL(15,2) DEFAULT 0.00,
    "credit_balance" DECIMAL(15,2) NOT NULL,
    "credit_competence_date" DATE NOT NULL,
    "usage_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."revenue_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "applies_iss" BOOLEAN DEFAULT true,
    "applies_pis_cofins" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."tax_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "jurisdiction" VARCHAR(20),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax"."credit_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "credit_percentage" DECIMAL(5,2) DEFAULT 100.00,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."product_categories" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."products" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "product_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "ncm_code" VARCHAR(10),
    "unit" VARCHAR(10) DEFAULT 'UN',
    "sale_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "minimum_stock" INTEGER DEFAULT 0,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."combos" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "combo_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "promotional_price" DECIMAL(10,2),
    "promotion_start_date" DATE,
    "promotion_end_date" DATE,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."combo_products" (
    "id" TEXT NOT NULL DEFAULT '',
    "combo_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."age_ratings" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "minimum_age" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "age_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."movie_categories" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "minimum_age" INTEGER DEFAULT 0,
    "slug" VARCHAR(100),
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."cast_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cast_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."media_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."movies" (
    "id" TEXT NOT NULL DEFAULT '',
    "distributor_id" TEXT NOT NULL,
    "age_rating" TEXT,
    "category_id" TEXT,
    "original_title" VARCHAR(300) NOT NULL,
    "brazil_title" VARCHAR(300),
    "ancine_number" VARCHAR(50),
    "duration_minutes" INTEGER NOT NULL,
    "genre" VARCHAR(100),
    "country_of_origin" VARCHAR(50),
    "production_year" INTEGER,
    "national" BOOLEAN DEFAULT false,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "synopsis" TEXT,
    "short_synopsis" VARCHAR(500),
    "budget" DECIMAL(15,2),
    "website" VARCHAR(200),
    "tmdb_id" VARCHAR(50),
    "imdb_id" VARCHAR(20),
    "tags_json" TEXT,
    "worldwide_release_date" DATE,
    "original_language" VARCHAR(50),
    "slug" VARCHAR(200),

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."movie_cast" (
    "id" TEXT NOT NULL DEFAULT '',
    "movie_id" TEXT NOT NULL,
    "cast_type" TEXT NOT NULL,
    "artist_name" VARCHAR(200) NOT NULL,
    "character_name" VARCHAR(200),
    "credit_order" INTEGER DEFAULT 0,
    "photo_url" VARCHAR(500),
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movie_cast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."movie_media" (
    "id" TEXT NOT NULL DEFAULT '',
    "movie_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "media_url" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "title" VARCHAR(200),

    CONSTRAINT "movie_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."contract_types" (
    "id" TEXT NOT NULL DEFAULT '',
    "company_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."exhibition_contracts" (
    "id" TEXT NOT NULL DEFAULT '',
    "movie_id" TEXT NOT NULL,
    "cinema_complex_id" TEXT NOT NULL,
    "distributor_id" TEXT NOT NULL,
    "contract_type" TEXT,
    "revenue_base" TEXT,
    "contract_number" VARCHAR(50),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "distributor_percentage" DECIMAL(5,2) NOT NULL,
    "exhibitor_percentage" DECIMAL(5,2) NOT NULL,
    "guaranteed_minimum" DECIMAL(15,2) DEFAULT 0.00,
    "minimum_guarantee" DECIMAL(15,2) DEFAULT 0.00,
    "contract_terms" TEXT,
    "notes" TEXT,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibition_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_cnpj_key" ON "identity"."companies"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tenant_slug_key" ON "identity"."companies"("tenant_slug");

-- CreateIndex
CREATE INDEX "companies_cnpj_idx" ON "identity"."companies"("cnpj");

-- CreateIndex
CREATE INDEX "companies_tenant_slug_idx" ON "identity"."companies"("tenant_slug");

-- CreateIndex
CREATE INDEX "companies_active_idx" ON "identity"."companies"("active");

-- CreateIndex
CREATE INDEX "companies_suspended_idx" ON "identity"."companies"("suspended");

-- CreateIndex
CREATE INDEX "companies_plan_expires_at_idx" ON "identity"."companies"("plan_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "persons_cpf_key" ON "identity"."persons"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "persons_passport_number_key" ON "identity"."persons"("passport_number");

-- CreateIndex
CREATE INDEX "persons_cpf_idx" ON "identity"."persons"("cpf");

-- CreateIndex
CREATE INDEX "persons_full_name_idx" ON "identity"."persons"("full_name");

-- CreateIndex
CREATE INDEX "identities_email_idx" ON "identity"."identities"("email");

-- CreateIndex
CREATE INDEX "identities_identity_type_active_idx" ON "identity"."identities"("identity_type", "active");

-- CreateIndex
CREATE INDEX "identities_email_verified_idx" ON "identity"."identities"("email_verified");

-- CreateIndex
CREATE INDEX "identities_blocked_until_idx" ON "identity"."identities"("blocked_until");

-- CreateIndex
CREATE INDEX "identities_email_verification_expires_at_idx" ON "identity"."identities"("email_verification_expires_at");

-- CreateIndex
CREATE INDEX "identities_reset_token_expires_at_idx" ON "identity"."identities"("reset_token_expires_at");

-- CreateIndex
CREATE INDEX "identities_external_id_idx" ON "identity"."identities"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "identities_email_identity_type_key" ON "identity"."identities"("email", "identity_type");

-- CreateIndex
CREATE INDEX "custom_roles_company_id_is_system_role_idx" ON "identity"."custom_roles"("company_id", "is_system_role");

-- CreateIndex
CREATE INDEX "custom_roles_hierarchy_level_idx" ON "identity"."custom_roles"("hierarchy_level");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_company_id_name_key" ON "identity"."custom_roles"("company_id", "name");

-- CreateIndex
CREATE INDEX "permissions_company_id_resource_action_idx" ON "identity"."permissions"("company_id", "resource", "action");

-- CreateIndex
CREATE INDEX "permissions_module_active_idx" ON "identity"."permissions"("module", "active");

-- CreateIndex
CREATE INDEX "permissions_active_idx" ON "identity"."permissions"("active");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_company_id_code_key" ON "identity"."permissions"("company_id", "code");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "identity"."role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "identity"."role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "identity"."role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "company_users_company_id_identity_id_idx" ON "identity"."company_users"("company_id", "identity_id");

-- CreateIndex
CREATE INDEX "company_users_role_id_active_idx" ON "identity"."company_users"("role_id", "active");

-- CreateIndex
CREATE INDEX "company_users_end_date_idx" ON "identity"."company_users"("end_date");

-- CreateIndex
CREATE INDEX "company_users_employee_id_idx" ON "identity"."company_users"("employee_id");

-- CreateIndex
CREATE INDEX "company_users_active_idx" ON "identity"."company_users"("active");

-- CreateIndex
CREATE INDEX "company_users_last_access_idx" ON "identity"."company_users"("last_access");

-- CreateIndex
CREATE UNIQUE INDEX "company_users_company_id_identity_id_key" ON "identity"."company_users"("company_id", "identity_id");

-- CreateIndex
CREATE INDEX "user_attributes_key_value_idx" ON "identity"."user_attributes"("key", "value");

-- CreateIndex
CREATE INDEX "user_attributes_user_id_idx" ON "identity"."user_attributes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_attributes_user_id_key_key" ON "identity"."user_attributes"("user_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_id_key" ON "identity"."user_sessions"("session_id");

-- CreateIndex
CREATE INDEX "user_sessions_identity_id_idx" ON "identity"."user_sessions"("identity_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_active_idx" ON "identity"."user_sessions"("expires_at", "active");

-- CreateIndex
CREATE INDEX "user_sessions_session_id_idx" ON "identity"."user_sessions"("session_id");

-- CreateIndex
CREATE INDEX "user_sessions_revoked_idx" ON "identity"."user_sessions"("revoked");

-- CreateIndex
CREATE INDEX "user_sessions_last_activity_idx" ON "identity"."user_sessions"("last_activity");

-- CreateIndex
CREATE INDEX "tax_regimes_company_id_idx" ON "identity"."tax_regimes"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_regimes_company_id_name_key" ON "identity"."tax_regimes"("company_id", "name");

-- CreateIndex
CREATE INDEX "pis_cofins_regimes_company_id_idx" ON "identity"."pis_cofins_regimes"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "pis_cofins_regimes_company_id_name_key" ON "identity"."pis_cofins_regimes"("company_id", "name");

-- CreateIndex
CREATE INDEX "employment_contract_types_company_id_idx" ON "hr"."employment_contract_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "employment_contract_types_company_id_name_key" ON "hr"."employment_contract_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "departments_company_id_idx" ON "hr"."departments"("company_id");

-- CreateIndex
CREATE INDEX "departments_complex_id_idx" ON "hr"."departments"("complex_id");

-- CreateIndex
CREATE INDEX "departments_manager_id_idx" ON "hr"."departments"("manager_id");

-- CreateIndex
CREATE INDEX "departments_active_idx" ON "hr"."departments"("active");

-- CreateIndex
CREATE INDEX "positions_company_id_idx" ON "hr"."positions"("company_id");

-- CreateIndex
CREATE INDEX "positions_department_id_idx" ON "hr"."positions"("department_id");

-- CreateIndex
CREATE INDEX "positions_active_idx" ON "hr"."positions"("active");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_number_key" ON "hr"."employees"("employee_number");

-- CreateIndex
CREATE INDEX "employees_person_id_idx" ON "hr"."employees"("person_id");

-- CreateIndex
CREATE INDEX "employees_company_id_idx" ON "hr"."employees"("company_id");

-- CreateIndex
CREATE INDEX "employees_complex_id_idx" ON "hr"."employees"("complex_id");

-- CreateIndex
CREATE INDEX "employees_position_id_idx" ON "hr"."employees"("position_id");

-- CreateIndex
CREATE INDEX "employees_contract_type_idx" ON "hr"."employees"("contract_type");

-- CreateIndex
CREATE INDEX "employees_active_idx" ON "hr"."employees"("active");

-- CreateIndex
CREATE INDEX "employees_hire_date_idx" ON "hr"."employees"("hire_date");

-- CreateIndex
CREATE INDEX "employees_termination_date_idx" ON "hr"."employees"("termination_date");

-- CreateIndex
CREATE INDEX "employees_work_email_idx" ON "hr"."employees"("work_email");

-- CreateIndex
CREATE INDEX "settlement_bases_company_id_idx" ON "finance"."settlement_bases"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_bases_company_id_name_key" ON "finance"."settlement_bases"("company_id", "name");

-- CreateIndex
CREATE INDEX "distributor_settlements_contract_id_idx" ON "finance"."distributor_settlements"("contract_id");

-- CreateIndex
CREATE INDEX "distributor_settlements_distributor_id_idx" ON "finance"."distributor_settlements"("distributor_id");

-- CreateIndex
CREATE INDEX "distributor_settlements_cinema_complex_id_idx" ON "finance"."distributor_settlements"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "distributor_settlements_competence_start_date_competence_en_idx" ON "finance"."distributor_settlements"("competence_start_date", "competence_end_date");

-- CreateIndex
CREATE INDEX "distributor_settlements_status_idx" ON "finance"."distributor_settlements"("status");

-- CreateIndex
CREATE INDEX "distributor_settlements_calculation_base_idx" ON "finance"."distributor_settlements"("calculation_base");

-- CreateIndex
CREATE INDEX "distributor_settlements_payment_date_idx" ON "finance"."distributor_settlements"("payment_date");

-- CreateIndex
CREATE INDEX "distributor_settlements_approval_date_idx" ON "finance"."distributor_settlements"("approval_date");

-- CreateIndex
CREATE INDEX "distributor_settlement_status_company_id_idx" ON "finance"."distributor_settlement_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "distributor_settlement_status_company_id_name_key" ON "finance"."distributor_settlement_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "journal_entry_status_company_id_idx" ON "finance"."journal_entry_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_status_company_id_name_key" ON "finance"."journal_entry_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "journal_entry_types_company_id_idx" ON "finance"."journal_entry_types"("company_id");

-- CreateIndex
CREATE INDEX "journal_entry_types_nature_idx" ON "finance"."journal_entry_types"("nature");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_types_company_id_name_key" ON "finance"."journal_entry_types"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entry_number_key" ON "finance"."journal_entries"("entry_number");

-- CreateIndex
CREATE INDEX "journal_entries_cinema_complex_id_idx" ON "finance"."journal_entries"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "finance"."journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_cinema_complex_id_entry_date_idx" ON "finance"."journal_entries"("cinema_complex_id", "entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_status_idx" ON "finance"."journal_entries"("status");

-- CreateIndex
CREATE INDEX "journal_entries_entry_type_idx" ON "finance"."journal_entries"("entry_type");

-- CreateIndex
CREATE INDEX "journal_entries_origin_type_origin_id_idx" ON "finance"."journal_entries"("origin_type", "origin_id");

-- CreateIndex
CREATE INDEX "journal_entry_items_journal_entry_id_idx" ON "finance"."journal_entry_items"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_entry_items_account_id_idx" ON "finance"."journal_entry_items"("account_id");

-- CreateIndex
CREATE INDEX "journal_entry_items_movement_type_idx" ON "finance"."journal_entry_items"("movement_type");

-- CreateIndex
CREATE INDEX "account_natures_company_id_idx" ON "finance"."account_natures"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_natures_company_id_name_key" ON "finance"."account_natures"("company_id", "name");

-- CreateIndex
CREATE INDEX "account_types_company_id_idx" ON "finance"."account_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_types_company_id_name_key" ON "finance"."account_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "accounting_movement_types_company_id_idx" ON "finance"."accounting_movement_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_movement_types_company_id_name_key" ON "finance"."accounting_movement_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parent_account_id_idx" ON "finance"."chart_of_accounts"("parent_account_id");

-- CreateIndex
CREATE INDEX "chart_of_accounts_company_id_active_idx" ON "finance"."chart_of_accounts"("company_id", "active");

-- CreateIndex
CREATE INDEX "chart_of_accounts_company_id_idx" ON "finance"."chart_of_accounts"("company_id");

-- CreateIndex
CREATE INDEX "chart_of_accounts_active_idx" ON "finance"."chart_of_accounts"("active");

-- CreateIndex
CREATE INDEX "chart_of_accounts_level_idx" ON "finance"."chart_of_accounts"("level");

-- CreateIndex
CREATE INDEX "chart_of_accounts_allows_entry_idx" ON "finance"."chart_of_accounts"("allows_entry");

-- CreateIndex
CREATE INDEX "chart_of_accounts_account_type_idx" ON "finance"."chart_of_accounts"("account_type");

-- CreateIndex
CREATE INDEX "chart_of_accounts_account_nature_idx" ON "finance"."chart_of_accounts"("account_nature");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_company_id_account_code_key" ON "finance"."chart_of_accounts"("company_id", "account_code");

-- CreateIndex
CREATE INDEX "monthly_income_statement_cinema_complex_id_idx" ON "finance"."monthly_income_statement"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "monthly_income_statement_year_month_idx" ON "finance"."monthly_income_statement"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_income_statement_cinema_complex_id_year_month_key" ON "finance"."monthly_income_statement"("cinema_complex_id", "year", "month");

-- CreateIndex
CREATE INDEX "contingency_reserves_complex_id_idx" ON "finance"."contingency_reserves"("complex_id");

-- CreateIndex
CREATE INDEX "contingency_reserves_status_idx" ON "finance"."contingency_reserves"("status");

-- CreateIndex
CREATE INDEX "contingency_reserves_complex_id_status_idx" ON "finance"."contingency_reserves"("complex_id", "status");

-- CreateIndex
CREATE INDEX "contingency_reserves_contingency_type_idx" ON "finance"."contingency_reserves"("contingency_type");

-- CreateIndex
CREATE INDEX "contingency_reserves_clearance_date_idx" ON "finance"."contingency_reserves"("clearance_date");

-- CreateIndex
CREATE INDEX "contingency_types_company_id_idx" ON "finance"."contingency_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "contingency_types_company_id_name_key" ON "finance"."contingency_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "contingency_status_company_id_idx" ON "finance"."contingency_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "contingency_status_company_id_name_key" ON "finance"."contingency_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "customer_preferences_company_customer_id_idx" ON "crm"."customer_preferences"("company_customer_id");

-- CreateIndex
CREATE INDEX "customer_preferred_rows_company_customer_id_idx" ON "crm"."customer_preferred_rows"("company_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferred_rows_company_customer_id_row_code_key" ON "crm"."customer_preferred_rows"("company_customer_id", "row_code");

-- CreateIndex
CREATE INDEX "customer_preferred_times_company_customer_id_idx" ON "crm"."customer_preferred_times"("company_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferred_times_company_customer_id_time_slot_key" ON "crm"."customer_preferred_times"("company_customer_id", "time_slot");

-- CreateIndex
CREATE INDEX "customer_preferred_weekdays_company_customer_id_idx" ON "crm"."customer_preferred_weekdays"("company_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_preferred_weekdays_company_customer_id_weekday_key" ON "crm"."customer_preferred_weekdays"("company_customer_id", "weekday");

-- CreateIndex
CREATE INDEX "customer_favorite_combos_company_customer_id_idx" ON "crm"."customer_favorite_combos"("company_customer_id");

-- CreateIndex
CREATE INDEX "customer_favorite_combos_combo_id_idx" ON "crm"."customer_favorite_combos"("combo_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorite_combos_company_customer_id_combo_id_key" ON "crm"."customer_favorite_combos"("company_customer_id", "combo_id");

-- CreateIndex
CREATE INDEX "customer_favorite_genres_company_customer_id_idx" ON "crm"."customer_favorite_genres"("company_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorite_genres_company_customer_id_genre_key" ON "crm"."customer_favorite_genres"("company_customer_id", "genre");

-- CreateIndex
CREATE INDEX "customer_interactions_company_customer_id_idx" ON "crm"."customer_interactions"("company_customer_id");

-- CreateIndex
CREATE INDEX "customer_interactions_interaction_type_idx" ON "crm"."customer_interactions"("interaction_type");

-- CreateIndex
CREATE INDEX "customer_interactions_origin_type_origin_id_idx" ON "crm"."customer_interactions"("origin_type", "origin_id");

-- CreateIndex
CREATE INDEX "customer_points_company_customer_id_idx" ON "crm"."customer_points"("company_customer_id");

-- CreateIndex
CREATE INDEX "customer_points_expiration_date_valid_idx" ON "crm"."customer_points"("expiration_date", "valid");

-- CreateIndex
CREATE INDEX "customer_points_origin_type_origin_id_idx" ON "crm"."customer_points"("origin_type", "origin_id");

-- CreateIndex
CREATE INDEX "customer_favorite_products_company_customer_id_idx" ON "crm"."customer_favorite_products"("company_customer_id");

-- CreateIndex
CREATE INDEX "customer_favorite_products_product_id_idx" ON "crm"."customer_favorite_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorite_products_company_customer_id_product_id_key" ON "crm"."customer_favorite_products"("company_customer_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_identity_id_key" ON "crm"."customers"("identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cpf_key" ON "crm"."customers"("cpf");

-- CreateIndex
CREATE INDEX "customers_cpf_idx" ON "crm"."customers"("cpf");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "crm"."customers"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "crm"."customers"("phone");

-- CreateIndex
CREATE INDEX "customers_active_blocked_idx" ON "crm"."customers"("active", "blocked");

-- CreateIndex
CREATE INDEX "company_customers_company_id_idx" ON "crm"."company_customers"("company_id");

-- CreateIndex
CREATE INDEX "company_customers_customer_id_idx" ON "crm"."company_customers"("customer_id");

-- CreateIndex
CREATE INDEX "company_customers_is_active_in_loyalty_idx" ON "crm"."company_customers"("is_active_in_loyalty");

-- CreateIndex
CREATE INDEX "company_customers_loyalty_level_idx" ON "crm"."company_customers"("loyalty_level");

-- CreateIndex
CREATE UNIQUE INDEX "company_customers_company_id_customer_id_key" ON "crm"."company_customers"("company_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_types_company_id_name_key" ON "sales"."sale_types"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sale_status_company_id_name_key" ON "sales"."sale_status"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_company_id_name_key" ON "sales"."payment_methods"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_types_company_id_name_key" ON "sales"."ticket_types"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "concession_status_company_id_name_key" ON "sales"."concession_status"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_sale_number_key" ON "sales"."sales"("sale_number");

-- CreateIndex
CREATE INDEX "sales_cinema_complex_id_idx" ON "sales"."sales"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "sales_sale_date_idx" ON "sales"."sales"("sale_date");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "sales"."sales"("customer_id");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"."sales"("status");

-- CreateIndex
CREATE INDEX "sales_sale_date_status_idx" ON "sales"."sales"("sale_date", "status");

-- CreateIndex
CREATE INDEX "sales_user_id_idx" ON "sales"."sales"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "sales"."tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_sale_id_idx" ON "sales"."tickets"("sale_id");

-- CreateIndex
CREATE INDEX "tickets_showtime_id_idx" ON "sales"."tickets"("showtime_id");

-- CreateIndex
CREATE INDEX "tickets_seat_id_idx" ON "sales"."tickets"("seat_id");

-- CreateIndex
CREATE INDEX "tickets_used_idx" ON "sales"."tickets"("used");

-- CreateIndex
CREATE INDEX "tickets_ticket_type_idx" ON "sales"."tickets"("ticket_type");

-- CreateIndex
CREATE INDEX "concession_sales_sale_id_idx" ON "sales"."concession_sales"("sale_id");

-- CreateIndex
CREATE INDEX "concession_sales_sale_date_idx" ON "sales"."concession_sales"("sale_date");

-- CreateIndex
CREATE INDEX "concession_sales_status_idx" ON "sales"."concession_sales"("status");

-- CreateIndex
CREATE INDEX "concession_sale_items_concession_sale_id_idx" ON "sales"."concession_sale_items"("concession_sale_id");

-- CreateIndex
CREATE INDEX "concession_sale_items_item_type_item_id_idx" ON "sales"."concession_sale_items"("item_type", "item_id");

-- CreateIndex
CREATE INDEX "promotions_used_sale_id_idx" ON "sales"."promotions_used"("sale_id");

-- CreateIndex
CREATE INDEX "promotions_used_campaign_id_idx" ON "sales"."promotions_used"("campaign_id");

-- CreateIndex
CREATE INDEX "promotions_used_customer_id_idx" ON "sales"."promotions_used"("customer_id");

-- CreateIndex
CREATE INDEX "promotions_used_usage_date_idx" ON "sales"."promotions_used"("usage_date");

-- CreateIndex
CREATE INDEX "promotions_used_coupon_id_idx" ON "sales"."promotions_used"("coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_types_company_id_name_key" ON "inventory"."supplier_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "suppliers_company_id_idx" ON "inventory"."suppliers"("company_id");

-- CreateIndex
CREATE INDEX "suppliers_supplier_type_idx" ON "inventory"."suppliers"("supplier_type");

-- CreateIndex
CREATE INDEX "suppliers_active_idx" ON "inventory"."suppliers"("active");

-- CreateIndex
CREATE INDEX "suppliers_is_film_distributor_idx" ON "inventory"."suppliers"("is_film_distributor");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_company_id_cnpj_key" ON "inventory"."suppliers"("company_id", "cnpj");

-- CreateIndex
CREATE INDEX "campaign_categories_campaign_id_idx" ON "marketing"."campaign_categories"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_categories_category_id_idx" ON "marketing"."campaign_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_categories_campaign_id_category_id_key" ON "marketing"."campaign_categories"("campaign_id", "category_id");

-- CreateIndex
CREATE INDEX "campaign_complexes_campaign_id_idx" ON "marketing"."campaign_complexes"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_complexes_complex_id_idx" ON "marketing"."campaign_complexes"("complex_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_complexes_campaign_id_complex_id_key" ON "marketing"."campaign_complexes"("campaign_id", "complex_id");

-- CreateIndex
CREATE INDEX "campaign_movies_campaign_id_idx" ON "marketing"."campaign_movies"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_movies_movie_id_idx" ON "marketing"."campaign_movies"("movie_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_movies_campaign_id_movie_id_key" ON "marketing"."campaign_movies"("campaign_id", "movie_id");

-- CreateIndex
CREATE INDEX "campaign_rooms_campaign_id_idx" ON "marketing"."campaign_rooms"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_rooms_room_id_idx" ON "marketing"."campaign_rooms"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_rooms_campaign_id_room_id_key" ON "marketing"."campaign_rooms"("campaign_id", "room_id");

-- CreateIndex
CREATE INDEX "campaign_session_types_campaign_id_idx" ON "marketing"."campaign_session_types"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_session_types_projection_type_id_idx" ON "marketing"."campaign_session_types"("projection_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_session_types_campaign_id_projection_type_id_key" ON "marketing"."campaign_session_types"("campaign_id", "projection_type_id");

-- CreateIndex
CREATE INDEX "campaign_weekdays_campaign_id_idx" ON "marketing"."campaign_weekdays"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_weekdays_campaign_id_weekday_key" ON "marketing"."campaign_weekdays"("campaign_id", "weekday");

-- CreateIndex
CREATE INDEX "promotion_types_company_id_idx" ON "marketing"."promotion_types"("company_id");

-- CreateIndex
CREATE INDEX "promotion_types_active_idx" ON "marketing"."promotion_types"("active");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_types_company_id_code_key" ON "marketing"."promotion_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "promotional_campaigns_campaign_code_key" ON "marketing"."promotional_campaigns"("campaign_code");

-- CreateIndex
CREATE INDEX "promotional_campaigns_company_id_idx" ON "marketing"."promotional_campaigns"("company_id");

-- CreateIndex
CREATE INDEX "promotional_campaigns_promotion_type_id_idx" ON "marketing"."promotional_campaigns"("promotion_type_id");

-- CreateIndex
CREATE INDEX "promotional_campaigns_active_idx" ON "marketing"."promotional_campaigns"("active");

-- CreateIndex
CREATE INDEX "promotional_campaigns_start_date_end_date_idx" ON "marketing"."promotional_campaigns"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "promotional_campaigns_campaign_code_idx" ON "marketing"."promotional_campaigns"("campaign_code");

-- CreateIndex
CREATE UNIQUE INDEX "promotional_coupons_coupon_code_key" ON "marketing"."promotional_coupons"("coupon_code");

-- CreateIndex
CREATE INDEX "promotional_coupons_campaign_id_idx" ON "marketing"."promotional_coupons"("campaign_id");

-- CreateIndex
CREATE INDEX "promotional_coupons_customer_id_idx" ON "marketing"."promotional_coupons"("customer_id");

-- CreateIndex
CREATE INDEX "promotional_coupons_coupon_code_idx" ON "marketing"."promotional_coupons"("coupon_code");

-- CreateIndex
CREATE INDEX "promotional_coupons_active_used_idx" ON "marketing"."promotional_coupons"("active", "used");

-- CreateIndex
CREATE INDEX "promotional_coupons_start_date_end_date_idx" ON "marketing"."promotional_coupons"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "projection_types_company_id_idx" ON "operations"."projection_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "projection_types_company_id_name_key" ON "operations"."projection_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "audio_types_company_id_idx" ON "operations"."audio_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_types_company_id_name_key" ON "operations"."audio_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "session_languages_company_id_idx" ON "operations"."session_languages"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_languages_company_id_name_key" ON "operations"."session_languages"("company_id", "name");

-- CreateIndex
CREATE INDEX "session_status_company_id_idx" ON "operations"."session_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_status_company_id_name_key" ON "operations"."session_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "rooms_cinema_complex_id_idx" ON "operations"."rooms"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "rooms_audio_type_idx" ON "operations"."rooms"("audio_type");

-- CreateIndex
CREATE INDEX "rooms_projection_type_idx" ON "operations"."rooms"("projection_type");

-- CreateIndex
CREATE INDEX "rooms_active_idx" ON "operations"."rooms"("active");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_cinema_complex_id_room_number_key" ON "operations"."rooms"("cinema_complex_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "cinema_complexes_code_key" ON "operations"."cinema_complexes"("code");

-- CreateIndex
CREATE INDEX "cinema_complexes_code_idx" ON "operations"."cinema_complexes"("code");

-- CreateIndex
CREATE INDEX "cinema_complexes_company_id_idx" ON "operations"."cinema_complexes"("company_id");

-- CreateIndex
CREATE INDEX "cinema_complexes_ibge_municipality_code_idx" ON "operations"."cinema_complexes"("ibge_municipality_code");

-- CreateIndex
CREATE INDEX "cinema_complexes_active_idx" ON "operations"."cinema_complexes"("active");

-- CreateIndex
CREATE INDEX "showtime_schedule_cinema_complex_id_idx" ON "operations"."showtime_schedule"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "showtime_schedule_room_id_idx" ON "operations"."showtime_schedule"("room_id");

-- CreateIndex
CREATE INDEX "showtime_schedule_movie_id_idx" ON "operations"."showtime_schedule"("movie_id");

-- CreateIndex
CREATE INDEX "showtime_schedule_session_date_session_time_idx" ON "operations"."showtime_schedule"("session_date", "session_time");

-- CreateIndex
CREATE INDEX "showtime_schedule_status_idx" ON "operations"."showtime_schedule"("status");

-- CreateIndex
CREATE INDEX "showtime_schedule_projection_type_idx" ON "operations"."showtime_schedule"("projection_type");

-- CreateIndex
CREATE INDEX "showtime_schedule_audio_type_idx" ON "operations"."showtime_schedule"("audio_type");

-- CreateIndex
CREATE INDEX "showtime_schedule_session_language_idx" ON "operations"."showtime_schedule"("session_language");

-- CreateIndex
CREATE INDEX "seat_types_company_id_idx" ON "operations"."seat_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_types_company_id_name_key" ON "operations"."seat_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "seat_status_company_id_idx" ON "operations"."seat_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_status_company_id_name_key" ON "operations"."seat_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "session_seat_status_showtime_id_idx" ON "operations"."session_seat_status"("showtime_id");

-- CreateIndex
CREATE INDEX "session_seat_status_seat_id_idx" ON "operations"."session_seat_status"("seat_id");

-- CreateIndex
CREATE INDEX "session_seat_status_status_idx" ON "operations"."session_seat_status"("status");

-- CreateIndex
CREATE INDEX "session_seat_status_sale_id_idx" ON "operations"."session_seat_status"("sale_id");

-- CreateIndex
CREATE INDEX "session_seat_status_expiration_date_idx" ON "operations"."session_seat_status"("expiration_date");

-- CreateIndex
CREATE UNIQUE INDEX "session_seat_status_showtime_id_seat_id_key" ON "operations"."session_seat_status"("showtime_id", "seat_id");

-- CreateIndex
CREATE INDEX "seats_room_id_idx" ON "operations"."seats"("room_id");

-- CreateIndex
CREATE INDEX "seats_seat_type_idx" ON "operations"."seats"("seat_type");

-- CreateIndex
CREATE INDEX "seats_active_idx" ON "operations"."seats"("active");

-- CreateIndex
CREATE INDEX "seats_accessible_idx" ON "operations"."seats"("accessible");

-- CreateIndex
CREATE UNIQUE INDEX "seats_room_id_seat_code_key" ON "operations"."seats"("room_id", "seat_code");

-- CreateIndex
CREATE INDEX "courtesy_parameters_cinema_complex_id_idx" ON "operations"."courtesy_parameters"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "courtesy_parameters_validity_start_validity_end_idx" ON "operations"."courtesy_parameters"("validity_start", "validity_end");

-- CreateIndex
CREATE UNIQUE INDEX "recine_projects_project_number_key" ON "projects"."recine_projects"("project_number");

-- CreateIndex
CREATE INDEX "recine_projects_cinema_complex_id_idx" ON "projects"."recine_projects"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "recine_projects_status_idx" ON "projects"."recine_projects"("status");

-- CreateIndex
CREATE INDEX "recine_projects_project_type_idx" ON "projects"."recine_projects"("project_type");

-- CreateIndex
CREATE INDEX "recine_projects_start_date_idx" ON "projects"."recine_projects"("start_date");

-- CreateIndex
CREATE INDEX "recine_projects_expected_completion_date_idx" ON "projects"."recine_projects"("expected_completion_date");

-- CreateIndex
CREATE INDEX "recine_acquisitions_recine_project_id_idx" ON "projects"."recine_acquisitions"("recine_project_id");

-- CreateIndex
CREATE INDEX "recine_acquisitions_acquisition_date_idx" ON "projects"."recine_acquisitions"("acquisition_date");

-- CreateIndex
CREATE INDEX "recine_acquisitions_acquisition_type_idx" ON "projects"."recine_acquisitions"("acquisition_type");

-- CreateIndex
CREATE INDEX "recine_acquisitions_item_type_idx" ON "projects"."recine_acquisitions"("item_type");

-- CreateIndex
CREATE INDEX "recine_acquisitions_supplier_idx" ON "projects"."recine_acquisitions"("supplier");

-- CreateIndex
CREATE INDEX "recine_deadlines_project_id_idx" ON "projects"."recine_deadlines"("project_id");

-- CreateIndex
CREATE INDEX "recine_deadlines_due_date_idx" ON "projects"."recine_deadlines"("due_date");

-- CreateIndex
CREATE INDEX "recine_deadlines_deadline_type_idx" ON "projects"."recine_deadlines"("deadline_type");

-- CreateIndex
CREATE INDEX "recine_deadlines_completion_date_idx" ON "projects"."recine_deadlines"("completion_date");

-- CreateIndex
CREATE INDEX "recine_project_types_company_id_idx" ON "projects"."recine_project_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "recine_project_types_company_id_name_key" ON "projects"."recine_project_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "recine_project_status_company_id_idx" ON "projects"."recine_project_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "recine_project_status_company_id_name_key" ON "projects"."recine_project_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "recine_item_types_company_id_idx" ON "projects"."recine_item_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "recine_item_types_company_id_name_key" ON "projects"."recine_item_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "recine_acquisition_types_company_id_idx" ON "projects"."recine_acquisition_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "recine_acquisition_types_company_id_name_key" ON "projects"."recine_acquisition_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "recine_deadline_types_company_id_idx" ON "projects"."recine_deadline_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "recine_deadline_types_company_id_name_key" ON "projects"."recine_deadline_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "stock_movement_types_company_id_idx" ON "stock"."stock_movement_types"("company_id");

-- CreateIndex
CREATE INDEX "stock_movement_types_affects_stock_idx" ON "stock"."stock_movement_types"("affects_stock");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movement_types_company_id_name_key" ON "stock"."stock_movement_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock"."stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_complex_id_idx" ON "stock"."stock_movements"("complex_id");

-- CreateIndex
CREATE INDEX "stock_movements_movement_date_idx" ON "stock"."stock_movements"("movement_date");

-- CreateIndex
CREATE INDEX "stock_movements_movement_type_idx" ON "stock"."stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "stock_movements_origin_type_origin_id_idx" ON "stock"."stock_movements"("origin_type", "origin_id");

-- CreateIndex
CREATE INDEX "stock_movements_user_id_idx" ON "stock"."stock_movements"("user_id");

-- CreateIndex
CREATE INDEX "product_stock_product_id_idx" ON "stock"."product_stock"("product_id");

-- CreateIndex
CREATE INDEX "product_stock_complex_id_idx" ON "stock"."product_stock"("complex_id");

-- CreateIndex
CREATE INDEX "product_stock_current_quantity_idx" ON "stock"."product_stock"("current_quantity");

-- CreateIndex
CREATE INDEX "product_stock_active_idx" ON "stock"."product_stock"("active");

-- CreateIndex
CREATE INDEX "product_stock_current_quantity_minimum_quantity_idx" ON "stock"."product_stock"("current_quantity", "minimum_quantity");

-- CreateIndex
CREATE UNIQUE INDEX "product_stock_product_id_complex_id_key" ON "stock"."product_stock"("product_id", "complex_id");

-- CreateIndex
CREATE INDEX "settlement_status_company_id_idx" ON "tax"."settlement_status"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_status_company_id_name_key" ON "tax"."settlement_status"("company_id", "name");

-- CreateIndex
CREATE INDEX "tax_entries_cinema_complex_id_idx" ON "tax"."tax_entries"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "tax_entries_competence_date_idx" ON "tax"."tax_entries"("competence_date");

-- CreateIndex
CREATE INDEX "tax_entries_source_type_source_id_idx" ON "tax"."tax_entries"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "tax_entries_processed_idx" ON "tax"."tax_entries"("processed");

-- CreateIndex
CREATE INDEX "tax_entries_pis_cofins_regime_idx" ON "tax"."tax_entries"("pis_cofins_regime");

-- CreateIndex
CREATE INDEX "monthly_tax_settlement_cinema_complex_id_idx" ON "tax"."monthly_tax_settlement"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "monthly_tax_settlement_year_month_idx" ON "tax"."monthly_tax_settlement"("year", "month");

-- CreateIndex
CREATE INDEX "monthly_tax_settlement_status_idx" ON "tax"."monthly_tax_settlement"("status");

-- CreateIndex
CREATE INDEX "monthly_tax_settlement_settlement_date_idx" ON "tax"."monthly_tax_settlement"("settlement_date");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_tax_settlement_cinema_complex_id_year_month_key" ON "tax"."monthly_tax_settlement"("cinema_complex_id", "year", "month");

-- CreateIndex
CREATE INDEX "federal_tax_rates_company_id_idx" ON "tax"."federal_tax_rates"("company_id");

-- CreateIndex
CREATE INDEX "federal_tax_rates_validity_start_validity_end_idx" ON "tax"."federal_tax_rates"("validity_start", "validity_end");

-- CreateIndex
CREATE INDEX "federal_tax_rates_tax_regime_idx" ON "tax"."federal_tax_rates"("tax_regime");

-- CreateIndex
CREATE INDEX "federal_tax_rates_pis_cofins_regime_idx" ON "tax"."federal_tax_rates"("pis_cofins_regime");

-- CreateIndex
CREATE INDEX "federal_tax_rates_active_idx" ON "tax"."federal_tax_rates"("active");

-- CreateIndex
CREATE INDEX "municipal_tax_parameters_company_id_idx" ON "tax"."municipal_tax_parameters"("company_id");

-- CreateIndex
CREATE INDEX "municipal_tax_parameters_ibge_municipality_code_idx" ON "tax"."municipal_tax_parameters"("ibge_municipality_code");

-- CreateIndex
CREATE INDEX "municipal_tax_parameters_validity_start_validity_end_idx" ON "tax"."municipal_tax_parameters"("validity_start", "validity_end");

-- CreateIndex
CREATE INDEX "municipal_tax_parameters_active_idx" ON "tax"."municipal_tax_parameters"("active");

-- CreateIndex
CREATE UNIQUE INDEX "municipal_tax_parameters_company_id_ibge_municipality_code__key" ON "tax"."municipal_tax_parameters"("company_id", "ibge_municipality_code", "validity_start");

-- CreateIndex
CREATE INDEX "simple_national_brackets_company_id_idx" ON "tax"."simple_national_brackets"("company_id");

-- CreateIndex
CREATE INDEX "simple_national_brackets_annex_idx" ON "tax"."simple_national_brackets"("annex");

-- CreateIndex
CREATE INDEX "simple_national_brackets_validity_start_validity_end_idx" ON "tax"."simple_national_brackets"("validity_start", "validity_end");

-- CreateIndex
CREATE INDEX "simple_national_brackets_active_idx" ON "tax"."simple_national_brackets"("active");

-- CreateIndex
CREATE UNIQUE INDEX "simple_national_brackets_company_id_annex_bracket_validity__key" ON "tax"."simple_national_brackets"("company_id", "annex", "bracket", "validity_start");

-- CreateIndex
CREATE INDEX "state_icms_parameters_company_id_idx" ON "tax"."state_icms_parameters"("company_id");

-- CreateIndex
CREATE INDEX "state_icms_parameters_state_idx" ON "tax"."state_icms_parameters"("state");

-- CreateIndex
CREATE INDEX "state_icms_parameters_validity_start_validity_end_idx" ON "tax"."state_icms_parameters"("validity_start", "validity_end");

-- CreateIndex
CREATE INDEX "state_icms_parameters_active_idx" ON "tax"."state_icms_parameters"("active");

-- CreateIndex
CREATE UNIQUE INDEX "state_icms_parameters_company_id_state_validity_start_key" ON "tax"."state_icms_parameters"("company_id", "state", "validity_start");

-- CreateIndex
CREATE INDEX "pis_cofins_credits_cinema_complex_id_idx" ON "tax"."pis_cofins_credits"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "pis_cofins_credits_competence_date_idx" ON "tax"."pis_cofins_credits"("competence_date");

-- CreateIndex
CREATE INDEX "pis_cofins_credits_credit_type_idx" ON "tax"."pis_cofins_credits"("credit_type");

-- CreateIndex
CREATE INDEX "pis_cofins_credits_processed_idx" ON "tax"."pis_cofins_credits"("processed");

-- CreateIndex
CREATE INDEX "iss_withholdings_cinema_complex_id_idx" ON "tax"."iss_withholdings"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "iss_withholdings_withholding_date_idx" ON "tax"."iss_withholdings"("withholding_date");

-- CreateIndex
CREATE INDEX "tax_compensations_cinema_complex_id_idx" ON "tax"."tax_compensations"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "tax_compensations_tax_type_idx" ON "tax"."tax_compensations"("tax_type");

-- CreateIndex
CREATE INDEX "tax_compensations_credit_competence_date_idx" ON "tax"."tax_compensations"("credit_competence_date");

-- CreateIndex
CREATE INDEX "revenue_types_company_id_idx" ON "tax"."revenue_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_types_company_id_name_key" ON "tax"."revenue_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "tax_types_company_id_idx" ON "tax"."tax_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_types_company_id_name_key" ON "tax"."tax_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "credit_types_company_id_idx" ON "tax"."credit_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_types_company_id_name_key" ON "tax"."credit_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "product_categories_company_id_idx" ON "catalog"."product_categories"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_company_id_name_key" ON "catalog"."product_categories"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "catalog"."products"("product_code");

-- CreateIndex
CREATE INDEX "products_company_id_idx" ON "catalog"."products"("company_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "catalog"."products"("category_id");

-- CreateIndex
CREATE INDEX "products_product_code_idx" ON "catalog"."products"("product_code");

-- CreateIndex
CREATE INDEX "products_active_idx" ON "catalog"."products"("active");

-- CreateIndex
CREATE UNIQUE INDEX "combos_combo_code_key" ON "catalog"."combos"("combo_code");

-- CreateIndex
CREATE INDEX "combos_company_id_idx" ON "catalog"."combos"("company_id");

-- CreateIndex
CREATE INDEX "combos_combo_code_idx" ON "catalog"."combos"("combo_code");

-- CreateIndex
CREATE INDEX "combos_active_idx" ON "catalog"."combos"("active");

-- CreateIndex
CREATE INDEX "combos_promotion_start_date_promotion_end_date_idx" ON "catalog"."combos"("promotion_start_date", "promotion_end_date");

-- CreateIndex
CREATE INDEX "combo_products_combo_id_idx" ON "catalog"."combo_products"("combo_id");

-- CreateIndex
CREATE INDEX "combo_products_product_id_idx" ON "catalog"."combo_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "combo_products_combo_id_product_id_key" ON "catalog"."combo_products"("combo_id", "product_id");

-- CreateIndex
CREATE INDEX "age_ratings_company_id_idx" ON "catalog"."age_ratings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "age_ratings_company_id_code_key" ON "catalog"."age_ratings"("company_id", "code");

-- CreateIndex
CREATE INDEX "movie_categories_company_id_idx" ON "catalog"."movie_categories"("company_id");

-- CreateIndex
CREATE INDEX "movie_categories_active_idx" ON "catalog"."movie_categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "movie_categories_company_id_slug_key" ON "catalog"."movie_categories"("company_id", "slug");

-- CreateIndex
CREATE INDEX "cast_types_company_id_idx" ON "catalog"."cast_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cast_types_company_id_name_key" ON "catalog"."cast_types"("company_id", "name");

-- CreateIndex
CREATE INDEX "media_types_company_id_idx" ON "catalog"."media_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_types_company_id_name_key" ON "catalog"."media_types"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "movies_slug_key" ON "catalog"."movies"("slug");

-- CreateIndex
CREATE INDEX "movies_distributor_id_idx" ON "catalog"."movies"("distributor_id");

-- CreateIndex
CREATE INDEX "movies_age_rating_idx" ON "catalog"."movies"("age_rating");

-- CreateIndex
CREATE INDEX "movies_category_id_idx" ON "catalog"."movies"("category_id");

-- CreateIndex
CREATE INDEX "movies_active_idx" ON "catalog"."movies"("active");

-- CreateIndex
CREATE INDEX "movies_national_idx" ON "catalog"."movies"("national");

-- CreateIndex
CREATE INDEX "movies_genre_idx" ON "catalog"."movies"("genre");

-- CreateIndex
CREATE INDEX "movies_slug_idx" ON "catalog"."movies"("slug");

-- CreateIndex
CREATE INDEX "movies_tmdb_id_idx" ON "catalog"."movies"("tmdb_id");

-- CreateIndex
CREATE INDEX "movies_imdb_id_idx" ON "catalog"."movies"("imdb_id");

-- CreateIndex
CREATE INDEX "movie_cast_movie_id_idx" ON "catalog"."movie_cast"("movie_id");

-- CreateIndex
CREATE INDEX "movie_cast_cast_type_idx" ON "catalog"."movie_cast"("cast_type");

-- CreateIndex
CREATE INDEX "movie_cast_active_idx" ON "catalog"."movie_cast"("active");

-- CreateIndex
CREATE INDEX "movie_media_movie_id_idx" ON "catalog"."movie_media"("movie_id");

-- CreateIndex
CREATE INDEX "movie_media_media_type_idx" ON "catalog"."movie_media"("media_type");

-- CreateIndex
CREATE INDEX "movie_media_active_idx" ON "catalog"."movie_media"("active");

-- CreateIndex
CREATE INDEX "contract_types_company_id_idx" ON "contracts"."contract_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_types_company_id_name_key" ON "contracts"."contract_types"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "exhibition_contracts_contract_number_key" ON "contracts"."exhibition_contracts"("contract_number");

-- CreateIndex
CREATE INDEX "exhibition_contracts_movie_id_idx" ON "contracts"."exhibition_contracts"("movie_id");

-- CreateIndex
CREATE INDEX "exhibition_contracts_cinema_complex_id_idx" ON "contracts"."exhibition_contracts"("cinema_complex_id");

-- CreateIndex
CREATE INDEX "exhibition_contracts_distributor_id_idx" ON "contracts"."exhibition_contracts"("distributor_id");

-- CreateIndex
CREATE INDEX "exhibition_contracts_contract_type_idx" ON "contracts"."exhibition_contracts"("contract_type");

-- CreateIndex
CREATE INDEX "exhibition_contracts_revenue_base_idx" ON "contracts"."exhibition_contracts"("revenue_base");

-- CreateIndex
CREATE INDEX "exhibition_contracts_start_date_end_date_idx" ON "contracts"."exhibition_contracts"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "exhibition_contracts_active_idx" ON "contracts"."exhibition_contracts"("active");

-- AddForeignKey
ALTER TABLE "identity"."identities" ADD CONSTRAINT "identities_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "identity"."persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."identities" ADD CONSTRAINT "identities_linked_identity_id_fkey" FOREIGN KEY ("linked_identity_id") REFERENCES "identity"."identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."custom_roles" ADD CONSTRAINT "custom_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "identity"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."permissions" ADD CONSTRAINT "permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "identity"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "identity"."custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "identity"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "identity"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."company_users" ADD CONSTRAINT "company_users_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identity"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."company_users" ADD CONSTRAINT "company_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "identity"."custom_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."user_attributes" ADD CONSTRAINT "user_attributes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."user_sessions" ADD CONSTRAINT "user_sessions_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identity"."identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "hr"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "hr"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."employees" ADD CONSTRAINT "employees_contract_type_fkey" FOREIGN KEY ("contract_type") REFERENCES "hr"."employment_contract_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr"."employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "hr"."positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."distributor_settlements" ADD CONSTRAINT "distributor_settlements_calculation_base_fkey" FOREIGN KEY ("calculation_base") REFERENCES "finance"."settlement_bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."distributor_settlements" ADD CONSTRAINT "distributor_settlements_status_fkey" FOREIGN KEY ("status") REFERENCES "finance"."distributor_settlement_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."journal_entries" ADD CONSTRAINT "journal_entries_status_fkey" FOREIGN KEY ("status") REFERENCES "finance"."journal_entry_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."journal_entries" ADD CONSTRAINT "journal_entries_entry_type_fkey" FOREIGN KEY ("entry_type") REFERENCES "finance"."journal_entry_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."journal_entry_items" ADD CONSTRAINT "journal_entry_items_movement_type_fkey" FOREIGN KEY ("movement_type") REFERENCES "finance"."accounting_movement_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."journal_entry_items" ADD CONSTRAINT "journal_entry_items_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "finance"."journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."journal_entry_items" ADD CONSTRAINT "journal_entry_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance"."chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_account_nature_fkey" FOREIGN KEY ("account_nature") REFERENCES "finance"."account_natures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_account_type_fkey" FOREIGN KEY ("account_type") REFERENCES "finance"."account_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "finance"."chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_preferences" ADD CONSTRAINT "customer_preferences_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_preferred_rows" ADD CONSTRAINT "customer_preferred_rows_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_preferred_times" ADD CONSTRAINT "customer_preferred_times_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_preferred_weekdays" ADD CONSTRAINT "customer_preferred_weekdays_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_favorite_combos" ADD CONSTRAINT "customer_favorite_combos_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_favorite_genres" ADD CONSTRAINT "customer_favorite_genres_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_interactions" ADD CONSTRAINT "customer_interactions_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_points" ADD CONSTRAINT "customer_points_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."customer_favorite_products" ADD CONSTRAINT "customer_favorite_products_company_customer_id_fkey" FOREIGN KEY ("company_customer_id") REFERENCES "crm"."company_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."company_customers" ADD CONSTRAINT "company_customers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales" ADD CONSTRAINT "sales_sale_type_fkey" FOREIGN KEY ("sale_type") REFERENCES "sales"."sale_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales" ADD CONSTRAINT "sales_payment_method_fkey" FOREIGN KEY ("payment_method") REFERENCES "sales"."payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales" ADD CONSTRAINT "sales_status_fkey" FOREIGN KEY ("status") REFERENCES "sales"."sale_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."tickets" ADD CONSTRAINT "tickets_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."tickets" ADD CONSTRAINT "tickets_ticket_type_fkey" FOREIGN KEY ("ticket_type") REFERENCES "sales"."ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."concession_sales" ADD CONSTRAINT "concession_sales_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."concession_sales" ADD CONSTRAINT "concession_sales_status_fkey" FOREIGN KEY ("status") REFERENCES "sales"."concession_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."concession_sale_items" ADD CONSTRAINT "concession_sale_items_concession_sale_id_fkey" FOREIGN KEY ("concession_sale_id") REFERENCES "sales"."concession_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."promotions_used" ADD CONSTRAINT "promotions_used_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"."sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."suppliers" ADD CONSTRAINT "suppliers_supplier_type_fkey" FOREIGN KEY ("supplier_type") REFERENCES "inventory"."supplier_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."campaign_categories" ADD CONSTRAINT "campaign_categories_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing"."promotional_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."campaign_complexes" ADD CONSTRAINT "campaign_complexes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing"."promotional_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."campaign_movies" ADD CONSTRAINT "campaign_movies_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing"."promotional_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."campaign_rooms" ADD CONSTRAINT "campaign_rooms_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing"."promotional_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."campaign_session_types" ADD CONSTRAINT "campaign_session_types_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing"."promotional_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."campaign_weekdays" ADD CONSTRAINT "campaign_weekdays_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing"."promotional_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."promotional_campaigns" ADD CONSTRAINT "promotional_campaigns_promotion_type_id_fkey" FOREIGN KEY ("promotion_type_id") REFERENCES "marketing"."promotion_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing"."promotional_coupons" ADD CONSTRAINT "promotional_coupons_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "marketing"."promotional_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."rooms" ADD CONSTRAINT "rooms_audio_type_fkey" FOREIGN KEY ("audio_type") REFERENCES "operations"."audio_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."rooms" ADD CONSTRAINT "rooms_projection_type_fkey" FOREIGN KEY ("projection_type") REFERENCES "operations"."projection_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."rooms" ADD CONSTRAINT "rooms_cinema_complex_id_fkey" FOREIGN KEY ("cinema_complex_id") REFERENCES "operations"."cinema_complexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."showtime_schedule" ADD CONSTRAINT "showtime_schedule_cinema_complex_id_fkey" FOREIGN KEY ("cinema_complex_id") REFERENCES "operations"."cinema_complexes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."showtime_schedule" ADD CONSTRAINT "showtime_schedule_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "operations"."rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."showtime_schedule" ADD CONSTRAINT "showtime_schedule_projection_type_fkey" FOREIGN KEY ("projection_type") REFERENCES "operations"."projection_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."showtime_schedule" ADD CONSTRAINT "showtime_schedule_audio_type_fkey" FOREIGN KEY ("audio_type") REFERENCES "operations"."audio_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."showtime_schedule" ADD CONSTRAINT "showtime_schedule_session_language_fkey" FOREIGN KEY ("session_language") REFERENCES "operations"."session_languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."showtime_schedule" ADD CONSTRAINT "showtime_schedule_status_fkey" FOREIGN KEY ("status") REFERENCES "operations"."session_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."session_seat_status" ADD CONSTRAINT "session_seat_status_showtime_id_fkey" FOREIGN KEY ("showtime_id") REFERENCES "operations"."showtime_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."session_seat_status" ADD CONSTRAINT "session_seat_status_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "operations"."seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."session_seat_status" ADD CONSTRAINT "session_seat_status_status_fkey" FOREIGN KEY ("status") REFERENCES "operations"."seat_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."seats" ADD CONSTRAINT "seats_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "operations"."rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations"."seats" ADD CONSTRAINT "seats_seat_type_fkey" FOREIGN KEY ("seat_type") REFERENCES "operations"."seat_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."recine_acquisitions" ADD CONSTRAINT "recine_acquisitions_recine_project_id_fkey" FOREIGN KEY ("recine_project_id") REFERENCES "projects"."recine_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects"."recine_deadlines" ADD CONSTRAINT "recine_deadlines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"."recine_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock"."stock_movements" ADD CONSTRAINT "stock_movements_movement_type_fkey" FOREIGN KEY ("movement_type") REFERENCES "stock"."stock_movement_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax"."monthly_tax_settlement" ADD CONSTRAINT "monthly_tax_settlement_status_fkey" FOREIGN KEY ("status") REFERENCES "tax"."settlement_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog"."product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."combo_products" ADD CONSTRAINT "combo_products_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "catalog"."combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."combo_products" ADD CONSTRAINT "combo_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movies" ADD CONSTRAINT "movies_age_rating_fkey" FOREIGN KEY ("age_rating") REFERENCES "catalog"."age_ratings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movies" ADD CONSTRAINT "movies_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog"."movie_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movie_cast" ADD CONSTRAINT "movie_cast_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "catalog"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movie_cast" ADD CONSTRAINT "movie_cast_cast_type_fkey" FOREIGN KEY ("cast_type") REFERENCES "catalog"."cast_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movie_media" ADD CONSTRAINT "movie_media_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "catalog"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movie_media" ADD CONSTRAINT "movie_media_media_type_fkey" FOREIGN KEY ("media_type") REFERENCES "catalog"."media_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."exhibition_contracts" ADD CONSTRAINT "exhibition_contracts_contract_type_fkey" FOREIGN KEY ("contract_type") REFERENCES "contracts"."contract_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
