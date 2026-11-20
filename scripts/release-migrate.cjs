/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI run before `next start`. */
'use strict';
/**
 * Apply pending database migrations before the application starts.
 *
 * Production was created with `prisma db push`, so it has no migration history. The first run
 * records the baseline (20261120000000_baseline = the production schema of 2026-11-20) as
 * already applied, WITHOUT executing it, and only after `prisma migrate diff` proves that the
 * live database is exactly that schema. Then `prisma migrate deploy` applies the additive,
 * idempotent migrations that follow. Later runs only apply what is pending (usually nothing).
 *
 * Any doubt stops here with a non-zero exit, before the new code serves a request:
 *   - the database differs from the baseline (it is never "fixed" automatically);
 *   - a migration fails (Prisma records it; nothing else runs).
 * Nothing is ever dropped, reset or pushed: there is no `db push`, `migrate reset` or `--accept-data-loss`.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = '20261120000000_baseline';
const BASELINE_SCHEMA = path.join(ROOT, 'prisma', 'baseline', 'production-20261120.prisma');
const PRISMA = path.join(ROOT, 'node_modules', 'prisma', 'build', 'index.js');

function prisma(args, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [PRISMA, ...args], {
    cwd: ROOT, env: process.env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
  });
  return result;
}

function stop(message, mayHaveChanged = false) {
  console.error(`[release-migrate] STOPPED: ${message}`);
  console.error(mayHaveChanged
    ? '[release-migrate] Migrations already completed stay applied (they are additive); the failed one is recorded by Prisma. The application will not start.'
    : '[release-migrate] The database was not changed by this step. The application will not start.');
  process.exit(1);
}

async function main() {
  if (process.env.KQ_SKIP_RELEASE_MIGRATE === '1') {
    console.warn('[release-migrate] skipped by KQ_SKIP_RELEASE_MIGRATE=1');
    return;
  }
  if (!process.env.DATABASE_URL) stop('DATABASE_URL is not set');

  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  let state;
  try {
    const [row] = await db.$queryRawUnsafe(`
      SELECT to_regclass('"User"') IS NOT NULL AS has_users,
             to_regclass('_prisma_migrations') IS NOT NULL AS has_history`);
    let baselineRecorded = false;
    if (row.has_history) {
      const rows = await db.$queryRawUnsafe(
        `SELECT 1 FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL`, BASELINE);
      baselineRecorded = rows.length > 0;
    }
    state = { hasUsers: row.has_users, baselineRecorded };
  } catch (error) {
    stop(`cannot read the database (${error.message})`);
  } finally {
    await db.$disconnect().catch(() => {});
  }

  if (!state.hasUsers) stop('the database has no "User" table; this is not the production database this release expects');

  if (!state.baselineRecorded) {
    console.log('[release-migrate] no migration history: checking that the database is exactly the 2026-11-20 production schema');
    const diff = prisma(['migrate', 'diff', '--from-url', process.env.DATABASE_URL, '--to-schema-datamodel', BASELINE_SCHEMA, '--exit-code'], { capture: true });
    if (diff.status === 2) {
      console.error(diff.stdout);
      stop('the database differs from the expected production schema; review the difference above before any migration');
    }
    if (diff.status !== 0) {
      console.error(diff.stderr);
      stop('could not compare the database with the baseline schema');
    }
    const resolve = prisma(['migrate', 'resolve', '--applied', BASELINE]);
    if (resolve.status !== 0) stop('could not record the baseline');
    console.log('[release-migrate] baseline recorded as applied (not executed)');
  }

  const deploy = prisma(['migrate', 'deploy']);
  if (deploy.status !== 0) stop('`prisma migrate deploy` failed; see the error above', true);
  console.log('[release-migrate] database is up to date');
}

main().catch(error => stop(error.message));
