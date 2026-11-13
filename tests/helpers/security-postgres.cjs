/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const { PrismaClient } = require('@prisma/client');

/** Never discover credentials or fall back to the application's DATABASE_URL. */
function testDatabaseUrl(value = process.env.KQ_SECURITY_TEST_DATABASE_URL) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid isolated security test database URL'); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)
    || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || !/^\/kq_security_test_[a-z0-9_]+$/.test(url.pathname)
    || url.hash || !url.username) {
    throw new Error('Security PostgreSQL tests require a named disposable database on loopback');
  }
  for (const [key, entry] of url.searchParams) {
    if (!((key === 'schema' && entry === 'public')
      || (key === 'connection_limit' && /^[1-9]\d?$/.test(entry)))) {
      throw new Error('Unsupported security test database connection option');
    }
  }
  return url.toString();
}

function createTestPrisma() {
  const url = testDatabaseUrl();
  if (!url) throw new Error('Set KQ_SECURITY_TEST_DATABASE_URL explicitly to run PostgreSQL tests');
  return new PrismaClient({ datasources: { db: { url } } });
}

module.exports = { testDatabaseUrl, createTestPrisma };
