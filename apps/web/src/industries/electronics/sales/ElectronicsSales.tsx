/**
 * Electronics sales history: the shared history plus, under each bill, the
 * serial/IMEI units that left with it — and a warning when a serial-tracked
 * item was sold without one (no warranty proof for that customer).
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Barcode } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { electronicsProductsApi } from '../api/products.api';
import { serialTrackingApi } from '../api/serial-tracking.api';

function useSerialExtras(_sales: HistorySale[]) {
  const { data: profiles = [] } = useQuery({
    queryKey: ['electronics-profiles-all'],
    queryFn: () => electronicsProductsApi.list().catch(() => []),
    staleTime: 5 * 60_000,
  });
  const { data: sold = [] } = useQuery({
    queryKey: ['electronics-serials-sold'],
    queryFn: () => serialTrackingApi.list({ status: 'SOLD' }).catch(() => []),
    staleTime: 60_000,
  });
  const tracked = useMemo(() => new Set((profiles as Array<{ productId?: string; requiresSerial?: boolean; hasImei?: boolean }>)
    .filter((p) => p.productId && (p.requiresSerial || p.hasImei)).map((p) => p.productId!)), [profiles]);
  const bySale = useMemo(() => {
    const m = new Map<string, Array<{ serialNumber: string; imei?: string | null }>>();
    for (const s of sold as Array<{ saleId?: string | null; serialNumber: string; imei?: string | null }>) {
      if (!s.saleId) continue;
      m.set(s.saleId, [...(m.get(s.saleId) ?? []), s]);
    }
    return m;
  }, [sold]);

  return (sale: HistorySale) => {
    const serials = bySale.get(sale.id) ?? [];
    const need = sale.items.reduce((a, i) => a + (i.productId && tracked.has(i.productId) ? Number(i.quantity) : 0), 0);
    const gap = sale.status === 'VOIDED' ? 0 : Math.max(need - serials.length, 0);
    if (!serials.length && !gap) return null;
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      ...serials.map((s) => createElement('span', { key: s.serialNumber, className: 'inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.6875rem] text-slate-600' },
        createElement(Barcode, { className: 'h-3 w-3' }), s.imei ? `IMEI ${s.imei}` : `S/N ${s.serialNumber}`)),
      gap > 0 ? createElement('span', { key: 'gap', className: 'inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-rose-700' },
        createElement(AlertTriangle, { className: 'h-3 w-3' }), `${gap} serial ke bagair — warranty saboot nahi`) : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Electronics', useBillExtras: useSerialExtras };

export default function ElectronicsSales() {
  return <SalesHistoryPage config={config} />;
}
