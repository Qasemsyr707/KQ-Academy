import { revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { curriculumHidden, publicCourseWhere } from '@/lib/catalogue-visibility';
import { safeMediaUrl } from '@/lib/media-url';
import { editDistanceWithin, normalizeText, searchWords, stripArticle, typoTolerance } from '@/lib/search-normalize';

export { normalizeText } from '@/lib/search-normalize';

/**
 * Catalogue search and live suggestions.
 *
 * The public catalogue (published, publicly offered courses) and the course
 * taxonomy are loaded together, cached briefly and indexed once in memory; every
 * request then ranks against that shared index. That allows what SQL `contains`
 * cannot do without extensions: Arabic normalisation, word prefixes without the
 * article ("تسويق" -> "التسويق الرقمي"), synonyms that administrators maintain as
 * category aliases, small typos and relevance ranking. Everything returned comes
 * from those rows: nothing is invented. Past roughly 5,000 courses this should
 * move to PostgreSQL full-text search (pg_trgm).
 */

export interface SearchCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  categoryId: string | null;
  tags: string[];
  trainingType: string | null;
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

export interface SearchCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  aliases: string[];
  parentId: string | null;
  order: number;
  isActive: boolean;
}

export interface SearchParams {
  q?: string;
  /** A category slug (preferred) or a legacy category text. */
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
export const SUGGEST_LIMITS = { courses: 6, categories: 4, minLength: 1, maxLength: 80 } as const;
export const CATALOGUE_TAG = 'public-catalogue-search';
const SUGGEST_CACHE_SIZE = 500;

/** General cross-language keywords that are not categories (categories carry their own aliases). */
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

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

interface Node {
  category: SearchCategory;
  /** Normalised name, English name and aliases (whole phrases). */
  phrases: string[];
  /** Their words, with article-free forms. */
  words: string[];
  /** Words of the names only (Arabic and English): weigh more than alias words. */
  nameWords: string[];
  name: string;
  /** This node and its ancestors (a subcategory belongs to its main category). */
  lineage: string[];
  /** Usable for suggestions and pickers: active, and so is its parent. */
  visible: boolean;
}

interface Indexed {
  course: SearchCourse;
  title: string; titleWords: string[]; titleJoined: string;
  /** The course's category text, normalised (legacy filters). */
  category: string;
  /** Category node and its ancestors, when the course is linked or its text names one. */
  nodeIds: string[];
  taxonomyPhrases: string[]; taxonomyWords: string[];
  /** Category name words only; aliases are synonyms and rank below names. */
  taxonomyNameWords: string[];
  tagPhrases: string[]; tagWords: string[];
  instructor: string; instructorWords: string[];
  description: string;
}

interface SearchIndex {
  items: Indexed[];
  nodes: Map<string, Node>;
  bySlug: Map<string, Node>;
  /** Public courses per category, its subcategories included. */
  counts: Map<string, number>;
  /** Normalised category name/alias -> the single node it names. */
  phraseToNode: Map<string, Node>;
  /** Category texts of public courses outside the taxonomy (one group per spelling). */
  legacy: { node: Node; value: string; count: number }[];
  /** Recent suggestion results for this index (typing repeats the same prefixes). */
  suggestions: Map<string, Suggestion[]>;
}

function buildNodes(categories: SearchCategory[]): Map<string, Node> {
  const byId = new Map(categories.map(category => [category.id, category]));
  const nodes = new Map<string, Node>();
  for (const category of categories) {
    const texts = [category.name, category.nameEn ?? '', ...category.aliases];
    const lineage = [category.id];
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    if (parent) lineage.push(parent.id);
    nodes.set(category.id, {
      category,
      phrases: [...new Set(texts.map(normalizeText).filter(Boolean))],
      words: [...new Set(texts.flatMap(searchWords))],
      nameWords: [...new Set([category.name, category.nameEn ?? ''].flatMap(searchWords))],
      name: normalizeText(category.name),
      lineage,
      visible: category.isActive && (!category.parentId || !!parent?.isActive),
    });
  }
  return nodes;
}

/** Category names/aliases that name exactly one node (names win over aliases). */
function phraseIndex(nodes: Map<string, Node>): Map<string, Node> {
  const names = new Map<string, Node | null>();
  const aliases = new Map<string, Node | null>();
  for (const node of nodes.values()) {
    names.set(node.name, names.has(node.name) ? null : node);
    for (const phrase of node.phrases) {
      if (phrase !== node.name) aliases.set(phrase, aliases.has(phrase) && aliases.get(phrase) !== node ? null : node);
    }
  }
  const result = new Map<string, Node>();
  for (const [phrase, node] of aliases) if (node) result.set(phrase, node);
  for (const [phrase, node] of names) if (node) result.set(phrase, node);
  return result;
}

function buildIndex(catalogue: SearchCourse[], categories: SearchCategory[]): SearchIndex {
  const nodes = buildNodes(categories);
  const phraseToNode = phraseIndex(nodes);
  const bySlug = new Map([...nodes.values()].map(node => [node.category.slug, node]));
  const counts = new Map<string, number>();
  const items = catalogue.map(course => {
    const title = normalizeText(course.title);
    const category = normalizeText(course.category);
    // Linked courses use their category; unlinked ones whose text names exactly one
    // category are treated as in it (read-only: nothing is written).
    const node = (course.categoryId ? nodes.get(course.categoryId) : undefined) ?? phraseToNode.get(category);
    const lineage = node ? node.lineage.map(id => nodes.get(id)).filter((n): n is Node => !!n) : [];
    for (const n of lineage) counts.set(n.category.id, (counts.get(n.category.id) ?? 0) + 1);
    const tags = (course.tags ?? []).map(normalizeText).filter(Boolean);
    const instructor = normalizeText(course.instructor?.name ?? '');
    return {
      course, title,
      titleWords: searchWords(course.title),
      titleJoined: title.replace(/ /g, ''),
      category,
      nodeIds: lineage.map(n => n.category.id),
      taxonomyPhrases: [...new Set([category, ...lineage.flatMap(n => n.phrases)].filter(Boolean))],
      taxonomyWords: [...new Set([...searchWords(course.category), ...lineage.flatMap(n => n.words)])],
      taxonomyNameWords: [...new Set([...searchWords(course.category), ...lineage.flatMap(n => n.nameWords)])],
      tagPhrases: tags,
      tagWords: [...new Set((course.tags ?? []).flatMap(searchWords))],
      instructor, instructorWords: instructor.split(' ').filter(Boolean),
      description: normalizeText(course.description ?? '').slice(0, 2000),
    };
  });
  // Course category texts not linked to the taxonomy stay real, suggestible groups.
  const legacyGroups = new Map<string, { node: Node; value: string; count: number }>();
  for (const item of items) {
    if (item.nodeIds.length || !item.category) continue;
    const group = legacyGroups.get(item.category);
    if (group) { group.count++; continue; }
    const text = item.course.category;
    legacyGroups.set(item.category, {
      value: text, count: 1,
      node: {
        category: { id: `legacy:${item.category}`, slug: '', name: text, nameEn: null, aliases: [], parentId: null, order: Number.MAX_SAFE_INTEGER, isActive: true },
        phrases: [item.category], words: searchWords(text), nameWords: searchWords(text), name: item.category, lineage: [], visible: true,
      },
    });
  }
  return { items, nodes, bySlug, counts, phraseToNode, legacy: [...legacyGroups.values()], suggestions: new Map() };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const startsWithAny = (words: string[], term: string) => words.some(word => word.startsWith(term));
const typoMatch = (words: string[], term: string) => {
  const tolerance = typoTolerance(term);
  return tolerance > 0 && words.some(word => word.length >= 3 && editDistanceWithin(term, word, tolerance));
};

/**
 * Score one query term against a course; 0 = no match. Terms shorter than three
 * letters match the start of words only ("بر" finds "البرمجة", not "خبرة").
 */
function termScore(term: string, item: Indexed): number {
  const bare = stripArticle(term);
  const short = term.length < 3;
  if (item.titleWords.includes(term) || item.titleWords.includes(bare)) return 60;
  if (startsWithAny(item.titleWords, term) || startsWithAny(item.titleWords, bare)) return 48;
  if (!short && item.title.includes(term)) return 40;
  if (item.taxonomyPhrases.includes(term) || item.taxonomyWords.includes(term) || item.taxonomyWords.includes(bare)) return 34;
  if (startsWithAny(item.taxonomyNameWords, term) || startsWithAny(item.taxonomyNameWords, bare)) return 30;
  if (item.tagWords.includes(term) || item.tagWords.includes(bare)) return 28;
  if (startsWithAny(item.tagWords, term)) return 24;
  // The start of an alias ("بر" -> "بريمير"): a weaker hint than names and tags.
  if (startsWithAny(item.taxonomyWords, term) || startsWithAny(item.taxonomyWords, bare)) return 20;
  if (startsWithAny(item.instructorWords, term)) return 26;
  if (short) return 0;
  if (item.instructor.includes(term)) return 26;
  if (item.description.includes(term)) return 10;
  // Small typos: one edit for 4+ letters, two for 8+.
  if (typoMatch(item.titleWords, term) || typoMatch(item.taxonomyWords, term)
    || typoMatch(item.tagWords, term) || typoMatch(item.instructorWords, term)) return 14;
  return 0;
}

const mentions = (item: Indexed, phrase: string) =>
  item.title.includes(phrase) || item.taxonomyPhrases.some(text => text.includes(phrase)) || item.tagPhrases.includes(phrase);

function relevance(query: string, item: Indexed): number {
  if (!query) return 1;
  let score = 0;
  if (item.title === query) score += 120;
  else if (query.length >= 3 && item.title.includes(query)) score += 70;
  // "فوتو شوب" / "فوتوشوب", "auto cad" / "autocad"
  else if (query.includes(' ') && item.titleJoined.includes(query.replace(/ /g, ''))) score += 55;
  else if (query.length >= 3 && !query.includes(' ') && item.titleWords.length > 1 && item.titleJoined.includes(query)) score += 45;

  // The whole query names the course's category or one of its aliases ("ai", "تسويق").
  if (query.length >= 2 && item.taxonomyPhrases.includes(query)) score += 50;
  else if (query.length >= 2 && item.tagPhrases.includes(query)) score += 40;
  else for (const alternative of SYNONYMS[query] ?? []) {
    if (mentions(item, alternative)) { score += 50; break; }
  }

  const terms = query.split(' ').filter(Boolean);
  let matched = 0;
  for (const term of terms) {
    let best = termScore(term, item);
    for (const alternative of SYNONYMS[term] ?? []) {
      if (mentions(item, alternative)) best = Math.max(best, 36);
    }
    if (best > 0) matched++;
    score += best;
  }
  // Every term must match somewhere, unless the whole phrase already matched.
  if (matched < terms.length && score < 45) return 0;
  if (matched < terms.length) score *= matched / terms.length;
  return score;
}

/**
 * Score a category for a suggestion query; 0 = no match. One or two letters say
 * little about intent, so every prefix match scores the same and the categories
 * with more courses come first ("ت" -> "التسويق" with 5 courses before a category
 * whose name merely starts with "ت").
 */
function categoryScore(query: string, node: Node): number {
  const bare = stripArticle(query);
  if (node.phrases.includes(query) || node.phrases.includes(bare)) return 100;
  if (query.length < 3) {
    return startsWithAny(node.nameWords, query) || startsWithAny(node.nameWords, bare) ? 70
      : startsWithAny(node.words, query) || startsWithAny(node.words, bare) ? 40 : 0;
  }
  if (node.name.startsWith(query) || node.name.startsWith(bare)) return 85;
  const terms = query.split(' ').filter(Boolean);
  const prefixOf = (term: string) => startsWithAny(node.words, term) || startsWithAny(node.words, stripArticle(term));
  if (terms.every(prefixOf)) return terms.length > 1 ? 75 : node.phrases.some(p => p.startsWith(query)) ? 72 : 65;
  if (query.length >= 3 && node.phrases.some(phrase => phrase.includes(query))) return 50;
  if (terms.every(term => prefixOf(term) || typoMatch(node.words, term))) return 30;
  return 0;
}

// ---------------------------------------------------------------------------
// Loading (cached) and the shared in-memory index
// ---------------------------------------------------------------------------

const loadCatalogue = (hidden: boolean) => unstable_cache(async (): Promise<SearchCourse[]> => {
  const rows = await prisma.course.findMany({
    where: publicCourseWhere(),
    select: {
      id: true, title: true, description: true, category: true, categoryId: true, tags: true, trainingType: true,
      type: true, price: true, priceSYP: true, rating: true, thumbnail: true, isFeatured: true, createdAt: true,
      instructor: { select: { name: true, image: true } },
      _count: { select: { enrollments: true, reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
  return rows.map(row => ({ ...row, tags: row.tags ?? [], createdAt: row.createdAt.toISOString() }));
}, [`public-course-search-v2-${hidden ? 'hidden' : 'all'}`], { revalidate: 60, tags: [CATALOGUE_TAG] })();

const loadCategories = unstable_cache(async (): Promise<SearchCategory[]> => prisma.category.findMany({
  select: { id: true, slug: true, name: true, nameEn: true, aliases: true, parentId: true, order: true, isActive: true },
  orderBy: [{ order: 'asc' }, { name: 'asc' }],
  take: 2000,
}).then(rows => rows.map(row => ({ ...row, aliases: row.aliases ?? [] }))), ['course-taxonomy-v1'], { revalidate: 60, tags: [CATALOGUE_TAG] });

const INDEX_TTL_MS = 30_000;
const indexes = new Map<string, { at: number; index: Promise<SearchIndex> }>();

/**
 * One index per process and curriculum setting, rebuilt at most every 30 s.
 * Concurrent requests share the same build (one database read, one indexing pass).
 */
function getIndex(): Promise<SearchIndex> {
  const hidden = curriculumHidden();
  const key = hidden ? 'hidden' : 'all';
  const cached = indexes.get(key);
  if (cached && Date.now() - cached.at < INDEX_TTL_MS) return cached.index;
  const index = Promise.all([loadCatalogue(hidden), loadCategories()]).then(([catalogue, categories]) => buildIndex(catalogue, categories));
  indexes.set(key, { at: Date.now(), index });
  // A failed load must not be served from memory.
  index.catch(() => { if (indexes.get(key)?.index === index) indexes.delete(key); });
  return index;
}

/** After a category or course classification changes: the next search reloads. */
export function invalidateCatalogueSearch(): void {
  indexes.clear();
  try { revalidateTag(CATALOGUE_TAG, { expire: 0 }); } catch { /* outside a request (scripts, tests) */ }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const effectivePrice = (course: SearchCourse) => (course.price > 0 ? course.price : course.priceSYP > 0 ? Number.MAX_SAFE_INTEGER / 2 + course.priceSYP : 0);

export interface CategoryFacet { value: string; label: string; count: number; parent?: string | null }

export interface SearchResult {
  courses: SearchCourse[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** Filter options that exist in the public catalogue right now. */
  facets: { categories: CategoryFacet[]; instructors: string[] };
}

/** Resolve a category filter: a slug, or a legacy text that names one category. */
function categoryFilter(index: SearchIndex, value: string | undefined): { node?: Node; text?: string } | null {
  if (!value || value === ALL) return null;
  const node = index.bySlug.get(value) ?? index.phraseToNode.get(normalizeText(value));
  return node ? { node } : { text: normalizeText(value) };
}

/**
 * Categories with at least one public course (mains, then their subcategories),
 * followed by legacy category texts not linked to the taxonomy.
 */
function categoryFacets(index: SearchIndex): CategoryFacet[] {
  const visible = [...index.nodes.values()].filter(node => node.visible && (index.counts.get(node.category.id) ?? 0) > 0);
  const byOrder = (a: Node, b: Node) => a.category.order - b.category.order || a.category.name.localeCompare(b.category.name, 'ar');
  const facets: CategoryFacet[] = [];
  for (const main of visible.filter(node => !node.category.parentId).sort(byOrder)) {
    facets.push({ value: main.category.slug, label: main.category.name, count: index.counts.get(main.category.id) ?? 0, parent: null });
    for (const sub of visible.filter(node => node.category.parentId === main.category.id).sort(byOrder)) {
      facets.push({ value: sub.category.slug, label: sub.category.name, count: index.counts.get(sub.category.id) ?? 0, parent: main.category.name });
    }
  }
  // Courses outside the taxonomy keep a filter by their text; spelling variants are one group.
  const legacy = index.legacy.map(group => ({ value: group.value, label: group.value, count: group.count, parent: null }));
  return [...facets, ...legacy.sort((a, b) => b.count - a.count)];
}

export async function searchCourses(params: SearchParams): Promise<SearchResult> {
  const index = await getIndex();
  const query = normalizeText(params.q ?? '').slice(0, 120);
  const filter = categoryFilter(index, params.category);
  const instructor = params.instructor && params.instructor !== ALL ? normalizeText(params.instructor) : '';
  const type = !curriculumHidden() && (params.type === 'SKILL' || params.type === 'CURRICULUM') ? params.type : '';
  const minRating = params.rating && params.rating !== ALL ? Number.parseFloat(params.rating) : NaN;

  const scored: { item: Indexed; score: number }[] = [];
  for (const item of index.items) {
    const course = item.course;
    if (filter?.node && !item.nodeIds.includes(filter.node.category.id)) continue;
    if (filter?.text !== undefined && item.category !== filter.text) continue;
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
  const instructors = [...new Set(index.items.map(item => item.course.instructor?.name).filter((name): name is string => !!name))];
  return {
    courses: scored.slice(start, start + pageSize).map(entry => entry.item.course),
    total: scored.length, page, pageSize, hasMore: start + pageSize < scored.length,
    facets: { categories: categoryFacets(index), instructors },
  };
}

export interface CourseSuggestion {
  type: 'course';
  id: string;
  label: string;
  href: string;
  /** A same-site or https image, or null (the UI shows a placeholder). */
  thumbnail: string | null;
  category: string;
  price: number;
  priceSYP: number;
}

export interface CategorySuggestion {
  type: 'category';
  id: string;
  slug: string;
  label: string;
  href: string;
  /** Main category name for a subcategory. */
  parent: string | null;
  /** Public courses in it, subcategories included (always at least 1). */
  count: number;
}

export type Suggestion = CourseSuggestion | CategorySuggestion;

/**
 * Thumbnails are stored as URLs, CSS gradients or (older uploads) data URLs.
 * Suggestions must stay small, so data URLs are served by their own cached endpoint.
 */
export function suggestionThumbnail(course: Pick<SearchCourse, 'id' | 'thumbnail'>): string | null {
  const value = course.thumbnail;
  if (!value) return null;
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(value)) return `/api/courses/${encodeURIComponent(course.id)}/thumbnail`;
  return safeMediaUrl(value);
}

/**
 * Instant suggestions while typing: the best-matching real courses, then the
 * categories (main or sub) that contain at least one public course. One letter
 * is enough; it matches the start of words only.
 */
export async function suggestCourses(q: string): Promise<Suggestion[]> {
  const query = normalizeText(typeof q === 'string' ? q.slice(0, SUGGEST_LIMITS.maxLength) : '');
  if (query.length < SUGGEST_LIMITS.minLength) return [];
  const index = await getIndex();
  // Results depend only on the query and this index, which is rebuilt when data changes.
  const cached = index.suggestions.get(query);
  if (cached) return cached;

  const courses = index.items
    .map(item => ({ item, score: relevance(query, item) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score
      || Number(b.item.course.isFeatured) - Number(a.item.course.isFeatured)
      || b.item.course._count.enrollments - a.item.course._count.enrollments
      || b.item.course.createdAt.localeCompare(a.item.course.createdAt))
    .slice(0, SUGGEST_LIMITS.courses)
    .map(({ item }): CourseSuggestion => {
      const node = item.nodeIds[0] ? index.nodes.get(item.nodeIds[0]) : undefined;
      return {
        type: 'course', id: item.course.id, label: item.course.title, href: `/courses/${item.course.id}`,
        thumbnail: suggestionThumbnail(item.course),
        category: node?.visible ? node.category.name : item.course.category,
        price: item.course.price, priceSYP: item.course.priceSYP,
      };
    });

  // Only categories that contain public courses right now; empty ones never appear.
  const candidates = [
    ...[...index.nodes.values()]
      .filter(node => node.visible && (index.counts.get(node.category.id) ?? 0) > 0)
      .map(node => ({ node, value: node.category.slug, count: index.counts.get(node.category.id) ?? 0 })),
    ...index.legacy,
  ];
  const categories = candidates
    .map(entry => ({ ...entry, score: categoryScore(query, entry.node) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score
      // Main categories before subcategories on equal relevance.
      || Number(!!a.node.category.parentId) - Number(!!b.node.category.parentId)
      || b.count - a.count
      || a.node.category.order - b.node.category.order)
    .slice(0, SUGGEST_LIMITS.categories)
    .map(({ node, value, count }): CategorySuggestion => {
      const parent = node.category.parentId ? index.nodes.get(node.category.parentId) : undefined;
      return {
        type: 'category', id: node.category.id, slug: node.category.slug, label: node.category.name,
        href: `/courses?category=${encodeURIComponent(value)}`,
        parent: parent?.category.name ?? null, count,
      };
    });

  const result = [...courses, ...categories];
  if (index.suggestions.size >= SUGGEST_CACHE_SIZE) index.suggestions.delete(index.suggestions.keys().next().value!);
  index.suggestions.set(query, result);
  return result;
}
