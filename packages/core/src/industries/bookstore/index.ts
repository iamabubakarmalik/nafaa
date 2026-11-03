/** Pure rules of the bookstore pack (shared by web and mobile): ISBN, school sessions, school-set pricing and rentals. */

export const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86_400_000;

/** Digits and a trailing X only. */
export const isbnDigits = (v: string) => v.replace(/[^\dXx]/g, '').toUpperCase();

/** ISBN-13 or ISBN-10 check digit. */
export function isbnValid(v: string): boolean {
  const s = isbnDigits(v);
  if (s.length === 13 && /^\d{13}$/.test(s)) return s.split('').reduce((t, c, i) => t + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0;
  if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) return s.split('').reduce((t, c, i) => t + (c === 'X' ? 10 : Number(c)) * (10 - i), 0) % 11 === 0;
  return false;
}

/** Current school session, e.g. "2026-2027" (sessions start in spring). */
export function currentSession(now = new Date()): string {
  const y = now.getFullYear();
  return now.getMonth() >= 2 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** Session after "2026-2027" is "2027-2028". */
export function nextSession(s: string, now = new Date()): string {
  const m = /^(\d{4})\s*-\s*(\d{2,4})$/.exec(s.trim());
  return m ? `${Number(m[1]) + 1}-${Number(m[1]) + 2}` : currentSession(now);
}

export interface ListLine { productId?: string | null; quantity: number; unitPrice: number; total?: number; isOptional?: boolean }

/** Rate of one piece of a list line, after the list's discount. */
export function lineRate(l: { total: number; quantity: number }, discountPct: number): number {
  return round2((l.total / Math.max(l.quantity, 1)) * (1 - (discountPct || 0) / 100));
}

/** Set price of a draft list: a fixed price wins, else the required lines less the list discount. */
export function draftPrice(lines: ListLine[], discountPct: number, bundlePrice: number | null): number {
  if (bundlePrice != null) return bundlePrice;
  const sum = lines.filter((l) => !l.isOptional).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return round2(sum * (1 - (discountPct || 0) / 100));
}

/** Price of a school set at the counter: the list's own price when every required line is in the catalog. */
export function setPrice(items: Array<{ productId: string | null; isOptional: boolean; quantity: number; total: number }>, bundlePrice: number | null, discountPct: number): number {
  const required = items.filter((i) => !i.isOptional);
  if (required.every((i) => i.productId) && bundlePrice != null) return bundlePrice;
  return round2(required.filter((i) => i.productId).reduce((s, i) => s + lineRate(i, discountPct) * i.quantity, 0));
}

/** Whole days a rental is past its due date (0 when on time). */
export const lateDays = (dueDate: string, now = Date.now()) => Math.max(Math.floor((now - new Date(dueDate).getTime()) / DAY), 0);

/** Fine a late rental has built up. */
export const rentalFine = (dueDate: string, finePerDay: number, quantity = 1, now = Date.now()) => lateDays(dueDate, now) * finePerDay * quantity;

/** What a customer pays and gets back when a rental returns: the fine comes out of the deposit. */
export function returnSettlement(deposit: number, fine: number, waive: boolean): { fine: number; refund: number; extra: number } {
  const f = waive ? 0 : fine;
  return { fine: f, refund: Math.max(round2(deposit - f), 0), extra: Math.max(round2(f - deposit), 0) };
}

/** Rental price for a number of weeks from the weekly rate. */
export const rentalPrice = (perWeek: number, weeks: number) => perWeek * Math.max(Math.floor(weeks) || 1, 1);

export const isOutRental = (status: string) => status === 'ACTIVE' || status === 'OVERDUE';
