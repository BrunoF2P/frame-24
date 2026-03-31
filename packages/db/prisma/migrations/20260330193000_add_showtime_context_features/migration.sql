-- CreateTable
CREATE TABLE "operations"."showtime_context_features" (
    "id" TEXT NOT NULL,
    "showtime_id" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "country_code" CHAR(2),
    "state_code" CHAR(2),
    "city_name" VARCHAR(100),
    "is_holiday" BOOLEAN DEFAULT false,
    "is_holiday_eve" BOOLEAN DEFAULT false,
    "holiday_name" VARCHAR(150),
    "holiday_scope" VARCHAR(30),
    "holiday_date" DATE,
    "weather_code" INTEGER,
    "temperature_c" DECIMAL(5,2),
    "apparent_temperature_c" DECIMAL(5,2),
    "precipitation_mm" DECIMAL(6,2),
    "rain_mm" DECIMAL(6,2),
    "cloud_cover_pct" INTEGER,
    "wind_speed_kmh" DECIMAL(5,2),
    "demand_context_score" DECIMAL(8,4),
    "external_market_signal" DECIMAL(12,2),
    "metadata_json" TEXT,
    "captured_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "showtime_context_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "showtime_context_features_showtime_id_key" ON "operations"."showtime_context_features"("showtime_id");

-- CreateIndex
CREATE INDEX "showtime_context_features_source_idx" ON "operations"."showtime_context_features"("source");

-- CreateIndex
CREATE INDEX "showtime_context_features_is_holiday_holiday_date_idx" ON "operations"."showtime_context_features"("is_holiday", "holiday_date");

-- CreateIndex
CREATE INDEX "showtime_context_features_state_code_city_name_idx" ON "operations"."showtime_context_features"("state_code", "city_name");

-- CreateIndex
CREATE INDEX "showtime_context_features_weather_code_idx" ON "operations"."showtime_context_features"("weather_code");

-- AddForeignKey
ALTER TABLE "operations"."showtime_context_features" ADD CONSTRAINT "showtime_context_features_showtime_id_fkey" FOREIGN KEY ("showtime_id") REFERENCES "operations"."showtime_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
