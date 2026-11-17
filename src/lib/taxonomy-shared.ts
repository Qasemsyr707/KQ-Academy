/**
 * Course taxonomy rules shared by the server and the course forms (no database
 * access here). The categories themselves are data, managed by administrators.
 */
import { normalizeText } from '@/lib/search-normalize';

/** The main category whose subtree holds school-curriculum courses. */
export const CURRICULUM_ROOT_SLUG = 'school-education';

/** How a course is taught, independent of its subject (category). */
export const TRAINING_TYPES = [
  { value: 'PRACTICAL', label: 'عملي' },
  { value: 'THEORETICAL', label: 'نظري' },
  { value: 'PROFESSIONAL', label: 'مهني' },
  { value: 'ACADEMIC', label: 'أكاديمي' },
  { value: 'TECHNICAL', label: 'تقني' },
  { value: 'MIXED', label: 'مختلط' },
] as const;

export type TrainingType = typeof TRAINING_TYPES[number]['value'];

export const TAG_LIMITS = { max: 10, minLength: 2, maxLength: 30 } as const;
export const CATEGORY_LIMITS = { nameMin: 2, nameMax: 80, aliasMax: 30, aliasLength: 40 } as const;

/** One category as the pickers receive it (public data only). */
export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  parentId: string | null;
  aliases: string[];
}

export function isTrainingType(value: unknown): value is TrainingType {
  return TRAINING_TYPES.some(type => type.value === value);
}

export const trainingTypeLabel = (value: unknown): string | null =>
  TRAINING_TYPES.find(type => type.value === value)?.label ?? null;

/** Collapse whitespace and drop control characters; stored text keeps its spelling. */
export function cleanLabel(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
  return text && text.length <= maxLength ? text : null;
}

/**
 * Tags as typed by an instructor: trimmed, de-duplicated by their normalised
 * form (so "ذكاء" and "ذكاء " or a hamza variant count once). Returns null when
 * the input is not a list of valid tags.
 */
export function sanitizeTags(input: unknown): string[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > TAG_LIMITS.max) return null;
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input) {
    const tag = cleanLabel(raw, TAG_LIMITS.maxLength);
    if (!tag || tag.length < TAG_LIMITS.minLength) return null;
    const key = normalizeText(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

/** Categories for a form: mains in order, each followed by its own subcategories. */
export function categoryTree<T extends { id: string; parentId: string | null }>(categories: T[]): { main: T; children: T[] }[] {
  const mains = categories.filter(category => !category.parentId);
  return mains.map(main => ({ main, children: categories.filter(category => category.parentId === main.id) }));
}

/** Text a picker search box matches against: names (both languages) and aliases. */
export function categoryMatches(category: Pick<CategoryOption, 'name' | 'nameEn' | 'aliases'>, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return [category.name, category.nameEn ?? '', ...category.aliases].some(text => normalizeText(text).includes(q));
}
