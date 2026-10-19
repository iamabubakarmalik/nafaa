/**
 * Clinic bills: the shared sales history, with a mark on bills that are
 * appointment or lab fees (made from the visit and lab pages) so the
 * counter can tell them from medicine sales.
 */

import { createElement } from 'react';
import { Stethoscope } from 'lucide-react';
import { SalesHistoryPage, type SalesHistoryConfig } from '@modules/sales/history/SalesHistoryPage';
import type { HistorySale } from '@modules/sales/history/api';

/** Name of the catalogue line every clinic fee is billed against (see the API fee billing). */
const FEE_LINE = 'Doctor / Clinic Fee';

function useFeeMarks(_sales: HistorySale[]) {
  return (sale: HistorySale) => (sale.items.some((i) => i.name === FEE_LINE)
    ? createElement('div', { className: 'mt-1.5' },
      createElement('span', { className: 'inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-sky-800' },
        createElement(Stethoscope, { className: 'h-3 w-3' }), 'Doctor / lab fees'))
    : null);
}

const config: SalesHistoryConfig = { label: 'Clinic', useBillExtras: useFeeMarks };

export default function ClinicSalesPage() {
  return <SalesHistoryPage config={config} />;
}
