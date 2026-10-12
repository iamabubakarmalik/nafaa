/**
 * Printable list of stock transfers for the shared print button (A4, PDF
 * or thermal).
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { TransferList } from '../api/transfers.api';
import { STATUS, day, shortValue } from './transferMeta';

export function transfersListDoc(list: TransferList, period: string, scope: string): PrintDoc {
  const short = list.items.reduce((s, t) => s + shortValue(t), 0);
  return {
    title: 'Stock transfers',
    subtitle: period,
    meta: [
      ['Kis ke', scope],
      ['Transfers', String(list.total)],
      ['Maal ki qeemat', formatPKR(list.totals.value)],
      ['Raste me', `${list.totals.inTransit} · ${formatPKR(list.totals.inTransitValue)}`],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Tareekh' }, { label: 'Transfer #', wideOnly: true }, { label: 'Kahan se' }, { label: 'Kahan' },
          { label: 'Cheezein', align: 'right', wideOnly: true }, { label: 'Halat', wideOnly: true }, { label: 'Qeemat', align: 'right' },
        ],
        rows: list.items.map((t) => [
          day(t.createdAt), t.transferNumber, t.fromShop.name, t.toShop.name, String(t.items.length),
          shortValue(t) > 0 ? `${STATUS[t.status].label} (kam aaya)` : STATUS[t.status].label, formatPKR(t.value),
        ]),
        footer: ['', '', 'Kul', '', '', '', formatPKR(list.items.reduce((s, t) => s + (t.status === 'CANCELLED' ? 0 : t.value), 0))],
      },
      ...(short > 0 ? [{ kind: 'rows' as const, rows: [{ label: 'Kam aaya maal', value: formatPKR(short), strong: true }] }] : []),
    ],
  };
}
