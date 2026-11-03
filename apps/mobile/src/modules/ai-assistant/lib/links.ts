/** Opens a link from an answer: web paths become app routes. */

import { router } from 'expo-router';
import { mobileRouteFor } from '@/modules/help/lib/routeFor';
import type { AiLink } from '../api/ai';

export function openAiLink(l: Pick<AiLink, 'to'>): boolean {
  const route = mobileRouteFor(l.to);
  if (!route) return false;
  router.push(route as never);
  return true;
}

/** Plain text for copy and WhatsApp: the answer without Markdown marks. */
export function plainAnswer(content: string): string {
  const text = content
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,4}\s+/gm, '')
    .trim();
  return `${text}\n\n— Nafaa AI`;
}
