/*
  Warnings:

  - You are about to drop the column `supplier_type` on the `suppliers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventory"."suppliers" DROP CONSTRAINT "suppliers_supplier_type_fkey";

-- DropIndex
DROP INDEX "inventory"."suppliers_supplier_type_idx";

-- AlterTable
ALTER TABLE "inventory"."suppliers" DROP COLUMN "supplier_type",
ADD COLUMN     "supplier_type_id" TEXT;

-- CreateIndex
CREATE INDEX "suppliers_supplier_type_id_idx" ON "inventory"."suppliers"("supplier_type_id");

-- AddForeignKey
ALTER TABLE "inventory"."suppliers" ADD CONSTRAINT "suppliers_supplier_type_id_fkey" FOREIGN KEY ("supplier_type_id") REFERENCES "inventory"."supplier_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
