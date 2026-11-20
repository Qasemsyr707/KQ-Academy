import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

/**
 * Live-stream quota of an instructor. This route writes `maxLiveStreams` and nothing else, so
 * saving a quota can never touch the wallet, the ban or the role (the general user route used to
 * reset them when the quota screen sent only the quota).
 */
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestUser(req, ['ADMIN', 'OWNER'], 'LIVE_CLASSES');
    const { id } = await props.params;
    let body: unknown;
    try { body = await req.json(); } catch { body = null; }
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
    if (!input || Object.keys(input).some(key => key !== 'maxLiveStreams')) {
      return NextResponse.json({ error: 'أرسل سقف البثوث فقط' }, { status: 400 });
    }
    const raw = input.maxLiveStreams;
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
    if (!Number.isInteger(value) || value < 0 || value > 1000) {
      return NextResponse.json({ error: 'سقف البثوث يجب أن يكون عدداً صحيحاً بين 0 و1000' }, { status: 400 });
    }
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    if (target.role !== 'INSTRUCTOR') return NextResponse.json({ error: 'سقف البثوث يخص حسابات المدربين فقط' }, { status: 400 });
    // The role condition is part of the write, so a role change in between cannot be overwritten.
    const updated = await prisma.user.updateMany({ where: { id, role: 'INSTRUCTOR' }, data: { maxLiveStreams: value } });
    if (updated.count !== 1) return NextResponse.json({ error: 'تغيّر دور المستخدم، أعد تحميل الصفحة' }, { status: 409 });
    console.info('[admin-users] live limit', { target: id, by: actor.id, maxLiveStreams: value });
    return NextResponse.json({ message: 'تم تحديث سقف البثوث', user: { id, maxLiveStreams: value } });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Live limit API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
