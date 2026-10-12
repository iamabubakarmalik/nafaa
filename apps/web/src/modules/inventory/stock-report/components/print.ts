/**
 * Stock report print-outs and exports: the stock list with its value, the
 * period ledger (opening, in, out, closing) and the branch comparison. Each
 * PrintDoc prints on A4, as a PDF or on a thermal slip; cost columns are
 * left out when cost is hidden.
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc } from '@core/print';
import type { StockBranches, StockLedger, StockLine, StockList } from '../api/stock-report.api';
import { KINDS, LINE_STATUS, ageText, coverText, dateText, downloadCsv, qty } from './meta';

const today = () => new Date().toISOString().slice(0, 10);

export function stockDoc(list: StockList, filter: string, showCost: boolean): PrintDoc {
  const t = list.totals;
  return {
    title: 'Stock report',
    subtitle: filter || 'Sab maal',
    meta: [
      ['Tareekh', dateText(new Date().toISOString())],
      ['Cheezein', String(t.lines)],
      ['Bechne par', formatPKR(t.retail)],
      ...(showCost ? [['Lagat', formatPKR(t.cost)] as [string, string], ['Mumkin munafa', formatPKR(t.profit)] as [string, string]] : []),
    ],
    sections: [{
      kind: 'table',
      columns: [
        { label: 'Cheez' }, { label: 'Stock', align: 'right' }, { label: 'Halat', wideOnly: true },
        { label: 'Aakhri bikri', wideOnly: true },
        ...(showCost ? [{ label: 'Lagat', align: 'right' as const }] : []),
        { label: 'Bechne par', align: 'right' },
      ],
      rows: list.items.map((l) => [
        l.name, `${qty(l.stock)} ${l.unit}`, LINE_STATUS[l.status].label, ageText(l.saleAge),
        ...(showCost ? [formatPKR(l.valueAtCost)] : []), formatPKR(l.retail),
      ]),
      footer: ['Kul', qty(t.units), '', '', ...(showCost ? [formatPKR(t.cost)] : []), formatPKR(t.retail)],
    }],
    footer: list.total > list.items.length ? `Pehli ${list.items.length} cheezein (kul ${list.total})` : 'Lagat ausat cost (average) par',
  };
}

export function stockCsv(items: StockLine[], header: string[], showCost: boolean, shops: Array<{ id: string; name: string }>) {
  const head = [
    'Cheez', 'SKU', 'Barcode', 'Category', 'Brand', 'Supplier', 'Unit', 'Stock', 'Alert', 'Halat', 'Nishan',
    ...(showCost ? ['Cost (ausat)', 'Lagat'] : []), 'Rate', 'Bechne par', ...(showCost ? ['Mumkin munafa', 'Margin %'] : []),
    'Biki (muddat)', 'Bikri raqam', 'Kitne din chalega', 'Aakhri bikri', 'Maal aaya', 'IMEI/Serial', 'Expiry',
    ...shops.map((s) => `${s.name} stock`),
  ];
  const rows = items.map((l) => [
    l.name, l.sku ?? '', l.barcode ?? '', l.category?.name ?? '', l.brand?.name ?? '', l.supplier?.name ?? '', l.unit,
    l.stock, l.alert, LINE_STATUS[l.status].label, l.flags.join(' + '),
    ...(showCost ? [l.cost.toFixed(2), l.valueAtCost.toFixed(2)] : []), l.price.toFixed(2), l.retail.toFixed(2),
    ...(showCost ? [l.profit.toFixed(2), l.margin.toFixed(1)] : []),
    l.sold.qty, l.sold.revenue.toFixed(2), coverText(l.cover), l.lastSoldAt ? dateText(l.lastSoldAt) : 'kabhi nahi',
    l.lastInAt ? dateText(l.lastInAt) : '', l.devices ? `${l.devices.count} ${l.devices.label}` : '',
    l.expiry ? `${dateText(l.expiry.date)} · ${l.expiry.qty}` : '',
    ...shops.map((s) => l.shops?.find((x) => x.shopId === s.id)?.stock ?? 0),
  ]);
  downloadCsv(`stock-report-${today()}.csv`, [...header.map((h) => [h]), [''], head, ...rows]);
}

export function ledgerDoc(l: StockLedger, period: string, showCost: boolean): PrintDoc {
  const t = l.totals;
  return {
    title: 'Stock ka hisaab',
    subtitle: period,
    meta: [
      ['Shuru me', `${qty(t.opening.units)} · ${formatPKR(showCost ? t.opening.cost : t.opening.retail)}`],
      ['Aakhir me', `${qty(t.closing.units)} · ${formatPKR(showCost ? t.closing.cost : t.closing.retail)}`],
      ['Cheezein', String(t.lines)],
    ],
    sections: [
      {
        kind: 'rows',
        title: 'Kya aaya, kya gaya',
        rows: KINDS.map((k) => ({ k, v: t.kinds.find((x) => x.key === k.key) })).filter((x) => x.v).map(({ k, v }) => ({
          label: k.label, value: `${qty(v!.qty)}${showCost ? ` · ${formatPKR(v!.cost)}` : ''}`,
        })),
      },
      {
        kind: 'table',
        columns: [
          { label: 'Cheez' }, { label: 'Shuru', align: 'right' }, { label: 'Aaya', align: 'right', wideOnly: true },
          { label: 'Gaya', align: 'right', wideOnly: true }, { label: 'Aakhir', align: 'right' },
          ...(showCost ? [{ label: 'Lagat', align: 'right' as const, wideOnly: true }] : []),
        ],
        rows: l.items.map((x) => [
          x.name, qty(x.opening), qty(x.inQty), qty(x.outQty), `${qty(x.closing)} ${x.unit}`,
          ...(showCost ? [formatPKR(x.closingValue.cost)] : []),
        ]),
      },
    ],
    footer: `Qeemat aaj ki ausat cost par${l.total > l.items.length ? ` · pehli ${l.items.length} cheezein (kul ${l.total})` : ''}`,
  };
}

export function ledgerCsv(l: StockLedger, header: string[], showCost: boolean) {
  const head = ['Cheez', 'SKU', 'Unit', 'Shuru me', ...KINDS.map((k) => k.label), 'Aakhir me', 'Farq',
    ...(showCost ? ['Shuru lagat', 'Aakhir lagat'] : []), 'Aakhir bechne par'];
  const rows = l.items.map((x) => [
    x.name, x.sku ?? '', x.unit, x.opening, ...KINDS.map((k) => x.kinds[k.key] ?? 0), x.closing, x.change,
    ...(showCost ? [x.openingValue.cost.toFixed(2), x.closingValue.cost.toFixed(2)] : []), x.closingValue.retail.toFixed(2),
  ]);
  downloadCsv(`stock-ledger-${today()}.csv`, [...header.map((h) => [h]), [''], head, ...rows]);
}

export function branchesDoc(b: StockBranches, showCost: boolean): PrintDoc {
  return {
    title: 'Branches ka stock',
    meta: [['Tareekh', dateText(new Date().toISOString())], ['Branches', String(b.shops.length)]],
    sections: [{
      kind: 'table',
      columns: [
        { label: 'Branch' }, { label: 'Cheezein', align: 'right', wideOnly: true },
        ...(showCost ? [{ label: 'Lagat', align: 'right' as const }] : []), { label: 'Bechne par', align: 'right' },
        { label: 'Khatam', align: 'right', wideOnly: true }, { label: 'Bikri', align: 'right', wideOnly: true },
      ],
      rows: b.shops.map((s) => [
        s.name, String(s.lines), ...(showCost ? [formatPKR(s.cost)] : []), formatPKR(s.retail), String(s.out), formatPKR(s.sold.revenue),
      ]),
    }, ...(b.moves.length ? [{
      kind: 'table' as const,
      title: 'Branch se branch bhejne layak',
      columns: [{ label: 'Cheez' }, { label: 'Se' }, { label: 'Ko' }, { label: 'Miqdar', align: 'right' as const }],
      rows: b.moves.map((m) => [m.name, b.shops.find((s) => s.shopId === m.from)?.name ?? '', b.shops.find((s) => s.shopId === m.to)?.name ?? '', `${qty(m.qty)} ${m.unit}`]),
    }] : [])],
  };
}
