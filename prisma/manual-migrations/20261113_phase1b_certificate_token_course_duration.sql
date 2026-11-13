-- KQ Academy, Phase 1 follow-up (certificate verification tokens + real course duration).
-- Additive only: two new NULLABLE columns and one unique index on a new, empty column.
-- Existing certificates are not modified: their verifyToken stays NULL and they keep
-- being verified through their own record id. Safe to run more than once.
-- Run after 20261113_phase1_notifications_progress.sql.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "durationHours" DOUBLE PRECISION;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "verifyToken" TEXT;
-- Several NULLs are allowed by a PostgreSQL unique index, so old rows need no value.
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_verifyToken_key" ON "Certificate"("verifyToken");

COMMIT;
