/** robots.txt: everything public is crawlable; customer pages and bridges are not. */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ['/api/', '/auth/', '/cart', '/checkout', '/orders', '/account', '/login', '/search'];
  const all = [...privatePaths, ...privatePaths.flatMap((p) => (p.startsWith('/api') || p.startsWith('/auth') ? [] : [`/ur${p}`, `/roman${p}`]))];
  return { rules: [{ userAgent: '*', allow: '/', disallow: all }], sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}
