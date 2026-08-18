-- AlterTable
ALTER TABLE "finance"."accounts_payable" ADD COLUMN     "expense_type" VARCHAR(50);

-- CreateIndex
CREATE INDEX "accounts_payable_expense_type_idx" ON "finance"."accounts_payable"("expense_type");

-- CreateIndex
CREATE INDEX "idx_seat_availability" ON "operations"."session_seat_status"("showtime_id", "sale_id", "reservation_uuid", "expiration_date");

-- CreateIndex
CREATE INDEX "idx_active_reservations" ON "operations"."session_seat_status"("reservation_uuid", "expiration_date", "sale_id");

-- CreateIndex
CREATE INDEX "idx_expiration_cleanup" ON "operations"."session_seat_status"("expiration_date", "reservation_uuid");

-- CreateIndex
CREATE INDEX "idx_reservation_lookup" ON "operations"."session_seat_status"("reservation_uuid", "showtime_id");

-- CreateIndex
CREATE INDEX "idx_showtime_status" ON "operations"."session_seat_status"("showtime_id", "status", "sale_id", "reservation_uuid");
