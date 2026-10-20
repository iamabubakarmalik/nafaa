/** OG card for /templates. */
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Free templates';
export const revalidate = 86400;

export default function Image() {
  return ogImageFor('/templates', ['PAGE']);
}
