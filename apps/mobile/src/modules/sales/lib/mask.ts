/** Cost and profit show only with `cost.view` (same rule as the web). */

import { useCallback } from 'react';
import { formatMoney } from '@/core/format';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';

export function useCostMask() {
  const can = usePermission();
  const costHidden = !can(P.COST_VIEW);
  const cost = useCallback((n: number | null | undefined) => (costHidden ? 'Rs ••••' : formatMoney(n ?? 0)), [costHidden]);
  return { costHidden, cost };
}
