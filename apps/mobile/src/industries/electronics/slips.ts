/**
 * Customer slip of a warranty claim (web WarrantyClaimsPage claimSlip), through
 * the shared receipt engine so it follows the shop's bill design and printer.
 * Words follow the shop's bill language.
 */

import { formatDate, formatMoney } from '@/core/format';
import { getReceiptSetup, printPaper, printReceipt, shareReceiptPdf, type ReceiptDoc, type ReceiptLang, type ReceiptRowDoc } from '@/core/receipt';
import type { WarrantyClaim } from './api';

type Word = 'claim' | 'product' | 'serial' | 'bill' | 'problem' | 'result' | 'detail' | 'charge' | 'customer' | 'shop' | 'note' | 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'REJECTED';
const WORDS: Record<ReceiptLang, Record<Word, string>> = {
  roman: { claim: 'Warranty claim parchi', product: 'Product', serial: 'Serial', bill: 'Bill', problem: 'Kharabi', result: 'Natija', detail: 'Tafseel', charge: 'Charge', customer: 'Customer', shop: 'Dukaan', note: 'Unit lene ke liye ye parchi saath layein. Toota ya paani laga unit warranty mein nahi.', REPAIRED: 'Theek kar diya', REPLACED: 'Naya unit diya', REFUNDED: 'Paisa wapas', REJECTED: 'Warranty mein nahi' },
  en: { claim: 'Warranty claim slip', product: 'Product', serial: 'Serial', bill: 'Bill', problem: 'Problem', result: 'Outcome', detail: 'Details', charge: 'Charge', customer: 'Customer', shop: 'Shop', note: 'Bring this slip to collect the unit. Broken or water-damaged units are not under warranty.', REPAIRED: 'Repaired', REPLACED: 'Replaced', REFUNDED: 'Refunded', REJECTED: 'Not under warranty' },
  ur: { claim: 'وارنٹی کلیم پرچی', product: 'پروڈکٹ', serial: 'سیریل', bill: 'بل', problem: 'خرابی', result: 'نتیجہ', detail: 'تفصیل', charge: 'چارج', customer: 'گاہک', shop: 'دکان', note: 'یونٹ لینے کے لیے یہ پرچی ساتھ لائیں۔ ٹوٹا یا پانی لگا یونٹ وارنٹی میں نہیں۔', REPAIRED: 'ٹھیک کر دیا', REPLACED: 'نیا یونٹ دیا', REFUNDED: 'پیسے واپس', REJECTED: 'وارنٹی میں نہیں' },
};
const row = (label: string, value?: string | null, bold = false): ReceiptRowDoc[] => (value ? [{ label, value, bold }] : []);

export function claimSlip(c: WarrantyClaim, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const out = c.resolutionType ? w[c.resolutionType as 'REPAIRED'] ?? c.resolutionType : '';
  return {
    saleNumber: c.claimNumber, date: new Date(c.claimDate), stamp: w.claim.toUpperCase(), customerName: c.customerName, customerPhone: c.customerPhone, partyLabel: w.customer,
    infoRows: [
      { label: w.product, value: c.productName, bold: true }, ...row(w.serial, c.imei ? `${c.serialNumber ?? ''} / ${c.imei}` : c.serialNumber),
      ...row(w.bill, c.invoiceNumber ? `${c.invoiceNumber} · ${formatDate(c.purchaseDate)}` : null), { label: w.problem, value: c.issueDescription },
      ...(c.resolvedAt ? [...row(w.result, out, true), ...row(w.detail, c.resolution), ...row(w.charge, c.paidByCustomer > 0 ? formatMoney(c.paidByCustomer) : null)] : []),
    ],
    lines: [{ name: c.productName, qty: 1, unit: '', price: 0, total: 0 } as ReceiptDoc['lines'][number]], subtotal: 0, discount: 0, total: 0, paid: 0, paymentLabel: '', hidePrices: true,
    footerNote: w.note, signLabels: [w.customer, w.shop],
  };
}

export async function sendSlip(doc: ReceiptDoc, shop: string, lang: ReceiptLang, share = false) {
  const setup = getReceiptSetup(shop);
  const opts = { paper: printPaper(setup), setup, copies: 1, lang };
  if (share) await shareReceiptPdf(doc, opts);
  else await printReceipt(doc, opts);
}
