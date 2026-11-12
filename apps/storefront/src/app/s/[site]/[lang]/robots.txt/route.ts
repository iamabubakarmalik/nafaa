/** robots.txt: crawl the shop when it is live, block cart/checkout/account/search; block all otherwise. */
import { indexable } from '@/lib/seo';
import { loadSite } from '@/lib/store';

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ site: string; lang: string }> }) {
  const p = await params;
  const ctx = await loadSite(p.site, p.lang);
  const body = indexable(ctx)
    ? `User-agent: *\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\nDisallow: /search\nDisallow: /orders\nDisallow: /api/\nAllow: /\n\nSitemap: ${ctx.origin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
