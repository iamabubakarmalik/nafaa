/**
 * Labels, colours and small helpers shared by the service-business pages:
 * job statuses and the usual path, priorities, place of work, service
 * categories and trades, technician states, dates, WhatsApp links and API
 * error text.
 */

import type { JobStatus, LocationType, Priority } from '../api/jobs.api';
import type { BusinessType, ServiceCategory } from '../api/catalog.api';
import type { TechLevel, TechStatus } from '../api/technicians.api';
import { t as tr } from '@core/i18n';

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
  DRAFT: { label: tr('Kachi entry'), tone: tone.slate, color: '#94a3b8' },
  ENQUIRY: { label: tr('Poochh-taachh'), tone: tone.sky, color: '#38bdf8' },
  QUOTED: { label: tr('Quote diya'), tone: tone.blue, color: '#3b82f6' },
  CONFIRMED: { label: tr('Booked'), tone: tone.sky, color: '#0ea5e9' },
  SCHEDULED: { label: tr('Waqt tay'), tone: tone.sky, color: '#0284c7' },
  RESCHEDULED: { label: tr('Naya waqt'), tone: tone.sky, color: '#0369a1' },
  ASSIGNED: { label: tr('Technician laga'), tone: tone.blue, color: '#2563eb' },
  DISPATCHED: { label: tr('Bheja gaya'), tone: tone.violet, color: '#7c3aed' },
  EN_ROUTE: { label: tr('Raste me'), tone: tone.violet, color: '#8b5cf6' },
  ARRIVED: { label: tr('Pohanch gaya'), tone: tone.violet, color: '#9333ea' },
  IN_PROGRESS: { label: tr('Kaam chal raha'), tone: tone.violet, color: '#6d28d9' },
  PAUSED: { label: tr('Ruka hua'), tone: tone.slate, color: '#64748b' },
  AWAITING_PARTS: { label: tr('Parts ka intezar'), tone: tone.orange, color: '#f97316' },
  AWAITING_APPROVAL: { label: tr('Customer ki haan baqi'), tone: tone.amber, color: '#f59e0b' },
  WARRANTY_HOLD: { label: tr('Warranty par ruka'), tone: tone.amber, color: '#d97706' },
  DISPUTED: { label: tr('Jhagra'), tone: tone.rose, color: '#be123c' },
  QUALITY_CHECK: { label: tr('Tayyar — bill baqi'), tone: tone.green, color: '#16a34a' },
  UNABLE_TO_COMPLETE: { label: tr('Kaam nahi ho saka'), tone: tone.amber, color: '#b45309' },
  COMPLETED: { label: tr('Mukammal'), tone: tone.slate, color: '#475569' },
  CANCELLED: { label: tr('Cancel'), tone: tone.rose, color: '#e11d48' },
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
export const STEPS = [tr('Booked'), tr('Technician'), tr('Kaam'), tr('Tayyar'), tr('Bill')];

/* ── Priority ── */
const PRIORITY: Record<Priority, Meta> = {
  LOW: { label: tr('Aram se'), tone: tone.slate, color: '#94a3b8' },
  NORMAL: { label: tr('Normal'), tone: tone.slate, color: '#64748b' },
  HIGH: { label: tr('Jaldi'), tone: tone.amber, color: '#f59e0b' },
  URGENT: { label: tr('Foran'), tone: tone.orange, color: '#f97316' },
  EMERGENCY: { label: tr('Emergency'), tone: tone.rose, color: '#e11d48' },
};
export const priorityOf = (p?: string | null) => pick(PRIORITY, p);
export const PRIORITIES = Object.keys(PRIORITY) as Priority[];

/* ── Where the work is done ── */
const LOCATION: Record<LocationType, string> = {
  IN_SHOP: tr('Dukaan par'), CUSTOMER_HOME: tr('Customer ke ghar'), CUSTOMER_OFFICE: tr('Customer ke daftar'), CUSTOMER_SHOP: tr('Customer ki dukaan'),
  FIELD_SITE: tr('Site par'), ONLINE_REMOTE: tr('Online / phone par'), OTHER: tr('Kahin aur'),
};
export const locationOf = (l?: string | null) => LOCATION[l as LocationType] ?? nice(l);
export const LOCATIONS = Object.keys(LOCATION) as LocationType[];
export const isOnSite = (l?: string | null) => !!l && l !== 'IN_SHOP' && l !== 'ONLINE_REMOTE';

/* ── Service category and trade ── */
const CATEGORY: Record<ServiceCategory, string> = {
  REPAIR: tr('Repair'), INSTALLATION: tr('Fitting / installation'), MAINTENANCE: tr('Service / maintenance'), INSPECTION: tr('Check-up'), CLEANING_SERVICE: tr('Safai'),
  UPGRADE: tr('Upgrade'), REPLACEMENT: tr('Badalna'), DIAGNOSTIC: tr('Kharabi dhoondna'), EMERGENCY: tr('Emergency'), CONSULTATION: tr('Mashwara'),
  AMC_VISIT: tr('AMC visit'), WARRANTY_CLAIM: tr('Warranty'), RETURN_VISIT: tr('Wapsi visit'), OTHER_SERVICE: tr('Kuch aur'),
};
export const categoryOf = (c?: string | null) => CATEGORY[c as ServiceCategory] ?? nice(c);
/** Categories a shop picks itself (AMC, warranty and return visits come from their own screens). */
export const CATEGORIES: ServiceCategory[] = ['REPAIR', 'INSTALLATION', 'MAINTENANCE', 'CLEANING_SERVICE', 'INSPECTION', 'DIAGNOSTIC', 'REPLACEMENT', 'UPGRADE', 'EMERGENCY', 'CONSULTATION', 'OTHER_SERVICE'];

const TRADE: Partial<Record<BusinessType, string>> = {
  AC_TECHNICIAN: 'AC', ELECTRICIAN: tr('Bijli'), PLUMBER: tr('Plumber'), APPLIANCE_REPAIR: tr('Fridge / washing machine'), MOBILE_REPAIR: tr('Mobile'), COMPUTER_REPAIR: tr('Computer / laptop'),
  IT_SERVICES: tr('IT / network'), CLEANING: tr('Safai'), PEST_CONTROL: tr('Keera maar spray'), CARPENTRY: tr('Carpenter'), PAINTING: tr('Rang'), MASONRY: tr('Mistri'), WELDING: tr('Welding'),
  GLASS_WORK: tr('Sheesha'), CCTV_INSTALLATION: 'CCTV', SOLAR_INSTALLATION: tr('Solar'), GENERATOR_SERVICE: tr('Generator'), UPS_SERVICE: 'UPS', WATER_TANK_CLEANING: tr('Tanki safai'),
  HOME_MAINTENANCE: tr('Ghar ki marammat'), OFFICE_MAINTENANCE: tr('Daftar ki marammat'), AUTOMOBILE_MECHANIC: tr('Gaari mechanic'), MOTORCYCLE_MECHANIC: tr('Bike mechanic'),
  MOVERS_PACKERS: tr('Saman shifting'), INTERIOR_DESIGN: tr('Interior'), LANDSCAPING: tr('Baghbani'), HVAC: 'HVAC', ELEVATOR_MAINTENANCE: tr('Lift'), FIRE_SAFETY: tr('Fire safety'),
  SECURITY_SYSTEMS: tr('Security system'), OTHER: tr('Kuch aur'),
};
export const tradeOf = (t?: string | null) => TRADE[t as BusinessType] ?? nice(t);
export const TRADES = Object.keys(TRADE) as BusinessType[];

/* ── Technicians ── */
const TECH_STATUS: Record<TechStatus, Meta> = {
  AVAILABLE: { label: tr('Free'), tone: tone.green, color: '#16a34a' },
  ON_JOB: { label: tr('Kaam par'), tone: tone.violet, color: '#7c3aed' },
  ON_BREAK: { label: tr('Break'), tone: tone.amber, color: '#f59e0b' },
  OFF_DUTY: { label: tr('Duty khatam'), tone: tone.slate, color: '#64748b' },
  ON_LEAVE: { label: tr('Chhutti'), tone: tone.slate, color: '#94a3b8' },
  UNAVAILABLE: { label: tr('Band'), tone: tone.rose, color: '#e11d48' },
};
export const techStatusOf = (s?: string | null) => pick(TECH_STATUS, s);
export const TECH_STATUSES = Object.keys(TECH_STATUS) as TechStatus[];
const LEVEL: Record<TechLevel, string> = { APPRENTICE: tr('Shagird'), JUNIOR: tr('Junior'), SENIOR: tr('Senior'), EXPERT: tr('Expert'), MASTER: tr('Ustad'), SUPERVISOR: tr('Supervisor'), MANAGER: tr('Manager') };
export const levelOf = (l?: string | null) => LEVEL[l as TechLevel] ?? nice(l);
export const LEVELS = Object.keys(LEVEL) as TechLevel[];
export const DAYS = [tr('Itwar'), tr('Peer'), tr('Mangal'), tr('Budh'), tr('Jumeraat'), tr('Juma'), tr('Hafta')];

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
