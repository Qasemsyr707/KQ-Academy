'use client';

import { useState } from 'react';

type ShortStatus = 'pending' | 'approved' | 'rejected';

interface PendingShort {
  id: string;
  title: string;
  thumbnail: string;
  instructor: string;
  instructorAvatar: string;
  courseTitle: string;
  videoUrl: string;
  submittedAt: string;
  status: ShortStatus;
  rejectionReason?: string;
}

const INITIAL_PENDING: PendingShort[] = [
  {
    id: 'p1',
    title: 'كيف تحل مسائل التفاضل والتكامل في 5 خطوات؟',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80',
    instructor: 'أ. ليلى محمود',
    instructorAvatar: 'ل',
    courseTitle: 'الرياضيات للبكالوريا',
    videoUrl: 'https://example.com/video1.mp4',
    submittedAt: 'منذ ساعتين',
    status: 'pending',
  },
  {
    id: 'p2',
    title: 'أهم مفاهيم الذكاء الاصطناعي لعام 2026 🤖',
    thumbnail: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&q=80',
    instructor: 'م. سعيد الرفاعي',
    instructorAvatar: 'س',
    courseTitle: 'أساسيات الذكاء الاصطناعي',
    videoUrl: 'https://example.com/video2.mp4',
    submittedAt: 'منذ 5 ساعات',
    status: 'pending',
  },
  {
    id: 'p3',
    title: 'ما الفرق بين الـ TCP و UDP؟ 🌐',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80',
    instructor: 'م. طارق العبد',
    instructorAvatar: 'ط',
    courseTitle: 'شبكات الحاسوب',
    videoUrl: 'https://example.com/video3.mp4',
    submittedAt: 'منذ 8 ساعات',
    status: 'pending',
  },
];

const STATUS_CONFIG = {
  pending:  { label: 'قيد المراجعة', color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30',   dot: 'bg-amber-400' },
  approved: { label: 'تمت الموافقة', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', dot: 'bg-emerald-400' },
  rejected: { label: 'مرفوض',        color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',        dot: 'bg-red-400' },
};

// ─────────────────────────────────────
// Reject Modal
// ─────────────────────────────────────
function RejectModal({ short, onConfirm, onClose }: {
  short: PendingShort;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  const QUICK_REASONS = [
    'المحتوى لا يتوافق مع معايير المنصة',
    'يحتوي على معلومة علمية غير دقيقة',
    'جودة الفيديو منخفضة',
    'الفيديو لا يرتبط بالكورس المحدد',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative glass-panel p-8 w-full max-w-md z-10"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-xl mb-2">رفض الفيديو</h3>
        <p className="text-[var(--color-text-muted)] text-sm mb-6 line-clamp-2">{short.title}</p>

        <div className="mb-4 space-y-2">
          <p className="text-[var(--color-text-muted)] text-sm font-semibold">أسباب سريعة:</p>
          {QUICK_REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-right text-sm px-4 py-2.5 rounded-xl border transition-all ${reason === r ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-white/5 border-white/10 text-[var(--color-text-muted)] hover:bg-white/10'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          className="input-premium text-right resize-none mb-6"
          rows={3}
          placeholder="أو اكتب سبباً مخصصاً..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(reason || 'لم يُحدد سبب')}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
            تأكيد الرفض
          </button>
          <button
            onClick={onClose}
            className="flex-1 glass-panel text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// Short Review Card
// ─────────────────────────────────────
function ReviewCard({
  short,
  onApprove,
  onReject,
}: {
  short: PendingShort;
  onApprove: (id: string) => void;
  onReject: (short: PendingShort) => void;
}) {
  const cfg = STATUS_CONFIG[short.status];
  const isPending = short.status === 'pending';

  return (
    <div className={`glass-panel overflow-hidden transition-all duration-300 ${!isPending ? 'opacity-70' : ''}`} dir="rtl">
      <div className="flex gap-4 p-5">
        {/* Thumbnail */}
        <div className="w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--color-surface)] relative">
          <img src={short.thumbnail} alt={short.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base line-clamp-2 mb-1">{short.title}</p>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {short.instructorAvatar}
            </div>
            <span className="text-[var(--color-text-muted)] text-sm">{short.instructor}</span>
            <span className="text-white/20">•</span>
            <span className="text-[var(--color-text-muted)] text-sm">{short.submittedAt}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-lg">{short.courseTitle}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-bold ${cfg.bg} ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          {short.rejectionReason && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              {short.rejectionReason}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-3 px-5 pb-5">
          <a
            href={short.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-white transition-colors px-3 py-2 glass-panel rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            مشاهدة
          </a>
          <button
            onClick={() => onApprove(short.id)}
            className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 text-emerald-300 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            موافقة ونشر
          </button>
          <button
            onClick={() => onReject(short)}
            className="flex-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            رفض
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────
// Main Page
// ─────────────────────────────────────
export default function AdminShortsPage() {
  const [shorts, setShorts] = useState<PendingShort[]>(INITIAL_PENDING);
  const [rejectTarget, setRejectTarget] = useState<PendingShort | null>(null);
  const [filter, setFilter] = useState<'all' | ShortStatus>('pending');

  const pendingCount  = shorts.filter(s => s.status === 'pending').length;
  const approvedCount = shorts.filter(s => s.status === 'approved').length;
  const rejectedCount = shorts.filter(s => s.status === 'rejected').length;

  const handleApprove = (id: string) => {
    setShorts(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
  };

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return;
    setShorts(prev => prev.map(s =>
      s.id === rejectTarget.id ? { ...s, status: 'rejected', rejectionReason: reason } : s
    ));
    setRejectTarget(null);
  };

  const displayed = filter === 'all' ? shorts : shorts.filter(s => s.status === filter);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="bg-[var(--color-surface)] border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-[var(--color-text-muted)] hover:text-white transition-colors">الإدارة</a>
            <span className="text-white/20">/</span>
            <span className="text-white font-semibold flex items-center gap-2">
              مراجعة Shorts
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{pendingCount}</span>
              )}
            </span>
          </div>
          <a href="/shorts" className="text-indigo-400 hover:text-indigo-300 text-sm">
            معاينة القناة ←
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10" dir="rtl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'قيد المراجعة', value: pendingCount,  color: 'text-amber-400',  bg: 'border-amber-400/20' },
            { label: 'تمت الموافقة', value: approvedCount, color: 'text-emerald-400', bg: 'border-emerald-400/20' },
            { label: 'مرفوضة',       value: rejectedCount, color: 'text-red-400',     bg: 'border-red-400/20' },
          ].map((s, i) => (
            <div key={i} className={`glass-panel p-5 text-center border ${s.bg}`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--color-surface)] rounded-xl w-fit">
          {[
            { key: 'pending',  label: `قيد المراجعة (${pendingCount})` },
            { key: 'approved', label: 'تمت الموافقة' },
            { key: 'rejected', label: 'مرفوضة' },
            { key: 'all',      label: 'الكل' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${filter === tab.key ? 'bg-indigo-600 text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {displayed.length === 0 ? (
          <div className="glass-panel p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <p className="text-white font-bold text-xl mb-2">لا توجد فيديوهات هنا</p>
            <p className="text-[var(--color-text-muted)]">جميع الفيديوهات تمت مراجعتها</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(short => (
              <ReviewCard
                key={short.id}
                short={short}
                onApprove={handleApprove}
                onReject={setRejectTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          short={rejectTarget}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
