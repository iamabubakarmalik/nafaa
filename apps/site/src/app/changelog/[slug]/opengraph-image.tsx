/** OG card for /changelog/{slug}. */
import type { CmsEntryType } from '@/lib/cms/contract/cms-contract';
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Nafaa changelog';
export const revalidate = 86400;

const TYPES: readonly CmsEntryType[] = ['CHANGELOG'];

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return ogImageFor(`/changelog/${slug}`, TYPES);
}
