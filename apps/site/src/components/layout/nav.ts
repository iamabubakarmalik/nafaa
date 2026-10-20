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
