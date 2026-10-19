/**
 * Pharmacy sales history: the shared history, with a mark under each bill
 * that had prescription or register medicines (the register page shows the
 * patient and doctor of each).
 */

import { createElement } from 'react';
import { FileText, ShieldAlert } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';
import { useMedicineFacts } from '../hooks/useMedicineFacts';
import { REGISTER_CLASSES } from '../lib/meta';

const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold';

function useRxExtras(_sales: HistorySale[]) {
  const facts = useMedicineFacts();
  return (sale: HistorySale) => {
    let rx = 0;
    let register = 0;
    for (const it of sale.items) {
      const m = it.productId ? facts.get(it.productId) : undefined;
      if (!m) continue;
      if (m.isNarcotic || REGISTER_CLASSES.includes(m.scheduleClass)) register += 1;
      else if (m.requiresPrescription) rx += 1;
    }
    if (!rx && !register) return null;
    return createElement('div', { className: 'mt-1.5 flex flex-wrap gap-1' },
      register ? createElement('span', { key: 'reg', className: `${chip} bg-rose-50 text-rose-700` }, createElement(ShieldAlert, { className: 'h-3 w-3' }), `${register} register wali`) : null,
      rx ? createElement('span', { key: 'rx', className: `${chip} bg-amber-50 text-amber-800` }, createElement(FileText, { className: 'h-3 w-3' }), `${rx} Rx`) : null,
    );
  };
}

const config: SalesHistoryConfig = { label: 'Pharmacy', useBillExtras: useRxExtras };

export default function PharmacySales() {
  return <SalesHistoryPage config={config} />;
}
