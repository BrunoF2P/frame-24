-- AlterTable
ALTER TABLE "operations"."seat_status" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "seat_status_company_id_is_default_idx" ON "operations"."seat_status"("company_id", "is_default");
