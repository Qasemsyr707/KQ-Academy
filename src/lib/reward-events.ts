import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';

export const DAILY_LOGIN_POINTS = 5;
export const QUIZ_PASS_POINTS = 50;

/** A zero-dollar audit entry records points, never a wallet deposit. The existing
 * primary key makes claiming an event unique across all application workers. */
async function claimReward(tx: Prisma.TransactionClient, userId: string, event: string, points: number) {
  const id = `reward_${createHash('sha256').update(JSON.stringify([userId, event])).digest('hex')}`;
  const claimed = await tx.walletTransaction.createMany({
    data: [{ id, userId, amount: 0, currency: 'USD', type: 'POINTS_REWARD', status: 'APPROVED',
      provider: 'GAMIFICATION', transactionId: event, providerResponse: JSON.stringify({ version: 1, event, points }) }],
    skipDuplicates: true,
  });
  if (claimed.count === 0) return false;
  const credited = await tx.user.updateMany({
    where: { id: userId, role: 'STUDENT', isBanned: false, points: { lte: 2147483647 - points } },
    data: { points: { increment: points } },
  });
  if (credited.count !== 1) throw new CheckoutError(409, 'تعذّر إضافة النقاط لهذا الحساب');
  return true;
}

/** Authenticated presence is the event; identity, amount and date are server-owned. */
export async function claimDailyLogin(userId: string) {
  return withPaymentTransaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isBanned: true } });
    if (!user || user.isBanned || user.role !== 'STUDENT') throw new CheckoutError(403, 'المكافأة متاحة للطلاب فقط');
    const event = `DAILY_LOGIN:${new Date().toISOString().slice(0, 10)}`;
    const awarded = await claimReward(tx, userId, event, DAILY_LOGIN_POINTS);
    const balance = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { points: true } });
    return { success: true, awarded, points: awarded ? DAILY_LOGIN_POINTS : 0, newTotal: balance.points, reason: 'DAILY_LOGIN' };
  });
}

/** Called before completing a successful attempt, in the same transaction.
 * Legacy completed successes also suppress rewards issued before markers existed. */
export async function rewardFirstQuizPass(tx: Prisma.TransactionClient, userId: string, quizId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isBanned: true } });
  if (!user || user.isBanned || user.role !== 'STUDENT') return false;
  const passed = await tx.quizAttempt.findFirst({ where: { userId, quizId, status: 'COMPLETED', passed: true }, select: { id: true } });
  if (passed) return false;
  return claimReward(tx, userId, `QUIZ_PASS:${quizId}`, QUIZ_PASS_POINTS);
}
