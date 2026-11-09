import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { connection } from 'next/server';
import { unstable_cache } from 'next/cache';

const getPublishedCourses = unstable_cache(() => prisma.course.findMany({
  where: { status: 'PUBLISHED' },
  select: { id: true, updatedAt: true },
}), ['public-sitemap-courses-v1'], { revalidate: 300 });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const baseUrl = 'https://kqacademy.com';

  // Get dynamic courses
  let courses: Awaited<ReturnType<typeof getPublishedCourses>> = [];
  try {
    courses = await getPublishedCourses();
  } catch {
    console.error('Failed to fetch published courses for sitemap');
  }

  const courseUrls = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.id}`,
    lastModified: course.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...courseUrls,
  ];
}
