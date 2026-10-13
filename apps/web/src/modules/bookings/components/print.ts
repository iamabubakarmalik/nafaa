/**
 * Printable bookings list for the current filter: each booking with its
 * pickup, status and money, then totals. A PrintDoc, so the shared print
 * button prints it on A4, as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { BookingRecords } from '../api/bookings.api';
import { STATUS, itemsSummary } from './meta';

const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

export function bookingsDoc(list: BookingRecords, title: string, period: string, filter: string): PrintDoc {
  const t = list.totals;
  return {
    title,
    subtitle: period,
    meta: [['Bookings', String(list.total)], ...(filter ? [['Filter', filter] as [string, string]] : []), ['Kul', formatPKR(t.value)], ['Baqi', formatPKR(t.balance)]],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'No.' }, { label: 'Customer' }, { label: 'Phone', wideOnly: true }, { label: 'Cheezen', wideOnly: true },
          { label: 'Pickup' }, { label: 'Haal', wideOnly: true }, { label: 'Kul', align: 'right', wideOnly: true }, { label: 'Baqi', align: 'right' },
        ],
        rows: list.items.map((b) => [
          b.bookingNumber, b.customer?.name ?? '', b.customer?.phone ?? '', itemsSummary(b, 3), day(b.expectedPickupAt),
          STATUS[b.status].label, formatPKR(b.total), formatPKR(b.balanceDue),
        ]),
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          { label: 'Kul amount', value: formatPKR(t.value) },
          { label: 'Mil chuka', value: formatPKR(t.paid) },
          { label: 'Baqi', value: formatPKR(t.balance), strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? `Pehli ${list.items.length} bookings dikhayi gayi hain (kul ${list.total})` : undefined,
  };
}
