-- CreateEnum
CREATE TYPE "catalog"."recommendation_delivery_channel" AS ENUM ('WHATSAPP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "catalog"."recommendation_delivery_status" AS ENUM (
    'PENDING',
    'SKIPPED',
    'SENT',
    'DELIVERED',
    'OPENED',
    'CLICKED',
    'FAILED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "catalog"."recommendation_deliveries" (
    "id" TEXT NOT NULL,
    "recommendation_event_id" TEXT NOT NULL,
    "channel" "catalog"."recommendation_delivery_channel" NOT NULL,
    "status" "catalog"."recommendation_delivery_status" NOT NULL DEFAULT 'PENDING',
    "campaign_id" VARCHAR(100),
    "template_key" VARCHAR(100),
    "provider_name" VARCHAR(50),
    "provider_message_id" VARCHAR(150),
    "scheduled_at" TIMESTAMP(0),
    "sent_at" TIMESTAMP(0),
    "delivered_at" TIMESTAMP(0),
    "opened_at" TIMESTAMP(0),
    "clicked_at" TIMESTAMP(0),
    "failed_at" TIMESTAMP(0),
    "error_message" TEXT,
    "metadata_json" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "recommendation_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_deliveries_recommendation_event_id_idx" ON "catalog"."recommendation_deliveries"("recommendation_event_id");

-- CreateIndex
CREATE INDEX "recommendation_deliveries_channel_status_idx" ON "catalog"."recommendation_deliveries"("channel", "status");

-- CreateIndex
CREATE INDEX "recommendation_deliveries_campaign_id_idx" ON "catalog"."recommendation_deliveries"("campaign_id");

-- CreateIndex
CREATE INDEX "recommendation_deliveries_provider_message_id_idx" ON "catalog"."recommendation_deliveries"("provider_message_id");

-- CreateIndex
CREATE INDEX "recommendation_deliveries_scheduled_at_idx" ON "catalog"."recommendation_deliveries"("scheduled_at");

-- CreateIndex
CREATE INDEX "recommendation_deliveries_sent_at_idx" ON "catalog"."recommendation_deliveries"("sent_at");

-- CreateIndex
CREATE INDEX "recommendation_deliveries_delivered_at_idx" ON "catalog"."recommendation_deliveries"("delivered_at");

-- CreateIndex
CREATE INDEX "recommendation_deliveries_opened_at_idx" ON "catalog"."recommendation_deliveries"("opened_at");

-- AddForeignKey
ALTER TABLE "catalog"."recommendation_events"
ADD CONSTRAINT "recommendation_events_company_customer_id_fkey"
FOREIGN KEY ("company_customer_id")
REFERENCES "crm"."company_customers"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."recommendation_deliveries"
ADD CONSTRAINT "recommendation_deliveries_recommendation_event_id_fkey"
FOREIGN KEY ("recommendation_event_id")
REFERENCES "catalog"."recommendation_events"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
