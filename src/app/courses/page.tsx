import CoursesClient from './CoursesClient';
import { Suspense } from 'react';
import { CatalogLoading } from '@/components/ui/Skeletons';
import { searchCourses, type SearchResult } from '@/lib/course-search';
import { curriculumHidden } from '@/lib/catalogue-visibility';

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.slice(0, 200) || undefined;

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;

  // The server renders the results for the filters in the URL, so a shared or
  // reloaded search link shows the right courses immediately.
  let result: SearchResult = { courses: [], total: 0, page: 1, pageSize: 12, hasMore: false, facets: { categories: [], instructors: [] } };
  let featured: SearchResult['courses'] = [];
  try {
    result = await searchCourses({
      q: first(params.q), category: first(params.category), type: first(params.type), price: first(params.price),
      rating: first(params.rating), instructor: first(params.instructor), sort: first(params.sort),
    });
    featured = (await searchCourses({ pageSize: 48 })).courses.filter(course => course.isFeatured);
  } catch (error) {
    // If the database is unavailable, show an empty catalogue instead of a 500.
    console.error('[CoursesPage] DB error:', error);
  }

  return (
    <Suspense fallback={<CatalogLoading />}>
      <CoursesClient
        initialCourses={result.courses}
        initialTotal={result.total}
        initialHasMore={result.hasMore}
        featuredCourses={featured}
        categories={result.facets.categories.map(category => category.value)}
        instructors={result.facets.instructors}
        showTypeFilter={!curriculumHidden()}
      />
    </Suspense>
  );
}
