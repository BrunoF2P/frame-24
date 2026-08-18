/*
  Warnings:

  - You are about to drop the column `session_date` on the `showtime_schedule` table. All the data in the column will be lost.
  - You are about to drop the column `session_time` on the `showtime_schedule` table. All the data in the column will be lost.
  - Added the required column `end_time` to the `showtime_schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `showtime_schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "operations"."showtime_schedule_session_date_session_time_idx";

-- AlterTable
ALTER TABLE "operations"."showtime_schedule"
DROP COLUMN "session_date",
  DROP COLUMN "session_time";

ALTER TABLE "operations"."showtime_schedule"
    ADD COLUMN "start_time" TIMESTAMP(3),
  ADD COLUMN "end_time" TIMESTAMP(3);

UPDATE "operations"."showtime_schedule" SET "start_time" = "created_at", "end_time" = "created_at" WHERE "start_time" IS NULL;

ALTER TABLE "operations"."showtime_schedule"
    ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "end_time" SET NOT NULL;

-- CreateIndex
CREATE INDEX "showtime_schedule_start_time_end_time_idx" ON "operations"."showtime_schedule"("start_time", "end_time");
