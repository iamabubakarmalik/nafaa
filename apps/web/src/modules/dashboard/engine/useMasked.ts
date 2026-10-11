/**
 * Money formatting that respects the privacy lock.
 *   cost(n)  — cost, profit and margins; hidden without `cost.view` or while locked
 *   sales(n) — sales totals; hidden when the user turned on "hide sales"
 */

import { useCallback } from 'react';
import { useCostHidden } from '@core/security/HiddenValue';
import { usePrivacyStore } from '@core/stores/privacy.store';
import { formatPKR } from '@core/lib/format';

export const MASK = '••••';

export function useMasked() {
  const costHidden = useCostHidden();
  const salesHidden = usePrivacyStore((s) => s.hideSales);
  const cost = useCallback((n: number | null | undefined) => (costHidden ? MASK : formatPKR(n ?? 0)), [costHidden]);
  const sales = useCallback((n: number | null | undefined) => (salesHidden ? MASK : formatPKR(n ?? 0)), [salesHidden]);
  return { cost, sales, costHidden, salesHidden };
}
