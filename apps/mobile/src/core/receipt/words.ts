/**
 * Words printed on bills and sent in bill texts. Customer documents follow
 * the shop's bill language (Settings → Language), not the language of the
 * person at the counter, so they live here instead of in the app catalogs.
 */

import type { Locale } from '@/core/i18n';

export type ReceiptLang = Locale;

const roman = {
  bill: 'Bill #', date: 'Date', customer: 'Customer', cashier: 'Cashier', branch: 'Branch', phone: 'Ph', wa: 'WA',
  items: 'Items', quantity: 'Quantity', discount: 'Discount', delivery: 'Delivery', total: 'TOTAL',
  change: 'Wapis (change)', riderPay: 'Rider ko dein (delivery)', customerPays: 'Customer dega kul', due: 'Udhaar (baqi)',
  khata: 'Khata', previousDue: 'Pichla udhaar', thisBill: 'Is bill ka', totalDue: 'Kul udhaar',
  allItems: 'Kul cheezein', allQty: 'Kul quantity', saved: 'Aap ne {{amount}} bachaye',
  receiver: 'Maal le jane wala', signature: 'Dastkhat',
  payDue: 'Baqi {{amount}} — paise yahan bhejein', payWays: 'Paise bhejne ke tareeqe', payRef: 'Reference me bill # {{number}} likhein',
  terms: 'shartein aur hidayat', madeWith: 'Yeh bill {{app}} se bana. Apni dukaan ka hisaab, stock, udhaar aur bills — sab mobile par.',
  billTo: 'Bill to', walkIn: 'Walk-in customer', takenBy: 'Le gaya', lastDate: 'Aakhri date', payment: 'Payment', invoice: 'Invoice',
  item: 'Cheez', rate: 'Rate', amount: 'Amount', inWords: 'Amount in words', conditions: 'Shartein',
  customerSign: 'Customer ke dastkhat', shopSign: 'Dukaan ki mohar / dastkhat',
  paid: 'PAID', unpaid: 'UNPAID', partPaid: 'PARTLY PAID', cancelled: 'CANCELLED', returned: 'RETURNED',
  paidWith: 'Paid ({{method}})', khataPart: 'Udhaar {{amount}}',
  stampCancel: 'CANCEL', stampReturn: 'WAPAS', stampOffline: 'OFFLINE',
  returnedQty: '{{qty}} wapas ho chuka', code: 'Code {{code}}', pointsUsed: '{{points}} points istemal', pointsEarned: 'Points mile', refunded: 'Wapas kiya',
  pitch: 'Apni dukaan ka hisaab asaan banayein', thanks: 'Shukriya!',
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank', TRADE_IN: 'Trade-in', CREDIT: 'Udhaar',
};

type Words = typeof roman;

const en: Words = {
  ...roman,
  change: 'Change', riderPay: 'Pay the rider (delivery)', customerPays: 'Customer pays in all', due: 'Credit (due)',
  khata: 'Account', previousDue: 'Previous due', thisBill: 'This bill', totalDue: 'Total due',
  allItems: 'Total items', allQty: 'Total quantity', saved: 'You saved {{amount}}',
  receiver: 'Goods taken by', signature: 'Signature',
  payDue: 'Due {{amount}} — pay here', payWays: 'Ways to pay', payRef: 'Write bill # {{number}} as the reference',
  terms: 'terms and notes', madeWith: 'This bill was made with {{app}}. Shop accounts, stock, credit and bills — all on mobile.',
  takenBy: 'Taken by', lastDate: 'Due date', item: 'Item', conditions: 'Terms',
  customerSign: 'Customer signature', shopSign: 'Shop stamp / signature',
  khataPart: 'Credit {{amount}}', stampReturn: 'RETURNED',
  returnedQty: '{{qty}} returned', pointsUsed: '{{points}} points used', pointsEarned: 'Points earned', refunded: 'Refunded',
  pitch: 'Simple accounts for your shop', thanks: 'Thank you!', CREDIT: 'Credit',
};

const ur: Words = {
  ...roman,
  bill: 'بل #', date: 'تاریخ', customer: 'گاہک', cashier: 'کیشیئر', branch: 'برانچ', phone: 'فون',
  items: 'اشیاء', quantity: 'تعداد', discount: 'ڈسکاؤنٹ', delivery: 'ڈیلیوری', total: 'ٹوٹل',
  change: 'واپسی (چینج)', riderPay: 'رائیڈر کو دیں (ڈیلیوری)', customerPays: 'گاہک کل دے گا', due: 'ادھار (باقی)',
  khata: 'کھاتہ', previousDue: 'پچھلا ادھار', thisBill: 'اس بل کا', totalDue: 'کل ادھار',
  allItems: 'کل اشیاء', allQty: 'کل تعداد', saved: 'آپ نے {{amount}} بچائے',
  receiver: 'مال لے جانے والا', signature: 'دستخط',
  payDue: 'باقی {{amount}} — پیسے یہاں بھیجیں', payWays: 'پیسے بھیجنے کے طریقے', payRef: 'ریفرنس میں بل # {{number}} لکھیں',
  terms: 'شرائط اور ہدایات', madeWith: 'یہ بل {{app}} سے بنا۔ دکان کا حساب، اسٹاک، ادھار اور بل — سب موبائل پر۔',
  billTo: 'بل برائے', walkIn: 'عام گاہک', takenBy: 'لے گیا', lastDate: 'آخری تاریخ', payment: 'ادائیگی', invoice: 'انوائس',
  item: 'چیز', rate: 'ریٹ', amount: 'رقم', inWords: 'رقم الفاظ میں', conditions: 'شرائط',
  customerSign: 'گاہک کے دستخط', shopSign: 'دکان کی مہر / دستخط',
  paidWith: 'ادا ({{method}})', khataPart: 'ادھار {{amount}}',
  returnedQty: '{{qty}} واپس ہو چکا', code: 'کوڈ {{code}}', pointsUsed: '{{points}} پوائنٹس استعمال', pointsEarned: 'پوائنٹس ملے', refunded: 'واپس کیا',
  pitch: 'اپنی دکان کا حساب آسان بنائیں', thanks: 'شکریہ!',
  CASH: 'نقد', CARD: 'کارڈ', BANK_TRANSFER: 'بینک', CREDIT: 'ادھار',
};

const WORDS: Record<ReceiptLang, Words> = { roman, en, ur };

export type ReceiptWord = keyof Words;

/** A receipt word in the shop's language, with {{placeholders}} filled. */
export function rw(lang: ReceiptLang, key: ReceiptWord, params?: Record<string, string | number>): string {
  let s = (WORDS[lang] ?? roman)[key] ?? roman[key] ?? String(key);
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{{${k}}}`).join(String(v));
  return s;
}

/** Name of a payment method on a bill. */
export const methodWord = (lang: ReceiptLang, method: string) =>
  (method in roman ? rw(lang, method as ReceiptWord) : method);
