/**
 * Home (/): the PAGE entry at "/" with the home template (templates/home).
 * Its OG card is the root opengraph-image.tsx. Static, refreshed on publish.
 */
import { fixedMetadata, fixedPage } from '@/templates/core/route';

export const revalidate = 86400;

export function generateMetadata() {
  return fixedMetadata('/');
}

export default function Page() {
  return fixedPage('/');
}
