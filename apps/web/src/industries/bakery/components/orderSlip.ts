/**
 * Printed order slips and WhatsApp messages for cake and bulk orders.
 * Slips go through the shared receipt engine, so they use the shop's own
 * bill design and printer; the kitchen copy leaves the prices out.
 */

import { formatPKR } from '@core/lib/format';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup, printPaper } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptRowDoc } from '@core/receipt/types';
import type { CakeOrder } from '../api/cake-orders.api';
import type { BulkOrder } from '../api/bulk-orders.api';
import {
  bulkPrice, bulkTypeOf, cakeLine, creamLabel, dateTime, deliveryOf, dueOf, flavorLabel, isDelivery, occasionOf, shapeLabel, sizeLabel, statusOf,
} from './meta';

const row = (label: string, value?: string | number | null): ReceiptRowDoc[] => (value || value === 0 ? [{ label, value: String(value) }] : []);

/** Cake order slip: the customer copy shows the money; `kitchen` shows only how to make it. */
export function printCakeSlip(o: CakeOrder, shopName: string, kitchen = false) {
  const setup = getReceiptSetup(shopName);
  const design = [
    o.messageOnCake ? `Cake par likhna: "${o.messageOnCake}"${o.messageColor ? ` (${o.messageColor})` : ''}` : '',
    o.designInstructions ?? '',
    [o.colorTheme && `Theme: ${o.colorTheme}`, o.primaryColor && `Rang: ${o.primaryColor}${o.secondaryColor ? ` + ${o.secondaryColor}` : ''}`].filter(Boolean).join(' · '),
    o.hasPhotoOnCake ? `Photo cake${o.hasEdibleImage ? ' (edible print)' : ''}${o.photoUrl ? ' — photo app me hai' : ''}` : '',
    o.decorativeItems?.length ? `Sajawat: ${o.decorativeItems.join(', ')}` : '',
    o.numberOrLetter ? `Number / harf: ${o.numberOrLetter}` : '',
    o.numberOfTiers > 1 ? `${o.numberOfTiers} manzil` : '',
    [o.isEggless && 'Anday ke bagair', o.isSugarFree && 'Cheeni ke bagair', o.isVegan && 'Vegan'].filter(Boolean).join(' · '),
    o.allergies?.length ? `Allergy: ${o.allergies.join(', ')}` : '',
    o.dietaryNotes ?? '',
    [o.candlesRequired ? `${o.candlesRequired} mombatti${o.candleType ? ` (${o.candleType})` : ''}` : '', o.cakeStand && 'Stand', o.cakeKnife && 'Chhuri'].filter(Boolean).join(' · '),
    o.specialInstructions ?? '',
  ].filter((x) => x && String(x).trim());
  const extras: ReceiptRowDoc[] = [
    ...(o.customizationCharges > 0 ? [{ label: 'Sajawat / design', value: formatPKR(o.customizationCharges) }] : []),
    ...(o.photoCakeCharges > 0 ? [{ label: 'Photo cake', value: formatPKR(o.photoCakeCharges) }] : []),
    ...(o.taxAmount > 0 ? [{ label: 'Tax', value: formatPKR(o.taxAmount) }] : []),
  ];
  const due = dueOf(o);
  const doc: ReceiptDoc = {
    saleNumber: o.orderNumber,
    date: new Date(o.createdAt),
    stamp: kitchen ? 'KITCHEN' : undefined,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: isDelivery(o.deliveryType) ? [o.deliveryAddress, o.deliveryLandmark].filter(Boolean).join(', ') || undefined : undefined,
    partyLabel: 'Customer',
    infoRows: [
      { label: 'Kab chahiye', value: dateTime(o.neededBy), bold: true },
      { label: 'Kaise', value: deliveryOf(o.deliveryType).label },
      ...row('Mauqa', `${occasionOf(o.occasion).label}${o.celebrantName ? ` — ${o.celebrantName}${o.celebrantAge ? ` (${o.celebrantAge})` : ''}` : ''}`),
      ...row('Size', o.size === 'CUSTOM' && o.customWeightKg ? `${o.customWeightKg} kg` : sizeLabel(o.size)),
      ...row('Flavour', o.flavor === 'CUSTOM_FLAVOR' ? o.customFlavorDesc || 'Apna' : flavorLabel(o.flavor)),
      ...row('Shakal', o.shape === 'CUSTOM_SHAPE' ? o.customShapeDesc || 'Apni' : shapeLabel(o.shape)),
      ...row('Cream', o.creamType ? creamLabel(o.creamType) : null),
      ...(kitchen ? [] : [{ label: 'Halat', value: statusOf(o.status).label }]),
    ],
    lines: [{ name: `Cake — ${cakeLine(o)}`, qty: 1, unit: '', price: o.basePrice, total: o.basePrice }],
    subtotal: o.basePrice,
    discount: o.discount,
    deliveryCharge: o.deliveryCharges || undefined,
    extraRows: extras,
    total: o.total,
    paid: o.paidAmount,
    paymentLabel: o.paidAmount > 0 ? 'Advance mila' : 'Abhi kuch nahi mila',
    hidePrices: kitchen,
    boxes: design.length ? [{ title: kitchen ? 'Kaise banana hai' : 'Design', lines: design }] : undefined,
    footerNote: kitchen ? undefined : due > 0 ? `Baqi ${formatPKR(due)} cake lete waqt. Yeh parchi saath laayein.` : 'Poora paisa mil gaya. Yeh parchi saath laayein.',
    signLabels: ['Customer', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** Bulk order slip with every line; `kitchen` prints quantities only. */
export function printBulkSlip(o: BulkOrder, shopName: string, kitchen = false) {
  const setup = getReceiptSetup(shopName);
  const lines = (Array.isArray(o.items) ? o.items : []).map((l: Record<string, unknown>) => {
    const qty = Number(l.qty ?? l.quantity) || 0;
    const rate = Number(l.rate ?? l.price) || 0;
    return { name: String(l.name ?? l.productName ?? 'Cheez'), qty, unit: String(l.unit ?? ''), price: rate, total: Math.round(qty * rate * 100) / 100 };
  });
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const total = bulkPrice(o);
  const due = Math.max(total - o.paidAmount, 0);
  const doc: ReceiptDoc = {
    saleNumber: o.orderNumber,
    date: new Date(o.createdAt),
    stamp: kitchen ? 'KITCHEN' : undefined,
    customerName: o.organizationName,
    customerPhone: o.contactPhone,
    customerAddress: o.requiresDelivery ? o.deliveryAddress || o.venue || undefined : undefined,
    partyLabel: 'Order dene wala',
    infoRows: [
      { label: 'Event', value: `${dateTime(o.eventDate)}${o.eventTime ? ` (${o.eventTime})` : ''}`, bold: true },
      ...row('Type', bulkTypeOf(o.orderType).label),
      ...row('Rabta', o.contactPerson),
      ...row('Mehmaan', o.totalGuests),
      ...row('Jagah', o.venue),
      { label: 'Pahunchana', value: o.requiresDelivery ? 'Haan' : 'Nahi — khud lenge' },
      ...(o.requiresSetup ? [{ label: 'Setup', value: o.setupTime || 'Haan' }] : []),
    ],
    lines,
    subtotal,
    discount: Math.max(subtotal - total, 0),
    extraRows: total > subtotal ? [{ label: 'Extra', value: formatPKR(total - subtotal) }] : undefined,
    total,
    paid: o.paidAmount,
    paymentLabel: o.paidAmount > 0 ? 'Advance mila' : 'Abhi kuch nahi mila',
    hidePrices: kitchen,
    boxes: o.specialInstructions ? [{ title: 'Hidayat', lines: [o.specialInstructions] }] : undefined,
    footerNote: kitchen ? undefined : due > 0 ? `Baqi ${formatPKR(due)} order lete waqt.` : 'Poora paisa mil gaya.',
    signLabels: ['Order dene wala', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** WhatsApp confirmation for a cake order. */
export function cakeMessage(o: CakeOrder, shopName: string): string {
  const due = dueOf(o);
  return [
    `Assalam o alaikum ${o.customerName},`,
    `${shopName} se aap ka cake order *${o.orderNumber}* ${o.status === 'DRAFT' || o.status === 'QUOTED' ? 'darj hai' : 'pakka hai'}.`,
    '',
    `🎂 ${cakeLine(o)}`,
    o.messageOnCake ? `✍️ Cake par: "${o.messageOnCake}"` : '',
    `🕒 ${isDelivery(o.deliveryType) ? 'Pahunchega' : 'Le sakte hain'}: ${dateTime(o.neededBy)}`,
    isDelivery(o.deliveryType) && o.deliveryAddress ? `📍 ${o.deliveryAddress}` : '',
    '',
    `Kul: ${formatPKR(o.total)}`,
    o.paidAmount > 0 ? `Advance mila: ${formatPKR(o.paidAmount)}` : '',
    due > 0 ? `Baqi: ${formatPKR(due)}` : 'Poora paisa mil gaya ✅',
    `Halat: ${statusOf(o.status).label}`,
    '',
    'Shukriya!',
  ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0)).join('\n');
}

/** WhatsApp confirmation for a bulk order. */
export function bulkMessage(o: BulkOrder, shopName: string): string {
  const total = bulkPrice(o);
  const due = Math.max(total - o.paidAmount, 0);
  return [
    `Assalam o alaikum${o.contactPerson ? ` ${o.contactPerson}` : ''},`,
    `${shopName} se ${o.organizationName} ka order *${o.orderNumber}*`,
    `📅 Event: ${dateTime(o.eventDate)}${o.eventTime ? ` (${o.eventTime})` : ''}`,
    o.venue ? `📍 ${o.venue}` : '',
    `Kul: ${formatPKR(total)} · Mila: ${formatPKR(o.paidAmount)}`,
    due > 0 ? `Baqi: ${formatPKR(due)}` : 'Poora paisa mil gaya ✅',
    `Halat: ${statusOf(o.status).label}`,
    'Shukriya!',
  ].filter(Boolean).join('\n');
}
