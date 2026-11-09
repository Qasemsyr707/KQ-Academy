import { handlePaymentWebhook } from '@/lib/payments/webhook';

export async function POST(req: Request, props: { params: Promise<{ provider: string }> }) {
  const { provider } = await props.params;
  return handlePaymentWebhook(req, provider.toUpperCase());
}
