/** Clinic labels, colours and small formatters shared by every clinic page. */

import type { BadgeVariant } from '@/design-system/components';
import type { AppointmentStatus, FeeMethod, VisitType } from '../api/appointments.api';
import type { LabOrder } from '../api/lab-orders.api';
import type { Vaccination } from '../api/vaccinations.api';
import type { BloodGroup, Gender } from '../api/patients.api';
import type { Specialty } from '../api/doctors.api';
import { t } from '@core/i18n';

export const APT_STATUS: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: t('Booked'), variant: 'info' },
  CONFIRMED: { label: t('Booked'), variant: 'info' },
  RESCHEDULED: { label: t('Waqt badla'), variant: 'info' },
  ARRIVED: { label: t('Intezar me'), variant: 'warning' },
  IN_CONSULTATION: { label: t('Doctor ke paas'), variant: 'brand' },
  COMPLETED: { label: t('Mukammal'), variant: 'success' },
  NO_SHOW: { label: t('Nahi aaya'), variant: 'default' },
  CANCELLED: { label: t('Cancel'), variant: 'danger' },
};

export const VISIT_TYPES: Array<{ value: VisitType; label: string }> = [
  { value: 'FIRST_VISIT', label: t('Pehli baar') },
  { value: 'FOLLOW_UP', label: t('Follow-up') },
  { value: 'EMERGENCY', label: t('Emergency') },
  { value: 'ROUTINE_CHECKUP', label: t('Checkup') },
  { value: 'PROCEDURE', label: t('Procedure') },
  { value: 'VACCINATION', label: t('Vaccine') },
  { value: 'DENTAL_CHECKUP', label: t('Dental') },
  { value: 'ANTENATAL', label: t('Hamal checkup') },
  { value: 'PHYSIO_SESSION', label: t('Physio') },
  { value: 'TELEMEDICINE', label: t('Online') },
  { value: 'HOME_VISIT', label: t('Ghar par') },
];
export const visitLabel = (v?: string | null) => VISIT_TYPES.find((x) => x.value === v)?.label ?? (v ? v.replace(/_/g, ' ').toLowerCase() : '—');

export const LAB_STATUS: Record<LabOrder['status'], { label: string; variant: BadgeVariant }> = {
  ORDERED: { label: t('Likha gaya'), variant: 'info' },
  SAMPLE_COLLECTED: { label: t('Sample liya'), variant: 'warning' },
  IN_PROGRESS: { label: t('Lab me'), variant: 'warning' },
  COMPLETED: { label: t('Mukammal'), variant: 'success' },
  REPORTED: { label: t('Report tayyar'), variant: 'success' },
  CANCELLED: { label: t('Cancel'), variant: 'danger' },
};

export const VACCINE_STATUS: Record<Vaccination['status'], { label: string; variant: BadgeVariant }> = {
  DUE: { label: t('Baqi'), variant: 'info' },
  ADMINISTERED: { label: t('Lag gayi'), variant: 'success' },
  DELAYED: { label: t('Der'), variant: 'warning' },
  SKIPPED: { label: t('Chhor di'), variant: 'default' },
  CONTRAINDICATED: { label: t('Nahi lagani'), variant: 'danger' },
};

export const PAY_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  PAID: { label: t('Bill ban gaya'), variant: 'success' },
  PARTIALLY_PAID: { label: t('Kuch baqi'), variant: 'warning' },
  UNPAID: { label: t('Fees baqi'), variant: 'danger' },
};

export const FEE_METHODS: Array<{ value: FeeMethod; label: string }> = [
  { value: 'CASH', label: t('Cash') },
  { value: 'CARD', label: t('Card') },
  { value: 'JAZZCASH', label: t('JazzCash') },
  { value: 'EASYPAISA', label: t('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: t('Bank') },
];

export const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'MALE', label: t('Mard') },
  { value: 'FEMALE', label: t('Aurat') },
  { value: 'OTHER', label: t('Other') },
];
export const genderLabel = (g?: string | null) => GENDERS.find((x) => x.value === g)?.label ?? '';

export const BLOOD_GROUPS: Array<{ value: BloodGroup; label: string }> = [
  { value: 'A_POS', label: t('A+') }, { value: 'A_NEG', label: t('A-') }, { value: 'B_POS', label: t('B+') }, { value: 'B_NEG', label: t('B-') },
  { value: 'AB_POS', label: t('AB+') }, { value: 'AB_NEG', label: t('AB-') }, { value: 'O_POS', label: t('O+') }, { value: 'O_NEG', label: t('O-') },
];
export const bloodLabel = (b?: string | null) => BLOOD_GROUPS.find((x) => x.value === b)?.label ?? '';

export const SPECIALTIES: Array<{ value: Specialty; label: string }> = [
  { value: 'GENERAL_PRACTITIONER', label: t('General physician') },
  { value: 'FAMILY_PHYSICIAN', label: t('Family physician') },
  { value: 'INTERNAL_MEDICINE', label: t('Medicine specialist') },
  { value: 'PEDIATRICIAN', label: t('Bachon ka doctor') },
  { value: 'GYNECOLOGIST', label: t('Gynae') },
  { value: 'DENTIST', label: t('Dentist') },
  { value: 'DERMATOLOGIST', label: t('Skin') },
  { value: 'CARDIOLOGIST', label: t('Dil (Cardio)') },
  { value: 'ENT_SPECIALIST', label: t('ENT') },
  { value: 'OPHTHALMOLOGIST', label: t('Aankh') },
  { value: 'ORTHOPEDIC', label: t('Haddi (Ortho)') },
  { value: 'NEUROLOGIST', label: t('Neuro') },
  { value: 'PSYCHIATRIST', label: t('Psychiatrist') },
  { value: 'ENDOCRINOLOGIST', label: t('Sugar / Hormone') },
  { value: 'UROLOGIST', label: t('Urology') },
  { value: 'SURGEON', label: t('Surgeon') },
  { value: 'PHYSIOTHERAPIST', label: t('Physio') },
  { value: 'NUTRITIONIST', label: t('Diet') },
  { value: 'HOMEOPATH', label: t('Homeopath') },
  { value: 'HAKEEM', label: t('Hakeem') },
  { value: 'PATHOLOGIST', label: t('Lab (Pathology)') },
  { value: 'RADIOLOGIST', label: t('X-ray / Ultrasound') },
  { value: 'VETERINARY', label: t('Janwaron ka doctor') },
  { value: 'OTHER', label: t('Other') },
];
export const specialtyLabel = (s?: string | null) => SPECIALTIES.find((x) => x.value === s)?.label ?? (s ? s.replace(/_/g, ' ').toLowerCase() : '');

export const DAYS = [t('Itwar'), t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta')];

/** "Dr. Ayesha Malik" without doubling the title. */
export const drName = (d?: { fullName?: string | null; title?: string | null } | null) => {
  if (!d?.fullName) return '';
  const name = d.fullName.trim().replace(/^dr\.?\s+/i, '');
  return `${(d.title || 'Dr.').trim()} ${name}`;
};

/** Age in years (or months under two) from a birth date. */
export function ageOf(dob?: string | null): string {
  if (!dob) return '';
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return '';
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return '';
  return months < 24 ? `${months} mah` : `${Math.floor(months / 12)} saal`;
}

/** "Saima Bibi · 34 saal · Aurat" */
export const patientLine = (p?: { fullName?: string; dateOfBirth?: string | null; gender?: string | null } | null) =>
  p ? [p.fullName, ageOf(p.dateOfBirth), genderLabel(p.gender)].filter(Boolean).join(' · ') : '';

export const shortDate = (v?: string | Date | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');
export const timeOf = (v?: string | Date | null) => (v ? new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '');
export const dateTime = (v?: string | Date | null) => (v ? `${shortDate(v)} · ${timeOf(v)}` : '—');

/** Local calendar day as yyyy-mm-dd. */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Start and end of a local calendar day (appointments are calendar dates, not business days). */
export const dayBounds = (key: string) => ({ from: new Date(`${key}T00:00:00`).toISOString(), to: new Date(`${key}T23:59:59.999`).toISOString() });

export const formatCnic = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 13);
  return d.length > 12 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

/** Server message for a failed request, in the shop's words. */
export const apiError = (e: unknown, fallback = t('Save nahi hua')) => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? fallback;
};

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
