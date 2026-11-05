/**
 * RSS 2.0 feed of the latest published blog posts, served at /blog/feed.xml
 * and at /feed.xml (the old site's address, still linked from other sites
 * and listed in Search Console). Both routes share this builder; the
 * channel's atom:link points at the address that was requested.
 *
 * Only live entries: fixtures never appear here. Cached with the posts list
 * (`type:en:BLOG_POST`), so a publish refreshes it.
 */
import { getEntries, getLayout } from '@/lib/cms/client';
import { absoluteUrl } from '@/lib/cms/env';
import { escapeXml } from './sitemap';

export const FEED_PATH = '/feed.xml';

export async function blogFeedResponse(selfPath: string): Promise<Response> {
  const [{ items }, { site }] = await Promise.all([
    getEntries({ type: 'BLOG_POST', sort: 'recent', limit: 50 }),
    getLayout(),
  ]);
  const self = absoluteUrl(selfPath);
  const blog = absoluteUrl('/blog');
  const lastBuild = items.find((item) => item.contentUpdatedAt)?.contentUpdatedAt;
  const entries = items
    .map((item) => {
      // Cards carry contentUpdatedAt (newer of edit and publish date) only.
      const date = item.contentUpdatedAt ? new Date(item.contentUpdatedAt).toUTCString() : null;
      return [
        '    <item>',
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
        item.summary ? `      <description>${escapeXml(item.summary)}</description>` : null,
        date ? `      <pubDate>${date}</pubDate>` : null,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${site.name} blog`)}</title>
    <link>${escapeXml(blog)}</link>
    <description>${escapeXml(`Latest posts from the ${site.name} blog`)}</description>
    <language>en-PK</language>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />${lastBuild ? `\n    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>` : ''}
${entries}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
