import { ImageResponse } from 'next/og';
import { getFeature } from '@/lib/data/features';

export const runtime = 'edge';
export const alt = 'Nafaa — feature';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props { params: { slug: string } }

export default async function OGImage({ params }: Props) {
  const feature = getFeature(params.slug);
  if (!feature) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0e27 0%, #151b30 100%)',
          padding: 72, position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${feature.color}55, transparent 70%)`, display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg, #32d583, #027a48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'white', fontSize: 42, fontWeight: 800 }}>N</div>
          </div>
          <div style={{ color: 'white', fontSize: 32, fontWeight: 800 }}>Nafaa</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          <div style={{ color: feature.color, fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            {feature.category === 'core' ? 'Core Feature' : feature.category === 'advanced' ? 'Advanced Feature' : 'AI Intelligence'}
          </div>
          <div style={{ color: 'white', fontSize: 76, fontWeight: 800, marginTop: 12, lineHeight: 1.05 }}>{feature.nameEn}</div>
          <div style={{ color: '#c9d0e0', fontSize: 30, marginTop: 20, maxWidth: 960 }}>{feature.taglineEn}</div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {['Offline-first', 'English + اردو', 'Free to start', 'Real-time sync'].map((b) => (
            <div key={b} style={{ display: 'flex', padding: '10px 20px', borderRadius: 999, background: 'rgba(18,183,106,0.15)', border: '1px solid rgba(18,183,106,0.4)', color: '#a6f4c5', fontSize: 20, fontWeight: 700 }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
