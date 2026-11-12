/** sitemap.xml for the shop on its primary host (data from the API's sitemap endpoint). */
import { api } from '@/lib/api';
import { indexable } from '@/lib/seo';
import { loadSite } from '@/lib/store';

export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET(_req: Request, { params }: { params: Promise<{ site: string; lang: string }> }) {
  const p = await params;
  const ctx = await loadSite(p.site, p.lang);
  const sm = indexable(ctx) ? await api.sitemap(ctx.storeId) : null;
  const rows: string[] = [];
  const add = (loc: string, lastmod?: string, image?: string | null) =>
    rows.push(`<url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : ''}${image ? `<image:image><image:loc>${esc(image)}</image:loc></image:image>` : ''}</url>`);
  if (sm) {
    add(sm.base || ctx.origin);
    sm.collections.forEach((x) => add(x.url, x.updatedAt));
    sm.products.forEach((x) => add(x.url, x.updatedAt, x.image));
    sm.pages.forEach((x) => add(x.url, x.updatedAt));
    sm.blogs.forEach((x) => add(x.url, x.updatedAt));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${rows.join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
