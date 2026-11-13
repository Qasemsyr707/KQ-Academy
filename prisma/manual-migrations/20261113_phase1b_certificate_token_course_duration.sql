-- Phase 1 follow-up (certificate verification tokens + real course duration).
-- Additive only: two new NULLABLE columns and one unique index on a new, empty column.
-- No existing row is changed or removed. Apply AFTER 20261113_phase1_notifications_progress.sql
-- and BEFORE deploying the code that uses it. Take a backup first.
BEGIN;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "durationHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "verifyToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verifyToken_key" ON "Certificate"("verifyToken");


COMMIT;
