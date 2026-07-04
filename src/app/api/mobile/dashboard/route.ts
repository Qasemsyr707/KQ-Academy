import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_mobile';
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
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

    const certificates = await prisma.certificate.findMany({
      where: { userId: decoded.id },
      include: { course: { select: { title: true } } }
    });

    return NextResponse.json({ enrollments, certificates, user: decoded }, { status: 200 });
  } catch (error) {
    console.error('Mobile Dashboard API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
