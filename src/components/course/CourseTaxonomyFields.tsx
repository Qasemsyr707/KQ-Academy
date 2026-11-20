'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Check, Layers, Search, Tag, X } from 'lucide-react';
import { normalizeText } from '@/lib/search-normalize';
import {
  CURRICULUM_ROOT_SLUG, TAG_LIMITS, TRAINING_TYPES, categoryMatches, categoryTree, type CategoryOption,
} from '@/lib/taxonomy-shared';
import styles from './CourseTaxonomyFields.module.css';

export interface TaxonomyValue {
  categoryId: string;
  tags: string[];
  trainingType: string;
}

interface Props {
  value: TaxonomyValue;
  onChange: (value: TaxonomyValue) => void;
  /** SKILL courses choose outside the school curriculum; CURRICULUM courses inside it. */
  courseType: string;
  /** The course's current category text when it is not linked to a category yet. */
  legacyCategory?: string | null;
}

/** Loads the active categories once per page (public list, cached by the browser/CDN for a minute). */
function useCategories() {
  const [state, setState] = useState<{ categories: CategoryOption[]; error: string | null; loading: boolean }>({ categories: [], error: null, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/categories', { signal: controller.signal })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(data => setState({ categories: Array.isArray(data.categories) ? data.categories : [], error: null, loading: false }))
      .catch(error => { if (error?.name !== 'AbortError') setState({ categories: [], error: 'تعذّر تحميل التصنيفات؛ أعد تحميل الصفحة', loading: false }); });
    return () => controller.abort();
  }, []);
  return state;
}

export default function CourseTaxonomyFields({ value, onChange, courseType, legacyCategory }: Props) {
  const id = useId().replace(/:/g, '');
  const { categories, error, loading } = useCategories();
  const [query, setQuery] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [tagError, setTagError] = useState('');

  const curriculum = courseType === 'CURRICULUM';
  const tree = useMemo(() => categoryTree(categories).filter(({ main }) => (main.slug === CURRICULUM_ROOT_SLUG) === curriculum), [categories, curriculum]);
  const selected = categories.find(category => category.id === value.categoryId) ?? null;
  const selectedMainId = selected ? selected.parentId ?? selected.id : '';
  const selectedBranch = tree.find(({ main }) => main.id === selectedMainId);
  // A category chosen for the other course type is not valid any more.
  const outOfScope = !!selected && !selectedBranch && !loading;

  // A main category is listed when it or one of its subcategories matches the search.
  const visible = tree.filter(({ main, children }) => categoryMatches(main, query) || children.some(child => categoryMatches(child, query)));

  const set = (patch: Partial<TaxonomyValue>) => onChange({ ...value, ...patch });

  const addTag = () => {
    const tag = tagDraft.replace(/\s+/g, ' ').trim();
    if (!tag) return;
    if (tag.length < TAG_LIMITS.minLength || tag.length > TAG_LIMITS.maxLength) {
      setTagError(`الوسم من ${TAG_LIMITS.minLength} إلى ${TAG_LIMITS.maxLength} حرفاً`); return;
    }
    if (value.tags.length >= TAG_LIMITS.max) { setTagError(`حتى ${TAG_LIMITS.max} وسوم`); return; }
    if (value.tags.some(existing => normalizeText(existing) === normalizeText(tag))) { setTagError('الوسم مضاف مسبقاً'); return; }
    set({ tags: [...value.tags, tag] });
    setTagDraft(''); setTagError('');
  };

  return (
    <div className={styles.root}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}><Layers size={18} aria-hidden="true" /> التصنيف الرئيسي <span className={styles.required}>*</span></legend>
        {legacyCategory && !selected ? (
          <p className={styles.notice}>التصنيف الحالي «{legacyCategory}» غير مرتبط بقائمة التصنيفات؛ اختر التصنيف المناسب ليظهر الكورس في البحث بدقة.</p>
        ) : null}
        {outOfScope ? (
          <p className={styles.warning} role="alert">التصنيف المختار لا يناسب نوع الكورس الحالي؛ اختر تصنيفاً آخر.</p>
        ) : null}

        <div className={styles.searchBox}>
          <Search size={17} aria-hidden="true" />
          <label htmlFor={`${id}-q`} className="sr-only">ابحث في التصنيفات</label>
          <input id={`${id}-q`} type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="ابحث في التصنيفات… (مثال: تسويق، AI، تصميم)" autoComplete="off" className={styles.searchInput} />
        </div>

        {loading ? <p className={styles.muted}>جارٍ تحميل التصنيفات…</p> : null}
        {error ? <p className={styles.warning} role="alert">{error}</p> : null}
        {!loading && !error && visible.length === 0 ? <p className={styles.muted}>لا يوجد تصنيف مطابق. يضيف المسؤول التصنيفات الجديدة من لوحة الإدارة.</p> : null}

        <div className={styles.mains} role="radiogroup" aria-label="التصنيف الرئيسي">
          {visible.map(({ main, children }) => (
            <label key={main.id} className={styles.main} data-checked={selectedMainId === main.id ? '' : undefined}>
              <input type="radio" name={`${id}-main`} value={main.id} checked={selectedMainId === main.id}
                onChange={() => set({ categoryId: main.id })} />
              <span className={styles.mainName}>{main.name}</span>
              {main.nameEn ? <span className={styles.mainEn} lang="en" dir="ltr">{main.nameEn}</span> : null}
              {children.length ? <span className={styles.mainCount}>{children.length} فرعي</span> : null}
              {selectedMainId === main.id ? <Check size={16} className={styles.check} aria-hidden="true" /> : null}
            </label>
          ))}
        </div>
      </fieldset>

      {selectedBranch && selectedBranch.children.length ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>التصنيف الفرعي <span className={styles.optional}>(اختياري)</span></legend>
          <div className={styles.pills} role="radiogroup" aria-label="التصنيف الفرعي">
            <label className={styles.pill} data-checked={value.categoryId === selectedBranch.main.id ? '' : undefined}>
              <input type="radio" name={`${id}-sub`} checked={value.categoryId === selectedBranch.main.id}
                onChange={() => set({ categoryId: selectedBranch.main.id })} />
              عام في {selectedBranch.main.name}
            </label>
            {selectedBranch.children
              .filter(child => !query || categoryMatches(child, query) || categoryMatches(selectedBranch.main, query) || child.id === value.categoryId)
              .map(child => (
                <label key={child.id} className={styles.pill} data-checked={value.categoryId === child.id ? '' : undefined}>
                  <input type="radio" name={`${id}-sub`} checked={value.categoryId === child.id} onChange={() => set({ categoryId: child.id })} />
                  {child.name}
                </label>
              ))}
          </div>
        </fieldset>
      ) : null}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={`${id}-training`} className={styles.legend}>نوع التدريب <span className={styles.optional}>(اختياري)</span></label>
          <select id={`${id}-training`} value={value.trainingType} onChange={event => set({ trainingType: event.target.value })} className={styles.select}>
            <option value="">غير محدد</option>
            {TRAINING_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <p className={styles.hint}>يصف أسلوب التدريب، بشكل مستقل عن مجال الكورس.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor={`${id}-tags`} className={styles.legend}><Tag size={16} aria-hidden="true" /> الوسوم <span className={styles.optional}>(اختياري، حتى {TAG_LIMITS.max})</span></label>
          <div className={styles.tags}>
            {value.tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
                <button type="button" onClick={() => set({ tags: value.tags.filter(item => item !== tag) })} aria-label={`حذف الوسم ${tag}`}>
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            ))}
            <input id={`${id}-tags`} value={tagDraft} maxLength={TAG_LIMITS.maxLength}
              onChange={event => { setTagDraft(event.target.value); setTagError(''); }}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ',' || event.key === '،') { event.preventDefault(); addTag(); }
                else if (event.key === 'Backspace' && !tagDraft && value.tags.length) set({ tags: value.tags.slice(0, -1) });
              }}
              onBlur={addTag}
              placeholder={value.tags.length >= TAG_LIMITS.max ? '' : 'اكتب وسماً ثم Enter'}
              disabled={value.tags.length >= TAG_LIMITS.max} className={styles.tagInput} aria-describedby={`${id}-tags-hint`} />
          </div>
          <p id={`${id}-tags-hint`} className={tagError ? styles.warning : styles.hint} aria-live="polite">
            {tagError || 'كلمات تساعد الطلاب في الوصول للكورس عبر البحث، مثل: ChatGPT، إعلانات فيسبوك.'}
          </p>
        </div>
      </div>
    </div>
  );
}
