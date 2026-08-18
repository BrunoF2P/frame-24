-- AlterTable: make cpf optional in crm.customers
ALTER TABLE "crm"."customers" ALTER COLUMN "cpf" DROP NOT NULL;
