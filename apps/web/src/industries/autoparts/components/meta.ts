/**
 * Labels, colours and small helpers shared by the auto parts and workshop
 * pages: job statuses and types, part categories and conditions, vehicle
 * types, dates, WhatsApp links and API error text.
 */

import type { JobPriority, JobStatus, JobType } from '../api/workshop-jobs.api';
import type { PartCategory, PartCondition } from '../api/part-profiles.api';
import type { VehicleType } from '../api/vehicle-models.api';
import { t as tr } from '@core/i18n';

/** Query roots; every workshop screen refreshes these after a change. */
export const JOB_KEY = 'workshop-jobs';
export const VEHICLE_KEY = 'autoparts-vehicles';
export const REMINDER_KEY = 'autoparts-reminders';
export const CORE_KEY = 'autoparts-core-returns';
export const MECHANIC_KEY = 'autoparts-mechanics';
export const MAKES_KEY = 'vehicle-makes';
export const MODELS_KEY = 'vehicle-models';

/** Keys other screens read (dashboard, POS, products, khata) that move with job money and stock. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'autoparts-dashboard', 'khata', 'customers', 'cash-register', 'products-catalog', 'products-for-pos', 'workshop-stats'];

interface Meta { label: string; tone: string; color: string }

const tone = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
const pick = <K extends string>(map: Record<K, Meta>, k?: string | null): Meta => map[k as K] ?? { label: nice(k), tone: tone.slate, color: '#94a3b8' };

/* ── Job status ── */
const STATUS: Record<JobStatus, Meta> = {
  DRAFT: { label: tr('Gaari aayi'), tone: tone.sky, color: '#0ea5e9' },
  QUOTED: { label: tr('Andaza diya'), tone: tone.blue, color: '#3b82f6' },
  WAITING_APPROVAL: { label: tr('Customer ki haan baqi'), tone: tone.amber, color: '#f59e0b' },
  APPROVED: { label: tr('Haan ho gayi'), tone: tone.blue, color: '#2563eb' },
  IN_PROGRESS: { label: tr('Kaam chal raha'), tone: tone.violet, color: '#8b5cf6' },
  WAITING_PARTS: { label: tr('Parts ka intezar'), tone: tone.orange, color: '#f97316' },
  ON_HOLD: { label: tr('Ruka hua'), tone: tone.slate, color: '#64748b' },
  READY_FOR_TEST: { label: tr('Test drive'), tone: tone.teal, color: '#14b8a6' },
  QUALITY_CHECK: { label: tr('Check ho raha'), tone: tone.teal, color: '#0d9488' },
  COMPLETED: { label: tr('Tayyar — deni hai'), tone: tone.green, color: '#16a34a' },
  DELIVERED: { label: tr('Gaari de di'), tone: tone.slate, color: '#475569' },
  CANCELLED: { label: tr('Cancel'), tone: tone.rose, color: '#e11d48' },
};
export const statusOf = (s?: string | null) => pick(STATUS, s);
/** The usual path of a job, for the step bar and "next step" button. */
export const JOB_FLOW: JobStatus[] = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'];
/** Side states a job can be put in while it is open. */
export const JOB_SIDE: JobStatus[] = ['WAITING_APPROVAL', 'WAITING_PARTS', 'ON_HOLD', 'READY_FOR_TEST'];
export const READY: JobStatus[] = ['READY_FOR_TEST', 'QUALITY_CHECK', 'COMPLETED'];
export const isClosed = (s: JobStatus) => s === 'DELIVERED' || s === 'CANCELLED';

/* ── Priority ── */
const PRIORITY: Record<JobPriority, Meta> = {
  LOW: { label: tr('Aram se'), tone: tone.slate, color: '#94a3b8' },
  NORMAL: { label: tr('Normal'), tone: tone.slate, color: '#64748b' },
  HIGH: { label: tr('Jaldi'), tone: tone.amber, color: '#f59e0b' },
  URGENT: { label: tr('Foran'), tone: tone.orange, color: '#f97316' },
  EMERGENCY: { label: tr('Emergency'), tone: tone.rose, color: '#e11d48' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = Object.keys(PRIORITY) as JobPriority[];

/* ── Job type ── */
const JOB_TYPE: Record<JobType, string> = {
  GENERAL_SERVICE: tr('General service'), OIL_CHANGE: tr('Oil change'), TUNE_UP: tr('Tuning'), MAJOR_SERVICE: tr('Bari service'), MINOR_SERVICE: tr('Chhoti service'),
  REPAIR: tr('Repair'), DIAGNOSTIC: tr('Check-up'), BODY_WORK: tr('Body ka kaam'), PAINT: tr('Paint'), ELECTRICAL: tr('Bijli ka kaam'), AC_SERVICE: tr('AC service'),
  TIRE_CHANGE: tr('Tyre'), BATTERY_CHANGE: tr('Battery'), BRAKE_SERVICE: tr('Brake'), ENGINE_REBUILD: tr('Engine overhaul'), TRANSMISSION_REPAIR: tr('Gear box'),
  DENTING_PAINTING: tr('Denting painting'), WHEEL_ALIGNMENT: tr('Alignment / balancing'), ACCIDENT_REPAIR: tr('Accident repair'), INSPECTION: tr('Inspection'),
  MODIFICATION: tr('Modification'), DETAILING: tr('Detailing'), WASHING: tr('Washing'), OTHER: tr('Kuch aur'),
};
export const jobTypeOf = (t?: string | null) => JOB_TYPE[t as JobType] ?? nice(t);
/** Most common first; the form shows these as chips. */
export const JOB_TYPES: JobType[] = ['GENERAL_SERVICE', 'OIL_CHANGE', 'TUNE_UP', 'BRAKE_SERVICE', 'REPAIR', 'ELECTRICAL', 'AC_SERVICE', 'DIAGNOSTIC',
  'DENTING_PAINTING', 'WHEEL_ALIGNMENT', 'TIRE_CHANGE', 'BATTERY_CHANGE', 'ENGINE_REBUILD', 'TRANSMISSION_REPAIR', 'ACCIDENT_REPAIR', 'WASHING', 'OTHER'];

/* ── Parts ── */
const CATEGORY: Record<PartCategory, string> = {
  ENGINE: tr('Engine'), TRANSMISSION: tr('Gear box'), BRAKES: tr('Brake'), SUSPENSION: tr('Suspension'), ELECTRICAL: tr('Bijli'), BATTERY: tr('Battery'), COOLING: tr('Radiator / cooling'),
  EXHAUST: tr('Silencer'), FUEL_SYSTEM: tr('Fuel system'), BODY: tr('Body'), INTERIOR: tr('Andar ka saman'), LIGHTING: tr('Lights'), TIRES_WHEELS: tr('Tyre / rim'),
  FILTERS: tr('Filter'), OILS_FLUIDS: tr('Oil / fluids'), BELTS_HOSES: tr('Belt / pipe'), IGNITION: tr('Plug / ignition'), AC_HEATING: tr('AC / heater'), STEERING: tr('Steering'),
  DRIVETRAIN: tr('Axle / drive'), BEARINGS: tr('Bearing'), GASKETS: tr('Gasket / seal'), SENSORS: tr('Sensor'), ACCESSORIES: tr('Accessories'), TOOLS: tr('Auzaar'),
  CONSUMABLES: tr('Rozana ka saman'), OTHER: tr('Kuch aur'),
};
export const categoryOf = (c?: string | null) => CATEGORY[c as PartCategory] ?? nice(c);
export const CATEGORIES = Object.keys(CATEGORY) as PartCategory[];

const CONDITION: Record<PartCondition, Meta & { hint: string }> = {
  GENUINE: { label: tr('Genuine'), hint: tr('Company ka asli part'), tone: tone.green, color: '#16a34a' },
  OEM: { label: tr('OEM'), hint: tr('Company ke supplier ka bana'), tone: tone.teal, color: '#0d9488' },
  NEW: { label: tr('Naya'), hint: tr('Naya part'), tone: tone.blue, color: '#2563eb' },
  AFTERMARKET: { label: tr('Aftermarket'), hint: tr('Doosri company ka'), tone: tone.violet, color: '#7c3aed' },
  LOCAL: { label: tr('Local'), hint: tr('Pakistan me bana'), tone: tone.amber, color: '#d97706' },
  REFURBISHED: { label: tr('Repair shuda'), hint: tr('Theek kiya hua'), tone: tone.orange, color: '#ea580c' },
  USED: { label: tr('Used / kabari'), hint: tr('Purana part'), tone: tone.slate, color: '#64748b' },
};
export const conditionOf = (c?: string | null) => CONDITION[c as PartCondition] ?? { label: nice(c), hint: '', tone: tone.slate, color: '#94a3b8' };
export const CONDITIONS = Object.keys(CONDITION) as PartCondition[];

/* ── Vehicles ── */
const VEHICLE_TYPE: Record<VehicleType, string> = {
  CAR: tr('Car'), SUV: tr('Jeep / SUV'), VAN: tr('Van'), PICKUP: tr('Pickup'), TRUCK: tr('Truck'), BUS: tr('Bus'), MOTORCYCLE: tr('Motorcycle'), SCOOTER: tr('Scooty'),
  RICKSHAW: tr('Rickshaw'), TRACTOR: tr('Tractor'), BICYCLE: tr('Cycle'), ATV: 'ATV', BOAT: tr('Kashti'), OTHER: tr('Kuch aur'),
};
export const vehicleTypeOf = (t?: string | null) => VEHICLE_TYPE[t as VehicleType] ?? nice(t);
export const VEHICLE_TYPES: VehicleType[] = ['CAR', 'MOTORCYCLE', 'SUV', 'VAN', 'PICKUP', 'RICKSHAW', 'TRUCK', 'BUS', 'SCOOTER', 'TRACTOR', 'OTHER'];
export const FUEL: Array<{ value: string; label: string }> = [
  { value: 'PETROL', label: tr('Petrol') }, { value: 'DIESEL', label: tr('Diesel') }, { value: 'CNG', label: tr('CNG') }, { value: 'HYBRID', label: tr('Hybrid') },
  { value: 'ELECTRIC', label: tr('Electric') }, { value: 'LPG', label: tr('LPG') },
];

/** "LEA 1234" / "ABC-123", what is written on the number plate. */
export const plate = (v?: string | null) => (v ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
export const vehicleName = (v: { makeName?: string | null; modelName?: string | null; year?: number | null }) =>
  [v.makeName, v.modelName, v.year].filter(Boolean).join(' ');

/* ── Reminders ── */
export const REMINDER_TYPES: Array<{ value: string; label: string }> = [
  { value: 'OIL_CHANGE', label: tr('Oil change') }, { value: 'GENERAL', label: tr('Service') }, { value: 'FILTER', label: tr('Filter') },
  { value: 'TIMING_BELT', label: tr('Timing belt') }, { value: 'INSURANCE', label: tr('Insurance') }, { value: 'TOKEN_TAX', label: tr('Token tax') },
  { value: 'FITNESS', label: tr('Fitness') },
];
export const reminderTypeOf = (t?: string | null) => REMINDER_TYPES.find((x) => x.value === t)?.label ?? nice(t);

/* ── Dates and text ── */
export const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const dayOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
export const km = (n?: number | null) => (n || n === 0 ? `${Math.round(n).toLocaleString('en-PK')} km` : '—');
export const money = (v: string) => v.replace(/[^\d.]/g, '');
export const digits = (v: string) => v.replace(/\D/g, '');
const pad = (n: number) => String(n).padStart(2, '0');
/** Value for a datetime-local input. */
export const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** WhatsApp link for a Pakistani number (03xx… or 923xx…). */
export function waLink(phone: string | null | undefined, text: string): string | undefined {
  const d = digits(phone ?? '');
  if (d.length < 10) return undefined;
  const intl = d.startsWith('92') ? d : d.startsWith('0') ? `92${d.slice(1)}` : `92${d}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/** The server's message, or the fallback. */
export function apiError(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || (e instanceof Error && e.message && !e.message.startsWith('Request failed') ? e.message : fallback);
}
