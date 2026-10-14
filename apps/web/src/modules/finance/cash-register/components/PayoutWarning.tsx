/**
 * Warns when cash taken from the drawer would leave it below zero. Asks the
 * server for the live drawer count, so it matches the cash register page.
 * It only warns; the form still saves.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { cashRegisterApi } from '../api/cash-register.api';
import { CASH_KEY } from './meta';

export function PayoutWarning({ amount, registerId, enabled = true, kind = 'payment', closedText, className }: {
  /** Cash leaving the drawer; nothing is checked at 0. */
  amount: number;
  registerId?: string;
  enabled?: boolean;
  /** `payment` for a bill paid in cash, `cashOut` for cash taken out of the drawer. */
  kind?: 'payment' | 'cashOut';
  /** Shown when the branch has no open register. */
  closedText?: string;
  className?: string;
}) {
  const canView = usePermission(PERMISSIONS.CASH_REGISTER_VIEW);
  const [debounced, setDebounced] = useState(amount);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(amount), 350);
    return () => window.clearTimeout(t);
  }, [amount]);

  const on = enabled && canView && debounced > 0;
  const q = useQuery({
    queryKey: [CASH_KEY, 'payout-check', registerId ?? '', debounced],
    queryFn: () => cashRegisterApi.payoutCheck(debounced, registerId),
    enabled: on,
    staleTime: 15_000,
    retry: false,
    placeholderData: (prev) => prev,
  });
  const c = on ? q.data : undefined;
  if (!c) return null;

  if (!c.registerOpen) {
    if (!closedText) return null;
    return <p className={cn('flex items-start gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[0.75rem] text-slate-600 ring-1 ring-slate-200', className)}>
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{closedText}
    </p>;
  }
  if (!c.short) return null;

  const expected = c.expected ?? 0;
  const minus = formatPKR(Math.abs(c.after ?? 0));
  const text = kind === 'payment'
    ? c.message
    : expected > 0
      ? `Galle me hisaab se sirf ${formatPKR(expected)} hain — ${formatPKR(debounced)} nikalne ke baad ${minus} minus ho jayega. Pehle cash gin lein.`
      : `Galle ka hisaab pehle hi ${formatPKR(Math.abs(expected))} minus hai — yeh nikalne ke baad ${minus} minus ho jayega. Pehle cash gin lein.`;
  return (
    <div role="alert" className={cn('flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200', className)}>
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text} <span className="text-amber-700">{kind === 'cashOut' ? 'Phir bhi nikal sakte hain.' : 'Save phir bhi ho jayega.'}</span></span>
    </div>
  );
}
