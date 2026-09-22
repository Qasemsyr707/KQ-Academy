'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '0.6rem 1.4rem',
        background: 'rgba(203,161,83,0.15)',
        border: '1px solid rgba(203,161,83,0.4)',
        color: '#cba153',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontFamily: "'Montserrat', sans-serif"
      }}
    >
      Download / Print PDF
    </button>
  );
}
