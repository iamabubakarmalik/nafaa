import { ImageResponse } from 'next/og';
import { getIntegration } from '@/lib/data/integrations';

export const runtime = 'edge';
export const alt = 'Nafaa — integration';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props { params: { slug: string } }

export default async function OGImage({ params }: Props) {
  const integration = getIntegration(params.slug);
  if (!integration) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0e27 0%, #151b30 100%)',
          padding: 72, position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -200, left: -200, width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${integration.color}55, transparent 70%)`, display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg, #32d583, #027a48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: 'white', fontSize: 42, fontWeight: 800 }}>N</div>
            </div>
            <div style={{ color: 'white', fontSize: 32, fontWeight: 800 }}>Nafaa</div>
          </div>
          {integration.status === 'live' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 999, background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.5)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
              <div style={{ color: '#a6f4c5', fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>LIVE</div>
            </div>
          )}
        </div>

        {/* Big × sign meaning "connect" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 80 }}>
          <div style={{ width: 160, height: 160, borderRadius: 32, background: 'linear-gradient(135deg, #12b76a, #027a48)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 84, color: 'white', fontWeight: 800 }}>
            N
          </div>
          <div style={{ color: 'white', fontSize: 72, fontWeight: 400, opacity: 0.5 }}>×</div>
          <div style={{ width: 160, height: 160, borderRadius: 32, background: `${integration.color}30`, border: `4px solid ${integration.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 96 }}>
            {integration.logo}
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: integration.color, fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Integration</div>
          <div style={{ color: 'white', fontSize: 68, fontWeight: 800, marginTop: 8 }}>Nafaa × {integration.name}</div>
          <div style={{ color: '#c9d0e0', fontSize: 26, marginTop: 16, maxWidth: 900 }}>{integration.descriptionEn}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
