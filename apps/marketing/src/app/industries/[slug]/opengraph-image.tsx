import { ImageResponse } from 'next/og';
import { getIndustry } from '@/lib/data/industries';

export const runtime = 'edge';
export const alt = 'Nafaa — industry solution';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props { params: { slug: string } }

export default async function OGImage({ params }: Props) {
  const industry = getIndustry(params.slug);
  if (!industry) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0e27 0%, #151b30 50%, #053321 100%)',
          padding: 72, position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Aurora blob using industry color */}
        <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${industry.color}55, transparent 70%)`, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -250, left: -150, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)', display: 'flex' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg, #32d583, #027a48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'white', fontSize: 42, fontWeight: 800 }}>N</div>
          </div>
          <div style={{ color: 'white', fontSize: 32, fontWeight: 800 }}>Nafaa</div>
        </div>

        {/* Industry emoji + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 64 }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, background: `${industry.color}30`, border: `3px solid ${industry.color}80`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 }}>
            {industry.emoji}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: industry.color, fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Industry Solution</div>
            <div style={{ color: 'white', fontSize: 56, fontWeight: 800, marginTop: 4 }}>{industry.nameEn}</div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'white', fontSize: 44, fontWeight: 800, lineHeight: 1.15, maxWidth: 1000 }}>
            {industry.tagEn}
          </div>
          <div style={{ color: '#a6f4c5', fontSize: 24, marginTop: 20 }}>
            nafaa.pk/industries/{industry.slug}
          </div>
        </div>

        {/* Bottom feature pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {industry.keyFeatures.slice(0, 4).map((f) => (
            <div key={f} style={{ display: 'flex', padding: '10px 20px', borderRadius: 999, background: `${industry.color}20`, border: `1px solid ${industry.color}60`, color: 'white', fontSize: 20, fontWeight: 700 }}>
              ✓ {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
