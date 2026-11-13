import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { protectCourseLessonSources } from '@/lib/lesson-links';
import { certificateUrls, publicReference } from '@/lib/certificate-access';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return NextResponse.json({ error: 'خدمة تسجيل الدخول غير متاحة حالياً' }, { status: 503 });
    
    let decoded: jwt.JwtPayload | string;
    try {
      decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch {
      return NextResponse.json({ error: 'توكن غير صالح' }, { status: 401 });
    }
    if (typeof decoded === 'string' || typeof decoded.id !== 'string' || !decoded.id) {
      return NextResponse.json({ error: 'توكن غير صالح' }, { status: 401 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: decoded.id },
      include: {
        course: {
          include: {
            instructor: { select: { name: true } },
            chapters: { include: { lessons: true, quizzes: true } }
          }
        }
      }
    });

    const ownCertificates = await prisma.certificate.findMany({
      where: { userId: decoded.id },
      include: { course: { select: { title: true } } }
    });
    // The app loads documents without a session, so it gets unguessable links.
    const certificates = await Promise.all(ownCertificates.map(async certificate => {
      const urls = certificateUrls(await publicReference(certificate));
      return { ...certificate, pngUrl: urls.png, pdfUrl: urls.pdf, verifyUrl: urls.verify };
    }));

    const protectedEnrollments = enrollments.map(enrollment => ({ ...enrollment, course: protectCourseLessonSources(enrollment.course) }));
    return NextResponse.json({ enrollments: protectedEnrollments, certificates, user: decoded }, { status: 200 });
  } catch (error) {
    console.error('Mobile Dashboard API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
