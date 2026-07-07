'use client';

import { useEffect } from 'react';

export default function PrintTrigger() {
  useEffect(() => {
    // Small delay to ensure styles and fonts are loaded before printing
    const timeout = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <style jsx global>{`
      @media print {
        body * {
          visibility: hidden;
        }
        #certificate-container, #certificate-container * {
          visibility: visible;
        }
        #certificate-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          margin: 0;
          padding: 0;
          box-shadow: none !important;
          border: none !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `}</style>
  );
}
