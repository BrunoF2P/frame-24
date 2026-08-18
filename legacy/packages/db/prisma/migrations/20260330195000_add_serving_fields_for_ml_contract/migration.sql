-- AlterTable
ALTER TABLE "operations"."cinema_complexes"
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "timezone" VARCHAR(50);

-- AlterTable
ALTER TABLE "catalog"."recommendation_events"
ADD COLUMN     "showtime_id" TEXT,
ADD COLUMN     "model_name" VARCHAR(100),
ADD COLUMN     "feature_version" VARCHAR(50),
ADD COLUMN     "score" DECIMAL(10,6);

-- CreateIndex
CREATE INDEX "cinema_complexes_latitude_longitude_idx" ON "operations"."cinema_complexes"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "recommendation_events_showtime_id_idx" ON "catalog"."recommendation_events"("showtime_id");

-- CreateIndex
CREATE INDEX "recommendation_events_model_name_idx" ON "catalog"."recommendation_events"("model_name");

-- CreateIndex
CREATE INDEX "recommendation_events_feature_version_idx" ON "catalog"."recommendation_events"("feature_version");

-- CreateIndex
CREATE INDEX "recommendation_events_score_idx" ON "catalog"."recommendation_events"("score");

-- AddForeignKey
ALTER TABLE "catalog"."recommendation_events"
ADD CONSTRAINT "recommendation_events_showtime_id_fkey"
FOREIGN KEY ("showtime_id") REFERENCES "operations"."showtime_schedule"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
