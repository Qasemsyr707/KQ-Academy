/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const { loadTs } = require('./load-ts.cjs');

const SECRET = 'isolated-certificate-authorization-test-secret';
const certificate = { id: 'cm12345678901234567890123', verifyToken: 'abcdefghijklmnopqrstuv',
  certificateNumber: 'KQ2026-0001', userId: 'student-b', courseId: 'course-b', studentName: 'Student B',
  courseName: 'Test course', issuedAt: new Date('2026-11-13'), templateVersion: '2.0', courseDuration: 12,
  course: { instructorId: 'teacher-b', durationHours: 12, createdAt: new Date('2026-01-01') } };
const users = Object.fromEntries([
  ['student-a', 'STUDENT'], ['student-b', 'STUDENT'], ['admin', 'ADMIN'], ['owner', 'OWNER'],
  ['teacher-a', 'INSTRUCTOR'], ['teacher-b', 'INSTRUCTOR'], ['banned', 'ADMIN'],
].map(([id, role]) => [id, { id, role, isBanned: id === 'banned', email: `${id}@example.invalid`, name: id, phone: null }]));

function harness() {
  let session = null;
  let renders = 0;
  let identityError = false;
  const prisma = {
    user: { findUnique: async ({ where }) => users[where.id] || null },
    certificate: {
      findUnique: async ({ where }) => where.certificateNumber === certificate.certificateNumber ? certificate : null,
      findFirst: async ({ where }) => where.OR.some(q => q.id === certificate.id || q.verifyToken === certificate.verifyToken) ? certificate : null,
    },
    enrollment: { findUnique: async () => ({ createdAt: new Date('2026-01-01') }) },
  };
  const mocks = {
    '@/lib/db': { prisma }, '@/lib/auth': { authOptions: {} },
    'next-auth': { getServerSession: async () => { if (identityError) throw new Error('session unavailable'); return session; } },
    '@/lib/rate-limit': { limitRequest: () => null, RATE_RULES: {} },
    '@/lib/certificate': { generateCertificateBuffer: async () => {
      renders++;
      return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=', 'base64');
    } },
  };
  mocks['@/lib/request-user'] = loadTs('../src/lib/request-user.ts', mocks);
  mocks['@/lib/certificate-access'] = loadTs('../src/lib/certificate-access.ts', mocks);
  mocks['@/lib/certificate-render'] = loadTs('../src/lib/certificate-render.ts', mocks);
  return { mocks, setSession: id => { session = id ? { user: { id, role: 'OWNER' } } : null; },
    failIdentity: () => { identityError = true; }, renders: () => renders };
}

test('private PNG/PDF authorization matrix, independent of reference format', async t => {
  const previous = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = SECRET;
  t.after(() => { if (previous === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = previous; });
  const bearer = (id, options = {}) => `Bearer ${jwt.sign({ id }, SECRET, { expiresIn: '1h', ...options })}`;
  const cases = [
    ['anonymous', null, undefined, 401], ['owner student', 'student-b', undefined, 200],
    ['other student', 'student-a', undefined, 404], ['admin', 'admin', undefined, 200],
    ['owner role', 'owner', undefined, 200], ['course teacher', 'teacher-b', undefined, 200],
    ['other teacher', 'teacher-a', undefined, 404], ['banned admin', 'banned', undefined, 401],
    ['invalid session', 'missing-user', undefined, 401],
    ['Basic owner', 'student-b', 'Basic dGVzdDpwYXNz', 200],
    ['Basic other', 'student-a', 'Basic dGVzdDpwYXNz', 404],
    ['Basic anonymous', null, 'Basic dGVzdDpwYXNz', 401],
    ['Bearer owner', null, bearer('student-b'), 200], ['Bearer other', 'student-b', bearer('student-a'), 404],
    ['Bearer banned', null, bearer('banned'), 401], ['invalid Bearer with owner cookie', 'student-b', 'Bearer forged', 401],
    ['expired Bearer', 'student-b', bearer('student-b', { expiresIn: -1 }), 401],
    ['identity failure', 'student-b', undefined, 500],
  ];
  for (const format of ['png', 'pdf']) for (const ref of [certificate.certificateNumber, certificate.id, certificate.verifyToken]) {
    for (const [name, id, authorization, status] of cases) await t.test(`${format} ${ref} ${name}`, async () => {
      const h = harness(); h.setSession(id);
      if (name === 'identity failure') h.failIdentity();
      const route = loadTs(`../src/app/api/certificates/[certId]/${format}/route.ts`, h.mocks).GET;
      const response = await route(new Request(`http://localhost/api/certificates/${ref}/${format}`, {
        headers: authorization ? { Authorization: authorization } : {},
      }), { params: Promise.resolve({ certId: ref }) });
      assert.equal(response.status, status);
      assert.match(response.headers.get('cache-control'), /private, no-store/);
      assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
      assert.equal(h.renders(), status === 200 ? 1 : 0);
      if (status === 200) assert.ok((await response.arrayBuffer()).byteLength > 0);
    });
  }
  for (const format of ['png', 'pdf']) await t.test(`${format}: account switch and logout recheck identity`, async () => {
    const h = harness();
    const route = loadTs(`../src/app/api/certificates/[certId]/${format}/route.ts`, h.mocks).GET;
    for (const [id, status] of [['student-b', 200], ['student-a', 404], [null, 401]]) {
      h.setSession(id);
      assert.equal((await route(new Request('http://localhost/document'), { params: Promise.resolve({ certId: certificate.verifyToken }) })).status, status);
    }
  });
  await t.test('missing authentication configuration fails closed', async () => {
    delete process.env.NEXTAUTH_SECRET;
    try {
      const h = harness(); h.setSession('student-b');
      const response = await h.mocks['@/lib/certificate-render'].certificateDocument(new Request('http://localhost/document'), certificate.id, 'png');
      assert.equal(response.status, 503); assert.equal(h.renders(), 0);
      assert.match(response.headers.get('cache-control'), /no-store/);
    } finally { process.env.NEXTAUTH_SECRET = SECRET; }
  });
  await t.test('throttled responses also disable caching', async () => {
    const h = harness();
    h.mocks['@/lib/rate-limit'].limitRequest = () => new Response('Too many requests', { status: 429 });
    const render = loadTs('../src/lib/certificate-render.ts', h.mocks);
    const response = await render.certificateDocument(new Request('http://localhost/document'), certificate.id, 'pdf');
    assert.equal(response.status, 429); assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(h.renders(), 0);
  });
  await t.test('legacy certificate without a token keeps ID verification and authorized downloads', async () => {
    const previousToken = certificate.verifyToken;
    const previousTemplate = certificate.templateVersion;
    certificate.verifyToken = null; certificate.templateVersion = '1.0';
    try {
      const h = harness();
      const access = h.mocks['@/lib/certificate-access'];
      assert.equal(access.publicReference(certificate), certificate.id);
      assert.equal((await access.resolveCertificate(certificate.id, null)).access, 'limited');
      for (const format of ['png', 'pdf']) {
        const route = loadTs(`../src/app/api/certificates/[certId]/${format}/route.ts`, h.mocks).GET;
        for (const [id, status] of [['student-b', 200], ['student-a', 404], [null, 401]]) {
          h.setSession(id);
          assert.equal((await route(new Request('http://localhost/document'), { params: Promise.resolve({ certId: certificate.id }) })).status, status);
        }
      }
    } finally { certificate.verifyToken = previousToken; certificate.templateVersion = previousTemplate; }
  });
});

test('public verification preserves old/new references without exposing private links', async () => {
  const h = harness();
  const route = loadTs('../src/app/api/mobile/certificates/verify/[certId]/route.ts', h.mocks).GET;
  for (const ref of [certificate.certificateNumber, certificate.id, certificate.verifyToken]) {
    const response = await route(new Request('http://localhost/verify'), { params: Promise.resolve({ certId: ref }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.nameMasked, true);
    assert.equal(body.pngUrl, null); assert.equal(body.pdfUrl, null);
    assert.notEqual(body.studentName, certificate.studentName);
    assert.equal(body.email, undefined);
  }
});
