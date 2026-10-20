/** OG card for /glossary/{slug}. */
import type { CmsEntryType } from '@/lib/cms/contract/cms-contract';
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Nafaa glossary';
export const revalidate = 86400;

const TYPES: readonly CmsEntryType[] = ['GLOSSARY_TERM'];

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return ogImageFor(`/glossary/${slug}`, TYPES);
}
