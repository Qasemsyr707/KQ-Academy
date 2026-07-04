'use client';

import { useState } from 'react';

type ShortStatus = 'pending' | 'approved' | 'rejected';

interface MyShort {
  id: string;
  title: string;
  thumbnail: string;
  courseTitle: string;
  status: ShortStatus;
  views: number;
  likes: number;
  submittedAt: string;
  rejectionReason?: string;
}

const MY_SHORTS: MyShort[] = [
  {
    id: '1',
    title: 'سر قانون كيرشوف اللي بيضيع الطلاب بالامتحان! ⚡',
    thumbnail: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=300&q=80',
    courseTitle: 'الفيزياء الشاملة للبكالوريا',
    status: 'approved',
    views: 12400,
    likes: 5600,
    submittedAt: '2026-06-28',
  },
  {
    id: '2',
    title: 'كيف تحل مسائل التفاضل والتكامل في 5 خطوات؟',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&q=80',
    courseTitle: 'الرياضيات للبكالوريا',
    status: 'pending',
    views: 0,
    likes: 0,
    submittedAt: '2026-07-03',
  },
  {
    id: '3',
    title: 'مقدمة خاطئة في تعريف الكهرباء الساكنة',
    thumbnail: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=300&q=80',
    courseTitle: 'الفيزياء الشاملة للبكالوريا',
    status: 'rejected',
    views: 0,
    likes: 0,
    submittedAt: '2026-07-01',
    rejectionReason: 'المحتوى يحتوي على معلومة غير دقيقة علمياً. يرجى المراجعة وإعادة الرفع.',
  },
];

const STATUS_CONFIG = {
  pending:  { label: 'قيد المراجعة', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30', dot: 'bg-amber-400' },
  approved: { label: 'منشور',         color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', dot: 'bg-emerald-400 animate-pulse' },
  rejected: { label: 'مرفوض',         color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30', dot: 'bg-red-400' },
};

// ─────────────────────────────────────
// Upload Form
// ─────────────────────────────────────
function UploadForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !videoUrl) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      onSubmit({ title, videoUrl, thumbnail, courseTitle });
      setTitle(''); setVideoUrl(''); setThumbnail(''); setCourseTitle('');
      setTimeout(() => setSuccess(false), 4000);
    }, 1500);
  };

  return (
    <div className="glass-panel p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-white font-bold text-xl">رفع فيديو قصير جديد</h2>
          <p className="text-[var(--color-text-muted)] text-sm">سيتم مراجعته من قِبل الإدارة خلال 24 ساعة قبل النشر</p>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
        <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <p className="text-amber-300 text-sm">
          تأكد أن الفيديو يحتوي على محتوى تعليمي حقيقي ومرتبط بكورس على المنصة. الفيديوهات المخالفة ستُرفض تلقائياً.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-emerald-300 text-sm font-bold">تم إرسال الفيديو بنجاح! سيظهر في قائمتك أدناه بعد الموافقة عليه.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} dir="rtl" className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-muted)] mb-2">عنوان الفيديو *</label>
          <input
            className="input-premium text-right"
            placeholder="مثال: سر كيرشوف اللي بيضيع الطلاب..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-muted)] mb-2">رابط الفيديو (URL) *</label>
          <input
            className="input-premium"
            placeholder="https://cdn.example.com/video.mp4"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            type="url"
            required
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-muted)] mb-2">رابط الصورة المصغرة (Thumbnail)</label>
          <input
            className="input-premium"
            placeholder="https://..."
            value={thumbnail}
            onChange={e => setThumbnail(e.target.value)}
            type="url"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-muted)] mb-2">الكورس المرتبط بالفيديو</label>
          <select
            className="input-premium text-right"
            value={courseTitle}
            onChange={e => setCourseTitle(e.target.value)}
          >
            <option value="">-- اختر الكورس --</option>
            <option>الفيزياء الشاملة للبكالوريا</option>
            <option>الرياضيات للبكالوريا</option>
            <option>التسويق الرقمي الاحترافي</option>
            <option>برمجة React Native من الصفر</option>
            <option>أساسيات الذكاء الاصطناعي</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !title || !videoUrl}
          className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الإرسال...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> إرسال للمراجعة</>
          )}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────
// My Shorts Table
// ─────────────────────────────────────
function MyShortsTable({ shorts }: { shorts: MyShort[] }) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-white font-bold text-xl">فيديوهاتي القصيرة</h2>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">إجمالي {shorts.length} فيديوهات</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" dir="rtl">
          <thead>
            <tr className="border-b border-white/5 text-[var(--color-text-muted)] text-sm">
              <th className="text-right py-4 px-6 font-semibold">الفيديو</th>
              <th className="text-right py-4 px-6 font-semibold">الكورس</th>
              <th className="text-right py-4 px-6 font-semibold">الحالة</th>
              <th className="text-right py-4 px-6 font-semibold">المشاهدات</th>
              <th className="text-right py-4 px-6 font-semibold">الإعجابات</th>
              <th className="text-right py-4 px-6 font-semibold">تاريخ الإرسال</th>
            </tr>
          </thead>
          <tbody>
            {shorts.map(short => {
              const cfg = STATUS_CONFIG[short.status];
              return (
                <tr key={short.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--color-surface)]">
                        <img src={short.thumbnail} alt={short.title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold line-clamp-2 max-w-xs">{short.title}</p>
                        {short.status === 'rejected' && short.rejectionReason && (
                          <p className="text-red-400 text-xs mt-1 line-clamp-1">❌ {short.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[var(--color-text-muted)] text-sm">{short.courseTitle}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-white font-semibold">{short.views > 0 ? short.views.toLocaleString() : '—'}</td>
                  <td className="py-4 px-6 text-white font-semibold">{short.likes > 0 ? short.likes.toLocaleString() : '—'}</td>
                  <td className="py-4 px-6 text-[var(--color-text-muted)] text-sm">{short.submittedAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// Main Page
// ─────────────────────────────────────
export default function InstructorShortsPage() {
  const [myShorts, setMyShorts] = useState<MyShort[]>(MY_SHORTS);

  const handleNewShort = (data: any) => {
    const newShort: MyShort = {
      id: Date.now().toString(),
      title: data.title,
      thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300',
      courseTitle: data.courseTitle || 'غير محدد',
      status: 'pending',
      views: 0,
      likes: 0,
      submittedAt: new Date().toISOString().split('T')[0],
    };
    setMyShorts(prev => [newShort, ...prev]);
  };

  const approvedCount = myShorts.filter(s => s.status === 'approved').length;
  const pendingCount  = myShorts.filter(s => s.status === 'pending').length;
  const totalViews    = myShorts.reduce((acc, s) => acc + s.views, 0);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/instructor" className="text-[var(--color-text-muted)] hover:text-white transition-colors">
              لوحة المدرس
            </a>
            <span className="text-white/20">/</span>
            <span className="text-white font-semibold">Shorts</span>
          </div>
          <a href="/shorts" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            معاينة القناة
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10" dir="rtl">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {[
            { label: 'فيديوهات منشورة', value: approvedCount, icon: '✅', color: 'text-emerald-400' },
            { label: 'قيد المراجعة',    value: pendingCount,  icon: '⏳', color: 'text-amber-400' },
            { label: 'إجمالي المشاهدات', value: totalViews.toLocaleString(), icon: '👁', color: 'text-indigo-400' },
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-6 flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[var(--color-text-muted)] text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UploadForm onSubmit={handleNewShort} />
          <div className="space-y-4">
            <div className="glass-panel p-5 flex items-start gap-4 border-indigo-500/20">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">نصائح لفيديو ناجح</h3>
                <ul className="text-[var(--color-text-muted)] text-sm space-y-1.5">
                  <li>• مدة الفيديو المثالية: 30 إلى 90 ثانية</li>
                  <li>• ابدأ بالنقطة الأساسية مباشرةً دون مقدمات</li>
                  <li>• استخدم عنواناً يثير الفضول ويحتوي الرقم أو السر</li>
                  <li>• اختر صورة مصغرة واضحة وجذابة</li>
                  <li>• اربط الفيديو بكورس محدد لتحسين التحويل</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <MyShortsTable shorts={myShorts} />
        </div>
      </div>
    </div>
  );
}
