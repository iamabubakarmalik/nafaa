/**
 * The few words a bill prints itself (change, credit, savings, thanks). They
 * follow the shop's bill language (Settings → Language & time → Bill
 * language), not the cashier's screen language, so one shop always prints the
 * same bill. English shops get English; Roman Urdu and Urdu shops keep the
 * Roman Urdu wording they have always printed. A setup saved before the
 * language was sent (no `shop.language`) prints as before.
 */

import { normalizeLocale } from '@core/i18n/locales';
import type { ReceiptSetup } from './types';

/** The default thank-you line stored in new receipt designs. */
export const DEFAULT_THANKS = 'Shukriya! Phir tashreef laiye.';

export interface ReceiptWords {
  change: string;
  due: string;
  saved: (amount: string) => string;
  credit: string;
  previousCredit: string;
  thisBill: string;
  totalCredit: string;
  payRider: string;
  customerPays: string;
  totalItems: string;
  totalQty: string;
}

const ROMAN: ReceiptWords = {
  change: 'Wapis (change)',
  due: 'Udhaar (baqi)',
  saved: (a) => `Aap ne ${a} bachaye`,
  credit: 'Khata',
  previousCredit: 'Pichla udhaar',
  thisBill: 'Is bill ka',
  totalCredit: 'Kul udhaar',
  payRider: 'Rider ko dein (delivery)',
  customerPays: 'Customer dega kul',
  totalItems: 'Kul cheezein',
  totalQty: 'Kul quantity',
};

const ENGLISH: ReceiptWords = {
  change: 'Change',
  due: 'Due',
  saved: (a) => `You saved ${a}`,
  credit: 'Credit',
  previousCredit: 'Previous credit',
  thisBill: 'This bill',
  totalCredit: 'Total credit',
  payRider: 'Pay the rider (delivery)',
  customerPays: 'Customer pays in total',
  totalItems: 'Total items',
  totalQty: 'Total quantity',
};

export const isEnglishBill = (setup: Pick<ReceiptSetup, 'shop'>) => normalizeLocale(setup.shop.language) === 'en';

export const receiptWords = (setup: Pick<ReceiptSetup, 'shop'>): ReceiptWords => (isEnglishBill(setup) ? ENGLISH : ROMAN);

/** The bill's thank-you line; the untouched default reads in English on an English bill. */
export function thanksLine(setup: ReceiptSetup): string {
  const t = setup.design.thanks;
  return t === DEFAULT_THANKS && isEnglishBill(setup) ? 'Thank you! Please visit again.' : t;
}
