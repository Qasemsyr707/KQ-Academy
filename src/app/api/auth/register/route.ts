import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { notifySafely } from '@/lib/notifications';
import { resolveReferrer } from '@/lib/referrals';

export async function POST(req: Request) {
  try {
    const { name, email, password, ref } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'الرجاء ملء جميع الحقول' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم مسبقاً' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    // Referral attribution happens once, here, from a valid code that is not the new user's own.
    const referredById = await resolveReferrer(prisma, ref, String(email)).catch(() => null);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        ...(referredById ? { referredById } : {}),
      }
    });

    await notifySafely({
      userId: user.id,
      title: 'أهلاً بك في KQ Academy',
      message: 'تم إنشاء حسابك بنجاح. استكشف الكورسات وابدأ رحلتك التعليمية.',
      link: '/courses',
      dedupeKey: 'welcome',
    });

    return NextResponse.json({ message: 'تم إنشاء الحساب بنجاح', user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء التسجيل' }, { status: 500 });
  }
}
