/**
 * Labels, tones and cache keys shared by the pharmacy screens (mirror of the
 * web pharmacy lib/meta.ts). Labels are source keys marked with msg() and
 * translated where shown.
 */

import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { PrescriptionStatus, StorageCondition } from './api';

export const RX_KEY = 'prescriptions-page';
export const RX_ONE_KEY = 'prescription';
export const DOCTORS_KEY = 'pharmacy-doctors';
export const SALTS_KEY = 'pharmacy-salts';
export const EXPIRY_KEY = 'pharmacy-expiry';
export const REGISTER_KEY = 'pharmacy-register';
export const TEMP_KEY = 'pharmacy-temperature';
export const DASH_KEY = 'pharmacy-dashboard';

/** Refreshes pharmacy screens (and sales, stock and khata after a bill). */
export function refreshPharmacy(keys: string[], bill = false) {
  const all = [...keys, ...(bill ? ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'inv', 'offline', DASH_KEY, EXPIRY_KEY] : [])];
  all.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const SCHEDULE_META: Record<string, { label: string; hint: string; tone: StatusTone }> = {
  OTC: { label: msg('OTC'), hint: msg('Bagair nuskhe ke bik sakti hai'), tone: 'success' },
  SCHEDULE_G: { label: msg('Schedule G'), hint: msg('Doctor ki hidayat zaroori'), tone: 'info' },
  SCHEDULE_H: { label: msg('Schedule H'), hint: msg('Sirf nuskhe par'), tone: 'warning' },
  SCHEDULE_X: { label: msg('Schedule X'), hint: msg('Nuskha aur register dono'), tone: 'warning' },
  CONTROLLED: { label: msg('Controlled'), hint: msg('Register me har sale likhi jati hai'), tone: 'danger' },
  NARCOTIC: { label: msg('Narcotic'), hint: msg('Register me mareez aur doctor zaroori'), tone: 'danger' },
  PSYCHOTROPIC: { label: msg('Psychotropic'), hint: msg('Register me mareez aur doctor zaroori'), tone: 'accent' },
};
export const scheduleLabel = (k?: string | null) => (k && SCHEDULE_META[k] ? t(SCHEDULE_META[k].label) : k ?? '');

export const STORAGE_META: Record<StorageCondition, string> = {
  ROOM_TEMPERATURE: msg('Kamre ka temperature'),
  COOL: msg('Thandi jagah'),
  REFRIGERATED: msg('Fridge (2–8°C)'),
  FROZEN: msg('Freezer'),
  CONTROLLED_ROOM: msg('Controlled room'),
  PROTECT_FROM_LIGHT: msg('Dhoop se bachayein'),
  PROTECT_FROM_MOISTURE: msg('Nami se bachayein'),
};

export const RX_STATUS: Record<PrescriptionStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: msg('Check baqi'), tone: 'warning' },
  VERIFIED: { label: msg('Dene ko tayyar'), tone: 'info' },
  PARTIALLY_DISPENSED: { label: msg('Kuch di'), tone: 'accent' },
  DISPENSED: { label: msg('Poori di'), tone: 'success' },
  REJECTED: { label: msg('Radd'), tone: 'danger' },
  CANCELLED: { label: msg('Band'), tone: 'neutral' },
};

export const RX_TYPES = [
  { value: 'WALK_IN', label: msg('Counter par') }, { value: 'HOSPITAL', label: msg('Hospital') }, { value: 'ONLINE', label: msg('Online / WhatsApp') },
  { value: 'EMERGENCY', label: msg('Emergency') }, { value: 'INSURANCE', label: msg('Insurance / panel') },
] as const;

export const REFILLS = [
  { value: 'WEEKLY', label: msg('Har hafte') }, { value: 'BIWEEKLY', label: msg('Har 2 hafte') }, { value: 'MONTHLY', label: msg('Har mahine') }, { value: 'QUARTERLY', label: msg('Har 3 mahine') },
] as const;

export const FREQS = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '1-1-1-1', 'SOS'];
export const DURATIONS = ['3 din', '5 din', '7 din', '10 din', '15 din', '1 mahina'];
export const INSTRUCTIONS = [msg('Khane ke baad'), msg('Khane se pehle'), msg('Khali pait'), msg('Sone se pehle')];
export const SPECIALITIES = ['General physician', 'Child (Peds)', 'Gynae', 'Medicine', 'Sugar / Diabetes', 'Dil (Cardio)', 'Skin', 'ENT', 'Eye', 'Surgeon', 'Dentist'];

export const SEVERITY: Record<string, { label: string; tone: StatusTone }> = {
  MINOR: { label: msg('Halka'), tone: 'neutral' },
  MODERATE: { label: msg('Darmiyana'), tone: 'warning' },
  MAJOR: { label: msg('Sakht'), tone: 'danger' },
  CONTRAINDICATED: { label: msg('Ek saath mana'), tone: 'danger' },
};

/** Days left as words: "aaj", "3 din", "expire (5 din pehle)". */
export function daysText(days: number): string {
  if (days < 0) return t('expire ({{value}} din pehle)', { value: -days });
  if (days === 0) return t('aaj');
  if (days < 60) return t('{{days}} din', { days });
  return t('{{value}} mahine', { value: Math.round(days / 30) });
}

export const expiryTone = (d: number): StatusTone => (d < 0 ? 'danger' : d <= 30 ? 'danger' : d <= 90 ? 'warning' : 'neutral');

/** Temperature readings: usual limits by place (the shop can type its own). */
export const TEMP_PRESETS = [
  { location: 'Fridge 1', min: 2, max: 8 }, { location: 'Fridge 2', min: 2, max: 8 }, { location: 'Freezer', min: -25, max: -15 }, { location: 'Store room', min: 15, max: 25 },
];

export const fmtNum = (n: number) => String(Number(Number(n).toFixed(2)));
