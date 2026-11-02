/**
 * Labels, steps and small helpers shared by the garments pages: order and
 * ticket statuses with their next step, garment types, genders, seasons,
 * dates in the shop's day, money left and API errors.
 */

import type { AlterationStatus } from '../api/alterations.api';
import type { Priority, TailoringStatus } from '../api/tailoring.api';
import { msg, t } from '@core/i18n';

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
  DRAFT: { label: t('Poocha hai'), tone: TONE.slate },
  QUOTED: { label: t('Rate bataya'), tone: TONE.sky },
  CONFIRMED: { label: t('Order pakka'), tone: TONE.blue },
  FABRIC_PENDING: { label: t('Kapre ka intezar'), tone: TONE.amber },
  CUTTING: { label: t('Cutting'), tone: TONE.orange },
  STITCHING: { label: t('Silai ho rahi'), tone: TONE.orange },
  EMBROIDERY: { label: t('Kadhai'), tone: TONE.fuchsia },
  QUALITY_CHECK: { label: t('Trial / fitting'), tone: TONE.violet },
  READY: { label: t('Tayyar hai'), tone: TONE.green },
  DELIVERED: { label: t('De diya'), tone: TONE.green },
  CANCELLED: { label: t('Cancel'), tone: TONE.rose },
  ON_HOLD: { label: t('Ruka hua'), tone: TONE.slate },
};
export const tailoringStatus = (s?: string | null): StatusMeta => TAILORING_STATUS[s as TailoringStatus] ?? { label: String(s ?? '—'), tone: TONE.slate };

/** 'DELIVER' opens the hand-over window (bill and money). */
interface NextStep<S> { to: S | 'DELIVER'; label: string }

export function tailoringNext(s: TailoringStatus): NextStep<TailoringStatus> | null {
  switch (s) {
    case 'DRAFT':
    case 'QUOTED': return { to: 'CONFIRMED', label: t('Pakka karein') };
    case 'CONFIRMED':
    case 'FABRIC_PENDING':
    case 'ON_HOLD': return { to: 'CUTTING', label: t('Cutting shuru') };
    case 'CUTTING': return { to: 'STITCHING', label: t('Silai shuru') };
    case 'STITCHING':
    case 'EMBROIDERY': return { to: 'QUALITY_CHECK', label: t('Trial ke liye') };
    case 'QUALITY_CHECK': return { to: 'READY', label: t('Tayyar hai') };
    case 'READY': return { to: 'DELIVER', label: t('De diya — bill') };
    default: return null;
  }
}

/** One step back when the wrong button was pressed. */
export const TAILORING_PREV: Partial<Record<TailoringStatus, TailoringStatus>> = {
  CONFIRMED: 'DRAFT', CUTTING: 'CONFIRMED', STITCHING: 'CUTTING', EMBROIDERY: 'STITCHING', QUALITY_CHECK: 'STITCHING', READY: 'QUALITY_CHECK',
};

/** Visible steps of a stitching order, for the progress strip. */
export const TAILORING_FLOW: Array<{ label: string; of: TailoringStatus[] }> = [
  { label: t('Pakka'), of: ['CONFIRMED', 'FABRIC_PENDING', 'ON_HOLD'] },
  { label: t('Cutting'), of: ['CUTTING'] },
  { label: t('Silai'), of: ['STITCHING', 'EMBROIDERY'] },
  { label: t('Trial'), of: ['QUALITY_CHECK'] },
  { label: t('Tayyar'), of: ['READY'] },
  { label: t('De diya'), of: ['DELIVERED'] },
];
export const flowIndex = (s: TailoringStatus) => TAILORING_FLOW.findIndex((f) => f.of.includes(s));

export const isClosed = (s?: string | null) => s === 'DELIVERED' || s === 'CANCELLED';

/* ───────────────────────── alterations ───────────────────────── */

const ALTERATION_STATUS: Record<AlterationStatus, StatusMeta> = {
  RECEIVED: { label: t('Kapra aa gaya'), tone: TONE.blue },
  MEASUREMENT_TAKEN: { label: t('Naap liya'), tone: TONE.sky },
  IN_PROGRESS: { label: t('Kaam ho raha'), tone: TONE.orange },
  READY: { label: t('Tayyar hai'), tone: TONE.green },
  DELIVERED: { label: t('De diya'), tone: TONE.green },
  CANCELLED: { label: t('Cancel'), tone: TONE.rose },
};
export const alterationStatus = (s?: string | null): StatusMeta => ALTERATION_STATUS[s as AlterationStatus] ?? { label: String(s ?? '—'), tone: TONE.slate };

export function alterationNext(s: AlterationStatus): NextStep<AlterationStatus> | null {
  switch (s) {
    case 'RECEIVED':
    case 'MEASUREMENT_TAKEN': return { to: 'IN_PROGRESS', label: t('Kaam shuru') };
    case 'IN_PROGRESS': return { to: 'READY', label: t('Tayyar hai') };
    case 'READY': return { to: 'DELIVER', label: t('De diya') };
    default: return null;
  }
}
export const ALTERATION_PREV: Partial<Record<AlterationStatus, AlterationStatus>> = { IN_PROGRESS: 'RECEIVED', READY: 'IN_PROGRESS' };

/** Common alteration jobs, as the counter says them. */
export const ALTERATION_TYPES: string[] = [msg('Lambai kam'), msg('Lambai zyada'), msg('Kamar tight'), msg('Kamar dheeli'), msg('Bazu chhote'), msg('Fitting'), msg('Zip / button'), msg('Pancha'), msg('Rafu / murammat')];

/* ───────────────────────── priority ───────────────────────── */

export const PRIORITIES: Array<{ value: Priority; label: string; tone: string }> = [
  { value: 'LOW', label: t('Aaram se'), tone: TONE.slate },
  { value: 'NORMAL', label: t('Aam'), tone: TONE.slate },
  { value: 'HIGH', label: t('Jaldi'), tone: TONE.amber },
  { value: 'URGENT', label: t('Bohat jaldi'), tone: TONE.rose },
];
export const priorityOf = (p?: string | null) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1];

/* ───────────────────────── garments ───────────────────────── */

export const GARMENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'SHALWAR_KAMEEZ', label: t('Shalwar kameez') }, { value: 'KURTA_SHALWAR', label: t('Kurta shalwar') }, { value: 'KURTA', label: t('Kurta') },
  { value: 'THREE_PIECE', label: t('3 piece suit') }, { value: 'TWO_PIECE', label: t('2 piece') }, { value: 'SUIT', label: t('Pant coat') },
  { value: 'WAISTCOAT', label: t('Waistcoat') }, { value: 'SHIRT', label: t('Shirt') }, { value: 'T_SHIRT', label: t('T-shirt') }, { value: 'POLO', label: t('Polo') },
  { value: 'TROUSER', label: t('Trouser') }, { value: 'JEANS', label: t('Jeans') }, { value: 'SHORTS', label: t('Shorts') },
  { value: 'FROCK', label: t('Frock') }, { value: 'GOWN', label: t('Gown') }, { value: 'MAXI', label: t('Maxi') }, { value: 'LEHENGA', label: t('Lehnga') },
  { value: 'SAREE', label: t('Saree') }, { value: 'SKIRT', label: t('Skirt') }, { value: 'TOP', label: t('Top') }, { value: 'ABAYA', label: t('Abaya') },
  { value: 'HIJAB', label: t('Hijab') }, { value: 'DUPATTA', label: t('Dupatta') }, { value: 'JACKET', label: t('Jacket') }, { value: 'COAT', label: t('Coat') },
  { value: 'SWEATER', label: t('Sweater') }, { value: 'HOODIE', label: t('Hoodie') }, { value: 'TRACK_SUIT', label: t('Track suit') },
  { value: 'NIGHTWEAR', label: t('Night suit') }, { value: 'UNDERGARMENT', label: t('Undergarment') }, { value: 'SOCKS', label: t('Jurabein') },
  { value: 'ACCESSORY', label: t('Accessory') }, { value: 'FABRIC', label: t('Kapra (unstitched)') }, { value: 'OTHER', label: t('Doosra') },
];
export const garmentLabel = (v?: string | null) => GARMENT_TYPES.find((g) => g.value === v)?.label ?? (v ? v.replace(/_/g, ' ').toLowerCase() : '—');

export const GENDERS: Array<{ value: string; label: string }> = [
  { value: 'MEN', label: t('Gents') }, { value: 'WOMEN', label: t('Ladies') }, { value: 'BOYS', label: t('Larke') },
  { value: 'GIRLS', label: t('Larkiyan') }, { value: 'KIDS', label: t('Bachay') }, { value: 'BABY', label: t('Baby') }, { value: 'UNISEX', label: t('Sab ke liye') },
];
export const genderLabel = (v?: string | null) => GENDERS.find((g) => g.value === v)?.label ?? '—';

export const SEASONS: Array<{ value: string; label: string }> = [
  { value: 'SUMMER', label: t('Garmi') }, { value: 'WINTER', label: t('Sardi') }, { value: 'SPRING', label: t('Bahar') }, { value: 'AUTUMN', label: t('Khizan') },
  { value: 'EID_COLLECTION', label: t('Eid') }, { value: 'WEDDING_COLLECTION', label: t('Shadi') }, { value: 'FESTIVE_COLLECTION', label: t('Tehwar') },
  { value: 'RAMADAN_COLLECTION', label: t('Ramzan') }, { value: 'SCHOOL_COLLECTION', label: t('School') }, { value: 'ALL_SEASON', label: t('Har mausam') },
];
export const seasonLabel = (v?: string | null) => SEASONS.find((s) => s.value === v)?.label ?? '—';

export const FABRICS = ['LAWN', 'COTTON', 'KHADDAR', 'KARANDI', 'LINEN', 'CAMBRIC', 'CHIFFON', 'SILK', 'ORGANZA', 'NET', 'GEORGETTE', 'VELVET', 'WOOL', 'DENIM', 'JERSEY', 'POLYESTER', 'VISCOSE', 'LEATHER', 'MIXED', 'OTHER'];
export const fabricLabel = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase() : '—');

/** Body measurements with the words a tailor uses. */
export const MEASURE_LABELS: Record<string, string> = {
  neck: t('Gala'), shoulder: t('Teera'), chest: t('Chhati'), bust: t('Seena'), waist: t('Kamar'), hip: t('Hip'), armhole: t('Armhole'), bicep: t('Bazu (mota)'),
  wrist: t('Kalai'), sleeveLength: t('Bazu lambai'), shirtLength: t('Shirt lambai'), kurtaLength: t('Kameez lambai'), daman: t('Daman'), trouserLength: t('Pant lambai'),
  shalwarLength: t('Shalwar lambai'), shalwarBottom: t('Pancha'), inseam: t('Andar lambai'), thigh: t('Ran'), knee: t('Ghutna'), bottom: t('Mori'),
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
  if (d === null) return t('Date nahi');
  if (d === 0) return t('Aaj');
  if (d === 1) return t('Kal');
  if (d > 1) return t('{{d}} din baad', { d });
  return done ? t('{{value}} din pehle', { value: -d }) : t('{{value}} din late', { value: -d });
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
