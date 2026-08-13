const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

function xml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

// Populate with real YouTube videos when available
const videos = [
  {
    loc: `${SITE_URL}/demo`,
    title: 'Nafaa Product Demo — Pakistan POS Software',
    description: 'Full walkthrough of Nafaa POS: sales, inventory, khata, FBR integration.',
    thumbnail: `${SITE_URL}/og/og-default.png`,
    duration: 180,
    uploadDate: '2026-01-15',
    contentLoc: 'https://www.youtube.com/watch?v=DEMO_VIDEO_ID',
  },
  {
    loc: `${SITE_URL}/industries/kiryana`,
    title: 'How Kiryana Store Owners Use Nafaa in Pakistan',
    description: 'Real Karachi kiryana store using Nafaa daily. Urdu language demo.',
    thumbnail: `${SITE_URL}/og/og-industry-kiryana.png`,
    duration: 240,
    uploadDate: '2026-02-20',
    contentLoc: 'https://www.youtube.com/watch?v=KIRYANA_VIDEO_ID',
  },
];

export function GET() {
  const body = videos.map((v) => `
  <url>
    <loc>${xml(v.loc)}</loc>
    <video:video>
      <video:thumbnail_loc>${xml(v.thumbnail)}</video:thumbnail_loc>
      <video:title>${xml(v.title)}</video:title>
      <video:description>${xml(v.description)}</video:description>
      <video:content_loc>${xml(v.contentLoc)}</video:content_loc>
      <video:duration>${v.duration}</video:duration>
      <video:publication_date>${v.uploadDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>
    </video:video>
  </url>`).join('');

  const xmlOut = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${body}
</urlset>`;

  return new Response(xmlOut, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
