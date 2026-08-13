import { blogPosts } from '@/lib/data/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

export function GET() {
  // Only posts from last 2 days qualify for Google News
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const recent = blogPosts.filter((p: any) => {
    const d = new Date(p.date || p.publishedAt || 0).getTime();
    return d > cutoff;
  });

  const items = recent
    .map((p: any) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const date = new Date(p.date || p.publishedAt || Date.now()).toISOString();
      return `
  <url>
    <loc>${url}</loc>
    <news:news>
      <news:publication>
        <news:name>Nafaa Blog</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${date}</news:publication_date>
      <news:title>${escapeXml(p.title || p.titleEn || '')}</news:title>
    </news:news>
  </url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${items}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
  });
}
