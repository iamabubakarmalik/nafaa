/**
 * sitemap.xml: home, gates, legal pages, every listed shop and product, each
 * with its Urdu and Roman Urdu alternates. Shops and products are paged from
 * the API (capped so the sitemap stays under the 50k URL limit); refreshed
 * hourly.
 */
import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { href, LANGS } from '@/lib/i18n';
import { HREFLANG } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

function entry(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${href('en', path)}`,
    changeFrequency,
    priority,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [HREFLANG[l], `${SITE_URL}${href(l, path)}`])) },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = [entry('/', 1, 'daily')];
  const config = await api.config().catch(() => null);
  for (const g of config?.gates ?? []) out.push(entry(`/${g.slug}`, 0.9, 'daily'));
  for (const p of ['/about', '/terms', '/privacy', '/refund']) out.push(entry(p, 0.3, 'yearly'));

  for (let page = 1; page <= 50; page++) {
    const res = await api.shops({ limit: 100, page }).catch(() => null);
    if (!res) break;
    for (const s of res.items) out.push(entry(`/shop/${s.slug}`, 0.8, 'daily'));
    if (!res.hasMore) break;
  }
  for (let page = 1; page <= 100; page++) {
    const res = await api.products({ limit: 100, page, sort: 'newest' }).catch(() => null);
    if (!res) break;
    for (const p of res.items) out.push(entry(`/p/${p.productId}`, 0.6, 'weekly'));
    if (!res.hasMore || out.length > 15000) break;
  }
  return out;
}
