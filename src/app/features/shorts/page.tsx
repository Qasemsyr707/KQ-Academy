import { prisma } from '@/lib/db';
import ShortsClient from './ShortsClient';
import { connection } from 'next/server';
import { unstable_cache } from 'next/cache';

const getPublicShorts = unstable_cache(() => prisma.short.findMany({
    include: {
      user: { select: { name: true, image: true } },
      course: { select: { title: true, id: true } },
      _count: {
        select: { comments: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  }), ['public-shorts-v1'], { revalidate: 300 });

export default async function ShortsPage() {
  await connection();
  const shorts = await getPublicShorts();

  return <ShortsClient initialShorts={shorts} />;
}
