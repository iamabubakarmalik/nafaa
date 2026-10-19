/**
 * Mobile shop sales history: the shared history, and under each bill the
 * phones that left with it (IMEI and PTA), used phones, a trade-in taken as
 * payment and the installment plan on the bill.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CreditCard, Recycle, Repeat, Smartphone } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { formatPKR } from '@core/lib/format';
import { imeiApi, type ImeiForSales } from '../api/imei.api';
import { planStatusOf, ptaOf } from '../components/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem]';

function usePhoneExtras(sales: HistorySale[]) {
  const ids = useMemo(() => sales.filter((s) => !s.pending).map((s) => s.id), [sales]);
  const { data } = useQuery({
    queryKey: ['mobile-sales-extras', ids],
    queryFn: () => imeiApi.forSales(ids).catch(() => null as ImeiForSales | null),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });

  return (sale: HistorySale) => {
    if (!data) return null;
    const imeis = data.imeis.filter((i) => i.saleId === sale.id);
    const used = data.used.filter((u) => u.saleId === sale.id);
    const trades = data.tradeIns.filter((t) => t.saleId === sale.id);
    const plan = data.plans.find((p) => p.saleId === sale.id);
    if (!imeis.length && !used.length && !trades.length && !plan) return null;
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      ...imeis.map((i) => createElement('span', { key: i.saleItemId, className: `${chip} bg-slate-100 font-mono text-slate-600` },
        createElement(Smartphone, { className: 'h-3 w-3' }), `IMEI ${i.imei1}`,
        createElement('span', { className: 'font-sans font-medium', style: { color: ptaOf(i.ptaStatus).color } }, `· ${ptaOf(i.ptaStatus).label}`),
        i.status !== 'SOLD' ? createElement('span', { className: 'font-sans text-amber-700' }, '· wapas') : null)),
      ...used.map((u) => createElement('span', { key: u.saleItemId, className: `${chip} bg-violet-50 font-medium text-violet-700` },
        createElement(Recycle, { className: 'h-3 w-3' }), `Used ${u.usedPhoneCode}`)),
      ...trades.map((t, k) => createElement('span', { key: `t${k}`, className: `${chip} bg-amber-50 font-medium text-amber-800` },
        createElement(Repeat, { className: 'h-3 w-3' }), `Trade-in ${formatPKR(t.amount)}${t.reference ? ` (${t.reference})` : ''}`)),
      plan ? createElement(Link, { key: 'emi', to: `/emi-plans/${plan.id}`, className: `${chip} bg-blue-50 font-semibold text-blue-700 hover:underline` },
        createElement(CreditCard, { className: 'h-3 w-3' }), `${plan.planNumber} · ${planStatusOf(plan.status).label}${plan.remainingAmount > 0 ? ` · baqi ${formatPKR(plan.remainingAmount)}` : ''}`) : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Mobile', useBillExtras: usePhoneExtras };

export default function MobileSalesPage() {
  return <SalesHistoryPage config={config} />;
}
