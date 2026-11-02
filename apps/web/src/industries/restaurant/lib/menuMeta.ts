/** Labels shared by the menu, add-on and happy-hour screens. */

import { formatTime } from '@core/lib/format';
import type { DietaryTag, SpiceLevel } from '../api/menu-items.api';
import type { ModifierType } from '../api/modifiers.api';
import type { OrderMode } from '../api/happy-hours.api';
import { t as tr } from '@core/i18n';

export const SPICE: Array<{ value: SpiceLevel; label: string; chillies: string }> = [
  { value: 'NONE', label: tr('Teekha nahi'), chillies: '' },
  { value: 'MILD', label: tr('Halka'), chillies: '🌶️' },
  { value: 'MEDIUM', label: tr('Darmiyana'), chillies: '🌶️🌶️' },
  { value: 'HOT', label: tr('Teekha'), chillies: '🌶️🌶️🌶️' },
  { value: 'EXTRA_HOT', label: tr('Bohat teekha'), chillies: '🌶️🌶️🌶️🌶️' },
];
export const spiceOf = (v?: string | null) => SPICE.find((s) => s.value === v) ?? null;

export const DIET: Array<{ value: DietaryTag; label: string }> = [
  { value: 'HALAL', label: tr('Halal') }, { value: 'CHICKEN', label: tr('Chicken') }, { value: 'BEEF', label: tr('Beef') },
  { value: 'MUTTON', label: tr('Mutton') }, { value: 'CONTAINS_SEAFOOD', label: tr('Seafood') }, { value: 'CONTAINS_EGG', label: tr('Anda') },
  { value: 'VEGETARIAN', label: tr('Veg') }, { value: 'VEGAN', label: tr('Vegan') }, { value: 'GLUTEN_FREE', label: tr('Gluten free') },
  { value: 'DAIRY_FREE', label: tr('Doodh ke bagair') }, { value: 'NUT_FREE', label: tr('Nuts ke bagair') }, { value: 'SPICY', label: tr('Teekha') },
];
export const dietLabel = (v: string) => DIET.find((d) => d.value === v)?.label ?? v;

/** 0 = Sunday, as the API stores it. */
export const DAYS = [tr('Itwar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Juma'), tr('Hafta')];
export const DAYS_SHORT = [tr('Itw'), tr('Peer'), tr('Mang'), tr('Budh'), tr('Jum\'t'), tr('Juma'), tr('Hafta')];

/** "07:00" → "7:00 AM". */
export function clock12(hhmm?: string | null): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

/** "Roz", "Peer–Juma" style summary of a day list. */
export function daysLabel(days: number[]): string {
  if (!days.length || days.length === 7) return tr('Roz');
  const s = [...days].sort((a, b) => a - b);
  if (s.join() === '1,2,3,4,5') return tr('Peer se Juma');
  if (s.join() === '0,6') return tr('Hafta, Itwar');
  return s.map((d) => DAYS_SHORT[d]).join(', ');
}

export const MODIFIER_TYPES: Array<{ value: ModifierType; label: string; hint: string }> = [
  { value: 'ADDON', label: tr('Extra'), hint: tr('Extra cheese, raita, extra boti') },
  { value: 'VARIATION', label: tr('Size'), hint: tr('Half / Full, Chhota / Bara — ek chuna jata hai') },
  { value: 'REMOVAL', label: tr('Bagair'), hint: tr('Pyaaz ke bagair, mayo nahi') },
  { value: 'SPICE_LEVEL', label: tr('Teekhapan'), hint: tr('Halka, darmiyana, teekha') },
  { value: 'COOKING_STYLE', label: tr('Pakane ka tareeqa'), hint: tr('Well done, tandoori, fry') },
  { value: 'NOTE', label: tr('Note'), hint: tr('Grahak ki apni baat — option nahi') },
];
export const modifierTypeOf = (v: string) => MODIFIER_TYPES.find((t) => t.value === v) ?? MODIFIER_TYPES[0];

export const ORDER_MODES: Array<{ value: OrderMode; label: string }> = [
  { value: 'DINE_IN', label: tr('Dine-in') }, { value: 'TAKEAWAY', label: tr('Takeaway') }, { value: 'DELIVERY', label: tr('Delivery') },
  { value: 'PICKUP', label: tr('Pickup') }, { value: 'DRIVE_THRU', label: tr('Drive-thru') }, { value: 'ROOM_SERVICE', label: tr('Room service') },
];
export const orderModeLabel = (v: string) => ORDER_MODES.find((m) => m.value === v)?.label ?? v;

/** Food cost % band: green up to 35, amber to 45, red above. */
export function foodCostTone(pct: number | null | undefined): 'good' | 'warn' | 'bad' | null {
  if (pct == null) return null;
  return pct > 45 ? 'bad' : pct > 35 ? 'warn' : 'good';
}

/** A branch "86" label: when it comes back by itself, or that it waits to be switched on. */
export const offLabel = (until?: string | null) => (until ? tr('Band · {{until}} tak', { until: formatTime(until) }) : tr('Band (86)'));
