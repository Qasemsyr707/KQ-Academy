-- KQ Academy: optional chapter quizzes and a course final exam.
-- Additive only. Existing quizzes keep their behaviour: published, required for the certificate
-- (the rule that already applied), unlimited attempts. Existing attempts and certificates are untouched.
-- Safe to run more than once.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'CHAPTER';
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "requiredForCertificate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "requiredSince" TIMESTAMP(3);
-- 1 = the original pass rule for every existing quiz; new quizzes are created with 2.
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "scoringVersion" INTEGER NOT NULL DEFAULT 1;
-- A final exam has no chapter. Relaxing NOT NULL changes no existing row.
ALTER TABLE "Quiz" ALTER COLUMN "chapterId" DROP NOT NULL;

ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "answers" JSONB;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "totalPoints" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "Quiz_courseId_idx" ON "Quiz"("courseId");
-- At most one final exam per course.
CREATE UNIQUE INDEX IF NOT EXISTS "Quiz_one_final_per_course" ON "Quiz"("courseId") WHERE "kind" = 'FINAL';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Quiz_courseId_fkey') THEN
    ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId")
      REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
