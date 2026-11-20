-- KQ Academy: granular administrator permissions.
-- Additive only: one new column (empty list by default) and one new audit table.
-- Existing administrators keep their current access: when the column is created, every
-- ADMIN receives all fifteen permissions, recorded in the audit log as MIGRATION_GRANT.
-- OWNER does not use the column (always full access). Accounts promoted later receive nothing.
-- Safe to run more than once: the grant runs only in the run that creates the column, so a
-- re-run never restores a permission the owner has revoked since.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "PermissionAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PermissionAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PermissionAuditLog_targetId_createdAt_idx" ON "PermissionAuditLog"("targetId", "createdAt");
CREATE INDEX IF NOT EXISTS "PermissionAuditLog_createdAt_idx" ON "PermissionAuditLog"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'User' AND column_name = 'adminPermissions'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "adminPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    UPDATE "User" SET "adminPermissions" = ARRAY[
      'DASHBOARD','USERS','USER_BANNING','INSTRUCTORS','COURSES','COURSE_PUBLISHING','PAYMENTS','WALLETS',
      'CERTIFICATES','NOTIFICATIONS','LIVE_CLASSES','MODERATION','MARKETING','SETTINGS','ADMINISTRATORS'
    ]::TEXT[] WHERE "role" = 'ADMIN';
    INSERT INTO "PermissionAuditLog" ("id", "actorId", "targetId", "action", "permission")
      SELECT 'rbac-bootstrap-' || u."id" || '-' || p, 'MIGRATION:20261120010000_admin_permissions', u."id", 'MIGRATION_GRANT', p
      FROM "User" u CROSS JOIN LATERAL unnest(u."adminPermissions") AS p
      WHERE u."role" = 'ADMIN'
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

COMMIT;
