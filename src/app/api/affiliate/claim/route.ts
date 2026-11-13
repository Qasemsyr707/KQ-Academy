import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { claimAffiliateEarnings } from '@/lib/payments/affiliate-claim';
import { walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

// POST /api/affiliate/claim — Transfer pending affiliate earnings to wallet
export async function POST(req: Request) {
  try {
    let identityRequest = req;
    if (!req.headers.has('authorization')) {
      // The existing browser sends a bodyless POST. Require an explicit matching
      // Origin before using the shared helper only for cookie identity resolution.
      const configuredUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || req.url;
      if (req.headers.get('origin') !== new URL(configuredUrl).origin) {
        throw new RequestUserError(403, 'مصدر الطلب غير مصرح به');
      }
      identityRequest = new Request(req.url, { method: 'GET', headers: req.headers });
    }
    const user = await requireRequestUser(identityRequest);
    const totalAmount = await claimAffiliateEarnings(user.id);

    return NextResponse.json({
      success: true,
      message: `تم تحويل $${totalAmount.toFixed(2)} إلى محفظتك بنجاح!`,
      amount: totalAmount
    }, { headers: WALLET_HEADERS });
  } catch (error) {
    return walletError(error);
  }
}
