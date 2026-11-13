import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCourseCompletion } from '@/lib/course-progress';
import { notify } from '@/lib/notifications';

export class CertificateError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

const uniqueViolation = (error: unknown, field: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  && JSON.stringify(error.meta?.target ?? '').includes(field);

/**
 * Issue (or return) the student's certificate for a course. Eligibility is
 * decided on the server only: the student must be enrolled, have completed
 * every lesson and passed every quiz. One certificate per student and course
 * is guaranteed by the database; concurrent requests return the same one.
 */
export async function issueCertificate(userId: string, courseId: unknown) {
  if (typeof courseId !== 'string' || !courseId || courseId.length > 200) {
    throw new CertificateError(400, 'رقم الكورس مطلوب');
  }
  const existing = await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (existing) return { certificate: existing, created: false };

  const [course, student, enrollment] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, isBanned: true } }),
    prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { id: true } }),
  ]);
  if (!course) throw new CertificateError(404, 'الكورس غير موجود');
  if (!student || student.isBanned) throw new CertificateError(403, 'لا يمكن إصدار الشهادة لهذا الحساب');
  if (!enrollment) throw new CertificateError(403, 'الشهادة متاحة للطلاب المسجلين في الكورس فقط');
  if (!student.name?.trim()) throw new CertificateError(400, 'بيانات الطالب غير مكتملة');

  const completion = await getCourseCompletion(prisma, userId, courseId);
  if (!completion.complete) {
    throw new CertificateError(403, 'لا يمكنك استخراج الشهادة قبل إكمال جميع الدروس واجتياز جميع اختبارات الكورس');
  }

  const prefix = `KQ${new Date().getFullYear()}-`;
  for (let attempt = 0; attempt < 6; attempt++) {
    // Highest issued number, not a row count: deleted certificates never free a number.
    const last = await prisma.certificate.findFirst({
      where: { certificateNumber: { startsWith: prefix } },
      orderBy: { certificateNumber: 'desc' }, select: { certificateNumber: true },
    });
    const next = (Number.parseInt(last?.certificateNumber.slice(prefix.length) ?? '0', 10) || 0) + 1 + attempt;
    const certificateNumber = `${prefix}${String(next).padStart(4, '0')}`;
    try {
      const certificate = await prisma.$transaction(async tx => {
        const created = await tx.certificate.create({
          data: {
            userId, courseId, certificateNumber,
            studentName: student.name!.trim(), courseName: course.title,
            pdfUrl: `/api/certificates/${certificateNumber}/pdf`,
            pngUrl: `/api/certificates/${certificateNumber}/png`,
          },
        });
        await notify(tx, {
          userId,
          title: 'مبروك! شهادتك جاهزة',
          message: `أتممت كورس «${course.title}» وصدرت شهادتك برقم ${certificateNumber}.`,
          link: '/features/certificates',
          dedupeKey: `certificate:${courseId}`,
        });
        return created;
      });
      return { certificate, created: true };
    } catch (error) {
      if (uniqueViolation(error, 'userId')) {
        const winner = await prisma.certificate.findUnique({ where: { userId_courseId: { userId, courseId } } });
        if (winner) return { certificate: winner, created: false };
      }
      if (!uniqueViolation(error, 'certificateNumber')) throw error;
    }
  }
  throw new CertificateError(503, 'تعذّر إصدار الشهادة حالياً، يرجى المحاولة بعد قليل');
}
