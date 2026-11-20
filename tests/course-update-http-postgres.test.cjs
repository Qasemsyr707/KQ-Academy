/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
// Real HTTP + PostgreSQL: PUT /api/courses/[id] passed the request body straight to prisma.course.update,
// so a course's instructor could set the price to 0, feature the course, set its rating, change its
// status or type, and transfer it to another account. The instructor may now change content only;
// one forbidden field rejects the whole request and nothing is written. POST /api/courses/[id]/publish
// no longer lets an instructor override a moderation decision.
const assert = require('node:assert/strict');
const test = require('node:test');
const { httpFixture, httpSkip } = require('./helpers/http-fixture.cjs');

test('HTTP/PostgreSQL: course updates are limited to content for instructors; admin, creation, purchase and certificates keep working', { skip: httpSkip, timeout: 240000 }, async t => {
  const f = await httpFixture(t, {
    users: {
      owner: { role: 'OWNER' }, admin: { role: 'ADMIN' }, teacher: { role: 'INSTRUCTOR' }, teacher2: { role: 'INSTRUCTOR' },
      demoted: { role: 'INSTRUCTOR' }, student: { role: 'STUDENT', walletUSD: 500 },
    },
    // Unpublished: the instructor edits it directly. A published course goes through a change request (409 here).
    course: { instructor: 'teacher', price: 100, priceSYP: 1450000, status: 'DRAFT' },
  });
  const { c, status, ids, prisma, courseId, p } = f;
  const otherCourse = `${p}_course2`;
  const demotedCourse = `${p}_course3`;
  await prisma.course.createMany({ data: [
    { id: otherCourse, title: 'Synthetic other course', category: 'TEST', instructorId: ids.teacher2, status: 'PUBLISHED', price: 80 },
    { id: demotedCourse, title: 'Synthetic demoted course', category: 'TEST', instructorId: ids.demoted, status: 'PUBLISHED', price: 60 },
  ] });
  const mobileTeacher = await f.mobile('teacher');
  const put = (client, body, id = courseId) => client.json('PUT', `/api/courses/${id}`, body);
  const snapshot = (id = courseId) => prisma.course.findUniqueOrThrow({ where: { id }, select: {
    title: true, description: true, thumbnail: true, includes: true, previewVideoUrl: true, category: true,
    price: true, priceSYP: true, instructorId: true, isFeatured: true, rating: true, status: true, type: true, createdAt: true,
  } });

  await t.test('the instructor edits the content of their own course', async () => {
    await status(put(c.teacher, { title: '  عنوان محدث  ', description: 'وصف جديد', category: 'البرمجة',
      thumbnail: 'https://cdn.example.com/cover.jpg', includes: [' شهادة ', 'متابعة'] }), 200, 'content update');
    await status(put(c.teacher, { previewVideoUrl: null }), 200, 'clear intro video');
    const s = await snapshot();
    assert.equal(s.title, 'عنوان محدث');
    assert.equal(s.description, 'وصف جديد');
    // The category text is linked through the active taxonomy, which stores its canonical name.
    assert.notEqual(s.category, 'TEST');
    assert.ok(s.category);
    assert.equal(s.thumbnail, 'https://cdn.example.com/cover.jpg');
    assert.deepEqual(s.includes, ['شهادة', 'متابعة']);
    assert.equal(s.price, 100);
    assert.equal(s.instructorId, ids.teacher);
  });

  await t.test('forbidden fields are refused with 403 and nothing is written, even mixed with allowed ones', async () => {
    const before = await snapshot();
    for (const [label, body] of [
      ['price 0', { price: 0 }], ['priceSYP 0', { priceSYP: 0 }], ['transfer ownership', { instructorId: ids.teacher2 }],
      ['featured', { isFeatured: true }], ['rating', { rating: 5 }], ['status', { status: 'PUBLISHED' }], ['type', { type: 'CURRICULUM' }],
      ['id', { id: `${p}_hijack` }], ['createdAt', { createdAt: '2020-01-01T00:00:00Z' }], ['student count', { _count: { enrollments: 999 } }],
      ['unknown', { anything: 1 }],
      ['mixed allowed + price', { title: 'Mixed', includes: ['x'], price: 0 }], ['mixed allowed + owner', { description: 'Mixed', instructorId: ids.teacher2 }],
    ]) {
      await status(put(c.teacher, body), 403, `instructor: ${label}`);
    }
    await status(put(mobileTeacher, { price: 0 }), 403, 'mobile token is not a course-edit credential');
    for (const key of ['chapters', 'enrollments', 'payments', 'coupons', 'instructor']) {
      await status(put(c.teacher, { [key]: { create: {} } }), 400, `nested ${key}`);
    }
    await status(c.teacher.request(`/api/courses/${courseId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{bad json' }), 400, 'invalid JSON');
    assert.deepEqual(await snapshot(), before, 'course unchanged');
  });

  await t.test('no alternative method or other person can edit the course', async () => {
    const before = await snapshot();
    for (const method of ['PATCH', 'POST', 'DELETE']) {
      const r = await c.teacher.json(method, `/api/courses/${courseId}`, { price: 0 });
      assert.equal(r.status, 405, `${method} is not routed`);
    }
    await status(put(c.teacher2, { title: 'Hijacked' }), 403, "another instructor's course");
    await status(put(c.student, { title: 'Student' }), 403, 'student');
    await status(put(f.anonymous, { title: 'Anonymous' }), 403, 'anonymous');
    await prisma.user.update({ where: { id: ids.demoted }, data: { role: 'STUDENT' } });
    await status(put(c.demoted, { title: 'Stale' }, demotedCourse), 403, 'instructor whose role was removed (open session)');
    assert.deepEqual(await snapshot(), before);
    assert.equal((await snapshot(demotedCourse)).title, 'Synthetic demoted course');
  });

  await t.test('administrators keep both course endpoints: content here, price/status/ownership on the admin route', async () => {
    await status(put(c.admin, { title: 'تعديل إداري' }), 200, 'admin content');
    await status(put(c.owner, { description: 'وصف المالك' }), 200, 'owner content');
    await status(put(c.admin, { price: 0 }), 403, 'admin price on the content route');
    await status(c.admin.json('PUT', `/api/admin/courses/${courseId}`, { price: 90, priceSYP: 1300000, isFeatured: true }), 200, 'admin route price');
    await status(c.owner.json('PUT', `/api/admin/courses/${courseId}`, { status: 'PUBLISHED', type: 'SKILL', price: 90, priceSYP: 1300000 }), 200, 'owner admin route (publishing states the approved prices)');
    await status(c.teacher.json('PUT', `/api/admin/courses/${courseId}`, { price: 0 }), 403, 'instructor on admin route');
    const s = await snapshot();
    assert.equal(s.title, 'تعديل إداري'); assert.equal(s.description, 'وصف المالك');
    assert.equal(s.price, 90); assert.equal(s.priceSYP, 1300000); assert.equal(s.isFeatured, true); assert.equal(s.instructorId, ids.teacher);
  });

  await t.test('an instructor cannot publish a course the administration rejected; staff can', async () => {
    // Publishing is an administration decision (course-review.ts): instructors never publish, even their own course.
    await status(c.teacher.json('POST', `/api/courses/${courseId}/publish`), 403, 'instructor cannot publish');
    await status(c.admin.json('PUT', `/api/admin/courses/${courseId}`, { status: 'REJECTED' }), 200, 'admin rejects');
    await status(c.teacher.json('POST', `/api/courses/${courseId}/publish`), 403, 'instructor overrides rejection');
    await status(c.teacher2.json('POST', `/api/courses/${courseId}/publish`), 403, 'other instructor');
    assert.equal((await snapshot()).status, 'REJECTED');
    await status(c.owner.json('POST', `/api/courses/${courseId}/publish`, { price: 90, priceSYP: 1300000 }), 200, 'owner publishes with the approved prices');
    assert.equal((await snapshot()).status, 'PUBLISHED');
  });

  await t.test('course creation, purchase, enrollment, registration and certificates keep working', async () => {
    // Forbidden fields refuse the whole creation; a valid one becomes the instructor's DRAFT.
    await status(c.teacher.json('POST', '/api/courses', { title: 'Synthetic forged course', description: 'd', category: 'البرمجة', price: 30, priceSYP: 400000,
      instructorId: ids.teacher2, isFeatured: true, rating: 5, status: 'PENDING' }), 403, 'forged creation fields');
    assert.equal(await prisma.course.count({ where: { title: 'Synthetic forged course' } }), 0);
    const created = await (await status(c.teacher.json('POST', '/api/courses', { title: 'Synthetic new course', description: 'd', category: 'البرمجة', price: 30, priceSYP: 400000 }), 201, 'instructor creates a course')).json();
    const fresh = await snapshot(created.course.id);
    assert.equal(fresh.instructorId, ids.teacher, 'creator is the instructor');
    assert.equal(fresh.isFeatured, false); assert.equal(fresh.rating, 0); assert.equal(fresh.status, 'DRAFT'); assert.equal(fresh.price, 30);

    await status(c.student.json('POST', '/api/checkout/wallet', { courseId, paymentCurrency: 'USD' }), 200, 'wallet purchase');
    assert.ok(await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: ids.student, courseId } } }), 'enrolled');
    assert.equal((await f.row('student')).walletUSD, 410, 'paid the admin-set price (90)');
    assert.equal((await prisma.payment.findFirstOrThrow({ where: { userId: ids.student, courseId } })).status, 'APPROVED');

    // Phase 1: a certificate is issued only after every lesson is completed (server-side progress).
    const chapter = await prisma.chapter.create({ data: { title: 'Synthetic chapter', courseId, order: 1 } });
    const lesson = await prisma.lesson.create({ data: { title: 'Synthetic lesson', chapterId: chapter.id, order: 1, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    await status(c.student.json('POST', '/api/certificates/issue', { courseId }), 403, 'no certificate before completion');
    await status(c.student.json('POST', `/api/courses/${courseId}/progress`, { lessonId: lesson.id }), 200, 'lesson completed');
    const issued = await c.student.json('POST', '/api/certificates/issue', { courseId });
    assert.ok([200, 201].includes(issued.status), `certificate issued: ${issued.status}`);
    const cert = await issued.json();
    const verify = await (await status(f.anonymous.request(`/api/mobile/certificates/verify/${cert.certificateId}`), 200, 'certificate verification')).json();
    // Phase 1 privacy: an anonymous visitor sees a valid certificate with a masked name only.
    assert.ok(!JSON.stringify(verify).includes('Synthetic student'), 'full name hidden from anonymous visitors');
    assert.ok(JSON.stringify(verify).includes('nameMasked'));
    await status(f.anonymous.request(`/verify/${cert.certificateId}`), 200, 'public verification page');

    const reg = await f.anonymous.json('POST', '/api/auth/register', { name: 'Synthetic registered', email: `${p}_reg@example.invalid`, password: require('node:crypto').randomBytes(18).toString('base64url') });
    assert.equal(reg.status, 201, 'student registration');
    const account = await prisma.user.findUniqueOrThrow({ where: { email: `${p}_reg@example.invalid` }, select: { role: true } });
    assert.equal(account.role, 'STUDENT');
  });
});
