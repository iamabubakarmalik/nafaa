/** Shared helpers for pack receipt rows and sales chips: read a bill from either copy and pick words by bill language. */

import type { ReceiptIndustryContext, ReceiptLang } from '@/core/receipt';

export interface BillView {
  saleId: string;
  saleNumber: string;
  customerId: string | null;
  note: string | null;
  items: Array<{ productId: string | null; name: string; quantity: number; note?: string | null }>;
}

/** The bill behind a receipt, whether built from the server copy or the phone's copy. */
export function billOf(ctx: ReceiptIndustryContext): BillView | null {
  const s = ctx.sale;
  if (s) {
    return {
      saleId: String(s.id ?? ''), saleNumber: String(s.saleNumber ?? ''), customerId: (s.customerId ?? s.customer?.id ?? null) as string | null, note: (s.note ?? null) as string | null,
      items: (Array.isArray(s.items) ? s.items : []).map((i: any) => ({ productId: i.productId ?? null, name: String(i.product?.name ?? i.name ?? ''), quantity: Number(i.quantity ?? 0), note: i.note ?? null })),
    };
  }
  const r = ctx.row;
  if (!r) return null;
  return { saleId: r.id, saleNumber: r.saleNumber, customerId: r.customerId, note: r.note ?? null, items: r.items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity })) };
}

/** One word in the bill's language: English, Urdu or Roman Urdu (defaults to English). */
export const word = (lang: ReceiptLang, en: string, ur: string, roman: string = en) => (lang === 'ur' ? ur : lang === 'en' ? en : roman);

/** "12 Nov 2026" for receipt rows; the date part of an ISO string is shown as written. */
export function shortDate(iso: string | null | undefined, lang: ReceiptLang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' });
}
