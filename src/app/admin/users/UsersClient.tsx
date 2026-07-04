'use client';

import { useState } from 'react';
import { Search, Edit, Trash2, CheckCircle, XCircle, UserX, Shield, Users as UsersIcon, Crown } from 'lucide-react';

const OWNER_EMAILS = ['qasemalsokhny@gmail.com'];

export default function UsersClient({ initialUsers, currentUserEmail }: { initialUsers: any[], currentUserEmail: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState('');
  const [editWalletSYP, setEditWalletSYP] = useState('');
  const [editWalletUSD, setEditWalletUSD] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || 
                          user.email.toLowerCase().includes(search.toLowerCase()) ||
                          (user.phone && user.phone.includes(search));
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditWalletSYP(user.walletSYP.toString());
    setEditWalletUSD(user.walletUSD.toString());
    setMsg({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          walletSYP: editWalletSYP,
          walletUSD: editWalletUSD
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.id === editingUser.id ? data.user : u));
        setMsg({ type: 'success', text: data.message });
        setTimeout(() => setEditingUser(null), 1500);
      } else {
        setMsg({ type: 'error', text: data.error || 'حدث خطأ' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'خطأ في الاتصال' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
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
            placeholder="بحث بالاسم، الإيميل، أو رقم الهاتف..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
          />
        </div>
        <select 
          value={filterRole} 
          onChange={e => setFilterRole(e.target.value)}
          style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="ALL" style={{ background: '#000' }}>جميع الصلاحيات</option>
          <option value="STUDENT" style={{ background: '#000' }}>طالب</option>
          <option value="INSTRUCTOR" style={{ background: '#000' }}>مدرب</option>
          <option value="ADMIN" style={{ background: '#000' }}>مدير</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>المستخدم</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>رقم الهاتف</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>الصلاحية</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>رصيد (ل.س)</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)' }}>رصيد ($)</th>
              <th style={{ padding: '1rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const isUserOwner = OWNER_EMAILS.includes(user.email.toLowerCase());
              const isCurrentUserOwner = OWNER_EMAILS.includes(currentUserEmail.toLowerCase());
              
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {user.name} 
                      {isUserOwner && <span><Crown size={16} color="#fbbf24" /></span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '1rem', color: user.phone ? '#fff' : 'rgba(255,255,255,0.3)', direction: 'ltr', textAlign: 'right' }}>
                    {user.phone || 'غير محدد'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                      background: isUserOwner ? 'rgba(251, 191, 36, 0.1)' : user.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.1)' : user.role === 'INSTRUCTOR' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: isUserOwner ? '#fbbf24' : user.role === 'ADMIN' ? '#ef4444' : user.role === 'INSTRUCTOR' ? '#3b82f6' : '#22c55e'
                    }}>
                      {isUserOwner ? 'المالك (OWNER)' : user.role === 'ADMIN' ? 'مدير' : user.role === 'INSTRUCTOR' ? 'مدرب' : 'طالب'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{user.walletSYP.toLocaleString()} ل.س</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>${user.walletUSD.toLocaleString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {(!isUserOwner || isCurrentUserOwner) ? (
                      <>
                        <button onClick={() => handleEditClick(user)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.5rem', marginRight: '0.5rem' }}>
                          <Edit size={18} />
                        </button>
                        {!isUserOwner && (
                          <button onClick={() => handleDelete(user.id, user.name)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem' }}>
                            <Trash2 size={18} />
                          </button>
                        )}
                      </>
                    ) : (
                      <span title="محمي (مخصص للمالك فقط)"><Shield size={18} color="rgba(255,255,255,0.2)" /></span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  <UsersIcon size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  لا يوجد مستخدمين يطابقون بحثك
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>تعديل المستخدم</h2>
            
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{editingUser.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{editingUser.email}</div>
            </div>

            {msg.text && (
              <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '8px', background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: msg.type === 'error' ? '#ef4444' : '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {msg.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />} {msg.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>الصلاحية (Role)</label>
                <select 
                  value={editRole} 
                  onChange={e => setEditRole(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                >
                  <option value="STUDENT" style={{ background: '#111' }}>طالب (STUDENT)</option>
                  <option value="INSTRUCTOR" style={{ background: '#111' }}>مدرب (INSTRUCTOR)</option>
                  <option value="ADMIN" style={{ background: '#111' }}>مدير (ADMIN)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>الرصيد بالليرة السورية</label>
                <input 
                  type="number" 
                  value={editWalletSYP}
                  onChange={e => setEditWalletSYP(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>الرصيد بالدولار</label>
                <input 
                  type="number" 
                  value={editWalletUSD}
                  onChange={e => setEditWalletUSD(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={handleSave} 
                disabled={isSubmitting}
                style={{ flex: 1, padding: '0.8rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button 
                onClick={() => { setEditingUser(null); setMsg({ type: '', text: '' }); }}
                style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
