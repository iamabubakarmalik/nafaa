import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Nafaa — Pakistan\'s #1 Business Platform';
  const subtitle = searchParams.get('subtitle') || 'POS · Marketplace · Integrations · FBR · AI';
  const tag = searchParams.get('tag') || '';
  const color = searchParams.get('color') || '#12b76a';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0a0e27 0%, #151b30 100%)',
        padding: 72, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${color}55, transparent 70%)`, display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg, #32d583, #027a48)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'white', fontSize: 42, fontWeight: 800 }}>N</div>
          </div>
          <div style={{ color: 'white', fontSize: 32, fontWeight: 800 }}>Nafaa</div>
        </div>

        {tag && (
          <div style={{ marginTop: 40, display: 'flex', padding: '8px 20px', borderRadius: 999, background: `${color}30`, border: `1px solid ${color}80`, color, fontSize: 20, fontWeight: 700, width: 'fit-content' }}>
            {tag}
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'white', fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>{title}</div>
          <div style={{ color: '#c9d0e0', fontSize: 28, marginTop: 20, maxWidth: 950 }}>{subtitle}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
