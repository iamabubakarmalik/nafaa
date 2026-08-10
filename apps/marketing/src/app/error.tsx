'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, margin: 0 }}>Oops</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>
        Something went wrong
      </h2>
      <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
        We are working on fixing this. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          color: 'white',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
