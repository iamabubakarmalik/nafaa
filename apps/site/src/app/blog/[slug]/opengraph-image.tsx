/** OG card for /blog/{slug}. */
import type { CmsEntryType } from '@/lib/cms/contract/cms-contract';
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Nafaa blog post';
export const revalidate = 86400;

const TYPES: readonly CmsEntryType[] = ['BLOG_POST'];

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return ogImageFor(`/blog/${slug}`, TYPES);
}
