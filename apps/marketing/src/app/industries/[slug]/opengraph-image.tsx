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
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: `linear-gradient(135deg, ${industry.color} 0%, ${industry.colorDark} 100%)`,
        padding: 72, position: 'relative', overflow: 'hidden', color: 'white',
      }}>
        {/* Aurora blobs */}
        <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${industry.auroraColors[1]}88, transparent 70%)`, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -250, left: -150, width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${industry.auroraColors[2]}55, transparent 70%)`, display: 'flex' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 800 }}>N</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>Nafaa</div>
        </div>

        {/* Emoji + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 64 }}>
          <div style={{ width: 130, height: 130, borderRadius: 32, background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>
            {industry.emoji}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.9 }}>Industry Solution</div>
            <div style={{ fontSize: 60, fontWeight: 800, marginTop: 4 }}>{industry.nameEn}</div>
          </div>
        </div>

        {/* Signature */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, opacity: 0.8, marginBottom: 12 }}>ONLY IN NAFAA</div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, maxWidth: 1000 }}>
            {industry.signature}
          </div>
        </div>

        {/* Bottom feature pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {industry.keyFeatures.slice(0, 4).map((f) => (
            <div key={f} style={{ display: 'flex', padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', fontSize: 20, fontWeight: 700 }}>
              ✓ {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
