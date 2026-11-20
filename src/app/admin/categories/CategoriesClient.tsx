'use client';

import { useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { AdminCategory } from '@/lib/category-admin';
import { categoryMatches } from '@/lib/taxonomy-shared';
import { formatNumber } from '@/lib/format';
import styles from './Categories.module.css';

interface Draft { name: string; nameEn: string; aliases: string; order: string; parentId: string }

const emptyDraft = (parentId = ''): Draft => ({ name: '', nameEn: '', aliases: '', order: '', parentId });
const toDraft = (category: AdminCategory): Draft => ({
  name: category.name, nameEn: category.nameEn ?? '', aliases: category.aliases.join('، '), order: String(category.order), parentId: category.parentId ?? '',
});
const aliasList = (text: string) => text.split(/[,،\n]/).map(alias => alias.trim()).filter(Boolean);

export default function CategoriesClient({ initialCategories }: { initialCategories: AdminCategory[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  // `null` = closed; `{ id: null }` = a new category; otherwise the category being edited.
  const [editor, setEditor] = useState<{ id: string | null; draft: Draft } | null>(null);

  const mains = categories.filter(category => !category.parentId);
  const childrenOf = (id: string) => categories.filter(category => category.parentId === id);
  const visible = mains.filter(main => categoryMatches(main, query) || childrenOf(main.id).some(child => categoryMatches(child, query)));

  const reload = async () => {
    const res = await fetch('/api/admin/categories', { cache: 'no-store' });
    if (res.ok) setCategories((await res.json()).categories);
  };

  const call = async (url: string, method: string, body?: unknown, done?: string) => {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage({ kind: 'error', text: data.error || 'تعذّر تنفيذ العملية' }); return false; }
      setMessage({ kind: 'ok', text: done || data.message || 'تم' });
      await reload();
      return true;
    } catch {
      setMessage({ kind: 'error', text: 'خطأ في الاتصال بالخادم' });
      return false;
    } finally { setBusy(false); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    const { draft } = editor;
    const body = {
      name: draft.name, nameEn: draft.nameEn, aliases: aliasList(draft.aliases),
      ...(draft.order !== '' ? { order: Number(draft.order) } : {}), parentId: draft.parentId || null,
    };
    const ok = editor.id
      ? await call(`/api/admin/categories/${editor.id}`, 'PATCH', body, 'تم حفظ التصنيف')
      : await call('/api/admin/categories', 'POST', body, 'تمت إضافة التصنيف');
    if (ok) setEditor(null);
  };

  const toggle = (category: AdminCategory) =>
    call(`/api/admin/categories/${category.id}`, 'PATCH', { isActive: !category.isActive }, category.isActive ? 'تم إيقاف التصنيف' : 'تم تفعيل التصنيف');

  const remove = (category: AdminCategory) => {
    if (!window.confirm(`حذف التصنيف «${category.name}» نهائياً؟`)) return;
    void call(`/api/admin/categories/${category.id}`, 'DELETE', undefined, 'تم حذف التصنيف');
  };

  const row = (category: AdminCategory, isMain: boolean) => {
    const empty = category.totalCourses === 0 && childrenOf(category.id).length === 0;
    return (
      <div className={isMain ? styles.mainRow : styles.subRow} data-inactive={category.isActive ? undefined : ''}>
        <div className={styles.names}>
          <span className={styles.name}>{category.name}</span>
          <span className={styles.details}>
            {category.nameEn ? <span lang="en" dir="ltr">{category.nameEn}</span> : null}
            <span dir="ltr" className={styles.slug}>{category.slug}</span>
            {!category.isActive ? <span className={styles.badge}>موقوف</span> : null}
          </span>
          {category.aliases.length ? <span className={styles.aliases}>أسماء بديلة: {category.aliases.join('، ')}</span> : null}
        </div>
        <span className={styles.count} title="الكورسات المنشورة / الإجمالي (مع الفرعية)">
          {formatNumber(category.publishedCourses)} منشور · {formatNumber(category.totalCourses)} إجمالي
        </span>
        <div className={styles.actions}>
          {isMain ? (
            <button type="button" className={styles.iconButton} onClick={() => setEditor({ id: null, draft: emptyDraft(category.id) })} disabled={busy}>
              <Plus size={16} aria-hidden="true" /> فرعي
            </button>
          ) : null}
          <button type="button" className={styles.iconButton} onClick={() => setEditor({ id: category.id, draft: toDraft(category) })} disabled={busy} aria-label={`تعديل ${category.name}`}>
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button type="button" className={styles.iconButton} onClick={() => toggle(category)} disabled={busy}
            aria-label={category.isActive ? `إيقاف ${category.name}` : `تفعيل ${category.name}`} title={category.isActive ? 'إيقاف (يبقى مرتبطاً بكورساته)' : 'تفعيل'}>
            {category.isActive ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
          <button type="button" className={`${styles.iconButton} ${styles.danger}`} onClick={() => remove(category)} disabled={busy || !empty}
            aria-label={`حذف ${category.name}`} title={empty ? 'حذف' : 'لا يُحذف تصنيف مرتبط بكورسات أو يحتوي تصنيفات فرعية؛ أوقفه بدلاً من ذلك'}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <label htmlFor="category-filter" className="sr-only">ابحث في التصنيفات</label>
          <input id="category-filter" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالاسم العربي أو الإنجليزي أو الاسم البديل" />
        </div>
        <button type="button" className="btn btn-solid" onClick={() => setEditor({ id: null, draft: emptyDraft() })} disabled={busy}>
          <Plus size={18} aria-hidden="true" /> تصنيف رئيسي جديد
        </button>
      </div>
      <p className={styles.summary}>{formatNumber(mains.length)} تصنيف رئيسي · {formatNumber(categories.length - mains.length)} تصنيف فرعي</p>

      {message ? <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? styles.error : styles.ok}>{message.text}</p> : null}

      {editor ? (
        <form onSubmit={save} className={styles.editor} aria-labelledby="category-editor-title">
          <div className={styles.editorHead}>
            <h2 id="category-editor-title">{editor.id ? 'تعديل التصنيف' : editor.draft.parentId ? 'تصنيف فرعي جديد' : 'تصنيف رئيسي جديد'}</h2>
            <button type="button" className={styles.iconButton} onClick={() => setEditor(null)} aria-label="إغلاق"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className={styles.grid}>
            <label>الاسم العربي *
              <input required minLength={2} maxLength={80} value={editor.draft.name} onChange={event => setEditor({ ...editor, draft: { ...editor.draft, name: event.target.value } })} />
            </label>
            <label>الاسم الإنجليزي
              <input maxLength={80} dir="ltr" value={editor.draft.nameEn} onChange={event => setEditor({ ...editor, draft: { ...editor.draft, nameEn: event.target.value } })} />
            </label>
            <label>التصنيف الرئيسي
              <select value={editor.draft.parentId} onChange={event => setEditor({ ...editor, draft: { ...editor.draft, parentId: event.target.value } })}
                disabled={!!editor.id && childrenOf(editor.id).length > 0}>
                <option value="">— تصنيف رئيسي —</option>
                {mains.filter(main => main.id !== editor.id).map(main => <option key={main.id} value={main.id}>{main.name}</option>)}
              </select>
            </label>
            <label>الترتيب
              <input type="number" min={0} max={100000} value={editor.draft.order} placeholder="0" onChange={event => setEditor({ ...editor, draft: { ...editor.draft, order: event.target.value } })} />
            </label>
            <label className={styles.wide}>أسماء بديلة ومرادفات للبحث (افصل بفاصلة)
              <textarea rows={2} value={editor.draft.aliases} placeholder="مثال: AI، ذكاء اصطناعي، Artificial Intelligence"
                onChange={event => setEditor({ ...editor, draft: { ...editor.draft, aliases: event.target.value } })} />
            </label>
          </div>
          <p className={styles.hint}>لا يُقبل اسم مطابق لتصنيف آخر بعد توحيد الهمزات والتشكيل. المعرّف (slug) يُنشأ من الاسم الإنجليزي ولا يتغير بعد الإنشاء.</p>
          <div className={styles.editorActions}>
            <button type="submit" className="btn btn-solid" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            <button type="button" className="btn" onClick={() => setEditor(null)}>إلغاء</button>
          </div>
        </form>
      ) : null}

      <div className={styles.list}>
        {visible.length === 0 ? <p className={styles.summary}>لا يوجد تصنيف مطابق.</p> : null}
        {visible.map(main => (
          <section key={main.id} className={styles.card} aria-label={main.name}>
            {row(main, true)}
            {childrenOf(main.id).filter(child => !query || categoryMatches(child, query) || categoryMatches(main, query)).map(child => (
              <div key={child.id}>{row(child, false)}</div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
