import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const shorts = await (prisma as any).short.findMany({
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(shorts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shorts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!session || !user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'غير مصرح لك بنشر فيديو قصير' }, { status: 401 });
    }

    const { title, videoUrl } = await request.json();

    if (!title || !videoUrl) {
      return NextResponse.json({ error: 'العنوان ورابط الفيديو مطلوبان' }, { status: 400 });
    }

    const short = await (prisma as any).short.create({
      data: {
        title,
        videoUrl,
        userId: user.id
      }
    });

    return NextResponse.json(short);
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ أثناء الرفع' }, { status: 500 });
  }
}
