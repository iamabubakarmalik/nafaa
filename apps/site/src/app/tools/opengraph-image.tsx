/** OG card for /tools. */
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Free business tools';
export const revalidate = 86400;

export default function Image() {
  return ogImageFor('/tools', ['PAGE']);
}
