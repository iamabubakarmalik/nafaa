/**
 * A merchant who installs Nafaa from Shopify lands on /shopify?shop=… before
 * logging in. The store name is kept here so that after login (or signup and
 * onboarding) the app returns to /shopify and finishes connecting that store.
 */
const KEY = 'nafaa.pendingShopifyShop';

export function rememberShopifyShop(shop: string) {
  if (!shop) return;
  try { localStorage.setItem(KEY, shop); } catch { /* storage unavailable */ }
}

export function pendingShopifyShop(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearShopifyShop() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
