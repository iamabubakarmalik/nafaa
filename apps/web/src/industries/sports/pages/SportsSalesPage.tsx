/**
 * Sports sales history: the shared history, with a chip on team-order and
 * repair delivery bills that opens the order or the repair.
 */

import { createElement } from 'react';
import { Link } from 'react-router-dom';
import { Shirt, Wrench } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ring-1';

function useSourceChips() {
  return (sale: HistorySale) => {
    const ref = sale.sourceRef ?? '';
    const team = ref.startsWith('TO-');
    if (!team && !ref.startsWith('RS-')) return null;
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      createElement(Link, {
        to: `${team ? '/sports/team-orders' : '/sports/repair-services'}?q=${encodeURIComponent(ref)}`,
        onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
        className: `${chip} ${team ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`,
      }, createElement(team ? Shirt : Wrench, { className: 'h-3 w-3' }), `${team ? 'Team order' : 'Repair'} ${ref}`),
    );
  };
}

const config: SalesHistoryConfig = { label: 'Sports', useBillExtras: useSourceChips };

export default function SportsSalesPage() {
  return <SalesHistoryPage config={config} />;
}
