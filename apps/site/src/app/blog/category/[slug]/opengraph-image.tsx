/** OG card for /blog/category/{slug}. */
import type { CmsEntryType } from '@/lib/cms/contract/cms-contract';
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Nafaa blog category';
export const revalidate = 86400;

const TYPES: readonly CmsEntryType[] = ['BLOG_CATEGORY'];

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return ogImageFor(`/blog/category/${slug}`, TYPES);
}
