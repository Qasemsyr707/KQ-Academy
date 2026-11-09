import { handleCourseCheckout } from '@/lib/payments/checkout';

export async function POST(req: Request) {
  return handleCourseCheckout(req, 'mobile');
}
