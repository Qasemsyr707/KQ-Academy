import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { certId: string } }
) {
  try {
    const { certId } = params;

    if (!certId) {
      return NextResponse.json({ error: 'يرجى تزويد كود الشهادة' }, { status: 400 });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: certId },
      include: {
        user: { select: { name: true } },
        course: { 
          select: { 
            title: true,
            instructor: { select: { name: true } }
          } 
        }
      }
    });

    if (!certificate) {
      return NextResponse.json({ error: 'الشهادة غير موجودة أو كود غير صالح' }, { status: 404 });
    }

    return NextResponse.json({
      studentName: certificate.user.name,
      courseName: certificate.course.title,
      issueDate: certificate.issuedAt.toISOString().split('T')[0],
      instructor: certificate.course.instructor?.name || 'مدرب معتمد',
      status: 'موثقة'
    });

  } catch (error) {
    console.error('Certificate Verification Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
