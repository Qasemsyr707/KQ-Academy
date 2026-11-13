import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db';

type Db = Prisma.TransactionClient | PrismaClient;

export interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  /** Same-site path the notification opens. Anything else is dropped. */
  link?: string | null;
  /** Stable key of the business event, e.g. `payment-approved:<paymentId>`. */
  dedupeKey: string;
}

/** Only same-site relative paths may be stored as a notification target. */
export function notificationLink(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return null;
  if (!value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

function rows(inputs: NotificationInput[]) {
  return inputs
    .filter(input => input.userId && input.title && input.message && input.dedupeKey)
    .map(input => ({
      userId: input.userId,
      title: input.title.slice(0, 200),
      message: input.message.slice(0, 2000),
      link: notificationLink(input.link),
      // The recipient is part of the key so one event can notify several people.
      dedupeKey: `${input.dedupeKey}:${input.userId}`.slice(0, 300),
    }));
}

/**
 * Create notifications inside the caller's transaction, so a notification
 * exists exactly when its event was committed. Duplicate events (retried
 * requests, repeated webhooks) are skipped by the unique `dedupeKey`.
 */
export async function notify(db: Db, ...inputs: NotificationInput[]): Promise<number> {
  const data = rows(inputs);
  if (data.length === 0) return 0;
  const created = await db.notification.createMany({ data, skipDuplicates: true });
  return created.count;
}

/**
 * For events outside a transaction, where a notification failure must never
 * fail the user's action (registration, publishing a lesson).
 */
export async function notifySafely(...inputs: NotificationInput[]): Promise<void> {
  try {
    await notify(prisma, ...inputs);
  } catch (error) {
    console.error('[notifications] could not store notification', error);
  }
}

/** Active administrators and owners, for operational notifications. */
export async function adminRecipients(db: Db): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'OWNER'] }, isBanned: false },
    select: { id: true },
  });
  return admins.map(admin => admin.id);
}

/** A confirmed enrollment: tell the student and the course's instructor. */
export async function notifyEnrollment(db: Db, enrollment: {
  userId: string; courseId: string; courseTitle: string; instructorId: string; eventKey: string;
}): Promise<void> {
  await notify(db,
    {
      userId: enrollment.userId,
      title: 'تم تسجيلك في الكورس',
      message: `أصبح كورس «${enrollment.courseTitle}» متاحاً في حسابك. يمكنك البدء بالتعلّم الآن.`,
      link: `/courses/${enrollment.courseId}/learn`,
      dedupeKey: `enrolled:${enrollment.eventKey}`,
    },
    ...(enrollment.instructorId !== enrollment.userId ? [{
      userId: enrollment.instructorId,
      title: 'طالب جديد في كورسك',
      message: `انضم طالب جديد إلى كورس «${enrollment.courseTitle}».`,
      link: '/instructor',
      dedupeKey: `new-student:${enrollment.eventKey}`,
    }] : []),
  );
}
