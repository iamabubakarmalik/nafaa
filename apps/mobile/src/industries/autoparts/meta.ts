/**
 * Labels, tones and small helpers shared by the auto parts and workshop screens
 * (mirror of the web autoparts components/meta.ts): job statuses and types, part
 * categories and conditions, vehicle types, dates and query keys. Pure rules are
 * in @nafaa/core/industries/autoparts. Labels are source keys marked with msg().
 */

import { JOB_FLOW, JOB_SIDE, READY, isClosed, isReady, plate, waLink } from '@nafaa/core/industries/autoparts';
import { formatDate, formatDateTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { JobPriority, JobStatus, JobType, PartCategory, PartCondition, VehicleType } from './api';

export { JOB_FLOW, JOB_SIDE, READY, isClosed, isReady, plate, waLink };

/** Query roots; every workshop screen refreshes these after a change. */
export const JOB_KEY = 'workshop-jobs';
export const VEHICLE_KEY = 'autoparts-vehicles';
export const REMINDER_KEY = 'autoparts-reminders';
export const CORE_KEY = 'autoparts-core-returns';
export const MECHANIC_KEY = 'autoparts-mechanics';
export const MAKES_KEY = 'vehicle-makes';
export const MODELS_KEY = 'vehicle-models';
export const PART_FACTS_KEY = 'autoparts-part-facts';
export const DASH_KEY = 'autoparts-dashboard';

/** Keys other screens read (dashboard, counter, products, khata) that move with job money and stock. */
const MONEY_KEYS = ['sales-history', 'dashboard', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline', DASH_KEY, 'workshop-stats'];
export function refreshAuto(keys: string[], opts: { money?: boolean; stock?: boolean } = {}) {
  [...keys, DASH_KEY, 'workshop-stats', ...(opts.money ? MONEY_KEYS : []), ...(opts.stock ? ['inv', 'offline', PART_FACTS_KEY] : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

interface Meta { label: string; tone: StatusTone; color: string }
const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
const pick = <K extends string>(map: Record<K, Meta>, k?: string | null): Meta => map[k as K] ?? { label: nice(k), tone: 'neutral', color: '#94a3b8' };

const STATUS: Record<JobStatus, Meta> = {
  DRAFT: { label: msg('Gaari aayi'), tone: 'info', color: '#0ea5e9' },
  QUOTED: { label: msg('Andaza diya'), tone: 'info', color: '#3b82f6' },
  WAITING_APPROVAL: { label: msg('Customer ki haan baqi'), tone: 'warning', color: '#f59e0b' },
  APPROVED: { label: msg('Haan ho gayi'), tone: 'info', color: '#2563eb' },
  IN_PROGRESS: { label: msg('Kaam chal raha'), tone: 'accent', color: '#8b5cf6' },
  WAITING_PARTS: { label: msg('Parts ka intezar'), tone: 'warning', color: '#f97316' },
  ON_HOLD: { label: msg('Ruka hua'), tone: 'neutral', color: '#64748b' },
  READY_FOR_TEST: { label: msg('Test drive'), tone: 'success', color: '#14b8a6' },
  QUALITY_CHECK: { label: msg('Check ho raha'), tone: 'success', color: '#0d9488' },
  COMPLETED: { label: msg('Tayyar — deni hai'), tone: 'success', color: '#16a34a' },
  DELIVERED: { label: msg('Gaari de di'), tone: 'neutral', color: '#475569' },
  CANCELLED: { label: msg('Cancel'), tone: 'danger', color: '#e11d48' },
};
export const statusOf = (s?: string | null) => pick(STATUS, s);

const PRIORITY: Record<JobPriority, Meta> = {
  LOW: { label: msg('Aram se'), tone: 'neutral', color: '#94a3b8' }, NORMAL: { label: msg('Normal'), tone: 'neutral', color: '#64748b' },
  HIGH: { label: msg('Jaldi'), tone: 'warning', color: '#f59e0b' }, URGENT: { label: msg('Foran'), tone: 'warning', color: '#f97316' },
  EMERGENCY: { label: msg('Emergency'), tone: 'danger', color: '#e11d48' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = Object.keys(PRIORITY) as JobPriority[];

const JOB_TYPE: Record<JobType, string> = {
  GENERAL_SERVICE: msg('General service'), OIL_CHANGE: msg('Oil change'), TUNE_UP: msg('Tuning'), MAJOR_SERVICE: msg('Bari service'), MINOR_SERVICE: msg('Chhoti service'),
  REPAIR: msg('Repair'), DIAGNOSTIC: msg('Check-up'), BODY_WORK: msg('Body ka kaam'), PAINT: msg('Paint'), ELECTRICAL: msg('Bijli ka kaam'), AC_SERVICE: msg('AC service'),
  TIRE_CHANGE: msg('Tyre'), BATTERY_CHANGE: msg('Battery'), BRAKE_SERVICE: msg('Brake'), ENGINE_REBUILD: msg('Engine overhaul'), TRANSMISSION_REPAIR: msg('Gear box'),
  DENTING_PAINTING: msg('Denting painting'), WHEEL_ALIGNMENT: msg('Alignment / balancing'), ACCIDENT_REPAIR: msg('Accident repair'), INSPECTION: msg('Inspection'),
  MODIFICATION: msg('Modification'), DETAILING: msg('Detailing'), WASHING: msg('Washing'), OTHER: msg('Kuch aur'),
};
export const jobTypeOf = (v?: string | null) => (JOB_TYPE[v as JobType] ? t(JOB_TYPE[v as JobType]) : nice(v));
/** Most common first; the form shows these as chips. */
export const JOB_TYPES: JobType[] = ['GENERAL_SERVICE', 'OIL_CHANGE', 'TUNE_UP', 'BRAKE_SERVICE', 'REPAIR', 'ELECTRICAL', 'AC_SERVICE', 'DIAGNOSTIC',
  'DENTING_PAINTING', 'WHEEL_ALIGNMENT', 'TIRE_CHANGE', 'BATTERY_CHANGE', 'ENGINE_REBUILD', 'TRANSMISSION_REPAIR', 'ACCIDENT_REPAIR', 'WASHING', 'OTHER'];

const CATEGORY: Record<PartCategory, string> = {
  ENGINE: msg('Engine'), TRANSMISSION: msg('Gear box'), BRAKES: msg('Brake'), SUSPENSION: msg('Suspension'), ELECTRICAL: msg('Bijli'), BATTERY: msg('Battery'), COOLING: msg('Radiator / cooling'),
  EXHAUST: msg('Silencer'), FUEL_SYSTEM: msg('Fuel system'), BODY: msg('Body'), INTERIOR: msg('Andar ka saman'), LIGHTING: msg('Lights'), TIRES_WHEELS: msg('Tyre / rim'),
  FILTERS: msg('Filter'), OILS_FLUIDS: msg('Oil / fluids'), BELTS_HOSES: msg('Belt / pipe'), IGNITION: msg('Plug / ignition'), AC_HEATING: msg('AC / heater'), STEERING: msg('Steering'),
  DRIVETRAIN: msg('Axle / drive'), BEARINGS: msg('Bearing'), GASKETS: msg('Gasket / seal'), SENSORS: msg('Sensor'), ACCESSORIES: msg('Accessories'), TOOLS: msg('Auzaar'),
  CONSUMABLES: msg('Rozana ka saman'), OTHER: msg('Kuch aur'),
};
export const categoryOf = (c?: string | null) => (CATEGORY[c as PartCategory] ? t(CATEGORY[c as PartCategory]) : nice(c));
export const CATEGORIES = Object.keys(CATEGORY) as PartCategory[];

const CONDITION: Record<PartCondition, Meta & { hint: string }> = {
  GENUINE: { label: msg('Genuine'), hint: msg('Company ka asli part'), tone: 'success', color: '#16a34a' },
  OEM: { label: msg('OEM'), hint: msg('Company ke supplier ka bana'), tone: 'success', color: '#0d9488' },
  NEW: { label: msg('Naya'), hint: msg('Naya part'), tone: 'info', color: '#2563eb' },
  AFTERMARKET: { label: msg('Aftermarket'), hint: msg('Doosri company ka'), tone: 'accent', color: '#7c3aed' },
  LOCAL: { label: msg('Local'), hint: msg('Pakistan me bana'), tone: 'warning', color: '#d97706' },
  REFURBISHED: { label: msg('Repair shuda'), hint: msg('Theek kiya hua'), tone: 'warning', color: '#ea580c' },
  USED: { label: msg('Used / kabari'), hint: msg('Purana part'), tone: 'neutral', color: '#64748b' },
};
export const conditionOf = (c?: string | null) => CONDITION[c as PartCondition] ?? { label: nice(c), hint: '', tone: 'neutral' as StatusTone, color: '#94a3b8' };
export const CONDITIONS = Object.keys(CONDITION) as PartCondition[];

const VEHICLE_TYPE: Record<VehicleType, string> = {
  CAR: msg('Car'), SUV: msg('Jeep / SUV'), VAN: msg('Van'), PICKUP: msg('Pickup'), TRUCK: msg('Truck'), BUS: msg('Bus'), MOTORCYCLE: msg('Motorcycle'), SCOOTER: msg('Scooty'),
  RICKSHAW: msg('Rickshaw'), TRACTOR: msg('Tractor'), BICYCLE: msg('Cycle'), ATV: 'ATV', BOAT: msg('Kashti'), OTHER: msg('Kuch aur'),
};
export const vehicleTypeOf = (v?: string | null) => (VEHICLE_TYPE[v as VehicleType] ? t(VEHICLE_TYPE[v as VehicleType]) : nice(v));
export const VEHICLE_TYPES: VehicleType[] = ['CAR', 'MOTORCYCLE', 'SUV', 'VAN', 'PICKUP', 'RICKSHAW', 'TRUCK', 'BUS', 'SCOOTER', 'TRACTOR', 'OTHER'];
export const FUEL: Array<{ value: string; label: string }> = [
  { value: 'PETROL', label: msg('Petrol') }, { value: 'DIESEL', label: msg('Diesel') }, { value: 'CNG', label: msg('CNG') }, { value: 'HYBRID', label: msg('Hybrid') },
  { value: 'ELECTRIC', label: msg('Electric') }, { value: 'LPG', label: msg('LPG') },
];
export const TRANSMISSIONS: Array<{ value: string; label: string }> = [
  { value: 'MANUAL', label: msg('Manual') }, { value: 'AUTOMATIC', label: msg('Automatic') }, { value: 'CVT', label: msg('CVT') }, { value: 'DCT', label: msg('DCT') }, { value: 'SEMI_AUTO', label: msg('Semi auto') },
];

export const vehicleName = (v: { makeName?: string | null; modelName?: string | null; year?: number | null }) => [v.makeName, v.modelName, v.year].filter(Boolean).join(' ');

export const REMINDER_TYPES: Array<{ value: string; label: string }> = [
  { value: 'OIL_CHANGE', label: msg('Oil change') }, { value: 'GENERAL', label: msg('Service') }, { value: 'FILTER', label: msg('Filter') },
  { value: 'TIMING_BELT', label: msg('Timing belt') }, { value: 'INSURANCE', label: msg('Insurance') }, { value: 'TOKEN_TAX', label: msg('Token tax') }, { value: 'FITNESS', label: msg('Fitness') },
];
export const reminderTypeOf = (v?: string | null) => { const r = REMINDER_TYPES.find((x) => x.value === v); return r ? t(r.label) : nice(v); };

export const dateTime = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');
export const dayOnly = (iso?: string | null) => (iso ? formatDate(iso) : '—');
export const km = (n?: number | null) => (n || n === 0 ? `${Math.round(n).toLocaleString('en-PK')} km` : '—');
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
