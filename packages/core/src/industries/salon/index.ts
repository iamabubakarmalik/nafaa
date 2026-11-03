/** Pure rules of the salon pack (shared by web and mobile): bill math with membership, package sessions, voucher and tip, and membership dates. */

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BillServiceLine { list: number; /** Agreed price typed at the counter; null = list (or member) price. */ price: number | null; fromPackage: boolean }

/** Price of one service line: free when a package session pays for it, else the agreed price, else the member price. */
export function serviceLineTotal(line: BillServiceLine, memberPct = 0): number {
  if (line.fromPackage) return 0;
  const member = memberPct > 0 ? round2(line.list * (1 - memberPct / 100)) : line.list;
  return line.price ?? member;
}

export interface SalonTotals { services: number; products: number; memberSaved: number; packageCovered: number; total: number; due: number }

/** Totals of a salon bill. Advance paid on the appointment is taken out of what is due. */
export function salonBillTotals(input: {
  services: BillServiceLine[]; products?: Array<{ price: number; quantity: number }>; memberPct?: number; discount?: number; tip?: number; voucher?: number; advance?: number;
}): SalonTotals {
  const pct = input.memberPct ?? 0;
  const services = round2(input.services.reduce((s, l) => s + serviceLineTotal(l, pct), 0));
  const products = round2((input.products ?? []).reduce((s, p) => s + p.price * p.quantity, 0));
  const memberSaved = round2(input.services.reduce((s, l) => s + (l.fromPackage ? 0 : l.list - (pct > 0 ? round2(l.list * (1 - pct / 100)) : l.list)), 0));
  const packageCovered = round2(input.services.reduce((s, l) => s + (l.fromPackage ? l.list : 0), 0));
  const total = round2(Math.max(services + products - (input.voucher ?? 0) + Math.max(input.tip ?? 0, 0) - Math.max(input.discount ?? 0, 0), 0));
  return { services, products, memberSaved, packageCovered, total, due: round2(Math.max(total - (input.advance ?? 0), 0)) };
}

/** Whole days from `today` to a date, both `yyyy-mm-dd` (negative: past). */
export function daysLeft(dateKey: string | null | undefined, todayKey: string): number | null {
  if (!dateKey) return null;
  return Math.round((Date.parse(`${dateKey.slice(0, 10)}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) / 86_400_000);
}

/** A membership that ends within this many days is shown as expiring. */
export const EXPIRING_DAYS = 15;

export type MembershipState = 'active' | 'expiring' | 'expired';
export function membershipState(endKey: string, todayKey: string): MembershipState {
  const left = daysLeft(endKey, todayKey) ?? 0;
  return left < 0 ? 'expired' : left <= EXPIRING_DAYS ? 'expiring' : 'active';
}

export type AppointmentStep = 'arrive' | 'start' | 'bill' | null;
/** The next button of an appointment. */
export function appointmentNext(status: string): AppointmentStep {
  if (status === 'CONFIRMED' || status === 'RESCHEDULED' || status === 'DRAFT') return 'arrive';
  if (status === 'ARRIVED') return 'start';
  if (status === 'IN_PROGRESS') return 'bill';
  return null;
}

/** Commission of one service line (percentage, fixed per service or both) as set on the stylist. */
export function commissionOf(total: number, rule: { type: string; pct?: number; fixed?: number }): number {
  if (rule.type === 'PERCENTAGE') return round2((total * (rule.pct ?? 0)) / 100);
  if (rule.type === 'FIXED_PER_SERVICE') return round2(rule.fixed ?? 0);
  if (rule.type === 'HYBRID') return round2((total * (rule.pct ?? 0)) / 100 + (rule.fixed ?? 0));
  return 0;
}
