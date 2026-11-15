/**
 * Which Nafaa app sent a request.
 *
 * The mobile app sends `X-Nafaa-Client` (android | ios) and
 * `X-Nafaa-App-Version`; the web app sends them too (web | desktop) once the
 * API has told it the headers are accepted. Requests without the header fall
 * back to the user agent: Electron is the desktop app, okhttp is Android,
 * CFNetwork/Darwin is iOS, everything else is a browser (web).
 */

export type ClientPlatform = 'web' | 'android' | 'ios' | 'desktop';

export const CLIENT_PLATFORMS: readonly ClientPlatform[] = ['web', 'android', 'ios', 'desktop'];

export const CLIENT_HEADER = 'x-nafaa-client';
export const APP_VERSION_HEADER = 'x-nafaa-app-version';

export interface ClientInfo {
  platform: ClientPlatform;
  appVersion: string | null;
  userAgent: string | null;
}

/** Platform from a user agent alone (used for old sessions and requests without the header). */
export function platformFromUserAgent(ua: string | null | undefined): ClientPlatform {
  if (!ua) return 'web';
  if (/Electron/i.test(ua)) return 'desktop';
  if (/okhttp/i.test(ua)) return 'android';
  if (/CFNetwork|Darwin\//i.test(ua)) return 'ios';
  if (/Expo|NafaaMobile|Dart/i.test(ua)) return /iPhone|iPad|iOS/i.test(ua) ? 'ios' : 'android';
  return 'web';
}

function header(req: { headers?: Record<string, unknown> } | undefined, name: string): string | null {
  const raw = req?.headers?.[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function clientFromRequest(req: { headers?: Record<string, unknown> } | undefined): ClientInfo {
  const userAgent = header(req, 'user-agent');
  const claimed = header(req, CLIENT_HEADER)?.toLowerCase();
  const platform = claimed && (CLIENT_PLATFORMS as readonly string[]).includes(claimed)
    ? (claimed as ClientPlatform)
    : platformFromUserAgent(userAgent);
  const version = header(req, APP_VERSION_HEADER);
  return {
    platform,
    appVersion: version && /^[\w.+-]{1,40}$/.test(version) ? version : null,
    userAgent: userAgent ? userAgent.slice(0, 400) : null,
  };
}

/** Column suffix used by the per-app last-seen columns. */
export const PLATFORM_COLUMN: Record<ClientPlatform, 'Web' | 'Desktop' | 'Android' | 'Ios'> = {
  web: 'Web',
  desktop: 'Desktop',
  android: 'Android',
  ios: 'Ios',
};
