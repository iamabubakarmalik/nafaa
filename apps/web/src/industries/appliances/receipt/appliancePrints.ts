/**
 * Appliance prints, all through the shared receipt engine so they follow the
 * shop's bill design and printer: one warranty card per serial sold on a
 * bill, the installation slip for a bill, and the job slip the technician
 * takes for an installation or a repair visit.
 */

import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup, printPaper } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptRowDoc, ReceiptSetup } from '@core/receipt/types';
import { applianceSerialApi } from '../api/serial-tracking.api';
import type { Installation } from '../api/installations.api';
import type { ServiceRequest } from '../api/service-requests.api';
import { dayOnly, priorityOf, serviceTypeOf, slotLabel } from '../components/meta';

const row = (label: string, value?: string | number | null, bold = false): ReceiptRowDoc[] =>
  (value || value === 0 ? [{ label, value: String(value), bold }] : []);

interface SaleLike {
  id: string; saleNumber: string; createdAt?: string; soldAt?: string; total?: number; paidAmount?: number;
  customer?: { name?: string | null; phone?: string | null; address?: string | null } | null;
  items?: Array<{ productId?: string | null; name?: string | null; product?: { name?: string | null } | null; quantity?: number }>;
  serviceChargesBreakdown?: unknown;
}

const saleDate = (s: SaleLike) => new Date(s.soldAt ?? s.createdAt ?? Date.now());

/** One card per serial on the bill: model, serial, bill date, company warranty ends and the shop's own warranty. */
export async function printWarrantyCards(sale: SaleLike, setup: ReceiptSetup) {
  let units: Awaited<ReturnType<typeof applianceSerialApi.forSale>> = [];
  try { units = await applianceSerialApi.forSale(sale.id); } catch { toast.error('Serial load nahi hue — internet check karein'); return; }
  if (!units.length) { toast.error('Is bill par koi serial nahi laga — Serial register se lagayein'); return; }
  const nameOf = (productId: string) => sale.items?.find((i) => i.productId === productId)?.product?.name ?? sale.items?.find((i) => i.productId === productId)?.name ?? 'Product';
  for (const u of units) {
    const doc: ReceiptDoc = {
      saleNumber: sale.saleNumber,
      date: saleDate(sale),
      stamp: 'WARRANTY CARD',
      customerName: sale.customer?.name ?? undefined,
      customerPhone: sale.customer?.phone ?? undefined,
      customerAddress: sale.customer?.address ?? undefined,
      partyLabel: 'Customer',
      infoRows: [
        { label: 'Product', value: nameOf(u.productId), bold: true },
        ...row('Model', u.modelNumber),
        { label: 'Serial', value: u.serialNumber, bold: true },
        ...row('Warranty shuru', u.warrantyStartDate ? dayOnly(u.warrantyStartDate) : dayOnly(saleDate(sale).toISOString())),
        ...row('Company warranty tak', u.warrantyEndDate ? dayOnly(u.warrantyEndDate) : null, true),
        ...row('Compressor tak', u.compressorWarrantyEndDate ? dayOnly(u.compressorWarrantyEndDate) : null),
        ...row('Motor tak', u.motorWarrantyEndDate ? dayOnly(u.motorWarrantyEndDate) : null),
        ...row('Dukaan warranty tak', u.shopWarrantyEndDate ? dayOnly(u.shopWarrantyEndDate) : null, true),
      ],
      lines: [],
      subtotal: 0, discount: 0, total: 0, paid: 0, paymentLabel: '',
      hidePrices: true,
      footerNote: 'Ye card aur bill sambhaal kar rakhein. Khud kholne, bijli ke utaar charhao, paani ya tootne par warranty khatam. Masla ho to pehle dukaan par phone karein.',
      signLabels: ['Customer', 'Dukaan'],
    };
    printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
  }
}

/** Slip for the installation team: what to fit, where, and what is still to collect. */
export function printInstallSlip(sale: SaleLike, setup: ReceiptSetup) {
  const charges = Array.isArray(sale.serviceChargesBreakdown) ? sale.serviceChargesBreakdown as Array<{ type?: string; note?: string }> : [];
  const due = Math.max((Number(sale.total) || 0) - (Number(sale.paidAmount) || 0), 0);
  const doc: ReceiptDoc = {
    saleNumber: sale.saleNumber,
    date: saleDate(sale),
    stamp: 'INSTALLATION',
    customerName: sale.customer?.name ?? undefined,
    customerPhone: sale.customer?.phone ?? undefined,
    customerAddress: charges.find((c) => c.type === 'DELIVERY' && c.note)?.note ?? sale.customer?.address ?? undefined,
    partyLabel: 'Customer',
    lines: (sale.items ?? []).map((i) => ({ name: i.product?.name ?? i.name ?? 'Product', qty: Number(i.quantity) || 1, unit: '', price: 0, total: 0 })),
    subtotal: 0, discount: 0, total: 0, paid: 0, paymentLabel: '',
    hidePrices: true,
    footerNote: [due > 0 ? `Customer se ${formatPKR(due)} lena hai.` : '', 'Kaam ke baad customer se sign lein aur demo dein.'].filter(Boolean).join(' '),
    signLabels: ['Customer', 'Technician'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** Job slip for an installation visit. */
export function printInstallationJob(i: Installation, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const total = Number(i.totalCharge) || 0;
  const paid = Number(i.paidByCustomer) || 0;
  printReceipt({
    saleNumber: i.installationNumber,
    date: new Date(i.scheduledDate ?? i.createdAt),
    stamp: i.status === 'COMPLETED' ? 'KAAM HO GAYA' : serviceTypeOf(i.serviceType).toUpperCase(),
    customerName: i.customerName, customerPhone: i.customerPhone, customerAddress: [i.customerAddress, i.area].filter(Boolean).join(', '),
    partyLabel: 'Customer',
    infoRows: [
      { label: 'Product', value: i.productName, bold: true },
      ...row('Serial', i.serialNumber),
      ...row('Date', i.scheduledDate ? `${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)}` : 'Abhi tay nahi', true),
      ...row('Technician', [i.technicianName, i.technicianPhone].filter(Boolean).join(' · ')),
      ...(i.covered_underWarranty ? [{ label: 'Warranty', value: 'Haan' }] : []),
    ],
    lines: [
      ...(Number(i.laborCharge) ? [{ name: 'Mazdoori', qty: 1, unit: '', price: Number(i.laborCharge), total: Number(i.laborCharge) }] : []),
      ...(Number(i.visitCharge) ? [{ name: 'Visit', qty: 1, unit: '', price: Number(i.visitCharge), total: Number(i.visitCharge) }] : []),
      ...(Number(i.materialsCharge) ? [{ name: 'Saman (pipe, stand, wire)', qty: 1, unit: '', price: Number(i.materialsCharge), total: Number(i.materialsCharge) }] : []),
    ],
    subtotal: total, discount: 0, total, paid,
    paymentLabel: paid > 0 ? 'Mila' : 'Abhi kuch nahi mila',
    footerNote: total > paid ? `Baqi ${formatPKR(total - paid)} — kaam ke baad lein.` : 'Kaam ke baad customer se sign lein.',
    signLabels: ['Customer', 'Technician'],
  }, { paper: printPaper(setup), setup, copies: 1 });
}

/** Job slip for a repair visit. */
export function printRepairJob(r: ServiceRequest, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const total = Number(r.totalCharge) || 0;
  const paid = Number(r.paidAmount) || 0;
  printReceipt({
    saleNumber: r.requestNumber,
    date: new Date(r.requestedAt),
    stamp: r.status === 'COMPLETED' ? 'THEEK HO GAYA' : 'SHIKAYAT',
    customerName: r.customerName, customerPhone: r.customerPhone, customerAddress: [r.customerAddress, r.area].filter(Boolean).join(', '),
    partyLabel: 'Customer',
    infoRows: [
      { label: 'Product', value: r.productName, bold: true },
      ...row('Serial', r.serialNumber),
      { label: 'Shikayat', value: r.reportedIssue },
      ...row('Kaam', serviceTypeOf(r.serviceType)),
      ...(r.priority !== 'NORMAL' ? [{ label: 'Jaldi', value: priorityOf(r.priority).label }] : []),
      ...row('Date', r.scheduledDate ? `${dayOnly(r.scheduledDate)} ${slotLabel(r.scheduledTimeSlot)}` : null, true),
      ...row('Technician', [r.technicianName, r.technicianPhone].filter(Boolean).join(' · ')),
      ...(r.coveredUnderWarranty ? [{ label: 'Warranty', value: 'Haan' }] : []),
      ...(r.coveredUnderAmc ? [{ label: 'AMC', value: r.amcContractNumber ?? 'Haan' }] : []),
      ...row('Kya kiya', r.workDone),
    ],
    lines: [
      ...(Number(r.visitCharge) ? [{ name: 'Visit', qty: 1, unit: '', price: Number(r.visitCharge), total: Number(r.visitCharge) }] : []),
      ...(Number(r.laborCharge) ? [{ name: 'Mazdoori', qty: 1, unit: '', price: Number(r.laborCharge), total: Number(r.laborCharge) }] : []),
      ...(Number(r.partsCharge) ? [{ name: 'Parts', qty: 1, unit: '', price: Number(r.partsCharge), total: Number(r.partsCharge) }] : []),
    ],
    subtotal: total, discount: 0, total, paid,
    paymentLabel: paid > 0 ? 'Mila' : 'Abhi kuch nahi mila',
    footerNote: total > paid && !r.coveredUnderAmc && !r.coveredUnderWarranty ? `Baqi ${formatPKR(total - paid)}.` : undefined,
    signLabels: ['Customer', 'Technician'],
  }, { paper: printPaper(setup), setup, copies: 1 });
}

/** What the qist agreement needs from a plan (the shared /emi-plans detail). */
export interface QistPlanLike {
  planNumber: string; createdAt: string; startDate: string;
  customerName: string; customerPhone?: string | null;
  customer?: { address?: string | null; cnic?: string | null } | null;
  sale?: { saleNumber: string } | null;
  totalAmount: number; downPayment: number; financedAmount: number; installmentCount: number; installmentAmount: number;
  installments: Array<{ installmentNumber: number; dueDate: string; amount: number }>;
  guarantorName?: string | null; guarantorPhone?: string | null; guarantorCnic?: string | null; guarantorAddress?: string | null;
}

/** Qist agreement (iqrarnama): the schedule, the customer and the guarantor, with signature lines. */
export function printQistAgreement(p: QistPlanLike, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const financed = Number(p.financedAmount) || 0;
  printReceipt({
    saleNumber: p.planNumber,
    date: new Date(p.createdAt),
    stamp: 'QIST IQRARNAMA',
    customerName: p.customerName,
    customerPhone: p.customerPhone ?? undefined,
    customerAddress: p.customer?.address ?? undefined,
    partyLabel: 'Customer',
    infoRows: [
      ...row('Bill', p.sale?.saleNumber),
      ...row('Customer CNIC', p.customer?.cnic),
      { label: 'Kul qeemat', value: formatPKR(p.totalAmount) },
      { label: 'Advance', value: formatPKR(p.downPayment) },
      { label: 'Qiston me', value: `${p.installmentCount} × ${formatPKR(p.installmentAmount)}`, bold: true },
      ...row('Pehli qist', dayOnly(p.startDate)),
    ],
    lines: p.installments.map((i) => ({ name: `Qist ${i.installmentNumber} — ${dayOnly(i.dueDate)}`, qty: 1, unit: '', price: Number(i.amount), total: Number(i.amount) })),
    subtotal: financed, discount: 0, total: financed, paid: 0,
    paymentLabel: 'Qiston me',
    boxes: p.guarantorName ? [{
      title: 'Zamin (guarantor)',
      lines: [p.guarantorName, p.guarantorPhone ? `Phone: ${p.guarantorPhone}` : '', p.guarantorCnic ? `CNIC: ${p.guarantorCnic}` : '', p.guarantorAddress ?? ''].filter(Boolean),
    }] : undefined,
    footerNote: 'Har qist waqt par jama karwayein. Qist na dene par zamin zimmedar hoga. Saman poori qeemat ada hone tak dukaan ki amanat hai.',
    signLabels: ['Customer', 'Zamin'],
  }, { paper: printPaper(setup), setup, copies: 1 });
}
