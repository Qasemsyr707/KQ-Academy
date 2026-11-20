-- KQ Academy, removal of the Phase 2 course taxonomy additions.
--
-- NOT NEEDED FOR A CODE ROLLBACK. The previous release (170d966) runs correctly with
-- these additions in place: it never reads them, and new columns have defaults.
-- Rolling the application back in Coolify is enough and keeps every category,
-- course link, tag and training type.
--
-- Only run this when the taxonomy is abandoned permanently. It DELETES:
--   * every category and subcategory, including ones administrators created or renamed,
--   * the link from each course to its category ("categoryId"),
--   * course tags and training types entered by instructors/administrators.
-- It does NOT touch "Course"."category": every course keeps the category text it shows.
-- Take a backup first.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_categoryId_fkey";
DROP INDEX IF EXISTS "Course_categoryId_idx";
ALTER TABLE "Course" DROP COLUMN IF EXISTS "categoryId";
ALTER TABLE "Course" DROP COLUMN IF EXISTS "tags";
ALTER TABLE "Course" DROP COLUMN IF EXISTS "trainingType";

DROP TABLE IF EXISTS "Category";

COMMIT;
