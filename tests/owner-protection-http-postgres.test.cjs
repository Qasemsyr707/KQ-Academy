/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Real HTTP + PostgreSQL: PUT/DELETE /api/admin/users/[id] used to take `role` from the body (an ADMIN
// could promote anyone to OWNER, or demote, ban or delete the owner) and wrote every field, so a
// partial body reset the wallet and the ban.
const assert = require('node:assert/strict');
const test = require('node:test');
const { httpFixture, httpSkip } = require('./helpers/http-fixture.cjs');

test('HTTP/PostgreSQL: user management protects the owner and changes only what was sent', { skip: httpSkip, timeout: 180000 }, async t => {
  const f = await httpFixture(t, {
    users: {
      owner: { role: 'OWNER' }, admin: { role: 'ADMIN' }, admin2: { role: 'ADMIN' }, stale: { role: 'ADMIN' },
      bannedTeacher: { role: 'INSTRUCTOR', walletUSD: 20, walletSYP: 300000, maxLiveStreams: 5, isBanned: true, banReason: 'Synthetic ban' },
      student: { role: 'STUDENT', walletUSD: 40 }, disposable: { role: 'STUDENT' },
    },
    login: ['owner', 'admin', 'stale', 'student'],
  });
  const { c, status, ids, row, prisma } = f;
  const mobileAdmin = await f.mobile('admin');
  const mobileStudent = await f.mobile('student');
  const put = (client, key, body) => client.json('PUT', `/api/admin/users/${ids[key]}`, body);

  await t.test('the owner account cannot be changed, banned, demoted or deleted', async () => {
    const owner = await row('owner');
    for (const [label, body] of [['demote', { role: 'STUDENT' }], ['ban', { isBanned: true, banReason: 'x' }], ['wallet', { walletUSD: 0 }],
      ['quota', { maxLiveStreams: 1 }], ['role OWNER', { role: 'OWNER' }]]) {
      await status(put(c.admin, 'owner', body), 403, `admin -> owner: ${label}`);
    }
    await status(c.admin.json('DELETE', `/api/admin/users/${ids.owner}`), 403, 'admin deletes owner');
    await status(put(mobileAdmin, 'owner', { role: 'STUDENT' }), 403, 'admin mobile token -> owner');
    await status(put(c.owner, 'owner', { role: 'STUDENT' }), 403, 'the owner account is not changed through this API');
    assert.deepEqual(await row('owner'), owner, 'owner row unchanged');
  });

  await t.test('nobody is promoted to OWNER; ADMIN is granted, removed and managed by the OWNER only', async () => {
    await status(put(c.admin, 'student', { role: 'OWNER' }), 403, 'admin promotes to OWNER');
    await status(put(c.owner, 'student', { role: 'OWNER' }), 403, 'owner promotes to OWNER');
    await status(put(c.admin, 'student', { role: 'ADMIN' }), 403, 'admin grants ADMIN');
    await status(put(c.admin, 'admin2', { role: 'STUDENT' }), 403, 'admin demotes another admin');
    await status(put(c.admin, 'admin2', { isBanned: true }), 403, 'admin bans another admin');
    await status(c.admin.json('DELETE', `/api/admin/users/${ids.admin2}`), 403, 'admin deletes another admin');
    await status(put(c.admin, 'admin', { role: 'STUDENT' }), 403, 'admin changes own role');
    await status(put(c.admin, 'admin', { walletUSD: 1000000 }), 403, 'admin funds own wallet');
    await status(put(c.student, 'student', { walletUSD: 1000000 }), 403, 'student');
    await status(put(mobileStudent, 'student', { role: 'ADMIN' }), 403, 'student mobile token');
    await status(put(f.anonymous, 'student', { role: 'ADMIN' }), 401, 'anonymous');
    const crossSite = new f.Client(); crossSite.cookies = c.owner.cookies; crossSite.origin = 'https://evil.example';
    await status(put(crossSite, 'student', { role: 'ADMIN' }), 403, 'cross-site request with the owner cookie');
    for (const field of ['email', 'password', 'name', 'id']) await status(put(c.owner, 'student', { [field]: 'x' }), 400, `unknown field ${field}`);
    assert.equal((await row('student')).role, 'STUDENT');
    assert.equal((await row('admin2')).role, 'ADMIN');
    assert.equal((await row('admin')).role, 'ADMIN');

    await status(put(c.owner, 'student', { role: 'ADMIN' }), 200, 'owner grants ADMIN');
    assert.equal((await row('student')).role, 'ADMIN');
    await status(put(c.owner, 'student', { role: 'STUDENT' }), 200, 'owner removes ADMIN');
    assert.equal((await row('student')).role, 'STUDENT');
    await status(c.owner.json('DELETE', `/api/admin/users/${ids.disposable}`), 200, 'owner deletes a student');
    assert.equal(await prisma.user.count({ where: { id: ids.disposable } }), 0);
  });

  await t.test('admins still manage students; the users-screen payload changes only what differs', async () => {
    const before = await row('student');
    // Exactly what the users screen sends on save: every field, numbers as form strings.
    await status(put(c.admin, 'student', { role: 'STUDENT', walletSYP: String(before.walletSYP), walletUSD: String(before.walletUSD),
      isBanned: false, banReason: '', bannedUntil: null, maxLiveStreams: '5' }), 200, 'unchanged save');
    assert.deepEqual(await row('student'), before);
    await status(put(c.admin, 'student', { walletUSD: '130.5', isBanned: true, banReason: 'Synthetic', bannedUntil: '2099-01-01T00:00:00.000Z' }), 200, 'wallet and ban');
    let s = await row('student');
    assert.equal(s.walletUSD, 130.5); assert.equal(s.isBanned, true); assert.equal(s.banReason, 'Synthetic');
    await status(put(c.admin, 'student', { isBanned: false }), 200, 'lift ban');
    s = await row('student');
    assert.equal(s.isBanned, false); assert.equal(s.banReason, null); assert.equal(s.bannedUntil, null); assert.equal(s.walletUSD, 130.5);
    await status(put(c.admin, 'student', { role: 'INSTRUCTOR' }), 200, 'student to instructor');
    await status(put(c.admin, 'student', { role: 'STUDENT' }), 200, 'and back');
    for (const [label, body] of [['negative wallet', { walletUSD: -1 }], ['text wallet', { walletSYP: 'abc' }], ['ban not boolean', { isBanned: 'yes' }],
      ['bad date', { isBanned: true, bannedUntil: 'tomorrow' }], ['empty quota', { maxLiveStreams: '' }], ['bad role', { role: 'ROOT' }], ['array body', []]]) {
      await status(put(c.admin, 'student', body), 400, `invalid: ${label}`);
    }
    assert.equal((await row('student')).walletUSD, 130.5);
  });

  await t.test('a quota-only body (the old live screen) keeps the wallet and the ban', async () => {
    const banned = await row('bannedTeacher');
    await status(put(c.admin, 'bannedTeacher', { role: 'INSTRUCTOR', maxLiveStreams: '3' }), 200, 'legacy quota payload');
    assert.deepEqual(await row('bannedTeacher'), { ...banned, maxLiveStreams: 3 });
  });

  await t.test('a removed admin is refused at once, with the old session still open', async () => {
    await status(put(c.owner, 'stale', { role: 'STUDENT' }), 200, 'owner removes the admin');
    await status(put(c.stale, 'student', { walletUSD: 999 }), 403, 'wallet edit');
    await status(c.stale.json('DELETE', `/api/admin/users/${ids.student}`), 403, 'delete user');
    assert.equal((await row('student')).walletUSD, 130.5);
  });
});
