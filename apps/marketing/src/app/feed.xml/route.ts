import { blogPosts } from '@/lib/data/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

export function GET() {
  const items = blogPosts
    .slice(0, 50)
    .map((p: any) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const date = new Date(p.date || p.publishedAt || Date.now()).toUTCString();
      return `
    <item>
      <title>${escapeXml(p.title || p.titleEn || '')}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${escapeXml(p.excerpt || p.description || '')}</description>
      <author>noreply@nafaa.pk (${escapeXml(p.author || 'Nafaa Team')})</author>
      ${(p.tags || []).map((t: string) => `<category>${escapeXml(t)}</category>`).join('')}
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nafaa Blog — Pakistan's #1 Business Platform</title>
    <link>${SITE_URL}/blog</link>
    <description>Insights, guides, and stories for Pakistani businesses.</description>
    <language>en-PK</language>
    <copyright>© 2026 Nafaa Technologies</copyright>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>Nafaa</title>
      <link>${SITE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
