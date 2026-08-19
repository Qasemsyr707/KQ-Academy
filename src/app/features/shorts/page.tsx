import { prisma } from '@/lib/db';
import ShortsClient from './ShortsClient';

export const dynamic = 'force-dynamic';

export default async function ShortsPage() {
  const shorts = await prisma.short.findMany({
    include: {
      user: { select: { name: true, image: true } },
      course: { select: { title: true, id: true } },
      _count: {
        select: { comments: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return <ShortsClient initialShorts={shorts} />;
}
