/**
 * /sitemap-videos.xml: the old site's video sitemap. The site has no video
 * pages to list, so the address moves for good to the main index.
 */
import { absoluteUrl } from '@/lib/cms/env';

export function GET(): Response {
  return Response.redirect(absoluteUrl('/sitemap.xml'), 301);
}
