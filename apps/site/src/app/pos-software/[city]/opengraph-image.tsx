/** OG card for this route (lib/og): the entry's card, or the editor's OG image. */
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { isSlug, typedOgImage } from '@/templates/city/common/route';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Nafaa';
export const revalidate = 86400;

const TYPES = ['CITY'] as const;

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  return typedOgImage(isSlug(city) ? `/pos-software/${city}` : '/', TYPES);
}
