/** OG card for /product/[slug] (lib/og), revalidated with the page's tags. */
import { OG_CONTENT_TYPE, OG_SIZE, renderEntryOgImage } from '@/lib/og';
import { loadEntry } from '@/templates/core/data';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Nafaa';
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await loadEntry(`/product/${slug}`);
  return renderEntryOgImage(entry && entry.type === 'PRODUCT' ? entry : null);
}
