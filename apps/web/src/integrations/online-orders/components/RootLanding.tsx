import { Navigate, useLocation } from 'react-router-dom';
import { ownAppConnectPath } from '../lib/pendingShopify';

/**
 * The site root. A merchant's own Shopify app (manual connect) has App URL
 * https://app.nafaa.pk, so after "Install" Shopify opens /?shop=…&hmac=….
 * That visit goes to the manual connect page with the store filled in;
 * everything else goes to the dashboard.
 */
export function RootLanding() {
  const q = new URLSearchParams(useLocation().search);
  const shop = q.get('shop');
  if (shop && q.get('hmac') && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)) {
    return <Navigate to={ownAppConnectPath(shop)} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}
