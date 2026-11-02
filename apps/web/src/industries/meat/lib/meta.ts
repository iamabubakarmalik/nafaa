/** Labels, query keys and small helpers shared by the meat shop pages. */

import { t } from '@core/i18n';
export const KEYS = {
  orders: 'weight-orders',
  animals: 'live-animals',
  slaughter: 'meat-slaughter',
  cutting: 'cutting-jobs',
  qurbani: 'meat-qurbani',
  subs: 'meat-subscriptions',
  wholesale: 'meat-wholesale',
  profiles: 'meat-profiles',
  daySheet: 'meat-day-sheet',
} as const;

/** Lists that change when money or stock moves, refreshed after a bill or payment. */
export const MONEY_KEYS = ['sales', 'dashboard', 'meat-dashboard', 'cash-register', 'khata', 'customers', 'products', 'pos-products', KEYS.daySheet];

export const ANIMALS = [
  { value: 'CHICKEN', label: t('Murgi'), emoji: '🐔' },
  { value: 'MUTTON', label: t('Mutton (bakra)'), emoji: '🐐' },
  { value: 'BEEF', label: t('Beef (gaye)'), emoji: '🐄' },
  { value: 'GOAT', label: t('Bakri'), emoji: '🐐' },
  { value: 'LAMB', label: t('Dumba'), emoji: '🐏' },
  { value: 'BUFFALO', label: t('Bhains'), emoji: '🐃' },
  { value: 'CAMEL', label: t('Oont'), emoji: '🐫' },
  { value: 'DUCK', label: t('Batakh'), emoji: '🦆' },
  { value: 'TURKEY', label: t('Turkey'), emoji: '🦃' },
  { value: 'QUAIL', label: t('Bater'), emoji: '🐦' },
  { value: 'FISH', label: t('Machhli'), emoji: '🐟' },
  { value: 'PRAWN', label: t('Jheenga'), emoji: '🦐' },
  { value: 'OTHER', label: t('Doosra'), emoji: '🥩' },
] as const;

export const animalOf = (v?: string | null) => ANIMALS.find((a) => a.value === v) ?? { value: v ?? '', label: v || '—', emoji: '🥩' };

export const CUTS = [
  { value: 'WHOLE_ANIMAL', label: t('Poora (carcass)') }, { value: 'HALF_ANIMAL', label: t('Aadha') }, { value: 'QUARTER', label: t('Chautha') },
  { value: 'BONELESS', label: t('Boneless') }, { value: 'WITH_BONE', label: t('Haddi wala') }, { value: 'MINCE', label: t('Qeema') },
  { value: 'CHOPS', label: t('Chaanp') }, { value: 'RIBS', label: t('Pasli') }, { value: 'LEG', label: t('Raan') }, { value: 'UNDERCUT', label: t('Undercut') },
  { value: 'BREAST', label: t('Seena') }, { value: 'THIGH', label: t('Ran (thigh)') }, { value: 'WING', label: t('Wings') }, { value: 'DRUMSTICK', label: t('Drumstick') },
  { value: 'LIVER', label: t('Kaleji') }, { value: 'KIDNEY', label: t('Gurde') }, { value: 'HEART', label: t('Dil') }, { value: 'BRAIN', label: t('Maghaz') },
  { value: 'TONGUE', label: t('Zabaan') }, { value: 'TROTTERS', label: t('Paaye') }, { value: 'HEAD', label: t('Siri') }, { value: 'OFFAL', label: t('Ojhri / andar ka') },
  { value: 'BONES', label: t('Haddiyan') }, { value: 'FAT', label: t('Charbi') }, { value: 'SKIN', label: t('Khaal') }, { value: 'RETAIL_CUT', label: t('Mix gosht') },
  { value: 'PRIMAL_CUT', label: t('Bara tukra') }, { value: 'TAIL', label: t('Dum') }, { value: 'OTHER', label: t('Doosra') },
] as const;

export const cutLabel = (v?: string | null) => CUTS.find((c) => c.value === v)?.label ?? (v || '');

export const PAY_METHODS = [
  { id: 'CASH', label: t('Cash') }, { id: 'CARD', label: t('Card') }, { id: 'JAZZCASH', label: t('JazzCash') },
  { id: 'EASYPAISA', label: t('EasyPaisa') }, { id: 'BANK_TRANSFER', label: t('Bank') },
] as const;
export type PayMethod = (typeof PAY_METHODS)[number]['id'];

/** Weight with up to 3 decimals and the kg unit. */
export function kg(v: number | null | undefined, unit = 'kg') {
  const n = Math.round((Number(v) || 0) * 1000) / 1000;
  return `${n.toLocaleString('en-PK', { maximumFractionDigits: 3 })} ${unit}`;
}

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(Number(v) * 10) / 10}%`);

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Date and time on the shop's clock, short. */
export function dateTime(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function dateOnly(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** `yyyy-mm-dd` of today on the device clock (shops run on local time). */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const decimal = (v: string) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
