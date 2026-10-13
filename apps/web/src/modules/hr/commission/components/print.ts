/**
 * Printable commission documents (PrintDoc, so the shared print button gives
 * A4, PDF or a thermal slip): the month for everyone shown, and one
 * person's full statement with rules, goods, returns and recent months.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { CommissionDetail, CommissionLine, CommissionRow, CommissionSummary } from '../api/commission.api';
import { PAY, day, periodLabel, qtyText, signed } from './meta';

export function lineBase(l: CommissionLine) {
  if (l.basis === 'TARGET') return `Sale ${formatPKR(l.base)}`;
  if (l.basis === 'PER_BILL') return `${l.base} bill × ${formatPKR(l.rate)}`;
  if (l.valueType === 'FIXED') return `${qtyText(l.base)} cheez × ${formatPKR(l.rate)}`;
  return `${formatPKR(l.base)} × ${l.rate}%`;
}

export function returnText(l: CommissionLine) {
  if (!l.returnAmount) return '';
  if (l.basis === 'PER_BILL') return `${l.returnBase} bill poore wapas`;
  if (l.valueType === 'FIXED') return `${qtyText(l.returnBase)} cheez wapas`;
  return `${formatPKR(l.returnBase)} ka maal wapas`;
}

export function monthDoc(s: CommissionSummary, rows: CommissionRow[], filter: string): PrintDoc {
  const live = rows.filter((r) => r.enrolled);
  return {
    title: 'Commission',
    subtitle: periodLabel(s.period),
    meta: [
      ['Bande', String(live.length)],
      ...(filter ? [['Filter', filter] as [string, string]] : []),
      ['Kul commission', formatPKR(live.reduce((a, r) => a + r.earned, 0))],
      ['Ada', formatPKR(rows.reduce((a, r) => a + (r.paidAmount ?? 0), 0))],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: 'Banda' }, { label: 'Bill', align: 'right', wideOnly: true }, { label: 'Sale', align: 'right', wideOnly: true },
          { label: 'Return', align: 'right', wideOnly: true }, { label: 'Commission', align: 'right' }, { label: 'Ada', align: 'right', wideOnly: true },
          { label: 'Baqi', align: 'right' },
        ],
        rows: rows.map((r) => [
          `${r.name}${r.enrolled ? '' : ' (chaalu nahi)'}`, String(r.bills), formatPKR(r.sale), r.returnSale ? formatPKR(r.returnSale) : '—',
          signed(r.earned), r.paidAmount != null ? formatPKR(r.paidAmount) : '—', formatPKR(r.due),
        ]),
        footer: [
          'Kul', String(rows.reduce((a, r) => a + r.bills, 0)), formatPKR(rows.reduce((a, r) => a + r.sale, 0)),
          formatPKR(rows.reduce((a, r) => a + r.returnSale, 0)), signed(live.reduce((a, r) => a + r.earned, 0)),
          formatPKR(rows.reduce((a, r) => a + (r.paidAmount ?? 0), 0)), formatPKR(rows.reduce((a, r) => a + r.due, 0)),
        ],
      },
    ],
    footer: `Sale = maal ki qeemat discount ke baad. Return us mahine me katti hai jis me maal wapas aaya. Void bill shamil nahi.`,
  };
}

export function statementDoc(d: CommissionDetail, showCost: boolean): PrintDoc {
  return {
    title: `Commission statement — ${d.name}`,
    subtitle: periodLabel(d.period),
    meta: [
      ...(d.staff?.designation ? [['Kaam', d.staff.designation] as [string, string]] : []),
      ...(d.staff?.staffNumber ? [['Staff #', d.staff.staffNumber] as [string, string]] : []),
      ['Bill', String(d.bills)],
      ['Sale', formatPKR(d.sale)],
      ['Haal', PAY[d.payStatus].label],
    ],
    sections: [
      {
        kind: 'rows',
        title: 'Hisab',
        rows: [
          { label: 'Sale (discount ke baad)', value: formatPKR(d.grossSale) },
          ...(d.returnSale ? [{ label: 'Is mahine wapas aaya maal', value: `−${formatPKR(d.returnSale)}`, sub: true }] : []),
          { label: 'Asal sale', value: formatPKR(d.sale) },
          ...(showCost && d.profit != null ? [{ label: 'Profit', value: formatPKR(d.profit), sub: true }] : []),
          ...d.lines.map((l) => ({ label: `${l.label} (${lineBase(l)})${l.returnAmount ? ` · return −${formatPKR(l.returnAmount)}` : ''}`, value: signed(l.amount) })),
          { label: 'Kul commission', value: signed(d.earned), strong: true },
          ...(d.paidAmount != null ? [{ label: `Ada (${day(d.paidAt)})`, value: formatPKR(d.paidAmount) }] : []),
          { label: 'Baqi', value: formatPKR(d.due), strong: true },
          ...(d.baseSalary ? [{ label: 'Pakki tankhwah (Payroll se)', value: formatPKR(d.baseSalary), sub: true }] : []),
        ],
      },
      ...(d.byCategory.length ? [{
        kind: 'table' as const,
        title: 'Category ke hisaab se',
        columns: [{ label: 'Category' }, { label: 'Quantity', align: 'right' as const, wideOnly: true }, { label: 'Sale', align: 'right' as const }, { label: 'Commission', align: 'right' as const }],
        rows: d.byCategory.map((c) => [c.name, qtyText(c.qty), formatPKR(c.sale - c.returnedSale), signed(c.commission)]),
      }] : []),
      ...(d.byProduct.length ? [{
        kind: 'table' as const,
        title: 'Cheezein',
        columns: [{ label: 'Cheez' }, { label: 'Quantity', align: 'right' as const }, { label: 'Wapas', align: 'right' as const, wideOnly: true }, { label: 'Sale', align: 'right' as const, wideOnly: true }, { label: 'Commission', align: 'right' as const }],
        rows: d.byProduct.slice(0, 60).map((p) => [p.name, `${qtyText(p.qty)} ${p.unit}`, p.returnedQty ? qtyText(p.returnedQty) : '—', formatPKR(p.sale - p.returnedSale), signed(p.commission)]),
      }] : []),
      ...(d.returnList.length ? [{
        kind: 'table' as const,
        title: 'Return jo is mahine kati',
        columns: [{ label: 'Date' }, { label: 'Return #', wideOnly: true }, { label: 'Asal bill' }, { label: 'Maal', align: 'right' as const }],
        rows: d.returnList.map((r) => [day(r.returnedAt), r.returnNumber, `${r.saleNumber} (${day(r.soldAt)})`, formatPKR(r.value)]),
      }] : []),
      {
        kind: 'table',
        title: 'Pichle mahine',
        columns: [{ label: 'Mahina' }, { label: 'Sale', align: 'right', wideOnly: true }, { label: 'Commission', align: 'right' }, { label: 'Ada', align: 'right' }],
        rows: d.history.map((h) => [periodLabel(h.period, true), formatPKR(h.sale), signed(h.earned), h.paid != null ? formatPKR(h.paid) : '—']),
      },
    ],
    footer: 'Bikri = maal ki qeemat chhoot ke baad; service charge shamil nahi. Wapsi us mahine me katti hai jis me maal wapas aaya.',
  };
}
