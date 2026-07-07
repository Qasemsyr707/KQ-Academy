'use client';

import { useState } from 'react';
import { Search, Edit, Trash2, CheckCircle, XCircle, Book, DollarSign, Image as ImageIcon, Users } from 'lucide-react';
import Image from 'next/image';

export default function CoursesClient({ initialCourses }: { initialCourses: any[] }) {
  const [courses, setCourses] = useState(initialCourses);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPriceSYP, setEditPriceSYP] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) || 
                          course.instructor.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || course.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleEditClick = (course: any) => {
    setEditingCourse(course);
    setEditStatus(course.status);
    setEditTitle(course.title);
    setEditPrice(course.price.toString());
    setEditPriceSYP(course.priceSYP.toString());
    setMsg({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (!editingCourse) return;
    setIsSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          title: editTitle,
          price: editPrice,
          priceSYP: editPriceSYP
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCourses(courses.map(c => c.id === editingCourse.id ? data.course : c));
        setMsg({ type: 'success', text: data.message });
        setTimeout(() => setEditingCourse(null), 1500);
      } else {
        setMsg({ type: 'error', text: data.error || 'حدث خطأ' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'خطأ في الاتصال' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف الكورس "${title}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع اشتراكات الطلاب فيه.`)) return;
    
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok) {
        setCourses(courses.filter(c => c.id !== id));
        alert(data.message);
      } else {
        alert(data.error || 'حدث خطأ أثناء الحذف');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input 
            type="text" 
            placeholder="بحث باسم الكورس أو المدرب..." 
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
          <option value="PUBLISHED" style={{ background: '#000' }}>منشور (Published)</option>
          <option value="PENDING" style={{ background: '#000' }}>قيد المراجعة (Pending)</option>
          <option value="REJECTED" style={{ background: '#000' }}>مرفوض (Rejected)</option>
        </select>
      </div>

      {/* Courses Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>الكورس</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>المدرب</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>السعر</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>الحالة</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>الطلاب</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map(course => (
              <tr key={course.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', flexShrink: 0, position: 'relative' }}>
                      {course.thumbnail ? (
                        <Image src={course.thumbnail} alt={course.title} fill style={{ objectFit: 'cover' }} unoptimized />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} color="rgba(255,255,255,0.3)" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.3rem' }}>{course.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{course.category} • {course._count.lessons} درس</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ color: '#fff' }}>{course.instructor.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{course.instructor.email}</div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                  <div><strong>SYP:</strong> {course.priceSYP.toLocaleString()}</div>
                  <div><strong>USD:</strong> ${course.price.toLocaleString()}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                    background: course.status === 'PUBLISHED' ? 'rgba(34, 197, 94, 0.1)' : course.status === 'PENDING' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: course.status === 'PUBLISHED' ? '#22c55e' : course.status === 'PENDING' ? '#fbbf24' : '#ef4444'
                  }}>
                    {course.status === 'PUBLISHED' ? 'منشور' : course.status === 'PENDING' ? 'قيد المراجعة' : 'مرفوض'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#fff', fontWeight: 'bold' }}>
                    <Users size={16} color="rgba(255,255,255,0.5)" /> {course._count.enrollments}
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button onClick={() => handleEditClick(course)} style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(course.id, course.title)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', padding: '0.5rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCourses.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  <Book size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  لا يوجد كورسات تطابق بحثك
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCourse && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>إدارة الكورس</h2>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.3rem' }}>{editingCourse.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>المدرب: {editingCourse.instructor.name}</div>
            </div>

            {msg.text && (
              <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '8px', background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: msg.type === 'error' ? '#ef4444' : '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {msg.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />} {msg.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>حالة الكورس (Status)</label>
                <select 
                  value={editStatus} 
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="PENDING" style={{ background: '#111' }}>قيد المراجعة (لا يظهر للطلاب)</option>
                  <option value="PUBLISHED" style={{ background: '#111' }}>منشور (يظهر للطلاب ومتاح للبيع)</option>
                  <option value="REJECTED" style={{ background: '#111' }}>مرفوض (محجوب بالكامل)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>عنوان الكورس (إجباري في حال التعديل)</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>السعر بالسوري (ل.س)</label>
                  <input 
                    type="number" 
                    value={editPriceSYP}
                    onChange={e => setEditPriceSYP(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>السعر بالدولار ($)</label>
                  <input 
                    type="number" 
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleSave} 
                disabled={isSubmitting}
                style={{ flex: 1, padding: '1rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, fontSize: '1rem' }}
              >
                {isSubmitting ? 'جاري التنفيذ...' : 'حفظ التغييرات'}
              </button>
              <button 
                onClick={() => { setEditingCourse(null); setMsg({ type: '', text: '' }); }}
                style={{ flex: 1, padding: '1rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
