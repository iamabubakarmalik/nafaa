/** Labels shared by the menu, add-on and happy-hour screens. */

import type { DietaryTag, SpiceLevel } from '../api/menu-items.api';
import type { ModifierType } from '../api/modifiers.api';
import type { OrderMode } from '../api/happy-hours.api';

export const SPICE: Array<{ value: SpiceLevel; label: string; chillies: string }> = [
  { value: 'NONE', label: 'Teekha nahi', chillies: '' },
  { value: 'MILD', label: 'Halka', chillies: '🌶️' },
  { value: 'MEDIUM', label: 'Darmiyana', chillies: '🌶️🌶️' },
  { value: 'HOT', label: 'Teekha', chillies: '🌶️🌶️🌶️' },
  { value: 'EXTRA_HOT', label: 'Bohat teekha', chillies: '🌶️🌶️🌶️🌶️' },
];
export const spiceOf = (v?: string | null) => SPICE.find((s) => s.value === v) ?? null;

export const DIET: Array<{ value: DietaryTag; label: string }> = [
  { value: 'HALAL', label: 'Halal' }, { value: 'CHICKEN', label: 'Chicken' }, { value: 'BEEF', label: 'Beef' },
  { value: 'MUTTON', label: 'Mutton' }, { value: 'CONTAINS_SEAFOOD', label: 'Seafood' }, { value: 'CONTAINS_EGG', label: 'Anda' },
  { value: 'VEGETARIAN', label: 'Veg' }, { value: 'VEGAN', label: 'Vegan' }, { value: 'GLUTEN_FREE', label: 'Gluten free' },
  { value: 'DAIRY_FREE', label: 'Doodh ke bagair' }, { value: 'NUT_FREE', label: 'Nuts ke bagair' }, { value: 'SPICY', label: 'Teekha' },
];
export const dietLabel = (v: string) => DIET.find((d) => d.value === v)?.label ?? v;

/** 0 = Sunday, as the API stores it. */
export const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
export const DAYS_SHORT = ['Itw', 'Peer', 'Mang', 'Budh', 'Jum\'t', 'Juma', 'Hafta'];

/** "07:00" → "7:00 AM". */
export function clock12(hhmm?: string | null): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
}

/** "Roz", "Peer–Juma" style summary of a day list. */
export function daysLabel(days: number[]): string {
  if (!days.length || days.length === 7) return 'Roz';
  const s = [...days].sort((a, b) => a - b);
  if (s.join() === '1,2,3,4,5') return 'Peer se Juma';
  if (s.join() === '0,6') return 'Hafta, Itwar';
  return s.map((d) => DAYS_SHORT[d]).join(', ');
}

export const MODIFIER_TYPES: Array<{ value: ModifierType; label: string; hint: string }> = [
  { value: 'ADDON', label: 'Extra', hint: 'Extra cheese, raita, extra boti' },
  { value: 'VARIATION', label: 'Size', hint: 'Half / Full, Chhota / Bara — ek chuna jata hai' },
  { value: 'REMOVAL', label: 'Bagair', hint: 'Pyaaz ke bagair, mayo nahi' },
  { value: 'SPICE_LEVEL', label: 'Teekhapan', hint: 'Halka, darmiyana, teekha' },
  { value: 'COOKING_STYLE', label: 'Pakane ka tareeqa', hint: 'Well done, tandoori, fry' },
  { value: 'NOTE', label: 'Note', hint: 'Grahak ki apni baat — option nahi' },
];
export const modifierTypeOf = (v: string) => MODIFIER_TYPES.find((t) => t.value === v) ?? MODIFIER_TYPES[0];

export const ORDER_MODES: Array<{ value: OrderMode; label: string }> = [
  { value: 'DINE_IN', label: 'Dine-in' }, { value: 'TAKEAWAY', label: 'Takeaway' }, { value: 'DELIVERY', label: 'Delivery' },
  { value: 'PICKUP', label: 'Pickup' }, { value: 'DRIVE_THRU', label: 'Drive-thru' }, { value: 'ROOM_SERVICE', label: 'Room service' },
];
export const orderModeLabel = (v: string) => ORDER_MODES.find((m) => m.value === v)?.label ?? v;

/** Food cost % band: green up to 35, amber to 45, red above. */
export function foodCostTone(pct: number | null | undefined): 'good' | 'warn' | 'bad' | null {
  if (pct == null) return null;
  return pct > 45 ? 'bad' : pct > 35 ? 'warn' : 'good';
}
