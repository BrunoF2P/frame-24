-- AlterTable
ALTER TABLE "catalog"."movies" ADD COLUMN     "popularity" DOUBLE PRECISION,
ADD COLUMN     "tmdb_genres_json" TEXT,
ADD COLUMN     "tmdb_keywords_json" TEXT,
ADD COLUMN     "tmdb_poster_path" VARCHAR(300),
ADD COLUMN     "tmdb_synced_at" TIMESTAMP(3),
ADD COLUMN     "vote_average" DOUBLE PRECISION,
ADD COLUMN     "vote_count" INTEGER;

-- CreateTable
CREATE TABLE "catalog"."recommendation_events" (
    "id" TEXT NOT NULL,
    "company_customer_id" TEXT,
    "movie_id" TEXT NOT NULL,
    "algorithm_version" VARCHAR(50) NOT NULL,
    "position" INTEGER NOT NULL,
    "context" VARCHAR(50),
    "recommended_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "clicked_at" TIMESTAMP(0),
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchased_at" TIMESTAMP(0),
    "purchased_sale_id" TEXT,

    CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_events_company_customer_id_recommended_at_idx" ON "catalog"."recommendation_events"("company_customer_id", "recommended_at");

-- CreateIndex
CREATE INDEX "recommendation_events_movie_id_idx" ON "catalog"."recommendation_events"("movie_id");

-- CreateIndex
CREATE INDEX "recommendation_events_algorithm_version_idx" ON "catalog"."recommendation_events"("algorithm_version");

-- CreateIndex
CREATE INDEX "recommendation_events_context_idx" ON "catalog"."recommendation_events"("context");

-- CreateIndex
CREATE INDEX "recommendation_events_purchased_idx" ON "catalog"."recommendation_events"("purchased");

-- CreateIndex
CREATE INDEX "movies_popularity_idx" ON "catalog"."movies"("popularity");

-- AddForeignKey
ALTER TABLE "catalog"."recommendation_events" ADD CONSTRAINT "recommendation_events_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "catalog"."movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
