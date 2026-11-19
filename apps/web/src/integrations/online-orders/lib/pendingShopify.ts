/**
 * A merchant who comes from Shopify before logging in is sent to the login
 * page. The store (and which flow it came from) is kept here so that after
 * login, or signup and onboarding, the app returns to the right page:
 *  - 'app': installed the Nafaa app → /shopify?shop=…
 *  - 'own': installed their own Dev Dashboard app → manual connect page
 */
const KEY = 'nafaa.pendingShopifyShop';
const KIND_KEY = 'nafaa.pendingShopifyKind';

export type PendingShopifyKind = 'app' | 'own';

export function rememberShopifyShop(shop: string, kind: PendingShopifyKind = 'app') {
  if (!shop) return;
  try { localStorage.setItem(KEY, shop); localStorage.setItem(KIND_KEY, kind); } catch { /* storage unavailable */ }
}

export function pendingShopifyShop(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function pendingShopifyKind(): PendingShopifyKind {
  try { return localStorage.getItem(KIND_KEY) === 'own' ? 'own' : 'app'; } catch { return 'app'; }
}

export function clearShopifyShop() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(KIND_KEY); } catch { /* storage unavailable */ }
}

/** Manual connect page with the store filled in (merchant's own app). */
export function ownAppConnectPath(shop: string) {
  return `/online-store/connect?platform=shopify&method=manual&shop=${encodeURIComponent(shop)}`;
}

/** Page to resume for a remembered store. */
export function pendingShopifyPath(shop: string, kind: PendingShopifyKind) {
  return kind === 'own' ? ownAppConnectPath(shop) : `/shopify?shop=${encodeURIComponent(shop)}`;
}
