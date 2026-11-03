/**
 * Appliance slips through the shared receipt engine (web appliancePrints.ts):
 * a warranty card per serial on a bill, the installation slip of a bill, the
 * job slips the technician takes (installation, repair visit) and the qist
 * agreement. Words follow the shop's bill language.
 */

import { formatDate, formatMoney } from '@/core/format';
import type { ReceiptDoc, ReceiptLang } from '@/core/receipt';
import { sendSlip, slipRow } from '../_shared/trade/slip';
import { word } from '../retail/lib/bill';
import type { ApplianceSerial, Installation, QistPlan, ServiceRequest } from './api';

const day = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '');
const n = (v: unknown) => Number(v) || 0;
const line = (name: string, price: number) => ({ name, qty: 1, unit: '', price, total: price });
const SIGN = (lang: ReceiptLang, other: 'Technician' | 'Guarantor' | 'Shop'): [string, string] => [
  word(lang, 'Customer', 'گاہک', 'Customer'),
  other === 'Technician' ? word(lang, 'Technician', 'ٹیکنیشن', 'Technician') : other === 'Guarantor' ? word(lang, 'Guarantor', 'ضامن', 'Zamin') : word(lang, 'Shop', 'دکان', 'Dukaan'),
];

interface SaleLike {
  id: string; saleNumber: string; createdAt?: string; soldAt?: string; total?: number; paidAmount?: number;
  customer?: { name?: string | null; phone?: string | null; address?: string | null } | null;
  items?: Array<{ productId?: string | null; name?: string | null; product?: { name?: string | null } | null; quantity?: number }>;
  serviceChargesBreakdown?: unknown;
}
const saleDate = (s: SaleLike) => new Date(s.soldAt ?? s.createdAt ?? Date.now());
const NO_MONEY = { subtotal: 0, discount: 0, total: 0, paid: 0, paymentLabel: '' } as const;

/** One card per serial on the bill. */
export function warrantyCardDocs(sale: SaleLike, units: ApplianceSerial[], lang: ReceiptLang): ReceiptDoc[] {
  const nameOf = (productId: string) => sale.items?.find((i) => i.productId === productId)?.product?.name ?? sale.items?.find((i) => i.productId === productId)?.name ?? '';
  return units.map((u) => ({
    saleNumber: sale.saleNumber, date: saleDate(sale), stamp: word(lang, 'WARRANTY CARD', 'وارنٹی کارڈ', 'WARRANTY CARD'),
    customerName: sale.customer?.name ?? undefined, customerPhone: sale.customer?.phone ?? undefined, customerAddress: sale.customer?.address ?? undefined,
    partyLabel: word(lang, 'Customer', 'گاہک', 'Customer'),
    infoRows: [
      ...slipRow(word(lang, 'Product', 'پروڈکٹ', 'Product'), u.product?.name ?? nameOf(u.productId), true),
      ...slipRow(word(lang, 'Model', 'ماڈل', 'Model'), u.modelNumber),
      ...slipRow(word(lang, 'Serial', 'سیریل', 'Serial'), u.serialNumber, true),
      ...slipRow(word(lang, 'Warranty starts', 'وارنٹی شروع', 'Warranty shuru'), day(u.warrantyStartDate ?? saleDate(sale).toISOString())),
      ...slipRow(word(lang, 'Company warranty till', 'کمپنی وارنٹی', 'Company warranty tak'), day(u.warrantyEndDate), true),
      ...slipRow(word(lang, 'Compressor till', 'کمپریسر', 'Compressor tak'), day(u.compressorWarrantyEndDate)),
      ...slipRow(word(lang, 'Motor till', 'موٹر', 'Motor tak'), day(u.motorWarrantyEndDate)),
      ...slipRow(word(lang, 'Shop warranty till', 'دکان کی وارنٹی', 'Dukaan warranty tak'), day(u.shopWarrantyEndDate), true),
    ],
    lines: [], ...NO_MONEY, hidePrices: true,
    footerNote: word(lang,
      'Keep this card and the bill. Opening the unit yourself, power surges, water or breakage void the warranty. Call the shop first if there is a problem.',
      'یہ کارڈ اور بل سنبھال کر رکھیں۔ خود کھولنے، بجلی کے اتار چڑھاؤ، پانی یا ٹوٹنے پر وارنٹی ختم۔ مسئلہ ہو تو پہلے دکان فون کریں۔',
      'Ye card aur bill sambhaal kar rakhein. Khud kholne, bijli ke utaar charhao, paani ya tootne par warranty khatam. Masla ho to pehle dukaan par phone karein.'),
    signLabels: SIGN(lang, 'Shop'),
  }));
}

/** Slip for the installation team: what to fit, where, and what is still to collect. */
export function installSlipDoc(sale: SaleLike, lang: ReceiptLang): ReceiptDoc {
  const charges = Array.isArray(sale.serviceChargesBreakdown) ? sale.serviceChargesBreakdown as Array<{ type?: string; note?: string }> : [];
  const due = Math.max(n(sale.total) - n(sale.paidAmount), 0);
  return {
    saleNumber: sale.saleNumber, date: saleDate(sale), stamp: word(lang, 'INSTALLATION', 'انسٹالیشن', 'INSTALLATION'),
    customerName: sale.customer?.name ?? undefined, customerPhone: sale.customer?.phone ?? undefined,
    customerAddress: charges.find((c) => c.type === 'DELIVERY' && c.note)?.note ?? sale.customer?.address ?? undefined,
    partyLabel: word(lang, 'Customer', 'گاہک', 'Customer'),
    lines: (sale.items ?? []).map((i) => ({ name: i.product?.name ?? i.name ?? '', qty: n(i.quantity) || 1, unit: '', price: 0, total: 0 })),
    ...NO_MONEY, hidePrices: true,
    footerNote: [due > 0 ? word(lang, `Collect ${formatMoney(due)} from the customer.`, `گاہک سے ${formatMoney(due)} لینے ہیں۔`, `Customer se ${formatMoney(due)} lena hai.`) : '',
      word(lang, 'Get the customer\'s signature after the work and give a demo.', 'کام کے بعد گاہک سے دستخط لیں اور ڈیمو دیں۔', 'Kaam ke baad customer se sign lein aur demo dein.')].filter(Boolean).join(' '),
    signLabels: SIGN(lang, 'Technician'),
  };
}

/** Job slip for an installation visit. */
export function installationJobDoc(i: Installation, lang: ReceiptLang): ReceiptDoc {
  const total = n(i.totalCharge);
  const paid = n(i.paidByCustomer);
  const w = (en: string, ur: string, ro: string) => word(lang, en, ur, ro);
  return {
    saleNumber: i.installationNumber, date: new Date(i.scheduledDate ?? i.createdAt),
    stamp: i.status === 'COMPLETED' ? w('WORK DONE', 'کام مکمل', 'KAAM HO GAYA') : w('INSTALLATION', 'انسٹالیشن', 'INSTALLATION'),
    customerName: i.customerName, customerPhone: i.customerPhone, customerAddress: [i.customerAddress, i.area].filter(Boolean).join(', '), partyLabel: w('Customer', 'گاہک', 'Customer'),
    infoRows: [
      ...slipRow(w('Product', 'پروڈکٹ', 'Product'), i.productName, true), ...slipRow(w('Serial', 'سیریل', 'Serial'), i.serialNumber),
      ...slipRow(w('Date', 'تاریخ', 'Date'), i.scheduledDate ? day(i.scheduledDate) : w('Not set yet', 'ابھی طے نہیں', 'Abhi tay nahi'), true),
      ...slipRow(w('Technician', 'ٹیکنیشن', 'Technician'), [i.technicianName, i.technicianPhone].filter(Boolean).join(' · ')),
      ...(i.covered_underWarranty ? slipRow(w('Warranty', 'وارنٹی', 'Warranty'), w('Yes', 'ہاں', 'Haan')) : []),
    ],
    lines: [
      ...(n(i.laborCharge) ? [line(w('Labour', 'مزدوری', 'Mazdoori'), n(i.laborCharge))] : []),
      ...(n(i.visitCharge) ? [line(w('Visit', 'وزٹ', 'Visit'), n(i.visitCharge))] : []),
      ...(n(i.materialsCharge) ? [line(w('Material (pipe, stand, wire)', 'سامان (پائپ، اسٹینڈ، تار)', 'Saman (pipe, stand, wire)'), n(i.materialsCharge))] : []),
    ],
    subtotal: total, discount: 0, total, paid, paymentLabel: paid > 0 ? w('Received', 'وصول', 'Mila') : w('Nothing received yet', 'ابھی کچھ نہیں ملا', 'Abhi kuch nahi mila'),
    footerNote: total > paid ? w(`Balance ${formatMoney(total - paid)}, collect after the work.`, `باقی ${formatMoney(total - paid)}، کام کے بعد لیں۔`, `Baqi ${formatMoney(total - paid)} — kaam ke baad lein.`) : w('Get the customer\'s signature after the work.', 'کام کے بعد گاہک سے دستخط لیں۔', 'Kaam ke baad customer se sign lein.'),
    signLabels: SIGN(lang, 'Technician'),
  };
}

/** Job slip for a repair visit. */
export function repairJobDoc(r: ServiceRequest, lang: ReceiptLang): ReceiptDoc {
  const total = n(r.totalCharge);
  const paid = n(r.paidAmount);
  const w = (en: string, ur: string, ro: string) => word(lang, en, ur, ro);
  const covered = r.coveredUnderAmc || r.coveredUnderWarranty;
  return {
    saleNumber: r.requestNumber, date: new Date(r.requestedAt),
    stamp: r.status === 'COMPLETED' ? w('FIXED', 'ٹھیک ہو گیا', 'THEEK HO GAYA') : w('COMPLAINT', 'شکایت', 'SHIKAYAT'),
    customerName: r.customerName, customerPhone: r.customerPhone, customerAddress: [r.customerAddress, r.area].filter(Boolean).join(', '), partyLabel: w('Customer', 'گاہک', 'Customer'),
    infoRows: [
      ...slipRow(w('Product', 'پروڈکٹ', 'Product'), r.productName, true), ...slipRow(w('Serial', 'سیریل', 'Serial'), r.serialNumber),
      ...slipRow(w('Complaint', 'شکایت', 'Shikayat'), r.reportedIssue),
      ...(r.priority !== 'NORMAL' ? slipRow(w('Priority', 'جلدی', 'Jaldi'), r.priority) : []),
      ...slipRow(w('Date', 'تاریخ', 'Date'), r.scheduledDate ? day(r.scheduledDate) : '', true),
      ...slipRow(w('Technician', 'ٹیکنیشن', 'Technician'), [r.technicianName, r.technicianPhone].filter(Boolean).join(' · ')),
      ...(r.coveredUnderWarranty ? slipRow(w('Warranty', 'وارنٹی', 'Warranty'), w('Yes', 'ہاں', 'Haan')) : []),
      ...(r.coveredUnderAmc ? slipRow('AMC', r.amcContractNumber ?? w('Yes', 'ہاں', 'Haan')) : []),
      ...slipRow(w('Work done', 'کیا کام ہوا', 'Kya kiya'), r.workDone),
    ],
    lines: [
      ...(n(r.visitCharge) ? [line(w('Visit', 'وزٹ', 'Visit'), n(r.visitCharge))] : []),
      ...(n(r.laborCharge) ? [line(w('Labour', 'مزدوری', 'Mazdoori'), n(r.laborCharge))] : []),
      ...(n(r.partsCharge) ? [line(w('Parts', 'پرزے', 'Parts'), n(r.partsCharge))] : []),
    ],
    subtotal: total, discount: 0, total, paid, paymentLabel: paid > 0 ? w('Received', 'وصول', 'Mila') : w('Nothing received yet', 'ابھی کچھ نہیں ملا', 'Abhi kuch nahi mila'),
    footerNote: total > paid && !covered ? w(`Balance ${formatMoney(total - paid)}.`, `باقی ${formatMoney(total - paid)}۔`, `Baqi ${formatMoney(total - paid)}.`) : undefined,
    signLabels: SIGN(lang, 'Technician'),
  };
}

/** Qist agreement: the schedule, the customer and the guarantor, with signature lines. */
export function qistAgreementDoc(p: QistPlan, lang: ReceiptLang): ReceiptDoc {
  const w = (en: string, ur: string, ro: string) => word(lang, en, ur, ro);
  const financed = n(p.financedAmount);
  const each = p.installments?.[0]?.amount ?? 0;
  return {
    saleNumber: p.planNumber, date: new Date(p.startDate ?? Date.now()), stamp: w('INSTALMENT AGREEMENT', 'قسط کا اقرار نامہ', 'QIST IQRARNAMA'),
    customerName: p.customerName ?? p.customer?.name ?? undefined, customerPhone: (p.customerPhone ?? p.customer?.phone) ?? undefined, partyLabel: w('Customer', 'گاہک', 'Customer'),
    infoRows: [
      { label: w('Total price', 'کل قیمت', 'Kul qeemat'), value: formatMoney(n(p.totalAmount)) },
      { label: w('Advance', 'ایڈوانس', 'Advance'), value: formatMoney(n(p.downPayment)) },
      { label: w('In instalments', 'قسطوں میں', 'Qiston me'), value: `${n(p.installmentCount)} × ${formatMoney(n(each))}`, bold: true },
      ...slipRow(w('First instalment', 'پہلی قسط', 'Pehli qist'), day(p.startDate)),
    ],
    lines: (p.installments ?? []).map((i) => line(`${w('Instalment', 'قسط', 'Qist')} ${i.installmentNumber} — ${day(i.dueDate)}`, n(i.amount))),
    subtotal: financed, discount: 0, total: financed, paid: 0, paymentLabel: w('In instalments', 'قسطوں میں', 'Qiston me'),
    boxes: p.guarantorName ? [{
      title: w('Guarantor', 'ضامن', 'Zamin (guarantor)'),
      lines: [p.guarantorName, p.guarantorPhone ? `${w('Phone', 'فون', 'Phone')}: ${p.guarantorPhone}` : '', p.guarantorCnic ? `CNIC: ${p.guarantorCnic}` : '', p.guarantorAddress ?? ''].filter(Boolean),
    }] : undefined,
    footerNote: w(
      'Pay every instalment on time. If instalments are missed the guarantor is responsible. The goods stay the shop\'s property until fully paid.',
      'ہر قسط وقت پر جمع کروائیں۔ قسط نہ دینے پر ضامن ذمہ دار ہوگا۔ پوری قیمت ادا ہونے تک سامان دکان کی امانت ہے۔',
      'Har qist waqt par jama karwayein. Qist na dene par zamin zimmedar hoga. Saman poori qeemat ada hone tak dukaan ki amanat hai.'),
    signLabels: SIGN(lang, 'Guarantor'),
  };
}

/** Print every warranty card of a bill, one after another. */
export async function printWarrantyCards(sale: SaleLike, units: ApplianceSerial[], shop: string, lang: ReceiptLang) {
  for (const doc of warrantyCardDocs(sale, units, lang)) await sendSlip(doc, shop, lang);
}
export const printInstallSlip = (sale: SaleLike, shop: string, lang: ReceiptLang) => sendSlip(installSlipDoc(sale, lang), shop, lang);
