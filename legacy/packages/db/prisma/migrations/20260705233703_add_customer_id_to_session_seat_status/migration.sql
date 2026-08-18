-- Add customer_id column for reservation ownership tracking
ALTER TABLE "operations"."session_seat_status" ADD COLUMN "customer_id" TEXT;