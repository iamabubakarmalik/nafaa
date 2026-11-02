/**
 * Printable commission documents (PrintDoc, so the shared print button gives
 * A4, PDF or a thermal slip): the month for everyone shown, and one
 * person's full statement with rules, goods, returns and recent months.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { CommissionDetail, CommissionLine, CommissionRow, CommissionSummary } from '../api/commission.api';
import { PAY, day, periodLabel, qtyText, signed } from './meta';
import { t } from '@core/i18n';

export function lineBase(l: CommissionLine) {
  if (l.basis === 'TARGET') return t('Sale {{base}}', { base: formatPKR(l.base) });
  if (l.basis === 'PER_BILL') return t('{{base}} bill × {{rate}}', { base: l.base, rate: formatPKR(l.rate) });
  if (l.valueType === 'FIXED') return t('{{base}} cheez × {{rate}}', { base: qtyText(l.base), rate: formatPKR(l.rate) });
  return `${formatPKR(l.base)} × ${l.rate}%`;
}

export function returnText(l: CommissionLine) {
  if (!l.returnAmount) return '';
  if (l.basis === 'PER_BILL') return t('{{returnBase}} bill poore wapas', { returnBase: l.returnBase });
  if (l.valueType === 'FIXED') return t('{{returnBase}} cheez wapas', { returnBase: qtyText(l.returnBase) });
  return t('{{returnBase}} ka maal wapas', { returnBase: formatPKR(l.returnBase) });
}

export function monthDoc(s: CommissionSummary, rows: CommissionRow[], filter: string): PrintDoc {
  const live = rows.filter((r) => r.enrolled);
  return {
    title: t('Commission'),
    subtitle: periodLabel(s.period),
    meta: [
      [t('Bande'), String(live.length)],
      ...(filter ? [[t('Filter'), filter] as [string, string]] : []),
      [t('Kul commission'), formatPKR(live.reduce((a, r) => a + r.earned, 0))],
      [t('Ada'), formatPKR(rows.reduce((a, r) => a + (r.paidAmount ?? 0), 0))],
    ],
    sections: [
      {
        kind: 'table',
        columns: [
          { label: t('Banda') }, { label: t('Bill'), align: 'right', wideOnly: true }, { label: t('Sale'), align: 'right', wideOnly: true },
          { label: t('Return'), align: 'right', wideOnly: true }, { label: t('Commission'), align: 'right' }, { label: t('Ada'), align: 'right', wideOnly: true },
          { label: t('Baqi'), align: 'right' },
        ],
        rows: rows.map((r) => [
          `${r.name}${r.enrolled ? '' : t(' (chaalu nahi)')}`, String(r.bills), formatPKR(r.sale), r.returnSale ? formatPKR(r.returnSale) : '—',
          signed(r.earned), r.paidAmount != null ? formatPKR(r.paidAmount) : '—', formatPKR(r.due),
        ]),
        footer: [
          t('Kul'), String(rows.reduce((a, r) => a + r.bills, 0)), formatPKR(rows.reduce((a, r) => a + r.sale, 0)),
          formatPKR(rows.reduce((a, r) => a + r.returnSale, 0)), signed(live.reduce((a, r) => a + r.earned, 0)),
          formatPKR(rows.reduce((a, r) => a + (r.paidAmount ?? 0), 0)), formatPKR(rows.reduce((a, r) => a + r.due, 0)),
        ],
      },
    ],
    footer: t('Sale = maal ki qeemat discount ke baad. Return us mahine me katti hai jis me maal wapas aaya. Void bill shamil nahi.'),
  };
}

export function statementDoc(d: CommissionDetail, showCost: boolean): PrintDoc {
  return {
    title: t('Commission statement — {{name}}', { name: d.name }),
    subtitle: periodLabel(d.period),
    meta: [
      ...(d.staff?.designation ? [[t('Kaam'), d.staff.designation] as [string, string]] : []),
      ...(d.staff?.staffNumber ? [[t('Staff #'), d.staff.staffNumber] as [string, string]] : []),
      [t('Bill'), String(d.bills)],
      [t('Sale'), formatPKR(d.sale)],
      [t('Haal'), PAY[d.payStatus].label],
    ],
    sections: [
      {
        kind: 'rows',
        title: t('Hisab'),
        rows: [
          { label: t('Sale (discount ke baad)'), value: formatPKR(d.grossSale) },
          ...(d.returnSale ? [{ label: t('Is mahine wapas aaya maal'), value: `−${formatPKR(d.returnSale)}`, sub: true }] : []),
          { label: t('Asal sale'), value: formatPKR(d.sale) },
          ...(showCost && d.profit != null ? [{ label: t('Profit'), value: formatPKR(d.profit), sub: true }] : []),
          ...d.lines.map((l) => ({ label: `${l.label} (${lineBase(l)})${l.returnAmount ? ` · return −${formatPKR(l.returnAmount)}` : ''}`, value: signed(l.amount) })),
          { label: t('Kul commission'), value: signed(d.earned), strong: true },
          ...(d.paidAmount != null ? [{ label: t('Ada ({{paidAt}})', { paidAt: day(d.paidAt) }), value: formatPKR(d.paidAmount) }] : []),
          { label: t('Baqi'), value: formatPKR(d.due), strong: true },
          ...(d.baseSalary ? [{ label: t('Pakki tankhwah (Payroll se)'), value: formatPKR(d.baseSalary), sub: true }] : []),
        ],
      },
      ...(d.byCategory.length ? [{
        kind: 'table' as const,
        title: t('Category ke hisaab se'),
        columns: [{ label: t('Category') }, { label: t('Quantity'), align: 'right' as const, wideOnly: true }, { label: t('Sale'), align: 'right' as const }, { label: t('Commission'), align: 'right' as const }],
        rows: d.byCategory.map((c) => [c.name, qtyText(c.qty), formatPKR(c.sale - c.returnedSale), signed(c.commission)]),
      }] : []),
      ...(d.byProduct.length ? [{
        kind: 'table' as const,
        title: t('Cheezein'),
        columns: [{ label: t('Cheez') }, { label: t('Quantity'), align: 'right' as const }, { label: t('Wapas'), align: 'right' as const, wideOnly: true }, { label: t('Sale'), align: 'right' as const, wideOnly: true }, { label: t('Commission'), align: 'right' as const }],
        rows: d.byProduct.slice(0, 60).map((p) => [p.name, `${qtyText(p.qty)} ${p.unit}`, p.returnedQty ? qtyText(p.returnedQty) : '—', formatPKR(p.sale - p.returnedSale), signed(p.commission)]),
      }] : []),
      ...(d.returnList.length ? [{
        kind: 'table' as const,
        title: t('Return jo is mahine kati'),
        columns: [{ label: t('Date') }, { label: t('Return #'), wideOnly: true }, { label: t('Asal bill') }, { label: t('Maal'), align: 'right' as const }],
        rows: d.returnList.map((r) => [day(r.returnedAt), r.returnNumber, `${r.saleNumber} (${day(r.soldAt)})`, formatPKR(r.value)]),
      }] : []),
      {
        kind: 'table',
        title: t('Pichle mahine'),
        columns: [{ label: t('Mahina') }, { label: t('Sale'), align: 'right', wideOnly: true }, { label: t('Commission'), align: 'right' }, { label: t('Ada'), align: 'right' }],
        rows: d.history.map((h) => [periodLabel(h.period, true), formatPKR(h.sale), signed(h.earned), h.paid != null ? formatPKR(h.paid) : '—']),
      },
    ],
    footer: t('Sale = maal ki qeemat discount ke baad; service charge shamil nahi. Wapsi us mahine me katti hai jis me maal wapas aaya.'),
  };
}
