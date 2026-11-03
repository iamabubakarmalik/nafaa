/**
 * Optical rules shared by web and mobile: eye power formatting and checks
 * (same limits as the server), the glasses order flow, order money,
 * prescription expiry and product kinds. No text for users here; screens map
 * the keys to words.
 */

export interface Power {
  rightSph?: number | null; rightCyl?: number | null; rightAxis?: number | null; rightAdd?: number | null;
  leftSph?: number | null; leftCyl?: number | null; leftAxis?: number | null; leftAdd?: number | null;
  pupilDistance?: number | null;
}

export type PowerKey = keyof Power;
export const POWER_KEYS: PowerKey[] = ['rightSph', 'rightCyl', 'rightAxis', 'rightAdd', 'leftSph', 'leftCyl', 'leftAxis', 'leftAdd', 'pupilDistance'];

/** "+1.25", "-0.50"; zero is "Plano" (callers may translate it via `plano`). */
export const fmtPower = (v?: number | null, plano = 'Plano') => (v == null ? '—' : v === 0 ? plano : `${v > 0 ? '+' : ''}${v.toFixed(2)}`);

/** "-1.25 / -0.50 × 180 · ADD +2.00" for one eye; empty when nothing is written. */
export function eyeLine(p: Power, side: 'right' | 'left', plano = 'Plano'): string {
  const sph = p[`${side}Sph`];
  const cyl = p[`${side}Cyl`];
  const axis = p[`${side}Axis`];
  const add = p[`${side}Add`];
  if (sph == null && cyl == null && add == null) return '';
  let s = fmtPower(sph ?? 0, plano);
  if (cyl) s += ` / ${fmtPower(cyl, plano)}${axis != null ? ` × ${axis}` : ''}`;
  if (add) s += ` · ADD ${fmtPower(add, plano)}`;
  return s;
}

export function powerSummary(p: Power, plano = 'Plano'): string {
  const r = eyeLine(p, 'right', plano);
  const l = eyeLine(p, 'left', plano);
  return [r && `R ${r}`, l && `L ${l}`].filter(Boolean).join('  ·  ');
}

export type PowerErrorKey = 'sph' | 'cyl' | 'axis' | 'axisNeeded' | 'add' | 'pd';
const quarter = (v: number) => Math.abs(v * 4 - Math.round(v * 4)) < 1e-6;

/** Same checks as the server: SPH ±30 and CYL ±10 in 0.25 steps, AXIS 0-180 (needed with CYL), ADD 0.50-4.00, PD 40-80. */
export function powerErrors(p: Power): Partial<Record<PowerKey, PowerErrorKey>> {
  const e: Partial<Record<PowerKey, PowerErrorKey>> = {};
  for (const side of ['right', 'left'] as const) {
    const sph = p[`${side}Sph`];
    const cyl = p[`${side}Cyl`];
    const axis = p[`${side}Axis`];
    const add = p[`${side}Add`];
    if (sph != null && (sph < -30 || sph > 30 || !quarter(sph))) e[`${side}Sph`] = 'sph';
    if (cyl != null && (cyl < -10 || cyl > 10 || !quarter(cyl))) e[`${side}Cyl`] = 'cyl';
    if (axis != null && (!Number.isInteger(axis) || axis < 0 || axis > 180)) e[`${side}Axis`] = 'axis';
    else if (cyl && axis == null) e[`${side}Axis`] = 'axisNeeded';
    if (add && (add < 0.5 || add > 4 || !quarter(add))) e[`${side}Add`] = 'add';
  }
  if (p.pupilDistance != null && (p.pupilDistance < 40 || p.pupilDistance > 80)) e.pupilDistance = 'pd';
  return e;
}

/* ───────────── power entry (typed strings) ───────────── */

export type PowerDraft = Record<PowerKey, string>;
export const emptyPower = (): PowerDraft => ({ rightSph: '', rightCyl: '', rightAxis: '', rightAdd: '', leftSph: '', leftCyl: '', leftAxis: '', leftAdd: '', pupilDistance: '' });

export function powerDraftOf(p?: Power | null): PowerDraft {
  const out = emptyPower();
  if (!p) return out;
  for (const k of POWER_KEYS) if (p[k] != null) out[k] = String(p[k]);
  return out;
}

/** Typed strings to numbers; empty fields stay out and axis is whole degrees. */
export function powerOf(d: PowerDraft): Power {
  const out: Power = {};
  for (const k of POWER_KEYS) {
    const v = d[k].trim();
    if (v === '' || v === '-' || v === '+') continue;
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = k.endsWith('Axis') ? Math.round(n) : n;
  }
  return out;
}

/** Keeps only what a power field accepts: digits, one dot and a leading sign (axis and PD take no sign). */
export function cleanPowerInput(key: PowerKey, v: string): string {
  if (key.endsWith('Axis') || key === 'pupilDistance') return v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  return v.replace(/[^\d.+-]/g, '').replace(/(?!^)[+-]/g, '').replace(/(\..*)\./g, '$1');
}

/* ───────────── glasses and repair orders ───────────── */

export const REPAIR = 'REPAIR';

export type LensOrderStatus = 'ORDERED' | 'SENT_TO_LAB' | 'AT_LAB' | 'RECEIVED' | 'QC_PASSED' | 'FITTED' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type OrderStepKey = 'toLab' | 'repaired' | 'fromLab' | 'fitted';

export const isOrderClosed = (s?: string | null) => s === 'DELIVERED' || s === 'CANCELLED';
export const isOrderReady = (s?: string | null) => s === 'FITTED' || s === 'READY';

/** Next desk step of an order: the status to move to and which button it is. */
export function nextOrderStep(status: string, repair: boolean): { to: LensOrderStatus; step: OrderStepKey } | null {
  switch (status) {
    case 'ORDERED': return repair ? { to: 'READY', step: 'repaired' } : { to: 'SENT_TO_LAB', step: 'toLab' };
    case 'SENT_TO_LAB': case 'AT_LAB': return { to: 'RECEIVED', step: 'fromLab' };
    case 'RECEIVED': case 'QC_PASSED': return { to: 'READY', step: 'fitted' };
    default: return null;
  }
}

/** Progress bar stages of an order (repairs skip the lab). */
export type StageKey = 'order' | 'lab' | 'received' | 'ready' | 'delivered';
const DONE: Record<StageKey, (s: string) => boolean> = {
  order: () => true,
  lab: (s) => s !== 'ORDERED',
  received: (s) => ['RECEIVED', 'QC_PASSED', 'FITTED', 'READY', 'DELIVERED'].includes(s),
  ready: (s) => ['FITTED', 'READY', 'DELIVERED'].includes(s),
  delivered: (s) => s === 'DELIVERED',
};
export function orderStages(status: string, repair: boolean): Array<{ key: StageKey; done: boolean }> {
  const keys: StageKey[] = repair ? ['order', 'ready', 'delivered'] : ['order', 'lab', 'received', 'ready', 'delivered'];
  return keys.map((key) => ({ key, done: DONE[key](status) }));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Order money: frame (none when the customer brings theirs), lens or repair charge, fitting. */
export function orderTotal(o: { framePrice?: number; lensPrice?: number; fittingCharge?: number; ownFrame?: boolean }): number {
  return round2((o.ownFrame ? 0 : o.framePrice ?? 0) + (o.lensPrice ?? 0) + (o.fittingCharge ?? 0));
}

/** Money left on delivery after what the customer pays now; the rest goes on khata. */
export function deliveryLeft(due: number, paying: number): number {
  return Math.max(round2(due - paying), 0);
}

/** Advance chips: half and full of the total, rounded to whole rupees. */
export const advanceChips = (total: number): number[] => (total > 0 ? [Math.round(total / 2), Math.round(total)] : []);

/** Lab cost above the lens price is probably a typing slip. */
export const labCostLooksWrong = (lensCost: number, lensPrice: number) => lensCost > 0 && lensPrice > 0 && lensCost > lensPrice;

/* ───────────── dates ───────────── */

const DAY = 86_400_000;

/** Whole days from `now` to `d` (negative when past), by calendar day in the given UTC offset. */
export function daysFrom(d?: string | Date | null, now: Date = new Date(), offsetMinutes = 300): number | null {
  if (!d) return null;
  const day = (x: Date) => Math.floor((x.getTime() + offsetMinutes * 60_000) / DAY);
  return day(new Date(d)) - day(now);
}

export type RxState = 'inactive' | 'expired' | 'soon' | 'ok' | 'open';

/** A prescription is "soon" in its last 60 days (a reason to call the customer for a new test). */
export function rxState(rx: { isActive: boolean; expiryDate?: string | null }, now: Date = new Date()): { state: RxState; days: number | null } {
  if (!rx.isActive) return { state: 'inactive', days: null };
  const days = daysFrom(rx.expiryDate, now);
  if (days == null) return { state: 'open', days };
  return { state: days < 0 ? 'expired' : days <= 60 ? 'soon' : 'ok', days };
}

export const plusYear = (ymd: string): string => {
  const [y, m, d] = ymd.split('-').map(Number);
  const x = new Date(Date.UTC(y + 1, m - 1, d));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
};

/* ───────────── products ───────────── */

export type OpticalCategoryType =
  | 'FRAME_FULL_RIM' | 'FRAME_HALF_RIM' | 'FRAME_RIMLESS' | 'FRAME_SPORTS' | 'FRAME_KIDS' | 'FRAME_READING'
  | 'SUNGLASSES' | 'SUNGLASSES_POLARIZED' | 'SUNGLASSES_KIDS'
  | 'LENS_SINGLE_VISION' | 'LENS_BIFOCAL' | 'LENS_PROGRESSIVE' | 'LENS_PHOTOCHROMIC' | 'LENS_BLUE_CUT' | 'LENS_ANTI_GLARE' | 'LENS_CYLINDRICAL' | 'LENS_SPHERICAL'
  | 'CONTACT_LENS_MONTHLY' | 'CONTACT_LENS_DAILY' | 'CONTACT_LENS_YEARLY' | 'CONTACT_LENS_COLORED' | 'CONTACT_LENS_TORIC' | 'CONTACT_LENS_MULTIFOCAL'
  | 'CLEANING_SOLUTION' | 'LENS_CASE' | 'ACCESSORY' | 'OTHER';

export type OpticalKind = 'frame' | 'sun' | 'lens' | 'contact' | 'care' | 'other';

export const KIND_TYPES: Record<OpticalKind, OpticalCategoryType[]> = {
  frame: ['FRAME_FULL_RIM', 'FRAME_HALF_RIM', 'FRAME_RIMLESS', 'FRAME_SPORTS', 'FRAME_KIDS', 'FRAME_READING'],
  sun: ['SUNGLASSES', 'SUNGLASSES_POLARIZED', 'SUNGLASSES_KIDS'],
  lens: ['LENS_SINGLE_VISION', 'LENS_BIFOCAL', 'LENS_PROGRESSIVE', 'LENS_PHOTOCHROMIC', 'LENS_BLUE_CUT', 'LENS_ANTI_GLARE', 'LENS_CYLINDRICAL', 'LENS_SPHERICAL'],
  contact: ['CONTACT_LENS_MONTHLY', 'CONTACT_LENS_DAILY', 'CONTACT_LENS_YEARLY', 'CONTACT_LENS_COLORED', 'CONTACT_LENS_TORIC', 'CONTACT_LENS_MULTIFOCAL'],
  care: ['CLEANING_SOLUTION', 'LENS_CASE', 'ACCESSORY'],
  other: ['OTHER'],
};
export const KIND_ORDER: OpticalKind[] = ['frame', 'sun', 'lens', 'contact', 'care', 'other'];

export const kindOf = (t?: OpticalCategoryType | null): OpticalKind | null =>
  t ? KIND_ORDER.find((k) => KIND_TYPES[k].includes(t)) ?? 'other' : null;

/** Frame size as printed on the temple: "52-18-145". */
export const frameSize = (w?: number | null, bridge?: number | null, temple?: number | null) => (w ? [w, bridge, temple].filter(Boolean).join('-') : '');

export interface OpticalSpecs {
  frameSizeMm?: number | null; bridgeSizeMm?: number | null; templeLengthMm?: number | null;
  supportsMinSph?: number | null; supportsMaxSph?: number | null; warrantyMonths?: number | null;
}

/** Product spec checks as the editor shows them; keys are messages the screen translates. */
export function specErrors(x: OpticalSpecs): Partial<Record<'size' | 'range', 'frameSize' | 'warranty' | 'sphRange'>> {
  const e: Partial<Record<'size' | 'range', 'frameSize' | 'warranty' | 'sphRange'>> = {};
  const bad = (v: number | null | undefined, lo: number, hi: number) => v != null && (v < lo || v > hi);
  if (bad(x.frameSizeMm, 30, 80) || bad(x.bridgeSizeMm, 10, 30) || bad(x.templeLengthMm, 100, 160)) e.size = 'frameSize';
  else if (bad(x.warrantyMonths, 0, 60)) e.size = 'warranty';
  if (x.supportsMinSph != null && x.supportsMaxSph != null && x.supportsMinSph > x.supportsMaxSph) e.range = 'sphRange';
  return e;
}

export * from './messages';
