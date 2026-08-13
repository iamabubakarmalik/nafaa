import { industries } from '@/lib/data/industries';
import { integrations } from '@/lib/data/integrations';
import { features } from '@/lib/data/features';
import { blogPosts } from '@/lib/data/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

function xml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

export function GET() {
  const entries: Array<{ loc: string; images: Array<{ url: string; title: string; caption: string }> }> = [];

  // Home
  entries.push({
    loc: SITE_URL,
    images: [{ url: `${SITE_URL}/og/og-default.png`, title: 'Nafaa Pakistan Business Platform', caption: "Pakistan's #1 complete business platform" }],
  });

  // Industries
  industries.forEach((i) => {
    entries.push({
      loc: `${SITE_URL}/industries/${i.slug}`,
      images: [{
        url: `${SITE_URL}/og/og-industry-${i.slug}.png`,
        title: `${i.nameEn} Software Pakistan`,
        caption: i.tagEn,
      }],
    });
  });

  // Features
  features.forEach((f) => {
    entries.push({
      loc: `${SITE_URL}/product/${f.slug}`,
      images: [{
        url: `${SITE_URL}/og/og-${f.slug}.png`,
        title: `Nafaa ${f.nameEn}`,
        caption: f.taglineEn,
      }],
    });
  });

  // Blog posts
  blogPosts.slice(0, 100).forEach((p: any) => {
    if (p.image) {
      entries.push({
        loc: `${SITE_URL}/blog/${p.slug}`,
        images: [{
          url: p.image.startsWith('http') ? p.image : `${SITE_URL}${p.image}`,
          title: p.title || p.titleEn || '',
          caption: p.excerpt || p.description || '',
        }],
      });
    }
  });

  const body = entries.map((e) => `
  <url>
    <loc>${xml(e.loc)}</loc>
    ${e.images.map((img) => `<image:image>
      <image:loc>${xml(img.url)}</image:loc>
      <image:title>${xml(img.title)}</image:title>
      <image:caption>${xml(img.caption)}</image:caption>
    </image:image>`).join('\n    ')}
  </url>`).join('');

  const xmlOut = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}
</urlset>`;

  return new Response(xmlOut, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
