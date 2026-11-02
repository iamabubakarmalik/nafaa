/**
 * Printable bookings list for the current filter: each booking with its
 * pickup, status and money, then totals. A PrintDoc, so the shared print
 * button prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { BookingRecords } from '../api/bookings.api';
import { STATUS, itemsSummary } from './meta';
import { t as tr } from '@core/i18n';

const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

export function bookingsDoc(list: BookingRecords, title: string, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title,
    subtitle: period,
    meta: [[tr('Bookings'), String(list.total)], ...(filter ? [[tr('Filter'), filter] as [string, string]] : []), [tr('Kul'), formatPKR(t.value)], [tr('Baqi'), formatPKR(t.balance)]],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: tr('No.') }, { label: tr('Customer') }, { label: tr('Phone'), wideOnly: true }, { label: tr('Cheezen'), wideOnly: true },
          { label: tr('Pickup') }, { label: tr('Haal'), wideOnly: true }, { label: tr('Kul'), align: 'right', wideOnly: true }, { label: tr('Baqi'), align: 'right' },
        ],
        rows: list.items.map((b) => [
          b.bookingNumber, b.customer?.name ?? '', b.customer?.phone ?? '', itemsSummary(b, 3), day(b.expectedPickupAt),
          STATUS[b.status].label, formatPKR(b.total), formatPKR(b.balanceDue),
        ]),
      },
      {
        kind: 'rows',
        title: tr('Khulasa'),
        rows: [
          { label: tr('Kul amount'), value: formatPKR(t.value) },
          { label: tr('Mil chuka'), value: formatPKR(t.paid) },
          { label: tr('Baqi'), value: formatPKR(t.balance), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? tr('Pehli {{count}} bookings dikhayi gayi hain (kul {{total}})', { count: list.items.length, total: list.total }) : undefined,
  };
}
