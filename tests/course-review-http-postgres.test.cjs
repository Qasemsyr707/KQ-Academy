/* eslint-disable @typescript-eslint/no-require-imports */
// Real HTTP + PostgreSQL: course creation, review cycle and price authority (src/lib/course-review.ts).
// Runs only against an explicit loopback server and the isolated test database; it creates synthetic
// users and courses and removes only those rows afterwards.
const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID, randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { testDatabaseUrl, createTestPrisma } = require('./helpers/security-postgres.cjs');

const origin = process.env.KQ_HTTP_TEST_ORIGIN || process.env.KQ_CERTIFICATE_HTTP_TEST_ORIGIN;
const skip = (!origin || !testDatabaseUrl()) && 'Requires explicit loopback HTTP server and isolated PostgreSQL database';

test('HTTP/PostgreSQL: instructors cannot publish, set prices or reassign courses; staff approve with explicit prices', { skip, timeout: 240000 }, async t => {
  const url = new URL(origin);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.protocol, 'http:');
  const prisma = createTestPrisma();
  const p = `review_http_${randomUUID().slice(0, 8)}`;
  const token = `kqrev${randomBytes(5).toString('hex')}`;          // unique word to find the course in search
  const password = randomBytes(24).toString('base64url');
  const roles = { teacher: 'INSTRUCTOR', other: 'INSTRUCTOR', student: 'STUDENT', admin: 'ADMIN', owner: 'OWNER' };
  const ids = Object.fromEntries(Object.keys(roles).map(key => [key, `${p}_${key}`]));
  t.after(async () => {
    try {
      await prisma.course.deleteMany({ where: { instructorId: { in: Object.values(ids) } } });
      await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    } finally { await prisma.$disconnect(); }
  });
  const hashed = await bcrypt.hash(password, 4);
  await prisma.user.createMany({ data: Object.entries(roles).map(([key, role]) => ({ id: ids[key], email: `${ids[key]}@example.invalid`, name: `Synthetic ${key}`, password: hashed, role,
    // Administrators that existed before granular RBAC keep every permission (migration 20261120010000).
    ...(role === 'ADMIN' ? { adminPermissions: ['DASHBOARD','USERS','USER_BANNING','INSTRUCTORS','COURSES','COURSE_PUBLISHING','PAYMENTS','WALLETS','CERTIFICATES','NOTIFICATIONS','LIVE_CLASSES','MODERATION','MARKETING','SETTINGS','ADMINISTRATORS'] } : {}) })) });

  let requestNumber = 0;
  class Client {
    constructor() { this.cookies = new Map(); }
    async request(path, options = {}) {
      const headers = new Headers(options.headers);
      headers.set('x-real-ip', `198.51.100.${1 + (++requestNumber % 250)}`);
      headers.set('origin', url.origin);
      if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
      const response = await fetch(new URL(path, origin), { ...options, headers, redirect: 'manual' });
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(';')[0]; const index = pair.indexOf('=');
        const key = pair.slice(0, index); const entry = pair.slice(index + 1);
        if (!entry || /max-age=0/i.test(value)) this.cookies.delete(key); else this.cookies.set(key, entry);
      }
      return response;
    }
    json(method, path, body) {
      return this.request(path, { method, headers: { 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    }
    async login(key) {
      const csrfToken = (await (await this.request('/api/auth/csrf')).json()).csrfToken;
      const response = await this.request('/api/auth/callback/credentials', { method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, email: `${ids[key]}@example.invalid`, password, json: 'true', callbackUrl: origin }) });
      assert.ok([200, 302].includes(response.status), `login ${key}`);
      const session = await (await this.request('/api/auth/session')).json();
      assert.equal(session.user?.id, ids[key]);
      assert.equal(session.user.role, roles[key]);
      return this;
    }
  }
  const c = {};
  for (const key of Object.keys(roles)) c[key] = await new Client().login(key);
  const anonymous = new Client();
  const count = () => prisma.course.count({ where: { title: { contains: token } } });
  const row = id => prisma.course.findUnique({ where: { id }, select: { status: true, price: true, priceSYP: true, instructorId: true, isFeatured: true, rating: true, title: true } });
  const suggested = async id => {
    const body = await (await anonymous.request(`/api/courses/suggest?q=${token}`)).json();
    return (body.suggestions || []).some(s => s.id === id);
  };
  const base = { title: `كورس مراجعة ${token}`, description: 'وصف', categoryId: null };
  // A skills subcategory from the seeded taxonomy (prisma/taxonomy/categories.json).
  const category = await prisma.category.findUnique({ where: { slug: 'ai-tools' }, select: { id: true } });
  assert.ok(category, 'the test database has the Phase 2 taxonomy');
  base.categoryId = category.id;

  await t.test('anonymous visitors and students cannot create courses', async () => {
    assert.ok([401, 403].includes((await anonymous.json('POST', '/api/courses', { ...base, price: 1, priceSYP: 1 })).status));
    assert.equal((await c.student.json('POST', '/api/courses', { ...base, price: 1, priceSYP: 1 })).status, 403);
    assert.ok([401, 403].includes((await anonymous.json('POST', '/api/mobile/courses', { title: base.title })).status));
    assert.equal((await c.student.json('POST', '/api/mobile/courses', { title: base.title })).status, 403);
    assert.equal(await count(), 0);
  });

  await t.test('mass assignment at creation rejects the whole request', async () => {
    for (const extra of [{ status: 'PUBLISHED' }, { instructorId: ids.other }, { isFeatured: true }, { rating: 5 }]) {
      assert.equal((await c.teacher.json('POST', '/api/courses', { ...base, price: 10, priceSYP: 1, ...extra })).status, 403, JSON.stringify(extra));
    }
    assert.equal(await count(), 0);
  });

  let courseId;
  await t.test('an instructor creates a hidden DRAFT with a proposed price', async () => {
    const res = await c.teacher.json('POST', '/api/courses', { ...base, price: '49', priceSYP: '600000' });
    assert.equal(res.status, 201);
    courseId = (await res.json()).course.id;
    assert.deepEqual(await row(courseId), { status: 'DRAFT', price: 49, priceSYP: 600000, instructorId: ids.teacher, isFeatured: false, rating: 0, title: base.title });
    assert.equal((await anonymous.request(`/api/mobile/courses/${courseId}`)).status, 404);
    assert.equal((await c.student.request(`/api/checkout/info?courseId=${courseId}`)).status, 404);
    assert.equal(await suggested(courseId), false);
    assert.equal((await c.teacher.request(`/api/mobile/courses/${courseId}`)).status, 200);   // the owner previews it
  });

  await t.test('every bypass attempt by the instructor is refused and changes nothing', async () => {
    const before = await row(courseId);
    const prices = { price: 1, priceSYP: 1 };
    assert.equal((await c.teacher.json('POST', `/api/courses/${courseId}/publish`, prices)).status, 403);
    for (const body of [{ status: 'PUBLISHED' }, { price: 0 }, { priceSYP: 0 }, { instructorId: ids.other }, { isFeatured: true },
      { rating: 5 }, { title: 'x', status: 'PUBLISHED' }]) {
      assert.equal((await c.teacher.json('PUT', `/api/courses/${courseId}`, body)).status, 403, JSON.stringify(body));
    }
    assert.equal((await c.teacher.json('PATCH', `/api/courses/${courseId}`, { status: 'PUBLISHED' })).status, 405);
    assert.equal((await c.teacher.json('PUT', `/api/admin/courses/${courseId}`, { status: 'PUBLISHED', ...prices })).status, 403);
    assert.equal((await c.teacher.json('POST', `/api/courses/${courseId}/submit`, { status: 'PUBLISHED' })).status, 200);  // body ignored
    assert.deepEqual(await row(courseId), { ...before, status: 'PENDING' });
    // Another instructor and a student cannot touch it.
    assert.equal((await c.other.json('PUT', `/api/courses/${courseId}`, { title: 'stolen' })).status, 403);
    assert.equal((await c.other.json('POST', `/api/courses/${courseId}/submit`)).status, 403);
    assert.equal((await c.student.json('POST', `/api/courses/${courseId}/submit`)).status, 403);
    assert.equal((await c.student.json('POST', `/api/courses/${courseId}/publish`, prices)).status, 403);
    assert.equal((await row(courseId)).title, base.title);
  });

  await t.test('the instructor still edits content; mobile creation is a draft whatever it sends', async () => {
    assert.equal((await c.teacher.json('PUT', `/api/courses/${courseId}`, { title: `${base.title} محدّث`, description: 'جديد' })).status, 200);
    assert.equal((await row(courseId)).status, 'PENDING');
    const res = await c.teacher.json('POST', '/api/mobile/courses', { title: `موبايل ${token}`, price: 5, priceSYP: 60000, status: 'PUBLISHED', instructorId: ids.other, isFeatured: true });
    assert.equal(res.status, 201);
    const mobile = await row((await res.json()).id);
    assert.equal(mobile.status, 'DRAFT');
    assert.equal(mobile.instructorId, ids.teacher);
    assert.equal(mobile.isFeatured, false);
  });

  await t.test('administration: rejection, resubmission, and publishing only with stated prices', async () => {
    assert.equal((await c.admin.json('PUT', `/api/admin/courses/${courseId}`, { status: 'PUBLISHED' })).status, 400);
    assert.equal((await c.admin.json('PUT', `/api/admin/courses/${courseId}`, { status: 'PUBLISHED', price: '', priceSYP: '' })).status, 400);
    assert.equal((await c.admin.json('PUT', `/api/admin/courses/${courseId}`, { status: 'LIVE' })).status, 400);
    assert.equal((await row(courseId)).status, 'PENDING');
    assert.equal((await c.admin.json('PUT', `/api/admin/courses/${courseId}`, { status: 'REJECTED' })).status, 200);
    assert.equal((await c.teacher.json('POST', `/api/courses/${courseId}/publish`, { price: 1, priceSYP: 1 })).status, 403);
    assert.equal((await c.teacher.json('POST', `/api/courses/${courseId}/resubmit`)).status, 200);
    assert.equal((await row(courseId)).status, 'PENDING');
    assert.equal((await c.owner.json('POST', `/api/courses/${courseId}/publish`, {})).status, 400);
    assert.equal((await row(courseId)).status, 'PENDING');
    assert.equal((await c.owner.json('POST', `/api/courses/${courseId}/publish`, { price: 39, priceSYP: '450000' })).status, 200);
    const published = await row(courseId);
    assert.equal(published.status, 'PUBLISHED');
    assert.equal(published.price, 39);                    // the approved price, not the proposed 49
    assert.equal(published.priceSYP, 450000);
    assert.equal((await anonymous.request(`/api/mobile/courses/${courseId}`)).status, 200);
    let visible = false;
    for (let i = 0; i < 10 && !visible; i++) { visible = await suggested(courseId); if (!visible) await new Promise(r => setTimeout(r, 300)); }
    assert.ok(visible, 'published course appears in live search');
  });

  await t.test('after publication the instructor cannot change the approved price or resubmit', async () => {
    // 409: a published course changes only through a reviewed change request; 403 would be the field allow-list.
    assert.ok([403, 409].includes((await c.teacher.json('PUT', `/api/courses/${courseId}`, { price: 0 })).status));
    assert.equal((await c.teacher.json('POST', `/api/courses/${courseId}/submit`)).status, 409);
    const after = await row(courseId);
    assert.equal(after.price, 39);
    assert.equal(after.status, 'PUBLISHED');
  });

  await t.test('staff keep direct publication when they state both prices', async () => {
    const priced = await c.admin.json('POST', '/api/courses', { ...base, title: `إداري ${token}`, price: 0, priceSYP: 0 });
    assert.equal(priced.status, 201);
    const staffCourse = await row((await priced.json()).course.id);
    assert.equal(staffCourse.status, 'PUBLISHED');
    assert.equal(staffCourse.instructorId, ids.admin);
    const unpriced = await c.owner.json('POST', '/api/courses', { ...base, title: `مالك ${token}` });
    assert.equal(unpriced.status, 201);
    assert.equal((await row((await unpriced.json()).course.id)).status, 'DRAFT');
  });
});
