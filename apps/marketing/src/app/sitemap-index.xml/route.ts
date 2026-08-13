const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export function GET() {
  const now = new Date().toISOString();
  const sitemaps = [
    { loc: `${SITE_URL}/sitemap.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-news.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-images.xml`, lastmod: now },
    { loc: `${SITE_URL}/sitemap-videos.xml`, lastmod: now },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
