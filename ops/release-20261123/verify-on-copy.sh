#!/usr/bin/env bash
# KQ Academy instructor-tools hotfix (migration 20261123000000_live_class_lessons):
# prove a FRESH backup restores and the hotfix migrates it safely.
#
# Production is only READ (row counts, in a READ ONLY transaction). Everything else happens in a
# throwaway PostgreSQL container (same image as production) on an internal Docker network with
# no internet and no route to production. The container and network are removed at the end.
#
# Usage (server terminal, as root):
#   DUMP=/root/kq-backups/prod-20261121/kqacademy_20261121T010618Z.dump \
#   EXPECTED_SHA=18f6312474e29aff65d1c8a7f64c6e73a2197ea4893abf71519fb27779029790 \
#   OWNER_EMAIL='<owner email>' bash ops/release-20261123/verify-on-copy.sh
set -euo pipefail

PROD_PG=${PROD_PG:-adr6hgbyrbtv3y9avdnrkj80}
PROD_DB=${PROD_DB:-kqacademy_neon_restore}
DUMP=${DUMP:?set DUMP to the backup file}
EXPECTED_SHA=${EXPECTED_SHA:?set EXPECTED_SHA}
OWNER_EMAIL=${OWNER_EMAIL:?set OWNER_EMAIL}
REPO=$(cd "$(dirname "$0")/../.." && pwd)
TAG=$(git -C "$REPO" rev-parse --short HEAD)
NET=kq-restorecheck-net-$$
PGC=kq-restorecheck-$$
IMAGE=kq-release-check:$TAG
COPY_URL="postgresql://postgres:restorecheck@$PGC:5432/kqcheck"
FAIL=0
pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; FAIL=1; }
cleanup() { docker rm -f "$PGC" >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== release $TAG, production container $PROD_PG, database $PROD_DB"

echo "== 1. backup integrity"
echo "$EXPECTED_SHA  $DUMP" | sha256sum -c - >/dev/null && pass "sha256 matches" || { fail "sha256 differs"; exit 1; }

echo "== 2. restore into an isolated copy"
IMG=$(docker inspect -f '{{.Config.Image}}' "$PROD_PG")
docker network create --internal "$NET" >/dev/null
docker run -d --name "$PGC" --network "$NET" -e POSTGRES_PASSWORD=restorecheck -e POSTGRES_USER=postgres -e POSTGRES_DB=kqcheck "$IMG" >/dev/null
for _ in $(seq 1 60); do docker exec "$PGC" pg_isready -U postgres -d kqcheck >/dev/null 2>&1 && break; sleep 1; done
sleep 2
if docker exec -i "$PGC" pg_restore -U postgres -d kqcheck --no-owner --no-privileges --exit-on-error < "$DUMP"; then
  pass "pg_restore completed without error"
else
  fail "pg_restore failed"; exit 1
fi

COUNTS="SELECT string_agg(t || '=' || n, ' ' ORDER BY t) FROM (
  SELECT 'User' t, count(*) n FROM \"User\" UNION ALL SELECT 'Course', count(*) FROM \"Course\"
  UNION ALL SELECT 'Enrollment', count(*) FROM \"Enrollment\" UNION ALL SELECT 'Payment', count(*) FROM \"Payment\"
  UNION ALL SELECT 'Certificate', count(*) FROM \"Certificate\" UNION ALL SELECT 'Lesson', count(*) FROM \"Lesson\"
  UNION ALL SELECT 'WalletTransaction', count(*) FROM \"WalletTransaction\") x;"
FINGERPRINT="SELECT md5(string_agg(r, '|' ORDER BY r)) FROM (
  SELECT concat_ws(',', id, email, role, password, \"walletUSD\", \"walletSYP\", \"isBanned\") r FROM \"User\"
  UNION ALL SELECT concat_ws(',', id, title, price, \"priceSYP\", status, \"instructorId\", \"updatedAt\") FROM \"Course\"
  UNION ALL SELECT concat_ws(',', id, \"userId\", \"courseId\", progress, \"updatedAt\") FROM \"Enrollment\"
  UNION ALL SELECT concat_ws(',', id, \"userId\", \"courseId\", amount, status) FROM \"Payment\"
  UNION ALL SELECT concat_ws(',', id, \"userId\", \"courseId\", \"certificateNumber\") FROM \"Certificate\"
  UNION ALL SELECT concat_ws(',', id, \"userId\", \"quizId\", score, passed, status) FROM \"QuizAttempt\"
  UNION ALL SELECT concat_ws(',', id, \"ownerId\", amount, status) FROM \"AffiliateEarning\"
  UNION ALL SELECT concat_ws(',', id, title, status, \"scheduledAt\", \"instructorId\", \"courseId\") FROM \"LiveClass\"
  UNION ALL SELECT concat_ws(',', id, title, \"chapterId\", \"order\", \"isLive\", \"liveRoomName\", \"liveStartTime\") FROM \"Lesson\"
  UNION ALL SELECT concat_ws(',', id, type, \"fileUrl\", \"isPublished\", \"requiredForCertificate\", \"passingScore\") FROM \"Quiz\") z;"
copy_sql() { docker exec -i "$PGC" psql -X -At -v ON_ERROR_STOP=1 -U postgres -d kqcheck -c "$1"; }
# "<OWNER rows>|<rows that are OWNER, unbanned, with OWNER_EMAIL>|<md5 of every account id+role+ban>"
owner_state() {
  docker exec -i "$PGC" psql -X -At -v ON_ERROR_STOP=1 -U postgres -d kqcheck -v owner_email="$OWNER_EMAIL" <<'SQL'
SELECT count(*) FILTER (WHERE role = 'OWNER') || '|' ||
       count(*) FILTER (WHERE role = 'OWNER' AND NOT "isBanned" AND lower(email) = lower(:'owner_email')) || '|' ||
       (SELECT md5(string_agg(id || ',' || role || ',' || "isBanned", '|' ORDER BY id)) FROM "User")
FROM "User";
SQL
}

PROD_COUNTS=$(docker exec -i "$PROD_PG" sh -c "psql -X -At -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d $PROD_DB" <<SQL
BEGIN READ ONLY;
$COUNTS
COMMIT;
SQL
)
PROD_COUNTS=$(echo "$PROD_COUNTS" | grep '=' )
COPY_COUNTS=$(copy_sql "$COUNTS")
echo "      production now: $PROD_COUNTS"
echo "      restored copy : $COPY_COUNTS"
[ "$PROD_COUNTS" = "$COPY_COUNTS" ] && pass "row counts identical to production" \
  || echo "NOTE  counts differ: rows written to production after the backup (compare above; the copy must not be larger)"

echo "== 3. migration history of the copy (production state before this release)"
echo "      building the release image (same Dockerfile as Coolify; a few minutes)"
docker build -q -t "$IMAGE" "$REPO" >/dev/null && pass "release image builds on Linux" || { fail "release image build"; exit 1; }
run_app() { docker run --rm --network "$NET" -e DATABASE_URL="$COPY_URL" "$IMAGE" "$@"; }
HISTORY=$(copy_sql "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")
FAILED=$(copy_sql "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL")
BASE=$(copy_sql "SELECT count(*) FROM _prisma_migrations WHERE migration_name='20261120000000_baseline' AND applied_steps_count=0")
echo "      applied migrations: $HISTORY, unfinished: $FAILED"
[ "$BASE" = 1 ] && pass "baseline recorded and never executed (it will not run again)" || { fail "baseline record missing"; exit 1; }
[ "$FAILED" = 0 ] && pass "no failed or unfinished migration in production history" || { fail "an unfinished migration exists; resolve it first"; exit 1; }
PREV=$(copy_sql "SELECT count(*) FROM _prisma_migrations WHERE migration_name='20261122010000_referrals_social_links' AND finished_at IS NOT NULL")
[ "$PREV" = 1 ] && pass "the 2026-11-22 release migrations are already applied (production runs e9c0776)" || { fail "production is not at the 2026-11-22 release state"; exit 1; }
copy_sql "SELECT migration_name FROM _prisma_migrations ORDER BY migration_name" | sed 's/^/      /'
BEFORE=$(copy_sql "$FINGERPRINT")
OWNER_BEFORE=$(owner_state)
case "$OWNER_BEFORE" in
  1\|1\|*) pass "the owner account is the only OWNER and is not banned"; OWNER_MODE=existing ;;
  0\|0\|*) echo "NOTE  no OWNER yet: the activation will be rehearsed on the copy"; OWNER_MODE=none ;;
  *) fail "unexpected OWNER state before migration (OWNER rows|matching owner rows: ${OWNER_BEFORE%|*}); required: exactly one OWNER, unbanned, with OWNER_EMAIL"; OWNER_MODE=invalid ;;
esac

echo "== 4. run the exact start-up migration on the copy"
run_app node scripts/release-migrate.cjs && pass "release-migrate succeeded" || { fail "release-migrate"; exit 1; }
run_app node scripts/release-migrate.cjs | tail -1 && pass "second run is a no-op" || fail "second run"
NEW=$(copy_sql "SELECT string_agg(migration_name, ' ' ORDER BY migration_name) FROM _prisma_migrations WHERE migration_name >= '20261123'")
[ "$NEW" = "20261123000000_live_class_lessons" ] && pass "applied by this hotfix: $NEW" || fail "expected exactly 20261123000000_live_class_lessons, got: $NEW"
copy_sql "SELECT 'live sessions kept: ' || count(*) || ' (none linked yet: ' || count(*) FILTER (WHERE \"lessonId\" IS NULL) || ')' FROM \"LiveClass\""
copy_sql "SELECT 'older live lessons kept with their own room: ' || count(*) FROM \"Lesson\" WHERE \"isLive\" AND \"liveRoomName\" IS NOT NULL"
run_app node node_modules/prisma/build/index.js migrate diff --from-url "$COPY_URL" --to-schema-datamodel prisma/schema.prisma --exit-code >/dev/null 2>&1 \
  && pass "migrated copy == release schema (no drift)" || fail "drift after migration"
AFTER=$(copy_sql "$FINGERPRINT")
[ "$BEFORE" = "$AFTER" ] && pass "students, courses, enrollments, payments, certificates unchanged ($AFTER)" || fail "data fingerprint changed"
copy_sql "SELECT 'admins with all 15 permissions: ' || count(*) FILTER (WHERE cardinality(\"adminPermissions\") = 15) || ' of ' || count(*) FROM \"User\" WHERE role = 'ADMIN'"
copy_sql "SELECT 'courses linked to the taxonomy: ' || count(\"categoryId\") || ' of ' || count(*) FROM \"Course\""

echo "== 5. owner account (on the copy)"
OWNER_AFTER=$(owner_state)
if [ "$OWNER_MODE" = existing ]; then
  [ "$OWNER_AFTER" = "$OWNER_BEFORE" ] && pass "the owner is still the only OWNER; no account role or ban changed"     || fail "accounts changed by the migration (before ${OWNER_BEFORE%|*}, after ${OWNER_AFTER%|*})"
else
  fail "exactly one unbanned OWNER with OWNER_EMAIL is required (found ${OWNER_BEFORE%|*})"
fi

docker rmi "$IMAGE" >/dev/null 2>&1 || true
echo
[ $FAIL = 0 ] && echo "RESULT: ALL CHECKS PASSED (production was only read)" || echo "RESULT: FAILED - do not deploy"
exit $FAIL
