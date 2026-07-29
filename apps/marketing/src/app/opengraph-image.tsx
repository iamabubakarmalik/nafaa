import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = "Nafaa — Pakistan's #1 Complete Business Platform";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0e27 0%, #151b30 50%, #053321 100%)',
          padding: 80, position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Aurora blobs */}
        <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(18,183,106,0.35), transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -250, left: -150, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)', display: 'flex' }} />

        {/* Logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, background: 'linear-gradient(135deg, #32d583, #027a48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'white', fontSize: 56, fontWeight: 800 }}>N</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: 'white', fontSize: 40, fontWeight: 800 }}>Nafaa</div>
            <div style={{ color: '#6ce9a6', fontSize: 20 }}>bazaar.nafaa.pk · nafaa.pk</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          <div style={{ color: 'white', fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            Pakistan&apos;s #1 Complete Business Platform
          </div>
          <div style={{ color: '#c9d0e0', fontSize: 32, marginTop: 24, maxWidth: 850 }}>
            POS · Marketplace · 30+ Integrations · FBR · Digital Khata · AI
          </div>
        </div>

        {/* Bottom badges */}
        <div style={{ display: 'flex', gap: 16, marginTop: 48 }}>
          {['18 Industries', '47 Cities', 'English + اردو', 'Free to start'].map((b) => (
            <div key={b} style={{ display: 'flex', padding: '12px 24px', borderRadius: 999, background: 'rgba(18,183,106,0.15)', border: '1px solid rgba(18,183,106,0.4)', color: '#a6f4c5', fontSize: 22, fontWeight: 700 }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
