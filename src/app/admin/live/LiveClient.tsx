'use client';

import { useState } from 'react';
import { Search, Radio, StopCircle, Trash2, Video, Users, CheckCircle, Edit } from 'lucide-react';

export default function LiveClient({ initialStreams, initialInstructors }: { initialStreams: any[], initialInstructors: any[] }) {
  const [streams, setStreams] = useState(initialStreams);
  const [instructors, setInstructors] = useState(initialInstructors || []);
  const [activeTab, setActiveTab] = useState<'STREAMS' | 'QUOTAS'>('STREAMS');
  const [editingInstructor, setEditingInstructor] = useState<any>(null);
  const [editQuota, setEditQuota] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredStreams = streams.filter(stream => {
    const matchesSearch = stream.title.toLowerCase().includes(search.toLowerCase()) || 
                          stream.instructor.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || stream.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleEndStream = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من إنهاء البث المباشر "${title}" قسرياً؟`)) return;
    
    try {
      const res = await fetch(`/api/admin/live/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' })
      });
      const data = await res.json();
      
      if (res.ok) {
        setStreams(streams.map(s => s.id === id ? data.stream : s));
        alert(data.message);
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف البث المباشر "${title}" من السجلات نهائياً؟`)) return;
    
    try {
      const res = await fetch(`/api/admin/live/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok) {
        setStreams(streams.filter(s => s.id !== id));
        alert(data.message);
      } else {
        alert(data.error || 'حدث خطأ أثناء الحذف');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  const handleSaveQuota = async () => {
    if (!editingInstructor) return;
    setIsSubmitting(true);
    try {
      // Re-use the users API to update maxLiveStreams
      const res = await fetch(`/api/admin/users/${editingInstructor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'INSTRUCTOR', // keep role
          maxLiveStreams: editQuota
        })
      });
      const data = await res.json();
      if (res.ok) {
        setInstructors(instructors.map(ins => ins.id === editingInstructor.id ? { ...ins, maxLiveStreams: parseInt(editQuota) || 5 } : ins));
        setEditingInstructor(null);
        alert('تم التحديث بنجاح');
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch (e) {
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('STREAMS')}
          style={{ 
            background: activeTab === 'STREAMS' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'STREAMS' ? '#000' : '#fff',
            border: activeTab === 'STREAMS' ? 'none' : '1px solid rgba(255,255,255,0.2)',
            padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Video size={18} /> إدارة البثوث
        </button>
        <button 
          onClick={() => setActiveTab('QUOTAS')}
          style={{ 
            background: activeTab === 'QUOTAS' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'QUOTAS' ? '#000' : '#fff',
            border: activeTab === 'QUOTAS' ? 'none' : '1px solid rgba(255,255,255,0.2)',
            padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Users size={18} /> حصص المدربين
        </button>
      </div>

      {activeTab === 'STREAMS' && (
        <>
          {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input 
            type="text" 
            placeholder="بحث باسم البث أو المدرب..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="ALL" style={{ background: '#000' }}>جميع الحالات</option>
          <option value="live" style={{ background: '#000' }}>مباشر الآن</option>
          <option value="upcoming" style={{ background: '#000' }}>مجدول (قادم)</option>
          <option value="ended" style={{ background: '#000' }}>منتهي</option>
        </select>
      </div>

      {/* Streams Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>البث المباشر</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>المدرب</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>موعد البث</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>الحالة</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredStreams.map(stream => (
              <tr key={stream.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Video size={16} color="var(--primary)" /> {stream.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{stream.description || 'لا يوجد وصف'}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ color: '#fff' }}>{stream.instructor.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{stream.instructor.email}</div>
                </td>
                <td style={{ padding: '1rem', direction: 'ltr', textAlign: 'right' }}>
                  {new Date(stream.scheduledAt).toLocaleString('ar-SA')}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    background: stream.status === 'live' ? 'rgba(239, 68, 68, 0.1)' : stream.status === 'upcoming' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                    color: stream.status === 'live' ? '#ef4444' : stream.status === 'upcoming' ? '#3b82f6' : 'rgba(255,255,255,0.5)'
                  }}>
                    {stream.status === 'live' && <Radio size={14} className="animate-pulse" />}
                    {stream.status === 'live' ? 'مباشر الآن' : stream.status === 'upcoming' ? 'مجدول' : 'منتهي'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    {stream.status === 'live' && (
                      <button onClick={() => handleEndStream(stream.id, stream.title)} title="إنهاء البث قسرياً" style={{ background: 'rgba(251, 191, 36, 0.1)', border: 'none', color: '#fbbf24', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem' }}>
                        <StopCircle size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(stream.id, stream.title)} title="حذف من السجلات" style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredStreams.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  <Video size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  لا يوجد بثوث مباشرة تطابق بحثك
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </>
      )}

      {activeTab === 'QUOTAS' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>المدرب</th>
                <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>حصة البثوث</th>
                <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((ins: any) => (
                <tr key={ins.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{ins.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{ins.email}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {ins.maxLiveStreams || 5} بثوث
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => { setEditingInstructor(ins); setEditQuota(ins.maxLiveStreams?.toString() || '5'); }} 
                      style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Edit size={16} /> تعديل الحصة
                    </button>
                  </td>
                </tr>
              ))}
              {instructors.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    لا يوجد مدربين في المنصة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Quota Modal */}
      {editingInstructor && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>تعديل حصة المدرب</h2>
            <div style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1.1rem' }}>{editingInstructor.name}</div>
            
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>عدد البثوث المسموحة</label>
            <input 
              type="number" 
              value={editQuota}
              onChange={e => setEditQuota(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none', marginBottom: '2rem' }}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleSaveQuota} 
                disabled={isSubmitting}
                style={{ flex: 1, padding: '0.8rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button 
                onClick={() => setEditingInstructor(null)}
                style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
