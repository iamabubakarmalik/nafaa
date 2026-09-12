import type { ReactNode } from 'react';
import { useShopParam } from '@core/stores/auth.store';
import { PosShopGuard } from './PosShopGuard';

/**
 * Gate for screens that can only act on one branch — POS counters, the cash
 * register, anything that writes a transaction.
 *
 * `useShopParam()` is undefined both when nothing is selected and when the
 * owner is on the consolidated "All Shops" view; PosShopGuard tells those two
 * cases apart and explains the right next step.
 */
export function RequireShop({
  children,
  action,
}: {
  children: ReactNode;
  action?: string;
}) {
  const shopId = useShopParam();
  if (!shopId) return <PosShopGuard action={action} />;
  return <>{children}</>;
}
