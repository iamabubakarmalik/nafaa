/**
 * robots.txt (ARCH 9). Staging (SITE_INDEXABLE != true) disallows everything.
 * Production allows all crawlers, AI crawlers named explicitly, keeps /api/
 * out, and lists only the sitemap index.
 */
import type { MetadataRoute } from 'next';
import { absoluteUrl, siteIndexable } from '@/lib/cms/env';

const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];

export default function robots(): MetadataRoute.Robots {
  if (!siteIndexable()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/_dev/'] },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: ['/api/', '/_dev/'] },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
