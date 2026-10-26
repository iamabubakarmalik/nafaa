/**
 * Import columns: what each field means, the header names it is detected
 * from (English, Roman Urdu and Urdu), which columns an industry's template
 * gets, sample files, and the Excel / CSV reading and writing of the import.
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
  name: { key: 'name', label: 'Name', hint: 'Product ka naam — zaroori', aliases: ['name', 'product', 'product name', 'item', 'item name', 'items', 'title', 'description of goods', 'article', 'naam', 'product naam', 'item naam', 'cheez', 'maal', 'نام', 'پروڈکٹ', 'آئٹم'] },
  price: { key: 'price', label: 'Price', hint: 'Bechne ki price (sale price)', aliases: ['price', 'sale price', 'selling price', 'sell price', 'retail price', 'mrp', 'rate', 'sale rate', 'retail', 'retail rate', 'unit price', 'sp', 'qeemat', 'keemat', 'bechne ki qeemat', 'new price', 'nayi price', 'قیمت', 'ریٹ'] },
  costPrice: { key: 'costPrice', label: 'Cost Price', hint: 'Company / kharid ki price — Profit isi se banta hai', aliases: ['cost', 'cost price', 'company price', 'company rate', 'purchase price', 'buy price', 'buying price', 'purchase rate', 'purchase', 'cp', 'kharid', 'khareed', 'kharid qeemat', 'new cost', 'nayi cost', 'لاگت', 'خرید'] },
  wholesalePrice: { key: 'wholesalePrice', label: 'Wholesale Price', hint: 'Thok (wholesale) grahak ki price', aliases: ['wholesale', 'wholesale price', 'wholesale rate', 'trade price', 'tp', 'b2b', 'thok', 'thok rate'] },
  creditPrice: { key: 'creditPrice', label: 'Credit Price', hint: 'Udhaar grahak ki price — khaali ho to Retail price lagegi', aliases: ['credit', 'credit price', 'credit rate', 'udhaar', 'udhaar price', 'udhaar rate', 'udhar', 'udhar price', 'udhar rate', 'ادھار'] },
  stock: { key: 'stock', label: 'Stock', hint: 'Abhi dukaan me kitna maal hai — chuni hui branch me opening stock banta hai', aliases: ['stock', 'qty', 'quantity', 'opening stock', 'opening qty', 'opening', 'in stock', 'on hand', 'qty in hand', 'qty on hand', 'stock in hand', 'current stock', 'closing stock', 'balance', 'stock qty', 'available', 'available qty', 'inventory', 'units', 'pcs', 'maujooda', 'maujooda stock', 'mojood', 'mojooda', 'miqdar', 'tadad', 'ginti', 'اسٹاک', 'سٹاک', 'مقدار', 'تعداد', 'موجودہ'] },
  unit: { key: 'unit', label: 'Unit', hint: 'pcs, kg, liter, dozen, meter…', aliases: ['unit', 'uom', 'measure', 'unit of measure', 'packing unit', 'ikai', 'یونٹ'] },
  category: { key: 'category', label: 'Category', hint: 'Nayi category khud ban jati hai', aliases: ['category', 'category name', 'cat', 'department', 'section', 'group', 'type of item', 'qisam', 'kism', 'قسم', 'کیٹیگری'] },
  brand: { key: 'brand', label: 'Brand', hint: 'Naya brand khud ban jata hai', aliases: ['brand', 'brand name', 'company', 'company name', 'manufacturer', 'maker', 'make', 'برانڈ', 'کمپنی'] },
  sku: { key: 'sku', label: 'SKU', hint: 'Apna code — har product ka alag', aliases: ['sku', 'code', 'item code', 'product code', 'ref', 'article no', 'item no', 'model', 'model no', 'کوڈ'] },
  barcode: { key: 'barcode', label: 'Barcode', hint: 'Packet par chhapa code — har product ka alag', aliases: ['barcode', 'bar code', 'barcode no', 'ean', 'upc', 'gtin', 'بارکوڈ'] },
  lowStockAlert: { key: 'lowStockAlert', label: 'Low Stock Alert', hint: 'Stock is se kam ho to yaad dilayein', aliases: ['low stock', 'low stock alert', 'reorder', 'reorder level', 'reorder point', 'min stock', 'minimum stock', 'minimum', 'min qty', 'alert'] },
  taxRate: { key: 'taxRate', label: 'Tax %', hint: 'Sales tax percent, jaise 18', aliases: ['tax', 'tax %', 'tax rate', 'gst', 'gst %', 'vat', 'sales tax'] },
  description: { key: 'description', label: 'Description', hint: 'Product ki tafseel', aliases: ['description', 'details', 'detail', 'notes', 'tafseel'] },
  variant: { key: 'variant', label: 'Variant', hint: 'Ek naam ki kai lines = ek product, har line ek variant', aliases: ['variant', 'variants', 'variant name', 'variant names', 'option', 'flavour', 'flavor'] },
  size: { key: 'size', label: 'Size', hint: 'Size ho to variant ban jata hai', aliases: ['size', 'sizes', 'naap', 'saiz', 'سائز'] },
  color: { key: 'color', label: 'Color', hint: 'Color ho to variant ban jata hai', aliases: ['color', 'colour', 'colors', 'rang', 'رنگ'] },
  packName: { key: 'packName', label: 'Pack Name', hint: 'Carton, Dozen, Box, Strip…', aliases: ['pack', 'pack name', 'pack type', 'carton name', 'pack unit', 'packing'] },
  packQty: { key: 'packQty', label: 'Pack Qty', hint: 'Ek pack me kitne pcs', aliases: ['pack qty', 'pack size', 'per pack', 'pcs per pack', 'carton qty', 'pcs per carton', 'units per pack', 'pack me kitne', 'carton me kitne'] },
  packPrice: { key: 'packPrice', label: 'Pack Price', hint: 'Khali ho to price × pack qty', aliases: ['pack price', 'carton price', 'box price', 'carton rate', 'pack rate'] },
  packBarcode: { key: 'packBarcode', label: 'Pack Barcode', hint: 'Carton/box par chhapa code', aliases: ['pack barcode', 'carton barcode', 'box barcode'] },
  batchNumber: { key: 'batchNumber', label: 'Batch No', hint: 'Opening stock ka batch', aliases: ['batch', 'batch no', 'batch number', 'lot', 'lot no', 'lot number'] },
  expiryDate: { key: 'expiryDate', label: 'Expiry Date', hint: '2027-03-31 ya 31/03/2027', aliases: ['expiry', 'expiry date', 'exp', 'exp date', 'expires', 'expire', 'expiration', 'best before', 'mayaad'] },
  imei: { key: 'imei', label: 'IMEI', hint: 'Phone ke 15 number wale IMEI, comma se alag — phone ka stock IMEI ginti se banta hai', aliases: ['imei', 'imeis', 'imei no', 'imei number', 'imei 1', 'imei1', 'serial imei'] },
};

export const CREATE_FIELDS: ImportField[] = [
  'name', 'price', 'costPrice', 'stock', 'unit', 'category', 'brand', 'sku', 'barcode', 'wholesalePrice', 'creditPrice', 'lowStockAlert', 'taxRate',
  'description', 'variant', 'size', 'color', 'packName', 'packQty', 'packPrice', 'packBarcode', 'batchNumber', 'expiryDate', 'imei',
];
export const PRICE_FIELDS: ImportField[] = ['sku', 'barcode', 'name', 'variant', 'size', 'color', 'packName', 'price', 'costPrice'];

/** Fields that can be mapped in a mode. */
export const fieldsOf = (mode: ImportMode) => (mode === 'create' ? CREATE_FIELDS : PRICE_FIELDS).map((k) => FIELDS[k]);

type Features = Partial<BusinessFeatures>;

/** Template columns for the shop's industry. */
export function templateFields(features: Features): ImportField[] {
  const out: ImportField[] = ['name', 'price', 'costPrice', 'stock', 'unit', 'category', 'brand', 'sku', 'barcode', 'lowStockAlert'];
  if (features.bulkPricing) out.splice(3, 0, 'wholesalePrice', 'creditPrice');
  if (features.sizeMatrix || features.variantImages) out.push('variant', 'size', 'color');
  if (features.multiUnit) out.push('packName', 'packQty', 'packPrice', 'packBarcode');
  if (features.expiry || features.batches) out.push('batchNumber', 'expiryDate');
  if (features.imei) out.push('imei');
  return out;
}

type Sample = Partial<Record<ImportField, string | number>>;

/** Canonical industry for the samples (old names map to new ones). */
function kindOf(businessType: string): string {
  const t = (businessType || '').toUpperCase();
  if (/KIRYANA|GROCERY|AGRI|DAIRY|MEAT|GENERAL_STORE|SUPERMARKET|MART/.test(t)) return 'GROCERY';
  if (/PHARMACY|MEDICAL|CHEMIST/.test(t)) return 'PHARMACY';
  if (/BAKERY|SWEET/.test(t)) return 'BAKERY';
  if (/CLOTH|GARMENT|BOUTIQUE/.test(t)) return 'CLOTHING';
  if (/SHOE|FOOTWEAR/.test(t)) return 'SHOE';
  if (/MOBILE|ELECTRONIC|APPLIANCE/.test(t)) return 'MOBILE';
  if (/HARDWARE|AUTO|PAINT|SANITARY/.test(t)) return 'HARDWARE';
  if (/COSMETIC|BEAUTY/.test(t)) return 'COSMETICS';
  if (/STATIONERY|BOOK/.test(t)) return 'STATIONERY';
  return 'OTHER';
}

/** Example rows per kind of business, so the template and sample look like the shop's own stock. */
function samples(businessType: string, unit: string): Sample[] {
  switch (kindOf(businessType)) {
    case 'GROCERY':
      return [
        { name: 'Tapal Danedar 190g', price: 390, costPrice: 360, stock: 48, unit: 'pcs', category: 'Chai', brand: 'Tapal', barcode: '8964000100123', lowStockAlert: 12, packName: 'Carton', packQty: 24, packPrice: 9000, batchNumber: 'T-0925', expiryDate: '2027-06-30' },
        { name: 'Basmati Chawal', price: 420, costPrice: 360, stock: 75, unit: 'kg', category: 'Chawal', lowStockAlert: 10 },
        { name: 'Dalda Cooking Oil 1L', price: 610, costPrice: 560, stock: 30, unit: 'pcs', category: 'Ghee / Oil', brand: 'Dalda', barcode: '8961008200017', lowStockAlert: 6, packName: 'Carton', packQty: 12 },
        { name: 'Surf Excel 1kg', price: 650, costPrice: 590, stock: 20, unit: 'pcs', category: 'Sabun / Surf', brand: 'Unilever', barcode: '8961014030014' },
        { name: 'Shan Biryani Masala', price: 140, costPrice: 118, stock: 60, unit: 'pcs', category: 'Masala', brand: 'Shan', barcode: '8964000400025', packName: 'Dabba', packQty: 12, expiryDate: '2027-01-31' },
        { name: 'Cheeni', price: 165, costPrice: 150, stock: 120.5, unit: 'kg', category: 'Cheeni / Atta' },
        { name: 'Olpers Milk 1L', price: 330, costPrice: 305, stock: 36, unit: 'pcs', category: 'Doodh', brand: 'Engro', barcode: '8961100200019', expiryDate: '2026-12-15' },
        { name: 'Lux Soap', price: 120, costPrice: 98, stock: 144, unit: 'pcs', category: 'Sabun / Surf', brand: 'Unilever', packName: 'Dozen', packQty: 12, packPrice: 1380 },
      ];
    case 'PHARMACY':
      return [
        { name: 'Panadol 500mg', price: 35, costPrice: 29, stock: 200, unit: 'strip', category: 'Pain relief', brand: 'GSK', barcode: '6291107190012', packName: 'Box', packQty: 20, batchNumber: 'PN2291', expiryDate: '2027-03-31' },
        { name: 'Brufen 400mg', price: 60, costPrice: 50, stock: 80, unit: 'strip', category: 'Pain relief', brand: 'Abbott', packName: 'Box', packQty: 10, batchNumber: 'BR0412', expiryDate: '2027-08-31' },
        { name: 'Augmentin 625mg', price: 520, costPrice: 470, stock: 25, unit: 'strip', category: 'Antibiotic', brand: 'GSK', batchNumber: 'AG7781', expiryDate: '2026-12-31' },
        { name: 'ORS Sachet', price: 30, costPrice: 22, stock: 150, unit: 'pcs', category: 'General', packName: 'Box', packQty: 50, batchNumber: 'OR551', expiryDate: '2028-01-31' },
        { name: 'Surbex Z', price: 480, costPrice: 420, stock: 18, unit: 'bottle', category: 'Vitamins', brand: 'Abbott', batchNumber: 'SZ300', expiryDate: '2027-05-31' },
      ];
    case 'BAKERY':
      return [
        { name: 'Chocolate Cake 1 Pound', price: 1200, costPrice: 750, stock: 6, unit: 'pcs', category: 'Cakes' },
        { name: 'Rusk', price: 480, costPrice: 360, stock: 20, unit: 'kg', category: 'Rusk', expiryDate: '2026-12-31' },
        { name: 'Bread Large', price: 220, costPrice: 170, stock: 25, unit: 'pcs', category: 'Bread', expiryDate: '2026-10-30' },
        { name: 'Chicken Patties', price: 120, costPrice: 70, stock: 40, unit: 'pcs', category: 'Savory' },
        { name: 'Gulab Jamun', price: 1400, costPrice: 950, stock: 8.5, unit: 'kg', category: 'Mithai' },
      ];
    case 'CLOTHING':
      return [
        { name: 'Cotton Kurta', size: 'M', color: 'White', price: 2500, costPrice: 1600, stock: 10, unit: 'pcs', category: 'Kurta', sku: 'KUR-M-WHT' },
        { name: 'Cotton Kurta', size: 'L', color: 'White', price: 2500, costPrice: 1600, stock: 8, unit: 'pcs', category: 'Kurta', sku: 'KUR-L-WHT' },
        { name: 'Cotton Kurta', size: 'L', color: 'Black', price: 2600, costPrice: 1650, stock: 5, unit: 'pcs', category: 'Kurta', sku: 'KUR-L-BLK' },
        { name: 'Lawn 3 Piece', size: 'Unstitched', color: 'Blue', price: 4500, costPrice: 3100, stock: 12, unit: 'pcs', category: 'Lawn', brand: 'Gul Ahmed' },
        { name: 'Denim Jeans', size: '32', color: 'Blue', price: 3200, costPrice: 2100, stock: 7, unit: 'pcs', category: 'Jeans', sku: 'JNS-32-BLU' },
        { name: 'Denim Jeans', size: '34', color: 'Blue', price: 3200, costPrice: 2100, stock: 6, unit: 'pcs', category: 'Jeans', sku: 'JNS-34-BLU' },
      ];
    case 'SHOE':
      return [
        { name: 'Peshawari Chappal', size: '41', color: 'Brown', price: 3500, costPrice: 2300, stock: 4, unit: 'pair', category: 'Chappal', sku: 'PC-41-BRN' },
        { name: 'Peshawari Chappal', size: '42', color: 'Brown', price: 3500, costPrice: 2300, stock: 6, unit: 'pair', category: 'Chappal', sku: 'PC-42-BRN' },
        { name: 'Peshawari Chappal', size: '43', color: 'Black', price: 3500, costPrice: 2300, stock: 3, unit: 'pair', category: 'Chappal', sku: 'PC-43-BLK' },
        { name: 'Joggers', size: '40', color: 'White', price: 4200, costPrice: 2900, stock: 5, unit: 'pair', category: 'Joggers', brand: 'Servis' },
        { name: 'Joggers', size: '42', color: 'White', price: 4200, costPrice: 2900, stock: 5, unit: 'pair', category: 'Joggers', brand: 'Servis' },
      ];
    case 'MOBILE':
      return [
        { name: 'Samsung Galaxy A15 128GB', price: 52000, costPrice: 47500, unit: 'pcs', category: 'Mobile', brand: 'Samsung', imei: '356789012345678, 356789012345686' },
        { name: 'Infinix Hot 40 256GB', price: 41000, costPrice: 37000, unit: 'pcs', category: 'Mobile', brand: 'Infinix', imei: '351234567890125' },
        { name: 'Type-C Charger 25W', price: 1800, costPrice: 1100, stock: 20, unit: 'pcs', category: 'Accessories', brand: 'Samsung', barcode: '8806094000011' },
        { name: 'Silicone Back Cover', price: 450, costPrice: 180, stock: 60, unit: 'pcs', category: 'Accessories' },
        { name: 'Handsfree', price: 650, costPrice: 300, stock: 35, unit: 'pcs', category: 'Accessories', brand: 'Audionic' },
      ];
    case 'HARDWARE':
      return [
        { name: 'PVC Pipe 1 inch', price: 260, costPrice: 210, stock: 120, unit: 'meter', category: 'Pipes', brand: 'Dadex' },
        { name: 'Wall Screw 2 inch', price: 6, costPrice: 4, stock: 2000, unit: 'pcs', category: 'Screws', packName: 'Box', packQty: 100, packPrice: 550 },
        { name: 'Cement Bag', price: 1450, costPrice: 1380, stock: 50, unit: 'bag', category: 'Cement', brand: 'Lucky' },
        { name: 'Paint 1 Gallon', price: 3600, costPrice: 3100, stock: 15, unit: 'pcs', category: 'Paint', brand: 'Berger' },
      ];
    case 'COSMETICS':
      return [
        { name: 'Lipstick Matte', variant: 'Red', price: 950, costPrice: 600, stock: 12, unit: 'pcs', category: 'Lips', brand: 'Rivaj' },
        { name: 'Lipstick Matte', variant: 'Nude', price: 950, costPrice: 600, stock: 9, unit: 'pcs', category: 'Lips', brand: 'Rivaj' },
        { name: 'Face Wash 100ml', price: 650, costPrice: 480, stock: 24, unit: 'pcs', category: 'Skin care', brand: 'Garnier', expiryDate: '2027-09-30' },
      ];
    case 'STATIONERY':
      return [
        { name: 'Register 200 Pages', price: 180, costPrice: 130, stock: 100, unit: 'pcs', category: 'Copies', packName: 'Dozen', packQty: 12 },
        { name: 'Blue Ball Pen', price: 25, costPrice: 15, stock: 500, unit: 'pcs', category: 'Pens', brand: 'Dollar', packName: 'Box', packQty: 10 },
        { name: 'Geometry Box', price: 350, costPrice: 240, stock: 30, unit: 'pcs', category: 'School' },
      ];
    default:
      return [
        { name: 'Sample Product', price: 1000, costPrice: 700, stock: 25, unit, category: 'General', sku: 'SKU-001', lowStockAlert: 5 },
        { name: 'Doosra Product', price: 450, costPrice: 300, stock: 40, unit, category: 'General', sku: 'SKU-002', lowStockAlert: 5 },
        { name: 'Teesra Product', price: 1250, costPrice: 900, stock: 10.5, unit, category: 'Special', sku: 'SKU-003' },
      ];
  }
}

/** Header text → comparable key. Keeps Urdu letters; drops spaces, dots, brackets and the like. */
const norm = (s: string) => s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}%]/gu, '');

/** A header that means money or a running number, never stock. */
const NOT_STOCK = /value|amount|worth|price|rate|cost|qeemat|total(rs|amount)|rs$|sr|serial|sno|^no$|^#$/;
/** Headers that name a different price, so "price" alone must not win. */
const NOT_PRICE: Partial<Record<ImportField, RegExp>> = {
  price: /cost|purchase|kharid|khareed|wholesale|thok|trade|credit|udhaar|udhar|company|pack|carton|box|old|purani/,
  brand: /price|rate|cost/,
  stock: NOT_STOCK,
  name: /code|barcode|sku|category|brand|company|unit/,
  barcode: /pack|carton|box/,
};

/** How well a header names a field: exact name, starts with an alias, contains one (or a short alias as a word), or 0. */
function score(header: string, f: FieldDef): number {
  const k = norm(header);
  if (!k) return 0;
  if (norm(f.label) === k || norm(f.key) === k || f.aliases.some((a) => norm(a) === k)) return 1000;
  if (NOT_PRICE[f.key]?.test(k)) return 0;
  let best = 0;
  const words = new Set(header.toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}%]+/u).filter(Boolean));
  for (const a of [f.label, ...f.aliases]) {
    const n = norm(a);
    if (n.length < 4) {
      // Short aliases ("qty", "gst", "cp") count only as a whole word, so "closing" never matches "gst".
      if (n.length >= 3 && words.has(n)) best = Math.max(best, 150 + n.length);
      continue;
    }
    if (k.startsWith(n)) best = Math.max(best, 200 + n.length);
    else if (k.includes(n)) best = Math.max(best, 100 + n.length);
  }
  return best;
}

/** Best field for each column; a field is used once, for the column that names it best. */
export function detectMapping(headers: string[], mode: ImportMode): Array<ImportField | ''> {
  const fields = fieldsOf(mode);
  const pairs: Array<{ col: number; field: ImportField; s: number }> = [];
  headers.forEach((h, col) => {
    for (const f of fields) {
      const s = score(h, f);
      if (s > 0) pairs.push({ col, field: f.key, s });
    }
  });
  // Strongest matches first; ties go to the left-most column.
  pairs.sort((a, b) => b.s - a.s || a.col - b.col);
  const out: Array<ImportField | ''> = headers.map(() => '');
  const used = new Set<ImportField>();
  for (const p of pairs) {
    if (out[p.col] || used.has(p.field)) continue;
    out[p.col] = p.field;
    used.add(p.field);
  }
  // Many shop lists call the product name "Description".
  if (!used.has('name')) {
    const d = out.indexOf('description');
    if (d >= 0) out[d] = 'name';
  }
  return out;
}

/** Columns of a row that look like import headers (used to find the header row). */
function headerHits(cells: string[]): number {
  return detectMapping(cells, 'create').filter(Boolean).length;
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
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('fullwide', { useGrouping: false }) : String(Math.round(v * 10_000) / 10_000);
  return String(v).replace(/ /g, ' ').trim();
}

/**
 * Header row and data rows of a grid. The header is the row among the first
 * 25 that names the most fields (a shop name or date above it is skipped);
 * a blank header cell takes the text above it (two-row merged headers).
 * Empty rows and columns are dropped; file line numbers are kept.
 */
function fromGrid(fileName: string, grid: unknown[][]): Sheet & { hits: number } {
  const text = grid.map((r) => (r ?? []).map(cellText));
  let start = -1;
  let hits = 0;
  for (let i = 0; i < Math.min(text.length, 25); i++) {
    if (text[i].filter(Boolean).length < 2) continue;
    const h = headerHits(text[i]);
    if (h > hits) { hits = h; start = i; }
  }
  if (start < 0) start = text.findIndex((r) => r.filter(Boolean).length >= 2);
  if (start < 0) return { fileName, headers: [], rows: [], hits: 0 };

  const width = Math.max(...text.slice(start, start + 200).map((r) => r.length));
  const above = start > 0 ? text[start - 1] : [];
  const headers = Array.from({ length: width }, (_, c) => text[start][c] || (above.filter(Boolean).length >= 2 ? above[c] ?? '' : ''));
  const rows: Sheet['rows'] = [];
  for (let i = start + 1; i < text.length; i++) {
    const cells = headers.map((_, c) => text[i]?.[c] ?? '');
    if (!cells.some((c) => c !== '')) continue;
    // A repeated header line (sheets printed page by page) is not a product.
    if (cells.join('|').toLowerCase() === headers.join('|').toLowerCase()) continue;
    rows.push({ line: i + 1, cells });
  }
  // Drop columns with no header and no data.
  const keep = headers.map((h, c) => !!h || rows.some((r) => r.cells[c]));
  return {
    fileName,
    hits,
    headers: headers.filter((_, c) => keep[c]).map((h, c) => h || `Column ${c + 1}`),
    rows: rows.map((r) => ({ line: r.line, cells: r.cells.filter((_, c) => keep[c]) })),
  };
}

/**
 * The sheet of an .xlsx / .xls / .csv file that looks most like a product
 * list. CSV cells stay text so codes keep their leading zeros.
 */
export async function readFile(file: File): Promise<Sheet> {
  const XLSX = await import('xlsx');
  const csv = /\.(csv|txt)$/i.test(file.name) || file.type === 'text/csv';
  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true, raw: csv });
  let best: (Sheet & { hits: number }) | null = null;
  for (const name of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: true });
    const sheet = fromGrid(file.name, grid);
    if (!best || sheet.hits > best.hits || (sheet.hits === best.hits && sheet.rows.length > best.rows.length && !best.rows.length)) best = sheet;
  }
  const { hits: _hits, ...sheet } = best ?? { fileName: file.name, headers: [], rows: [], hits: 0 };
  return sheet;
}

/** Cells copied from Excel or Google Sheets (tab separated), or comma separated text. */
export function readPasted(text: string): Sheet {
  const lines = text.replace(/\r/g, '').split('\n');
  const sep = text.includes('\t') ? '\t' : ',';
  const { hits: _hits, ...sheet } = fromGrid('Paste kiya data', lines.map((l) => l.split(sep)));
  return sheet;
}

/** Rows for the API from grid rows (id = file line, cells by field). Empty rows are left out. */
export function toImportRows(rows: Array<{ id: number; cells: Partial<Record<string, string>> }>, fields: ImportField[]): ImportRow[] {
  return rows.filter(({ cells }) => fields.some((f) => cells[f]?.trim())).map(({ id, cells }) => {
    const row: ImportRow = { row: id };
    for (const f of fields) {
      const v = cells[f]?.trim();
      if (v) row[f] = v;
    }
    return row;
  });
}

/** Grid rows from the file and the column mapping. */
export function sheetToGridRows(sheet: Sheet, mapping: Array<ImportField | ''>) {
  return sheet.rows.map(({ line, cells }) => {
    const out: Record<string, string> = {};
    mapping.forEach((f, i) => { if (f && cells[i]) out[f] = cells[i]; });
    return { id: line, cells: out };
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

function guideSheet(keys: ImportField[], features: Features): unknown[][] {
  return [
    ['Column', 'Kya likhna hai'],
    ...keys.map((k) => [FIELDS[k].label, FIELDS[k].hint]),
    [],
    ['Yaad rakhein'],
    ['Pehli line column ke naam hain — inhe na badlein, baqi lines me apna maal likhein.'],
    ['Sample lines mita kar apni lines likhein. Khaali lines khud chhor di jati hain.'],
    ['Stock: abhi dukaan me jitna maal hai wo likhein (jaise 24 ya 12.5). Import ke waqt jo branch chunenge stock usi me "Opening stock" ban kar jata hai.'],
    ['Stock, Price aur Cost me "Rs 1,250" ya "1250" dono chalte hain — comma aur Rs khud hat jate hain.'],
    ['Jo product pehle se hai: import ke waqt chun sakte hain — stock jama karein, stock file wala kar dein, ya chhor dein.'],
    ['SKU aur Barcode column ko Text format me rakhein taake shuru ke 0 na katein.'],
    ...(features.sizeMatrix || features.variantImages ? [['Ek hi naam ki kai lines me Size/Color/Variant ho to ek product ke variants bante hain — har line ka stock us variant ka hai.']] : []),
    ...(features.multiUnit ? [['Pack Name + Pack Qty (jaise Carton, 24) se pack lag jata hai. Stock hamesha khule (Unit) me likhein, carton me nahi.']] : []),
    ...(features.expiry || features.batches ? [['Batch No aur Expiry Date us stock ke hain jo is line me likha hai.']] : []),
    ...(features.imei ? [['Mobile phone: IMEI column me har phone ka 15 number wala IMEI likhein (comma se alag). Phone ka stock IMEI ginti se banta hai — Stock khaali chhor dein. Accessories ka stock seedha likhein.']] : []),
  ];
}

/** Empty template for new products with example rows and a column guide. */
export async function downloadTemplate(opts: { features: Features; businessType: string; unit: string; categories: string[] }) {
  const keys = templateFields(opts.features);
  const head = keys.map((k) => FIELDS[k].label);
  const rows = samples(opts.businessType, opts.unit).slice(0, 2).map((s) => keys.map((k) => s[k] ?? ''));
  await save(`products-template-${today()}.xlsx`, [
    { title: 'Products', rows: [head, ...rows], widths: keys.map((k) => (k === 'name' ? 28 : k === 'imei' ? 36 : 14)) },
    { title: 'Hidayat', rows: guideSheet(keys, opts.features), widths: [18, 90] },
    ...(opts.categories.length ? [{ title: 'Categories', rows: [['Pehle se bani categories'], ...opts.categories.map((c) => [c])], widths: [30] }] : []),
  ]);
}

/** A filled example file for the industry, to try the import end to end. */
export async function downloadSample(opts: { features: Features; businessType: string; unit: string }) {
  const keys = templateFields(opts.features);
  const list = samples(opts.businessType, opts.unit);
  // Only columns the examples use, so the sample stays easy to read.
  const used = keys.filter((k) => k === 'name' || k === 'stock' || list.some((s) => s[k] !== undefined && s[k] !== ''));
  await save(`sample-products-${kindOf(opts.businessType).toLowerCase()}.xlsx`, [
    { title: 'Products', rows: [used.map((k) => FIELDS[k].label), ...list.map((s) => used.map((k) => s[k] ?? ''))], widths: used.map((k) => (k === 'name' ? 28 : k === 'imei' ? 36 : 14)) },
    { title: 'Hidayat', rows: guideSheet(used, opts.features), widths: [18, 90] },
  ]);
}

/** Every product with its current price, ready to edit for a price update. */
export async function downloadPriceSheet(rows: PriceSheetRow[], withCost: boolean) {
  const head = ['Name', 'Variant', 'Pack Name', 'Category', 'SKU', 'Barcode', 'Price', ...(withCost ? ['Cost Price'] : [])];
  const body = rows.map((r) => [r.name, r.variant, r.packName, r.category, r.sku, r.barcode, r.price, ...(withCost ? [r.costPrice ?? ''] : [])]);
  await save(`price-list-${today()}.xlsx`, [{ title: 'Prices', rows: [head, ...body], widths: [30, 14, 12, 16, 14, 16, 10, 10] }]);
}

/** Grid rows that need fixing, in the import's own columns, with the reason in the last column. */
export async function downloadProblemRows(
  fields: ImportField[],
  rows: Array<{ id: number; cells: Partial<Record<string, string>> }>,
  problems: Map<number, string>,
) {
  const body = rows.filter((r) => problems.has(r.id)).map((r) => [...fields.map((f) => r.cells[f] ?? ''), r.id, problems.get(r.id)]);
  await save(`import-ghaltiyan-${today()}.xlsx`, [
    { title: 'Theek karein', rows: [[...fields.map((f) => FIELDS[f].label), 'File line', 'Kya ghalat hai'], ...body], widths: [...fields.map((f) => (f === 'name' ? 28 : 14)), 9, 60] },
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
