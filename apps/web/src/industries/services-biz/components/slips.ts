/**
 * Printed slips for service jobs, through the shared receipt engine so they
 * follow the shop's bill design and printer: the job card the customer
 * keeps at intake (and the estimate as work goes on), the quote, the
 * commission payout slip, and the WhatsApp texts.
 */

import { formatPKR } from '@core/lib/format';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup, printPaper } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptRowDoc } from '@core/receipt/types';
import type { ServiceJob } from '../api/jobs.api';
import type { Quote } from '../api/quotes.api';
import type { CommissionPayout } from '../api/technicians.api';
import { READY, dateTime, dayOnly, itemName, locationOf, isOnSite, priorityOf, statusOf } from './meta';

const row = (label: string, value?: string | number | null, bold = false): ReceiptRowDoc[] =>
  (value || value === 0 ? [{ label, value: String(value), bold }] : []);

const chargeLines = (j: Pick<ServiceJob, 'visitCharge' | 'labourCharge' | 'transportCharge' | 'emergencyCharge' | 'taxAmount'>) => [
  ...(j.visitCharge > 0 ? [{ name: 'Visit charge', qty: 1, unit: '', price: j.visitCharge, total: j.visitCharge }] : []),
  ...(j.labourCharge > 0 ? [{ name: 'Kaam (labour)', qty: 1, unit: '', price: j.labourCharge, total: j.labourCharge }] : []),
  ...(j.transportCharge > 0 ? [{ name: 'Transport', qty: 1, unit: '', price: j.transportCharge, total: j.transportCharge }] : []),
  ...(j.emergencyCharge > 0 ? [{ name: 'Emergency charge', qty: 1, unit: '', price: j.emergencyCharge, total: j.emergencyCharge }] : []),
  ...(j.taxAmount > 0 ? [{ name: 'Tax', qty: 1, unit: '', price: j.taxAmount, total: j.taxAmount }] : []),
];

/** Job card: item, fault, where and when, technician, estimate and advance. */
export function printJobCard(j: ServiceJob & { technicianName?: string | null }, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const lines = [
    ...chargeLines(j),
    ...j.parts.map((p) => ({
      name: `${p.partName}${p.isCustomerSupplied ? ' — customer ka apna' : ''}${p.isUnderWarranty ? ' (warranty)' : ''}`,
      qty: Number(p.quantity), unit: '', price: p.isUnderWarranty ? 0 : Number(p.unitPrice), total: p.isUnderWarranty ? 0 : Number(p.total),
    })),
  ];
  const paid = Number(j.paidAmount) || 0;
  const total = Number(j.totalCharge) || 0;
  const due = Math.max(total - paid, 0);
  const done = j.status === 'COMPLETED';
  const doc: ReceiptDoc = {
    saleNumber: j.jobNumber,
    date: new Date(j.createdAt),
    stamp: done ? 'KAAM MUKAMMAL' : 'JOB CARD',
    customerName: j.customerName ?? undefined,
    customerPhone: j.customerPhone ?? undefined,
    customerAddress: isOnSite(j.locationType) ? [j.serviceAddress, j.area, j.city].filter(Boolean).join(', ') || undefined : undefined,
    partyLabel: 'Customer',
    infoRows: [
      { label: 'Kaam', value: j.serviceName, bold: true },
      ...row('Cheez', itemName(j)),
      ...row('Kharabi', j.problemDescription !== j.serviceName ? j.problemDescription : null),
      { label: 'Kahan', value: locationOf(j.locationType) },
      ...row(isOnSite(j.locationType) ? 'Visit' : 'Wapas milega', j.scheduledStart && !done ? dateTime(j.scheduledStart) : null, true),
      { label: 'Halat', value: statusOf(j.status).label },
      ...(j.priority !== 'NORMAL' ? [{ label: 'Jaldi', value: priorityOf(j.priority).label }] : []),
      ...row('Technician', j.technicianName),
      ...row('Warranty', j.jobWarrantyDays > 0 ? `${j.jobWarrantyDays} din${j.jobWarrantyExpiryDate ? ` (${dayOnly(j.jobWarrantyExpiryDate)} tak)` : ''}` : null),
    ],
    lines: lines.length ? lines : [{ name: 'Kharcha check ke baad batayenge', qty: 1, unit: '', price: 0, total: 0 }],
    subtotal: total + (Number(j.discountAmount) || 0),
    discount: Number(j.discountAmount) || 0,
    total,
    paid,
    paymentLabel: paid > 0 ? (done ? 'Mila' : 'Advance mila') : 'Abhi kuch nahi mila',
    footerNote: [
      due > 0 ? `Baqi ${formatPKR(due)}${done ? ' — khata me' : ''}.` : total > 0 ? 'Poora paisa mil gaya.' : '',
      j.jobWarrantyTerms ?? '',
      done ? '' : 'Ye parchi sambhal kar rakhein — saman lete waqt saath laayein.',
    ].filter(Boolean).join(' '),
    signLabels: ['Customer', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** WhatsApp text for a job: where it stands, when, and the money. */
export function jobMessage(j: ServiceJob, shopName: string): string {
  const total = Number(j.totalCharge) || 0;
  const paid = Number(j.paidAmount) || 0;
  const due = Math.max(total - paid, 0);
  const ready = READY.includes(j.status);
  const item = itemName(j);
  return [
    `Assalam o alaikum ${j.customerName ?? ''},`.replace(' ,', ','),
    `${shopName}: ${j.serviceName}${item ? ` (${item})` : ''} — job ${j.jobNumber}`,
    ready ? (isOnSite(j.locationType) ? 'Kaam mukammal ho gaya.' : 'Aap ka saman tayyar hai — jab chahein le jayein.') : `Halat: ${statusOf(j.status).label}`,
    !ready && j.scheduledStart && j.status !== 'COMPLETED' ? `${isOnSite(j.locationType) ? 'Technician aayega' : 'Tayyar hoga'}: ${dateTime(j.scheduledStart)}` : '',
    total > 0 ? `Bill: ${formatPKR(total)}${paid > 0 ? ` · Mila: ${formatPKR(paid)}` : ''}` : '',
    due > 0 ? `Baqi: ${formatPKR(due)}` : '',
    'Shukriya!',
  ].filter(Boolean).join('\n');
}

const KIND_LABEL = { VISIT: 'Visit', LABOUR: 'Kaam', PART: 'Part', OTHER: 'Aur' } as const;

/** Quote for the customer: lines, total and how long it holds. */
export function printQuote(q: Quote, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const lines = q.lines.length
    ? q.lines.map((l) => ({ name: `${KIND_LABEL[l.kind]}: ${l.description}`, qty: l.quantity, unit: '', price: l.unitPrice, total: l.total }))
    : chargeLines({ visitCharge: q.visitCharge, labourCharge: q.labourCharge, transportCharge: q.otherCharges, emergencyCharge: 0, taxAmount: q.taxAmount })
      .concat(q.partsCharge > 0 ? [{ name: 'Parts', qty: 1, unit: '', price: q.partsCharge, total: q.partsCharge }] : []);
  const doc: ReceiptDoc = {
    saleNumber: q.quoteNumber,
    date: new Date(q.createdAt),
    stamp: 'QUOTE',
    customerName: q.customerName,
    customerPhone: q.customerPhone || undefined,
    partyLabel: 'Customer',
    infoRows: [
      { label: 'Kaam', value: q.serviceName, bold: true },
      ...row('Tafseel', q.problemDescription !== q.serviceName ? q.problemDescription : null),
      ...row('Kab tak', q.validUntil ? dayOnly(q.validUntil) : null, true),
    ],
    lines: lines.length ? lines : [{ name: q.serviceName, qty: 1, unit: '', price: q.totalAmount, total: q.totalAmount }],
    subtotal: q.totalAmount + q.discount,
    discount: q.discount,
    total: q.totalAmount,
    paid: 0,
    paymentLabel: 'Ye bill nahi, sirf andaza hai',
    footerNote: [q.termsConditions, 'Kaam shuru hone par asal kharcha thora upar neeche ho sakta hai.'].filter(Boolean).join(' '),
    signLabels: ['Customer', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** WhatsApp text for a quote. */
export function quoteMessage(q: Quote, shopName: string): string {
  return [
    `Assalam o alaikum ${q.customerName},`,
    `${shopName}: ${q.serviceName} ka andaza (quote ${q.quoteNumber})`,
    ...q.lines.map((l) => `• ${l.description}${l.quantity !== 1 ? ` × ${l.quantity}` : ''}: ${formatPKR(l.total)}`),
    q.discount > 0 ? `Discount: ${formatPKR(q.discount)}` : '',
    `Kul: ${formatPKR(q.totalAmount)}`,
    q.validUntil ? `${dayOnly(q.validUntil)} tak` : '',
    'Theek ho to "haan" likh dein — kaam shuru kar denge. Shukriya!',
  ].filter(Boolean).join('\n');
}

/** Commission payout slip for the technician to sign. */
export function printCommissionSlip(p: CommissionPayout, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const doc: ReceiptDoc = {
    saleNumber: p.ref,
    date: new Date(p.paidAt),
    stamp: 'COMMISSION',
    customerName: p.technicianName,
    partyLabel: 'Technician',
    infoRows: [{ label: 'Jobs', value: String(p.jobs.length) }, ...row('Kaise diya', p.expense?.paymentMethod)],
    lines: p.jobs.map((j) => ({ name: `${j.jobNumber} — ${j.serviceName}${j.customerName ? ` (${j.customerName})` : ''}`, qty: 1, unit: '', price: 0, total: 0 })),
    subtotal: p.amount,
    discount: 0,
    total: p.amount,
    paid: p.amount,
    paymentLabel: 'Commission di',
    hidePrices: true,
    footerNote: 'Ye paisa dukaan ke Expense me likha gaya hai.',
    signLabels: ['Technician', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}
