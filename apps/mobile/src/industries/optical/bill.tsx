/**
 * Optical on the shared Sales history and receipt (web OpticalSales): chips
 * for a bill that came from a glasses or repair order or an eye test fee,
 * links to the order or the test, and on the receipt the customer's
 * prescription box with frame and lens details under each line. Order and
 * test lookups are batched and cached (needs internet; rows without a
 * result simply show no chip).
 */

import { Eye, Glasses, Wrench } from 'lucide-react-native';
import { eyeLine } from '@nafaa/core/industries/optical';
import { t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import { registerReceiptIndustry } from '@/core/receipt';
import { registerSalesExtras, type SaleChip, type SaleLink } from '@/modules/sales/industry/registry';
import type { HistorySale } from '@/modules/sales/api/history';
import { billOf, word } from '../retail/lib/bill';
import { createBillLookup } from '../retail/lib/lookup';
import { eyeTestsApi, lensOrdersApi, opticalProductsApi, prescriptionsApi, type OpticalFacts, type OpticalPrescription } from './api';
import { OPTICAL_KEYS } from './meta';

interface BillLinks { order?: { id: string; number: string; repair: boolean }; test?: { id: string; testNumber: string } }

const keyOf = (s: { id: string; saleNumber: string }) => `${s.id}|${s.saleNumber}`;

const links = createBillLookup<BillLinks>(async (keys) => {
  const parts = keys.map((k) => k.split('|') as [string, string]);
  const [orders, tests] = await Promise.all([
    lensOrdersApi.bySales(parts.map((p) => p[0])).catch(() => ({} as Awaited<ReturnType<typeof lensOrdersApi.bySales>>)),
    eyeTestsApi.bySales(parts.map((p) => p[1])).catch(() => []),
  ]);
  const out = new Map<string, BillLinks>();
  for (const [id, num] of parts) {
    const test = tests.find((x) => (x.notes ?? '').includes(`Bill ${num}: Rs `));
    const order = orders[id];
    if (order || test) out.set(`${id}|${num}`, { order, test: test && { id: test.id, testNumber: test.testNumber } });
  }
  return out;
}, { saleIdOf: (k) => k.split('|')[0] });

const forSale = (s: HistorySale) => (s.pending ? undefined : links.get(keyOf(s)));

const chipsOf = (s: HistorySale): SaleChip[] => {
  const l = forSale(s);
  if (!l) return [];
  return [
    ...(l.order || l.test ? [{ label: t('Rx'), tone: 'info' as const }] : []),
    ...(l.order ? [{ label: `${l.order.repair ? t('Repair') : t('Glasses')} ${l.order.number}`, tone: 'accent' as const, icon: l.order.repair ? Wrench : Glasses }] : []),
    ...(l.test ? [{ label: `${t('Eye test')} ${l.test.testNumber}`, tone: 'info' as const, icon: Eye }] : []),
  ];
};

const linksOf = (s: HistorySale): SaleLink[] => {
  const l = forSale(s);
  if (!l) return [];
  return [
    ...(l.order ? [{ icon: l.order.repair ? Wrench : Glasses, label: l.order.repair ? t('Repair order') : t('Glasses order'), hint: l.order.number, href: `/optical/lens-orders/${l.order.id}` }] : []),
    ...(l.test ? [{ icon: Eye, label: t('Eye test'), hint: l.test.testNumber, href: `/optical/eye-tests/${l.test.id}` }] : []),
  ];
};

registerSalesExtras('optical', { rowChips: chipsOf, rowActions: linksOf, detailLinks: (s) => linksOf(s) });

/* ───────────── receipt ───────────── */

const rxLookup = createBillLookup<OpticalPrescription>(async (keys) => {
  const out = new Map<string, OpticalPrescription>();
  await Promise.all(keys.map(async (k) => {
    const customerId = k.split('|')[1];
    if (!customerId) return;
    const list = await prescriptionsApi.byCustomer(customerId).catch(() => [] as OpticalPrescription[]);
    const latest = list.find((r) => r.isActive && !r.computed?.isExpired) ?? list[0];
    if (latest) out.set(k, latest);
  }));
  return out;
}, { saleIdOf: (k) => k.split('|')[0] });

const facts = () => {
  const cached = queryClient.getQueryData<OpticalFacts[]>([OPTICAL_KEYS.facts]);
  if (!cached) void queryClient.prefetchQuery({ queryKey: [OPTICAL_KEYS.facts], queryFn: () => opticalProductsApi.facts(), staleTime: 5 * 60_000 });
  return new Map((cached ?? []).map((f) => [f.productId, f]));
};

registerReceiptIndustry('optical', (_doc, ctx) => {
  const bill = billOf(ctx);
  if (!bill) return null;
  const byProduct = facts();
  const lineDetails = bill.items.map((it) => {
    const f = it.productId ? byProduct.get(it.productId) : undefined;
    if (!f) return undefined;
    const frame = [f.brand, f.modelNumber, f.colorName].filter(Boolean).join(' ');
    const size = f.frameSizeMm ? `${f.frameSizeMm}-${f.bridgeSizeMm ?? ''}-${f.templeLengthMm ?? ''}`.replace(/-+$/, '') : '';
    const lens = [f.lensType, f.lensIndex && `${word(ctx.lang, 'Index', 'انڈیکس', 'Index')} ${f.lensIndex}`, ...(f.lensCoatings ?? [])].filter(Boolean).join(' · ');
    const warranty = f.warrantyMonths ? word(ctx.lang, `Warranty ${f.warrantyMonths} months`, `وارنٹی ${f.warrantyMonths} ماہ`, `Warranty ${f.warrantyMonths} mahine`) : '';
    return [frame && (size ? `${frame} (${size})` : frame), lens, warranty].filter(Boolean);
  });
  const rx = bill.customerId ? rxLookup.get(`${bill.saleId}|${bill.customerId}`) : undefined;
  const plano = word(ctx.lang, 'Plano', 'پلانو', 'Plano');
  const rxLines = rx ? [
    word(ctx.lang, 'Right', 'دائیں', 'Right') + ': ' + (eyeLine(rx, 'right', plano) || '—'),
    word(ctx.lang, 'Left', 'بائیں', 'Left') + ': ' + (eyeLine(rx, 'left', plano) || '—'),
    ...(rx.pupilDistance ? [`PD ${rx.pupilDistance}`] : []),
    ...(rx.doctorName || rx.prescribedBy ? [`${word(ctx.lang, 'By', 'تجویز', 'Doctor')}: ${rx.doctorName || rx.prescribedBy}`] : []),
  ] : [];
  return {
    lineDetails,
    boxes: rxLines.length ? [{ title: word(ctx.lang, 'Prescription', 'نسخہ', 'Nuskha'), lines: rxLines }] : undefined,
  };
});
