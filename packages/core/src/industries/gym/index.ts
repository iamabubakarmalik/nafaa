/** Pure rules of the gym pack (shared by web and mobile): membership dates, renewal, freeze and member state. All dates are `yyyy-mm-dd` keys in shop time. */

const DAY = 86_400_000;
const toUtc = (k: string) => Date.parse(`${k.slice(0, 10)}T00:00:00Z`);
const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDaysKey = (key: string, days: number) => toKey(toUtc(key) + days * DAY);
export const daysBetween = (fromKey: string, toKey_: string) => Math.round((toUtc(toKey_) - toUtc(fromKey)) / DAY);

/** Last day of a plan: a 30-day plan from the 1st ends on the 30th. */
export function planEndKey(startKey: string, durationDays: number): string {
  return addDaysKey(startKey, Math.max(durationDays, 1) - 1);
}

/** A renewal starts the day after the running period ends, so early renewers lose no days; an ended one starts today. */
export function renewalStartKey(endKey: string, todayKey: string, running: boolean): string {
  return running && endKey >= todayKey ? addDaysKey(endKey, 1) : todayKey;
}

/** Days still to use at a given day (0 when over). */
export const daysRemaining = (endKey: string, todayKey: string) => Math.max(daysBetween(todayKey, endKey) + 1, 0);

/** Freeze days left on a plan after the ones already used. */
export const freezeLeft = (maxFreezeDays: number, usedDays: number) => Math.max(maxFreezeDays - usedDays, 0);

/** Freezing moves the end date by the same number of days. */
export const endAfterFreeze = (endKey: string, days: number) => addDaysKey(endKey, days);

export type MemberState = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' | 'UPCOMING' | 'PENDING' | 'NONE';
export const EXPIRING_DAYS = 7;

export function membershipState(m: { status: string; startDate: string; endDate: string } | null | undefined, todayKey: string): MemberState {
  if (!m) return 'NONE';
  if (m.status === 'PENDING_PAYMENT') return 'PENDING';
  if (m.status === 'FROZEN') return 'FROZEN';
  if (m.endDate.slice(0, 10) < todayKey) return 'EXPIRED';
  if (m.startDate.slice(0, 10) > todayKey) return 'UPCOMING';
  return daysBetween(todayKey, m.endDate) <= EXPIRING_DAYS ? 'EXPIRING' : 'ACTIVE';
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
/** Fee still to collect on a membership. */
export const balanceDue = (m: { totalPrice: number; paidAmount: number }) => Math.max(round2(m.totalPrice - m.paidAmount), 0);
