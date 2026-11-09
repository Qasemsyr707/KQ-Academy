/* eslint-disable @typescript-eslint/no-require-imports -- Node's CommonJS test runner. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { loadTs } = require('./load-ts.cjs');

const USER = { id: 'current-teacher', role: 'INSTRUCTOR', email: 'teacher@academy.test', name: 'Teacher', phone: null };
const PRIVATE = 'private, no-store';

function harness(config = {}) {
  const user = { ...USER, ...config.user };
  const calls = [];
  class RequestUserError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const record = (name, result) => async args => {
    calls.push({ name, args });
    if (config.databaseError) throw new Error('internal database details must not appear');
    return typeof result === 'function' ? result(args) : result;
  };
  const mocks = {
    '@/lib/request-user': { RequestUserError, requireRequestUser: async (req, roles) => {
      calls.push({ name: 'auth', args: { roles, authorization: req.headers.get('authorization') } });
      if (config.authStatus) throw new RequestUserError(config.authStatus, 'يرجى التحقق من صلاحية الحساب');
      if (roles && !roles.includes(user.role)) throw new RequestUserError(403, 'غير مصرح');
      return user;
    } },
    '@/lib/db': { prisma: {
      course: { create: record('course.create', ({ data }) => ({ id: 'new-course', ...data })) },
      user: { findFirst: async () => { throw new Error('never choose an arbitrary instructor'); } },
      setting: {
        findMany: record('setting.findMany', config.settings ?? [{ key: 'ENABLE_STRIPE', value: 'true' }]),
        create: async () => { throw new Error('GET must never create a default setting'); },
        upsert: record('setting.upsert', ({ create }) => ({ id: 'setting-1', ...create })),
      },
    } },
  };
  const course = loadTs('../src/app/api/mobile/courses/route.ts', mocks);
  const settings = loadTs('../src/app/api/admin/settings/route.ts', mocks);
  return { calls, course, settings };
}

function request(path, body, raw = false) {
  return new Request(`https://academy.test${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-current-user' },
    ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }),
  });
}
function assertPrivate(response) {
  assert.equal(response.headers.get('cache-control'), PRIVATE);
  assert.equal(response.headers.get('vary'), 'Cookie, Authorization');
}

test('mobile course creation denies anonymous, invalid-secret, banned and ordinary student requests before writes', async () => {
  for (const config of [{ authStatus: 401 }, { authStatus: 403 }, { authStatus: 503 }, { user: { role: 'STUDENT' } }]) {
    const h = harness(config);
    const response = await h.course.POST(request('/api/mobile/courses', { title: 'Forged course', instructorId: 'admin', role: 'ADMIN' }));
    assert.ok([401, 403, 503].includes(response.status));
    assertPrivate(response);
    assert.deepEqual(h.calls.map(call => call.name), ['auth']);
    assert.deepEqual(h.calls[0].args.roles, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
  }
});

test('authorized mobile course creation uses current ownership and preserves mobile response and fields', async () => {
  for (const role of ['INSTRUCTOR', 'ADMIN', 'OWNER']) {
    const h = harness({ user: { role } });
    const response = await h.course.POST(request('/api/mobile/courses', {
      title: '  Physics  ', category: ' Science ', type: 'CURRICULUM', price: '12.50',
      image: 'https://images.academy.test/course.jpg', instructorId: 'another-teacher', status: 'PUBLISHED',
    }));
    assert.equal(response.status, 201);
    assertPrivate(response);
    const expected = { title: 'Physics', description: '', category: 'Science', type: 'CURRICULUM', price: 12.5,
      instructorId: USER.id, thumbnail: 'https://images.academy.test/course.jpg' };
    assert.deepEqual(h.calls.slice(1), [{ name: 'course.create', args: { data: expected } }]);
    assert.deepEqual(await response.json(), { id: 'new-course', ...expected });
  }
});

test('mobile course defaults remain free skill courses owned by the current instructor', async () => {
  const h = harness();
  const response = await h.course.POST(request('/api/mobile/courses', { title: 'Free course' }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 'new-course', title: 'Free course', description: '', type: 'SKILL',
    price: 0, instructorId: USER.id, category: 'عام', thumbnail: null });
});

test('invalid mobile course payloads cannot cause database writes or accidental free-price coercion', async () => {
  const bodies = [null, [], { title: '' }, { title: ' '.repeat(8) }, { title: 'x'.repeat(1001) },
    { title: 'Title', price: '-1' }, { title: 'Title', price: '12oops' }, { title: 'Title', price: 'Infinity' },
    { title: 'Title', price: null }, { title: 'Title', price: {} }, { title: 'Title', type: 'INVALID' },
    { title: 'Title', category: {} }, { title: 'Title', image: 'javascript:alert(1)' }, { title: 'Title', image: '//evil.test/image' }];
  for (const body of bodies) {
    const h = harness();
    assert.equal((await h.course.POST(request('/api/mobile/courses', body))).status, 400);
    assert.deepEqual(h.calls.map(call => call.name), ['auth']);
  }
});

test('mobile malformed JSON and database failures receive safe errors with no internal detail', async () => {
  const malformed = harness();
  assert.equal((await malformed.course.POST(request('/api/mobile/courses', '{broken', true))).status, 400);
  const failed = harness({ databaseError: true });
  const response = await failed.course.POST(request('/api/mobile/courses', { title: 'Title' }));
  assert.equal(response.status, 500);
  assertPrivate(response);
  assert.doesNotMatch(JSON.stringify(await response.json()), /internal|database/);
});

test('both administrative settings methods deny unprivileged callers before reading or writing any settings', async () => {
  for (const config of [{ authStatus: 401 }, { authStatus: 403 }, { authStatus: 503 }, { user: { role: 'STUDENT' } }, {}]) {
    for (const method of ['GET', 'POST']) {
      const h = harness(config);
      const response = await h.settings[method](request('/api/admin/settings', method === 'POST' ? { key: 'exchangeRate', value: '15000' } : undefined));
      assert.ok([401, 403, 503].includes(response.status));
      assertPrivate(response);
      assert.deepEqual(h.calls.map(call => call.name), ['auth']);
      assert.deepEqual(h.calls[0].args.roles, ['ADMIN', 'OWNER']);
    }
  }
});

test('administrators and owners can read settings with a display default but without writes on GET', async () => {
  for (const role of ['ADMIN', 'OWNER']) {
    const h = harness({ user: { role } });
    const response = await h.settings.GET(request('/api/admin/settings'));
    assert.equal(response.status, 200);
    assertPrivate(response);
    assert.deepEqual(await response.json(), { exchangeRate: '14500', ENABLE_STRIPE: 'true' });
    assert.deepEqual(h.calls.map(call => call.name), ['auth', 'setting.findMany']);
  }
  const configured = harness({ user: { role: 'ADMIN' }, settings: [{ key: 'exchangeRate', value: '15500' }] });
  assert.deepEqual(await (await configured.settings.GET(request('/api/admin/settings'))).json(), { exchangeRate: '15500' });
});

test('settings changes preserve the existing exchange-rate and payment-switch client payloads', async () => {
  for (const role of ['ADMIN', 'OWNER']) {
    for (const change of [{ key: 'exchangeRate', value: '15000' }, { key: 'ENABLE_STRIPE', value: 'false' }]) {
      const h = harness({ user: { role } });
      const response = await h.settings.POST(request('/api/admin/settings', change));
      assert.equal(response.status, 200);
      assertPrivate(response);
      assert.deepEqual(h.calls.slice(1), [{ name: 'setting.upsert', args: {
        where: { key: change.key }, update: { value: change.value }, create: change,
      } }]);
      assert.deepEqual(await response.json(), { id: 'setting-1', ...change });
    }
  }
});

test('invalid setting names, nested values and invalid exchange rates or switches never reach upsert', async () => {
  const bodies = [null, [], {}, { key: '__proto__', value: 'bad' }, { key: 'with space', value: 'bad' },
    { key: 'exchangeRate', value: '0' }, { key: 'exchangeRate', value: '-1' }, { key: 'exchangeRate', value: 'Infinity' },
    { key: 'exchangeRate', value: {} }, { key: 'exchangeRate', value: null }, { key: 'exchangeRate', value: true },
    { key: 'ENABLE_STRIPE', value: 'anything' }, { key: 'OTHER', value: 'x'.repeat(4097) }];
  for (const body of bodies) {
    const h = harness({ user: { role: 'ADMIN' } });
    assert.equal((await h.settings.POST(request('/api/admin/settings', body))).status, 400);
    assert.deepEqual(h.calls.map(call => call.name), ['auth']);
  }
});

test('settings parse and database errors remain private and do not disclose stored or internal data', async () => {
  const malformed = harness({ user: { role: 'ADMIN' } });
  assert.equal((await malformed.settings.POST(request('/api/admin/settings', '{broken', true))).status, 400);
  for (const method of ['GET', 'POST']) {
    const h = harness({ user: { role: 'ADMIN' }, databaseError: true });
    const response = await h.settings[method](request('/api/admin/settings', method === 'POST' ? { key: 'exchangeRate', value: '15000' } : undefined));
    assert.equal(response.status, 500);
    assertPrivate(response);
    assert.doesNotMatch(JSON.stringify(await response.json()), /internal|database/);
  }
});
