-- Undo activate-owner.sql: OWNER -> ADMIN for that one account. Its admin permissions
-- (all 15, from the release migration) are kept, so access is the same as before activation.
-- Usage: psql ... -v owner_email='<owner email>' -v confirm=ROLLBACK-OWNER -f rollback-owner.sql
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('kq.owner_email', :'owner_email', true), set_config('kq.confirm', :'confirm', true);
DO $$
DECLARE target record;
BEGIN
  IF current_database() NOT IN ('kqacademy_neon_restore', 'kqcheck') THEN RAISE EXCEPTION 'unexpected database %', current_database(); END IF;
  IF current_setting('kq.confirm') <> 'ROLLBACK-OWNER' THEN RAISE EXCEPTION 'confirmation word missing'; END IF;
  SELECT id, role INTO target FROM "User" WHERE lower(email) = lower(current_setting('kq.owner_email'));
  IF target.id IS NULL OR target.role <> 'OWNER' THEN RAISE EXCEPTION 'that account is not OWNER'; END IF;
  UPDATE "User" SET role = 'ADMIN' WHERE id = target.id AND role = 'OWNER';
  INSERT INTO "PermissionAuditLog" ("id", "actorId", "targetId", "action", "permission")
  VALUES ('owner-rollback-' || target.id || '-' || extract(epoch FROM now())::bigint, 'MANUAL:owner-rollback-20261121', target.id, 'ROLE_ADMIN', 'ALL');
  RAISE NOTICE 'OWNER rolled back to ADMIN for account %', target.id;
END $$;
COMMIT;
