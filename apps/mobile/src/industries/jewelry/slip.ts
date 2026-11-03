/**
 * Slips through the shared receipt engine (web jewelry print docs): the
 * customer slip of a custom order or repair with money and balance, and the
 * karigar slip with the work and no prices. Slip words follow the shop's
 * bill language.
 */

import { grams, categoryLabel, day, purityLabel } from './meta';
import { formatMoney } from '@/core/format';
import { getReceiptSetup, printPaper, printReceipt, shareReceiptPdf, type ReceiptDoc, type ReceiptLang, type ReceiptRowDoc } from '@/core/receipt';
import type { CustomOrderRow, Repair } from './api';

type Word = 'order' | 'repair' | 'item' | 'weight' | 'design' | 'engraving' | 'due' | 'advance' | 'gold' | 'price' | 'karigar' | 'karat' | 'charge' | 'balance' | 'note' | 'orderNote' | 'repairNote' | 'customer' | 'shop' | 'back' | 'expected';

const WORDS: Record<ReceiptLang, Record<Word, string>> = {
  roman: {
    order: 'Zewar order', repair: 'Repair ki parchi', item: 'Zewar aur kaam', weight: 'Wazan', design: 'Design', engraving: 'Naam / likhai', due: 'Dena', advance: 'Advance', gold: 'Customer ka sona',
    price: 'Qeemat', karigar: 'Karigar', karat: 'Karat', charge: 'Repair charges', balance: 'Baqi', note: 'Note', customer: 'Customer', shop: 'Dukaan', back: 'Wapas', expected: 'Andaza wazan',
    orderNote: 'Sone ka rate badalne par qeemat badal sakti hai. Parchi ke saath zewar milega.', repairNote: 'Parchi ke baghair zewar wapas nahi hoga. Zewar ka wazan lete waqt check kar lein.',
  },
  en: {
    order: 'Jewellery order', repair: 'Repair slip', item: 'Piece and work', weight: 'Weight', design: 'Design', engraving: 'Engraving', due: 'Due', advance: 'Advance', gold: 'Customer gold',
    price: 'Price', karigar: 'Karigar', karat: 'Karat', charge: 'Repair charges', balance: 'Balance', note: 'Note', customer: 'Customer', shop: 'Shop', back: 'Ready by', expected: 'Expected weight',
    orderNote: 'The price can change if the gold rate changes. Bring this slip to collect the piece.', repairNote: 'The piece is returned only against this slip. Please check the weight at drop-off.',
  },
  ur: {
    order: 'زیور آرڈر', repair: 'مرمت کی پرچی', item: 'زیور اور کام', weight: 'وزن', design: 'ڈیزائن', engraving: 'نام / لکھائی', due: 'دینا', advance: 'ایڈوانس', gold: 'گاہک کا سونا',
    price: 'قیمت', karigar: 'کاریگر', karat: 'قیراط', charge: 'مرمت چارجز', balance: 'باقی', note: 'نوٹ', customer: 'گاہک', shop: 'دکان', back: 'واپسی', expected: 'اندازہ وزن',
    orderNote: 'سونے کا ریٹ بدلنے پر قیمت بدل سکتی ہے۔ زیور لینے کے لیے یہ پرچی ساتھ لائیں۔', repairNote: 'پرچی کے بغیر زیور واپس نہیں ہوگا۔ زیور کا وزن دیتے وقت چیک کر لیں۔',
  },
};

const row = (label: string, value?: string | null, bold?: boolean): ReceiptRowDoc[] => (value ? [{ label, value, ...(bold && { bold }) }] : []);

export function orderSlip(o: CustomOrderRow, lang: ReceiptLang, karigar = false): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const price = o.finalPrice ?? o.estimatedPrice;
  return {
    saleNumber: o.orderNumber, date: new Date(o.orderDate), stamp: karigar ? 'KARIGAR' : undefined, customerName: o.customerName, customerPhone: o.customerPhone, partyLabel: w.customer,
    infoRows: [
      ...row(w.due, day(o.promisedDate), true), ...row(w.item, `${categoryLabel(o.category)} · ${purityLabel(o.purity)}`), ...row(w.expected, grams(o.expectedGrossWeight)),
      ...row(w.design, o.designDescription), ...row(w.engraving, o.engravingText), ...(karigar ? row(w.karigar, o.assignedKarigarName) : []),
    ],
    lines: [{ name: `${categoryLabel(o.category)} · ${purityLabel(o.purity)}`, qty: 1, unit: '', price, total: price } as ReceiptDoc['lines'][number]],
    subtotal: price, discount: 0, total: price, paid: o.paidAmount, paymentLabel: w.advance, hidePrices: karigar,
    extraRows: o.goldAdvance.grams ? [{ label: `${w.gold} ${grams(o.goldAdvance.grams)}`, value: formatMoney(o.goldAdvance.value) }] : [],
    footerNote: karigar ? undefined : `${w.balance}: ${formatMoney(o.due)}. ${w.orderNote}`, signLabels: [w.customer, w.shop],
  };
}

export function repairSlip(r: Repair, lang: ReceiptLang, karigar = false): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  return {
    saleNumber: r.repairNumber, date: new Date(r.createdAt), stamp: karigar ? 'KARIGAR' : undefined, customerName: r.customerName ?? undefined, customerPhone: r.customerPhone ?? undefined, partyLabel: w.customer,
    infoRows: [
      ...row(w.back, day(r.promisedDate), true), ...row(w.item, r.itemDescription), ...row(w.karat, r.karat ? `${r.karat}K` : null), ...row(w.weight, r.weightGrams ? grams(r.weightGrams) : null),
      ...(karigar ? row(w.karigar, r.karigarName) : []), ...row(w.note, r.notes),
    ],
    lines: [{ name: r.itemDescription, qty: 1, unit: '', price: r.charge, total: r.charge } as ReceiptDoc['lines'][number]],
    subtotal: r.charge, discount: 0, total: r.charge, paid: r.advance, paymentLabel: w.advance, hidePrices: karigar,
    footerNote: karigar ? undefined : `${w.balance}: ${formatMoney(r.due)}. ${w.repairNote}`, signLabels: [w.customer, w.shop],
  };
}

export async function sendSlip(doc: ReceiptDoc, shop: string, lang: ReceiptLang, share = false) {
  const setup = getReceiptSetup(shop);
  const opts = { paper: printPaper(setup), setup, copies: 1, lang };
  if (share) await shareReceiptPdf(doc, opts);
  else await printReceipt(doc, opts);
}
