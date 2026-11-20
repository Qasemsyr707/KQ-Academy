import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { sendPromotionalEmail } from '@/lib/email';

// POST /api/admin/emails/send — Send email campaign
export async function POST(req: Request) {
  try {
    // Role from the database (not the session token), so a removed admin loses access at once.
    const staff = await requireRoleApi(['ADMIN'], 'SETTINGS');
    if (staff.errorResponse) return staff.errorResponse;

    const { subject, body, targetAudience } = await req.json();
    // targetAudience: 'ALL' | 'STUDENTS' | 'INSTRUCTORS' | 'INACTIVE'

    let users: { email: string; name: string }[] = [];

    if (targetAudience === 'ALL') {
      users = await prisma.user.findMany({ select: { email: true, name: true } });
    } else if (targetAudience === 'STUDENTS') {
      users = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { email: true, name: true } });
    } else if (targetAudience === 'INSTRUCTORS') {
      users = await prisma.user.findMany({ where: { role: 'INSTRUCTOR' }, select: { email: true, name: true } });
    } else if (targetAudience === 'INACTIVE') {
      // Users who haven't enrolled in any course
      users = await prisma.user.findMany({
        where: { enrollments: { none: {} } },
        select: { email: true, name: true }
      });
    }

    // Send in batches of 50 to avoid rate limits
    let sent = 0;
    for (const user of users) {
      try {
        await sendPromotionalEmail(user.email, user.name, subject, body);
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${user.email}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال البريد إلى ${sent} مستخدم بنجاح`
    });
  } catch (error) {
    console.error('Email Send Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الإرسال' }, { status: 500 });
  }
}
