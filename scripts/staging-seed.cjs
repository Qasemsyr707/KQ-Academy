/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node script. */
/**
 * Synthetic test data for a STAGING database only.
 *
 *   KQ_STAGING=true node scripts/staging-seed.cjs
 *
 * Refuses to run unless KQ_STAGING=true, the configured site address is not the
 * production domain, and the database looks fresh (fewer than 25 accounts), so it
 * cannot be pointed at production or at a restored copy of it by mistake.
 * Creates four accounts on the reserved `.invalid` domain (no e-mail can ever be
 * delivered to them), sample courses, and one certificate in the original
 * (template 1.0) format. Running it again changes nothing that already exists.
 *
 * Account password: KQ_STAGING_SEED_PASSWORD (at least 12 characters), otherwise a
 * random one that is printed once.
 */
const { randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function refuse(message) {
  console.error(`REFUSED: ${message}`);
  process.exit(1);
}

const PRODUCTION_HOSTS = ['kqacademy.com', 'www.kqacademy.com'];

async function main() {
  if (process.env.KQ_STAGING !== 'true') refuse('set KQ_STAGING=true (staging only).');
  for (const key of ['NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']) {
    const value = process.env[key];
    if (!value) refuse(`${key} is not set.`);
    let host;
    try { host = new URL(value).hostname.toLowerCase(); } catch { refuse(`${key} is not a valid URL.`); }
    if (PRODUCTION_HOSTS.includes(host)) refuse(`${key} points to production (${host}).`);
  }
  const password = process.env.KQ_STAGING_SEED_PASSWORD || randomBytes(12).toString('base64url');
  if (password.length < 12) refuse('KQ_STAGING_SEED_PASSWORD must have at least 12 characters.');

  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.count();
    const seeded = await prisma.user.count({ where: { email: { endsWith: '@kq-staging.invalid' } } });
    if (users - seeded >= 25) refuse(`the database already has ${users - seeded} real-looking accounts; it may be a production copy.`);

    const hash = await bcrypt.hash(password, 10);
    const account = (id, name, role, extra = {}) => prisma.user.upsert({
      where: { email: `${id}@kq-staging.invalid` },
      update: {},
      create: { id: `stg_${id}`, name, email: `${id}@kq-staging.invalid`, password: hash, role, ...extra },
    });
    const admin = await account('admin', '[STAGING] مدير', 'ADMIN');
    const teacher = await account('instructor', '[STAGING] مدرّب', 'INSTRUCTOR');
    const studentA = await account('student-a', 'محمد عبد الرحمن الأحمد', 'STUDENT');
    const studentB = await account('student-b', 'Sara Al-Khatib', 'STUDENT', { walletUSD: 50 });

    const course = (id, data) => prisma.course.upsert({
      where: { id: `stg_${id}` }, update: {},
      create: { id: `stg_${id}`, instructorId: teacher.id, status: 'PUBLISHED', type: 'SKILL', ...data },
    });
    const paid = await course('paid', { title: '[STAGING] أساسيات البرمجة بالذكاء الاصطناعي', category: 'البرمجة', price: 10, priceSYP: 0, durationHours: 12,
      description: 'كورس تجريبي لبيئة الاختبار.' });
    const free = await course('free', { title: '[STAGING] مدخل إلى التصميم', category: 'التصميم', price: 0, priceSYP: 0 });
    const curriculum = await course('curriculum', { title: '[STAGING] الرياضيات — بكالوريا', category: 'بكالوريا علمي', type: 'CURRICULUM', price: 5, priceSYP: 0 });
    await course('pending', { title: '[STAGING] كورس قيد المراجعة', category: 'البرمجة', price: 7, status: 'PENDING' });

    const chapter = (id, courseId, order, title) => prisma.chapter.upsert({
      where: { id: `stg_${id}` }, update: {}, create: { id: `stg_${id}`, courseId, order, title },
    });
    const lesson = (id, chapterId, order, title) => prisma.lesson.upsert({
      where: { id: `stg_${id}` }, update: {}, create: { id: `stg_${id}`, chapterId, order, title },
    });
    const c1 = await chapter('paid_ch1', paid.id, 0, 'الوحدة الأولى');
    const c2 = await chapter('paid_ch2', paid.id, 1, 'الوحدة الثانية');
    await lesson('paid_l1', c1.id, 0, 'مقدمة');
    await lesson('paid_l2', c1.id, 1, 'المفاهيم الأساسية');
    await lesson('paid_l3', c2.id, 0, 'مشروع تطبيقي');
    await prisma.quiz.upsert({
      where: { id: 'stg_paid_quiz' }, update: {},
      create: { id: 'stg_paid_quiz', chapterId: c2.id, title: 'اختبار الوحدة', passingScore: 50, totalMarks: 2,
        questions: { create: [
          { id: 'stg_q1', text: 'ما ناتج 2 + 2؟', options: JSON.stringify(['3', '4', '5']), correctAnswer: 1, points: 1 },
          { id: 'stg_q2', text: 'أي مما يلي لغة برمجة؟', options: JSON.stringify(['Python', 'Photoshop']), correctAnswer: 0, points: 1 },
        ] } },
    });
    const f1 = await chapter('free_ch1', free.id, 0, 'البداية');
    await lesson('free_l1', f1.id, 0, 'ما هو التصميم؟');
    await lesson('free_l2', f1.id, 1, 'الألوان والخطوط');
    const m1 = await chapter('cur_ch1', curriculum.id, 0, 'التحليل');
    await lesson('cur_l1', m1.id, 0, 'النهايات');

    // Student A was enrolled in the curriculum course before it was hidden, and
    // holds a certificate issued by the original system (template 1.0).
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: studentA.id, courseId: curriculum.id } }, update: {},
      create: { userId: studentA.id, courseId: curriculum.id, progress: 100, createdAt: new Date('2025-05-01T09:00:00Z') },
    });
    await prisma.certificate.upsert({
      where: { userId_courseId: { userId: studentA.id, courseId: curriculum.id } }, update: {},
      create: { id: 'stg_legacy_certificate', certificateNumber: 'KQ2025-0001', userId: studentA.id, courseId: curriculum.id,
        studentName: studentA.name, courseName: curriculum.title, courseDuration: 16, templateVersion: '1.0',
        issuedAt: new Date('2025-06-01T10:00:00Z'), pngUrl: '/api/certificates/KQ2025-0001/png', pdfUrl: '/api/certificates/KQ2025-0001/pdf' },
    });

    console.log('Staging seed complete. Accounts (password below):');
    for (const user of [admin, teacher, studentA, studentB]) console.log(`  ${user.role.padEnd(10)} ${user.email}`);
    console.log(process.env.KQ_STAGING_SEED_PASSWORD ? '  password: the value of KQ_STAGING_SEED_PASSWORD' : `  password: ${password}`);
    console.log(`Courses: paid ${paid.id}, free ${free.id}, curriculum ${curriculum.id}, pending stg_pending`);
    console.log('Legacy certificate: KQ2025-0001 (student-a)');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
