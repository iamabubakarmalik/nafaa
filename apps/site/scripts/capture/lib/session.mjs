/**
 * Signs a capture account in through the app's own API and prepares the
 * browser storage the web app reads on start (zustand `persist` keys).
 *
 * Demo-only guard: screenshots go on the public site, so the script refuses
 * any account whose tenant name, tenant slug or user email does not match the
 * demo pattern (default /demo/i, override with CAPTURE_DEMO_PATTERN). This
 * keeps real shops' sales, customers and khata out of the media library.
 */

/** Same storage keys as apps/web/src/core/stores/{auth,locale}.store.ts. */
const AUTH_STORAGE_KEY = 'nafaa-auth';
const LOCALE_STORAGE_KEY = 'nafaa-locale';
/** Same key and version as apps/web/src/design-system/theme/store.ts. */
const APPEARANCE_STORAGE_KEY = 'nafaa-appearance';
/** Same header as apps/web/src/core/lib/shopScope.ts. */
export const SHOP_HEADER = 'x-shop-id';

export function demoPattern() {
  const source = process.env.CAPTURE_DEMO_PATTERN;
  if (!source) return /demo/i;
  try {
    return new RegExp(source, 'i');
  } catch {
    throw new Error(`CAPTURE_DEMO_PATTERN is not a valid regular expression: ${source}`);
  }
}

/** Unwraps `{ data: ... }` the way the web app's API helpers do. */
export function unwrap(body) {
  let value = body;
  for (let depth = 0; depth < 3 && value && typeof value === 'object' && !Array.isArray(value) && 'data' in value; depth += 1) {
    value = value.data;
  }
  return value;
}

/** First item id found in a list response (array, or `items`/`data`/`rows`/`sales`). */
export function firstId(body) {
  const value = unwrap(body);
  const list = Array.isArray(value)
    ? value
    : ['items', 'data', 'rows', 'sales', 'results'].map((key) => value?.[key]).find(Array.isArray);
  const first = list?.find((item) => item && typeof item === 'object' && typeof item.id === 'string');
  return first?.id ?? null;
}

/**
 * Logs in with email and password. Returns the session the app stores, or
 * throws with a readable message.
 */
export async function login({ apiUrl, email, password }) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'nafaa-site-capture' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`login failed for ${email}: HTTP ${response.status} ${text.slice(0, 200)}`);
  const session = unwrap(JSON.parse(text));
  if (!session?.accessToken || !session?.user || !session?.tenant) {
    throw new Error(`login for ${email} returned no session (email verification or 2FA may be required)`);
  }
  return session;
}

/** Throws unless the session belongs to a demo tenant. */
export function assertDemoTenant(session, pattern = demoPattern()) {
  const { user, tenant } = session;
  const fields = [tenant?.name, tenant?.slug, user?.email].filter(Boolean);
  if (!fields.some((value) => pattern.test(String(value)))) {
    throw new Error(
      `refusing to capture tenant "${tenant?.name ?? '?'}" (${tenant?.slug ?? '?'}): it does not look like a demo shop. ` +
        'Use a seeded demo account, or set CAPTURE_DEMO_PATTERN if demo shops use another naming rule.',
    );
  }
}

/** The shop the app would pick on login (owner: assigned or main shop). */
export function initialShopId(user) {
  return user?.shopId ?? user?.assignedShop?.id ?? null;
}

/**
 * localStorage entries to seed before the app loads. With `session` null only
 * the locale and colour mode are set (public pages).
 */
export function storageEntries(session, locale, theme = 'light') {
  const entries = [
    [LOCALE_STORAGE_KEY, JSON.stringify({ state: { locale }, version: 0 })],
    [APPEARANCE_STORAGE_KEY, JSON.stringify({ state: { personal: { mode: theme } }, version: 1 })],
  ];
  if (session) {
    entries.push([
      AUTH_STORAGE_KEY,
      JSON.stringify({
        state: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? null,
          user: session.user,
          tenant: session.tenant,
          isAuthenticated: true,
          currentShopId: initialShopId(session.user),
        },
        version: 0,
      }),
    ]);
  }
  return entries;
}

/** GET an app API endpoint as the signed-in account. */
export async function apiGet({ apiUrl, session }, endpoint) {
  const headers = { authorization: `Bearer ${session.accessToken}` };
  const shopId = initialShopId(session.user);
  if (shopId) headers[SHOP_HEADER] = shopId;
  const response = await fetch(`${apiUrl}${endpoint}`, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`GET ${endpoint}: HTTP ${response.status}`);
  return response.json();
}

/**
 * Stores the colour mode on the account's server-side personal appearance
 * layer. The web app lets that copy win over local storage on load, so a
 * capture in the other mode needs it set first. Demo accounts only.
 */
export async function setPersonalMode({ apiUrl, session }, mode) {
  const headers = { authorization: `Bearer ${session.accessToken}`, 'content-type': 'application/json' };
  const current = await fetch(`${apiUrl}/appearance`, { headers, signal: AbortSignal.timeout(20_000) })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
  const personal = unwrap(current)?.personal ?? {};
  if (personal.mode === mode) return;
  const response = await fetch(`${apiUrl}/appearance/personal`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ...personal, mode }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`PUT /appearance/personal: HTTP ${response.status}`);
}
