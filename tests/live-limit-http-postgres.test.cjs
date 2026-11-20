/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Real HTTP + PostgreSQL regression: saving an instructor's live-stream quota used to reset the
// wallet to 0 and lift the ban. The quota now has its own route that writes the quota only.
const assert = require('node:assert/strict');
const test = require('node:test');
const { httpFixture, httpSkip } = require('./helpers/http-fixture.cjs');

test('HTTP/PostgreSQL: live quota changes the quota only; wallet, ban and role stay exactly as they were', { skip: httpSkip, timeout: 120000 }, async t => {
  const f = await httpFixture(t, {
    users: {
      owner: { role: 'OWNER' }, admin: { role: 'ADMIN' }, stale: { role: 'ADMIN' }, student: { role: 'STUDENT' },
      teacher: { role: 'INSTRUCTOR', walletUSD: 50, walletSYP: 700000, maxLiveStreams: 5 },
      bannedTeacher: { role: 'INSTRUCTOR', walletUSD: 20, walletSYP: 300000, maxLiveStreams: 5, isBanned: true, banReason: 'Synthetic ban', bannedUntil: new Date('2099-01-01T00:00:00Z') },
    },
    login: ['owner', 'admin', 'stale', 'teacher'],
  });
  const { c, status, ids, row, prisma } = f;
  const limit = (client, key, body) => client.json('PUT', `/api/admin/users/${ids[key]}/live-limit`, body);
  const teacher = await row('teacher');
  const banned = await row('bannedTeacher');

  await status(limit(c.admin, 'teacher', { maxLiveStreams: '9' }), 200, 'admin sets quota');
  await status(limit(c.owner, 'bannedTeacher', { maxLiveStreams: 7 }), 200, 'owner sets quota of a banned instructor');
  assert.deepEqual(await row('teacher'), { ...teacher, maxLiveStreams: 9 }, 'wallet, ban and role unchanged');
  assert.deepEqual(await row('bannedTeacher'), { ...banned, maxLiveStreams: 7 }, 'still banned, same reason, same balances');

  for (const [label, body] of [['extra wallet field', { maxLiveStreams: 3, walletUSD: 0 }], ['extra ban field', { maxLiveStreams: 3, isBanned: false }],
    ['negative', { maxLiveStreams: -1 }], ['fraction', { maxLiveStreams: 2.5 }], ['text', { maxLiveStreams: 'abc' }], ['empty', { maxLiveStreams: '' }], ['missing', {}]]) {
    await status(limit(c.admin, 'teacher', body), 400, `invalid: ${label}`);
  }
  await status(limit(c.admin, 'student', { maxLiveStreams: 3 }), 400, 'not an instructor');
  await status(limit(c.admin, 'owner', { maxLiveStreams: 3 }), 400, 'owner account');
  await status(limit(c.teacher, 'teacher', { maxLiveStreams: 99 }), 403, 'instructor raises own quota');
  await status(limit(f.anonymous, 'teacher', { maxLiveStreams: 99 }), 401, 'anonymous');
  await prisma.user.update({ where: { id: ids.stale }, data: { role: 'STUDENT' } });
  await status(limit(c.stale, 'teacher', { maxLiveStreams: 50 }), 403, 'removed admin with an open session');
  assert.deepEqual(await row('teacher'), { ...teacher, maxLiveStreams: 9 });
  assert.deepEqual(await row('bannedTeacher'), { ...banned, maxLiveStreams: 7 });
});
