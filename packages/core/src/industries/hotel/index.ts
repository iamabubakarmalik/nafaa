/** Pure rules of the hotel pack (shared by web and mobile): night counts, stay quote, folio and balance. Dates are `yyyy-mm-dd` keys. */

export const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86_400_000;
const toUtc = (k: string) => Date.parse(`${k.slice(0, 10)}T00:00:00Z`);
export const addDaysKey = (key: string, days: number) => new Date(toUtc(key) + days * DAY).toISOString().slice(0, 10);

/** Nights between check-in and check-out day (check-out day is not a night). */
export const nightsBetween = (checkIn: string, checkOut: string) => Math.round((toUtc(checkOut) - toUtc(checkIn)) / DAY);

/** Friday and Saturday nights use the weekend rate (same as the server). */
const WEEKEND_NIGHTS = [5, 6];
export interface RoomRates { basePrice: number; weekendPrice?: number | null }

/** Nightly rates of a stay: the room's own price or the type's base, weekend rate on Friday/Saturday. */
export function nightRates(rt: RoomRates, checkIn: string, nights: number, roomPrice?: number | null): Array<{ date: string; rate: number }> {
  const out: Array<{ date: string; rate: number }> = [];
  for (let i = 0; i < nights; i++) {
    const date = addDaysKey(checkIn, i);
    const dow = new Date(toUtc(date)).getUTCDay();
    let rate = Number(roomPrice) > 0 ? Number(roomPrice) : rt.basePrice;
    if (WEEKEND_NIGHTS.includes(dow) && Number(rt.weekendPrice) > 0) rate = Number(rt.weekendPrice);
    out.push({ date, rate: round2(Math.max(rate, 0)) });
  }
  return out;
}

export const stayTotal = (rates: Array<{ rate: number }>, extraBeds = 0, extraBedPrice = 0, nights = rates.length) =>
  round2(rates.reduce((s, r) => s + r.rate, 0) + extraBeds * extraBedPrice * nights);

export interface FolioCharge { amount: number; isVoid?: boolean }
/** What the guest owes at check-out: room, tax, live folio charges, less discount and what was paid. */
export function folioTotals(input: { roomAmount: number; taxAmount?: number; discount?: number; charges?: FolioCharge[]; paid?: number }) {
  const folio = round2((input.charges ?? []).filter((c) => !c.isVoid).reduce((s, c) => s + Number(c.amount || 0), 0));
  const total = round2(Math.max(input.roomAmount + (input.taxAmount ?? 0) + folio - (input.discount ?? 0), 0));
  return { folio, total, balance: round2(Math.max(total - (input.paid ?? 0), 0)), overpaid: round2(Math.max((input.paid ?? 0) - total, 0)) };
}

/** Late check-out: the day count the guest stayed against the nights booked (extra nights bill at the same rate). */
export const extraNights = (booked: number, actual: number) => Math.max(actual - booked, 0);

export type BookingStep = 'check-in' | 'check-out' | null;
export function bookingNext(status: string): BookingStep {
  if (status === 'CONFIRMED' || status === 'PENDING') return 'check-in';
  if (status === 'CHECKED_IN') return 'check-out';
  return null;
}
