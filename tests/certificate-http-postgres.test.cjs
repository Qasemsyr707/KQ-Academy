/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID, randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encode } = require('next-auth/jwt');
const { testDatabaseUrl, createTestPrisma } = require('./helpers/security-postgres.cjs');

const origin = process.env.KQ_CERTIFICATE_HTTP_TEST_ORIGIN;
const skip = (!origin || !testDatabaseUrl()) && 'Requires explicit loopback HTTP server and isolated PostgreSQL database';

test('HTTP/PostgreSQL: real logins and private certificate downloads', { skip, timeout: 240000 }, async t => {
  const url = new URL(origin);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.protocol, 'http:'); assert.equal(url.pathname, '/');
  assert.equal(url.username, ''); assert.equal(url.password, '');
  assert.ok(process.env.NEXTAUTH_SECRET, 'Use the same synthetic secret as the isolated local server');
  const prisma = createTestPrisma();
  // Run only against the explicitly configured disposable loopback database.
  const p = `cert_http_${randomUUID()}`;
  const password = randomBytes(24).toString('base64url');
  const roles = { a: 'STUDENT', b: 'STUDENT', admin: 'ADMIN', owner: 'OWNER', teacher: 'INSTRUCTOR', unrelated: 'INSTRUCTOR', banned: 'STUDENT' };
  const ids = Object.fromEntries(Object.keys(roles).map(key => [key, `${p}_${key}`]));
  const courseId = `${p}_course`;
  t.after(async () => {
    try {
      await prisma.certificate.deleteMany({ where: { courseId } });
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    } finally { await prisma.$disconnect(); }
  });
  const hashed = await bcrypt.hash(password, 4);
  await prisma.user.createMany({ data: Object.entries(roles).map(([key, role]) => ({ id: ids[key], email: `${ids[key]}@example.invalid`, name: `Synthetic ${key}`, password: hashed, role })) });
  await prisma.course.create({ data: { id: courseId, title: 'Synthetic certificate HTTP course', category: 'TEST', instructorId: ids.teacher, status: 'PUBLISHED', price: 0, durationHours: 12 } });
  await prisma.enrollment.create({ data: { userId: ids.b, courseId } });
  const certificate = await prisma.certificate.create({ data: { userId: ids.b, courseId, studentName: 'Synthetic b', courseName: 'Synthetic certificate HTTP course', certificateNumber: `KQ2099-${Math.floor(Math.random() * 900000000) + 100000000}`, verifyToken: randomBytes(16).toString('base64url'), templateVersion: '2.0', courseDuration: 12 } });
  let requestNumber = 0;
  class Client {
    constructor() { this.cookies = new Map(); }
    async request(path, options = {}) {
      const headers = new Headers(options.headers);
      // Model independent proxy visitors so rendering rate limits remain active
      // without obscuring authorization decisions in this finite local matrix.
      headers.set('x-real-ip', `192.0.2.${1 + (++requestNumber % 250)}`);
      if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
      const response = await fetch(new URL(path, origin), { ...options, headers, redirect: 'manual' });
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(';')[0]; const index = pair.indexOf('=');
        const key = pair.slice(0, index); const entry = pair.slice(index + 1);
        if (!entry || /max-age=0/i.test(value)) this.cookies.delete(key); else this.cookies.set(key, entry);
      }
      return response;
    }
    async csrf() { return (await (await this.request('/api/auth/csrf')).json()).csrfToken; }
    async login(key) {
      const response = await this.request('/api/auth/callback/credentials', { method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken: await this.csrf(), email: `${ids[key]}@example.invalid`, password, json: 'true', callbackUrl: origin }) });
      assert.ok([200, 302].includes(response.status), `login ${key}`);
      const session = await (await this.request('/api/auth/session')).json();
      assert.equal(session.user?.id, ids[key], `verified real NextAuth identity ${key}`);
      assert.equal(session.user.role, roles[key]);
      return this;
    }
  }
  const clients = {};
  for (const key of Object.keys(roles)) clients[key] = await new Client().login(key);
  await prisma.user.update({ where: { id: ids.banned }, data: { isBanned: true } });
  const anonymous = new Client();
  async function check(client, ref, format, status, headers = {}) {
    const response = await client.request(`/api/certificates/${ref}/${format}`, { headers });
    assert.equal(response.status, status, `${format} expected ${status}`);
    assert.match(response.headers.get('cache-control'), /private, no-store/);
    assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (status === 200) {
      assert.equal(response.headers.get('content-type'), format === 'png' ? 'image/png' : 'application/pdf');
      assert.ok(format === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : bytes.subarray(0, 5).toString() === '%PDF-');
    } else assert.ok(!response.headers.get('content-type')?.includes(format === 'png' ? 'image/png' : 'application/pdf'));
  }
  for (const format of ['png', 'pdf']) for (const ref of [certificate.certificateNumber, certificate.id, certificate.verifyToken]) {
    for (const [key, status] of [['a', 404], ['b', 200], ['admin', 200], ['owner', 200], ['teacher', 200], ['unrelated', 404], ['banned', 401]]) {
      await t.test(`${format} ${ref} ${key}`, () => check(clients[key], ref, format, status));
    }
    await check(anonymous, ref, format, 401);
    await check(clients.b, ref, format, 200, { Authorization: 'Basic dGVzdDpwYXNz' });
    await check(clients.a, ref, format, 404, { Authorization: 'Basic dGVzdDpwYXNz' });
    await check(clients.b, ref, format, 401, { Authorization: 'Bearer forged' });
  }
  const mobile = {};
  for (const key of ['a', 'b']) {
    const response = await anonymous.request('/api/mobile/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${ids[key]}@example.invalid`, password }) });
    assert.equal(response.status, 200);
    const body = await response.json(); assert.equal(body.user.id, ids[key]); mobile[key] = body.token;
  }
  for (const format of ['png', 'pdf']) for (const ref of [certificate.certificateNumber, certificate.id, certificate.verifyToken]) {
    await check(anonymous, ref, format, 200, { Authorization: `Bearer ${mobile.b}` });
    await check(clients.b, ref, format, 404, { Authorization: `Bearer ${mobile.a}` });
    await check(clients.b, ref, format, 401, { Authorization: `Bearer ${jwt.sign({ id: ids.b }, process.env.NEXTAUTH_SECRET, { expiresIn: -1 })}` });
  }
  for (const ref of [certificate.certificateNumber, certificate.id, certificate.verifyToken]) {
    const publicResponse = await anonymous.request(`/api/mobile/certificates/verify/${ref}`);
    assert.equal(publicResponse.status, 200);
    const body = await publicResponse.json(); assert.equal(body.nameMasked, true);
    assert.equal(body.pngUrl, null); assert.equal(body.pdfUrl, null);
    const page = await anonymous.request(`/verify/${ref}`); assert.equal(page.status, 200);
    assert.ok(!(await page.text()).includes(`/api/certificates/${certificate.verifyToken}/png`));
  }
  const switched = await new Client().login('b');
  await check(switched, certificate.id, 'png', 200);
  await switched.login('a'); await check(switched, certificate.id, 'png', 404);
  await switched.request('/api/auth/signout', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken: await switched.csrf(), json: 'true' }) });
  assert.equal((await (await switched.request('/api/auth/session')).json()).user, undefined);
  for (const format of ['png', 'pdf']) await check(switched, certificate.id, format, 401);
  const expired = new Client();
  expired.cookies.set('next-auth.session-token', await encode({ token: { id: ids.b }, secret: process.env.NEXTAUTH_SECRET, maxAge: -60 }));
  for (const format of ['png', 'pdf']) await check(expired, certificate.id, format, 401);
  await prisma.certificate.update({ where: { id: certificate.id }, data: { verifyToken: null, templateVersion: '1.0' } });
  for (const format of ['png', 'pdf']) {
    await check(clients.b, certificate.id, format, 200); await check(clients.a, certificate.id, format, 404);
  }
  assert.equal((await (await anonymous.request(`/api/mobile/certificates/verify/${certificate.id}`)).json()).nameMasked, true);
  console.log('Real HTTP identities verified independently for student-a and student-b; PNG/PDF signatures and cross-user rejection verified.');
  console.log(JSON.stringify({ identityEvidence: { studentA: ids.a, studentB: ids.b, certificateOwner: certificate.userId }, certificateId: certificate.id, referencesChecked: ['certificateNumber', 'id', 'verifyToken'], formatsChecked: ['png', 'pdf'], crossUserStatus: 404, ownerStatus: 200 }));
});
