/** OG card for /blog. */
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Nafaa blog';
export const revalidate = 86400;

export default function Image() {
  return ogImageFor('/blog', ['PAGE']);
}
