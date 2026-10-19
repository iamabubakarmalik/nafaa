/** Clinic labels, colours and small formatters shared by every clinic page. */

import type { BadgeVariant } from '@/design-system/components';
import type { AppointmentStatus, FeeMethod, VisitType } from '../api/appointments.api';
import type { LabOrder } from '../api/lab-orders.api';
import type { Vaccination } from '../api/vaccinations.api';
import type { BloodGroup, Gender } from '../api/patients.api';
import type { Specialty } from '../api/doctors.api';

export const APT_STATUS: Record<AppointmentStatus, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: 'Booked', variant: 'info' },
  CONFIRMED: { label: 'Booked', variant: 'info' },
  RESCHEDULED: { label: 'Waqt badla', variant: 'info' },
  ARRIVED: { label: 'Intezar me', variant: 'warning' },
  IN_CONSULTATION: { label: 'Doctor ke paas', variant: 'brand' },
  COMPLETED: { label: 'Mukammal', variant: 'success' },
  NO_SHOW: { label: 'Nahi aaya', variant: 'default' },
  CANCELLED: { label: 'Cancel', variant: 'danger' },
};

export const VISIT_TYPES: Array<{ value: VisitType; label: string }> = [
  { value: 'FIRST_VISIT', label: 'Pehli baar' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'ROUTINE_CHECKUP', label: 'Checkup' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'VACCINATION', label: 'Vaccine' },
  { value: 'DENTAL_CHECKUP', label: 'Dental' },
  { value: 'ANTENATAL', label: 'Hamal checkup' },
  { value: 'PHYSIO_SESSION', label: 'Physio' },
  { value: 'TELEMEDICINE', label: 'Online' },
  { value: 'HOME_VISIT', label: 'Ghar par' },
];
export const visitLabel = (v?: string | null) => VISIT_TYPES.find((x) => x.value === v)?.label ?? (v ? v.replace(/_/g, ' ').toLowerCase() : '—');

export const LAB_STATUS: Record<LabOrder['status'], { label: string; variant: BadgeVariant }> = {
  ORDERED: { label: 'Likha gaya', variant: 'info' },
  SAMPLE_COLLECTED: { label: 'Sample liya', variant: 'warning' },
  IN_PROGRESS: { label: 'Lab me', variant: 'warning' },
  COMPLETED: { label: 'Mukammal', variant: 'success' },
  REPORTED: { label: 'Report tayyar', variant: 'success' },
  CANCELLED: { label: 'Cancel', variant: 'danger' },
};

export const VACCINE_STATUS: Record<Vaccination['status'], { label: string; variant: BadgeVariant }> = {
  DUE: { label: 'Baqi', variant: 'info' },
  ADMINISTERED: { label: 'Lag gayi', variant: 'success' },
  DELAYED: { label: 'Der', variant: 'warning' },
  SKIPPED: { label: 'Chhor di', variant: 'default' },
  CONTRAINDICATED: { label: 'Nahi lagani', variant: 'danger' },
};

export const PAY_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  PAID: { label: 'Bill ban gaya', variant: 'success' },
  PARTIALLY_PAID: { label: 'Kuch baqi', variant: 'warning' },
  UNPAID: { label: 'Fees baqi', variant: 'danger' },
};

export const FEE_METHODS: Array<{ value: FeeMethod; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
];

export const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'MALE', label: 'Mard' },
  { value: 'FEMALE', label: 'Aurat' },
  { value: 'OTHER', label: 'Other' },
];
export const genderLabel = (g?: string | null) => GENDERS.find((x) => x.value === g)?.label ?? '';

export const BLOOD_GROUPS: Array<{ value: BloodGroup; label: string }> = [
  { value: 'A_POS', label: 'A+' }, { value: 'A_NEG', label: 'A-' }, { value: 'B_POS', label: 'B+' }, { value: 'B_NEG', label: 'B-' },
  { value: 'AB_POS', label: 'AB+' }, { value: 'AB_NEG', label: 'AB-' }, { value: 'O_POS', label: 'O+' }, { value: 'O_NEG', label: 'O-' },
];
export const bloodLabel = (b?: string | null) => BLOOD_GROUPS.find((x) => x.value === b)?.label ?? '';

export const SPECIALTIES: Array<{ value: Specialty; label: string }> = [
  { value: 'GENERAL_PRACTITIONER', label: 'General physician' },
  { value: 'FAMILY_PHYSICIAN', label: 'Family physician' },
  { value: 'INTERNAL_MEDICINE', label: 'Medicine specialist' },
  { value: 'PEDIATRICIAN', label: 'Bachon ka doctor' },
  { value: 'GYNECOLOGIST', label: 'Gynae' },
  { value: 'DENTIST', label: 'Dentist' },
  { value: 'DERMATOLOGIST', label: 'Skin' },
  { value: 'CARDIOLOGIST', label: 'Dil (Cardio)' },
  { value: 'ENT_SPECIALIST', label: 'ENT' },
  { value: 'OPHTHALMOLOGIST', label: 'Aankh' },
  { value: 'ORTHOPEDIC', label: 'Haddi (Ortho)' },
  { value: 'NEUROLOGIST', label: 'Neuro' },
  { value: 'PSYCHIATRIST', label: 'Psychiatrist' },
  { value: 'ENDOCRINOLOGIST', label: 'Sugar / Hormone' },
  { value: 'UROLOGIST', label: 'Urology' },
  { value: 'SURGEON', label: 'Surgeon' },
  { value: 'PHYSIOTHERAPIST', label: 'Physio' },
  { value: 'NUTRITIONIST', label: 'Diet' },
  { value: 'HOMEOPATH', label: 'Homeopath' },
  { value: 'HAKEEM', label: 'Hakeem' },
  { value: 'PATHOLOGIST', label: 'Lab (Pathology)' },
  { value: 'RADIOLOGIST', label: 'X-ray / Ultrasound' },
  { value: 'VETERINARY', label: 'Janwaron ka doctor' },
  { value: 'OTHER', label: 'Other' },
];
export const specialtyLabel = (s?: string | null) => SPECIALTIES.find((x) => x.value === s)?.label ?? (s ? s.replace(/_/g, ' ').toLowerCase() : '');

export const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

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
export const apiError = (e: unknown, fallback = 'Save nahi hua') => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? fallback;
};

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
