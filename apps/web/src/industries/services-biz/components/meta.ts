/**
 * Labels, colours and small helpers shared by the service-business pages:
 * job statuses and the usual path, priorities, place of work, service
 * categories and trades, technician states, dates, WhatsApp links and API
 * error text.
 */

import type { JobStatus, LocationType, Priority } from '../api/jobs.api';
import type { BusinessType, ServiceCategory } from '../api/catalog.api';
import type { TechLevel, TechStatus } from '../api/technicians.api';

/** Query roots; every service screen refreshes these after a change. */
export const JOB_KEY = 'svc-jobs';
export const TECH_KEY = 'svc-technicians';
export const CATALOG_KEY = 'svc-catalog';
export const QUOTE_KEY = 'svc-quotes';
export const AMC_KEY = 'svc-amc';
export const WARRANTY_KEY = 'svc-warranty';
export const COMMISSION_KEY = 'svc-commission';

/** Keys other screens read (dashboard, POS, products, khata, drawer) that move with job money and stock. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'services-dashboard', 'jobs-dashboard', 'khata', 'customers', 'cash-register', 'expenses', 'products-catalog', 'products-for-pos'];

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
export const TONES = tone;

const nice = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
const pick = <K extends string>(map: Record<K, Meta>, k?: string | null): Meta => map[k as K] ?? { label: nice(k), tone: tone.slate, color: '#94a3b8' };

/* ── Job status ── */
const STATUS: Record<JobStatus, Meta> = {
  DRAFT: { label: 'Kachi entry', tone: tone.slate, color: '#94a3b8' },
  ENQUIRY: { label: 'Poochh-taachh', tone: tone.sky, color: '#38bdf8' },
  QUOTED: { label: 'Quote diya', tone: tone.blue, color: '#3b82f6' },
  CONFIRMED: { label: 'Booked', tone: tone.sky, color: '#0ea5e9' },
  SCHEDULED: { label: 'Waqt tay', tone: tone.sky, color: '#0284c7' },
  RESCHEDULED: { label: 'Naya waqt', tone: tone.sky, color: '#0369a1' },
  ASSIGNED: { label: 'Technician laga', tone: tone.blue, color: '#2563eb' },
  DISPATCHED: { label: 'Bheja gaya', tone: tone.violet, color: '#7c3aed' },
  EN_ROUTE: { label: 'Raste me', tone: tone.violet, color: '#8b5cf6' },
  ARRIVED: { label: 'Pohanch gaya', tone: tone.violet, color: '#9333ea' },
  IN_PROGRESS: { label: 'Kaam chal raha', tone: tone.violet, color: '#6d28d9' },
  PAUSED: { label: 'Ruka hua', tone: tone.slate, color: '#64748b' },
  AWAITING_PARTS: { label: 'Parts ka intezar', tone: tone.orange, color: '#f97316' },
  AWAITING_APPROVAL: { label: 'Customer ki haan baqi', tone: tone.amber, color: '#f59e0b' },
  WARRANTY_HOLD: { label: 'Warranty par ruka', tone: tone.amber, color: '#d97706' },
  DISPUTED: { label: 'Jhagra', tone: tone.rose, color: '#be123c' },
  QUALITY_CHECK: { label: 'Tayyar — bill baqi', tone: tone.green, color: '#16a34a' },
  UNABLE_TO_COMPLETE: { label: 'Kaam nahi ho saka', tone: tone.amber, color: '#b45309' },
  COMPLETED: { label: 'Mukammal', tone: tone.slate, color: '#475569' },
  CANCELLED: { label: 'Cancel', tone: tone.rose, color: '#e11d48' },
};
export const statusOf = (s?: string | null) => pick(STATUS, s);
export const BOOKED: JobStatus[] = ['DRAFT', 'ENQUIRY', 'QUOTED', 'CONFIRMED', 'SCHEDULED', 'RESCHEDULED'];
export const WORKING: JobStatus[] = ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'PAUSED'];
export const WAITING: JobStatus[] = ['AWAITING_PARTS', 'AWAITING_APPROVAL', 'WARRANTY_HOLD', 'DISPUTED'];
export const READY: JobStatus[] = ['QUALITY_CHECK', 'UNABLE_TO_COMPLETE'];
export const isClosed = (s: JobStatus) => s === 'COMPLETED' || s === 'CANCELLED';
/** Step on the usual path: booked → technician → work → ready → billed. */
export const stepOf = (s: JobStatus) =>
  s === 'COMPLETED' ? 4 : READY.includes(s) ? 3 : ['ARRIVED', 'IN_PROGRESS', 'PAUSED', ...WAITING].includes(s) ? 2 : ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'].includes(s) ? 1 : 0;
export const STEPS = ['Booked', 'Technician', 'Kaam', 'Tayyar', 'Bill'];

/* ── Priority ── */
const PRIORITY: Record<Priority, Meta> = {
  LOW: { label: 'Aram se', tone: tone.slate, color: '#94a3b8' },
  NORMAL: { label: 'Normal', tone: tone.slate, color: '#64748b' },
  HIGH: { label: 'Jaldi', tone: tone.amber, color: '#f59e0b' },
  URGENT: { label: 'Foran', tone: tone.orange, color: '#f97316' },
  EMERGENCY: { label: 'Emergency', tone: tone.rose, color: '#e11d48' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = Object.keys(PRIORITY) as Priority[];

/* ── Where the work is done ── */
const LOCATION: Record<LocationType, string> = {
  IN_SHOP: 'Dukaan par', CUSTOMER_HOME: 'Customer ke ghar', CUSTOMER_OFFICE: 'Customer ke daftar', CUSTOMER_SHOP: 'Customer ki dukaan',
  FIELD_SITE: 'Site par', ONLINE_REMOTE: 'Online / phone par', OTHER: 'Kahin aur',
};
export const locationOf = (l?: string | null) => LOCATION[l as LocationType] ?? nice(l);
export const LOCATIONS = Object.keys(LOCATION) as LocationType[];
export const isOnSite = (l?: string | null) => !!l && l !== 'IN_SHOP' && l !== 'ONLINE_REMOTE';

/* ── Service category and trade ── */
const CATEGORY: Record<ServiceCategory, string> = {
  REPAIR: 'Repair', INSTALLATION: 'Fitting / installation', MAINTENANCE: 'Service / maintenance', INSPECTION: 'Check-up', CLEANING_SERVICE: 'Safai',
  UPGRADE: 'Upgrade', REPLACEMENT: 'Badalna', DIAGNOSTIC: 'Kharabi dhoondna', EMERGENCY: 'Emergency', CONSULTATION: 'Mashwara',
  AMC_VISIT: 'AMC visit', WARRANTY_CLAIM: 'Warranty', RETURN_VISIT: 'Wapsi visit', OTHER_SERVICE: 'Kuch aur',
};
export const categoryOf = (c?: string | null) => CATEGORY[c as ServiceCategory] ?? nice(c);
/** Categories a shop picks itself (AMC, warranty and return visits come from their own screens). */
export const CATEGORIES: ServiceCategory[] = ['REPAIR', 'INSTALLATION', 'MAINTENANCE', 'CLEANING_SERVICE', 'INSPECTION', 'DIAGNOSTIC', 'REPLACEMENT', 'UPGRADE', 'EMERGENCY', 'CONSULTATION', 'OTHER_SERVICE'];

const TRADE: Partial<Record<BusinessType, string>> = {
  AC_TECHNICIAN: 'AC', ELECTRICIAN: 'Bijli', PLUMBER: 'Plumber', APPLIANCE_REPAIR: 'Fridge / washing machine', MOBILE_REPAIR: 'Mobile', COMPUTER_REPAIR: 'Computer / laptop',
  IT_SERVICES: 'IT / network', CLEANING: 'Safai', PEST_CONTROL: 'Keera maar spray', CARPENTRY: 'Carpenter', PAINTING: 'Rang', MASONRY: 'Mistri', WELDING: 'Welding',
  GLASS_WORK: 'Sheesha', CCTV_INSTALLATION: 'CCTV', SOLAR_INSTALLATION: 'Solar', GENERATOR_SERVICE: 'Generator', UPS_SERVICE: 'UPS', WATER_TANK_CLEANING: 'Tanki safai',
  HOME_MAINTENANCE: 'Ghar ki marammat', OFFICE_MAINTENANCE: 'Daftar ki marammat', AUTOMOBILE_MECHANIC: 'Gaari mechanic', MOTORCYCLE_MECHANIC: 'Bike mechanic',
  MOVERS_PACKERS: 'Saman shifting', INTERIOR_DESIGN: 'Interior', LANDSCAPING: 'Baghbani', HVAC: 'HVAC', ELEVATOR_MAINTENANCE: 'Lift', FIRE_SAFETY: 'Fire safety',
  SECURITY_SYSTEMS: 'Security system', OTHER: 'Kuch aur',
};
export const tradeOf = (t?: string | null) => TRADE[t as BusinessType] ?? nice(t);
export const TRADES = Object.keys(TRADE) as BusinessType[];

/* ── Technicians ── */
const TECH_STATUS: Record<TechStatus, Meta> = {
  AVAILABLE: { label: 'Free', tone: tone.green, color: '#16a34a' },
  ON_JOB: { label: 'Kaam par', tone: tone.violet, color: '#7c3aed' },
  ON_BREAK: { label: 'Break', tone: tone.amber, color: '#f59e0b' },
  OFF_DUTY: { label: 'Duty khatam', tone: tone.slate, color: '#64748b' },
  ON_LEAVE: { label: 'Chhutti', tone: tone.slate, color: '#94a3b8' },
  UNAVAILABLE: { label: 'Band', tone: tone.rose, color: '#e11d48' },
};
export const techStatusOf = (s?: string | null) => pick(TECH_STATUS, s);
export const TECH_STATUSES = Object.keys(TECH_STATUS) as TechStatus[];
const LEVEL: Record<TechLevel, string> = { APPRENTICE: 'Shagird', JUNIOR: 'Junior', SENIOR: 'Senior', EXPERT: 'Expert', MASTER: 'Ustad', SUPERVISOR: 'Supervisor', MANAGER: 'Manager' };
export const levelOf = (l?: string | null) => LEVEL[l as TechLevel] ?? nice(l);
export const LEVELS = Object.keys(LEVEL) as TechLevel[];
export const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

/* ── Dates and text ── */
export const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const dayOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const daysTo = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
export const money = (v: string) => v.replace(/[^\d.]/g, '');
export const digits = (v: string) => v.replace(/\D/g, '');
const pad = (n: number) => String(n).padStart(2, '0');
/** Value for a datetime-local input. */
export const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const dateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const atHour = (days: number, hour: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d; };
/** The item worked on: "Haier 1.5 ton · SN 123". */
export const itemName = (j: { brand?: string | null; modelNumber?: string | null; serialNumber?: string | null }) =>
  [[j.brand, j.modelNumber].filter(Boolean).join(' '), j.serialNumber ? `SN ${j.serialNumber}` : ''].filter(Boolean).join(' · ');
export const placeOf = (j: { locationType?: string | null; area?: string | null; city?: string | null; serviceAddress?: string | null }) =>
  isOnSite(j.locationType) ? [j.area, j.city].filter(Boolean).join(', ') || j.serviceAddress || locationOf(j.locationType) : locationOf(j.locationType);

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
