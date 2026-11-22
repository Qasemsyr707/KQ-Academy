/* eslint-disable @typescript-eslint/no-require-imports */
// Real HTTP + PostgreSQL: KQ Classroom Pro participant management (src/lib/live-classroom.ts).
// Waiting room, lock, admission, removal, assistant powers, hand raise, audit log and session end are
// exercised through the real routes and session cookies. LiveKit itself is not configured on the test
// server, so media actions must fail closed (503) instead of reporting success.
// Creates synthetic users, one course and one live class, and removes only those rows afterwards.
const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID, randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { testDatabaseUrl, createTestPrisma } = require('./helpers/security-postgres.cjs');

const origin = process.env.KQ_HTTP_TEST_ORIGIN || process.env.KQ_CERTIFICATE_HTTP_TEST_ORIGIN;
const skip = (!origin || !testDatabaseUrl()) && 'Requires explicit loopback HTTP server and isolated PostgreSQL database';
const ALL_ADMIN = ['DASHBOARD', 'USERS', 'USER_BANNING', 'INSTRUCTORS', 'COURSES', 'COURSE_PUBLISHING', 'PAYMENTS', 'WALLETS', 'CERTIFICATES', 'NOTIFICATIONS', 'LIVE_CLASSES', 'MODERATION', 'MARKETING', 'SETTINGS', 'ADMINISTRATORS'];

test('HTTP/PostgreSQL: classroom management is enforced on the server for every role', { skip, timeout: 240000 }, async t => {
  const url = new URL(origin);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.protocol, 'http:');
  const prisma = createTestPrisma();
  const p = `classroom_${randomUUID().slice(0, 8)}`;
  const password = randomBytes(24).toString('base64url');
  const roles = { teacher: 'INSTRUCTOR', other: 'INSTRUCTOR', s1: 'STUDENT', s2: 'STUDENT', s3: 'STUDENT', outsider: 'STUDENT', admin: 'ADMIN', adminNo: 'ADMIN', owner: 'OWNER' };
  const ids = Object.fromEntries(Object.keys(roles).map(key => [key, `${p}_${key}`]));
  const courseId = `${p}_course`;
  const liveId = `${p}_live`;
  t.after(async () => {
    try {
      await prisma.liveClass.deleteMany({ where: { id: liveId } });
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    } finally { await prisma.$disconnect(); }
  });
  const hashed = await bcrypt.hash(password, 4);
  await prisma.user.createMany({ data: Object.entries(roles).map(([key, role]) => ({ id: ids[key], email: `${ids[key]}@example.invalid`, name: `Synthetic ${key}`, password: hashed, role,
    ...(key === 'admin' ? { adminPermissions: ALL_ADMIN } : key === 'adminNo' ? { adminPermissions: ALL_ADMIN.filter(x => x !== 'LIVE_CLASSES') } : {}) })) });
  await prisma.course.create({ data: { id: courseId, title: `كورس ${p}`, category: 'test', instructorId: ids.teacher, status: 'PUBLISHED' } });
  await prisma.enrollment.createMany({ data: ['s1', 's2', 's3'].map(k => ({ userId: ids[k], courseId })) });
  await prisma.liveClass.create({ data: { id: liveId, title: 'حصة تجريبية', instructorId: ids.teacher, courseId, scheduledAt: new Date(), status: 'live', startedAt: new Date() } });

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
      return this;
    }
  }
  const c = {};
  for (const key of Object.keys(roles)) c[key] = await new Client().login(key);
  const anonymous = new Client();
  const panel = `/api/live/${liveId}/classroom`;
  const act = (who, body) => c[who].json('POST', panel, body);
  const token = who => c[who].request(`/api/live/token?id=${liveId}`);
  const seat = key => prisma.liveClassParticipant.findUnique({ where: { liveClassId_userId: { liveClassId: liveId, userId: ids[key] } } });
  const status = async (promise, expected, label) => { const r = await promise; assert.equal(r.status, expected, `${label}: ${await r.clone().text()}`); return r; };

  await t.test('only the host, OWNER and ADMIN with LIVE_CLASSES open the panel', async () => {
    await status(anonymous.request(panel), 401, 'anonymous');
    for (const who of ['s1', 'outsider', 'other', 'adminNo']) await status(c[who].request(panel), 403, who);
    for (const who of ['teacher', 'admin', 'owner']) {
      const body = await (await status(c[who].request(panel), 200, who)).json();
      assert.equal(body.power, 'host');
      assert.equal(body.settings.chatEnabled, true);
    }
    for (const who of ['s1', 'other', 'adminNo']) await status(act(who, { action: 'settings', locked: true }), 403, `${who} settings`);
    assert.equal((await prisma.liveClass.findUnique({ where: { id: liveId } })).locked, false);
  });

  await t.test('waiting room: newcomers wait, the host admits or denies, and no token is issued before that', async () => {
    await status(act('teacher', { action: 'settings', waitingRoom: true }), 200, 'enable waiting room');
    await status(token('s1'), 202, 's1 waits');
    await status(token('s2'), 202, 's2 waits');
    assert.equal((await seat('s1')).status, 'pending');
    await status(token('outsider'), 403, 'not enrolled');
    assert.equal(await seat('outsider'), null);
    await status(act('teacher', { action: 'admit', userId: ids.s1 }), 200, 'admit s1');
    await status(act('teacher', { action: 'deny', userId: ids.s2 }), 200, 'deny s2');
    await status(act('teacher', { action: 'admit', userId: ids.s1 }), 409, 'admit twice');
    // Admission passed: the only remaining failure is the LiveKit configuration of the test server.
    await status(token('s1'), 503, 's1 admitted');
    assert.ok((await seat('s1')).firstJoinedAt, 'first join is recorded');
    await status(token('s2'), 403, 's2 denied');
  });

  await t.test('lock stops newcomers but lets an admitted student rejoin', async () => {
    await status(act('teacher', { action: 'settings', locked: true }), 200, 'lock');
    await status(token('s3'), 423, 's3 locked out');
    await status(token('s1'), 503, 's1 rejoins');
    await status(act('teacher', { action: 'settings', locked: false }), 200, 'unlock');
    await status(token('s3'), 202, 's3 now waits');
  });

  await t.test('hand raise belongs to the admitted student only and is ordered on the server', async () => {
    await status(c.s1.json('POST', `/api/live/${liveId}/hand`, { raised: true }), 200, 's1 hand');
    assert.ok((await seat('s1')).handRaisedAt);
    await status(c.s2.json('POST', `/api/live/${liveId}/hand`, { raised: true }), 403, 'denied student');
    await status(c.outsider.json('POST', `/api/live/${liveId}/hand`, { raised: true }), 403, 'outsider');
    await status(c.s1.json('POST', `/api/live/${liveId}/hand`, { raised: 'yes' }), 400, 'bad body');
    const own = await (await status(c.s1.request(`/api/live/${liveId}/hand`), 200, 'own seat')).json();
    assert.deepEqual(own, { status: 'admitted', role: 'student', handRaised: true });
    const view = await (await c.teacher.request(panel)).json();
    assert.ok(view.participants.find(x => x.userId === ids.s1).handRaisedAt);
  });

  await t.test('an assistant has limited, revocable powers', async () => {
    await status(act('s1', { action: 'setAssistant', userId: ids.s1 }), 403, 'self-promotion');
    await status(act('teacher', { action: 'setAssistant', userId: ids.s3 }), 409, 'pending student cannot assist');
    await status(act('teacher', { action: 'setAssistant', userId: ids.s1 }), 200, 'assign');
    const view = await (await status(c.s1.request(panel), 200, 'assistant panel')).json();
    assert.equal(view.power, 'assistant');
    assert.deepEqual(view.audit, [], 'the audit log is for the host only');
    await status(act('s1', { action: 'admit', userId: ids.s3 }), 200, 'assistant admits');
    for (const body of [{ action: 'settings', locked: true }, { action: 'remove', userId: ids.s3 }, { action: 'muteAll' }, { action: 'setAssistant', userId: ids.s3 }]) {
      await status(act('s1', body), 403, `assistant ${body.action}`);
    }
    await status(act('s1', { action: 'lowerHand', userId: ids.s1 }), 400, 'acts on self');
    await status(act('teacher', { action: 'unsetAssistant', userId: ids.s1 }), 200, 'revoke');
    await status(c.s1.request(panel), 403, 'former assistant');
  });

  await t.test('media actions need LiveKit and never pretend to succeed without it', async () => {
    for (const body of [{ action: 'grant', userId: ids.s1, media: 'microphone' }, { action: 'mute', userId: ids.s1 }, { action: 'muteAll' }]) {
      await status(act('teacher', body), 503, body.action);
    }
    await status(act('teacher', { action: 'settings', screenShareAllowed: false }), 200, 'screen off');
    await status(act('teacher', { action: 'grant', userId: ids.s1, media: 'screen' }), 409, 'screen disallowed');
  });

  await t.test('direct API calls cannot bypass the chat or reaction switches, and the two are independent', async () => {
    const say = (who, body) => c[who].json('POST', `/api/live/${liveId}/message`, body);
    await status(act('teacher', { action: 'settings', chatEnabled: false }), 200, 'chat off');
    await status(say('s1', { kind: 'chat', text: 'تجاوز' }), 403, 'student chat while off');
    // Allowed by policy; the test server has no LiveKit, so relaying fails closed instead of faking success.
    await status(say('s1', { kind: 'reaction', emoji: '👏' }), 503, 'reaction unaffected by chat switch');
    await status(say('teacher', { kind: 'chat', text: 'تنبيه' }), 503, 'host may still talk');
    await status(act('teacher', { action: 'settings', chatEnabled: true, reactionsEnabled: false }), 200, 'reactions off');
    await status(say('s1', { kind: 'reaction', emoji: '👏' }), 403, 'reaction while off');
    await status(say('s1', { kind: 'chat', text: 'سؤال' }), 503, 'chat unaffected by reaction switch');
    for (const who of ['s2', 'outsider']) await status(say(who, { kind: 'chat', text: 'x' }), 403, `${who} not admitted`);
    await status(anonymous.json('POST', `/api/live/${liveId}/message`, { kind: 'chat', text: 'x' }), 401, 'anonymous');
    await status(say('s1', { kind: 'reaction', emoji: '<img>' }), 400, 'forged emoji');
    await status(say('s1', { kind: 'system', text: 'x' }), 400, 'forged kind');
    await status(act('teacher', { action: 'settings', reactionsEnabled: true }), 200, 'restore');
  });

  await t.test('malformed and foreign targets are refused', async () => {
    await status(act('teacher', { action: 'xyz' }), 400, 'unknown action');
    await status(act('teacher', { action: 'admit', userId: '../x' }), 400, 'bad id');
    await status(act('teacher', { action: 'admit', userId: ids.outsider }), 403, 'not enrolled');
    await status(act('teacher', { action: 'admit', userId: ids.other }), 403, 'not a student');
    await status(act('teacher', { action: 'settings' }), 400, 'empty settings');
    await status(c.teacher.request(`/api/live/${p}_missing/classroom`), 404, 'missing class');
  });

  await t.test('removal records the reason, ends the seat and blocks the token', async () => {
    await status(act('teacher', { action: 'remove', userId: ids.s3, reason: 'إزعاج متكرر' }), 200, 'remove');
    const removed = await seat('s3');
    assert.equal(removed.status, 'removed');
    assert.equal(removed.removedReason, 'إزعاج متكرر');
    await status(token('s3'), 403, 'removed student');
  });

  await t.test('every action is audited, and ending closes the class for further moderation', async () => {
    const log = await prisma.liveClassAuditLog.findMany({ where: { liveClassId: liveId }, select: { action: true, actorId: true } });
    const actions = log.map(l => l.action);
    for (const a of ['settings', 'admit', 'deny', 'setAssistant', 'unsetAssistant', 'remove']) assert.ok(actions.includes(a), a);
    assert.ok(log.some(l => l.action === 'admit' && l.actorId === ids.s1), 'assistant actions are attributed to the assistant');
    const end = await (await status(c.teacher.json('PATCH', `/api/live/${liveId}`, { action: 'end' }), 200, 'end')).json();
    assert.equal(end.status, 'ended');
    assert.equal(end.roomClosed, false, 'no LiveKit on the test server, reported honestly');
    assert.ok(await prisma.liveClassAuditLog.findFirst({ where: { liveClassId: liveId, action: 'end' } }));
    await status(act('teacher', { action: 'lowerHand', userId: ids.s1 }), 409, 'ended class');
    await status(c.s1.json('POST', `/api/live/${liveId}/hand`, { raised: true }), 403, 'hand after end');
  });
});
