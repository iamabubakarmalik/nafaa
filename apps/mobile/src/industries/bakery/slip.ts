/**
 * Order slips through the shared receipt engine (web orderSlip.ts): the
 * customer slip with money and balance, and the kitchen slip with how to make
 * it and no prices. Slip words follow the shop's bill language.
 */

import { bulkLines, bulkPrice, dueOf, isDelivery } from '@nafaa/core/bakery';
import { formatMoney } from '@/core/format';
import { getReceiptSetup, printPaper, printReceipt, shareReceiptPdf, type ReceiptDoc, type ReceiptLang, type ReceiptRowDoc } from '@/core/receipt';
import type { BulkOrder, CakeOrder } from './api';
import { bulkTypeOf, cakeLine, creamLabel, dateTime, deliveryOf, flavorLabel, occasionOf, shapeLabel, sizeLabel, statusOf } from './meta';
import { t } from '@/core/i18n';

type Word = 'when' | 'how' | 'occasion' | 'size' | 'flavor' | 'shape' | 'cream' | 'status' | 'onCake' | 'theme' | 'color' | 'photo' | 'decor' | 'number' | 'tiers'
  | 'diet' | 'allergy' | 'candles' | 'stand' | 'knife' | 'design' | 'make' | 'advance' | 'nothing' | 'dueNote' | 'paidNote' | 'customer' | 'shop' | 'event' | 'venue' | 'guests' | 'setup' | 'items';

const WORDS: Record<ReceiptLang, Record<Word, string>> = {
  roman: {
    when: 'Kab chahiye', how: 'Kaise', occasion: 'Mauqa', size: 'Size', flavor: 'Flavour', shape: 'Shakal', cream: 'Cream', status: 'Halat', onCake: 'Cake par likhna',
    theme: 'Theme', color: 'Rang', photo: 'Photo cake', decor: 'Sajawat', number: 'Number / harf', tiers: 'manzil', diet: 'Parhez', allergy: 'Allergy', candles: 'mombatti',
    stand: 'Stand', knife: 'Chhuri', design: 'Design', make: 'Kaise banana hai', advance: 'Advance mila', nothing: 'Abhi kuch nahi mila',
    dueNote: 'Baqi {{due}} lete waqt. Yeh parchi saath laayein.', paidNote: 'Poora paisa mil gaya. Yeh parchi saath laayein.', customer: 'Customer', shop: 'Dukaan',
    event: 'Event', venue: 'Jagah', guests: 'Mehmaan', setup: 'Setup', items: 'Cheezein',
  },
  en: {
    when: 'Needed by', how: 'Handover', occasion: 'Occasion', size: 'Size', flavor: 'Flavour', shape: 'Shape', cream: 'Cream', status: 'Status', onCake: 'Write on cake',
    theme: 'Theme', color: 'Colour', photo: 'Photo cake', decor: 'Decoration', number: 'Number / letter', tiers: 'tiers', diet: 'Diet', allergy: 'Allergy', candles: 'candles',
    stand: 'Stand', knife: 'Knife', design: 'Design', make: 'How to make', advance: 'Advance received', nothing: 'Nothing received yet',
    dueNote: 'Balance {{due}} at handover. Please bring this slip.', paidNote: 'Fully paid. Please bring this slip.', customer: 'Customer', shop: 'Shop',
    event: 'Event', venue: 'Venue', guests: 'Guests', setup: 'Setup', items: 'Items',
  },
  ur: {
    when: 'کب چاہیے', how: 'کیسے', occasion: 'موقع', size: 'سائز', flavor: 'فلیور', shape: 'شکل', cream: 'کریم', status: 'حالت', onCake: 'کیک پر لکھنا',
    theme: 'تھیم', color: 'رنگ', photo: 'فوٹو کیک', decor: 'سجاوٹ', number: 'نمبر / حرف', tiers: 'منزل', diet: 'پرہیز', allergy: 'الرجی', candles: 'موم بتی',
    stand: 'اسٹینڈ', knife: 'چھری', design: 'ڈیزائن', make: 'کیسے بنانا ہے', advance: 'ایڈوانس ملا', nothing: 'ابھی کچھ نہیں ملا',
    dueNote: 'باقی {{due}} لیتے وقت۔ یہ پرچی ساتھ لائیں۔', paidNote: 'پورا پیسہ مل گیا۔ یہ پرچی ساتھ لائیں۔', customer: 'گاہک', shop: 'دکان',
    event: 'تقریب', venue: 'جگہ', guests: 'مہمان', setup: 'سیٹ اپ', items: 'چیزیں',
  },
};

const row = (label: string, value?: string | null, bold?: boolean): ReceiptRowDoc[] => (value ? [{ label, value, ...(bold && { bold }) }] : []);

export function cakeSlip(o: CakeOrder, shop: string, kitchen: boolean, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const design = [
    o.messageOnCake ? `${w.onCake}: "${o.messageOnCake}"${o.messageColor ? ` (${o.messageColor})` : ''}` : '',
    o.designInstructions ?? '',
    [o.colorTheme && `${w.theme}: ${o.colorTheme}`, o.primaryColor && `${w.color}: ${o.primaryColor}${o.secondaryColor ? ` + ${o.secondaryColor}` : ''}`].filter(Boolean).join(' · '),
    o.hasPhotoOnCake ? `${w.photo}${o.hasEdibleImage ? ' (edible)' : ''}` : '',
    o.decorativeItems?.length ? `${w.decor}: ${o.decorativeItems.map((d) => t(d)).join(', ')}` : '',
    o.numberOrLetter ? `${w.number}: ${o.numberOrLetter}` : '',
    o.numberOfTiers > 1 ? `${o.numberOfTiers} ${w.tiers}` : '',
    [o.isEggless && t('Anday ke bagair'), o.isSugarFree && t('Cheeni ke bagair'), o.isVegan && t('Vegan')].filter(Boolean).join(' · '),
    o.allergies?.length ? `${w.allergy}: ${o.allergies.map((a) => t(a)).join(', ')}` : '',
    o.dietaryNotes ?? '',
    [o.candlesRequired ? `${o.candlesRequired} ${w.candles}${o.candleType ? ` (${o.candleType})` : ''}` : '', o.cakeStand && w.stand, o.cakeKnife && w.knife].filter(Boolean).join(' · '),
    o.specialInstructions ?? '',
  ].filter((x) => x && String(x).trim()) as string[];
  const due = dueOf(o);
  return {
    saleNumber: o.orderNumber,
    date: new Date(o.createdAt),
    stamp: kitchen ? 'KITCHEN' : undefined,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerAddress: isDelivery(o.deliveryType) ? [o.deliveryAddress, o.deliveryLandmark].filter(Boolean).join(', ') || undefined : undefined,
    partyLabel: w.customer,
    infoRows: [
      ...row(w.when, dateTime(o.neededBy), true),
      ...row(w.how, t(deliveryOf(o.deliveryType).label)),
      ...row(w.occasion, `${t(occasionOf(o.occasion).label)}${o.celebrantName ? ` — ${o.celebrantName}${o.celebrantAge ? ` (${o.celebrantAge})` : ''}` : ''}`),
      ...row(w.size, o.size === 'CUSTOM' && o.customWeightKg ? `${o.customWeightKg} kg` : sizeLabel(o.size)),
      ...row(w.flavor, o.flavor === 'CUSTOM_FLAVOR' ? o.customFlavorDesc : flavorLabel(o.flavor)),
      ...row(w.shape, o.shape === 'CUSTOM_SHAPE' ? o.customShapeDesc : shapeLabel(o.shape)),
      ...row(w.cream, o.creamType ? creamLabel(o.creamType) : null),
      ...(kitchen ? [] : row(w.status, t(statusOf(o.status).label))),
    ],
    lines: [{ name: cakeLine(o), qty: 1, unit: '', price: o.basePrice, total: o.basePrice } as ReceiptDoc['lines'][number]],
    subtotal: o.basePrice,
    discount: o.discount,
    deliveryCharge: o.deliveryCharges || undefined,
    extraRows: [
      ...(o.customizationCharges > 0 ? [{ label: w.design, value: formatMoney(o.customizationCharges) }] : []),
      ...(o.photoCakeCharges > 0 ? [{ label: w.photo, value: formatMoney(o.photoCakeCharges) }] : []),
      ...(o.taxAmount > 0 ? [{ label: 'Tax', value: formatMoney(o.taxAmount) }] : []),
    ],
    total: o.total,
    paid: o.paidAmount,
    paymentLabel: o.paidAmount > 0 ? w.advance : w.nothing,
    hidePrices: kitchen,
    boxes: design.length ? [{ title: kitchen ? w.make : w.design, lines: design }] : undefined,
    footerNote: kitchen ? undefined : due > 0 ? w.dueNote.replace('{{due}}', formatMoney(due)) : w.paidNote,
    signLabels: [w.customer, w.shop],
  };
}

export function bulkSlip(o: BulkOrder, shop: string, kitchen: boolean, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const lines = bulkLines(o.items);
  const total = bulkPrice(o);
  const sum = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const due = Math.max(total - Number(o.paidAmount || 0), 0);
  return {
    saleNumber: o.orderNumber,
    date: new Date(o.createdAt),
    stamp: kitchen ? 'KITCHEN' : undefined,
    customerName: o.organizationName,
    customerPhone: o.contactPhone,
    customerAddress: o.requiresDelivery ? o.deliveryAddress || o.venue || undefined : undefined,
    partyLabel: w.customer,
    infoRows: [
      ...row(w.event, `${t(bulkTypeOf(o.orderType).label)} · ${dateTime(o.eventDate)}`, true),
      ...row(w.venue, o.venue),
      ...row(w.guests, o.totalGuests ? String(o.totalGuests) : null),
      ...row(w.setup, o.requiresSetup ? o.setupTime || '✓' : null),
    ],
    lines: lines.map((l) => ({ name: l.name, qty: l.qty, unit: l.unit ?? '', price: l.rate, total: l.qty * l.rate }) as ReceiptDoc['lines'][number]),
    subtotal: sum,
    discount: Math.max(sum - total, 0),
    extraRows: total > sum ? [{ label: w.design, value: formatMoney(total - sum) }] : [],
    total,
    paid: o.paidAmount,
    paymentLabel: o.paidAmount > 0 ? w.advance : w.nothing,
    hidePrices: kitchen,
    boxes: o.specialInstructions ? [{ title: kitchen ? w.make : w.items, lines: [o.specialInstructions] }] : undefined,
    footerNote: kitchen ? undefined : due > 0 ? w.dueNote.replace('{{due}}', formatMoney(due)) : w.paidNote,
    signLabels: [w.customer, w.shop],
  };
}

/** Prints through the shop's printer, or shares a PDF when `share`. */
export async function sendSlip(doc: ReceiptDoc, shop: string, lang: ReceiptLang, share = false) {
  const setup = getReceiptSetup(shop);
  const opts = { paper: printPaper(setup), setup, copies: 1, lang };
  if (share) await shareReceiptPdf(doc, opts);
  else await printReceipt(doc, opts);
}
