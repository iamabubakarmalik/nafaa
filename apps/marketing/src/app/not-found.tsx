import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 900, margin: 0, background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1rem' }}>
        Page not found
      </h2>
      <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          color: 'white',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
