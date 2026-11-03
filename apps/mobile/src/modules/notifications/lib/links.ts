/**
 * Turns the link of a notification (a web path such as `/sales/<id>/receipt`
 * or `/billing`, a full URL, or an app route) into an app route. The server
 * sends web paths; every area that exists on the phone is mapped here.
 * Returns null for links with no screen on the phone.
 */

import { canPurchaseInApp } from '@/core/platform/purchases';
import { NAV_GROUPS, SETTINGS_GROUPS } from '@/modules/shell/navigation/nav-config';
import { AI_HREF } from '@/modules/shell/navigation/routes';
import { onlineRouteFor } from '@/modules/online-store/hooks/onlineRoutes';

const ID = '([^/?#]+)';

/** Dynamic web paths → app routes. */
const DYNAMIC: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [new RegExp(`^/sales/${ID}(?:/receipt)?$`), (m) => `/sales/${m[1]}`],
  [new RegExp(`^/products/${ID}$`), (m) => `/products/${m[1]}`],
  [new RegExp(`^/transfers/${ID}$`), (m) => `/transfers/${m[1]}`],
  [new RegExp(`^/bookings/${ID}$`), (m) => `/bookings/${m[1]}`],
  [new RegExp(`^/customers/${ID}$`), (m) => `/customers/${m[1]}`],
  [new RegExp(`^/purchases/${ID}$`), (m) => `/purchases/${m[1]}`],
  // iOS opens the bill itself: no payment screen there (core/platform/purchases).
  [new RegExp(`^/billing/invoice/${ID}/pay$`), (m) => (canPurchaseInApp() ? `/billing/invoice/${m[1]}/pay` : `/billing/invoice/${m[1]}`)],
  [new RegExp(`^/billing/invoice/${ID}$`), (m) => `/billing/invoice/${m[1]}`],
  [new RegExp(`^/staff/${ID}$`), (m) => (m[1] === 'commission' ? '/staff/commission' : `/staff/${m[1]}`)],
];

/**
 * Trade network and distribution: the phone has the same routes as the web,
 * so the path is kept with its query (`?tab=`, `?status=`). Links that carry
 * an id in the query open the matching detail screen.
 */
function sectionRoute(path: string, search: URLSearchParams): string | null {
  if (!/^\/(network|distribution)(\/|$)/.test(path)) return null;
  const id = search.get('id');
  if (id && (path === '/network/orders' || path === '/network/receiving')) return `/network/orders/${encodeURIComponent(id)}`;
  if (id && path === '/distribution/orders') return `/distribution/orders/${encodeURIComponent(id)}`;
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Web paths whose mobile route has another name. */
const RENAMED: Record<string, string> = {
  '/plans': '/plan',
  '/ai': '/ai',
  '/expiry': '/expiry-dashboard',
  '/staff/commission': '/staff/commission',
  '/staff/attendance': '/staff/attendance',
};

let flat: Map<string, string> | null = null;
function navRoutes(): Map<string, string> {
  if (flat) return flat;
  flat = new Map();
  const items = [...NAV_GROUPS.flatMap((g) => g.items), ...SETTINGS_GROUPS.flatMap((g) => g.items)];
  for (const i of items) if (i.href) flat.set(i.to, i.href);
  return flat;
}

export function routeForNotificationLink(link: unknown): string | null {
  if (typeof link !== 'string' || !link.trim()) return null;
  const raw = link.trim();
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (!/(^|\.)nafaa\.pk$/i.test(u.hostname)) return null;
      return routeForNotificationLink(`${u.pathname}${u.search}`);
    } catch { return null; }
  }
  const online = onlineRouteFor(raw);
  if (online) return online;

  let path: string;
  let search: URLSearchParams;
  try {
    const u = new URL(raw.startsWith('/') ? raw : `/${raw}`, 'https://nafaa.pk');
    path = u.pathname.replace(/\/+$/, '') || '/';
    search = u.searchParams;
  } catch { return null; }

  const section = sectionRoute(path, search);
  if (section) return section;

  if (path === '/ai') return AI_HREF;
  for (const [re, build] of DYNAMIC) {
    const m = re.exec(path);
    if (m) return build(m);
  }
  const nav = navRoutes();
  if (nav.has(path)) return nav.get(path)!;
  if (RENAMED[path]) return RENAMED[path];
  // Already an app route (broadcast links from the admin panel).
  for (const href of nav.values()) if (href === path) return href;
  return null;
}
