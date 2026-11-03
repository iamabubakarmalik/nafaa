/** Clinic labels and helpers (mirror of the web clinic lib/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import { formatDate } from '@/core/format';
import type { StatusTone } from '@/design';
import type { AppointmentStatus } from './api';

export const CLINIC_KEYS = { appointments: 'clinic-appointments', queue: 'clinic-queue', patients: 'clinic-patients', doctors: 'clinic-doctors', labs: 'clinic-labs', rx: 'clinic-rx', vaccines: 'clinic-vaccines', panels: 'clinic-panels', dash: 'clinic-dash', today: 'clinic-today' } as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshClinic(money = false) {
  [...Object.values(CLINIC_KEYS), ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const APT_STATUS: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: msg('Booked'), tone: 'neutral' }, CONFIRMED: { label: msg('Pakki'), tone: 'info' }, ARRIVED: { label: msg('Intezar me'), tone: 'accent' }, IN_CONSULTATION: { label: msg('Doctor ke paas'), tone: 'warning' },
  COMPLETED: { label: msg('Ho gaya'), tone: 'success' }, NO_SHOW: { label: msg('Nahi aaye'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' }, RESCHEDULED: { label: msg('Waqt badla'), tone: 'info' },
};
export const VISIT_TYPES = [['FIRST_VISIT', msg('Pehli visit')], ['FOLLOW_UP', msg('Follow-up')], ['CONSULTATION', msg('Consultation')], ['EMERGENCY', msg('Emergency')], ['ROUTINE_CHECKUP', msg('Check-up')], ['VACCINATION', msg('Vaccine')], ['PROCEDURE', msg('Procedure')], ['OTHER', msg('Doosri')]] as const;
export const visitTypeLabel = (v?: string) => t(VISIT_TYPES.find(([k]) => k === v)?.[1] ?? msg('Visit'));
export const LAB_STATUS: Record<string, { label: string; tone: StatusTone }> = { ORDERED: { label: msg('Order hua'), tone: 'neutral' }, SAMPLE_COLLECTED: { label: msg('Sample liya'), tone: 'info' }, IN_PROGRESS: { label: msg('Test ho raha'), tone: 'warning' }, COMPLETED: { label: msg('Tayyar'), tone: 'success' }, REPORTED: { label: msg('Report di'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' } };
export const SPECIALTIES = [['GENERAL_PRACTITIONER', msg('General physician')], ['FAMILY_PHYSICIAN', msg('Family physician')], ['PEDIATRICIAN', msg('Bachon ka doctor')], ['GYNECOLOGIST', msg('Gynecologist')], ['DENTIST', msg('Dentist')], ['DERMATOLOGIST', msg('Skin specialist')], ['CARDIOLOGIST', msg('Heart specialist')], ['ORTHOPEDIC', msg('Haddi ka doctor')], ['ENT_SPECIALIST', msg('ENT')], ['PHYSIOTHERAPIST', msg('Physiotherapist')], ['VETERINARY', msg('Veterinary')], ['OTHER', msg('Doosra')]] as const;
export const specialtyLabel = (v?: string) => t(SPECIALTIES.find(([k]) => k === v)?.[1] ?? msg('Doctor'));
export const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS'] as const;

export const dateOf = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const doctorName = (d?: { title?: string | null; fullName?: string } | null) => (d ? `${d.title ? `${d.title} ` : ''}${d.fullName}` : '—');
export const ageOf = (dob?: string | null) => (dob ? Math.max(Math.floor((Date.now() - new Date(dob).getTime()) / 31_557_600_000), 0) : null);
