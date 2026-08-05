import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';

export async function PUT(req: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const body = await req.json();
    const resolvedParams = await params;
    const { chapterId } = resolvedParams;

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      return NextResponse.json({ error: 'الفصل غير موجود' }, { status: 404 });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title: body.title !== undefined ? body.title : chapter.title,
        isFree: body.isFree !== undefined ? body.isFree : chapter.isFree,
        order: body.order !== undefined ? body.order : chapter.order,
      }
    });

    return NextResponse.json(updatedChapter);
  } catch (error) {
    console.error('Update Chapter API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  try {
    const { authorized, errorResponse } = await requireRoleApi(['ADMIN', 'INSTRUCTOR']);
    if (!authorized) return errorResponse;

    const resolvedParams = await params;
    const { chapterId } = resolvedParams;

    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      return NextResponse.json({ error: 'الفصل غير موجود' }, { status: 404 });
    }

    // Prisma relation will handle cascading if configured, or we delete lessons manually first
    // It's safer to delete lessons first, but let's check schema. We might need to delete lessons manually.
    await prisma.lesson.deleteMany({
      where: { chapterId }
    });

    await prisma.chapter.delete({
      where: { id: chapterId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Chapter API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
