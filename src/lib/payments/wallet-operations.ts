import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { RequestUserError } from '@/lib/request-user';
import { CheckoutError } from './checkout-context';

export const WALLET_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

export function positiveAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new CheckoutError(400, 'قيمة العملية غير صالحة');
  }
  return value;
}

export function paymentBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CheckoutError(400, 'بيانات العملية غير صالحة');
  return value as Record<string, unknown>;
}

export function paymentId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && value.trim() === value;
}

/** The balance predicate and decrement are one database operation inside the transaction. */
export async function debitWallet(tx: Prisma.TransactionClient, userId: string, currency: 'USD' | 'SYP', amount: number) {
  positiveAmount(amount);
  const field = currency === 'USD' ? 'walletUSD' : 'walletSYP';
  const debit = await tx.user.updateMany({ where: { id: userId, [field]: { gte: amount } }, data: { [field]: { decrement: amount } } });
  return debit.count === 1;
}

export function walletError(error: unknown) {
  const known = error instanceof RequestUserError || error instanceof CheckoutError;
  return NextResponse.json({ error: known ? error.message : error instanceof SyntaxError ? 'بيانات العملية غير صالحة' : 'تعذّر إتمام العملية، يرجى المحاولة مجدداً' }, {
    status: known ? error.status : error instanceof SyntaxError ? 400 : 500, headers: WALLET_HEADERS,
  });
}
