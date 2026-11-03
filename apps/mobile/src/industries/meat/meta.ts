/** Meat labels, query keys and helpers (mirror of the web meat lib/meta.ts). Labels are source keys marked with msg(). */

import { businessDayKey } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { OrderStatus } from '@nafaa/core/industries/meat';

export const MEAT_KEYS = {
  orders: 'weight-orders', animals: 'live-animals', slaughter: 'meat-slaughter', cutting: 'cutting-jobs', qurbani: 'meat-qurbani', subs: 'meat-subscriptions', wholesale: 'meat-wholesale',
  profiles: 'meat-profiles', daySheet: 'meat-day-sheet', overview: 'meat-dashboard',
} as const;

/** Lists that change when money or stock moves, refreshed after a bill or payment. */
const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'dashboard', 'inv', 'offline', MEAT_KEYS.daySheet, MEAT_KEYS.overview];
export function refreshMeat(keys: string[], money = false) {
  [...keys, MEAT_KEYS.overview, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const ANIMALS: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'CHICKEN', label: msg('Murgi'), emoji: '🐔' }, { value: 'MUTTON', label: msg('Mutton (bakra)'), emoji: '🐐' }, { value: 'BEEF', label: msg('Beef (gaye)'), emoji: '🐄' },
  { value: 'GOAT', label: msg('Bakri'), emoji: '🐐' }, { value: 'LAMB', label: msg('Dumba'), emoji: '🐏' }, { value: 'BUFFALO', label: msg('Bhains'), emoji: '🐃' },
  { value: 'CAMEL', label: msg('Oont'), emoji: '🐫' }, { value: 'DUCK', label: msg('Batakh'), emoji: '🦆' }, { value: 'TURKEY', label: msg('Turkey'), emoji: '🦃' },
  { value: 'QUAIL', label: msg('Bater'), emoji: '🐦' }, { value: 'FISH', label: msg('Machhli'), emoji: '🐟' }, { value: 'PRAWN', label: msg('Jheenga'), emoji: '🦐' }, { value: 'OTHER', label: msg('Doosra'), emoji: '🥩' },
];
export const animalOf = (v?: string | null) => ANIMALS.find((a) => a.value === v) ?? { value: v ?? '', label: v || '—', emoji: '🥩' };
export const animalText = (v?: string | null) => { const a = animalOf(v); return `${a.emoji} ${a.label === v || !v ? a.label : t(a.label)}`; };

export const CUTS: Array<{ value: string; label: string }> = [
  { value: 'WHOLE_ANIMAL', label: msg('Poora (carcass)') }, { value: 'HALF_ANIMAL', label: msg('Aadha') }, { value: 'QUARTER', label: msg('Chautha') }, { value: 'BONELESS', label: msg('Boneless') },
  { value: 'WITH_BONE', label: msg('Haddi wala') }, { value: 'MINCE', label: msg('Qeema') }, { value: 'CHOPS', label: msg('Chaanp') }, { value: 'RIBS', label: msg('Pasli') }, { value: 'LEG', label: msg('Raan') },
  { value: 'UNDERCUT', label: msg('Undercut') }, { value: 'BREAST', label: msg('Seena') }, { value: 'THIGH', label: msg('Ran (thigh)') }, { value: 'WING', label: msg('Wings') }, { value: 'DRUMSTICK', label: msg('Drumstick') },
  { value: 'LIVER', label: msg('Kaleji') }, { value: 'KIDNEY', label: msg('Gurde') }, { value: 'HEART', label: msg('Dil') }, { value: 'BRAIN', label: msg('Maghaz') }, { value: 'TONGUE', label: msg('Zabaan') },
  { value: 'TROTTERS', label: msg('Paaye') }, { value: 'HEAD', label: msg('Siri') }, { value: 'OFFAL', label: msg('Ojhri / andar ka') }, { value: 'BONES', label: msg('Haddiyan') }, { value: 'FAT', label: msg('Charbi') },
  { value: 'SKIN', label: msg('Khaal') }, { value: 'RETAIL_CUT', label: msg('Mix gosht') }, { value: 'PRIMAL_CUT', label: msg('Bara tukra') }, { value: 'TAIL', label: msg('Dum') }, { value: 'OTHER', label: msg('Doosra') },
];
export const cutLabel = (v?: string | null) => { const c = CUTS.find((x) => x.value === v); return c ? t(c.label) : v || ''; };

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: msg('Kaccha'), tone: 'neutral' }, CONFIRMED: { label: msg('Pakka'), tone: 'info' }, PROCESSING: { label: msg('Tayyari'), tone: 'accent' }, CUTTING: { label: msg('Cutting'), tone: 'accent' },
  PACKED: { label: msg('Pack'), tone: 'warning' }, READY: { label: msg('Tayyar'), tone: 'success' }, OUT_FOR_DELIVERY: { label: msg('Raste me'), tone: 'warning' }, DELIVERED: { label: msg('De diya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
export const STEP_LABEL: Record<string, string> = { confirm: msg('Pakka karein'), cutting: msg('Cutting shuru'), packed: msg('Pack ho gaya'), ready: msg('Tayyar'), rider: msg('Rider ko diya') };

export const PAY_METHODS = [
  { value: 'CASH', label: msg('Cash') }, { value: 'CARD', label: msg('Card') }, { value: 'JAZZCASH', label: msg('JazzCash') }, { value: 'EASYPAISA', label: msg('EasyPaisa') }, { value: 'BANK_TRANSFER', label: msg('Bank') },
];

export const CUT_STYLES = [msg('Karahi cut'), msg('Biryani cut'), msg('Qorma cut'), msg('Boti'), msg('Bina haddi'), msg('Qeema (do dafa)'), msg('Poora (bina kaate)')];
export const OCCASIONS = [msg('Eid'), msg('Shadi'), msg('Restaurant roz ka'), msg('Dawat'), msg('Aqeeqa')];
export const SLAUGHTER_METHODS = [{ value: 'HALAL_HAND', label: msg('Halal (haath se)') }, { value: 'HALAL_MACHINE', label: msg('Halal (machine)') }, { value: 'STANDARD', label: msg('Aam') }];
export const DAYS = [msg('Itwar'), msg('Peer'), msg('Mangal'), msg('Budh'), msg('Jumeraat'), msg('Juma'), msg('Hafta')];
export const BUSINESS_TYPES = [{ value: 'RESTAURANT', label: msg('Restaurant') }, { value: 'HOTEL', label: msg('Hotel') }, { value: 'CATERER', label: msg('Caterer / degh') }, { value: 'SHOP', label: msg('Dukaan') }, { value: 'OTHER', label: msg('Doosra') }];
export const FREQ = [
  { value: 'DAILY', label: msg('Roz') }, { value: 'ALTERNATE_DAY', label: msg('Ek din chhor kar') }, { value: 'WEEKLY', label: msg('Hafte me ek') }, { value: 'BIWEEKLY', label: msg('Do hafte me ek') }, { value: 'MONTHLY', label: msg('Mahine me ek') },
];
export const freqLabel = (v: string) => { const f = FREQ.find((x) => x.value === v); return f ? t(f.label) : v; };
export const SUB_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chalu'), tone: 'success' }, PAUSED: { label: msg('Ruki hui'), tone: 'warning' }, CANCELLED: { label: msg('Band'), tone: 'danger' }, EXPIRED: { label: msg('Khatam'), tone: 'neutral' }, COMPLETED: { label: msg('Poori'), tone: 'neutral' },
};
export const QURBANI_KINDS = [{ value: 'BEEF', label: msg('Gaye (hissa)') }, { value: 'CAMEL', label: msg('Oont (hissa)') }, { value: 'MUTTON', label: msg('Bakra') }, { value: 'LAMB', label: msg('Dumba') }, { value: 'GOAT', label: msg('Bakri') }, { value: 'BUFFALO', label: msg('Bhains (hissa)') }];
export const QURBANI_OCCASIONS = [{ value: 'QURBANI', label: msg('Qurbani') }, { value: 'AQEEQA', label: msg('Aqeeqa') }, { value: 'SADQA', label: msg('Sadqa') }, { value: 'NAZAR', label: msg('Nazar') }];
export const occasionLabel = (v?: string | null) => { const o = QURBANI_OCCASIONS.find((x) => x.value === v); return o ? t(o.label) : v ?? ''; };
export const QURBANI_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  BOOKED: { label: msg('Booked'), tone: 'info' }, CONFIRMED: { label: msg('Pakki'), tone: 'accent' }, SLAUGHTERED: { label: msg('Zibah ho gaya'), tone: 'warning' },
  COMPLETED: { label: msg('De diya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
export const CUT_STATUS: Record<string, { label: string; tone: StatusTone }> = { IN_PROGRESS: { label: msg('Chal raha'), tone: 'warning' }, COMPLETED: { label: msg('Mukammal'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' } };

/** Weight with up to 3 decimals and the unit. */
export function kg(v: number | null | undefined, unit = 'kg') {
  const n = Math.round((Number(v) || 0) * 1000) / 1000;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${unit}`;
}
export const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(Number(v) * 10) / 10}%`);
export const todayKey = () => businessDayKey();
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
export const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());
