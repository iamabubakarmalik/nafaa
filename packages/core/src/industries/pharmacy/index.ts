/**
 * Pure pharmacy rules shared by web and mobile (mirror of the web pharmacy
 * lib/meta.ts): drug schedules, the narcotic register note written on a bill
 * line, CNIC input, expiry buckets and same-formula substitutes.
 */

export const SCHEDULE_CLASSES = ['OTC', 'SCHEDULE_G', 'SCHEDULE_H', 'SCHEDULE_X', 'CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC'] as const;
export type ScheduleClass = (typeof SCHEDULE_CLASSES)[number];

/** Classes that always go in the narcotic register. */
export const REGISTER_CLASSES: readonly string[] = ['CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC', 'SCHEDULE_X'];

export const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops', 'Cream', 'Ointment', 'Gel', 'Inhaler', 'Sachet', 'Suppository', 'Spray', 'Lotion'];
export const STRENGTHS = ['5mg', '10mg', '20mg', '50mg', '100mg', '250mg', '500mg', '1g', '125mg/5ml', '250mg/5ml'];

export interface RegisterFacts { isNarcotic?: boolean; scheduleClass?: string | null }

/** True when every sale of the medicine is written in the narcotic register. */
export const needsRegister = (m?: RegisterFacts | null): boolean => !!m && (!!m.isNarcotic || REGISTER_CLASSES.includes(String(m.scheduleClass)));

/** Patient and doctor written on a narcotic bill line. */
export interface RxDetails { doctorName: string; doctorRegNumber: string; patientName: string; patientCnic: string }

/** "Dr. Ahmed" whether or not the saved name already starts with "Dr". */
export const drName = (name?: string | null): string => (name ? `Dr. ${name.trim().replace(/^dr\.?\s+/i, '')}` : '');

/** Line note the narcotic register reads back: "Rx · Dr. Ahmed (PMDC 12345) · Mareez: Ali (CNIC 35202-...)". */
export function rxNote(d: RxDetails): string {
  const dr = `${drName(d.doctorName)}${d.doctorRegNumber.trim() ? ` (PMDC ${d.doctorRegNumber.trim()})` : ''}`;
  const pt = `Mareez: ${d.patientName.trim()}${d.patientCnic.trim() ? ` (CNIC ${d.patientCnic.trim()})` : ''}`;
  return `Rx · ${dr} · ${pt}`;
}

/** Reads `rxNote` back from a cart line's note. */
export function parseRxNote(note?: string | null): RxDetails | null {
  if (!note) return null;
  const dr = /Dr\. ([^(·•]+?)\s*(?:\(PMDC ([^)]+)\))?\s*(?=[·•]|$)/.exec(note);
  const pt = /Mareez: ([^(·•]+?)\s*(?:\(CNIC ([^)]+)\))?\s*(?=[·•]|$)/.exec(note);
  if (!dr || !pt) return null;
  return { doctorName: dr[1].trim(), doctorRegNumber: dr[2]?.trim() ?? '', patientName: pt[1].trim(), patientCnic: pt[2]?.trim() ?? '' };
}

/** 13-digit CNIC as 35202-1234567-1 while typing. */
export function formatCnic(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export const cnicOk = (v: string): boolean => !v || v.replace(/\D/g, '').length === 13;

/** Doses a day from "1-0-1" (2) or "1-1-1" (3); 0 when unknown (SOS). */
export const dosesPerDay = (f: string): number => (/^\d(-\d)+$/.test(f) ? f.split('-').reduce((s, x) => s + Number(x), 0) : 0);

/** Days from "7 din" or "1 mahina" (30 days each); 0 when unknown. */
export function courseDays(d: string): number {
  const n = parseInt(d, 10);
  return Number.isFinite(n) ? (/mahina/.test(d) ? n * 30 : n) : 0;
}

/** Quantity from dose x days; '' when either is unknown. */
export function suggestQty(frequency: string, duration: string): string {
  const n = dosesPerDay(frequency) * courseDays(duration);
  return n > 0 ? String(n) : '';
}

export type ExpiryBucketKey = 'expired' | 'd7' | 'd30' | 'd90' | 'later';

/** Whole days from now to an expiry date (negative once past). */
export function daysLeft(expiry: string | Date, now: number = Date.now()): number {
  return Math.ceil((new Date(expiry).getTime() - now) / 86_400_000);
}

export function expiryBucket(days: number): ExpiryBucketKey {
  if (days <= 0) return 'expired';
  if (days <= 7) return 'd7';
  if (days <= 30) return 'd30';
  if (days <= 90) return 'd90';
  return 'later';
}

export interface ExpiringBatchLike { quantity: number; costPrice?: number | null; expiryDate: string }

/** Expired, within a week, within a month, and the cost value at risk (expired + 30 days). */
export function expirySummary<T extends ExpiringBatchLike>(batches: T[], now: number = Date.now()) {
  const rows = batches
    .filter((b) => b.expiryDate && Number(b.quantity) > 0)
    .map((b) => ({ ...b, daysLeft: daysLeft(b.expiryDate, now), value: Number(b.quantity || 0) * Number(b.costPrice || 0) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const sum = (l: typeof rows) => l.reduce((s, r) => s + r.value, 0);
  const expired = rows.filter((r) => r.daysLeft <= 0);
  const week = rows.filter((r) => r.daysLeft > 0 && r.daysLeft <= 7);
  const month = rows.filter((r) => r.daysLeft > 0 && r.daysLeft <= 30);
  return { rows, expired, week, month, watch: rows.length - expired.length, expiredValue: sum(expired), atRiskValue: sum(expired) + sum(month) };
}

export interface SubstituteLike { id: string; price: number; stock: number; salts?: string }

/** Key that is equal for two medicines with exactly the same salts. */
export const saltKey = (saltIds: string[]): string => [...saltIds].sort().join('|');

/** Shelf items with exactly the same salts as `item`, cheapest first. */
export function substitutesFor<T extends SubstituteLike>(item: SubstituteLike, all: T[]): T[] {
  if (!item.salts) return [];
  return all.filter((o) => o.id !== item.id && o.salts === item.salts && o.stock > 0).sort((a, b) => a.price - b.price);
}

/** Temperature outside a limit pair (either side may be missing). */
export function outOfRange(temp: number, min?: number | null, max?: number | null): boolean {
  return Number.isFinite(temp) && ((min != null && temp < min) || (max != null && temp > max));
}

/** Medicine with the generic name built from salts: "Paracetamol 500mg + Caffeine 65mg". */
export const genericName = (salts: Array<{ name: string; strength?: string }>): string =>
  salts.map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ');
