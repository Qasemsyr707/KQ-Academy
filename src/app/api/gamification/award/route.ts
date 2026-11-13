import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { paymentBody, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';
import { claimDailyLogin } from '@/lib/reward-events';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req, ['STUDENT']);
    const body = paymentBody(await req.json());
    // The only browser-triggered reward is authenticated daily presence.
    // Amount, identity, day and idempotency key are exclusively server-owned.
    if (body.action !== 'DAILY_LOGIN' || Object.keys(body).some(key => key !== 'action')) {
      throw new CheckoutError(400, 'طلب المكافأة غير صالح');
    }
    return NextResponse.json(await claimDailyLogin(user.id), { headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
