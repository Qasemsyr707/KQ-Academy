import { NextResponse } from 'next/server';
import { searchCourses } from '@/lib/course-search';

/** Public catalogue search: published, publicly offered courses only. */
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const value = (key: string) => (p.get(key) || '').slice(0, 200) || undefined;
    const result = await searchCourses({
      q: value('q'), category: value('category'), type: value('type'), price: value('price'),
      rating: value('rating'), instructor: value('instructor'), sort: value('sort'),
      page: Number.parseInt(p.get('page') || '1', 10) || 1,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء البحث' }, { status: 500 });
  }
}
