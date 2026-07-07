'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, Crown, Star, Package, ChevronDown, ChevronUp, Shield, Infinity } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscription' | 'bundles'>('subscription');

  useEffect(() => {
    Promise.all([
      fetch('/api/subscriptions/plans').then(r => r.json()),
      fetch('/api/bundles').then(r => r.json())
    ]).then(([plansData, bundlesData]) => {
      setPlans(plansData.plans || []);
      setBundles(bundlesData.bundles || []);
      setLoading(false);
    });
  }, []);

  const planIcons = [Zap, Crown, Star];
  const planColors = ['#3b82f6', '#CBA153', '#a855f7'];

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}>
      <div style={{ width: 50, height: 50, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#CBA153', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 5%' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: 'inline-block', background: 'rgba(203,161,83,0.1)', border: '1px solid rgba(203,161,83,0.3)', borderRadius: '100px', padding: '0.5rem 1.5rem', marginBottom: '1.5rem', color: '#CBA153', fontSize: '0.875rem', fontWeight: 'bold' }}>
            ✨ عروض حصرية
          </motion.div>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, margin: '0 0 1rem', lineHeight: 1.2 }}>اختر خطتك الأمثل</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', margin: 0 }}>اشترك شهرياً أو سنوياً بخصم 20%، أو اشترِ حزمة كورسات مجمّعة بسعر مخفض</p>
        </div>

        {/* Tab Switch */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.25rem', display: 'flex' }}>
            {[
              { key: 'subscription', label: '📅 الاشتراكات الشهرية' },
              { key: 'bundles', label: '📦 حزم الكورسات' }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                style={{ padding: '0.75rem 2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s', background: activeTab === tab.key ? '#CBA153' : 'transparent', color: activeTab === tab.key ? '#000' : 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'subscription' && (
            <motion.div key="sub" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {/* Billing Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
                <span style={{ color: billingPeriod === 'MONTHLY' ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>شهري</span>
                <div onClick={() => setBillingPeriod(p => p === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')}
                  style={{ width: 52, height: 28, background: billingPeriod === 'YEARLY' ? '#CBA153' : 'rgba(255,255,255,0.1)', borderRadius: '14px', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ position: 'absolute', top: 3, right: billingPeriod === 'YEARLY' ? 3 : 25, width: 22, height: 22, background: '#fff', borderRadius: '50%', transition: 'right 0.3s' }} />
                </div>
                <span style={{ color: billingPeriod === 'YEARLY' ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                  سنوي <span style={{ background: '#22c55e', color: '#000', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '100px', marginRight: '0.25rem', fontWeight: 'bold' }}>وفر 20%</span>
                </span>
              </div>

              {/* Plans */}
              {plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
                  <Crown size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                  <p>لا توجد خطط اشتراك متاحة حالياً. يمكن للأدمن إضافتها من لوحة التحكم.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {plans.map((plan: any, i: number) => {
                    const PlanIcon = planIcons[i % planIcons.length];
                    const color = planColors[i % planColors.length];
                    const price = billingPeriod === 'YEARLY' ? plan.priceYearly / 12 : plan.priceMonthly;
                    const features = JSON.parse(plan.features || '[]');
                    const isPopular = i === 1;

                    return (
                      <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        style={{ background: isPopular ? `rgba(203,161,83,0.08)` : 'rgba(255,255,255,0.02)', border: `2px solid ${isPopular ? 'rgba(203,161,83,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '24px', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                        {isPopular && (
                          <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: '#CBA153', color: '#000', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '100px' }}>
                            ⭐ الأشهر
                          </div>
                        )}
                        <PlanIcon color={color} size={32} style={{ marginBottom: '1rem' }} />
                        <h2 style={{ margin: '0 0 0.5rem', fontWeight: 900, fontSize: '1.5rem' }}>{plan.name}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>{plan.description}</p>
                        <div style={{ marginBottom: '2rem' }}>
                          <span style={{ fontSize: '3rem', fontWeight: 900, color }}>${price.toFixed(2)}</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}> /شهر</span>
                          {billingPeriod === 'YEARLY' && (
                            <div style={{ fontSize: '0.8rem', color: '#22c55e', marginTop: '0.25rem' }}>
                              إجمالي سنوي: ${plan.priceYearly.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <ul style={{ listStyle: 'none', margin: '0 0 2rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {features.map((f: string, fi: number) => (
                            <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                              <Check color={color} size={16} style={{ flexShrink: 0 }} />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <Link href={`/checkout?planId=${plan.id}&period=${billingPeriod}`}
                          style={{ display: 'block', textAlign: 'center', padding: '0.875rem', background: isPopular ? '#CBA153' : `${color}20`, border: `1px solid ${isPopular ? '#CBA153' : color}`, color: isPopular ? '#000' : color, borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', transition: 'all 0.3s' }}>
                          اشترك الآن
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'bundles' && (
            <motion.div key="bundles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {bundles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
                  <Package size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                  <p>لا توجد حزم متاحة حالياً. يمكن للأدمن إنشاء حزم كورسات من لوحة التحكم.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                  {bundles.map((bundle: any, i: number) => {
                    const totalOriginal = bundle.courses.reduce((s: number, bc: any) => s + bc.course.price, 0);
                    const savings = totalOriginal - bundle.price;
                    const savingsPercent = totalOriginal > 0 ? Math.round((savings / totalOriginal) * 100) : 0;

                    return (
                      <motion.div key={bundle.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', overflow: 'hidden' }}>
                        {bundle.thumbnail && (
                          <div style={{ height: '160px', background: `url(${bundle.thumbnail}) center/cover`, position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,5,5,0.9), transparent)' }} />
                            {savingsPercent > 0 && (
                              <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#ef4444', color: '#fff', fontWeight: 'bold', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.85rem' }}>
                                وفّر {savingsPercent}%
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ padding: '1.5rem' }}>
                          <h2 style={{ margin: '0 0 0.5rem', fontWeight: 900 }}>{bundle.title}</h2>
                          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>{bundle.description}</p>
                          <div style={{ marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#CBA153' }}>${bundle.price}</span>
                            {totalOriginal > bundle.price && (
                              <span style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontSize: '1.1rem', marginRight: '0.75rem' }}>${totalOriginal}</span>
                            )}
                          </div>
                          <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ margin: '0 0 0.75rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 'bold' }}>يتضمن {bundle.courses.length} كورس:</p>
                            {bundle.courses.map((bc: any) => (
                              <div key={bc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                                <Check color="#22c55e" size={14} style={{ flexShrink: 0 }} />
                                {bc.course.title}
                              </div>
                            ))}
                          </div>
                          <Link href={`/checkout?bundleId=${bundle.id}`}
                            style={{ display: 'block', textAlign: 'center', padding: '0.875rem', background: 'linear-gradient(135deg, #CBA153, #d4a857)', color: '#000', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' }}>
                            احصل على الحزمة الآن
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guarantee */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ textAlign: 'center', marginTop: '4rem', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Shield color="#22c55e" size={32} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>ضمان استرجاع الأموال خلال 7 أيام</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>إذا لم تكن راضياً تماماً، سنرد لك أموالك بالكامل دون أسئلة.</p>
        </motion.div>

      </motion.div>
    </div>
  );
}
