/*
  Warnings:

  - A unique constraint covering the columns `[company_id,slug]` on the table `movie_categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "catalog"."movie_categories_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "movie_categories_company_id_slug_key" ON "catalog"."movie_categories"("company_id", "slug");
