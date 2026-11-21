-- KQ Academy: one LiveClass record per live session, linked to the course lesson that shows it.
-- Additive only: nullable columns, indexes, one foreign key. No existing row is changed;
-- older lesson-based sessions keep working through their own room name. Safe to run more than once.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "lessonId" TEXT;
ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "LiveClass" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "LiveClass_lessonId_key" ON "LiveClass"("lessonId");
CREATE INDEX IF NOT EXISTS "LiveClass_instructorId_status_idx" ON "LiveClass"("instructorId", "status");
CREATE INDEX IF NOT EXISTS "LiveClass_courseId_status_idx" ON "LiveClass"("courseId", "status");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveClass_lessonId_fkey') THEN
    ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_lessonId_fkey"
      FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
