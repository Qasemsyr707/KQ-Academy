import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || ((session.user as any).role !== 'INSTRUCTOR' && (session.user as any).role !== 'ADMIN')) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { title, videoUrl, courseId } = await req.json();
    
    if (!title || !videoUrl) {
      return NextResponse.json({ error: 'العنوان ورابط الفيديو مطلوبان' }, { status: 400 });
    }

    const short = await prisma.short.create({
      data: {
        title,
        videoUrl,
        userId: (session.user as any).id,
        courseId: courseId || null,
      }
    });

    return NextResponse.json({ success: true, short });
  } catch (error) {
    console.error('Error creating short:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء الفيديو القصير' }, { status: 500 });
  }
}
