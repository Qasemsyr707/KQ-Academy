/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Real HTTP + PostgreSQL: these admin routes trusted the role frozen in the 30-day session token, so an
// admin whose role was removed kept access (bulk email to every user, bundles, plans, Q&A deletion,
// the certificates list), while the OWNER was refused. They now read the role from the database.
const assert = require('node:assert/strict');
const test = require('node:test');
const { httpFixture, httpSkip } = require('./helpers/http-fixture.cjs');

test('HTTP/PostgreSQL: admin routes follow the current database role, not the session token', { skip: httpSkip, timeout: 120000 }, async t => {
  const f = await httpFixture(t, { users: { owner: { role: 'OWNER' }, stale: { role: 'ADMIN' }, student: { role: 'STUDENT' } } });
  const { c, status, ids, prisma, tag } = f;

  for (const path of ['/api/admin/bundles', '/api/admin/subscriptions']) {
    await status(c.owner.request(path), 200, `owner ${path} (was refused before)`);
    await status(c.stale.request(path), 200, `admin ${path}`);
    await status(c.student.request(path), 403, `student ${path}`);
    await status(f.anonymous.request(path), 403, `anonymous ${path}`);
  }
  await status(c.owner.request('/admin/certificates'), 200, 'owner certificates page');
  await status(c.student.request(`/api/qa/answers?id=${f.p}_none`, { method: 'DELETE' }), 403, 'student deletes an answer');

  await prisma.user.update({ where: { id: ids.stale }, data: { role: 'STUDENT' } });
  // Same browser session, whose token still says ADMIN.
  await status(c.stale.request('/api/admin/bundles'), 403, 'bundles list');
  await status(c.stale.json('POST', '/api/admin/bundles', { title: `Stale ${tag}`, price: 1, courseIds: ['none'] }), 403, 'bundle create');
  await status(c.stale.request('/api/admin/subscriptions'), 403, 'plans list');
  await status(c.stale.json('POST', '/api/admin/subscriptions', { name: `Stale ${tag}`, priceMonthly: 1, priceYearly: 1 }), 403, 'plan create');
  await status(c.stale.json('POST', '/api/admin/emails/send', { subject: 'x', body: 'x', targetAudience: 'ALL' }), 403, 'bulk email');
  await status(c.stale.request(`/api/qa/answers?id=${f.p}_none`, { method: 'DELETE' }), 403, 'delete answer');
  await status(c.stale.request(`/api/qa/questions?id=${f.p}_none`, { method: 'DELETE' }), 403, 'delete question');
  const page = await c.stale.request('/admin/certificates');
  assert.ok([303, 307, 308].includes(page.status), `certificates page redirects, got ${page.status}`);
  assert.equal(await prisma.courseBundle.count({ where: { title: { contains: tag } } }), 0);
  assert.equal(await prisma.subscriptionPlan.count({ where: { name: { contains: tag } } }), 0);
});
