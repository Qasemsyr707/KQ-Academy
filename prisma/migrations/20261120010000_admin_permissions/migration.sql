BEGIN;
ALTER TABLE "User" ADD COLUMN "adminPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TABLE "PermissionAuditLog" (
 "id" TEXT NOT NULL PRIMARY KEY, "actorId" TEXT NOT NULL, "targetId" TEXT NOT NULL,
 "action" TEXT NOT NULL, "permission" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PermissionAuditLog_targetId_createdAt_idx" ON "PermissionAuditLog"("targetId", "createdAt");
CREATE INDEX "PermissionAuditLog_createdAt_idx" ON "PermissionAuditLog"("createdAt");
UPDATE "User" SET "adminPermissions" = ARRAY['DASHBOARD','USERS','USER_BANNING','COURSES','COURSE_PUBLISHING','PAYMENTS','WALLETS','CERTIFICATES','LIVE_CLASSES','MODERATION','SETTINGS','ADMINISTRATORS']::TEXT[] WHERE "role" = 'ADMIN';
INSERT INTO "PermissionAuditLog" ("id","actorId","targetId","action","permission")
 SELECT 'rbac-bootstrap-' || u."id" || '-' || p, 'MIGRATION:20261120010000_admin_permissions', u."id", 'MIGRATION_GRANT', p
 FROM "User" u CROSS JOIN LATERAL unnest(u."adminPermissions") p WHERE u."role" = 'ADMIN';
COMMIT;
