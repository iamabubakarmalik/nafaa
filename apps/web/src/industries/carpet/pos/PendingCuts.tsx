/**
 * Cart notice: bills with roll cuts or pieces not yet taken from stock
 * (made offline or from a booking). One tap settles them all.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';
import { useShopParam } from '@core/stores/auth.store';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { PIECES_KEY, ROLLS_KEY, SUMMARY_KEY } from '../lib/meta';

export function useUnsettledBills() {
  const shopId = useShopParam();
  return useQuery({
    queryKey: ['carpet-unsettled', shopId ?? ''],
    queryFn: () => carpetRollsApi.unsettledBills(shopId),
    enabled: typeof navigator === 'undefined' || navigator.onLine,
    staleTime: 60_000,
  });
}

/** Settles every listed bill; returns how many lines could not be cut. */
export async function settleAll(saleIds: string[]) {
  let failed = 0;
  for (const id of saleIds) {
    const res = await carpetRollsApi.settleBill(id).catch(() => null);
    failed += res ? res.lines.filter((l) => !l.ok).length : 1;
  }
  return failed;
}

export function PendingCuts() {
  const qc = useQueryClient();
  const { data = [] } = useUnsettledBills();
  const [busy, setBusy] = useState(false);
  if (!data.length) return null;
  const run = async () => {
    setBusy(true);
    const failed = await settleAll(data.map((b) => b.saleId));
    setBusy(false);
    for (const key of ['carpet-unsettled', ROLLS_KEY, PIECES_KEY, SUMMARY_KEY, 'carpet-product-summary-pos']) void qc.invalidateQueries({ queryKey: [key] });
    if (failed) toast.error(`${failed} line stock se nahi kati — Carpet Rolls page par wajah dekhein`);
    else toast.success('Sab bills ka stock kat gaya');
  };
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
      <Scissors className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1">{data.length} bill ka carpet abhi stock se nahi kata</span>
      <button type="button" disabled={busy} onClick={() => void run()} className="shrink-0 rounded-lg bg-amber-600 px-2 py-1 font-semibold text-white disabled:opacity-50">{busy ? 'Kat raha…' : 'Ab kaatein'}</button>
    </div>
  );
}
