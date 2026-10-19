/**
 * Printed slips for the mobile shop, through the shared receipt engine so
 * they follow the shop's bill design and printer: the buy-back slip the
 * seller signs, the repair job card the customer keeps, and the WhatsApp
 * texts that go with them.
 */

import { formatPKR } from '@core/lib/format';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup, printPaper } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptRowDoc } from '@core/receipt/types';
import type { UsedPhone } from '../api/used-phones.api';
import type { RepairTicket } from '../api/repairs.api';
import { conditionOf, dateTime, dayOnly, priorityOf, ptaOf, repairStatusOf, sourceOf } from './meta';

const row = (label: string, value?: string | number | null, bold = false): ReceiptRowDoc[] =>
  (value || value === 0 ? [{ label, value: String(value), bold }] : []);

/** Slip for the seller of a used phone: device, IMEI, condition, CNIC and the amount. */
export function printBuybackSlip(p: UsedPhone, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const extras = [
    p.hasOriginalBox && 'Dabba', p.hasOriginalCharger && 'Charger', p.hasOriginalCable && 'Cable',
    p.hasOriginalEarphones && 'Handsfree', p.hasOriginalReceipt && 'Raseed',
  ].filter(Boolean) as string[];
  const doc: ReceiptDoc = {
    saleNumber: p.usedPhoneCode,
    date: new Date(p.receivedAt),
    stamp: p.source === 'EXCHANGE' ? 'EXCHANGE' : p.source === 'CONSIGNMENT' ? 'AMANAT' : 'KHAREED',
    customerName: p.fromCustomerName ?? undefined,
    customerPhone: p.fromCustomerPhone ?? undefined,
    partyLabel: 'Bechne wala',
    infoRows: [
      ...row('CNIC', p.fromCustomerCnic, true),
      { label: 'Phone', value: `${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ''}`, bold: true },
      { label: 'IMEI', value: `${p.imei1}${p.imei2 ? ` / ${p.imei2}` : ''}` },
      { label: 'PTA', value: ptaOf(p.ptaStatus).label },
      { label: 'Halat', value: conditionOf(p.condition).label },
      ...row('Saath', extras.join(', ')),
      { label: 'Kaise', value: sourceOf(p.source).label },
    ],
    lines: [{ name: `${p.brand} ${p.model} (${p.usedPhoneCode})`, qty: 1, unit: '', price: p.buybackPrice, total: p.buybackPrice }],
    subtotal: p.buybackPrice,
    discount: 0,
    total: p.buybackPrice,
    paid: p.source === 'CASH_BUYBACK' ? p.buybackPrice : 0,
    paymentLabel: p.source === 'CASH_BUYBACK' ? 'Cash diya' : p.source === 'EXCHANGE' ? 'Naye phone ke bill me katega' : 'Bikne par diya jayega',
    boxes: p.conditionNotes ? [{ title: 'Phone ki halat', lines: [p.conditionNotes] }] : undefined,
    footerNote: 'Main tasdeeq karta/karti hoon ke ye phone mera hai, chori ka nahi, aur is ka koi account lock nahi.',
    signLabels: ['Bechne wala', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** Job card for a phone left for repair; the customer brings it back to collect. */
export function printJobCard(t: RepairTicket, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const parts = (t.parts ?? []).map((p) => ({ name: p.partName, qty: Number(p.quantity), unit: '', price: Number(p.unitPrice), total: Number(p.totalPrice) }));
  const labour = Number(t.laborCost) || 0;
  const lines = [...parts, ...(labour > 0 ? [{ name: 'Mazdoori', qty: 1, unit: '', price: labour, total: labour }] : [])];
  const billed = Number(t.totalCost) > 0;
  const total = billed ? Number(t.totalCost) : Number(t.estimatedCost) || 0;
  const subtotal = billed ? lines.reduce((s, l) => s + l.total, 0) : total;
  const due = Math.max(total - Number(t.paidAmount || 0), 0);
  const doc: ReceiptDoc = {
    saleNumber: t.ticketNumber,
    date: new Date(t.receivedAt),
    stamp: 'JOB CARD',
    customerName: t.customerName,
    customerPhone: t.customerPhone,
    partyLabel: 'Customer',
    infoRows: [
      { label: 'Phone', value: `${t.deviceBrand} ${t.deviceModel}${t.deviceColor ? ` (${t.deviceColor})` : ''}`, bold: true },
      ...row('IMEI', t.imei1),
      { label: 'Kharabi', value: t.reportedIssue },
      ...row('Check', t.diagnosedIssue),
      { label: 'Halat', value: repairStatusOf(t.status).label },
      ...(t.priority !== 'NORMAL' ? [{ label: 'Jaldi', value: priorityOf(t.priority).label }] : []),
      ...row('Tayyar hoga', t.estimatedReadyAt ? dateTime(t.estimatedReadyAt) : null, true),
      ...row('Technician', t.technicianName),
      { label: 'Saath', value: [t.hasSimCard ? 'SIM' : '', t.hasMemoryCard ? 'Memory card' : ''].filter(Boolean).join(', ') || 'Sirf phone' },
    ],
    lines: lines.length && billed ? lines : [{ name: billed ? 'Repair' : 'Repair (andaza)', qty: 1, unit: '', price: total, total }],
    subtotal,
    discount: billed ? Number(t.discount) || 0 : 0,
    total,
    paid: Number(t.paidAmount) || 0,
    paymentLabel: Number(t.paidAmount) > 0 ? 'Advance mila' : 'Abhi kuch nahi mila',
    footerNote: [
      due > 0 ? `Baqi ${formatPKR(due)} phone lete waqt.` : 'Poora paisa mil gaya.',
      t.warrantyDays > 0 ? `Repair par ${t.warrantyDays} din ki warranty — wahi kharabi dobara aaye to muft.` : '',
      'Ye parchi saath laayein. 30 din tak na le jane par dukaan zimmedar nahi.',
    ].filter(Boolean).join(' '),
    signLabels: ['Customer', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** WhatsApp text for a repair job: status, ready time and money. */
export function repairMessage(t: RepairTicket, shopName: string): string {
  const total = Number(t.totalCost) > 0 ? Number(t.totalCost) : Number(t.estimatedCost) || 0;
  const due = Math.max(total - Number(t.paidAmount || 0), 0);
  const ready = t.status === 'READY';
  return [
    `Assalam o alaikum ${t.customerName},`,
    `${shopName}: aap ka ${t.deviceBrand} ${t.deviceModel} (job ${t.ticketNumber})`,
    ready ? '✅ Tayyar hai — jab chahein le jayein.' : `Halat: ${repairStatusOf(t.status).label}`,
    !ready && t.estimatedReadyAt ? `Tayyar hoga: ${dateTime(t.estimatedReadyAt)}` : '',
    total > 0 ? `Kul: ${formatPKR(total)}${Number(t.paidAmount) > 0 ? ` · Mila: ${formatPKR(Number(t.paidAmount))}` : ''}` : '',
    due > 0 ? `Baqi: ${formatPKR(due)}` : '',
    'Shukriya!',
  ].filter(Boolean).join('\n');
}

/** WhatsApp text for an installment reminder. */
export function emiMessage(p: { customerName: string; planNumber: string; nextDueAmount: number; nextDueDate?: string | null; overdueAmount: number; remainingAmount: number }, shopName: string): string {
  return [
    `Assalam o alaikum ${p.customerName},`,
    `${shopName} — qist plan ${p.planNumber}`,
    p.overdueAmount > 0 ? `⚠️ Late qist: ${formatPKR(p.overdueAmount)}` : '',
    p.nextDueDate ? `Agli qist: ${formatPKR(p.nextDueAmount)} — ${dayOnly(p.nextDueDate)}` : '',
    `Kul baqi: ${formatPKR(p.remainingAmount)}`,
    'Meherbani kar ke waqt par jama karwayein. Shukriya!',
  ].filter(Boolean).join('\n');
}
