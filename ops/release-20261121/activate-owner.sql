-- Make the platform owner's account OWNER (ADMIN -> OWNER), once, after the 2026-11-21 release.
-- Usage: psql ... -v owner_email='<owner email>' -v confirm=ACTIVATE-OWNER -f activate-owner.sql
-- Refuses (and changes nothing) unless: the database is production (or the isolated check copy),
-- the confirmation word is right, exactly one account has that email, it is an unbanned ADMIN,
-- and no OWNER exists yet. The release migration must already be applied (audit table).
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('kq.owner_email', :'owner_email', true), set_config('kq.confirm', :'confirm', true);
DO $$
DECLARE
  matches int; owners int; target record;
BEGIN
  IF current_database() NOT IN ('kqacademy_neon_restore', 'kqcheck') THEN
    RAISE EXCEPTION 'unexpected database %', current_database();
  END IF;
  IF current_setting('kq.confirm') <> 'ACTIVATE-OWNER' THEN RAISE EXCEPTION 'confirmation word missing'; END IF;
  IF to_regclass('"PermissionAuditLog"') IS NULL THEN RAISE EXCEPTION 'release migration not applied yet'; END IF;
  SELECT count(*) INTO owners FROM "User" WHERE role = 'OWNER';
  IF owners <> 0 THEN RAISE EXCEPTION 'an OWNER already exists (%)', owners; END IF;
  SELECT count(*) INTO matches FROM "User" WHERE lower(email) = lower(current_setting('kq.owner_email'));
  IF matches <> 1 THEN RAISE EXCEPTION 'expected exactly one account with that email, found %', matches; END IF;
  SELECT id, role, "isBanned" INTO target FROM "User" WHERE lower(email) = lower(current_setting('kq.owner_email'));
  IF target.role <> 'ADMIN' OR target."isBanned" THEN
    RAISE EXCEPTION 'account must be an unbanned ADMIN (role %, banned %)', target.role, target."isBanned";
  END IF;
  UPDATE "User" SET role = 'OWNER' WHERE id = target.id AND role = 'ADMIN';
  INSERT INTO "PermissionAuditLog" ("id", "actorId", "targetId", "action", "permission")
  VALUES ('owner-activation-' || target.id || '-' || extract(epoch FROM now())::bigint, 'MANUAL:owner-activation-20261121', target.id, 'ROLE_OWNER', 'ALL');
  RAISE NOTICE 'OWNER activated for account %', target.id;
END $$;
COMMIT;
