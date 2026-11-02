/**
 * Pharmacy labels and small helpers shared by the counter, product screens,
 * prescriptions and the narcotic register.
 */

import type { PrescriptionStatus } from '../api/prescriptions.api';
import { t } from '@core/i18n';

export const SCHEDULE_META: Record<string, { label: string; hint: string; tone: string }> = {
  OTC: { label: t('OTC'), hint: t('Bagair nuskhe ke bik sakti hai'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  SCHEDULE_G: { label: t('Schedule G'), hint: t('Doctor ki hidayat zaroori'), tone: 'bg-sky-50 text-sky-700 ring-sky-100' },
  SCHEDULE_H: { label: t('Schedule H'), hint: t('Sirf nuskhe par'), tone: 'bg-amber-50 text-amber-800 ring-amber-100' },
  SCHEDULE_X: { label: t('Schedule X'), hint: t('Nuskha aur register dono'), tone: 'bg-orange-50 text-orange-800 ring-orange-100' },
  CONTROLLED: { label: t('Controlled'), hint: t('Register me har sale likhi jati hai'), tone: 'bg-rose-50 text-rose-700 ring-rose-100' },
  NARCOTIC: { label: t('Narcotic'), hint: t('Register me mareez aur doctor zaroori'), tone: 'bg-rose-100 text-rose-800 ring-rose-200' },
  PSYCHOTROPIC: { label: t('Psychotropic'), hint: t('Register me mareez aur doctor zaroori'), tone: 'bg-violet-50 text-violet-800 ring-violet-100' },
};
export const SCHEDULES = Object.keys(SCHEDULE_META);

/** Classes that always go in the narcotic register. */
export const REGISTER_CLASSES = ['CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC', 'SCHEDULE_X'];

export const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops', 'Cream', 'Ointment', 'Gel', 'Inhaler', 'Sachet', 'Suppository', 'Spray', 'Lotion'];

export const STORAGE_META: Record<string, string> = {
  ROOM_TEMPERATURE: t('Kamre ka temperature'),
  COOL: t('Thandi jagah'),
  REFRIGERATED: t('Fridge (2–8°C)'),
  FROZEN: t('Freezer'),
  CONTROLLED_ROOM: t('Controlled room'),
  PROTECT_FROM_LIGHT: t('Dhoop se bachayein'),
  PROTECT_FROM_MOISTURE: t('Nami se bachayein'),
};

export const RX_STATUS: Record<PrescriptionStatus, { label: string; tone: string }> = {
  PENDING: { label: t('Check baqi'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  VERIFIED: { label: t('Dene ko tayyar'), tone: 'bg-sky-50 text-sky-800 ring-sky-200' },
  PARTIALLY_DISPENSED: { label: t('Kuch di'), tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  DISPENSED: { label: t('Poori di'), tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  REJECTED: { label: t('Radd'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  CANCELLED: { label: t('Band'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

/** Patient and doctor written on a narcotic bill line. */
export interface RxDetails {
  doctorName: string;
  doctorRegNumber: string;
  patientName: string;
  patientCnic: string;
}

/**
 * Line note the narcotic register reads back:
 * "Rx · Dr. Ahmed (PMDC 12345) · Mareez: Ali (CNIC 35202-…)".
 */
export function rxNote(d: RxDetails): string {
  const dr = `Dr. ${d.doctorName.trim().replace(/^dr\.?\s+/i, '')}${d.doctorRegNumber.trim() ? ` (PMDC ${d.doctorRegNumber.trim()})` : ''}`;
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

/** "Dr. Ahmed" whether or not the saved name already starts with "Dr". */
export const drName = (name?: string | null) => (name ? `Dr. ${name.trim().replace(/^dr\.?\s+/i, '')}` : '');

/** 13-digit CNIC as 35202-1234567-1 while typing. */
export function formatCnic(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

/** Days left as words: "aaj", "3 din", "expire (5 din pehle)". */
export function daysLabel(days: number): string {
  if (days < 0) return t('expire ({{value}} din pehle)', { value: -days });
  if (days === 0) return 'aaj';
  if (days < 60) return t('{{days}} din', { days });
  return t('{{value}} mahine', { value: Math.round(days / 30) });
}

/** Calendar date for a business-day key or ISO string. */
export const shortDate = (v?: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');
