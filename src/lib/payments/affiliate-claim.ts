import { CheckoutError } from './checkout-context';
import { withPaymentTransaction } from './transactions';
import { CLAIMABLE_WHERE } from '@/lib/referrals';

/** Claim the persisted earnings and credit their owner in one serializable unit.
 * A serialization retry re-reads pending rows; it never reuses an earlier total. */
export async function claimAffiliateEarnings(userId: string): Promise<number> {
  return withPaymentTransaction(async tx => {
    // Approved commissions, plus the historical ones (no sourceKey) that were always claimable.
    const earnings = await tx.affiliateEarning.findMany({
      where: { ownerId: userId, ...CLAIMABLE_WHERE },
      select: { id: true, amount: true },
      orderBy: { id: 'asc' },
    });
    if (!earnings.length) throw new CheckoutError(400, 'لا توجد أرباح معتمدة جاهزة للتحويل بعد');

    // Amounts come exclusively from server-created commission records. Preserve
    // their existing precision instead of applying a new payout/rounding rule.
    if (earnings.some(earning => !Number.isFinite(earning.amount) || earning.amount <= 0)) {
      throw new CheckoutError(409, 'تحتاج الأرباح إلى مراجعة قبل التحويل');
    }
    const totalAmount = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    if (!Number.isFinite(totalAmount) || totalAmount > Number.MAX_SAFE_INTEGER) {
      throw new CheckoutError(409, 'تحتاج الأرباح إلى مراجعة قبل التحويل');
    }
    const claimed = await tx.affiliateEarning.updateMany({
      where: { id: { in: earnings.map(earning => earning.id) }, ownerId: userId, ...CLAIMABLE_WHERE },
      data: { status: 'PAID', paidAt: new Date() },
    });
    if (claimed.count !== earnings.length) {
      // Throwing rolls back even a partial claim, before any wallet credit.
      throw new CheckoutError(409, 'العملية قيد المعالجة، يرجى إعادة المحاولة');
    }
    await tx.user.update({ where: { id: userId }, data: { walletUSD: { increment: totalAmount } } });
    await tx.walletTransaction.create({
      data: { userId, amount: totalAmount, currency: 'USD', type: 'DEPOSIT', status: 'APPROVED', provider: 'AFFILIATE' },
    });
    return totalAmount;
  });
}
