/**
 * Printed slips and WhatsApp messages for garments jobs. Slips go through
 * the shared receipt engine, so they use the shop's own bill design and
 * printer. The karigar copy of a stitching order has the measurements and
 * design but no money.
 */

import { formatPKR } from '@core/lib/format';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup, printPaper } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptRowDoc } from '@core/receipt/types';
import type { AlterationTicket } from '../api/alterations.api';
import { MEASURE_FIELDS, type MeasurementProfile } from '../api/measurements.api';
import type { TailoringOrder } from '../api/tailoring.api';
import { MEASURE_LABELS, alterationStatus, dayFull, dueOf, garmentLabel, tailoringStatus } from './meta';

const print = (doc: ReceiptDoc, shopName: string) => {
  const setup = getReceiptSetup(shopName);
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
};

/** "Chhati 40 · Kamar 34 …" lines from a measurement record. */
export function measureLines(m?: Record<string, unknown> | null): string[] {
  if (!m) return [];
  const unit = m.unit === 'CM' ? 'cm' : '"';
  const parts = MEASURE_FIELDS.filter((k) => Number(m[k]) > 0).map((k) => `${MEASURE_LABELS[k]} ${Number(m[k])}${unit}`);
  const lines: string[] = [];
  for (let i = 0; i < parts.length; i += 3) lines.push(parts.slice(i, i + 3).join(' · '));
  if (m.fittingNotes) lines.push(`Fitting: ${String(m.fittingNotes)}`); // i18n-ignore
  if (m.postureNotes) lines.push(`Jism: ${String(m.postureNotes)}`); // i18n-ignore
  return lines;
}

/** Stitching order slip: the customer copy shows the money; `karigar` shows only how to make it. */
export function printTailoringSlip(o: TailoringOrder, shopName: string, karigar = false) {
  const due = dueOf(o);
  const lines = o.items.map((i) => ({
    name: `${garmentLabel(i.categoryType) !== '—' && i.categoryType ? `${garmentLabel(i.categoryType)} — ` : ''}${i.garmentName}`,
    qty: i.quantity, unit: 'pc', price: i.quantity ? Math.round((i.total / i.quantity) * 100) / 100 : i.total, total: i.total,
    details: [
      i.fabricName ? `Kapra: ${i.fabricName}${i.fabricMeters ? ` (${i.fabricMeters} m)` : ''}` : i.fabricCost > 0 ? 'Kapra dukaan ka' : 'Kapra customer ka', // i18n-ignore
      i.size ? `Size: ${i.size}` : '', i.colorName ? `Rang: ${i.colorName}` : '', i.designNotes ?? '', // i18n-ignore
    ].filter(Boolean),
  }));
  const extras: ReceiptRowDoc[] = o.taxAmount > 0 ? [{ label: 'Tax', value: formatPKR(o.taxAmount) }] : []; // i18n-ignore
  const measure = measureLines(o.measurementProfile ?? (o.items[0]?.measurementSnapshot as Record<string, unknown> | undefined));
  const boxes = [
    ...(measure.length ? [{ title: `Naap${o.measurementProfile?.profileName ? ` — ${o.measurementProfile.profileName}` : ''}`, lines: measure }] : []), // i18n-ignore
    ...(o.designInstructions ? [{ title: 'Design', lines: [o.designInstructions] }] : []), // i18n-ignore
    ...(karigar && o.internalNotes ? [{ title: 'Note', lines: [o.internalNotes] }] : []), // i18n-ignore
  ];
  print({
    saleNumber: o.orderNumber,
    date: new Date(o.orderDate || o.createdAt),
    stamp: karigar ? 'KARIGAR' : undefined,
    customerName: o.customerName ?? undefined,
    customerPhone: o.customerPhone ?? undefined,
    partyLabel: 'Customer', // i18n-ignore
    infoRows: [
      { label: 'Kab dena hai', value: dayFull(o.promisedDate), bold: true }, // i18n-ignore
      ...(o.tailorName ? [{ label: 'Karigar', value: o.tailorName }] : []), // i18n-ignore
      ...(karigar ? [] : [{ label: 'Halat', value: tailoringStatus(o.orderStatus).label }]), // i18n-ignore
    ],
    lines,
    subtotal: o.subtotal,
    discount: o.discount,
    extraRows: extras,
    total: o.total,
    paid: o.paidAmount,
    paymentLabel: o.paidAmount > 0 ? 'Advance mila' : 'Abhi kuch nahi mila', // i18n-ignore
    hidePrices: karigar,
    boxes: boxes.length ? boxes : undefined,
    footerNote: karigar ? undefined : due > 0 ? `Baqi ${formatPKR(due)} suit lete waqt. Yeh parchi saath laayein.` : 'Poora paisa mil gaya. Yeh parchi saath laayein.', // i18n-ignore
    signLabels: ['Customer', 'Dukaan'], // i18n-ignore
  }, shopName);
}

/** Token for a garment left for alteration. */
export function printAlterationSlip(t: AlterationTicket, shopName: string) {
  const due = dueOf({ total: t.charges, paidAmount: t.paidAmount });
  print({
    saleNumber: t.ticketNumber,
    date: new Date(t.receivedAt),
    customerName: t.customerName ?? undefined,
    customerPhone: t.customerPhone ?? undefined,
    partyLabel: 'Customer', // i18n-ignore
    infoRows: [
      { label: 'Kab lena hai', value: dayFull(t.promisedDate), bold: true }, // i18n-ignore
      { label: 'Halat', value: alterationStatus(t.status).label }, // i18n-ignore
    ],
    lines: [{ name: `${t.garmentDescription} — ${t.alterationType}`, qty: 1, unit: '', price: t.charges, total: t.charges, details: t.alterationDetails ? [t.alterationDetails] : undefined }],
    subtotal: t.charges,
    discount: 0,
    total: t.charges,
    paid: t.paidAmount,
    paymentLabel: t.paidAmount > 0 ? 'Advance mila' : 'Abhi kuch nahi mila', // i18n-ignore
    footerNote: t.charges > 0 ? (due > 0 ? `Baqi ${formatPKR(due)} kapra lete waqt. Yeh token saath laayein.` : 'Poora paisa mil gaya. Yeh token saath laayein.') : 'Yeh token saath laayein.', // i18n-ignore
    signLabels: ['Customer', 'Dukaan'], // i18n-ignore
  }, shopName);
}

/** Measurement card for the customer or the karigar. */
export function printMeasureSlip(m: MeasurementProfile, shopName: string) {
  print({
    saleNumber: m.profileName,
    date: new Date(m.measuredAt),
    customerName: m.customer?.name,
    customerPhone: m.customer?.phone ?? undefined,
    partyLabel: 'Customer', // i18n-ignore
    infoRows: [{ label: 'Naap', value: `${m.profileName} (${m.unit === 'CM' ? 'cm' : 'inch'})`, bold: true }], // i18n-ignore
    lines: [],
    subtotal: 0, discount: 0, total: 0, paid: 0, paymentLabel: '',
    hidePrices: true,
    boxes: [{ title: 'Naap', lines: measureLines(m) }], // i18n-ignore
  }, shopName);
}

const greet = (name?: string | null) => `Assalam o alaikum${name ? ` ${name}` : ''},`; // i18n-ignore

/** WhatsApp text for a stitching order: booked, ready or reminder. */
export function tailoringMessage(o: TailoringOrder, shopName: string): string {
  const due = dueOf(o);
  const ready = o.orderStatus === 'READY';
  return [
    greet(o.customerName),
    ready ? `${shopName} se: aap ka silai order *${o.orderNumber}* tayyar hai. Jab chahein le jayein.` : `${shopName} se aap ka silai order *${o.orderNumber}* darj hai.`, // i18n-ignore
    '',
    ...o.items.map((i) => `✂️ ${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.garmentName}`),
    !ready && o.promisedDate ? `📅 Tayyar hoga: ${dayFull(o.promisedDate)}` : '',
    '',
    `Kul: ${formatPKR(o.total)}`,
    o.paidAmount > 0 ? `Advance: ${formatPKR(o.paidAmount)}` : '',
    due > 0 ? `Baqi: ${formatPKR(due)}` : 'Poora paisa mil gaya ✅', // i18n-ignore
    '',
    'Shukriya!',
  ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
}

export function alterationMessage(t: AlterationTicket, shopName: string): string {
  const due = dueOf({ total: t.charges, paidAmount: t.paidAmount });
  return [
    greet(t.customerName),
    t.status === 'READY'
      ? `${shopName} se: aap ka kapra (${t.garmentDescription}) alteration ke baad tayyar hai. Token *${t.ticketNumber}*.` // i18n-ignore
      : `${shopName} se: aap ka kapra (${t.garmentDescription}) alteration ke liye aa gaya hai. Token *${t.ticketNumber}*.`, // i18n-ignore
    t.status !== 'READY' && t.promisedDate ? `📅 Tayyar hoga: ${dayFull(t.promisedDate)}` : '',
    t.charges > 0 ? (due > 0 ? `Baqi: ${formatPKR(due)}` : 'Poora paisa mil gaya ✅') : '', // i18n-ignore
    'Shukriya!',
  ].filter(Boolean).join('\n');
}
