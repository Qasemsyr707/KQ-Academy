import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { generateCertificateFiles } from '@/lib/certificate';

export async function POST(req: Request) {
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

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: 'رقم الكورس مطلوب' }, { status: 400 });
    }

    const userId = decoded.id;

    // Check if certificate already exists
    const existingCert = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });

    if (existingCert) {
      return NextResponse.json({ certificateId: existingCert.id, message: 'الشهادة موجودة مسبقاً' });
    }

    // VERIFY QUIZZES
    // Find all quizzes in this course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        chapters: {
          include: {
            quizzes: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    let allQuizzes: any[] = [];
    course.chapters.forEach(ch => {
      allQuizzes = [...allQuizzes, ...ch.quizzes];
    });

    if (allQuizzes.length > 0) {
      // Check if user passed all quizzes
      for (const quiz of allQuizzes) {
        const passedAttempt = await prisma.quizAttempt.findFirst({
          where: {
            userId,
            quizId: quiz.id,
            passed: true
          }
        });

        if (!passedAttempt) {
          return NextResponse.json({ error: 'لا يمكنك استخراج الشهادة قبل اجتياز جميع اختبارات الكورس بنجاح' }, { status: 403 });
        }
      }
    }

    // Get student details
    const student = await prisma.user.findUnique({ where: { id: userId } });
    if (!student || !student.name) {
      return NextResponse.json({ error: 'بيانات الطالب غير مكتملة' }, { status: 400 });
    }

    // Generate certificate number
    const currentYear = new Date().getFullYear();
    const count = await prisma.certificate.count({
      where: { certificateNumber: { startsWith: `KQ${currentYear}-` } }
    });
    const nextNum = (count + 1).toString().padStart(4, '0');
    const certificateNumber = `KQ${currentYear}-${nextNum}`;

    const startDate = new Date(course.createdAt).toLocaleDateString('en-GB'); 
    const endDate = new Date().toLocaleDateString('en-GB');
    const issueDate = new Date().toLocaleDateString('en-GB');

    const pngUrl = `/api/certificates/${certificateNumber}/png`;
    const pdfUrl = `/api/certificates/${certificateNumber}/pdf`;

    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        certificateNumber,
        studentName: student.name,
        courseName: course.title,
        courseDuration: 16,
        manager1: "Qasem Alsokhny",
        manager2: "Khaled Alrefay",
        pdfUrl,
        pngUrl
      }
    });

    return NextResponse.json({ certificateId: certificate.id, message: 'تم إصدار الشهادة بنجاح!' }, { status: 201 });

  } catch (error) {
    console.error('Mobile Issue Certificate API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
