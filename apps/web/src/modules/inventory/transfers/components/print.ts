/**
 * Printable list of stock transfers for the shared print button (A4, PDF
 * or thermal).
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { TransferList } from '../api/transfers.api';
import { STATUS, day, shortValue } from './transferMeta';
import { t as tr } from '@core/i18n';

export function transfersListDoc(list: TransferList, period: string, scope: string): PrintDoc {
  const short = list.items.reduce((s, t) => s + shortValue(t), 0);
  return {
    title: tr('Stock transfers'),
    subtitle: period,
    meta: [
      [tr('Kis ke'), scope],
      [tr('Transfers'), String(list.total)],
      [tr('Maal ki qeemat'), formatPKR(list.totals.value)],
      [tr('Raste me'), `${list.totals.inTransit} · ${formatPKR(list.totals.inTransitValue)}`],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: tr('Date') }, { label: tr('Transfer #'), wideOnly: true }, { label: tr('Kahan se') }, { label: tr('Kahan') },
          { label: tr('Cheezein'), align: 'right', wideOnly: true }, { label: tr('Halat'), wideOnly: true }, { label: tr('Qeemat'), align: 'right' },
        ],
        rows: list.items.map((t) => [
          day(t.createdAt), t.transferNumber, t.fromShop.name, t.toShop.name, String(t.items.length),
          shortValue(t) > 0 ? tr('{{label}} (kam aaya)', { label: STATUS[t.status].label }) : STATUS[t.status].label, formatPKR(t.value),
        ]),
        footer: ['', '', tr('Kul'), '', '', '', formatPKR(list.items.reduce((s, t) => s + (t.status === 'CANCELLED' ? 0 : t.value), 0))],
      },
      ...(short > 0 ? [{ kind: 'rows' as const, rows: [{ label: tr('Kam aaya maal'), value: formatPKR(short), strong: true }] }] : []),
    ],
  };
}
