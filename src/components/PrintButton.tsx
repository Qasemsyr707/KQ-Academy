'use client';

import React from 'react';
import { Download } from 'lucide-react';

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        backgroundColor: '#1e3a8a',
        color: '#fff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 50
      }}
      className="print-hide"
    >
      <Download size={20} />
      تحميل الشهادة (PDF)
    </button>
  );
}
