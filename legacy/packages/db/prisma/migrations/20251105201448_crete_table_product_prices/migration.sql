/*
  Warnings:

  - You are about to drop the column `cost_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sale_price` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[company_id,product_code]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "catalog"."products" DROP COLUMN "cost_price",
DROP COLUMN "sale_price";

-- CreateTable
CREATE TABLE "catalog"."product_prices" (
    "id" TEXT NOT NULL DEFAULT '',
    "product_id" TEXT NOT NULL,
    "complex_id" TEXT,
    "company_id" TEXT NOT NULL,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_prices_product_id_idx" ON "catalog"."product_prices"("product_id");

-- CreateIndex
CREATE INDEX "product_prices_product_id_complex_id_active_idx" ON "catalog"."product_prices"("product_id", "complex_id", "active");

-- CreateIndex
CREATE INDEX "product_prices_valid_from_valid_to_idx" ON "catalog"."product_prices"("valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "product_prices_company_id_idx" ON "catalog"."product_prices"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_prices_product_id_complex_id_valid_from_key" ON "catalog"."product_prices"("product_id", "complex_id", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "products_company_id_product_code_key" ON "catalog"."products"("company_id", "product_code");

-- AddForeignKey
ALTER TABLE "catalog"."product_prices" ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
