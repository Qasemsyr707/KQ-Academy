import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // For this prototype, we accept a direct URL to a file. 
    // In production, this would handle a multipart form data upload to S3.
    const { name, url, lessonId, chapterId, courseId } = await req.json();

    if (!name || !url) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }
    
    if (!lessonId && !chapterId && !courseId) {
      return NextResponse.json({ error: 'يجب تحديد الكورس أو الفصل أو الدرس' }, { status: 400 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        name,
        url,
        lessonId: lessonId || null,
        chapterId: chapterId || null,
        courseId: courseId || null
      }
    });

    return NextResponse.json({ attachment, message: 'تم الإضافة بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Attachment API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
