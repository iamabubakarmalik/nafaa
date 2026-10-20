/**
 * /_dev/blocks: gallery of every CMS block (S2). Internal only: the parent
 * layout makes it noindex and 404s it in production unless SITE_DEV_PAGES=true.
 * Query: `?locale=ur` for the Roman Urdu UI strings, `?path=/x` to render a
 * published entry's blocks from the API.
 */
import type { Metadata } from 'next';
import { BlocksGallery } from '@/components/blocks/dev/BlocksGallery';
import { getEntry } from '@/lib/cms/client';

export const metadata: Metadata = {
  title: 'Blocks gallery',
  description: 'Internal gallery of the CMS block renderers.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function BlocksDevPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const locale = params.locale === 'ur' ? 'ur' : 'en';
  const path = typeof params.path === 'string' && params.path.startsWith('/') ? params.path : undefined;
  const liveEntry = path ? await getEntry(path, 'en').catch(() => null) : null;
  return <BlocksGallery locale={locale} livePath={path} liveEntry={liveEntry} />;
}
