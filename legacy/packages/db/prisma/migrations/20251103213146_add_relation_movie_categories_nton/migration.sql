/*
  Warnings:

  - You are about to drop the column `age_rating` on the `movies` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `movies` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `movie_categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[company_id,name]` on the table `movie_categories` will be added. If there are existing duplicate values, this will fail.
  - Made the column `slug` on table `movie_categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `active` on table `movie_categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `movie_categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `national` on table `movies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `active` on table `movies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `movies` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "catalog"."movies" DROP CONSTRAINT "movies_age_rating_fkey";

-- DropForeignKey
ALTER TABLE "catalog"."movies" DROP CONSTRAINT "movies_category_id_fkey";

-- DropIndex
DROP INDEX "catalog"."movie_categories_company_id_slug_key";

-- DropIndex
DROP INDEX "catalog"."movies_age_rating_idx";

-- DropIndex
DROP INDEX "catalog"."movies_category_id_idx";

-- AlterTable
ALTER TABLE "catalog"."movie_categories" ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "active" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "catalog"."movies" DROP COLUMN "age_rating",
DROP COLUMN "category_id",
ADD COLUMN     "age_rating_id" TEXT,
ADD COLUMN     "movie_categoriesId" TEXT,
ALTER COLUMN "national" SET NOT NULL,
ALTER COLUMN "active" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- CreateTable
CREATE TABLE "catalog"."movies_on_categories" (
    "movie_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "age_ratingsId" TEXT,

    CONSTRAINT "movies_on_categories_pkey" PRIMARY KEY ("movie_id","category_id")
);

-- CreateIndex
CREATE INDEX "movies_on_categories_category_id_idx" ON "catalog"."movies_on_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "movie_categories_slug_key" ON "catalog"."movie_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "movie_categories_company_id_name_key" ON "catalog"."movie_categories"("company_id", "name");

-- CreateIndex
CREATE INDEX "movies_company_id_idx" ON "catalog"."movies"("company_id");

-- CreateIndex
CREATE INDEX "movies_age_rating_id_idx" ON "catalog"."movies"("age_rating_id");

-- AddForeignKey
ALTER TABLE "catalog"."movies_on_categories" ADD CONSTRAINT "movies_on_categories_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "catalog"."movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movies_on_categories" ADD CONSTRAINT "movies_on_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog"."movie_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movies_on_categories" ADD CONSTRAINT "movies_on_categories_age_ratingsId_fkey" FOREIGN KEY ("age_ratingsId") REFERENCES "catalog"."age_ratings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movies" ADD CONSTRAINT "movies_age_rating_id_fkey" FOREIGN KEY ("age_rating_id") REFERENCES "catalog"."age_ratings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."movies" ADD CONSTRAINT "movies_movie_categoriesId_fkey" FOREIGN KEY ("movie_categoriesId") REFERENCES "catalog"."movie_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
