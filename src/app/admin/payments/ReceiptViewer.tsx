'use client';

import { useState } from 'react';
import { Image as ImageIcon, XCircle } from 'lucide-react';

export default function ReceiptViewer({ base64String }: { base64String: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
      >
        <ImageIcon size={16} /> عرض الصورة
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }} onClick={() => setIsOpen(false)}>
          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
            {base64String.startsWith('data:application/pdf') || base64String.includes('.pdf') ? (
              <iframe src={base64String} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: '#fff' }} />
            ) : (
              <img 
                src={base64String} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  alert('الصورة غير صالحة أو تالفة.');
                  setIsOpen(false);
                }}
              />
            )}
          </div>
          <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
            <XCircle size={30} />
          </button>
        </div>
      )}
    </>
  );
}
