/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Real HTTP sessions against an explicit loopback server, with synthetic users in an isolated
// kq_security_test_* PostgreSQL database. Every row created here is removed after the test.
const assert = require('node:assert/strict');
const ALL_ADMIN_PERMISSIONS = ['DASHBOARD','USERS','USER_BANNING','INSTRUCTORS','COURSES','COURSE_PUBLISHING','PAYMENTS','WALLETS','CERTIFICATES','NOTIFICATIONS','LIVE_CLASSES','MODERATION','MARKETING','SETTINGS','ADMINISTRATORS'];
const { randomUUID, randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { testDatabaseUrl, createTestPrisma } = require('./security-postgres.cjs');

const origin = process.env.KQ_HTTP_TEST_ORIGIN;
const httpSkip = (!origin || !testDatabaseUrl()) && 'Requires explicit loopback HTTP server (KQ_HTTP_TEST_ORIGIN) and isolated PostgreSQL database';

/**
 * Creates the given synthetic users (and optionally one published course owned by `course.instructor`)
 * and returns logged-in clients for `login` keys.
 */
async function httpFixture(t, { users, login = Object.keys(users), course }) {
  const url = new URL(origin);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'loopback server only');
  const prisma = createTestPrisma();
  const p = `hotfix_${randomUUID().slice(0, 8)}`;
  const tag = p.slice(7).toUpperCase();
  const password = randomBytes(24).toString('base64url');
  const ids = Object.fromEntries(Object.keys(users).map(key => [key, `${p}_${key}`]));
  const email = key => `${ids[key]}@example.invalid`;
  const courseId = course ? `${p}_course` : null;
  t.after(async () => {
    try {
      // Users created by a test through the API (registration) carry the same prefix in their email.
      const registered = (await prisma.user.findMany({ where: { email: { startsWith: `${p}_` } }, select: { id: true } })).map(u => u.id);
      const all = [...new Set([...Object.values(ids), ...registered])];
      const courses = (await prisma.course.findMany({ where: { OR: [{ instructorId: { in: all } }, ...(courseId ? [{ id: courseId }] : [])] }, select: { id: true } })).map(x => x.id);
      const touching = { OR: [{ userId: { in: all } }, { courseId: { in: courses } }] };
      await prisma.certificate.deleteMany({ where: touching });
      await prisma.payment.deleteMany({ where: touching });
      await prisma.enrollment.deleteMany({ where: touching });
      await prisma.walletTransaction.deleteMany({ where: { userId: { in: all } } });
      await prisma.coupon.deleteMany({ where: { OR: [{ code: { contains: tag } }, { courseId: { in: courses } }] } });
      await prisma.courseBundle.deleteMany({ where: { title: { contains: tag } } });
      await prisma.subscriptionPlan.deleteMany({ where: { name: { contains: tag } } });
      // Course content a test created (Phase 1: a certificate needs completed lessons).
      await prisma.lessonProgress.deleteMany({ where: { courseId: { in: courses } } });
      await prisma.lesson.deleteMany({ where: { chapter: { courseId: { in: courses } } } });
      await prisma.chapter.deleteMany({ where: { courseId: { in: courses } } });
      await prisma.notification.deleteMany({ where: { userId: { in: all } } });
      await prisma.course.deleteMany({ where: { id: { in: courses } } });
      await prisma.user.deleteMany({ where: { id: { in: all } } });
    } finally { await prisma.$disconnect(); }
  });
  const hashed = await bcrypt.hash(password, 4);
  await prisma.user.createMany({ data: Object.entries(users).map(([key, fields]) => ({
    id: ids[key], email: email(key), name: `Synthetic ${key}`, password: hashed,
    // Administrators that existed before granular RBAC keep every permission (migration 20261120010000).
    ...(fields.role === 'ADMIN' && !fields.adminPermissions ? { adminPermissions: ALL_ADMIN_PERMISSIONS } : {}),
    ...fields,
  })) });
  if (course) {
    await prisma.course.create({ data: { id: courseId, title: `Synthetic course ${tag}`, category: 'TEST', instructorId: ids[course.instructor],
      status: course.status ?? 'PUBLISHED', price: course.price ?? 100, priceSYP: course.priceSYP ?? 1450000 } });
  }

  let n = 0;
  class Client {
    constructor() { this.cookies = new Map(); this.bearer = null; this.origin = url.origin; }
    async request(path, options = {}) {
      const headers = new Headers(options.headers);
      headers.set('x-real-ip', `198.51.100.${1 + (++n % 250)}`);
      headers.set('origin', this.origin);
      if (this.bearer) headers.set('authorization', `Bearer ${this.bearer}`);
      if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
      const response = await fetch(new URL(path, origin), { ...options, headers, redirect: 'manual' });
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(';')[0]; const i = pair.indexOf('=');
        const key = pair.slice(0, i); const entry = pair.slice(i + 1);
        if (!entry || /max-age=0/i.test(value)) this.cookies.delete(key); else this.cookies.set(key, entry);
      }
      return response;
    }
    json(method, path, body) {
      return this.request(path, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    }
    async login(key) {
      const csrf = (await (await this.request('/api/auth/csrf')).json()).csrfToken;
      const response = await this.request('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken: csrf, email: email(key), password, json: 'true', callbackUrl: origin }) });
      assert.ok([200, 302].includes(response.status), `login ${key}`);
      assert.equal((await (await this.request('/api/auth/session')).json()).user?.id, ids[key], `session ${key}`);
      return this;
    }
    async mobile(key) {
      const response = await this.json('POST', '/api/mobile/login', { email: email(key), password });
      assert.equal(response.status, 200, `mobile login ${key}`);
      this.bearer = (await response.json()).token;
      assert.ok(this.bearer);
      return this;
    }
  }
  const status = async (promise, expected, label) => {
    const r = await promise;
    if (r.status !== expected) assert.fail(`${label}: expected ${expected}, got ${r.status} ${(await r.text().catch(() => '')).slice(0, 300)}`);
    return r;
  };
  const row = key => prisma.user.findUniqueOrThrow({ where: { id: ids[key] }, select: {
    role: true, walletUSD: true, walletSYP: true, isBanned: true, banReason: true, bannedUntil: true, maxLiveStreams: true,
  } });
  const c = {};
  for (const key of login) c[key] = await new Client().login(key);
  return { prisma, p, tag, ids, courseId, c, Client, anonymous: new Client(), mobile: key => new Client().mobile(key), status, row };
}

module.exports = { httpFixture, httpSkip };
