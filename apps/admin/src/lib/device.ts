/** Short device name from a browser user-agent, e.g. "Chrome on Mac" or "Safari on iPhone". */
export function deviceLabel(ua: string | null | undefined, fallback = 'Unknown device'): string {
  if (!ua) return fallback;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /okhttp|Dart|Expo|Nafaa/i.test(ua) ? 'Nafaa app' : 'Browser';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}
