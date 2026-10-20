/** OG card for /integrations (lib/og). */
import { OG_CONTENT_TYPE, OG_SIZE, renderEntryOgImage } from '@/lib/og';
import { loadEntry } from '@/templates/core/data';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Nafaa';
export const revalidate = 86400;

export default async function Image() {
  return renderEntryOgImage(await loadEntry('/integrations'));
}
