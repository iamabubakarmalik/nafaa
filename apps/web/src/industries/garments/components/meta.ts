/**
 * Labels, steps and small helpers shared by the garments pages: order and
 * ticket statuses with their next step, garment types, genders, seasons,
 * dates in the shop's day, money left and API errors.
 */

import type { AlterationStatus } from '../api/alterations.api';
import type { Priority, TailoringStatus } from '../api/tailoring.api';

/** Query roots; every garments screen refreshes these after a change. */
export const TAILORING_KEY = 'garments-tailoring';
export const ALTERATION_KEY = 'garments-alterations';
export const HOLD_KEY = 'garments-reservations';
export const LAYAWAY_KEY = 'garments-layaway';
export const MEASURE_KEY = 'garments-measurements';
export const COLLECTION_KEY = 'garments-collections';
export const SIZE_CHART_KEY = 'garments-size-charts';
export const META_KEY = 'garments-meta';
/** Screens outside garments that show the same money. */
export const MONEY_KEYS = ['garments-dashboard', 'customers', 'khata', 'sales', 'dashboard', 'products-for-pos'];

export const TONE = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  green: 'bg-success-50 text-success-700 ring-success-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
} as const;

interface StatusMeta { label: string; tone: string }

/* ───────────────────────── tailoring ───────────────────────── */

const TAILORING_STATUS: Record<TailoringStatus, StatusMeta> = {
  DRAFT: { label: 'Poocha hai', tone: TONE.slate },
  QUOTED: { label: 'Rate bataya', tone: TONE.sky },
  CONFIRMED: { label: 'Order pakka', tone: TONE.blue },
  FABRIC_PENDING: { label: 'Kapre ka intezar', tone: TONE.amber },
  CUTTING: { label: 'Cutting', tone: TONE.orange },
  STITCHING: { label: 'Silai ho rahi', tone: TONE.orange },
  EMBROIDERY: { label: 'Kadhai', tone: TONE.fuchsia },
  QUALITY_CHECK: { label: 'Trial / fitting', tone: TONE.violet },
  READY: { label: 'Tayyar hai', tone: TONE.green },
  DELIVERED: { label: 'De diya', tone: TONE.green },
  CANCELLED: { label: 'Cancel', tone: TONE.rose },
  ON_HOLD: { label: 'Ruka hua', tone: TONE.slate },
};
export const tailoringStatus = (s?: string | null): StatusMeta => TAILORING_STATUS[s as TailoringStatus] ?? { label: String(s ?? '—'), tone: TONE.slate };

/** 'DELIVER' opens the hand-over window (bill and money). */
interface NextStep<S> { to: S | 'DELIVER'; label: string }

export function tailoringNext(s: TailoringStatus): NextStep<TailoringStatus> | null {
  switch (s) {
    case 'DRAFT':
    case 'QUOTED': return { to: 'CONFIRMED', label: 'Pakka karein' };
    case 'CONFIRMED':
    case 'FABRIC_PENDING':
    case 'ON_HOLD': return { to: 'CUTTING', label: 'Cutting shuru' };
    case 'CUTTING': return { to: 'STITCHING', label: 'Silai shuru' };
    case 'STITCHING':
    case 'EMBROIDERY': return { to: 'QUALITY_CHECK', label: 'Trial ke liye' };
    case 'QUALITY_CHECK': return { to: 'READY', label: 'Tayyar hai' };
    case 'READY': return { to: 'DELIVER', label: 'De diya — bill' };
    default: return null;
  }
}

/** One step back when the wrong button was pressed. */
export const TAILORING_PREV: Partial<Record<TailoringStatus, TailoringStatus>> = {
  CONFIRMED: 'DRAFT', CUTTING: 'CONFIRMED', STITCHING: 'CUTTING', EMBROIDERY: 'STITCHING', QUALITY_CHECK: 'STITCHING', READY: 'QUALITY_CHECK',
};

/** Visible steps of a stitching order, for the progress strip. */
export const TAILORING_FLOW: Array<{ label: string; of: TailoringStatus[] }> = [
  { label: 'Pakka', of: ['CONFIRMED', 'FABRIC_PENDING', 'ON_HOLD'] },
  { label: 'Cutting', of: ['CUTTING'] },
  { label: 'Silai', of: ['STITCHING', 'EMBROIDERY'] },
  { label: 'Trial', of: ['QUALITY_CHECK'] },
  { label: 'Tayyar', of: ['READY'] },
  { label: 'De diya', of: ['DELIVERED'] },
];
export const flowIndex = (s: TailoringStatus) => TAILORING_FLOW.findIndex((f) => f.of.includes(s));

export const isClosed = (s?: string | null) => s === 'DELIVERED' || s === 'CANCELLED';

/* ───────────────────────── alterations ───────────────────────── */

const ALTERATION_STATUS: Record<AlterationStatus, StatusMeta> = {
  RECEIVED: { label: 'Kapra aa gaya', tone: TONE.blue },
  MEASUREMENT_TAKEN: { label: 'Naap liya', tone: TONE.sky },
  IN_PROGRESS: { label: 'Kaam ho raha', tone: TONE.orange },
  READY: { label: 'Tayyar hai', tone: TONE.green },
  DELIVERED: { label: 'De diya', tone: TONE.green },
  CANCELLED: { label: 'Cancel', tone: TONE.rose },
};
export const alterationStatus = (s?: string | null): StatusMeta => ALTERATION_STATUS[s as AlterationStatus] ?? { label: String(s ?? '—'), tone: TONE.slate };

export function alterationNext(s: AlterationStatus): NextStep<AlterationStatus> | null {
  switch (s) {
    case 'RECEIVED':
    case 'MEASUREMENT_TAKEN': return { to: 'IN_PROGRESS', label: 'Kaam shuru' };
    case 'IN_PROGRESS': return { to: 'READY', label: 'Tayyar hai' };
    case 'READY': return { to: 'DELIVER', label: 'De diya' };
    default: return null;
  }
}
export const ALTERATION_PREV: Partial<Record<AlterationStatus, AlterationStatus>> = { IN_PROGRESS: 'RECEIVED', READY: 'IN_PROGRESS' };

/** Common alteration jobs, as the counter says them. */
export const ALTERATION_TYPES = ['Lambai kam', 'Lambai zyada', 'Kamar tight', 'Kamar dheeli', 'Bazu chhote', 'Fitting', 'Zip / button', 'Pancha', 'Rafu / murammat'];

/* ───────────────────────── priority ───────────────────────── */

export const PRIORITIES: Array<{ value: Priority; label: string; tone: string }> = [
  { value: 'LOW', label: 'Aaram se', tone: TONE.slate },
  { value: 'NORMAL', label: 'Aam', tone: TONE.slate },
  { value: 'HIGH', label: 'Jaldi', tone: TONE.amber },
  { value: 'URGENT', label: 'Bohat jaldi', tone: TONE.rose },
];
export const priorityOf = (p?: string | null) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1];

/* ───────────────────────── garments ───────────────────────── */

export const GARMENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'SHALWAR_KAMEEZ', label: 'Shalwar kameez' }, { value: 'KURTA_SHALWAR', label: 'Kurta shalwar' }, { value: 'KURTA', label: 'Kurta' },
  { value: 'THREE_PIECE', label: '3 piece suit' }, { value: 'TWO_PIECE', label: '2 piece' }, { value: 'SUIT', label: 'Pant coat' },
  { value: 'WAISTCOAT', label: 'Waistcoat' }, { value: 'SHIRT', label: 'Shirt' }, { value: 'T_SHIRT', label: 'T-shirt' }, { value: 'POLO', label: 'Polo' },
  { value: 'TROUSER', label: 'Trouser' }, { value: 'JEANS', label: 'Jeans' }, { value: 'SHORTS', label: 'Shorts' },
  { value: 'FROCK', label: 'Frock' }, { value: 'GOWN', label: 'Gown' }, { value: 'MAXI', label: 'Maxi' }, { value: 'LEHENGA', label: 'Lehnga' },
  { value: 'SAREE', label: 'Saree' }, { value: 'SKIRT', label: 'Skirt' }, { value: 'TOP', label: 'Top' }, { value: 'ABAYA', label: 'Abaya' },
  { value: 'HIJAB', label: 'Hijab' }, { value: 'DUPATTA', label: 'Dupatta' }, { value: 'JACKET', label: 'Jacket' }, { value: 'COAT', label: 'Coat' },
  { value: 'SWEATER', label: 'Sweater' }, { value: 'HOODIE', label: 'Hoodie' }, { value: 'TRACK_SUIT', label: 'Track suit' },
  { value: 'NIGHTWEAR', label: 'Night suit' }, { value: 'UNDERGARMENT', label: 'Undergarment' }, { value: 'SOCKS', label: 'Jurabein' },
  { value: 'ACCESSORY', label: 'Accessory' }, { value: 'FABRIC', label: 'Kapra (unstitched)' }, { value: 'OTHER', label: 'Doosra' },
];
export const garmentLabel = (v?: string | null) => GARMENT_TYPES.find((g) => g.value === v)?.label ?? (v ? v.replace(/_/g, ' ').toLowerCase() : '—');

export const GENDERS: Array<{ value: string; label: string }> = [
  { value: 'MEN', label: 'Gents' }, { value: 'WOMEN', label: 'Ladies' }, { value: 'BOYS', label: 'Larke' },
  { value: 'GIRLS', label: 'Larkiyan' }, { value: 'KIDS', label: 'Bachay' }, { value: 'BABY', label: 'Baby' }, { value: 'UNISEX', label: 'Sab ke liye' },
];
export const genderLabel = (v?: string | null) => GENDERS.find((g) => g.value === v)?.label ?? '—';

export const SEASONS: Array<{ value: string; label: string }> = [
  { value: 'SUMMER', label: 'Garmi' }, { value: 'WINTER', label: 'Sardi' }, { value: 'SPRING', label: 'Bahar' }, { value: 'AUTUMN', label: 'Khizan' },
  { value: 'EID_COLLECTION', label: 'Eid' }, { value: 'WEDDING_COLLECTION', label: 'Shadi' }, { value: 'FESTIVE_COLLECTION', label: 'Tehwar' },
  { value: 'RAMADAN_COLLECTION', label: 'Ramzan' }, { value: 'SCHOOL_COLLECTION', label: 'School' }, { value: 'ALL_SEASON', label: 'Har mausam' },
];
export const seasonLabel = (v?: string | null) => SEASONS.find((s) => s.value === v)?.label ?? '—';

export const FABRICS = ['LAWN', 'COTTON', 'KHADDAR', 'KARANDI', 'LINEN', 'CAMBRIC', 'CHIFFON', 'SILK', 'ORGANZA', 'NET', 'GEORGETTE', 'VELVET', 'WOOL', 'DENIM', 'JERSEY', 'POLYESTER', 'VISCOSE', 'LEATHER', 'MIXED', 'OTHER'];
export const fabricLabel = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase() : '—');

/** Body measurements with the words a tailor uses. */
export const MEASURE_LABELS: Record<string, string> = {
  neck: 'Gala', shoulder: 'Teera', chest: 'Chhati', bust: 'Seena', waist: 'Kamar', hip: 'Hip', armhole: 'Armhole', bicep: 'Bazu (mota)',
  wrist: 'Kalai', sleeveLength: 'Bazu lambai', shirtLength: 'Shirt lambai', kurtaLength: 'Kameez lambai', daman: 'Daman', trouserLength: 'Pant lambai',
  shalwarLength: 'Shalwar lambai', shalwarBottom: 'Pancha', inseam: 'Andar lambai', thigh: 'Ran', knee: 'Ghutna', bottom: 'Mori',
};

/* ───────────────────────── money and dates ───────────────────────── */

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const dueOf = (o: { total: number; paidAmount: number }) => Math.max(r2(Number(o.total || 0) - Number(o.paidAmount || 0)), 0);

export const dayOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
export const dayFull = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Whole days from today to a date (negative when past), on this device's calendar. */
export function daysFrom(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** "Aaj", "Kal", "3 din baad", "2 din late". */
export function whenText(iso?: string | null, done = false): string {
  const d = daysFrom(iso);
  if (d === null) return 'Date nahi';
  if (d === 0) return 'Aaj';
  if (d === 1) return 'Kal';
  if (d > 1) return `${d} din baad`;
  return done ? `${-d} din pehle` : `${-d} din late`;
}

/** yyyy-mm-dd of a date on this device, for <input type="date">. */
export function dayInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const plusDays = (n: number) => dayInput(new Date(Date.now() + n * 86_400_000).toISOString());

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Empty text becomes undefined so the API keeps optional fields out. */
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
