/**
 * Pure rules of the shoe pack (shared by web and mobile): size systems,
 * the size conversion table, size x colour variants with barcodes, and
 * waiting-request helpers.
 */

export const SIZE_SYSTEMS = [
  { value: 'UK', sizes: ['5', '6', '7', '8', '9', '10', '11', '12'] },
  { value: 'EU', sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
  { value: 'KIDS', sizes: ['C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', '1', '2', '3', '4'] },
  { value: 'US', sizes: ['6', '7', '8', '9', '10', '11', '12', '13'] },
] as const;
export type SizeSystem = (typeof SIZE_SYSTEMS)[number]['value'];

export const SHOE_COLORS: Array<[string, string]> = [
  ['Black', '#000000'], ['Brown', '#795548'], ['Tan', '#d2b48c'], ['Maroon', '#800000'], ['Navy', '#1e3a8a'], ['White', '#ffffff'],
  ['Grey', '#808080'], ['Beige', '#f5f5dc'], ['Golden', '#d4af37'], ['Silver', '#c0c0c0'], ['Red', '#dc2626'], ['Pink', '#f9a8d4'],
  ['Blue', '#2563eb'], ['Green', '#16a34a'], ['Mustard', '#e1ad01'], ['Multi', '#a855f7'],
];

/** The same foot in each system, as Pakistani shops use it (adults and kids kept apart). */
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
export type ConversionRow = { pk: string; eu: string; us: string; cm: string };

/** Accessories are sold by piece and have no size. */
export const isAccessory = (t?: string | null) => !!t && ['SOCK', 'SHOE_POLISH', 'SHOE_LACE', 'SHOE_INSOLE', 'SHOE_HORN', 'SHOE_CLEANER', 'SHOE_CARE_KIT'].includes(t);

export const KIDS = ['BOYS', 'GIRLS', 'BABY'];

/** Short code for barcodes: "Off white" -> "OW", "42" -> "42". */
export const sizeCode = (s: string) => (/^\d/.test(s) ? s.replace(/[^\dA-Z.]/gi, '') : s.split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 3) || s.slice(0, 3).toUpperCase());

export interface PairVariant { name: string; size?: string; color?: string; hex?: string; sku: string; barcode: string }

/** Size x colour pairs not yet variants, each with SKU and barcode; `prefix` is the size system label ("PK 8 / Black"). */
export function pairVariants(base: string, sizes: string[], colors: Array<[string, string]>, existing: string[], withBarcodes = true, prefix = ''): PairVariant[] {
  const b = (base || 'SH').toUpperCase();
  const have = new Set(existing.map((n) => n.toLowerCase()));
  const out: PairVariant[] = [];
  for (const s of sizes.length ? sizes : ['']) {
    for (const [c, hex] of colors.length ? colors : [['', ''] as [string, string]]) {
      if (!s && !c) continue;
      const name = `${prefix ? `${prefix} ` : ''}${[s, c].filter(Boolean).join(' / ')}`;
      if (have.has(name.toLowerCase())) continue;
      out.push({
        name, size: s || undefined, color: c || undefined, hex: hex || undefined,
        sku: `${b}-${[s, c && sizeCode(c)].filter(Boolean).join('-')}`.replace(/\s+/g, ''),
        barcode: withBarcodes ? `${b}${sizeCode(s || 'X')}${c ? sizeCode(c) : ''}`.replace(/[^A-Z0-9.]/g, '') : '',
      });
    }
  }
  return out;
}

/** Row of the conversion table for a size typed in one system (pk, eu, us or cm); null when unknown. */
export function convertSize(group: keyof typeof CONVERSION, system: keyof ConversionRow, value: string): ConversionRow | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const rows = CONVERSION[group] as readonly ConversionRow[];
  return rows.find((r) => r[system].toLowerCase().split('/').includes(v)) ?? null;
}

/** Chart rows with a size in the first column filled and numbers sorted, blank rows dropped. */
export function cleanChartRows(rows: Array<Record<string, string>>): Array<Record<string, string>> {
  return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, x]) => [k, String(x ?? '').trim()]).filter(([, x]) => x)))
    .filter((r) => Object.keys(r).length > 0);
}
