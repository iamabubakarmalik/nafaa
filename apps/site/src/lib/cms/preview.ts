/**
 * Preview helpers (ARCH 7.6, API-CONTRACT 7). The flow:
 *   admin → <site>/api/preview?token&path → token checked with the API →
 *   draftMode().enable() + httpOnly cookie → redirect to path →
 *   getEntry() reads the draft with cache: 'no-store' → PreviewBar shown.
 */
import { PREVIEW } from './contract/cms-contract';

export { PREVIEW };

/**
 * Only same-site paths are accepted as preview targets, so the preview and
 * exit routes cannot be used as open redirects.
 */
export function safeSitePath(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const parsed = new URL(value, 'http://site.invalid');
    if (parsed.origin !== 'http://site.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function previewCookieOptions(expiresAt?: string) {
  const expires = expiresAt ? new Date(expiresAt) : undefined;
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(expires && !Number.isNaN(expires.getTime()) ? { expires } : {}),
  };
}
