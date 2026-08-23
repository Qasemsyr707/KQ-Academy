import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { User, Mail, Phone, Calendar, ShieldCheck, Trophy, Award } from 'lucide-react';
import ProfileFormClient from './ProfileFormClient';
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      enrollments: true,
      quizAttempts: true,
      certificates: true
    }
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: 'clamp(1.5rem, 4vw, 4rem) clamp(1rem, 5%, 5%)' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .profile-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: start; }
        .profile-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr; }
          .profile-stats { grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
          .profile-card { text-align: center !important; }
          .stat-num { font-size: 1.4rem !important; }
        }
        @media (max-width: 420px) {
          .profile-stats { grid-template-columns: 1fr; }
        }
      `}} />
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontWeight: 'bold', marginBottom: '2rem' }}>الملف الشخصي</h1>
        
        <div className="profile-grid">
          
          {/* Profile Card */}
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ 
              width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #b45309)', 
              margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', fontWeight: 'bold', color: '#000'
            }}>
              {user.name.charAt(0)}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{user.name}</h2>
            <div style={{ display: 'inline-block', background: 'rgba(203, 161, 83, 0.1)', color: 'var(--primary)', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {user.role === 'ADMIN' ? 'مدير' : user.role === 'INSTRUCTOR' ? 'مدرب' : 'طالب'}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                <Mail size={18} /> {user.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                <Phone size={18} /> {user.phone || 'غير محدد'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                <Calendar size={18} /> انضم في {user.createdAt.toLocaleDateString('ar-SA')}
              </div>
            </div>
          </div>

          {/* Stats & Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Quick Stats */}
            <div className="profile-stats">
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <ShieldCheck size={24} color="#22c55e" />
                </div>
                <h3 className="stat-num" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{user.enrollments.length}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>كورسات مسجلة</p>
              </div>
              
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(203, 161, 83, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <Trophy size={24} color="var(--primary)" />
                </div>
                <h3 className="stat-num" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{user.points.toLocaleString()}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>نقطة خبرة (XP)</p>
              </div>
              
              <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <Award size={24} color="#a855f7" />
                </div>
                <h3 className="stat-num" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{user.certificates.length}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>شهادة معتمدة</p>
              </div>
            </div>

            {/* Account Settings */}
            <ProfileFormClient user={user} />

          </div>
        </div>
      </div>
    </div>
  );
}
