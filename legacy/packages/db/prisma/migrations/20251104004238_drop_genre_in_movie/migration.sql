/*
  Warnings:

  - You are about to drop the column `genre` on the `movies` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "catalog"."movies_genre_idx";

-- AlterTable
ALTER TABLE "catalog"."movies" DROP COLUMN "genre";
