/**
 * Jewelry sales history: the shared history (search, filters, analytics,
 * print, void and return through the shared bill), with each bill's weight,
 * karat and old gold taken under its items.
 */

import { createElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { jewelrySalesApi } from '../api/sales.api';
import { KEYS, grams, purityLabel } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useWeightExtras(sales: HistorySale[]) {
  const numbers = sales.filter((s) => !s.pending).map((s) => s.saleNumber).sort();
  const { data = [] } = useQuery({
    queryKey: [KEYS.sales, 'by-numbers', numbers],
    queryFn: () => jewelrySalesApi.byNumbers(numbers),
    enabled: numbers.length > 0,
    staleTime: 60_000,
  });
  const byNumber = new Map(data.map((j) => [j.invoiceNumber, j]));
  return (sale: HistorySale) => {
    const j = byNumber.get(sale.saleNumber);
    if (!j) return null;
    const karats = [...new Set(j.items.map((i: { purity: string }) => purityLabel(i.purity)))].join(', ');
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      createElement('span', { key: 'w', className: `${chip} bg-amber-50 text-amber-800` }, `${karats} · ${grams(j.netWeight)}`),
      j.makingCharges > 0 ? createElement('span', { key: 'm', className: `${chip} bg-slate-100 text-slate-700` }, `Banwai Rs ${Math.round(j.makingCharges).toLocaleString('en-PK')}`) : null,
      j.exchangeMetalGrams > 0 ? createElement('span', { key: 'o', className: `${chip} bg-yellow-50 text-yellow-800` }, `Purana sona ${grams(j.exchangeMetalGrams)} · Rs ${Math.round(j.exchangeValue).toLocaleString('en-PK')}`) : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Jewelry', useBillExtras: useWeightExtras };

export default function JewelrySalesPage() {
  return <SalesHistoryPage config={config} />;
}
