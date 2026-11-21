import type { Prisma, PrismaClient } from '@prisma/client';

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Referral programme (the existing affiliate fields: User.affiliateCode, User.referredById,
 * AffiliateEarning). Rules:
 *   - attribution happens once, at registration, from a valid ?ref code; never self, never changed later;
 *   - a commission is created only from a payment the server confirmed (wallet purchase, approved
 *     manual receipt, verified gateway webhook), once per payment (sourceKey is unique);
 *   - commissions start PENDING; an authorised administrator approves (or reverses) them;
 *     only APPROVED commissions move to the wallet (rows from before this release, with no
 *     sourceKey, stay claimable as they were);
 *   - the percentage is a platform setting; 0 turns new commissions off. Amounts are stored in USD.
 */
export const COMMISSION_SETTING = 'referralCommissionPercent';
export const DEFAULT_COMMISSION_PERCENT = 10;
export const MAX_COMMISSION_PERCENT = 50;

const CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
export const isReferralCode = (value: unknown): value is string => typeof value === 'string' && CODE_PATTERN.test(value);

export async function commissionPercent(db: Db): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: COMMISSION_SETTING } });
  const value = row ? Number(row.value) : DEFAULT_COMMISSION_PERCENT;
  return Number.isFinite(value) && value >= 0 && value <= MAX_COMMISSION_PERCENT ? value : 0;
}

/** The referrer for a new account, or null. The code owner must exist, be unbanned and not be the new user. */
export async function resolveReferrer(db: Db, code: unknown, newUserEmail: string): Promise<string | null> {
  if (!isReferralCode(code)) return null;
  const referrer = await db.user.findUnique({ where: { affiliateCode: code }, select: { id: true, email: true, isBanned: true } });
  if (!referrer || referrer.isBanned || referrer.email.toLowerCase() === newUserEmail.toLowerCase()) return null;
  return referrer.id;
}

async function usdAmount(db: Db, amount: number, currency: string): Promise<number | null> {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (currency === 'USD') return amount;
  if (currency !== 'SYP') return null;
  const setting = await db.setting.findUnique({ where: { key: 'exchangeRate' } });
  const rate = setting ? Number(setting.value) : NaN;
  // Without a configured rate there is no honest USD value: no commission rather than a guess.
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return amount / rate;
}

export interface CommissionSource {
  /** Unique per business event, e.g. `payment:<id>` or `bundle:<id>`. */
  sourceKey: string;
  buyerId: string;
  amount: number;
  currency: string;
  courseId?: string | null;
  bundleId?: string | null;
}

/**
 * Record the referrer's commission for a confirmed payment, inside the payment's transaction.
 * Returns the created commission or null (no referrer, programme off, or already recorded).
 */
export async function recordReferralCommission(db: Db, source: CommissionSource) {
  const buyer = await db.user.findUnique({ where: { id: source.buyerId }, select: { referredById: true } });
  if (!buyer?.referredById || buyer.referredById === source.buyerId) return null;
  const referrer = await db.user.findUnique({ where: { id: buyer.referredById }, select: { id: true, isBanned: true } });
  if (!referrer || referrer.isBanned) return null;
  const percent = await commissionPercent(db);
  if (percent <= 0) return null;
  const base = await usdAmount(db, source.amount, source.currency);
  if (base === null) return null;
  const amount = Math.round(base * percent) / 100;
  if (amount <= 0) return null;
  const created = await db.affiliateEarning.createMany({
    data: [{
      ownerId: referrer.id, buyerId: source.buyerId, courseId: source.courseId ?? null, bundleId: source.bundleId ?? null,
      amount, status: 'PENDING', sourceKey: source.sourceKey, ratePercent: percent, baseAmount: source.amount, baseCurrency: source.currency,
    }],
    skipDuplicates: true,
  });
  return created.count === 1 ? { amount, percent } : null;
}

/** Commissions that can move to the wallet now. */
export const CLAIMABLE_WHERE = {
  OR: [{ status: 'APPROVED' }, { status: 'PENDING', sourceKey: null }],
} as const satisfies Prisma.AffiliateEarningWhereInput;
