/** OG card for this route (lib/og): the entry's card, or the editor's OG image. */
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { isSlug, typedOgImage } from '@/templates/city/common/route';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Nafaa';
export const revalidate = 86400;

const TYPES = ['CITY_INDUSTRY'] as const;

export default async function Image({ params }: { params: Promise<{ city: string; industry: string }> }) {
  const { city, industry } = await params;
  return typedOgImage(isSlug(city) && isSlug(industry) ? `/pos-software/${city}/${industry}` : '/', TYPES);
}
