import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

const AFFILIATE_COMMISSION_RATE = 0.10; // 10% commission

// GET /api/affiliate/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        affiliateCode: true,
        walletUSD: true,
        referrals: { select: { id: true, name: true, createdAt: true } },
        affiliateEarnings: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    const totalEarned = user.affiliateEarnings.reduce((sum, e) => sum + e.amount, 0);
    const pendingEarnings = user.affiliateEarnings
      .filter(e => e.status === 'PENDING')
      .reduce((sum, e) => sum + e.amount, 0);
    const paidEarnings = user.affiliateEarnings
      .filter(e => e.status === 'PAID')
      .reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      affiliateCode: user.affiliateCode,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${user.affiliateCode}`,
      commissionRate: AFFILIATE_COMMISSION_RATE,
      totalReferrals: user.referrals.length,
      referrals: user.referrals,
      totalEarned,
      pendingEarnings,
      paidEarnings,
      earnings: user.affiliateEarnings
    });
  } catch (error) {
    console.error('Affiliate Stats Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
