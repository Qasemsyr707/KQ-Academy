import { NextResponse } from 'next/server';
import { requireRoleApi } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
    if (!authorized) return errorResponse;

    const streams = await prisma.liveClass.findMany({
      include: {
        instructor: { select: { id: true, name: true, email: true } }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    return NextResponse.json({ streams });
  } catch (error) {
    console.error('Fetch Admin Live API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
