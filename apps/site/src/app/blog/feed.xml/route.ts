/**
 * RSS 2.0 feed of the latest published blog posts: /blog/feed.xml.
 * The same feed is served at /feed.xml (lib/seo/feed.ts).
 */
import { blogFeedResponse } from '@/lib/seo/feed';

export const revalidate = 86400;

export function GET(): Promise<Response> {
  return blogFeedResponse('/blog/feed.xml');
}
