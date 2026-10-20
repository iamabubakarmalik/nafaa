/**
 * RSS 2.0 feed of the latest published blog posts: /blog/feed.xml.
 * Cached with the posts list (`type:en:BLOG_POST`), so a publish refreshes
 * it. Only live entries: fixtures never appear here.
 */
import { getEntries, getLayout } from '@/lib/cms/client';
import { absoluteUrl } from '@/lib/cms/env';
import { escapeXml } from '@/lib/seo/sitemap';

export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const [{ items }, { site }] = await Promise.all([
    getEntries({ type: 'BLOG_POST', sort: 'recent', limit: 50 }),
    getLayout(),
  ]);
  const self = absoluteUrl('/blog/feed.xml');
  const blog = absoluteUrl('/blog');
  const lastBuild = items.find((item) => item.contentUpdatedAt)?.contentUpdatedAt;
  const entries = items
    .map((item) => {
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
