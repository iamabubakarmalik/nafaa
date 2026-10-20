/** Shoe labels, size sets, query keys and small helpers used across the shoe pages. */

export const META_KEY = 'shoe-meta';
export const REQUEST_KEY = 'shoe-try-on';
export const CHART_KEY = 'shoe-size-charts';

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

export function apiError(e: unknown, fallback = 'Kuch ghalat ho gaya') {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(m) ? String(m[0]) : typeof m === 'string' ? m : fallback;
}

export const GENDERS = [
  { value: 'MEN', label: 'Gents' },
  { value: 'WOMEN', label: 'Ladies' },
  { value: 'BOYS', label: 'Larke' },
  { value: 'GIRLS', label: 'Larkiyan' },
  { value: 'BABY', label: 'Chhote bachay' },
  { value: 'UNISEX', label: 'Sab ke liye' },
] as const;
export const genderLabel = (g?: string | null) => GENDERS.find((x) => x.value === g)?.label ?? '—';
export const KIDS = ['BOYS', 'GIRLS', 'BABY'];

export const SHOE_TYPES: Array<{ value: string; label: string; group: string }> = [
  { value: 'MENS_FORMAL', label: 'Formal', group: 'Gents' },
  { value: 'MENS_SNEAKERS', label: 'Joggers / sneakers', group: 'Gents' },
  { value: 'MENS_LOAFERS', label: 'Loafers', group: 'Gents' },
  { value: 'MENS_SANDALS', label: 'Chappal / sandal', group: 'Gents' },
  { value: 'MENS_PESHAWARI', label: 'Peshawari', group: 'Gents' },
  { value: 'MENS_KHUSSA', label: 'Khussa', group: 'Gents' },
  { value: 'MENS_BOOTS', label: 'Boots', group: 'Gents' },
  { value: 'MENS_SLIPPERS', label: 'Slippers', group: 'Gents' },
  { value: 'WOMENS_HEELS', label: 'Heels', group: 'Ladies' },
  { value: 'WOMENS_FLATS', label: 'Flats / pumps', group: 'Ladies' },
  { value: 'WOMENS_SANDALS', label: 'Sandal / chappal', group: 'Ladies' },
  { value: 'WOMENS_KHUSSA', label: 'Khussa', group: 'Ladies' },
  { value: 'WOMENS_SNEAKERS', label: 'Joggers', group: 'Ladies' },
  { value: 'WOMENS_WEDGES', label: 'Wedges', group: 'Ladies' },
  { value: 'BRIDAL_SHOES', label: 'Bridal', group: 'Ladies' },
  { value: 'KIDS_SCHOOL', label: 'School shoes', group: 'Bachay' },
  { value: 'KIDS_SNEAKERS', label: 'Joggers', group: 'Bachay' },
  { value: 'KIDS_SANDALS', label: 'Sandal', group: 'Bachay' },
  { value: 'KIDS_CASUAL', label: 'Casual', group: 'Bachay' },
  { value: 'BABY_SHOES', label: 'Baby shoes', group: 'Bachay' },
  { value: 'RUNNING_SHOES', label: 'Running', group: 'Sports' },
  { value: 'FOOTBALL_STUDS', label: 'Football studs', group: 'Sports' },
  { value: 'CRICKET_SPIKES', label: 'Cricket spikes', group: 'Sports' },
  { value: 'TRAINING_SHOES', label: 'Gym / training', group: 'Sports' },
  { value: 'SAFETY_SHOES', label: 'Safety shoes', group: 'Kaam' },
  { value: 'RAIN_BOOTS', label: 'Barish ke boots', group: 'Kaam' },
  { value: 'SOCK', label: 'Jurabain', group: 'Saman' },
  { value: 'SHOE_POLISH', label: 'Polish / cream', group: 'Saman' },
  { value: 'SHOE_LACE', label: 'Tasme', group: 'Saman' },
  { value: 'SHOE_INSOLE', label: 'Insole', group: 'Saman' },
  { value: 'OTHER', label: 'Doosra', group: 'Saman' },
];
export const typeLabel = (t?: string | null) => SHOE_TYPES.find((x) => x.value === t)?.label ?? (t ? t.replace(/_/g, ' ').toLowerCase() : '—');
/** Accessories are sold by piece and have no size. */
export const isAccessory = (t?: string | null) => !!t && ['SOCK', 'SHOE_POLISH', 'SHOE_LACE', 'SHOE_INSOLE', 'SHOE_HORN', 'SHOE_CLEANER', 'SHOE_CARE_KIT'].includes(t);

export const SEASONS = ['Summer', 'Winter', 'Eid', 'Shaadi', 'School', 'All season'];

/** Size sets shops use in Pakistan: PK/UK numbers for adults, EU on branded boxes, kids sizes. */
export const SIZE_SYSTEMS = [
  { value: 'UK', label: 'PK / UK', sizes: ['5', '6', '7', '8', '9', '10', '11', '12'] },
  { value: 'EU', label: 'EU', sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
  { value: 'KIDS', label: 'Bachay', sizes: ['C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', '1', '2', '3', '4'] },
  { value: 'US', label: 'US', sizes: ['6', '7', '8', '9', '10', '11', '12', '13'] },
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
