/**
 * Agri sales history (SalesGate entry): the shared history, with marks
 * under each bill for the bulk order it came from, total weight of bags
 * sold, and a spray safety note when the bill had sprays.
 */

import { createElement } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Bug, Weight } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { useAgriFacts } from '../hooks/useAgriFacts';
import { isSprayKind, type AgriKind } from '../lib/agriCategory';
import { qty } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useAgriExtras(_sales: HistorySale[]) {
  const facts = useAgriFacts();
  return (sale: HistorySale) => {
    let kg = 0;
    let sprays = 0;
    let reEntry = 0;
    for (const it of sale.items) {
      const f = it.productId ? facts.get(it.productId) : undefined;
      if (!f) continue;
      const pack = Number(f.packSize) || 0;
      if (pack > 0 && (!f.packUnit || f.packUnit === 'kg')) kg += pack * Number(it.quantity || 0);
      if (isSprayKind(f.category as AgriKind)) { sprays += 1; reEntry = Math.max(reEntry, Number(f.reEntryPeriod) || 0); }
    }
    const order = sale.sourceRef?.startsWith('AGO-') ? sale.sourceRef : null;
    if (!kg && !sprays && !order) return null;
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      order ? createElement(Link, { key: 'o', to: `/agri/bulk-orders?search=${order}`, onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(), className: `${chip} bg-violet-50 text-violet-700 hover:underline` },
        createElement(Boxes, { className: 'h-3 w-3' }), `Bulk order ${order}`) : null,
      kg ? createElement('span', { key: 'kg', className: `${chip} bg-lime-50 text-lime-800` }, createElement(Weight, { className: 'h-3 w-3' }), kg >= 1000 ? `${qty(kg / 1000)} ton` : `${qty(kg)} kg`) : null,
      sprays ? createElement('span', { key: 'sp', className: `${chip} bg-amber-50 text-amber-800` }, createElement(Bug, { className: 'h-3 w-3' }), `${sprays} spray${reEntry ? ` · ${reEntry} din khet me na jayein` : ''}`) : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Agri', useBillExtras: useAgriExtras };

export default function AgriSalesPage() {
  return <SalesHistoryPage config={config} />;
}
