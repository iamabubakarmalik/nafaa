/**
 * Site environment (ARCH section 2). Server-side values are read lazily so a
 * client bundle that imports a helper from here never inlines a secret.
 *
 * Local defaults: the API on :4000 and the site on :3100, so `next dev` works
 * without an .env.local file.
 */

const LOCAL_API = 'http://localhost:4000/api';
const LOCAL_SITE = 'http://localhost:3100';

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Base URL of the API, server-side only (`CMS_API_URL`). */
export function cmsApiUrl(): string {
  return trimSlash(process.env.CMS_API_URL || process.env.NEXT_PUBLIC_API_URL || LOCAL_API);
}

/** Public API base used by islands in the browser (`NEXT_PUBLIC_API_URL`). */
export const PUBLIC_API_URL = trimSlash(process.env.NEXT_PUBLIC_API_URL || LOCAL_API);

/** Absolute site origin without a trailing slash (`SITE_URL`, else the old site's `NEXT_PUBLIC_SITE_URL`). */
export function siteUrl(): string {
  return trimSlash(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || LOCAL_SITE);
}

/** False on staging: robots.txt disallows everything and pages are noindex. */
export function siteIndexable(): boolean {
  return process.env.SITE_INDEXABLE === 'true';
}

/** HMAC secret shared with the API for POST /api/revalidate. */
export function revalidateSecret(): string | null {
  return process.env.SITE_REVALIDATE_SECRET || null;
}

export const isProduction = process.env.NODE_ENV === 'production';

/** Absolute URL for a site path ("/pricing" → "https://nafaa.pk/pricing"). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
