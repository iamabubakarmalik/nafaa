/**
 * Printable stock adjustments report for the current filter: totals by type
 * and every line. A PrintDoc, so the shared print button prints it on A4,
 * as a PDF or on a thermal slip.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { AdjustmentList, StockAdjustment } from '../api/stock-adjustments.api';
import { TYPES, qtyText } from './meta';

const day = (v: string) => new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' });

/** Product with its variant, roll or device. */
export function itemLabel(a: StockAdjustment) {
  const extra = a.variant?.name ?? (a.carpetRoll ? `Roll ${a.carpetRoll.rollNumber}` : a.imei ? `IMEI ${a.imei.imei1}` : '');
  return extra ? `${a.product.name} (${extra})` : a.product.name;
}

/** Quantity with its sign and unit: carpet rolls move in sqft. */
export function qtyLabel(a: StockAdjustment) {
  return `${TYPES[a.type].sign > 0 ? '+' : '−'}${qtyText(a.quantity)} ${a.carpetRoll ? 'sqft' : a.product.unit}`;
}

export function adjustmentsDoc(list: AdjustmentList, period: string, filter: string): PrintDoc {
  const t = list.totals;
  const lost = t.outValue + t.damageValue + t.lossValue;
  return {
    title: 'Stock adjustments',
    subtitle: period,
    meta: [['Lines', String(list.total)], ...(filter ? [['Filter', filter] as [string, string]] : []), ['Barha', formatPKR(t.inValue)], ['Ghata', formatPKR(lost)]],
    sections: [
      {
        kind: 'table',
        columns: [{ label: 'Waqt' }, { label: 'Cheez' }, { label: 'Type', wideOnly: true }, { label: 'Quantity', align: 'right' }, { label: 'Amount', align: 'right' }, { label: 'Wajah', wideOnly: true }, { label: 'Kis ne', wideOnly: true }],
        rows: list.items.map((a) => [
          day(a.createdAt), itemLabel(a), TYPES[a.type].label, qtyLabel(a), formatPKR(a.value),
          `${a.reason}${a.note ? ` — ${a.note}` : ''}`, a.createdBy?.fullName ?? '',
        ]),
      },
      {
        kind: 'rows',
        title: 'Khulasa',
        rows: [
          ...(t.openingValue ? [{ label: `${TYPES.OPENING_BALANCE.label} (farq me nahi)`, value: `+${formatPKR(t.openingValue)}` }] : []),
          { label: TYPES.ADJUSTMENT_IN.label, value: `+${formatPKR(t.inValue)}` },
          { label: TYPES.ADJUSTMENT_OUT.label, value: `−${formatPKR(t.outValue)}` },
          { label: TYPES.DAMAGE.label, value: `−${formatPKR(t.damageValue)}` },
          { label: TYPES.LOSS.label, value: `−${formatPKR(t.lossValue)}` },
          { label: 'Kul farq', value: `${t.net >= 0 ? '+' : '−'}${formatPKR(Math.abs(t.net))}`, strong: true },
        ],
      },
    ],
    footer: list.total > list.items.length ? `Pehli ${list.items.length} lines dikhayi gayi hain (kul ${list.total})` : undefined,
  };
}
