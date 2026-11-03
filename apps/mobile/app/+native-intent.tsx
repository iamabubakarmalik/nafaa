/**
 * Incoming links (nafaa://… and https://nafaa.pk/…) use web paths. Map the
 * ones whose mobile route differs, using the navigation registry; everything
 * else (reset-password?token=…, products/123) passes through unchanged.
 */

import { NAV_GROUPS, SETTINGS_GROUPS } from '@/modules/shell/navigation/nav-config';

const WEB_TO_APP = new Map<string, string>([
  ['/dashboard', '/'],
  ['/auth/login', '/login'],
  ['/auth/register', '/register'],
  ['/products/bulk-create', '/products/bulk-import?start=blank'],
  ['/returns/new', '/pos/return'],
  ...[...NAV_GROUPS.flatMap((g) => g.items), ...SETTINGS_GROUPS.flatMap((g) => g.items)]
    .filter((i) => i.href && i.href !== i.to)
    .map((i) => [i.to, i.href!] as [string, string]),
]);

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, 'https://nafaa.pk');
    // nafaa://products/1 → host "products", path "/1"
    const full = url.protocol === 'nafaa:' ? `/${url.host}${url.pathname}` : url.pathname;
    const clean = full.replace(/\/+$/, '') || '/';
    const mapped = WEB_TO_APP.get(clean);
    if (!mapped) return path;
    return url.search ? `${mapped}${mapped.includes('?') ? '&' : '?'}${url.search.slice(1)}` : mapped;
  } catch {
    return path;
  }
}
