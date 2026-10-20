/** OG card for /customers. */
import { ogImageConfig, ogImageFor } from '@/templates/article/route-helpers';

export const size = ogImageConfig.size;
export const contentType = ogImageConfig.contentType;
export const alt = 'Nafaa customer stories';
export const revalidate = 86400;

export default function Image() {
  return ogImageFor('/customers', ['PAGE']);
}
