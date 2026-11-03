/** Receipt rows for the delivery and installation jobs of a bill (words follow the bill language). */

import { formatDate, formatMoney } from '@/core/format';
import type { ReceiptLang, ReceiptRowDoc } from '@/core/receipt';
import { word } from '../../retail/lib/bill';
import { jobsOf } from './saleJobs';

const DONE = new Set(['DELIVERED', 'COMPLETED']);
const GONE = new Set(['CANCELLED', 'FAILED']);

function statusWord(lang: ReceiptLang, s: string): string {
  if (DONE.has(s)) return word(lang, 'Done', 'مکمل', 'Ho gaya');
  if (s === 'DISPATCHED' || s === 'EN_ROUTE' || s === 'IN_PROGRESS') return word(lang, 'On the way', 'راستے میں', 'Raaste me');
  return word(lang, 'Planned', 'طے شدہ', 'Tay hai');
}

export function jobRows(sale: Record<string, any> | null | undefined, lang: ReceiptLang): ReceiptRowDoc[] {
  return jobsOf(sale).filter((j) => !GONE.has(j.status)).map((j) => {
    const label = j.kind === 'delivery'
      ? j.fitting ? word(lang, 'Delivery + assembly', 'ڈیلیوری اور اسمبلی', 'Delivery + assembly') : word(lang, 'Delivery', 'ڈیلیوری', 'Delivery')
      : word(lang, 'Installation', 'انسٹالیشن', 'Installation');
    const value = [j.number, statusWord(lang, j.status), j.date ? formatDate(j.date) : '', j.charge ? formatMoney(j.charge) : ''].filter(Boolean).join(' · ');
    return { label, value };
  });
}
