/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Real HTTP + PostgreSQL: POST /api/coupons used to accept anonymous requests (its guard tested an
// object that is always truthy). Only ADMIN or OWNER, read from the database, may create coupons.
const assert = require('node:assert/strict');
const test = require('node:test');
const { httpFixture, httpSkip } = require('./helpers/http-fixture.cjs');

test('HTTP/PostgreSQL: coupon creation is limited to current ADMIN/OWNER and valid coupons keep working', { skip: httpSkip, timeout: 180000 }, async t => {
  const f = await httpFixture(t, {
    users: { owner: { role: 'OWNER' }, admin: { role: 'ADMIN' }, stale: { role: 'ADMIN' }, teacher: { role: 'INSTRUCTOR' }, student: { role: 'STUDENT', walletUSD: 200 } },
    course: { instructor: 'teacher', price: 100 },
  });
  const { c, status, tag, prisma, courseId, ids } = f;
  const mobileStudent = await f.mobile('student');
  const mobileAdmin = await f.mobile('admin');
  const coupon = code => ({ code: `${code}${tag}`, discount: 20 });

  await t.test('visitors, students and instructors are refused before any write', async () => {
    const before = await prisma.coupon.count();
    await status(f.anonymous.json('POST', '/api/coupons', coupon('ANON')), 401, 'anonymous');
    await status(f.anonymous.json('POST', '/api/coupons', { code: `X${tag}`, discount: 99 }), 401, 'anonymous 99%');
    await status(c.student.json('POST', '/api/coupons', coupon('STU')), 403, 'student');
    await status(c.teacher.json('POST', '/api/coupons', coupon('TEA')), 403, 'instructor');
    await status(mobileStudent.json('POST', '/api/coupons', coupon('MOB')), 403, 'student mobile token');
    const crossSite = new f.Client(); crossSite.cookies = c.admin.cookies; crossSite.origin = 'https://evil.example';
    await status(crossSite.json('POST', '/api/coupons', coupon('CSRF')), 403, 'cross-site cookie request');
    await status(c.admin.request('/api/coupons', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(coupon('FORM')) }), 403, 'non-JSON cookie request');
    assert.equal(await prisma.coupon.count(), before, 'refused requests created nothing');
  });

  await t.test('admins and the owner create validated coupons', async () => {
    const created = await (await status(c.admin.json('POST', '/api/coupons', { code: ` save${tag} `, discount: 25 }), 200, 'admin')).json();
    assert.equal(created.coupon.code, `SAVE${tag}`, 'stored upper-cased and trimmed');
    assert.equal(created.coupon.discount, 25);
    await status(c.owner.json('POST', '/api/coupons', { code: `OWN${tag}`, discount: 10, courseId }), 200, 'owner, course coupon');
    await status(mobileAdmin.json('POST', '/api/coupons', { code: `MADM${tag}`, discount: '5' }), 200, 'admin mobile token');
    await status(c.admin.json('POST', '/api/coupons', { code: `SAVE${tag}`, discount: 30 }), 409, 'duplicate code');
    for (const [label, body] of [
      ['0%', { code: `Z0${tag}`, discount: 0 }], ['100%', { code: `Z1${tag}`, discount: 100 }], ['150%', { code: `Z2${tag}`, discount: 150 }],
      ['negative', { code: `Z3${tag}`, discount: -5 }], ['text', { code: `Z4${tag}`, discount: 'abc' }], ['null (NaN from the form)', { code: `Z5${tag}`, discount: null }],
      ['missing discount', { code: `Z6${tag}` }], ['spaces in code', { code: 'a b', discount: 10 }], ['short code', { code: 'AB', discount: 10 }],
      ['extra field', { code: `Z7${tag}`, discount: 10, id: 'forced' }], ['unknown course', { code: `Z8${tag}`, discount: 10, courseId: `${f.p}_missing` }],
      ['not an object', [`Z9${tag}`, 10]],
    ]) await status(c.admin.json('POST', '/api/coupons', body), 400, `invalid: ${label}`);
    assert.equal(await prisma.coupon.count({ where: { code: { startsWith: 'Z' }, AND: { code: { contains: tag } } } }), 0);
  });

  await t.test('valid coupons still validate and still discount a wallet purchase', async () => {
    const valid = await (await status(c.student.json('POST', '/api/coupons/validate', { code: `save${tag}`, courseId }), 200, 'validate (lower-case input)')).json();
    assert.equal(valid.discount, 25);
    assert.equal(valid.finalPrice, 75);
    await status(c.student.json('POST', '/api/checkout/wallet', { courseId, paymentCurrency: 'USD', couponCode: `SAVE${tag}` }), 200, 'wallet purchase with coupon');
    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: ids.student, courseId }, include: { coupon: true } });
    assert.equal(payment.amount, 75);
    assert.equal(payment.coupon.code, `SAVE${tag}`);
    assert.equal((await f.row('student')).walletUSD, 125);
    assert.ok(await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: ids.student, courseId } } }));
  });

  await t.test('an admin whose role was removed is refused at once, with the old session still open', async () => {
    await status(c.stale.json('POST', '/api/coupons', { code: `OK${tag}`, discount: 15 }), 200, 'still admin');
    await prisma.user.update({ where: { id: ids.stale }, data: { role: 'STUDENT' } });
    await status(c.stale.json('POST', '/api/coupons', { code: `STALE${tag}`, discount: 50 }), 403, 'removed admin');
    assert.equal(await prisma.coupon.count({ where: { code: `STALE${tag}` } }), 0);
  });
});
