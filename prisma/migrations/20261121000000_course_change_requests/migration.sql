-- KQ Academy: instructor change requests for published courses.
-- Additive only: one new table. Existing courses, enrollments and lessons are untouched.
-- Safe to run more than once.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "CourseChangeRequest" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "previous" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CourseChangeRequest_status_createdAt_idx" ON "CourseChangeRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "CourseChangeRequest_courseId_createdAt_idx" ON "CourseChangeRequest"("courseId", "createdAt");
-- At most one open request per course; a second submission replaces the open one.
CREATE UNIQUE INDEX IF NOT EXISTS "CourseChangeRequest_one_pending_per_course" ON "CourseChangeRequest"("courseId") WHERE "status" = 'PENDING';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CourseChangeRequest_courseId_fkey') THEN
    ALTER TABLE "CourseChangeRequest" ADD CONSTRAINT "CourseChangeRequest_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
