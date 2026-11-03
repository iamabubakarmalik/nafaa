/**
 * Jewelry on the shared Sales history and receipt: a karat and weight chip on
 * the bill, links to the repair it delivered or the customer's custom orders,
 * and on the receipt the karat, weight, rate, making and wastage per piece.
 * Details come from the jewelry bill (found by bill number, needs internet)
 * and are cached.
 */

import { Gem, Hammer, Wrench } from 'lucide-react-native';
import { formatMoney, formatNumber } from '@/core/format';
import { t } from '@/core/i18n';
import { registerReceiptIndustry } from '@/core/receipt';
import { registerSalesExtras, type SaleChip, type SaleLink } from '@/modules/sales/industry/registry';
import type { HistorySale } from '@/modules/sales/api/history';
import { queryClient } from '@/core/query/client';
import { billOf, word } from '../retail/lib/bill';
import { createBillLookup } from '../retail/lib/lookup';
import { jewelrySalesApi, repairsApi, type JewelryBill, type Repair } from './api';
import { KEYS } from './meta';

const keyOf = (s: { id: string; saleNumber: string }) => `${s.id}|${s.saleNumber}`;

const bills = createBillLookup<JewelryBill>(async (keys) => {
  const rows = await jewelrySalesApi.byNumbers(keys.map((k) => k.split('|')[1]));
  const out = new Map<string, JewelryBill>();
  for (const k of keys) {
    const b = rows.find((r) => r.invoiceNumber === k.split('|')[1]);
    if (b) out.set(k, b);
  }
  return out;
}, { saleIdOf: (k) => k.split('|')[0] });

const karat = (purity: string) => (/^KARAT_/.test(purity) ? `${purity.replace('KARAT_', '')}K` : purity.replace(/_/g, ' '));
const kg = (g: number) => `${formatNumber(Math.round(g * 1000) / 1000, { maxDecimals: 3 })} g`;

/** Delivered repairs by the bill that closed them (recent ones only; cached for a minute). */
const repairBills = createBillLookup<Repair>(async (ids) => {
  const page = await queryClient.fetchQuery({ queryKey: [KEYS.repairs, 'by-bill'], queryFn: () => repairsApi.page({ view: 'done', limit: 100 }), staleTime: 60_000 });
  const out = new Map<string, Repair>();
  for (const id of ids) { const r = page.items.find((x) => x.saleId === id); if (r) out.set(id, r); }
  return out;
});

const chipsOf = (s: HistorySale): SaleChip[] => {
  const b = s.pending ? undefined : bills.get(keyOf(s));
  if (!b?.items.length) return [];
  const purities = [...new Set(b.items.map((i) => karat(i.purity)))];
  const net = b.items.reduce((a, i) => a + Number(i.netWeight || 0) * Number(i.quantity || 1), 0);
  return [
    { label: `${purities.slice(0, 2).join('/')} · ${kg(net)}`, tone: 'accent', icon: Gem },
    ...(repairBills.get(s.id) ? [{ label: t('Repair'), tone: 'info' as const, icon: Wrench }] : []),
  ];
};

const linksOf = (s: HistorySale): SaleLink[] => {
  if (s.pending) return [];
  const repair = repairBills.peek(s.id);
  return [
    ...(repair ? [{ icon: Wrench, label: t('Repair'), hint: repair.repairNumber, href: `/jewelry/repairs?q=${encodeURIComponent(repair.repairNumber)}` }] : []),
    ...(s.customer ? [{ icon: Hammer, label: t('Custom orders'), hint: s.customer.name, href: `/jewelry/custom-orders?q=${encodeURIComponent(s.customer.name)}` }] : []),
  ];
};

registerSalesExtras('jewelry', { rowChips: chipsOf, rowActions: linksOf, detailLinks: (s) => linksOf(s) });

registerReceiptIndustry('jewelry', (_doc, ctx) => {
  const bill = billOf(ctx);
  if (!bill) return null;
  const b = bills.get(`${bill.saleId}|${bill.saleNumber}`);
  if (!b?.items.length) return null;
  const w = (en: string, ur: string, roman = en) => word(ctx.lang, en, ur, roman);
  // Pieces are posted to the bill in the same order; fall back to the name when the counts differ.
  const pieceFor = (i: number, name: string) => (b.items.length === bill.items.length ? b.items[i] : b.items.find((p) => name.startsWith(p.productName)));
  const lineDetails = bill.items.map((it, i) => {
    const p = pieceFor(i, it.name);
    if (!p) return undefined;
    return [
      `${karat(p.purity)} · ${w('Net', 'خالص', 'Net')} ${kg(p.netWeight)} @ ${formatMoney(p.ratePerGram)}/g`,
      [
        `${w('Gross', 'کل وزن', 'Gross')} ${kg(p.grossWeight)}`,
        p.stoneWeight ? `${w('Stone', 'پتھر', 'Pathar')} ${kg(p.stoneWeight)}` : '',
        p.makingTotal > 0 ? `${w('Making', 'بنوائی', 'Banwai')} ${formatMoney(p.makingTotal)}` : '',
        p.wastagePct > 0 ? `${w('Wastage', 'ویسٹج', 'Wastage')} ${p.wastagePct}%` : '',
      ].filter(Boolean).join(' · '),
      p.hallmarkNumber ? `${w('Hallmark', 'ہال مارک', 'Hallmark')} ${p.hallmarkNumber}` : '',
    ].filter(Boolean);
  });
  const included = w('included in price', 'قیمت میں شامل', 'price me shamil');
  return {
    lineDetails,
    extraRows: [
      ...(b.makingCharges > 0 ? [{ label: `${w('Making', 'بنوائی', 'Banwai')} (${included})`, value: formatMoney(b.makingCharges) }] : []),
      ...(b.wastageValue > 0 ? [{ label: `${w('Wastage', 'ویسٹج', 'Wastage')} (${included})`, value: formatMoney(b.wastageValue) }] : []),
    ],
  };
});
