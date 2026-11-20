'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import CourseCover from '@/components/ui/CourseCover';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Search, SearchX, Tag, X } from 'lucide-react';
import { coursePriceLabel, formatNumber } from '@/lib/format';
import styles from './SearchCombobox.module.css';

/** Mirrors the /api/courses/suggest response (public catalogue data only). */
type Suggestion =
  | { type: 'course'; id: string; label: string; href: string; thumbnail: string | null; category: string; price: number; priceSYP: number }
  | { type: 'category'; id: string; slug: string; label: string; href: string; parent: string | null; count: number };

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Handle a chosen category here instead of navigating (the catalogue applies it
   * as a filter: a link to the same page would not reset the page's own state).
   */
  onCategorySelect?: (value: string) => void;
  /** Called just before a suggestion opens another page. */
  onNavigate?: () => void;
  /** Id of the text input (labels and tests). */
  inputId?: string;
  placeholder?: string;
  label?: string;
}

export const SUGGEST_DEBOUNCE_MS = 200;

/**
 * Catalogue search box with live suggestions (WAI-ARIA combobox + listbox).
 * - suggestions follow the text after a short debounce; older requests are
 *   aborted and a response is shown only for the exact text it was asked for;
 * - Arrow Up/Down move through the suggestions, Enter opens the highlighted one,
 *   Escape closes the list (a second Escape clears the text).
 */
export default function SearchCombobox({ value, onValueChange, onCategorySelect, onNavigate, inputId, placeholder = 'ابحث عن كورس، مدرب، أو مهارة...', label = 'ابحث عن كورس، مدرب، أو مهارة' }: Props) {
  const router = useRouter();
  const generatedId = useId().replace(/:/g, '');
  const id = inputId ?? `search-${generatedId}`;
  const listId = `${id}-listbox`;
  const statusId = `${id}-status`;
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  // Results are stored with the text they answer, so a late response for older text is never shown.
  const [result, setResult] = useState<{ term: string; items: Suggestion[]; failed?: boolean }>({ term: '', items: [] });
  // The highlighted option belongs to one result list; a new list starts with none.
  const [highlight, setHighlight] = useState<{ list: typeof result | null; index: number }>({ list: null, index: -1 });
  const active = highlight.list === result ? highlight.index : -1;
  const setActive = (index: number) => setHighlight({ list: result, index });

  const term = value.trim();

  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setResult({ term, items: Array.isArray(data.suggestions) ? data.suggestions : [] });
      } catch (error) {
        if ((error as Error)?.name !== 'AbortError') setResult({ term, items: [], failed: true });
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term]);

  const current = result.term === term;
  const items = useMemo(() => (current ? result.items : []), [current, result.items]);
  const courses = items.filter(item => item.type === 'course');
  const categories = items.filter(item => item.type === 'category');
  // Keyboard order follows the visual order: courses, then categories.
  const ordered = [...courses, ...categories];
  const loading = !!term && !current;
  const empty = !!term && current && !result.failed && items.length === 0;
  // While the answer for new text is on its way the panel stays open with placeholders
  // (no flicker), and never shows the previous text's results.
  const expanded = open && !!term && (ordered.length > 0 || empty || loading);

  const optionId = (index: number) => `${id}-option-${index}`;
  const categoryValue = (item: Suggestion) => (item.type === 'category' ? new URL(item.href, 'https://x.invalid').searchParams.get('category') : null);
  /** True when the catalogue took the category as a filter (no navigation). */
  const selectCategory = (item: Suggestion) => {
    const value = categoryValue(item);
    if (!onCategorySelect || !value) return false;
    setOpen(false);
    onCategorySelect(value);
    return true;
  };
  const go = (item: Suggestion) => { if (selectCategory(item)) return; setOpen(false); onNavigate?.(); router.push(item.href); };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!ordered.length) return;
      event.preventDefault();
      setOpen(true);
      // Positions cycle through the text box (-1) and every option.
      let next = active + (event.key === 'ArrowDown' ? 1 : -1);
      if (next >= ordered.length) next = -1;
      if (next < -1) next = ordered.length - 1;
      setActive(next);
      // Keep the highlighted option visible inside the scrolling list.
      if (next >= 0) requestAnimationFrame(() => document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' }));
    } else if (event.key === 'Enter') {
      if (expanded && active >= 0 && ordered[active]) { event.preventDefault(); go(ordered[active]); }
      else setOpen(false);
    } else if (event.key === 'Escape') {
      if (expanded) { event.preventDefault(); setOpen(false); }
      else if (value) { event.preventDefault(); onValueChange(''); }
    }
  };

  const announce = !term ? '' : loading ? 'جارٍ البحث…' : result.failed && current ? 'تعذّر تحميل الاقتراحات'
    : empty ? 'لا توجد نتائج مطابقة' : `${formatNumber(courses.length)} كورس و${formatNumber(categories.length)} قسم مقترح`;

  const renderOption = (item: Suggestion, index: number) => (
    <li key={`${item.type}-${item.id}`} id={optionId(index)} role="option" aria-selected={index === active}
      className={styles.option} data-active={index === active ? '' : undefined} onMouseEnter={() => setActive(index)}>
      <Link href={item.href} className={styles.optionLink} tabIndex={-1} onMouseDown={event => event.preventDefault()}
        onClick={event => {
          // Ctrl/Cmd/Shift-click opens a new tab: this page stays as it is.
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
          if (selectCategory(item)) event.preventDefault(); else { setOpen(false); onNavigate?.(); }
        }}>
        {item.type === 'course' ? (
          <>
            <span className={styles.thumb} aria-hidden="true">
              <CourseCover src={item.thumbnail} sizes="48px" iconSize={18} />
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{item.label}</span>
              <span className={styles.meta}>
                {item.category ? <span>{item.category}</span> : null}
                {coursePriceLabel(item) ? <span className={styles.price}>{coursePriceLabel(item)}</span>
                  : item.price === 0 && item.priceSYP === 0 ? <span className={styles.price}>مجاني</span> : null}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className={`${styles.thumb} ${styles.categoryIcon}`} aria-hidden="true"><Tag size={17} /></span>
            <span className={styles.text}>
              <span className={styles.title}>{item.label}</span>
              <span className={styles.meta}>
                {item.parent ? <span>ضمن {item.parent}</span> : <span>قسم رئيسي</span>}
                <span>{formatNumber(item.count)} {item.count === 1 ? 'كورس' : 'كورسات'}</span>
              </span>
            </span>
          </>
        )}
      </Link>
    </li>
  );

  return (
    <div
      ref={rootRef}
      className={styles.root}
      role="search"
      onBlur={event => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
    >
      <span className={styles.icon} aria-hidden="true">
        {loading ? <Loader2 size={20} className={styles.spin} /> : <Search size={22} />}
      </span>
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={event => { onValueChange(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={80}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        aria-describedby={statusId}
      />
      {value ? (
        <button type="button" className={styles.clear} onClick={() => { onValueChange(''); setOpen(false); }} aria-label="مسح البحث">
          <X size={18} aria-hidden="true" />
        </button>
      ) : null}

      <span id={statusId} className="sr-only" role="status" aria-live="polite">{open ? announce : ''}</span>

      <div className={styles.panel} hidden={!expanded} data-open={expanded ? '' : undefined}>
        {loading ? (
          <div className={styles.loading} aria-hidden="true">
            {[0, 1, 2].map(i => (
              <div key={i} className={styles.skeletonRow}>
                <span className={styles.skeletonThumb} />
                <span className={styles.skeletonLines}><span /><span /></span>
              </div>
            ))}
          </div>
        ) : null}
        {empty ? (
          <div className={styles.empty}>
            <SearchX size={22} aria-hidden="true" />
            <div>
              <p className={styles.emptyTitle}>لا توجد نتائج لـ «{term}»</p>
              <p className={styles.emptyHint}>جرّب كلمة أقصر، أو اكتبها بطريقة أخرى، أو تصفّح الأقسام من الفلاتر.</p>
            </div>
          </div>
        ) : null}
        <ul id={listId} role="listbox" aria-label="اقتراحات البحث" className={styles.list} hidden={!ordered.length}>
          {courses.length ? (
            <li role="presentation" className={styles.group} aria-hidden="true">الكورسات</li>
          ) : null}
          {courses.map((item, i) => renderOption(item, i))}
          {categories.length ? (
            <li role="presentation" className={styles.group} aria-hidden="true">الأقسام</li>
          ) : null}
          {categories.map((item, i) => renderOption(item, courses.length + i))}
        </ul>
      </div>
    </div>
  );
}
