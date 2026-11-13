-- KQ Academy, removal of the Phase 1 + 1b schema additions.
--
-- NOT NEEDED FOR A CODE ROLLBACK. The previous release (d9aca6f) runs correctly with
-- these additions in place; rolling the application back in Coolify is enough and
-- keeps every new record (lesson progress, notifications, certificate tokens).
--
-- Only run this when the release is abandoned permanently. It DELETES:
--   * all saved lesson progress (LessonProgress),
--   * notification de-duplication keys,
--   * verification tokens of certificates issued by this release (their QR codes
--     and share links then stop resolving),
--   * course durations entered by instructors/admins.
-- Take a backup first.
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP INDEX IF EXISTS "Certificate_verifyToken_key";
ALTER TABLE "Certificate" DROP COLUMN IF EXISTS "verifyToken";
ALTER TABLE "Course" DROP COLUMN IF EXISTS "durationHours";

DROP TABLE IF EXISTS "LessonProgress";
DROP INDEX IF EXISTS "Notification_userId_isRead_createdAt_idx";
DROP INDEX IF EXISTS "Notification_dedupeKey_key";
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "dedupeKey";

COMMIT;
