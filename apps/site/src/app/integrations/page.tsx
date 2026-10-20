/**
 * /integrations: the PAGE entry at this path, rendered by its template
 * (data.template; templates/core/route). 404 (or a redirect) when nothing
 * is published here.
 */
import { fixedMetadata, fixedPage } from '@/templates/core/route';

export const revalidate = 86400;

export function generateMetadata() {
  return fixedMetadata('/integrations');
}

export default function Page() {
  return fixedPage('/integrations');
}
