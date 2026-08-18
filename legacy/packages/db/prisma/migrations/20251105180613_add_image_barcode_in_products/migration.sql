/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "catalog"."products" ADD COLUMN     "barcode" VARCHAR(50),
ADD COLUMN     "image_url" VARCHAR(500),
ADD COLUMN     "supplier_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "catalog"."products"("barcode");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "catalog"."products"("barcode");
