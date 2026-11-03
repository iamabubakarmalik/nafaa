/**
 * Toy store rules shared by web and mobile: age groups and the age text,
 * cells that are not in the box, safety checks, gift pack money and when a
 * pack is on the counter, birthday timing and the parent messages. No text
 * for users except the three-language messages; screens map keys to words.
 */

import type { MessageLang } from '../../customers/messages';

/* ───────────── age ───────────── */

export const AGE_GROUPS = [
  'NEWBORN_0_6M', 'INFANT_6_12M', 'TODDLER_1_2Y', 'TODDLER_2_3Y', 'PRESCHOOL_3_5Y', 'KIDS_5_8Y', 'KIDS_8_12Y', 'TWEEN_12_14Y', 'TEEN_14_PLUS', 'ALL_AGES',
] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export interface AgeFacts { ageGroup?: string | null; ageGroups?: string[] | null; ageMinYears?: number | null; ageMaxYears?: number | null }

/** The age shape of a toy: a written range, a minimum, or its age group. */
export type AgeShape = { kind: 'range'; min: number; max: number } | { kind: 'min'; min: number } | { kind: 'group'; group: string } | { kind: 'none' };

export function ageShape(f?: AgeFacts | null): AgeShape {
  if (!f) return { kind: 'none' };
  if (f.ageMinYears != null && f.ageMaxYears != null) return { kind: 'range', min: f.ageMinYears, max: f.ageMaxYears };
  if (f.ageMinYears != null) return { kind: 'min', min: f.ageMinYears };
  return f.ageGroup ? { kind: 'group', group: f.ageGroup } : { kind: 'none' };
}

/** Every age group a toy fits (its main group first), for shelf filters. */
export const agesOf = (f?: AgeFacts | null): string[] => (f ? [...new Set([f.ageGroup, ...(f.ageGroups ?? [])].filter((x): x is string => !!x))] : []);

/** Whether a toy fits a child of this age group (all-ages toys fit everyone). */
export const fitsAge = (f: AgeFacts | null | undefined, group: string): boolean => agesOf(f).some((a) => a === group || a === 'ALL_AGES');

/** The age group that a child's age in years falls in. */
export function groupOfYears(years: number): AgeGroup {
  if (years < 0.5) return 'NEWBORN_0_6M';
  if (years < 1) return 'INFANT_6_12M';
  if (years < 2) return 'TODDLER_1_2Y';
  if (years < 3) return 'TODDLER_2_3Y';
  if (years < 5) return 'PRESCHOOL_3_5Y';
  if (years < 8) return 'KIDS_5_8Y';
  if (years < 12) return 'KIDS_8_12Y';
  if (years < 14) return 'TWEEN_12_14Y';
  return 'TEEN_14_PLUS';
}

/* ───────────── cells ───────────── */

export interface CellFacts { requiresBatteries?: boolean | null; batteriesIncluded?: boolean | null; batteryType?: string | null; batteryQuantity?: number | null }

/** Cells the toy needs that are not in the box, e.g. "2 x AA"; null when none are needed. */
export function cellsNeeded(f?: CellFacts | null, fallbackName = 'cell'): string | null {
  if (!f?.requiresBatteries || f.batteriesIncluded) return null;
  return [f.batteryQuantity ? `${f.batteryQuantity} x` : null, f.batteryType || fallbackName].filter(Boolean).join(' ');
}

/* ───────────── editor checks ───────────── */

export interface ToySpecs { ageMinYears?: number | null; ageMaxYears?: number | null; requiresBatteries?: boolean; batteryQuantity?: number | null; mrp?: number | null; price?: number; chokingHazard?: boolean }

export type ToyErrorKey = 'ageNegative' | 'ageOrder' | 'cells' | 'mrp';

export function toyErrors(x: ToySpecs): Partial<Record<'age' | 'cells' | 'mrp', ToyErrorKey>> {
  const e: Partial<Record<'age' | 'cells' | 'mrp', ToyErrorKey>> = {};
  if ((x.ageMinYears ?? 0) < 0 || (x.ageMaxYears ?? 0) < 0) e.age = 'ageNegative';
  else if (x.ageMinYears != null && x.ageMaxYears != null && x.ageMaxYears < x.ageMinYears) e.age = 'ageOrder';
  if (x.requiresBatteries && x.batteryQuantity != null && x.batteryQuantity < 1) e.cells = 'cells';
  if (x.mrp != null && x.mrp > 0 && x.price != null && x.mrp < x.price) e.mrp = 'mrp';
  return e;
}

/** Small parts on a toy for a child under three: a wrong age or a missing mark. */
export const youngWithSmallParts = (x: Pick<ToySpecs, 'ageMinYears' | 'chokingHazard'>) => x.ageMinYears != null && x.ageMinYears < 3 && !!x.chokingHazard;

/* ───────────── gift packs ───────────── */

export interface PackLine { productId: string; variantId?: string | null; quantity: number; unitPrice: number; stock?: number | null }
export interface PackFacts {
  isActive: boolean; validFrom?: string | null; validUntil?: string | null; items: Array<{ quantity: number; product?: { stock?: number | null } | null }>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What the toys cost separately, and what the pack saves against that. */
export function packMoney(lines: Array<Pick<PackLine, 'quantity' | 'unitPrice'>>, price: number) {
  const original = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const savings = Math.max(round2(original - price), 0);
  return { original, savings, pct: original > 0 ? Math.round((savings / original) * 1000) / 10 : 0, dearer: original > 0 && price > original };
}

/** Whole packs the shelf can make from stock now. */
export function buildable(items: Array<{ quantity: number; stock?: number | null }>): number {
  const per = items.map((i) => (i.quantity > 0 ? Math.floor(Number(i.stock ?? 0) / i.quantity) : 0));
  return per.length ? Math.max(Math.min(...per), 0) : 0;
}

/** On the counter now: switched on and inside its dates. */
export function isLive(p: Pick<PackFacts, 'isActive' | 'validFrom' | 'validUntil'>, now = Date.now()): boolean {
  return p.isActive && (!p.validFrom || new Date(p.validFrom).getTime() <= now) && (!p.validUntil || new Date(p.validUntil).getTime() >= now);
}

export type PackProblem = 'name' | 'twoToys' | 'qty' | 'variant' | 'price' | 'dates';

/** Why a gift pack cannot be saved yet, in the order the form shows them. */
export function packProblems(d: { name: string; price: number; validFrom?: string; validUntil?: string; lines: Array<{ quantity: number; hasVariants?: boolean; variantId?: string }> }): PackProblem[] {
  const out: PackProblem[] = [];
  if (!d.name.trim()) out.push('name');
  if (d.lines.length < 2) out.push('twoToys');
  if (d.lines.some((l) => !(l.quantity >= 1) || !Number.isInteger(l.quantity))) out.push('qty');
  if (d.lines.some((l) => l.hasVariants && !l.variantId)) out.push('variant');
  if (!(d.price > 0)) out.push('price');
  if (d.validFrom && d.validUntil && d.validUntil < d.validFrom) out.push('dates');
  return out;
}

/* ───────────── birthdays ───────────── */

export interface BirthdayFacts { isActive: boolean; reminderDaysBefore: number; lastReminderSent?: string | null; computed?: { daysUntilBirthday?: number } }

export const daysToBirthday = (r: BirthdayFacts) => r.computed?.daysUntilBirthday ?? 999;

/** Due for a message: inside its reminder window and not messaged in the last 30 days. */
export function reminderDue(r: BirthdayFacts, now = Date.now()): boolean {
  return r.isActive && daysToBirthday(r) <= r.reminderDaysBefore && (!r.lastReminderSent || now - new Date(r.lastReminderSent).getTime() > 30 * 86_400_000);
}

export type BirthdayProblem = 'child' | 'date' | 'future' | 'parent' | 'phone' | 'days';

export function birthdayProblem(d: { childName: string; birthDate: string; parentName: string; phone: string; reminderDays: number }, today: string): BirthdayProblem | null {
  if (!d.childName.trim()) return 'child';
  if (!d.birthDate) return 'date';
  if (d.birthDate > today) return 'future';
  if (!d.parentName.trim()) return 'parent';
  if (d.phone.replace(/\D/g, '').length < 10) return 'phone';
  if (!(d.reminderDays >= 0 && d.reminderDays <= 60)) return 'days';
  return null;
}

/** WhatsApp text for the parent before the birthday, in the shop's bill language. */
export function birthdayMessage(o: { parent: string; child: string; days: number; turningAge: number | string; shop?: string }, lang: MessageLang): string {
  const when = ({
    en: o.days === 0 ? 'today' : o.days === 1 ? 'tomorrow' : `in ${o.days} days`,
    ur: o.days === 0 ? 'آج' : o.days === 1 ? 'کل' : `${o.days} دن بعد`,
    roman: o.days === 0 ? 'aaj' : o.days === 1 ? 'kal' : `${o.days} din baad`,
  })[lang];
  const at = o.shop ? ({ en: ` at ${o.shop}`, ur: ` ${o.shop} پر`, roman: ` ${o.shop} par` })[lang] : '';
  return ({
    en: `Hello ${o.parent}! ${o.child}'s birthday is ${when} — turning ${o.turningAge}. New toys and gift packs for their age have arrived${at}. Gift wrapping is available too.`,
    ur: `السلام علیکم ${o.parent}! ${o.child} کی سالگرہ ${when} ہے — ${o.turningAge} سال کے ہو رہے ہیں۔ ان کی عمر کے نئے کھلونے اور گفٹ پیک${at} آ گئے ہیں۔ گفٹ ریپ بھی ہوتا ہے۔`,
    roman: `Assalam o Alaikum ${o.parent}! ${o.child} ki saalgirah ${when} hai — ${o.turningAge} saal ke ho rahe hain. Un ki umar ke naye khilone aur gift packs${at} aa gaye hain. Gift wrap bhi hota hai.`,
  })[lang];
}

/** SKU of the shop's gift wrapping service line. */
export const GIFT_WRAP_SKU = 'TOY-GIFT-WRAP';
