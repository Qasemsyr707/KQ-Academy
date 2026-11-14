import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendCourseReminderEmail } from '@/lib/email';
import { readAuthorization } from '@/lib/request-user';
import { constantTimeSecret } from '@/lib/payments/provider-validation';

// POST /api/cron/reminders — Send automated reminder emails
// Call this endpoint from a cron job (e.g., daily at 9AM)
// Values that appeared in this repository's history must never be accepted.
const KNOWN_CRON_DEFAULTS = new Set(['dev-cron-secret']);

export async function POST(req: Request) {
  try {
    // Only a caller holding the configured secret may run this job. Without a
    // configured secret, or with the formerly published default, it never runs.
    const expectedToken = process.env.CRON_SECRET?.trim();
    if (!expectedToken || KNOWN_CRON_DEFAULTS.has(expectedToken)) {
      return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
    }
    if (expectedToken.length < 32) console.warn('[cron] CRON_SECRET is shorter than 32 characters; use a long random value');
    const authorization = readAuthorization(req.headers);
    if (authorization.kind !== 'bearer' || !constantTimeSecret(expectedToken, authorization.token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find enrollments that are between 20-80% complete and haven't been updated in 7+ days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleEnrollments = await prisma.enrollment.findMany({
      where: {
        progress: { gt: 0, lt: 100 },
        updatedAt: { lte: sevenDaysAgo }
      },
      include: {
        user: { select: { email: true, name: true } },
        course: { select: { id: true, title: true } }
      },
      take: 100 // Process in batches
    });

    let sent = 0;
    for (const enrollment of staleEnrollments) {
      try {
        const delivered = await sendCourseReminderEmail(
          enrollment.user.email,
          enrollment.user.name,
          enrollment.course.title,
          enrollment.course.id,
          enrollment.progress
        );
        if (delivered) sent++;
      } catch (e) {
        console.error(`Reminder failed for ${enrollment.user.email}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال ${sent} تذكير من أصل ${staleEnrollments.length} مستخدم`
    });
  } catch (error) {
    console.error('Cron Reminders Error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
