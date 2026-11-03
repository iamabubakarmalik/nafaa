/**
 * Labels, tones and small helpers shared by the garments screens (mirror of
 * the web garments components/meta.ts). Labels are source keys marked with
 * msg() and translated where shown.
 */

import type { AlterationStatus, TailoringStatus, WhenKind } from '@nafaa/core/industries/garments';
import { dueOf, whenOf } from '@nafaa/core/industries/garments';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { Priority } from './api';

export { dueOf };

/** Query roots; every garments screen refreshes these after a change. */
export const TAILORING_KEY = 'garments-tailoring';
export const ALTERATION_KEY = 'garments-alterations';
export const HOLD_KEY = 'garments-reservations';
export const LAYAWAY_KEY = 'garments-layaway';
export const MEASURE_KEY = 'garments-measurements';
export const COLLECTION_KEY = 'garments-collections';
export const SIZE_CHART_KEY = 'garments-size-charts';
export const META_KEY = 'garments-meta';
export const DASH_KEY = 'garments-dashboard';
/** Screens outside garments that show the same money. */
const MONEY_KEYS = [DASH_KEY, 'customers-directory', 'customer', 'customer-ledger', 'sales-history', 'dashboard', 'inv', 'offline'];

export function refreshGarments(keys: string[], money = false) {
  [...keys, DASH_KEY, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

interface StatusMeta { label: string; tone: StatusTone }

const TAILORING_STATUS: Record<TailoringStatus, StatusMeta> = {
  DRAFT: { label: msg('Poocha hai'), tone: 'neutral' }, QUOTED: { label: msg('Rate bataya'), tone: 'info' },
  CONFIRMED: { label: msg('Order pakka'), tone: 'info' }, FABRIC_PENDING: { label: msg('Kapre ka intezar'), tone: 'warning' },
  CUTTING: { label: msg('Cutting'), tone: 'warning' }, STITCHING: { label: msg('Silai ho rahi'), tone: 'warning' },
  EMBROIDERY: { label: msg('Kadhai'), tone: 'accent' }, QUALITY_CHECK: { label: msg('Trial / fitting'), tone: 'accent' },
  READY: { label: msg('Tayyar hai'), tone: 'success' }, DELIVERED: { label: msg('De diya'), tone: 'success' },
  CANCELLED: { label: msg('Cancel'), tone: 'danger' }, ON_HOLD: { label: msg('Ruka hua'), tone: 'neutral' },
};
export const tailoringStatus = (s?: string | null): StatusMeta => TAILORING_STATUS[s as TailoringStatus] ?? { label: String(s ?? '—'), tone: 'neutral' };

const ALTERATION_STATUS: Record<AlterationStatus, StatusMeta> = {
  RECEIVED: { label: msg('Kapra aa gaya'), tone: 'info' }, MEASUREMENT_TAKEN: { label: msg('Naap liya'), tone: 'info' },
  IN_PROGRESS: { label: msg('Kaam ho raha'), tone: 'warning' }, READY: { label: msg('Tayyar hai'), tone: 'success' },
  DELIVERED: { label: msg('De diya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
export const alterationStatus = (s?: string | null): StatusMeta => ALTERATION_STATUS[s as AlterationStatus] ?? { label: String(s ?? '—'), tone: 'neutral' };

/** Next-step button words, keyed by the core step name. */
const STEP: Record<string, string> = {
  confirm: msg('Pakka karein'), cutting: msg('Cutting shuru'), stitching: msg('Silai shuru'), trial: msg('Trial ke liye'), ready: msg('Tayyar hai'),
  deliver: msg('De diya — bill'), start: msg('Kaam shuru'),
};
export const stepLabel = (step: string, alteration = false) => t(alteration && step === 'deliver' ? msg('De diya') : STEP[step] ?? step);

export const FLOW_LABEL: Record<string, string> = {
  confirmed: msg('Pakka'), cutting: msg('Cutting'), stitching: msg('Silai'), trial: msg('Trial'), ready: msg('Tayyar'), delivered: msg('De diya'),
};

export const ALTERATION_TYPES: string[] = [msg('Lambai kam'), msg('Lambai zyada'), msg('Kamar tight'), msg('Kamar dheeli'), msg('Bazu chhote'), msg('Fitting'), msg('Zip / button'), msg('Pancha'), msg('Rafu / murammat')];

export const PRIORITIES: Array<{ value: Priority; label: string; tone: StatusTone }> = [
  { value: 'LOW', label: msg('Aaram se'), tone: 'neutral' }, { value: 'NORMAL', label: msg('Aam'), tone: 'neutral' },
  { value: 'HIGH', label: msg('Jaldi'), tone: 'warning' }, { value: 'URGENT', label: msg('Bohat jaldi'), tone: 'danger' },
];
export const priorityOf = (p?: string | null) => PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[1];

export const GARMENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'SHALWAR_KAMEEZ', label: msg('Shalwar kameez') }, { value: 'KURTA_SHALWAR', label: msg('Kurta shalwar') }, { value: 'KURTA', label: msg('Kurta') },
  { value: 'THREE_PIECE', label: msg('3 piece suit') }, { value: 'TWO_PIECE', label: msg('2 piece') }, { value: 'SUIT', label: msg('Pant coat') },
  { value: 'WAISTCOAT', label: msg('Waistcoat') }, { value: 'SHIRT', label: msg('Shirt') }, { value: 'T_SHIRT', label: msg('T-shirt') }, { value: 'POLO', label: msg('Polo') },
  { value: 'TROUSER', label: msg('Trouser') }, { value: 'JEANS', label: msg('Jeans') }, { value: 'SHORTS', label: msg('Shorts') },
  { value: 'FROCK', label: msg('Frock') }, { value: 'GOWN', label: msg('Gown') }, { value: 'MAXI', label: msg('Maxi') }, { value: 'LEHENGA', label: msg('Lehnga') },
  { value: 'SAREE', label: msg('Saree') }, { value: 'SKIRT', label: msg('Skirt') }, { value: 'TOP', label: msg('Top') }, { value: 'ABAYA', label: msg('Abaya') },
  { value: 'HIJAB', label: msg('Hijab') }, { value: 'DUPATTA', label: msg('Dupatta') }, { value: 'JACKET', label: msg('Jacket') }, { value: 'COAT', label: msg('Coat') },
  { value: 'SWEATER', label: msg('Sweater') }, { value: 'HOODIE', label: msg('Hoodie') }, { value: 'TRACK_SUIT', label: msg('Track suit') },
  { value: 'NIGHTWEAR', label: msg('Night suit') }, { value: 'UNDERGARMENT', label: msg('Undergarment') }, { value: 'SOCKS', label: msg('Jurabein') },
  { value: 'ACCESSORY', label: msg('Accessory') }, { value: 'FABRIC', label: msg('Kapra (unstitched)') }, { value: 'OTHER', label: msg('Doosra') },
];
export const garmentLabel = (v?: string | null) => { const g = GARMENT_TYPES.find((x) => x.value === v); return g ? t(g.label) : v ? v.replace(/_/g, ' ').toLowerCase() : '—'; };

export const GENDERS: Array<{ value: string; label: string }> = [
  { value: 'MEN', label: msg('Gents') }, { value: 'WOMEN', label: msg('Ladies') }, { value: 'BOYS', label: msg('Larke') },
  { value: 'GIRLS', label: msg('Larkiyan') }, { value: 'KIDS', label: msg('Bachay') }, { value: 'BABY', label: msg('Baby') }, { value: 'UNISEX', label: msg('Sab ke liye') },
];
export const genderLabel = (v?: string | null) => { const g = GENDERS.find((x) => x.value === v); return g ? t(g.label) : '—'; };

export const SEASONS: Array<{ value: string; label: string }> = [
  { value: 'SUMMER', label: msg('Garmi') }, { value: 'WINTER', label: msg('Sardi') }, { value: 'SPRING', label: msg('Bahar') }, { value: 'AUTUMN', label: msg('Khizan') },
  { value: 'EID_COLLECTION', label: msg('Eid') }, { value: 'WEDDING_COLLECTION', label: msg('Shadi') }, { value: 'FESTIVE_COLLECTION', label: msg('Tehwar') },
  { value: 'RAMADAN_COLLECTION', label: msg('Ramzan') }, { value: 'SCHOOL_COLLECTION', label: msg('School') }, { value: 'ALL_SEASON', label: msg('Har mausam') },
];
export const seasonLabel = (v?: string | null) => { const s = SEASONS.find((x) => x.value === v); return s ? t(s.label) : '—'; };

export const FABRICS = ['LAWN', 'COTTON', 'KHADDAR', 'KARANDI', 'LINEN', 'CAMBRIC', 'CHIFFON', 'SILK', 'ORGANZA', 'NET', 'GEORGETTE', 'VELVET', 'WOOL', 'DENIM', 'JERSEY', 'POLYESTER', 'VISCOSE', 'LEATHER', 'MIXED', 'OTHER'];
export const fabricLabel = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase() : '—');
export const WORK_TYPES = ['PLAIN', 'PRINTED', 'EMBROIDERED', 'HAND_EMBROIDERED', 'DIGITAL_PRINTED', 'BLOCK_PRINTED', 'SEQUIN_WORK', 'ZARI_WORK', 'MIRROR_WORK', 'LACE_WORK', 'OTHER'];

/** Body measurements with the words a tailor uses. */
export const MEASURE_LABELS: Record<string, string> = {
  neck: msg('Gala'), shoulder: msg('Teera'), chest: msg('Chhati'), bust: msg('Seena'), waist: msg('Kamar'), hip: msg('Hip'), armhole: msg('Armhole'), bicep: msg('Bazu (mota)'),
  wrist: msg('Kalai'), sleeveLength: msg('Bazu lambai'), shirtLength: msg('Shirt lambai'), kurtaLength: msg('Kameez lambai'), daman: msg('Daman'), trouserLength: msg('Pant lambai'),
  shalwarLength: msg('Shalwar lambai'), shalwarBottom: msg('Pancha'), inseam: msg('Andar lambai'), thigh: msg('Ran'), knee: msg('Ghutna'), bottom: msg('Mori'),
};
export const measureLabel = (k: string) => (MEASURE_LABELS[k] ? t(MEASURE_LABELS[k]) : k);

export const dayOnly = (iso?: string | null) => (iso ? formatDate(iso) : '—');

/** "Aaj", "Kal", "3 din baad", "2 din late". */
export function whenText(iso?: string | null, done = false): string {
  return whenWords(whenOf(iso, done));
}
export function whenWords(w: WhenKind): string {
  switch (w.kind) {
    case 'none': return t('Date nahi');
    case 'today': return t('Aaj');
    case 'tomorrow': return t('Kal');
    case 'ahead': return t('{{d}} din baad', { d: w.days });
    case 'ago': return t('{{value}} din pehle', { value: w.days });
    default: return t('{{value}} din late', { value: w.days });
  }
}
export const isLate = (iso?: string | null) => whenOf(iso).kind === 'late';

/** Empty text becomes undefined so the API keeps optional fields out. */
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
export const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000);
export const dateISO = (d: Date | null) => (d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)).toISOString() : undefined);
