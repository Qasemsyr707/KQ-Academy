/**
 * Text folding shared by search, the taxonomy and the category pickers.
 * Pure functions only (no database, no Node APIs), so the browser can use them
 * too. Stored text is never changed: these values are computed for comparison.
 */

/** Fold the spelling variants Arabic readers treat as the same word. */
export function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .toLowerCase()
    // Tashkeel (U+064B-065F), superscript alef, Quranic marks, tatweel. The Arabic-Indic
    // digits (U+0660-0669) sit between these ranges and are converted below, not removed.
    .replace(/[ً-ٰٟۖ-ۭـ]/g, '')
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

// Definite article and the prepositions written attached to it: "التسويق",
// "والتسويق", "بالتسويق", "للتسويق". Longest first.
const ARTICLES = ['وال', 'بال', 'فال', 'كال', 'ال', 'لل'];

/** "التسويق" -> "تسويق". Short words are kept whole ("الم" stays "الم"). */
export function stripArticle(word: string): string {
  for (const article of ARTICLES) {
    if (word.startsWith(article) && word.length - article.length >= 2) return word.slice(article.length);
  }
  return word;
}

/** Normalised words, each with its article-free form when it differs. */
export function searchWords(value: unknown): string[] {
  const words = new Set<string>();
  for (const word of normalizeText(value).split(' ')) {
    if (!word) continue;
    words.add(word);
    words.add(stripArticle(word));
  }
  return [...words];
}

/** True when the Levenshtein distance between a and b is at most max. */
export function editDistanceWithin(a: string, b: string, max: number): boolean {
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

/** Typos tolerated for a query word: none below 4 letters, 1 from 4, 2 from 8. */
export function typoTolerance(term: string): number {
  return term.length >= 8 ? 2 : term.length >= 4 ? 1 : 0;
}

/** URL-safe slug from an English name; null when nothing usable remains. */
export function slugify(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    .replace(/-+$/g, '');
  return slug.length >= 2 ? slug : null;
}
