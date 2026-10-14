/**
 * Import columns: what each field means, the header names it is detected
 * from (English and Roman Urdu), which columns an industry's template gets,
 * and the Excel / CSV reading and writing used by the import page.
 */

import type { BusinessFeatures } from '@modules/organization/settings/api/business-config.api';
import type { ImportField, ImportRow, PriceSheetRow } from './api';

export type ImportMode = 'create' | 'prices';

export interface FieldDef {
  key: ImportField;
  label: string;
  hint: string;
  aliases: string[];
}

export const FIELDS: Record<ImportField, FieldDef> = {
  name: { key: 'name', label: 'Name', hint: 'Product ka naam — zaroori', aliases: ['name', 'product', 'product name', 'item', 'item name', 'title', 'naam', 'product naam', 'cheez'] },
  price: { key: 'price', label: 'Price', hint: 'Bechne ki price (sale price)', aliases: ['price', 'sale price', 'selling price', 'sell price', 'retail price', 'mrp', 'rate', 'sale rate', 'retail', 'qeemat', 'new price', 'nayi price'] },
  costPrice: { key: 'costPrice', label: 'Cost Price', hint: 'Kharid ki price — Profit isi se banta hai', aliases: ['cost', 'cost price', 'purchase price', 'buy price', 'purchase rate', 'purchase', 'kharid', 'new cost', 'nayi cost'] },
  wholesalePrice: { key: 'wholesalePrice', label: 'Wholesale Price', hint: 'Thok (wholesale) grahak ki price', aliases: ['wholesale', 'wholesale price', 'trade price', 'b2b', 'thok'] },
  stock: { key: 'stock', label: 'Stock', hint: 'Abhi dukaan me kitna maal hai (opening stock)', aliases: ['stock', 'qty', 'quantity', 'opening stock', 'in stock', 'on hand', 'current stock', 'available', 'inventory'] },
  unit: { key: 'unit', label: 'Unit', hint: 'pcs, kg, liter, dozen, meter…', aliases: ['unit', 'uom', 'measure', 'unit of measure'] },
  category: { key: 'category', label: 'Category', hint: 'Nayi category khud ban jati hai', aliases: ['category', 'category name', 'cat', 'department', 'section', 'group'] },
  brand: { key: 'brand', label: 'Brand', hint: 'Naya brand khud ban jata hai', aliases: ['brand', 'brand name', 'company', 'manufacturer', 'maker'] },
  sku: { key: 'sku', label: 'SKU', hint: 'Apna code — har product ka alag', aliases: ['sku', 'code', 'item code', 'product code', 'ref'] },
  barcode: { key: 'barcode', label: 'Barcode', hint: 'Packet par chhapa code — har product ka alag', aliases: ['barcode', 'bar code', 'ean', 'upc'] },
  lowStockAlert: { key: 'lowStockAlert', label: 'Low Stock Alert', hint: 'Stock is se kam ho to yaad dilayein', aliases: ['low stock', 'low stock alert', 'reorder', 'reorder level', 'min stock', 'minimum', 'alert'] },
  taxRate: { key: 'taxRate', label: 'Tax %', hint: 'Sales tax percent, jaise 18', aliases: ['tax', 'tax %', 'tax rate', 'gst', 'vat'] },
  description: { key: 'description', label: 'Description', hint: 'Product ki tafseel', aliases: ['description', 'details', 'detail', 'notes'] },
  variant: { key: 'variant', label: 'Variant', hint: 'Ek naam ki kai lines = ek product, har line ek variant', aliases: ['variant', 'variants', 'variant names', 'option', 'type'] },
  size: { key: 'size', label: 'Size', hint: 'Size ho to variant ban jata hai', aliases: ['size', 'naap'] },
  color: { key: 'color', label: 'Color', hint: 'Color ho to variant ban jata hai', aliases: ['color', 'colour', 'rang'] },
  packName: { key: 'packName', label: 'Pack Name', hint: 'Carton, Dozen, Box…', aliases: ['pack', 'pack name', 'pack type', 'carton name', 'pack unit'] },
  packQty: { key: 'packQty', label: 'Pack Qty', hint: 'Ek pack me kitne pcs', aliases: ['pack qty', 'pack size', 'per pack', 'pcs per pack', 'carton qty', 'units per pack', 'pack me kitne'] },
  packPrice: { key: 'packPrice', label: 'Pack Price', hint: 'Khali ho to price × pack qty', aliases: ['pack price', 'carton price', 'box price'] },
  packBarcode: { key: 'packBarcode', label: 'Pack Barcode', hint: 'Carton/box par chhapa code', aliases: ['pack barcode', 'carton barcode', 'box barcode'] },
  batchNumber: { key: 'batchNumber', label: 'Batch No', hint: 'Opening stock ka batch', aliases: ['batch', 'batch no', 'batch number', 'lot', 'lot no'] },
  expiryDate: { key: 'expiryDate', label: 'Expiry Date', hint: '2027-03-31 ya 31/03/2027', aliases: ['expiry', 'expiry date', 'exp', 'exp date', 'expires', 'expire'] },
};

const CREATE_FIELDS: ImportField[] = [
  'name', 'price', 'costPrice', 'stock', 'unit', 'category', 'brand', 'sku', 'barcode', 'wholesalePrice', 'lowStockAlert', 'taxRate',
  'description', 'variant', 'size', 'color', 'packName', 'packQty', 'packPrice', 'packBarcode', 'batchNumber', 'expiryDate',
];
const PRICE_FIELDS: ImportField[] = ['sku', 'barcode', 'name', 'variant', 'size', 'color', 'packName', 'price', 'costPrice'];

/** Fields that can be mapped in a mode. */
export const fieldsOf = (mode: ImportMode) => (mode === 'create' ? CREATE_FIELDS : PRICE_FIELDS).map((k) => FIELDS[k]);

type Features = Partial<BusinessFeatures>;

/** Template columns for the shop's industry. */
export function templateFields(features: Features): ImportField[] {
  const out: ImportField[] = ['name', 'price', 'costPrice', 'stock', 'unit', 'category', 'brand', 'sku', 'barcode', 'lowStockAlert'];
  if (features.bulkPricing) out.splice(3, 0, 'wholesalePrice');
  if (features.sizeMatrix || features.variantImages) out.push('variant', 'size', 'color');
  if (features.multiUnit) out.push('packName', 'packQty', 'packPrice', 'packBarcode');
  if (features.expiry || features.batches) out.push('batchNumber', 'expiryDate');
  return out;
}

type Sample = Partial<Record<ImportField, string | number>>;

/** Example rows per kind of business, so the template looks like the shop's own stock. */
function samples(businessType: string, unit: string): Sample[] {
  switch (businessType) {
    case 'GROCERY': case 'AGRI': case 'DAIRY': case 'MEAT':
      return [
        { name: 'Tapal Danedar 190g', price: 390, costPrice: 360, stock: 48, unit: 'pcs', category: 'Chai', brand: 'Tapal', barcode: '8964000100123', lowStockAlert: 12, packName: 'Carton', packQty: 24, packPrice: 9000, batchNumber: 'T-0925', expiryDate: '2027-06-30' },
        { name: 'Basmati Chawal', price: 420, costPrice: 360, stock: 75, unit: 'kg', category: 'Chawal', lowStockAlert: 10 },
      ];
    case 'PHARMACY':
      return [
        { name: 'Panadol 500mg', price: 35, costPrice: 29, stock: 200, unit: 'strip', category: 'Pain relief', brand: 'GSK', barcode: '6291107190012', packName: 'Box', packQty: 20, batchNumber: 'PN2291', expiryDate: '2027-03-31' },
      ];
    case 'BAKERY':
      return [
        { name: 'Chocolate Cake 1 Pound', price: 1200, costPrice: 750, stock: 6, unit: 'pcs', category: 'Cakes' },
        { name: 'Rusk', price: 480, costPrice: 360, stock: 20, unit: 'kg', category: 'Rusk', expiryDate: '2026-12-31' },
      ];
    case 'CLOTHING': case 'SHOE': case 'SPORTS':
      return [
        { name: 'Cotton Kurta', size: 'M', color: 'White', price: 2500, costPrice: 1600, stock: 10, unit: 'pcs', category: 'Kurta', sku: 'KUR-M-WHT' },
        { name: 'Cotton Kurta', size: 'L', color: 'White', price: 2500, costPrice: 1600, stock: 8, unit: 'pcs', category: 'Kurta', sku: 'KUR-L-WHT' },
      ];
    default:
      return [
        { name: 'Sample Product', price: 1000, costPrice: 700, stock: 25, unit, category: 'General', sku: 'SKU-001', lowStockAlert: 5 },
      ];
  }
}

/** Header text → comparable key ("Cost Price", "cost_price" and "costPrice" all match). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]/g, '');

/** Best field for each column; a field is used once, for its first matching column. */
export function detectMapping(headers: string[], mode: ImportMode): Array<ImportField | ''> {
  const fields = fieldsOf(mode);
  const used = new Set<ImportField>();
  return headers.map((h) => {
    const k = norm(h);
    if (!k) return '';
    const hit = fields.find((f) => !used.has(f.key) && (norm(f.label) === k || norm(f.key) === k || f.aliases.some((a) => norm(a) === k)));
    if (!hit) return '';
    used.add(hit.key);
    return hit.key;
  });
}

export interface Sheet {
  fileName: string;
  headers: string[];
  rows: Array<{ line: number; cells: string[] }>;
}

const pad = (n: number) => String(n).padStart(2, '0');

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('fullwide', { useGrouping: false }) : String(v);
  return String(v).trim();
}

/** Header row and data rows of a grid; empty rows are dropped, line numbers kept. */
function fromGrid(fileName: string, grid: unknown[][]): Sheet {
  const start = grid.findIndex((r) => r.filter((c) => cellText(c) !== '').length >= 2);
  if (start < 0) return { fileName, headers: [], rows: [] };
  const headers = grid[start].map(cellText);
  const rows: Sheet['rows'] = [];
  for (let i = start + 1; i < grid.length; i++) {
    const cells = headers.map((_, c) => cellText(grid[i]?.[c]));
    if (cells.some((c) => c !== '')) rows.push({ line: i + 1, cells });
  }
  return { fileName, headers, rows };
}

/** First sheet of an .xlsx / .xls / .csv file. CSV cells stay text so codes keep their leading zeros. */
export async function readFile(file: File): Promise<Sheet> {
  const XLSX = await import('xlsx');
  const csv = /\.(csv|txt)$/i.test(file.name) || file.type === 'text/csv';
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true, raw: csv });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '', blankrows: true });
  return fromGrid(file.name, grid);
}

/** Cells copied from Excel or Google Sheets (tab separated), or comma separated text. */
export function readPasted(text: string): Sheet {
  const lines = text.replace(/\r/g, '').split('\n');
  const sep = text.includes('\t') ? '\t' : ',';
  return fromGrid('Paste kiya data', lines.map((l) => l.split(sep)));
}

/** Rows for the API from the sheet and the column mapping. */
export function toImportRows(sheet: Sheet, mapping: Array<ImportField | ''>): ImportRow[] {
  return sheet.rows.map(({ line, cells }) => {
    const row: ImportRow = { row: line };
    mapping.forEach((f, i) => { if (f && cells[i]) row[f] = cells[i]; });
    return row;
  });
}

/**
 * Chunks for the run. Rows of one product (same name) stay in one chunk so
 * its variants are created together.
 */
export function chunkRows(rows: ImportRow[], mode: ImportMode, size: number): ImportRow[][] {
  if (mode === 'prices') {
    const out: ImportRow[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
  }
  const groups = new Map<string, ImportRow[]>();
  for (const r of rows) {
    const k = (r.name ?? '').trim().toLowerCase() || `#${r.row}`;
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const out: ImportRow[][] = [];
  let cur: ImportRow[] = [];
  for (const g of groups.values()) {
    if (cur.length && cur.length + g.length > size) { out.push(cur); cur = []; }
    cur.push(...g);
  }
  if (cur.length) out.push(cur);
  return out;
}

async function save(name: string, sheets: Array<{ title: string; rows: unknown[][]; widths?: number[] }>) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    if (s.widths) ws['!cols'] = s.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, s.title.slice(0, 31));
  }
  XLSX.writeFile(wb, name);
}

const today = () => new Date().toISOString().slice(0, 10);

/** Empty template for new products with example rows and a column guide. */
export async function downloadTemplate(opts: { features: Features; businessType: string; unit: string; categories: string[] }) {
  const keys = templateFields(opts.features);
  const head = keys.map((k) => FIELDS[k].label);
  const rows = samples(opts.businessType, opts.unit).map((s) => keys.map((k) => s[k] ?? ''));
  const guide: unknown[][] = [
    ['Column', 'Kya likhna hai'],
    ...keys.map((k) => [FIELDS[k].label, FIELDS[k].hint]),
    [],
    ['Yaad rakhein'],
    ['Pehli line column ke naam hain — inhe na badlein, baqi lines me apna maal likhein.'],
    ['Sample lines mita kar apni lines likhein.'],
    ['SKU aur Barcode column ko Text format me rakhein taake shuru ke 0 na katein.'],
    ['Ek hi naam ki kai lines me Size/Color/Variant ho to ek product ke variants bante hain.'],
    ['Jo naam ya barcode pehle se products me hai wo line chhor di jati hai.'],
  ];
  await save(`products-template-${today()}.xlsx`, [
    { title: 'Products', rows: [head, ...rows], widths: keys.map((k) => (k === 'name' ? 28 : 14)) },
    { title: 'Hidayat', rows: guide, widths: [18, 70] },
    ...(opts.categories.length ? [{ title: 'Categories', rows: [['Pehle se bani categories'], ...opts.categories.map((c) => [c])], widths: [30] }] : []),
  ]);
}

/** Every product with its current price, ready to edit for a price update. */
export async function downloadPriceSheet(rows: PriceSheetRow[], withCost: boolean) {
  const head = ['Name', 'Variant', 'Pack Name', 'Category', 'SKU', 'Barcode', 'Price', ...(withCost ? ['Cost Price'] : [])];
  const body = rows.map((r) => [r.name, r.variant, r.packName, r.category, r.sku, r.barcode, r.price, ...(withCost ? [r.costPrice ?? ''] : [])]);
  await save(`price-list-${today()}.xlsx`, [{ title: 'Prices', rows: [head, ...body], widths: [30, 14, 12, 16, 14, 16, 10, 10] }]);
}

/** The file's own rows that need fixing, with the reason in the last column. */
export async function downloadProblemRows(sheet: Sheet, problems: Map<number, string>) {
  const rows = sheet.rows.filter((r) => problems.has(r.line)).map((r) => [...r.cells, r.line, problems.get(r.line)]);
  await save(`import-ghaltiyan-${today()}.xlsx`, [
    { title: 'Theek karein', rows: [[...sheet.headers, 'File line', 'Kya ghalat hai'], ...rows], widths: [...sheet.headers.map(() => 14), 9, 60] },
  ]);
}

/** Failed rows saved with an earlier import (the file itself is not kept). */
export async function downloadJobErrors(fileName: string, errors: Array<{ row: number; name: string; error: string }>) {
  await save(`ghaltiyan-${fileName.replace(/\.[^.]+$/, '')}.xlsx`, [
    { title: 'Ghaltiyan', rows: [['File line', 'Name', 'Kya ghalat hai'], ...errors.map((e) => [e.row, e.name, e.error])], widths: [9, 30, 70] },
  ]);
}

/** Price changes made by an earlier price update. */
export async function downloadJobChanges(
  fileName: string,
  changes: Array<{ row: number; name: string; price?: { from: number; to: number }; costPrice?: { from: number; to: number } }>,
  withCost: boolean,
) {
  const head = ['File line', 'Name', 'Purani price', 'Nayi price', ...(withCost ? ['Purani cost', 'Nayi cost'] : [])];
  const rows = changes.map((c) => [c.row, c.name, c.price?.from ?? '', c.price?.to ?? '', ...(withCost ? [c.costPrice?.from ?? '', c.costPrice?.to ?? ''] : [])]);
  await save(`price-changes-${fileName.replace(/\.[^.]+$/, '')}.xlsx`, [{ title: 'Changes', rows: [head, ...rows], widths: [9, 32, 12, 12, 12, 12] }]);
}
