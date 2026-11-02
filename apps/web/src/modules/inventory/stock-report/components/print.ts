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
import { t as tr } from '@core/i18n';

const today = () => new Date().toISOString().slice(0, 10);

export function stockDoc(list: StockList, filter: string, showCost: boolean): PrintDoc {
  const t = list.totals;
  return {
    title: tr('Stock report'),
    subtitle: filter || tr('Sab maal'),
    meta: [
      [tr('Date'), dateText(new Date().toISOString())],
      [tr('Cheezein'), String(t.lines)],
      [tr('Bechne par'), formatPKR(t.retail)],
      ...(showCost ? [[tr('Cost'), formatPKR(t.cost)] as [string, string], [tr('Mumkin profit'), formatPKR(t.profit)] as [string, string]] : []),
    ],
    sections: [{
      kind: 'table',
      columns: [
        { label: tr('Cheez') }, { label: tr('Stock'), align: 'right' }, { label: tr('Halat'), wideOnly: true },
        { label: tr('Aakhri sale'), wideOnly: true },
        ...(showCost ? [{ label: tr('Cost'), align: 'right' as const }] : []),
        { label: tr('Bechne par'), align: 'right' },
      ],
      rows: list.items.map((l) => [
        l.name, `${qty(l.stock)} ${l.unit}`, LINE_STATUS[l.status].label, ageText(l.saleAge),
        ...(showCost ? [formatPKR(l.valueAtCost)] : []), formatPKR(l.retail),
      ]),
      footer: [tr('Kul'), qty(t.units), '', '', ...(showCost ? [formatPKR(t.cost)] : []), formatPKR(t.retail)],
    }],
    footer: list.total > list.items.length ? tr('Pehli {{count}} cheezein (kul {{total}})', { count: list.items.length, total: list.total }) : tr('Cost ausat cost (average) par'),
  };
}

export function stockCsv(items: StockLine[], header: string[], showCost: boolean, shops: Array<{ id: string; name: string }>) {
  const head = [
    tr('Cheez'), 'SKU', tr('Barcode'), tr('Category'), tr('Brand'), tr('Supplier'), tr('Unit'), tr('Stock'), tr('Alert'), tr('Halat'), tr('Nishan'),
    ...(showCost ? [tr('Cost (ausat)'), tr('Cost')] : []), tr('Rate'), tr('Bechne par'), ...(showCost ? [tr('Mumkin profit'), tr('Margin %')] : []),
    tr('Biki (period)'), tr('Sale amount'), tr('Kitne din chalega'), tr('Aakhri sale'), tr('Maal aaya'), tr('IMEI/Serial'), tr('Expiry'),
    ...shops.map((s) => `${s.name} stock`),
  ];
  const rows = items.map((l) => [
    l.name, l.sku ?? '', l.barcode ?? '', l.category?.name ?? '', l.brand?.name ?? '', l.supplier?.name ?? '', l.unit,
    l.stock, l.alert, LINE_STATUS[l.status].label, l.flags.join(' + '),
    ...(showCost ? [l.cost.toFixed(2), l.valueAtCost.toFixed(2)] : []), l.price.toFixed(2), l.retail.toFixed(2),
    ...(showCost ? [l.profit.toFixed(2), l.margin.toFixed(1)] : []),
    l.sold.qty, l.sold.revenue.toFixed(2), coverText(l.cover), l.lastSoldAt ? dateText(l.lastSoldAt) : tr('kabhi nahi'),
    l.lastInAt ? dateText(l.lastInAt) : '', l.devices ? `${l.devices.count} ${l.devices.label}` : '',
    l.expiry ? `${dateText(l.expiry.date)} · ${l.expiry.qty}` : '',
    ...shops.map((s) => l.shops?.find((x) => x.shopId === s.id)?.stock ?? 0),
  ]);
  downloadCsv(`stock-report-${today()}.csv`, [...header.map((h) => [h]), [''], head, ...rows]);
}

export function ledgerDoc(l: StockLedger, period: string, showCost: boolean): PrintDoc {
  const t = l.totals;
  return {
    title: tr('Stock ka hisaab'),
    subtitle: period,
    meta: [
      [tr('Shuru me'), `${qty(t.opening.units)} · ${formatPKR(showCost ? t.opening.cost : t.opening.retail)}`],
      [tr('Aakhir me'), `${qty(t.closing.units)} · ${formatPKR(showCost ? t.closing.cost : t.closing.retail)}`],
      [tr('Cheezein'), String(t.lines)],
    ],
    sections: [
      {
        kind: 'rows',
        title: tr('Kya aaya, kya gaya'),
        rows: KINDS.map((k) => ({ k, v: t.kinds.find((x) => x.key === k.key) })).filter((x) => x.v).map(({ k, v }) => ({
          label: k.label, value: `${qty(v!.qty)}${showCost ? ` · ${formatPKR(v!.cost)}` : ''}`,
        })),
      },
      {
        kind: 'table',
        columns: [
          { label: tr('Cheez') }, { label: tr('Shuru'), align: 'right' }, { label: tr('Aaya'), align: 'right', wideOnly: true },
          { label: tr('Gaya'), align: 'right', wideOnly: true }, { label: tr('Aakhir'), align: 'right' },
          ...(showCost ? [{ label: tr('Cost'), align: 'right' as const, wideOnly: true }] : []),
        ],
        rows: l.items.map((x) => [
          x.name, qty(x.opening), qty(x.inQty), qty(x.outQty), `${qty(x.closing)} ${x.unit}`,
          ...(showCost ? [formatPKR(x.closingValue.cost)] : []),
        ]),
      },
    ],
    footer: tr('Qeemat aaj ki ausat cost par{{value}}', { value: l.total > l.items.length ? tr(' · pehli {{count}} cheezein (kul {{total}})', { count: l.items.length, total: l.total }) : '' }),
  };
}

export function ledgerCsv(l: StockLedger, header: string[], showCost: boolean) {
  const head = [tr('Cheez'), 'SKU', tr('Unit'), tr('Shuru me'), ...KINDS.map((k) => k.label), tr('Aakhir me'), tr('Farq'),
    ...(showCost ? [tr('Shuru cost'), tr('Aakhir cost')] : []), tr('Aakhir bechne par')];
  const rows = l.items.map((x) => [
    x.name, x.sku ?? '', x.unit, x.opening, ...KINDS.map((k) => x.kinds[k.key] ?? 0), x.closing, x.change,
    ...(showCost ? [x.openingValue.cost.toFixed(2), x.closingValue.cost.toFixed(2)] : []), x.closingValue.retail.toFixed(2),
  ]);
  downloadCsv(`stock-ledger-${today()}.csv`, [...header.map((h) => [h]), [''], head, ...rows]);
}

export function branchesDoc(b: StockBranches, showCost: boolean): PrintDoc {
  return {
    title: tr('Branches ka stock'),
    meta: [[tr('Date'), dateText(new Date().toISOString())], [tr('Branches'), String(b.shops.length)]],
    sections: [{
      kind: 'table',
      columns: [
        { label: tr('Branch') }, { label: tr('Cheezein'), align: 'right', wideOnly: true },
        ...(showCost ? [{ label: tr('Cost'), align: 'right' as const }] : []), { label: tr('Bechne par'), align: 'right' },
        { label: tr('Khatam'), align: 'right', wideOnly: true }, { label: tr('Sale'), align: 'right', wideOnly: true },
      ],
      rows: b.shops.map((s) => [
        s.name, String(s.lines), ...(showCost ? [formatPKR(s.cost)] : []), formatPKR(s.retail), String(s.out), formatPKR(s.sold.revenue),
      ]),
    }, ...(b.moves.length ? [{
      kind: 'table' as const,
      title: tr('Branch se branch bhejne layak'),
      columns: [{ label: tr('Cheez') }, { label: tr('Se') }, { label: tr('Ko') }, { label: tr('Quantity'), align: 'right' as const }],
      rows: b.moves.map((m) => [m.name, b.shops.find((s) => s.shopId === m.from)?.name ?? '', b.shops.find((s) => s.shopId === m.to)?.name ?? '', `${qty(m.qty)} ${m.unit}`]),
    }] : [])],
  };
}
