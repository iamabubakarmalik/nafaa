/**
 * /feed.xml: the old site's RSS address, kept as a real RSS 2.0 feed of the
 * latest blog posts (lib/seo/feed.ts). The root layout links it in <head>.
 */
import { FEED_PATH, blogFeedResponse } from '@/lib/seo/feed';

export const revalidate = 86400;

export function GET(): Promise<Response> {
  return blogFeedResponse(FEED_PATH);
}
