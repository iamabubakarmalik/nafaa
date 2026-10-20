/**
 * Optical sales history: the shared history, with a chip under each bill
 * that came from a glasses or repair order (opens the order) or an eye
 * test fee (opens the test).
 */

import { createElement } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Glasses, Wrench } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { eyeTestsApi } from '../api/eye-tests.api';
import { lensOrdersApi } from '../api/lens-orders.api';
import { OPTICAL_KEYS } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useOpticalBillExtras(sales: HistorySale[]) {
  const ids = sales.filter((s) => !s.pending).map((s) => s.id);
  const numbers = sales.filter((s) => !s.pending).map((s) => s.saleNumber);
  const orders = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'by-sales', ids], queryFn: () => lensOrdersApi.bySales(ids).catch(() => ({})), enabled: ids.length > 0, staleTime: 30_000 });
  const tests = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'by-sales', numbers], queryFn: () => eyeTestsApi.bySales(numbers).catch(() => []), enabled: numbers.length > 0, staleTime: 30_000 });
  return (sale: HistorySale) => {
    const o = (orders.data as Record<string, { id: string; number: string; repair: boolean }> | undefined)?.[sale.id];
    const t = (tests.data ?? []).find((x) => (x.notes ?? '').includes(`Bill ${sale.saleNumber}: Rs `));
    if (!o && !t) return null;
    const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
    return createElement('div', { className: 'mt-1.5 flex flex-wrap items-center gap-1' },
      o ? createElement(Link, { to: `/optical/lens-orders/${o.id}`, onClick: stop, className: `${chip} bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 hover:bg-cyan-100` },
        createElement(o.repair ? Wrench : Glasses, { className: 'h-3 w-3' }), `${o.repair ? 'Repair' : 'Chashma'} ${o.number}`) : null,
      t ? createElement(Link, { to: `/optical/eye-tests/${t.id}`, onClick: stop, className: `${chip} bg-violet-50 text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100` },
        createElement(Eye, { className: 'h-3 w-3' }), `Eye test ${t.testNumber}`) : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Optical', useBillExtras: useOpticalBillExtras };

export default function OpticalSales() {
  return <SalesHistoryPage config={config} />;
}
