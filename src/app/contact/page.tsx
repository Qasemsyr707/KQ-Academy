import { MapPin, MessageCircle, Mail, Phone } from 'lucide-react';

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--primary)', textAlign: 'center' }}>تواصل معنا</h1>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: '3rem' }}>نحن هنا للإجابة على استفساراتكم ومساعدتكم في أي وقت.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Contact Info */}
          <div style={{ background: 'rgba(15,15,15,0.8)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>معلومات التواصل</h3>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(203,161,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <MapPin size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>العنوان</h4>
                <p style={{ margin: 0, fontWeight: 'bold' }}>دمشق، سوريا (F8Q4 542)</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(203,161,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Phone size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>رقم الهاتف</h4>
                <a href="tel:0930108455" dir="ltr" style={{ margin: 0, fontWeight: 'bold', color: '#fff', textDecoration: 'none', display: 'inline-block' }}>0930 108 455</a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(203,161,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Mail size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>البريد الإلكتروني</h4>
                <a href="mailto:support@kqacademy.com" style={{ margin: 0, fontWeight: 'bold', color: '#fff', textDecoration: 'none' }}>support@kqacademy.com</a>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(203,161,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <MessageCircle size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>فيسبوك</h4>
                <a href="https://www.facebook.com/profile.php?id=61594346671502" target="_blank" rel="noopener noreferrer" style={{ margin: 0, fontWeight: 'bold', color: '#fff', textDecoration: 'none' }}>KQ Academy | Damascus</a>
              </div>
            </div>
          </div>

          {/* Map */}
          <div style={{ background: 'rgba(15,15,15,0.8)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', height: '100%', minHeight: '300px', borderRadius: '16px', overflow: 'hidden', background: '#222', position: 'relative' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3326.680072049833!2d36.3052526!3d33.4878864!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1518e0df95117c7f%3A0x8159565daeed95ce!2zRjhRNCA1NDLYjCDYr9mF2LTZgtiMINiz2YjYsdmK2KfigK0!5e0!3m2!1sar!2s!4v1700000000000!5m2!1sar!2s" 
                width="100%" 
                height="100%" 
                style={{ border: 0, position: 'absolute', top: 0, left: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <a href="https://maps.app.goo.gl/d2bsA5odCFawDYgC8" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '1rem', background: 'var(--primary)', color: '#000', fontWeight: 'bold', borderRadius: '12px', marginTop: '1rem', textDecoration: 'none' }}>
              فتح في خرائط جوجل
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
