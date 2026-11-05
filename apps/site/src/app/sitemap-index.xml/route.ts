/**
 * /sitemap-index.xml: the old site's sitemap index address. Moved for good
 * to /sitemap.xml, so crawlers and Search Console follow the new index.
 */
import { absoluteUrl } from '@/lib/cms/env';

export function GET(): Response {
  return Response.redirect(absoluteUrl('/sitemap.xml'), 301);
}
