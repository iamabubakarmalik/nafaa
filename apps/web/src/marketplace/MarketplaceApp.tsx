import { useEffect } from 'react';
import { MarketplaceRouter } from './router/MarketplaceRouter';
import { useCustomerAuthStore } from './_shared/stores/customerAuth.store';

export default function MarketplaceApp() {
  const init = useCustomerAuthStore((s) => s.initialize);
  useEffect(() => { init(); }, [init]);
  return <MarketplaceRouter />;
}
