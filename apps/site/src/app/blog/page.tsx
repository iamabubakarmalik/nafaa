/**
 * Blog index: /blog (PAGE hub, ARCH 5.2). Thin route: the list, layout and
 * schema live in the template.
 */
import type { Metadata } from 'next';
import { BlogIndexTemplate } from '@/templates/article/HubTemplates';
import { loadPage, pageMetadata } from '@/templates/article/route-helpers';

export const revalidate = 86400;

const PATH = '/blog';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await pageMetadata(PATH, ['PAGE']);
  // Advertise the RSS feed to readers and crawlers.
  return { ...metadata, alternates: { ...metadata.alternates, types: { 'application/rss+xml': '/blog/feed.xml' } } };
}

export default async function Page() {
  const page = await loadPage(PATH, ['PAGE']);
  return <BlogIndexTemplate {...page} />;
}
