import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { curriculumHidden, publicCourseWhere } from '@/lib/catalogue-visibility';

/**
 * Catalogue search. The public catalogue is small (tens to a few thousand
 * courses), so it is loaded once, cached briefly and ranked in memory. That
 * allows what SQL `contains` cannot do: Arabic normalisation, spacing
 * variants, small typos, cross-language keywords and relevance ranking,
 * without extra services or database extensions. Past roughly 5,000 courses
 * this should move to PostgreSQL full-text search (pg_trgm).
 */

export interface SearchCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  price: number;
  priceSYP: number;
  rating: number;
  thumbnail: string | null;
  isFeatured: boolean;
  createdAt: string;
  instructor: { name: string | null; image: string | null };
  _count: { enrollments: number; reviews: number };
}

export interface SearchParams {
  q?: string;
  category?: string;
  /** SKILL | CURRICULUM; ignored while the curriculum is hidden. */
  type?: string;
  price?: string;
  rating?: string;
  instructor?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

const ALL = 'الكل';
export const PAGE_SIZE = 12;

/** Fold the spelling variants Arabic readers treat as the same word. */
export function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Keywords visitors type in the other language (and common short forms). */
const SYNONYMS: Record<string, string[]> = Object.fromEntries(([
  ['programming', 'coding', 'code', 'برمجه', 'البرمجه'],
  ['design', 'تصميم', 'التصميم'],
  ['marketing', 'تسويق', 'التسويق'],
  ['ai', 'ذكاء اصطناعي', 'الذكاء الاصطناعي', 'artificial intelligence'],
  ['montage', 'editing', 'video editing', 'مونتاج', 'المونتاج'],
  ['english', 'انجليزي', 'انكليزي', 'الانجليزيه', 'اللغه الانجليزيه'],
  ['content', 'محتوي', 'صناعه المحتوي'],
  ['engineering', 'هندسه', 'الهندسه'],
  ['photoshop', 'فوتوشوب'],
  ['autocad', 'اوتوكاد'],
  ['revit', 'ريفيت'],
  ['ads', 'advertising', 'اعلانات', 'الاعلانات'],
  ['cv', 'resume', 'سيره ذاتيه', 'السيره الذاتيه'],
] as string[][]).flatMap(group => group.map(word => [word, group.filter(other => other !== word)])));

function editDistanceWithin(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, current[j]);
    }
    if (best > max) return false;
    previous = current;
  }
  return previous[b.length] <= max;
}

interface Indexed {
  course: SearchCourse;
  title: string; titleWords: string[]; titleJoined: string;
  category: string; instructor: string; description: string;
}

function index(course: SearchCourse): Indexed {
  const title = normalizeText(course.title);
  return {
    course, title, titleWords: title.split(' ').filter(Boolean), titleJoined: title.replace(/ /g, ''),
    category: normalizeText(course.category), instructor: normalizeText(course.instructor?.name ?? ''),
    description: normalizeText(course.description ?? '').slice(0, 2000),
  };
}

/** Score one query term against a course; 0 = no match. */
function termScore(term: string, item: Indexed): number {
  if (item.titleWords.includes(term)) return 60;
  if (item.titleWords.some(word => word.startsWith(term))) return 48;
  if (item.title.includes(term)) return 40;
  if (item.category === term || item.category.includes(term)) return 30;
  if (item.instructor.includes(term)) return 26;
  if (item.description.includes(term)) return 10;
  // Small typos: one edit for 4+ letters, two for 8+ (title, category, instructor words).
  const tolerance = term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0;
  if (tolerance > 0) {
    const words = [...item.titleWords, ...item.category.split(' '), ...item.instructor.split(' ')];
    if (words.some(word => word.length >= 3 && editDistanceWithin(term, word, tolerance))) return 14;
  }
  return 0;
}

function relevance(query: string, item: Indexed): number {
  if (!query) return 1;
  let score = 0;
  if (item.title === query) score += 120;
  else if (item.title.includes(query)) score += 70;
  // "فوتو شوب" / "فوتوشوب", "auto cad" / "autocad"
  else if (query.includes(' ') && item.titleJoined.includes(query.replace(/ /g, ''))) score += 55;
  else if (!query.includes(' ') && item.titleWords.length > 1 && item.titleJoined.includes(query) ) score += 45;

  // Whole-query synonyms ("ai" -> "ذكاء اصطناعي").
  for (const alternative of SYNONYMS[query] ?? []) {
    if (item.title.includes(alternative) || item.category.includes(alternative)) { score += 50; break; }
  }
  const terms = query.split(' ').filter(Boolean);
  let matched = 0;
  for (const term of terms) {
    let best = termScore(term, item);
    for (const alternative of SYNONYMS[term] ?? []) {
      if (item.title.includes(alternative) || item.category.includes(alternative)) best = Math.max(best, 36);
    }
    if (best > 0) matched++;
    score += best;
  }
  // Every term must match somewhere, unless the whole phrase already matched.
  if (matched < terms.length && score < 45) return 0;
  if (matched < terms.length) score *= matched / terms.length;
  return score;
}

const loadCatalogue = (hidden: boolean) => unstable_cache(async (): Promise<SearchCourse[]> => {
  const rows = await prisma.course.findMany({
    where: publicCourseWhere(),
    select: {
      id: true, title: true, description: true, category: true, type: true, price: true, priceSYP: true,
      rating: true, thumbnail: true, isFeatured: true, createdAt: true,
      instructor: { select: { name: true, image: true } },
      _count: { select: { enrollments: true, reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
  return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }));
}, [`public-course-search-v1-${hidden ? 'hidden' : 'all'}`], { revalidate: 60 })();

const effectivePrice = (course: SearchCourse) => (course.price > 0 ? course.price : course.priceSYP > 0 ? Number.MAX_SAFE_INTEGER / 2 + course.priceSYP : 0);

export interface SearchResult {
  courses: SearchCourse[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** Filter options that exist in the public catalogue right now. */
  facets: { categories: { value: string; label: string; count: number }[]; instructors: string[] };
}

export async function searchCourses(params: SearchParams): Promise<SearchResult> {
  const catalogue = await loadCatalogue(curriculumHidden());
  const query = normalizeText(params.q ?? '').slice(0, 120);
  const category = params.category && params.category !== ALL ? normalizeText(params.category) : '';
  const instructor = params.instructor && params.instructor !== ALL ? normalizeText(params.instructor) : '';
  const type = !curriculumHidden() && (params.type === 'SKILL' || params.type === 'CURRICULUM') ? params.type : '';
  const minRating = params.rating && params.rating !== ALL ? Number.parseFloat(params.rating) : NaN;

  // Categories that differ only in spelling ("ذكاء اصطناعي" / "ذكاء أصطناعي") are one filter.
  const categoryGroups = new Map<string, { value: string; label: string; count: number }>();
  for (const course of catalogue) {
    const key = normalizeText(course.category);
    if (!key) continue;
    const group = categoryGroups.get(key);
    if (group) group.count++; else categoryGroups.set(key, { value: course.category, label: course.category, count: 1 });
  }
  const instructors = [...new Set(catalogue.map(course => course.instructor?.name).filter((name): name is string => !!name))];

  const scored: { item: Indexed; score: number }[] = [];
  for (const course of catalogue) {
    const item = index(course);
    if (category && item.category !== category) continue;
    if (instructor && item.instructor !== instructor) continue;
    if (type && course.type !== type) continue;
    if (params.price === 'free' && !(course.price === 0 && course.priceSYP === 0)) continue;
    if (params.price === 'paid' && !(course.price > 0 || course.priceSYP > 0)) continue;
    if (Number.isFinite(minRating) && course.rating < minRating) continue;
    const score = relevance(query, item);
    if (score > 0) scored.push({ item, score });
  }

  const newest = (a: SearchCourse, b: SearchCourse) => b.createdAt.localeCompare(a.createdAt);
  const sort = params.sort && ['relevance', 'newest', 'rating', 'price_asc', 'price_desc'].includes(params.sort)
    ? params.sort : (query ? 'relevance' : 'newest');
  scored.sort((a, b) => {
    const x = a.item.course, y = b.item.course;
    if (sort === 'rating') return y.rating - x.rating || newest(x, y);
    if (sort === 'price_asc') return effectivePrice(x) - effectivePrice(y) || newest(x, y);
    if (sort === 'price_desc') return effectivePrice(y) - effectivePrice(x) || newest(x, y);
    if (sort === 'relevance' && query) return b.score - a.score || newest(x, y);
    return newest(x, y);
  });

  const pageSize = Math.min(48, Math.max(1, Math.trunc(params.pageSize ?? PAGE_SIZE)));
  const page = Math.max(1, Math.trunc(params.page ?? 1));
  const start = (page - 1) * pageSize;
  return {
    courses: scored.slice(start, start + pageSize).map(entry => entry.item.course),
    total: scored.length, page, pageSize, hasMore: start + pageSize < scored.length,
    facets: { categories: [...categoryGroups.values()].sort((a, b) => b.count - a.count), instructors },
  };
}

export interface Suggestion { type: 'course' | 'category'; label: string; href: string }

/** Instant suggestions while typing: best-matching courses, then categories. */
export async function suggestCourses(q: string): Promise<Suggestion[]> {
  const query = normalizeText(q).slice(0, 80);
  if (query.length < 2) return [];
  const result = await searchCourses({ q, pageSize: 5, sort: 'relevance' });
  const categories = result.facets.categories
    .filter(group => { const key = normalizeText(group.label); return key.includes(query) || (SYNONYMS[query] ?? []).some(word => key.includes(word)); })
    .slice(0, 2)
    .map(group => ({ type: 'category' as const, label: group.label, href: `/courses?category=${encodeURIComponent(group.value)}` }));
  return [
    ...result.courses.map(course => ({ type: 'course' as const, label: course.title, href: `/courses/${course.id}` })),
    ...categories,
  ];
}
