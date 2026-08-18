-- DropForeignKey
ALTER TABLE "sales"."sales" DROP CONSTRAINT "sales_payment_method_fkey";

-- DropForeignKey
ALTER TABLE "sales"."sales" DROP CONSTRAINT "sales_sale_type_fkey";

-- DropForeignKey
ALTER TABLE "sales"."sales" DROP CONSTRAINT "sales_status_fkey";

-- DropIndex
DROP INDEX "identity"."idx_custom_roles_company_hierarchy";

-- AlterTable
ALTER TABLE "audit"."audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."age_ratings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."cast_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."combo_products" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."combos" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."media_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."movie_cast" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."movie_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."movie_media" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."movies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."product_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."product_prices" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "catalog"."products" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contracts"."contract_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contracts"."exhibition_contract_sliding_scales" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contracts"."exhibition_contracts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."company_customers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_favorite_combos" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_favorite_genres" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_favorite_products" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_interactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_points" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_preferences" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_preferred_rows" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_preferred_times" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customer_preferred_weekdays" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."customers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."account_natures" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."account_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."accounting_movement_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."accounts_payable" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."accounts_receivable" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."bank_accounts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."bank_reconciliations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."cash_flow_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."chart_of_accounts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."contingency_reserves" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."contingency_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."contingency_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."distributor_settlement_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."distributor_settlements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."journal_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."journal_entry_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."journal_entry_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."journal_entry_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."monthly_income_statement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."payable_transactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."receivable_transactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance"."settlement_bases" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr"."departments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr"."employees" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr"."employment_contract_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "hr"."positions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."companies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."company_users" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."custom_roles" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."identities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."permissions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."persons" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."role_permissions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."user_attributes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "identity"."user_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory"."supplier_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory"."suppliers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."campaign_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."campaign_complexes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."campaign_movies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."campaign_rooms" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."campaign_session_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."campaign_weekdays" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."promotion_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."promotional_campaigns" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "marketing"."promotional_coupons" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."audio_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."cinema_complexes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."courtesy_parameters" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."projection_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."rooms" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."seat_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."seat_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."seats" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."session_languages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."session_seat_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."session_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "operations"."showtime_schedule" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_acquisition_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_acquisitions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_deadline_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_deadlines" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_item_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_project_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_project_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects"."recine_projects" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."concession_sale_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."concession_sales" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."concession_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."payment_methods" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."promotions_used" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."sale_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."sale_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."sales" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."ticket_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales"."tickets" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock"."product_stock" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock"."stock_movement_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock"."stock_movements" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."credit_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."federal_tax_rates" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."iss_withholdings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."monthly_tax_settlement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."municipal_tax_parameters" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."pis_cofins_credits" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."revenue_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."settlement_status" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."simple_national_brackets" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."state_icms_parameters" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."tax_compensations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."tax_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tax"."tax_types" ALTER COLUMN "id" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "sales"."sales" ADD CONSTRAINT "sales_payment_method_fkey" FOREIGN KEY ("payment_method") REFERENCES "sales"."payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales" ADD CONSTRAINT "sales_sale_type_fkey" FOREIGN KEY ("sale_type") REFERENCES "sales"."sale_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."sales" ADD CONSTRAINT "sales_status_fkey" FOREIGN KEY ("status") REFERENCES "sales"."sale_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
