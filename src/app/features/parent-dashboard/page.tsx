'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Clock, BookOpen, ChevronRight, Activity, Target, Shield } from 'lucide-react';
import Link from 'next/link';

export default function ParentDashboardPage() {
  const studentData = {
    name: 'أحمد',
    grade: 'الثالث الثانوي',
    attendance: 95,
    averageScore: 88,
    coursesCompleted: 4,
    hoursStudied: 120,
    recentActivity: [
      { id: 1, action: 'حضر البث المباشر لمادة الفيزياء', time: 'اليوم، 10:00 صباحاً', type: 'positive' },
      { id: 2, action: 'أكمل اختبار الكيمياء وحصل على 92%', time: 'أمس، 4:30 عصراً', type: 'positive' },
      { id: 3, action: 'لم يقم بتسليم الواجب الأسبوعي للرياضيات', time: 'منذ 3 أيام', type: 'negative' },
    ]
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', background: '#e0e7ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} color="#4f46e5" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>بوابة ولي الأمر</h1>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>متابعة الطالب: {studentData.name}</span>
          </div>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px', color: '#0f172a', fontWeight: '600', cursor: 'pointer' }}>
          <Shield size={16} /> تواصل مع الإدارة
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', background: '#dcfce7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={24} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>نسبة الحضور والتفاعل</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{studentData.attendance}%</div>
              </div>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
              <div style={{ width: `${studentData.attendance}%`, height: '100%', background: '#16a34a', borderRadius: '3px' }}></div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', background: '#fef08a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={24} color="#ca8a04" />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>معدل الدرجات</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{studentData.averageScore}%</div>
              </div>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
              <div style={{ width: `${studentData.averageScore}%`, height: '100%', background: '#eab308', borderRadius: '3px' }}></div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', background: '#e0e7ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} color="#4f46e5" />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>ساعات الدراسة المسجلة</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{studentData.hoursStudied} ساعة</div>
              </div>
            </div>
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Main Activity Log */}
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#0f172a' }}>النشاط الأخير</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {studentData.recentActivity.map((activity, index) => (
                <div key={activity.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  {index !== studentData.recentActivity.length - 1 && (
                    <div style={{ position: 'absolute', top: '30px', bottom: '-20px', right: '15px', width: '2px', background: '#e2e8f0' }}></div>
                  )}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: activity.type === 'positive' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: activity.type === 'positive' ? '#16a34a' : '#ef4444' }}></div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>{activity.action}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <button style={{ width: '100%', marginTop: '2rem', padding: '1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>
              عرض التقرير المفصل الشهري
            </button>
          </div>

          {/* Tips for Parents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', padding: '2rem', borderRadius: '24px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(59,130,246,0.3)' }}>
              <TrendingUp size={32} color="#fff" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>مؤشر الأداء يرتفع!</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                نلاحظ تحسناً بنسبة 15% في درجات الطالب في مادة الرياضيات مقارنة بالشهر الماضي. استمروا في تشجيعه!
              </p>
            </div>

            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a' }}>توصيات المعلمين</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: '#475569', fontSize: '0.9rem' }}>
                  <div style={{ color: '#eab308', marginTop: '2px' }}>•</div>
                  التركيز أكثر على حل المسائل العملية في الفيزياء.
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: '#475569', fontSize: '0.9rem' }}>
                  <div style={{ color: '#eab308', marginTop: '2px' }}>•</div>
                  حضور البث المباشر القادم للمراجعة الشاملة.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
