/**
 * Labels shared by the restaurant menu, add-on, happy-hour, recipe, station,
 * rider and delivery screens (web lib/menuMeta.ts). Labels are source keys
 * marked with msg() and translated where shown.
 */

import { CircleSlash, Flame, Sparkles, Star, type LucideIcon } from 'lucide-react-native';
import { daysKind, foodCostTone, type DishClass, type ModifierType } from '@nafaa/core/restaurant';
import { formatTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { DietaryTag, OrderMode, RiderStatus, SpiceLevel } from '../api';
import type { DeliveryStage } from './api';

export const MENU_KEYS = {
  board: 'restaurant-menu-board',
  analytics: 'restaurant-menu-analytics',
  items: 'restaurant-menu-items',
  modifiers: 'restaurant-modifiers',
  happy: 'restaurant-happy-hours',
  recipes: 'restaurant-recipes',
  cook: 'restaurant-cookability',
  usage: 'restaurant-recipe-usage',
  stations: 'restaurant-station-routing',
  riders: 'restaurant-riders',
  delivery: 'restaurant-delivery-board',
  riderCash: 'restaurant-rider-cash',
  extra: 'restaurant-product-extra',
} as const;

/** Refreshes the listed restaurant screens (and the order menu the counter uses). */
export function refreshMenu(...keys: string[]) {
  [...keys, 'restaurant-menu-order', 'restaurant-product-extra', 'inv'].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const SPICE: Array<{ value: SpiceLevel; label: string; chillies: string }> = [
  { value: 'NONE', label: msg('Teekha nahi'), chillies: '' },
  { value: 'MILD', label: msg('Halka'), chillies: '🌶️' },
  { value: 'MEDIUM', label: msg('Darmiyana'), chillies: '🌶️🌶️' },
  { value: 'HOT', label: msg('Teekha'), chillies: '🌶️🌶️🌶️' },
  { value: 'EXTRA_HOT', label: msg('Bohat teekha'), chillies: '🌶️🌶️🌶️🌶️' },
];
export const spiceOf = (v?: string | null) => SPICE.find((s) => s.value === v) ?? null;

export const DIET: Array<{ value: DietaryTag; label: string }> = [
  { value: 'HALAL', label: msg('Halal') }, { value: 'CHICKEN', label: msg('Chicken') }, { value: 'BEEF', label: msg('Beef') },
  { value: 'MUTTON', label: msg('Mutton') }, { value: 'CONTAINS_SEAFOOD', label: msg('Seafood') }, { value: 'CONTAINS_EGG', label: msg('Anda') },
  { value: 'VEGETARIAN', label: msg('Veg') }, { value: 'VEGAN', label: msg('Vegan') }, { value: 'GLUTEN_FREE', label: msg('Gluten free') },
  { value: 'DAIRY_FREE', label: msg('Doodh ke bagair') }, { value: 'NUT_FREE', label: msg('Nuts ke bagair') }, { value: 'SPICY', label: msg('Teekha') },
];
export const dietLabel = (v: string) => t(DIET.find((d) => d.value === v)?.label ?? v);

/** 0 = Sunday, as the API stores it. */
export const DAYS: string[] = [msg('Itwar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumeraat'), msg('Juma'), msg('Hafta')];
export const DAYS_SHORT: string[] = [msg('Itw'), msg('Peer'), msg('Mang'), msg('Budh'), msg('Jum\'t'), msg('Juma'), msg('Hafta')];

/** "Roz", "Peer se Juma" style summary of a day list. */
export function daysLabel(days: number[]): string {
  const k = daysKind(days);
  if (k === 'everyday') return t('Roz');
  if (k === 'weekdays') return t('Peer se Juma');
  if (k === 'weekend') return t('Hafta, Itwar');
  return [...days].sort((a, b) => a - b).map((d) => t(DAYS_SHORT[d])).join(', ');
}

export const MODIFIER_TYPES: Array<{ value: ModifierType; label: string; hint: string }> = [
  { value: 'ADDON', label: msg('Extra'), hint: msg('Extra cheese, raita, extra boti') },
  { value: 'VARIATION', label: msg('Size'), hint: msg('Half / Full, Chhota / Bara — ek chuna jata hai') },
  { value: 'REMOVAL', label: msg('Bagair'), hint: msg('Pyaaz ke bagair, mayo nahi') },
  { value: 'SPICE_LEVEL', label: msg('Teekhapan'), hint: msg('Halka, darmiyana, teekha') },
  { value: 'COOKING_STYLE', label: msg('Pakane ka tareeqa'), hint: msg('Well done, tandoori, fry') },
  { value: 'NOTE', label: msg('Note'), hint: msg('Grahak ki apni baat — option nahi') },
];
export const modifierTypeOf = (v: string) => MODIFIER_TYPES.find((x) => x.value === v) ?? MODIFIER_TYPES[0];

export const MODE_OPTIONS: Array<{ value: OrderMode; label: string }> = [
  { value: 'DINE_IN', label: msg('Dine-in') }, { value: 'TAKEAWAY', label: msg('Takeaway') }, { value: 'DELIVERY', label: msg('Delivery') },
  { value: 'PICKUP', label: msg('Pickup') }, { value: 'DRIVE_THRU', label: msg('Drive-thru') }, { value: 'ROOM_SERVICE', label: msg('Room service') },
];
export const orderModeLabel = (v: string) => t(MODE_OPTIONS.find((m) => m.value === v)?.label ?? v);

/** Food cost % as a status tone. */
export function foodTone(pct: number | null | undefined): StatusTone {
  const k = foodCostTone(pct);
  return k === 'bad' ? 'danger' : k === 'warn' ? 'warning' : k === 'good' ? 'success' : 'neutral';
}

/** A branch "86" label: when it comes back by itself, or that it waits to be switched on. */
export const offLabel = (until?: string | null) => (until ? t('Band · {{until}} tak', { until: formatTime(until) }) : t('Band (86)'));

export const CLASS: Record<DishClass, { label: string; hint: string; tone: StatusTone; icon: LucideIcon }> = {
  star: { label: msg('Star'), hint: msg('Zyada bikti, zyada kamati — saamne rakhein'), tone: 'success', icon: Star },
  workhorse: { label: msg('Mehnati'), hint: msg('Zyada bikti, kam kamati — rate barhayein ya cost ghatayein'), tone: 'info', icon: Flame },
  puzzle: { label: msg('Chhupi hui'), hint: msg('Achha kamati, kam bikti — waiter suggest karein'), tone: 'warning', icon: Sparkles },
  dog: { label: msg('Kamzor'), hint: msg('Kam bikti, kam kamati — menu se hatane ka sochein'), tone: 'danger', icon: CircleSlash },
};

export const RIDER_STATUS: Record<RiderStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Duty par · free'), tone: 'success' },
  BUSY: { label: msg('Trip par'), tone: 'accent' },
  ON_BREAK: { label: msg('Break'), tone: 'warning' },
  OFFLINE: { label: msg('Chhutti / off'), tone: 'neutral' },
  INACTIVE: { label: msg('Hata diya'), tone: 'danger' },
};

export const STAGES: Array<{ id: Exclude<DeliveryStage, 'done'>; label: string; tone: StatusTone; hint: string }> = [
  { id: 'needsRider', label: msg('Rider chahiye'), tone: 'danger', hint: msg('Kitchen me ya tayyar') },
  { id: 'assigned', label: msg('Rider laga'), tone: 'info', hint: msg('Uthane ka intezar') },
  { id: 'onTheWay', label: msg('Raste me'), tone: 'accent', hint: msg('Customer ki taraf') },
  { id: 'cash', label: msg('Cash rider ke paas'), tone: 'warning', hint: msg('Deliver ho gaya') },
];

/** Three decimals at most, no trailing zeros. */
export const fmt = (n: number | null | undefined) => String(Number(Number(n ?? 0).toFixed(3)));

const UNIT_LABEL: Record<string, string> = { gram: 'gram', kg: 'kg', liter: 'litre', ml: 'ml', pcs: 'pcs', dozen: 'darjan' };
export const unitLabel = (u: string) => UNIT_LABEL[u] ?? u;
