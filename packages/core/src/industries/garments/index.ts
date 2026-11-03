/**
 * Pure rules of the garments pack (shared by web and mobile): stitching and
 * alteration steps, size x colour grids with barcodes, holds, instalment
 * plans and exchange money. No labels here; screens translate step keys.
 */

export type TailoringStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'FABRIC_PENDING' | 'CUTTING' | 'STITCHING' | 'EMBROIDERY'
  | 'QUALITY_CHECK' | 'READY' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';
export type AlterationStatus = 'RECEIVED' | 'MEASUREMENT_TAKEN' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';

export const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
export const dueOf = (o: { total: number; paidAmount: number }) => Math.max(r2(Number(o.total || 0) - Number(o.paidAmount || 0)), 0);

/** 'DELIVER' opens the hand-over window (bill and money). */
export interface NextStep<S> { to: S | 'DELIVER'; step: string }

export function tailoringNext(s: TailoringStatus): NextStep<TailoringStatus> | null {
  switch (s) {
    case 'DRAFT':
    case 'QUOTED': return { to: 'CONFIRMED', step: 'confirm' };
    case 'CONFIRMED':
    case 'FABRIC_PENDING':
    case 'ON_HOLD': return { to: 'CUTTING', step: 'cutting' };
    case 'CUTTING': return { to: 'STITCHING', step: 'stitching' };
    case 'STITCHING':
    case 'EMBROIDERY': return { to: 'QUALITY_CHECK', step: 'trial' };
    case 'QUALITY_CHECK': return { to: 'READY', step: 'ready' };
    case 'READY': return { to: 'DELIVER', step: 'deliver' };
    default: return null;
  }
}

/** One step back when the wrong button was pressed. */
export const TAILORING_PREV: Partial<Record<TailoringStatus, TailoringStatus>> = {
  CONFIRMED: 'DRAFT', CUTTING: 'CONFIRMED', STITCHING: 'CUTTING', EMBROIDERY: 'STITCHING', QUALITY_CHECK: 'STITCHING', READY: 'QUALITY_CHECK',
};

/** Visible steps of a stitching order, for the progress strip. */
export const TAILORING_FLOW: Array<{ key: string; of: TailoringStatus[] }> = [
  { key: 'confirmed', of: ['CONFIRMED', 'FABRIC_PENDING', 'ON_HOLD'] },
  { key: 'cutting', of: ['CUTTING'] },
  { key: 'stitching', of: ['STITCHING', 'EMBROIDERY'] },
  { key: 'trial', of: ['QUALITY_CHECK'] },
  { key: 'ready', of: ['READY'] },
  { key: 'delivered', of: ['DELIVERED'] },
];
export const flowIndex = (s: TailoringStatus) => TAILORING_FLOW.findIndex((f) => f.of.includes(s));
export const isClosed = (s?: string | null) => s === 'DELIVERED' || s === 'CANCELLED';

export function alterationNext(s: AlterationStatus): NextStep<AlterationStatus> | null {
  switch (s) {
    case 'RECEIVED':
    case 'MEASUREMENT_TAKEN': return { to: 'IN_PROGRESS', step: 'start' };
    case 'IN_PROGRESS': return { to: 'READY', step: 'ready' };
    case 'READY': return { to: 'DELIVER', step: 'deliver' };
    default: return null;
  }
}
export const ALTERATION_PREV: Partial<Record<AlterationStatus, AlterationStatus>> = { IN_PROGRESS: 'RECEIVED', READY: 'IN_PROGRESS' };

/** Whole calendar days from `now` to a date in the business time zone (negative when past). */
export function daysFrom(iso?: string | null, now: number = Date.now(), tzOffsetMinutes = 300): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const day = (ms: number) => Math.floor((ms + tzOffsetMinutes * 60_000) / 86_400_000);
  return day(t) - day(now);
}

export type WhenKind = { kind: 'none' } | { kind: 'today' } | { kind: 'tomorrow' } | { kind: 'ahead'; days: number } | { kind: 'late'; days: number } | { kind: 'ago'; days: number };

export function whenOf(iso?: string | null, done = false, now?: number): WhenKind {
  const d = daysFrom(iso, now);
  if (d === null) return { kind: 'none' };
  if (d === 0) return { kind: 'today' };
  if (d === 1) return { kind: 'tomorrow' };
  if (d > 1) return { kind: 'ahead', days: d };
  return done ? { kind: 'ago', days: -d } : { kind: 'late', days: -d };
}

/* ───────────── size x colour grid ───────────── */

export const SIZE_SETS: Array<{ key: string; values: string[] }> = [
  { key: 'letters', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] },
  { key: 'numbers', values: ['28', '30', '32', '34', '36', '38', '40', '42', '44'] },
  { key: 'desi', values: ['Small', 'Medium', 'Large', 'XL'] },
  { key: 'kids', values: ['1-2 saal', '2-3 saal', '3-4 saal', '4-5 saal', '6-7 saal', '8-9 saal', '10-11 saal', '12-13 saal'] },
  { key: 'free', values: ['Free size'] },
];

export const GARMENT_COLORS: Array<[string, string]> = [
  ['Black', '#000000'], ['White', '#ffffff'], ['Off white', '#f8f0e3'], ['Beige', '#f5f5dc'], ['Grey', '#808080'], ['Navy', '#1e3a8a'],
  ['Sky blue', '#87ceeb'], ['Maroon', '#800000'], ['Red', '#dc2626'], ['Pink', '#f9a8d4'], ['Purple', '#7e22ce'], ['Green', '#16a34a'],
  ['Mint', '#98ff98'], ['Mustard', '#e1ad01'], ['Peach', '#ffdab9'], ['Brown', '#795548'], ['Golden', '#d4af37'],
];

/** Short code for barcodes: "Off white" -> "OW", "M" -> "M". */
export const shortCode = (s: string) => s.split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 3) || s.slice(0, 3).toUpperCase();

export interface GridVariant { name: string; size?: string; color?: string; hex?: string; sku: string; barcode: string }

/** Every size x colour pair that is not already a variant, with its SKU and barcode. */
export function gridVariants(
  base: string, sizes: string[], colors: Array<[string, string]>, existing: string[], withBarcodes = true,
): GridVariant[] {
  const b = (base || 'GR').toUpperCase();
  const have = new Set(existing.map((n) => n.toLowerCase()));
  const pairs = (sizes.length ? sizes : ['']).flatMap((s) => (colors.length ? colors : [['', ''] as [string, string]]).map(([c, hex]) => ({ s, c, hex })))
    .filter((v) => v.s || v.c);
  const out: GridVariant[] = [];
  for (const v of pairs) {
    const name = [v.s, v.c].filter(Boolean).join(' / ');
    if (have.has(name.toLowerCase())) continue;
    out.push({
      name, size: v.s || undefined, color: v.c || undefined, hex: v.hex || undefined,
      sku: `${b}-${[v.s, v.c && shortCode(v.c)].filter(Boolean).join('-')}`.replace(/\s+/g, ''),
      barcode: withBarcodes ? `${b}${shortCode(v.s || 'X')}${v.c ? shortCode(v.c) : ''}`.replace(/[^A-Z0-9]/g, '') : '',
    });
  }
  return out;
}

/** "M / Black" -> size M, colour Black for variants not made by the grid. */
export function splitVariantName(name: string): { size?: string; color?: string } {
  const [a, b] = name.split('/').map((s) => s.trim());
  return b ? { size: a, color: b } : { size: a };
}

/* ───────────── holds, instalments, exchange ───────────── */

/** Pieces the counter may sell: stock minus pieces held for customers. */
export const sellable = (stock: number, held: number) => Math.max(r2(Number(stock) - Number(held || 0)), 0);

/** Instalment plan preview: what each instalment is after the deposit (the server rounds down the same way). */
export function layawayEach(total: number, deposit: number, count: number): number {
  return count > 0 ? Math.floor((Number(total) - Number(deposit || 0)) / count) : 0;
}

/** Money of an exchange: returned value against the new bill. Positive = customer pays, negative = refund. */
export function exchangeDiff(lines: Array<{ qty: number; unitRefund: number }>, newTotal: number) {
  const credit = r2(lines.reduce((s, l) => s + l.qty * l.unitRefund, 0));
  return { credit, diff: r2(newTotal - credit) };
}

/** Share of a plan paid, 0..100. */
export const paidPct = (paid: number, total: number) => (total ? Math.min(100, Math.round((paid / total) * 100)) : 0);

/* ───────────── size chart templates ───────────── */

export interface ChartTemplate { name: string; categoryType: string; gender: string; cols: string[]; rows: Array<{ size: string } & Record<string, string | number>> }
export const CHART_TEMPLATES: ChartTemplate[] = [
  { name: 'Gents kameez', categoryType: 'SHALWAR_KAMEEZ', gender: 'MEN', cols: ['chest', 'shoulder', 'kurtaLength', 'sleeveLength'], rows: [
    { size: 'S', chest: 38, shoulder: 17, kurtaLength: 40, sleeveLength: 23 }, { size: 'M', chest: 40, shoulder: 18, kurtaLength: 41, sleeveLength: 24 },
    { size: 'L', chest: 42, shoulder: 19, kurtaLength: 42, sleeveLength: 24.5 }, { size: 'XL', chest: 44, shoulder: 20, kurtaLength: 43, sleeveLength: 25 },
  ] },
  { name: 'Ladies kurti', categoryType: 'KURTA', gender: 'WOMEN', cols: ['bust', 'waist', 'hip', 'kurtaLength'], rows: [
    { size: 'XS', bust: 32, waist: 28, hip: 36, kurtaLength: 38 }, { size: 'S', bust: 34, waist: 30, hip: 38, kurtaLength: 39 },
    { size: 'M', bust: 36, waist: 32, hip: 40, kurtaLength: 40 }, { size: 'L', bust: 38, waist: 34, hip: 42, kurtaLength: 41 },
  ] },
  { name: 'Pant / trouser', categoryType: 'TROUSER', gender: 'MEN', cols: ['waist', 'hip', 'inseam'], rows: [
    { size: '30', waist: 30, hip: 38, inseam: 30 }, { size: '32', waist: 32, hip: 40, inseam: 31 }, { size: '34', waist: 34, hip: 42, inseam: 31 }, { size: '36', waist: 36, hip: 44, inseam: 32 },
  ] },
  { name: 'Bachon ka frock', categoryType: 'FROCK', gender: 'GIRLS', cols: ['chest', 'shirtLength'], rows: [
    { size: '2-3 saal', chest: 22, shirtLength: 18 }, { size: '4-5 saal', chest: 24, shirtLength: 21 }, { size: '6-7 saal', chest: 26, shirtLength: 24 }, { size: '8-9 saal', chest: 28, shirtLength: 27 },
  ] },
];
