import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PaymentFactory } from '@/lib/payments/PaymentFactory';

export async function POST(req: Request, props: { params: Promise<{ provider: string }> }) {
  const params = await props.params;
  const providerName = params.provider.toUpperCase();

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    
    // For Stripe, they send a webhook with a type.
    // In a real app, you must verify the Stripe signature here using stripe.webhooks.constructEvent.
    let transactionId = '';

    if (providerName === 'STRIPE') {
      const event = body;
      if (event.type === 'checkout.session.completed') {
        transactionId = event.data.object.id;
      } else {
        return NextResponse.json({ received: true }); // Ignore other events
      }
    } else if (providerName === 'PAYPAL') {
      transactionId = body.resource?.id;
    } else if (providerName === 'TABBY') {
      transactionId = body.id;
    } else if (providerName === 'TAMARA') {
      transactionId = body.order_id;
    }

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
    }

    // Use the factory to get the gateway adapter
    const gateway = PaymentFactory.getProvider(providerName);
    const isValid = await gateway.verifyPayment(transactionId);

    if (isValid) {
      // Find the pending payment record in DB
      const payment = await prisma.payment.findFirst({
        where: { 
          transactionId, 
          status: 'PENDING' 
        }
      });

      if (payment) {
        // Mark payment as approved
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: 'APPROVED',
            providerResponse: rawBody
          }
        });

        // Automatically enroll the user in the course
        await prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: payment.userId,
              courseId: payment.courseId,
            }
          },
          update: {},
          create: {
            userId: payment.userId,
            courseId: payment.courseId,
            progress: 0
          }
        });

        return NextResponse.json({ success: true, message: 'Payment verified and course enrolled' }, { status: 200 });
      } else {
        return NextResponse.json({ error: 'Payment record not found or already processed' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Invalid payment signature/status' }, { status: 400 });

  } catch (error: any) {
    console.error(`Webhook Error [${providerName}]:`, error.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
