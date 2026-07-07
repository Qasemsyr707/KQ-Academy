import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendCourseReminderEmail } from '@/lib/email';

// POST /api/cron/reminders — Send automated reminder emails
// Call this endpoint from a cron job (e.g., daily at 9AM)
export async function POST(req: Request) {
  try {
    // Security: Only allow requests with a secret cron token
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'dev-cron-secret';
    if (authHeader !== `Bearer ${expectedToken}`) {
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
        await sendCourseReminderEmail(
          enrollment.user.email,
          enrollment.user.name,
          enrollment.course.title,
          enrollment.course.id,
          enrollment.progress
        );
        sent++;
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
