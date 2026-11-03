/**
 * Maps a web path ("/purchases/new?order=1") to the matching app route using
 * the navigation registry. Guides, Nafaa AI links and notifications share it.
 */

import { NAV_GROUPS, SETTINGS_GROUPS } from '@/modules/shell/navigation/nav-config';

const EXTRA: Record<string, string> = {
  '/purchases/new': '/purchases/new',
  '/products/new': '/products/new',
  '/customers/new': '/customers/new',
  '/expenses': '/expenses',
  '/sales': '/sales',
  '/plans': '/plan',
  '/ai': '/ai',
  '/notifications': '/notifications',
  '/profile': '/profile',
};

let table: Map<string, string> | null = null;
function build() {
  const m = new Map<string, string>();
  for (const g of NAV_GROUPS) for (const i of g.items) if (i.href) m.set(i.to, i.href);
  for (const g of SETTINGS_GROUPS) for (const i of g.items) if (i.href && !m.has(i.to)) m.set(i.to, i.href);
  return m;
}

export function mobileRouteFor(webPath: string): string | null {
  table ??= build();
  const path = webPath.split('?')[0].replace(/\/+$/, '') || '/';
  return table.get(path) ?? EXTRA[path] ?? null;
}

/** Web path of the screen a mobile pathname belongs to (for page-aware suggestions). */
export function webPathFor(pathname: string): string {
  table ??= build();
  const clean = pathname.replace(/\/+$/, '') || '/';
  for (const [to, href] of table) if (href === clean && clean !== '/') return to;
  return clean === '/' ? '/dashboard' : clean;
}
