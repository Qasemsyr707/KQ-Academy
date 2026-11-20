-- KQ Academy release preflight. READ-ONLY: it changes nothing.
-- Run it on the target database before the migration files and keep the output.
-- Every row in the first result must say "ok". Anything else: stop and report it.

SELECT check_name, CASE WHEN passed THEN 'ok' ELSE 'STOP' END AS result, detail FROM (
  SELECT 'postgres >= 13' AS check_name, current_setting('server_version_num')::int >= 130000 AS passed, version() AS detail
  UNION ALL
  SELECT 'tables exist', count(*) = 6, string_agg(table_name, ', ')
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('User', 'Lesson', 'Course', 'Certificate', 'Notification', 'Enrollment')
  UNION ALL
  SELECT 'Notification has the expected columns', count(*) = 7, string_agg(column_name, ', ')
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Notification'
      AND column_name IN ('id', 'userId', 'title', 'message', 'link', 'isRead', 'createdAt')
  UNION ALL
  SELECT 'Certificate has the expected columns', count(*) = 6, string_agg(column_name, ', ')
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Certificate'
      AND column_name IN ('id', 'certificateNumber', 'userId', 'courseId', 'templateVersion', 'issuedAt')
  UNION ALL
  SELECT 'no conflicting LessonProgress table', NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'LessonProgress'
    ) OR EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'LessonProgress' AND column_name = 'lessonId'
    ), 'absent, or already created by this release'
) checks;

-- Already applied? (columns from this release; both files are safe to re-run)
SELECT table_name, column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND ((table_name = 'Notification' AND column_name = 'dedupeKey')
     OR (table_name = 'Certificate' AND column_name = 'verifyToken')
     OR (table_name = 'Course' AND column_name = 'durationHours'));

-- Size of what the migration touches (indexes are built on these tables).
SELECT 'Notification' AS table_name, count(*) AS rows FROM "Notification"
UNION ALL SELECT 'Certificate', count(*) FROM "Certificate"
UNION ALL SELECT 'Course', count(*) FROM "Course";

-- Certificates that will be rendered as originals (template 1.0); they are not modified.
SELECT "templateVersion", count(*) FROM "Certificate" GROUP BY "templateVersion";
