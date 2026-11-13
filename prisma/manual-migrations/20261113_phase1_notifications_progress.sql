-- KQ Academy, Phase 1 (notifications + lesson progress).
-- Additive only: one new nullable column, one new table, four indexes, two foreign
-- keys. No existing row or column is changed or removed. Safe to run more than once.
-- Order: run 00_preflight_readonly.sql first, then this file, then the phase1b file.
-- Take a database backup before running it on production.
BEGIN;
-- Fail fast instead of waiting behind a long-running query on a live database.
SET LOCAL lock_timeout = '5s';

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;

CREATE TABLE IF NOT EXISTS "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LessonProgress_userId_courseId_idx" ON "LessonProgress"("userId", "courseId");
CREATE UNIQUE INDEX IF NOT EXISTS "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LessonProgress_userId_fkey') THEN
    ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LessonProgress_lessonId_fkey') THEN
    ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey"
      FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
