/**
 * Shared helpers for the header, mobile nav and footer. Menu items arrive
 * resolved from GET /public/site/layout (entry links already turned into
 * paths, auto lists expanded).
 */
import type { SiteSettings } from '@/lib/cms/contract/cms-contract';
import type { MenuItemWithStatus } from '@/lib/cms/client';

export type NavItem = MenuItemWithStatus;

export function isExternalHref(item: Pick<NavItem, 'href' | 'external'>): boolean {
  return item.external === true || /^https?:\/\//.test(item.href);
}

/** WhatsApp deep link from settings `site.whatsapp`, or null when not set. */
export function whatsappHref(site: SiteSettings): string | null {
  if (!site.whatsapp) return null;
  const text = site.whatsapp.message ? `?text=${encodeURIComponent(site.whatsapp.message)}` : '';
  return `https://wa.me/${site.whatsapp.number}${text}`;
}

/** Status shown as a badge next to a menu item (owner rule: unbuilt features are never shown as live). */
export const STATUS_LABEL: Record<NonNullable<NavItem['status']>, string | null> = {
  live: null,
  beta: 'Beta',
  coming: 'Coming soon',
};

export function children(item: NavItem): NavItem[] {
  return (item.children ?? []) as NavItem[];
}

/**
 * Menu items carry no status field yet, so editors mark an unbuilt feature by
 * starting its description with "Coming soon:" (menus.ts in the seed). The
 * badge comes from that prefix and the prefix is not shown twice.
 */
const COMING_PREFIX = /^coming soon\s*[:\u2013\u2014-]\s*/i;

export function itemStatus(item: NavItem): NavItem['status'] {
  if (item.status) return item.status;
  return item.description && COMING_PREFIX.test(item.description) ? 'coming' : undefined;
}

export function itemDescription(item: NavItem): string | undefined {
  const text = item.description?.replace(COMING_PREFIX, '').trim();
  return text || undefined;
}

/** A leaf (no children) that has its own page. */
export function hasHref(item: NavItem): boolean {
  return Boolean(item.href) && item.href !== '#';
}

/** Overview link text for a menu item's own page: "Explore all products" for collections, "Go to marketplace" otherwise. */
const COLLECTIONS = new Set(['products', 'solutions', 'industries', 'services', 'resources']);
export function overviewLabel(label: string): string {
  const l = label.toLowerCase();
  return COLLECTIONS.has(l) ? `Explore all ${l}` : `Go to ${l}`;
}
