'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Crown, Mail, Plus, Trash2, Send,
  Users, CheckCircle, AlertCircle, ChevronDown, Loader2, Tag
} from 'lucide-react';

type Tab = 'bundles' | 'subscriptions' | 'email';

export default function MarketingAdminClient() {
  const [tab, setTab] = useState<Tab>('bundles');

  // ─── Bundles State ────────────────────────────
  const [bundles, setBundles] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [newBundle, setNewBundle] = useState({ title: '', description: '', price: '', priceSYP: '', courseIds: [] as string[] });
  const [creatingBundle, setCreatingBundle] = useState(false);

  // ─── Subscription State ───────────────────────
  const [plans, setPlans] = useState<any[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [newPlan, setNewPlan] = useState({ name: '', description: '', priceMonthly: '', priceYearly: '', features: [] as string[] });
  const [creatingPlan, setCreatingPlan] = useState(false);

  // ─── Email State ──────────────────────────────
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', targetAudience: 'ALL' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState('');

  // ─── Toast ────────────────────────────────────
  const [toast, setToast] = useState({ msg: '', type: '' });
  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  useEffect(() => {
    fetch('/api/admin/bundles').then(r => r.json()).then(d => setBundles(d.bundles || []));
    fetch('/api/admin/subscriptions').then(r => r.json()).then(d => setPlans(d.plans || []));
    fetch('/api/courses').then(r => r.json()).then(d => setCourses(d.courses || d || []));
  }, []);

  // ─── Create Bundle ────────────────────────────
  const handleCreateBundle = async () => {
    if (!newBundle.title || !newBundle.price || newBundle.courseIds.length < 2) {
      showToast('يجب تعبئة العنوان والسعر واختيار كورسين على الأقل', 'error');
      return;
    }
    setCreatingBundle(true);
    const res = await fetch('/api/admin/bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBundle)
    });
    const data = await res.json();
    if (res.ok) {
      setBundles(prev => [data.bundle, ...prev]);
      setNewBundle({ title: '', description: '', price: '', priceSYP: '', courseIds: [] });
      showToast('تم إنشاء الحزمة بنجاح! ✅');
    } else {
      showToast(data.error || 'فشل الإنشاء', 'error');
    }
    setCreatingBundle(false);
  };

  // ─── Create Plan ──────────────────────────────
  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.priceMonthly || !newPlan.priceYearly) {
      showToast('يجب تعبئة اسم الخطة والأسعار', 'error');
      return;
    }
    setCreatingPlan(true);
    const res = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlan)
    });
    const data = await res.json();
    if (res.ok) {
      setPlans(prev => [...prev, data.plan]);
      setNewPlan({ name: '', description: '', priceMonthly: '', priceYearly: '', features: [] });
      showToast('تم إنشاء الخطة بنجاح! ✅');
    } else {
      showToast(data.error || 'فشل الإنشاء', 'error');
    }
    setCreatingPlan(false);
  };

  // ─── Send Email ───────────────────────────────
  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) {
      showToast('يجب إدخال العنوان والمحتوى', 'error');
      return;
    }
    setSendingEmail(true);
    const res = await fetch('/api/admin/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailForm)
    });
    const data = await res.json();
    setEmailResult(data.message || data.error || '');
    showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
    setSendingEmail(false);
  };

  const tabs = [
    { key: 'bundles', label: 'الحزم المجمّعة', icon: Package, color: '#CBA153' },
    { key: 'subscriptions', label: 'خطط الاشتراك', icon: Crown, color: '#a855f7' },
    { key: 'email', label: 'التسويق البريدي', icon: Mail, color: '#3b82f6' },
  ];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
  };

  return (
    <div style={{ padding: '2rem', color: '#fff', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Toast */}
      <AnimatePresence>
        {toast.msg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#22c55e'}`, backdropFilter: 'blur(20px)', color: '#fff', padding: '0.875rem 2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {toast.type === 'error' ? <AlertCircle size={18} color="#ef4444" /> : <CheckCircle size={18} color="#22c55e" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>إدارة التسويق والنمو</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>الحزم المجمّعة • خطط الاشتراك • الحملات البريدية</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '14px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem', transition: 'all 0.3s', background: tab === t.key ? t.color : 'transparent', color: tab === t.key ? '#000' : 'rgba(255,255,255,0.5)' }}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── BUNDLES TAB ── */}
        {tab === 'bundles' && (
          <motion.div key="bundles" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

              {/* Create Form */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus color="#CBA153" size={20} /> إنشاء حزمة جديدة
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input placeholder="عنوان الحزمة *" value={newBundle.title} onChange={e => setNewBundle(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
                  <input placeholder="وصف مختصر" value={newBundle.description} onChange={e => setNewBundle(p => ({ ...p, description: e.target.value }))} style={inputStyle} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <input placeholder="السعر USD *" type="number" value={newBundle.price} onChange={e => setNewBundle(p => ({ ...p, price: e.target.value }))} style={inputStyle} />
                    <input placeholder="السعر SYP" type="number" value={newBundle.priceSYP} onChange={e => setNewBundle(p => ({ ...p, priceSYP: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>اختر الكورسات (2 على الأقل):</p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {courses.slice(0, 20).map((c: any) => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', background: newBundle.courseIds.includes(c.id) ? 'rgba(203,161,83,0.1)' : 'transparent' }}>
                          <input type="checkbox" checked={newBundle.courseIds.includes(c.id)}
                            onChange={e => setNewBundle(p => ({ ...p, courseIds: e.target.checked ? [...p.courseIds, c.id] : p.courseIds.filter(id => id !== c.id) }))} />
                          <span style={{ fontSize: '0.875rem' }}>{c.title} — ${c.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleCreateBundle} disabled={creatingBundle}
                    style={{ padding: '0.875rem', background: '#CBA153', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {creatingBundle ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={18} />}
                    إنشاء الحزمة
                  </button>
                </div>
              </div>

              {/* Bundles List */}
              <div>
                <h3 style={{ margin: '0 0 1rem' }}>الحزم الموجودة ({bundles.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                  {bundles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                      <Package size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                      لا توجد حزم بعد
                    </div>
                  ) : bundles.map((b: any) => (
                    <div key={b.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{b.title}</div>
                          <div style={{ color: '#CBA153', fontWeight: 'bold', fontSize: '1.1rem' }}>${b.price}</div>
                        </div>
                        <span style={{ background: b.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: b.isActive ? '#22c55e' : '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem' }}>
                          {b.isActive ? 'نشطة' : 'معطّلة'}
                        </span>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                        {b.courses?.length || 0} كورس مُضمَّن
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SUBSCRIPTIONS TAB ── */}
        {tab === 'subscriptions' && (
          <motion.div key="subscriptions" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

              {/* Create Plan Form */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Crown color="#a855f7" size={20} /> إنشاء خطة اشتراك جديدة
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input placeholder="اسم الخطة * (مثال: الخطة الذهبية)" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
                  <input placeholder="وصف مختصر" value={newPlan.description} onChange={e => setNewPlan(p => ({ ...p, description: e.target.value }))} style={inputStyle} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <input placeholder="السعر الشهري USD *" type="number" value={newPlan.priceMonthly} onChange={e => setNewPlan(p => ({ ...p, priceMonthly: e.target.value }))} style={inputStyle} />
                    <input placeholder="السعر السنوي USD *" type="number" value={newPlan.priceYearly} onChange={e => setNewPlan(p => ({ ...p, priceYearly: e.target.value }))} style={inputStyle} />
                  </div>
                  {/* Features */}
                  <div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>مزايا الخطة:</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input placeholder="أضف ميزة..." value={newFeature} onChange={e => setNewFeature(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newFeature.trim()) { setNewPlan(p => ({ ...p, features: [...p.features, newFeature.trim()] })); setNewFeature(''); } }}
                        style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => { if (newFeature.trim()) { setNewPlan(p => ({ ...p, features: [...p.features, newFeature.trim()] })); setNewFeature(''); } }}
                        style={{ padding: '0.5rem 1rem', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        <Plus size={16} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {newPlan.features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(168,85,247,0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                          <CheckCircle size={14} color="#a855f7" />
                          <span style={{ flex: 1 }}>{f}</span>
                          <button onClick={() => setNewPlan(p => ({ ...p, features: p.features.filter((_, fi) => fi !== i) }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleCreatePlan} disabled={creatingPlan}
                    style={{ padding: '0.875rem', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {creatingPlan ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={18} />}
                    إنشاء الخطة
                  </button>
                </div>
              </div>

              {/* Plans List */}
              <div>
                <h3 style={{ margin: '0 0 1rem' }}>خطط الاشتراك ({plans.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {plans.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                      <Crown size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                      لا توجد خطط اشتراك بعد
                    </div>
                  ) : plans.map((p: any) => (
                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.2rem' }}>${p.priceMonthly}/شهر | ${p.priceYearly}/سنة</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '1.25rem' }}>{p.subscriptions?.length || 0}</div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>مشترك</div>
                        </div>
                      </div>
                      {p.features && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {JSON.parse(p.features || '[]').slice(0, 3).map((f: string, i: number) => (
                            <span key={i} style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── EMAIL TAB ── */}
        {tab === 'email' && (
          <motion.div key="email" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

              {/* Compose */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail color="#3b82f6" size={20} /> إرسال حملة بريدية
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>الجمهور المستهدف</label>
                    <select value={emailForm.targetAudience} onChange={e => setEmailForm(p => ({ ...p, targetAudience: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="ALL">📧 جميع المستخدمين</option>
                      <option value="STUDENTS">🎓 الطلاب فقط</option>
                      <option value="INSTRUCTORS">👨‍🏫 المدربين فقط</option>
                      <option value="INACTIVE">😴 المستخدمين غير النشطين</option>
                    </select>
                  </div>
                  <input placeholder="موضوع الإيميل *" value={emailForm.subject} onChange={e => setEmailForm(p => ({ ...p, subject: e.target.value }))} style={inputStyle} />
                  <textarea placeholder="محتوى الإيميل * (يدعم HTML)" value={emailForm.body} onChange={e => setEmailForm(p => ({ ...p, body: e.target.value }))} rows={10}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6', fontFamily: 'monospace', fontSize: '0.875rem' }} />
                  <button onClick={handleSendEmail} disabled={sendingEmail}
                    style={{ padding: '0.875rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {sendingEmail ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
                    {sendingEmail ? 'جاري الإرسال...' : 'إرسال الحملة'}
                  </button>
                  {emailResult && (
                    <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '0.875rem', color: '#93c5fd' }}>
                      📊 {emailResult}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '16px', padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#93c5fd' }}>💡 نصائح لإيميل فعّال</h4>
                  {[
                    'استخدم عنواناً واضحاً ومحدداً لزيادة نسبة الفتح',
                    'خصّص الرسالة بذكر اسم المستخدم باستخدام المتغيرات',
                    'أضف دعوة واضحة للعمل (Call to Action)',
                    'اختبر الرسالة على نفسك أولاً قبل إرسالها',
                  ].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                      <CheckCircle size={14} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
                      {tip}
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px', padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#86efac' }}>🤖 التذكيرات التلقائية</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: '0 0 1rem', lineHeight: 1.6 }}>
                    يتم إرسال تذكيرات تلقائية للطلاب الذين توقفوا عن إكمال كورساتهم منذ أكثر من 7 أيام.
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0 }}>
                    للتفعيل: أضف Cron Job يستدعي <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#86efac' }}>/api/cron/reminders</code> يومياً
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
