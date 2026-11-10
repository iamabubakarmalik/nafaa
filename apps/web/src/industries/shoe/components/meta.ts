/** Shoe labels, size sets, query keys and small helpers used across the shoe pages. */

import { t as tr } from '@core/i18n';
export const META_KEY = 'shoe-meta';
export const REQUEST_KEY = 'shoe-try-on';
export const CHART_KEY = 'shoe-size-charts';

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

export function apiError(e: unknown, fallback = tr('Kuch ghalat ho gaya')) {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(m) ? String(m[0]) : typeof m === 'string' ? m : fallback;
}

export const GENDERS = [
  { value: 'MEN', label: tr('Gents') },
  { value: 'WOMEN', label: tr('Ladies') },
  { value: 'BOYS', label: tr('Larke') },
  { value: 'GIRLS', label: tr('Larkiyan') },
  { value: 'BABY', label: tr('Chhote bachay') },
  { value: 'UNISEX', label: tr('Sab ke liye') },
] as const;
export const genderLabel = (g?: string | null) => GENDERS.find((x) => x.value === g)?.label ?? '—';
export const KIDS = ['BOYS', 'GIRLS', 'BABY'];

export const SHOE_TYPES: Array<{ value: string; label: string; group: string }> = [
  { value: 'MENS_FORMAL', label: tr('Formal'), group: tr('Gents') },
  { value: 'MENS_SNEAKERS', label: tr('Joggers / sneakers'), group: tr('Gents') },
  { value: 'MENS_LOAFERS', label: tr('Loafers'), group: tr('Gents') },
  { value: 'MENS_SANDALS', label: tr('Chappal / sandal'), group: tr('Gents') },
  { value: 'MENS_PESHAWARI', label: tr('Peshawari'), group: tr('Gents') },
  { value: 'MENS_KHUSSA', label: tr('Khussa'), group: tr('Gents') },
  { value: 'MENS_BOOTS', label: tr('Boots'), group: tr('Gents') },
  { value: 'MENS_SLIPPERS', label: tr('Slippers'), group: tr('Gents') },
  { value: 'WOMENS_HEELS', label: tr('Heels'), group: tr('Ladies') },
  { value: 'WOMENS_FLATS', label: tr('Flats / pumps'), group: tr('Ladies') },
  { value: 'WOMENS_SANDALS', label: tr('Sandal / chappal'), group: tr('Ladies') },
  { value: 'WOMENS_KHUSSA', label: tr('Khussa'), group: tr('Ladies') },
  { value: 'WOMENS_SNEAKERS', label: tr('Joggers'), group: tr('Ladies') },
  { value: 'WOMENS_WEDGES', label: tr('Wedges'), group: tr('Ladies') },
  { value: 'BRIDAL_SHOES', label: tr('Bridal'), group: tr('Ladies') },
  { value: 'KIDS_SCHOOL', label: tr('School shoes'), group: tr('Bachay') },
  { value: 'KIDS_SNEAKERS', label: tr('Joggers'), group: tr('Bachay') },
  { value: 'KIDS_SANDALS', label: tr('Sandal'), group: tr('Bachay') },
  { value: 'KIDS_CASUAL', label: tr('Casual'), group: tr('Bachay') },
  { value: 'BABY_SHOES', label: tr('Baby shoes'), group: tr('Bachay') },
  { value: 'RUNNING_SHOES', label: tr('Running'), group: tr('Sports') },
  { value: 'FOOTBALL_STUDS', label: tr('Football studs'), group: tr('Sports') },
  { value: 'CRICKET_SPIKES', label: tr('Cricket spikes'), group: tr('Sports') },
  { value: 'TRAINING_SHOES', label: tr('Gym / training'), group: tr('Sports') },
  { value: 'SAFETY_SHOES', label: tr('Safety shoes'), group: tr('Kaam') },
  { value: 'RAIN_BOOTS', label: tr('Barish ke boots'), group: tr('Kaam') },
  { value: 'SOCK', label: tr('Jurabain'), group: tr('Saman') },
  { value: 'SHOE_POLISH', label: tr('Polish / cream'), group: tr('Saman') },
  { value: 'SHOE_LACE', label: tr('Tasme'), group: tr('Saman') },
  { value: 'SHOE_INSOLE', label: tr('Insole'), group: tr('Saman') },
  { value: 'OTHER', label: tr('Doosra'), group: tr('Saman') },
];
/** Kinds offered on a shop category. Labels that repeat across groups carry the group so the choices stay distinct. */
const KIND_LABEL: Record<string, string> = {
  MENS_KHUSSA: tr('Gents khussa'), WOMENS_KHUSSA: tr('Ladies khussa'), WOMENS_SNEAKERS: tr('Ladies joggers'), KIDS_SNEAKERS: tr('Bachon ke joggers'),
};
export const SHOE_KINDS: Array<{ value: string; label: string }> = SHOE_TYPES.map((s) => ({ value: s.value, label: KIND_LABEL[s.value] ?? s.label }));
export const typeLabel = (t?: string | null) => SHOE_TYPES.find((x) => x.value === t)?.label ?? (t ? t.replace(/_/g, ' ').toLowerCase() : '—');
/** Accessories are sold by piece and have no size. */
export const isAccessory = (t?: string | null) => !!t && ['SOCK', 'SHOE_POLISH', 'SHOE_LACE', 'SHOE_INSOLE', 'SHOE_HORN', 'SHOE_CLEANER', 'SHOE_CARE_KIT'].includes(t);

export const SEASONS = ['Summer', 'Winter', 'Eid', 'Shaadi', 'School', 'All season'];

/** Size sets shops use in Pakistan: PK/UK numbers for adults, EU on branded boxes, kids sizes. */
export const SIZE_SYSTEMS = [
  { value: 'UK', label: tr('PK / UK'), sizes: ['5', '6', '7', '8', '9', '10', '11', '12'] },
  { value: 'EU', label: tr('EU'), sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
  { value: 'KIDS', label: tr('Bachay'), sizes: ['C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', '1', '2', '3', '4'] },
  { value: 'US', label: tr('US'), sizes: ['6', '7', '8', '9', '10', '11', '12', '13'] },
] as const;
export type SizeSystem = typeof SIZE_SYSTEMS[number]['value'];
export const systemLabel = (s?: string | null) => SIZE_SYSTEMS.find((x) => x.value === s)?.label ?? s ?? '';

export const COLORS: Array<[string, string]> = [
  ['Black', '#000000'], ['Brown', '#795548'], ['Tan', '#d2b48c'], ['Maroon', '#800000'], ['Navy', '#1e3a8a'], ['White', '#ffffff'],
  ['Grey', '#808080'], ['Beige', '#f5f5dc'], ['Golden', '#d4af37'], ['Silver', '#c0c0c0'], ['Red', '#dc2626'], ['Pink', '#f9a8d4'],
  ['Blue', '#2563eb'], ['Green', '#16a34a'], ['Mustard', '#e1ad01'], ['Multi', '#a855f7'],
];

/** Standard size conversion used in Pakistani shops (adults; kids are separate). */
export const CONVERSION = {
  men: [
    { pk: '6', eu: '39', us: '7', cm: '24.5' }, { pk: '7', eu: '40', us: '8', cm: '25.5' }, { pk: '8', eu: '41/42', us: '9', cm: '26.5' },
    { pk: '9', eu: '43', us: '10', cm: '27.5' }, { pk: '10', eu: '44', us: '11', cm: '28.5' }, { pk: '11', eu: '45', us: '12', cm: '29.5' },
    { pk: '12', eu: '46', us: '13', cm: '30.5' },
  ],
  women: [
    { pk: '3', eu: '35/36', us: '5', cm: '22' }, { pk: '4', eu: '37', us: '6', cm: '23' }, { pk: '5', eu: '38', us: '7', cm: '24' },
    { pk: '6', eu: '39', us: '8', cm: '24.5' }, { pk: '7', eu: '40/41', us: '9', cm: '25.5' }, { pk: '8', eu: '42', us: '10', cm: '26.5' },
  ],
  kids: [
    { pk: 'C6', eu: '23', us: '7', cm: '14' }, { pk: 'C8', eu: '25/26', us: '9', cm: '15.5' }, { pk: 'C10', eu: '28', us: '11', cm: '17' },
    { pk: 'C12', eu: '30/31', us: '13', cm: '18.5' }, { pk: '1', eu: '33', us: '1.5', cm: '20' }, { pk: '2', eu: '34', us: '2.5', cm: '21' },
    { pk: '3', eu: '35/36', us: '3.5', cm: '22' },
  ],
} as const;

export interface ShoeMeta {
  productId: string;
  categoryType: string | null;
  gender: string;
  modelName: string | null;
  modelCode: string | null;
  collection: string | null;
  season: string | null;
  colorName: string | null;
  sizeSystem: string;
  mrp: number | null;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isBridal: boolean;
  isEidSpecial: boolean;
  /** Selling below the MRP on the box. */
  onSale: boolean;
  offPct: number;
}

/** Short code for barcodes: "Off white" → "OW", "42" → "42". */
export const code = (s: string) => (/^\d/.test(s) ? s.replace(/[^\dA-Z.]/gi, '') : s.split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 3) || s.slice(0, 3).toUpperCase());
