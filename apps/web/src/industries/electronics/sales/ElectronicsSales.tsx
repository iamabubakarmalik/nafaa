/**
 * Electronics sales history: the shared history plus, under each bill, the
 * serial/IMEI units that left with it — and a warning when a serial-tracked
 * item was sold without one (no warranty proof for that customer).
 *
 * Units are fetched by the ids of the bills on screen, 50 bills per request,
 * so older bills show their units too and "load more" only asks for the new
 * page.
 */

import { createElement, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle, Barcode } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { serialTrackingApi, type SalesSerials, type SerialStatus } from '../api/serial-tracking.api';

const CHUNK = 50;

/** Shown after the number when the unit is no longer with the customer. */
const STATUS_NOTE: Partial<Record<SerialStatus, string>> = {
  IN_STOCK: 'wapas aaya', RETURNED: 'wapas aaya', DEFECTIVE: 'kharab', IN_REPAIR: 'repair mein', LOST: 'gum',
};

/** Stable, so the combined list keeps its identity while nothing changes. */
const loaded = (results: Array<{ data?: SalesSerials }>) => results.map((r) => r.data).filter((d): d is SalesSerials => !!d);

function useSerialExtras(sales: HistorySale[]) {
  // Bill status is part of the key, so a void or return on screen fetches again.
  const chunks = useMemo(() => {
    const ids = sales.filter((s) => !s.pending).map((s) => `${s.id}:${s.status}`);
    const out: string[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK) out.push(ids.slice(i, i + CHUNK));
    return out;
  }, [sales]);

  const data = useQueries({
    queries: chunks.map((keys) => ({
      queryKey: ['electronics-sale-serials', keys],
      queryFn: () => serialTrackingApi.forSales(keys.map((k) => k.split(':')[0]))
        .catch((): SalesSerials => ({ serials: [], trackedProductIds: [] })),
      staleTime: 60_000,
    })),
    combine: loaded,
  });

  const { bySale, tracked } = useMemo(() => {
    const m = new Map<string, SalesSerials['serials']>();
    const t = new Set<string>();
    for (const d of data) {
      d.trackedProductIds.forEach((id) => t.add(id));
      for (const s of d.serials) m.set(s.saleId, [...(m.get(s.saleId) ?? []), s]);
    }
    return { bySale: m, tracked: t };
  }, [data]);

  return (sale: HistorySale) => {
    const serials = bySale.get(sale.id) ?? [];
    const need = sale.items.reduce((a, i) => a + (i.productId && tracked.has(i.productId) ? Number(i.quantity) : 0), 0);
    const gap = sale.status === 'VOIDED' ? 0 : Math.max(need - serials.length, 0);
    if (!serials.length && !gap) return null;
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      ...serials.map((s) => createElement('span', { key: s.id, className: 'inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-600' },
        createElement(Barcode, { className: 'h-3 w-3' }),
        s.imei ? `IMEI ${s.imei}` : `S/N ${s.serialNumber}`,
        STATUS_NOTE[s.status] ? createElement('span', { className: 'font-sans text-slate-400' }, `· ${STATUS_NOTE[s.status]}`) : null)),
      gap > 0 ? createElement('span', { key: 'gap', className: 'inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-rose-700' },
        createElement(AlertTriangle, { className: 'h-3 w-3' }), `${gap} serial ke bagair — warranty saboot nahi`) : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Electronics', useBillExtras: useSerialExtras };

export default function ElectronicsSales() {
  return <SalesHistoryPage config={config} />;
}
