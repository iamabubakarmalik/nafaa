/**
 * Slips through the shared receipt engine (web mobile components/slips.ts): the
 * buy-back slip the seller signs and the repair job card the customer keeps.
 * Slip words follow the shop's bill language.
 */

import { formatDate, formatMoney } from '@/core/format';
import { getReceiptSetup, printPaper, printReceipt, shareReceiptPdf, type ReceiptDoc, type ReceiptLang, type ReceiptRowDoc } from '@/core/receipt';
import type { RepairTicket, UsedPhone } from './api';

type Word = 'seller' | 'phone' | 'pta' | 'condition' | 'with' | 'how' | 'price' | 'repair' | 'device' | 'problem' | 'ready' | 'advance' | 'balance' | 'customer' | 'shop' | 'warranty' | 'buyNote' | 'repairNote' | 'cash' | 'exchange' | 'consign' | 'box' | 'charger' | 'cable' | 'handsfree' | 'receipt' | 'days' | 'estimate' | 'sim' | 'card';

const WORDS: Record<ReceiptLang, Record<Word, string>> = {
  roman: {
    seller: 'Bechne wala', phone: 'Phone', pta: 'PTA', condition: 'Halat', with: 'Saath', how: 'Kaise', price: 'Qeemat', repair: 'Repair ki parchi', device: 'Phone', problem: 'Kharabi', ready: 'Tayyar hone ka andaza',
    advance: 'Advance', balance: 'Baqi', customer: 'Customer', shop: 'Dukaan', warranty: 'Repair warranty', buyNote: 'Phone apni marzi se becha. Mera hai aur chori ka nahi.', repairNote: 'Parchi ke baghair phone wapas nahi hoga. Data ka khayal customer khud rakhe.',
    cash: 'Cash me khareeda', exchange: 'Exchange', consign: 'Amanat', box: 'Dabba', charger: 'Charger', cable: 'Cable', handsfree: 'Handsfree', receipt: 'Raseed', days: 'din', estimate: 'Andaza', sim: 'SIM', card: 'Memory card',
  },
  en: {
    seller: 'Seller', phone: 'Phone', pta: 'PTA', condition: 'Condition', with: 'Includes', how: 'Type', price: 'Price', repair: 'Repair job card', device: 'Phone', problem: 'Problem', ready: 'Expected ready',
    advance: 'Advance', balance: 'Balance', customer: 'Customer', shop: 'Shop', warranty: 'Repair warranty', buyNote: 'I sold this phone of my own will. It is mine and not stolen.', repairNote: 'The phone is returned only against this card. The customer is responsible for their data.',
    cash: 'Bought for cash', exchange: 'Exchange', consign: 'Consignment', box: 'Box', charger: 'Charger', cable: 'Cable', handsfree: 'Handsfree', receipt: 'Receipt', days: 'days', estimate: 'Estimate', sim: 'SIM', card: 'Memory card',
  },
  ur: {
    seller: 'بیچنے والا', phone: 'فون', pta: 'PTA', condition: 'حالت', with: 'ساتھ', how: 'کیسے', price: 'قیمت', repair: 'مرمت کی پرچی', device: 'فون', problem: 'خرابی', ready: 'تیار ہونے کا اندازہ',
    advance: 'ایڈوانس', balance: 'باقی', customer: 'گاہک', shop: 'دکان', warranty: 'مرمت وارنٹی', buyNote: 'میں نے یہ فون اپنی مرضی سے بیچا۔ یہ میرا ہے اور چوری کا نہیں۔', repairNote: 'پرچی کے بغیر فون واپس نہیں ہوگا۔ ڈیٹا کا خیال گاہک خود رکھے۔',
    cash: 'نقد خریدا', exchange: 'ایکسچینج', consign: 'امانت', box: 'ڈبہ', charger: 'چارجر', cable: 'کیبل', handsfree: 'ہینڈز فری', receipt: 'رسید', days: 'دن', estimate: 'اندازہ', sim: 'سم', card: 'میموری کارڈ',
  },
};

const COND: Record<ReceiptLang, Record<string, string>> = {
  roman: { EXCELLENT: 'Bilkul naya', VERY_GOOD: 'Bohat acha', GOOD: 'Acha', FAIR: 'Theek', POOR: 'Kamzor' },
  en: { EXCELLENT: 'Like new', VERY_GOOD: 'Very good', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor' },
  ur: { EXCELLENT: 'بالکل نیا', VERY_GOOD: 'بہت اچھا', GOOD: 'اچھا', FAIR: 'ٹھیک', POOR: 'کمزور' },
};

const row = (label: string, value?: string | number | null, bold = false): ReceiptRowDoc[] => (value || value === 0 ? [{ label, value: String(value), bold }] : []);

/** Slip for the seller of a used phone: device, IMEI, condition, CNIC and the amount. */
export function buybackSlip(p: UsedPhone, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const extras = [p.hasOriginalBox && w.box, p.hasOriginalCharger && w.charger, p.hasOriginalCable && w.cable, p.hasOriginalEarphones && w.handsfree, p.hasOriginalReceipt && w.receipt].filter(Boolean) as string[];
  const how = p.source === 'EXCHANGE' ? w.exchange : p.source === 'CONSIGNMENT' ? w.consign : w.cash;
  return {
    saleNumber: p.usedPhoneCode, date: new Date(p.receivedAt), stamp: how.toUpperCase(), customerName: p.fromCustomerName ?? undefined, customerPhone: p.fromCustomerPhone ?? undefined, partyLabel: w.seller,
    infoRows: [
      ...row('CNIC', p.fromCustomerCnic, true), { label: w.phone, value: `${p.brand} ${p.model}${p.storage ? ` ${p.storage}` : ''}`, bold: true }, { label: 'IMEI', value: `${p.imei1}${p.imei2 ? ` / ${p.imei2}` : ''}` },
      { label: w.pta, value: p.ptaStatus.replace(/_/g, '-') }, { label: w.condition, value: COND[lang]?.[p.condition] ?? p.condition }, ...row(w.with, extras.join(', ')), { label: w.how, value: how },
    ],
    lines: [{ name: `${p.brand} ${p.model}`, qty: 1, unit: '', price: p.buybackPrice, total: p.buybackPrice } as ReceiptDoc['lines'][number]],
    subtotal: p.buybackPrice, discount: 0, total: p.buybackPrice, paid: p.source === 'CASH_BUYBACK' ? p.buybackPrice : 0, paymentLabel: how,
    footerNote: w.buyNote, signLabels: [w.seller, w.shop],
  };
}

/** Job card of a repair the customer keeps. */
export function repairSlip(r: RepairTicket, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const total = Number(r.totalCost) || Number(r.estimatedCost) || 0;
  const due = Math.max(total - Number(r.paidAmount || 0), 0);
  return {
    saleNumber: r.ticketNumber, date: new Date(r.receivedAt), stamp: w.repair.toUpperCase(), customerName: r.customerName, customerPhone: r.customerPhone, partyLabel: w.customer,
    infoRows: [
      { label: w.device, value: `${r.deviceBrand} ${r.deviceModel}`, bold: true }, ...row('IMEI', r.imei1), ...row(w.problem, r.reportedIssue),
      ...row(w.ready, r.estimatedReadyAt ? formatDate(r.estimatedReadyAt) : null), ...row(w.sim, r.hasSimCard ? '✓' : null), ...row(w.card, r.hasMemoryCard ? '✓' : null),
      ...row(w.warranty, r.warrantyDays ? `${r.warrantyDays} ${w.days}` : null),
    ],
    lines: [{ name: `${w.repair} · ${r.deviceBrand} ${r.deviceModel}`, qty: 1, unit: '', price: total, total } as ReceiptDoc['lines'][number]],
    subtotal: total, discount: 0, total, paid: Number(r.paidAmount || r.advancePaid || 0), paymentLabel: w.advance,
    footerNote: `${w.balance}: ${formatMoney(due)}. ${w.repairNote}`, signLabels: [w.customer, w.shop],
  };
}

export async function sendSlip(doc: ReceiptDoc, shop: string, lang: ReceiptLang, share = false) {
  const setup = getReceiptSetup(shop);
  const opts = { paper: printPaper(setup), setup, copies: 1, lang };
  if (share) await shareReceiptPdf(doc, opts);
  else await printReceipt(doc, opts);
}

/* WhatsApp texts, in the shop's bill language */

const MSG: Record<ReceiptLang, { hi: string; job: string; ready: string; state: string; when: string; total: string; got: string; due: string; thanks: string; plan: string; late: string; next: string; left: string; pay: string }> = {
  roman: { hi: 'Assalam o alaikum', job: 'job', ready: '✅ Tayyar hai — jab chahein le jayein.', state: 'Halat', when: 'Tayyar hoga', total: 'Kul', got: 'Mila', due: 'Baqi', thanks: 'Shukriya!', plan: 'qist plan', late: 'Late qist', next: 'Agli qist', left: 'Kul baqi', pay: 'Meherbani kar ke waqt par jama karwayein.' },
  en: { hi: 'Hello', job: 'job', ready: '✅ Ready — you can collect it any time.', state: 'Status', when: 'Ready by', total: 'Total', got: 'Paid', due: 'Balance', thanks: 'Thank you!', plan: 'instalment plan', late: 'Late instalment', next: 'Next instalment', left: 'Total balance', pay: 'Please pay on time.' },
  ur: { hi: 'السلام علیکم', job: 'جاب', ready: '✅ تیار ہے — جب چاہیں لے جائیں۔', state: 'حالت', when: 'تیار ہوگا', total: 'کل', got: 'ملا', due: 'باقی', thanks: 'شکریہ!', plan: 'قسط پلان', late: 'لیٹ قسط', next: 'اگلی قسط', left: 'کل باقی', pay: 'مہربانی کر کے وقت پر جمع کروائیں۔' },
};

export function repairMessage(r: RepairTicket, shopName: string, lang: ReceiptLang, statusText: string): string {
  const m = MSG[lang] ?? MSG.roman;
  const total = Number(r.totalCost) > 0 ? Number(r.totalCost) : Number(r.estimatedCost) || 0;
  const due = Math.max(total - Number(r.paidAmount || 0), 0);
  const ready = r.status === 'READY';
  return [
    `${m.hi} ${r.customerName},`,
    `${shopName}: ${r.deviceBrand} ${r.deviceModel} (${m.job} ${r.ticketNumber})`,
    ready ? m.ready : `${m.state}: ${statusText}`,
    !ready && r.estimatedReadyAt ? `${m.when}: ${formatDate(r.estimatedReadyAt)}` : '',
    total > 0 ? `${m.total}: ${formatMoney(total)}${Number(r.paidAmount) > 0 ? ` · ${m.got}: ${formatMoney(Number(r.paidAmount))}` : ''}` : '',
    due > 0 ? `${m.due}: ${formatMoney(due)}` : '',
    m.thanks,
  ].filter(Boolean).join('\n');
}

export function emiMessage(p: { customerName: string; planNumber: string; nextDueAmount: number; nextDueDate?: string | null; overdueAmount: number; remainingAmount: number }, shopName: string, lang: ReceiptLang): string {
  const m = MSG[lang] ?? MSG.roman;
  return [
    `${m.hi} ${p.customerName},`, `${shopName} — ${m.plan} ${p.planNumber}`,
    p.overdueAmount > 0 ? `⚠️ ${m.late}: ${formatMoney(p.overdueAmount)}` : '',
    p.nextDueDate ? `${m.next}: ${formatMoney(p.nextDueAmount)} — ${formatDate(p.nextDueDate)}` : '',
    `${m.left}: ${formatMoney(p.remainingAmount)}`, `${m.pay} ${m.thanks}`,
  ].filter(Boolean).join('\n');
}
