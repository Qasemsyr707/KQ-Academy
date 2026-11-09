import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { CheckoutError } from './checkout-context';

export async function withPaymentTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      const conflict = error && typeof error === 'object' && 'code' in error && error.code === 'P2034';
      if (!conflict) throw error;
      if (attempt === 2) throw new CheckoutError(409, 'العملية قيد المعالجة، يرجى إعادة الطلب نفسه لاحقاً');
    }
  }
  throw new CheckoutError(409, 'تعذّر إتمام العملية المتزامنة');
}
