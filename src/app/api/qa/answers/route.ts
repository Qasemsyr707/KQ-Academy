import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { text, questionId } = await req.json();

    if (!text || !questionId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const answer = await prisma.courseAnswer.create({
      data: {
        text,
        questionId,
        userId: (session.user as any).id
      },
      include: {
        user: { select: { name: true, role: true } }
      }
    });

    return NextResponse.json({ answer, message: 'تم إضافة الإجابة بنجاح' }, { status: 201 });

  } catch (error) {
    console.error('Create Answer API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // Role from the database (not the session token), so a removed admin loses access at once.
    const staff = await requireRoleApi(['ADMIN'], 'MODERATION');
    if (staff.errorResponse) return staff.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف مفقود' }, { status: 400 });
    }

    await prisma.courseAnswer.delete({ where: { id } });

    return NextResponse.json({ message: 'تم الحذف بنجاح' }, { status: 200 });
  } catch (error) {
    console.error('Delete Answer API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
