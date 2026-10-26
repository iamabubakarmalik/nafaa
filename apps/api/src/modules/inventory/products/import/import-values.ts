/**
 * Cell parsing for the product import. Every cell arrives as text; these
 * helpers turn it into names, codes, amounts and dates and collect a short
 * Roman Urdu reason for anything that cannot be used.
 */

import type { UnitConversionType } from '@prisma/client';
import type { ImportRowDto } from './product-import.dto';

export interface ParsedPack {
  name: string;
  qty: number;
  price: number | null;
  barcode: string | null;
}

/** A sheet row with its values parsed, plus what is wrong with it. */
export interface ParsedRow {
  row: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  brand: string | null;
  unit: string | null;
  description: string | null;
  price: number | null;
  costPrice: number | null;
  wholesalePrice: number | null;
  creditPrice: number | null;
  taxRate: number | null;
  stock: number | null;
  lowStockAlert: number | null;
  variants: string[];
  size: string | null;
  color: string | null;
  pack: ParsedPack | null;
  batchNumber: string | null;
  expiry: Date | null;
  /** 15-digit phone IMEIs; each one is a phone in stock. */
  imeis: string[];
  errors: string[];
  warnings: string[];
  /** First problem per field, so the grid can mark the cell. */
  fieldErrors: Partial<Record<ImportField, string>>;
}

export type ImportField = Exclude<keyof ImportRowDto, 'row'>;

const UNIT_ALIASES: Record<string, string> = {
  piece: 'pcs', pieces: 'pcs', pc: 'pcs', each: 'pcs', nos: 'pcs', no: 'pcs', adad: 'pcs',
  kilo: 'kg', kilos: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg',
  grams: 'gram', gm: 'gram', gms: 'gram', g: 'gram', gr: 'gram',
  litre: 'liter', liters: 'liter', litres: 'liter', ltr: 'liter', l: 'liter',
  millilitre: 'ml', milliliter: 'ml',
  pack: 'packet', packets: 'packet', pkt: 'packet',
  btl: 'bottle', bottles: 'bottle',
  dz: 'dozen', doz: 'dozen',
  boxes: 'box', ctn: 'carton', cartons: 'carton', bags: 'bag',
  metre: 'meter', meters: 'meter', metres: 'meter', mtr: 'meter',
  pairs: 'pair', strips: 'strip',
};

/** Lower-case key used for every name and code comparison. */
export const keyOf = (v: string) => v.trim().toLowerCase();

/** Pack type stored on the unit, guessed from its name. */
export function packType(name: string): UnitConversionType {
  const n = keyOf(name);
  if (n.includes('dozen') || n === 'dz') return 'DOZEN';
  if (n.includes('carton') || n === 'ctn') return 'CARTON';
  if (n.includes('box') || n.includes('dabba')) return 'BOX';
  if (n.includes('pack') || n.includes('pkt')) return 'PACK';
  return 'CUSTOM';
}

/** Urdu (Extended Arabic-Indic) and Arabic-Indic digits to 0-9. */
const toAsciiDigits = (s: string) =>
  s.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/**
 * Amount or quantity typed by hand: "Rs 1,250", "Rs. 1,250/-", "1250.00",
 * " 12 ", "12 pcs", "2.5 kg", "۱۲". A trailing unit word is dropped.
 */
export function parseNumber(raw: string): number | null {
  const cleaned = toAsciiDigits(raw)
    .replace(/\u2212/g, '-')
    .replace(/(rs\.?|pkr|rupees?|rupay|₨)/gi, '')
    .replace(/\/-\s*$/, '')
    .replace(/[,\s\u00a0]/g, '')
    .replace(/(?<=\d)[a-z]{1,10}\.?$/i, '');
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** IMEIs typed in one cell, split on commas, spaces, slashes or new lines. */
export function parseImeis(raw: string | undefined): { list: string[]; bad: string[] } {
  const parts = toAsciiDigits(raw ?? '').split(/[\s,;/|]+/).map((x) => x.trim()).filter(Boolean);
  const list: string[] = [];
  const bad: string[] = [];
  for (const x of parts) (/^\d{15}$/.test(x) ? list : bad).push(x);
  return { list, bad };
}

/** Date as yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy or an Excel day number. */
function parseDate(raw: string): Date | null {
  const s = raw.trim();
  let y: number, m: number, d: number;
  let hit = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (hit) [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  else if ((hit = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s))) {
    [d, m, y] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
    if (y < 100) y += 2000;
  } else if (/^\d{5}$/.test(s)) {
    // Excel stores dates as days since 1899-12-30.
    const date = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86_400_000);
    return Number.isNaN(date.getTime()) ? null : date;
  } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

/** Records a problem in the row's list and on its field (first one wins). */
export function addError(
  target: { errors: string[]; fieldErrors: Partial<Record<ImportField, string>> },
  field: ImportField | null,
  message: string,
) {
  target.errors.push(message);
  if (field && !target.fieldErrors[field]) target.fieldErrors[field] = message;
}

/** Text, code and amount readers that note what is wrong in `errors`. */
function readers(errors: string[], fieldErrors: Partial<Record<ImportField, string>> = {}) {
  const fail = (field: ImportField, message: string) => addError({ errors, fieldErrors }, field, message);
  const text = (v: string | undefined, label: string, max: number, field: ImportField): string | null => {
    const s = (v ?? '').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    if (s.length > max) {
      fail(field, `${label} bohat lamba hai (${max} haroof tak)`);
      return s.slice(0, max);
    }
    return s;
  };
  const code = (v: string | undefined, label: string, field: ImportField): string | null => {
    const s = text(v, label, 60, field);
    // Scanners never send a space, so a barcode with one cannot be scanned.
    if (s && /barcode/i.test(label) && /\s/.test(s)) fail(field, `${label} "${s}" me khali jagah hai`);
    return s;
  };
  const amount = (v: string | undefined, label: string, field: ImportField, max = 100_000_000): number | null => {
    const s = (v ?? '').trim();
    if (!s) return null;
    const n = parseNumber(s);
    if (n === null) {
      fail(field, `${label} "${s}" number nahi`);
      return null;
    }
    if (n < 0) {
      fail(field, `${label} minus me nahi ho sakta`);
      return null;
    }
    if (n > max) {
      fail(field, `${label} ${n} bohat bara hai`);
      return null;
    }
    return Math.round(n * 10_000) / 10_000;
  };
  return { text, code, amount, fail };
}

/** A price-update row: what to match on and the new price and cost. */
export function parsePriceRow(input: ImportRowDto) {
  const errors: string[] = [];
  const fieldErrors: Partial<Record<ImportField, string>> = {};
  const { text, code, amount } = readers(errors, fieldErrors);
  const size = text(input.size, 'Size', 100, 'size');
  const color = text(input.color, 'Color', 100, 'color');
  return {
    row: input.row,
    name: text(input.name, 'Naam', 200, 'name') ?? '',
    sku: code(input.sku, 'SKU', 'sku'),
    barcode: code(input.barcode, 'Barcode', 'barcode'),
    variant: text(input.variant, 'Variant', 100, 'variant') ?? ([size, color].filter(Boolean).join(' / ') || null),
    packName: text(input.packName, 'Pack ka naam', 40, 'packName'),
    price: amount(input.price, 'Price', 'price'),
    costPrice: amount(input.costPrice, 'Cost price', 'costPrice'),
    errors,
    fieldErrors,
  };
}

export function parseRow(input: ImportRowDto): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldErrors: Partial<Record<ImportField, string>> = {};
  const { text, code, amount, fail } = readers(errors, fieldErrors);

  const name = text(input.name, 'Naam', 200, 'name') ?? '';
  if (!name) fail('name', 'Naam khaali hai');

  const rawUnit = text(input.unit, 'Unit', 20, 'unit');
  const unit = rawUnit ? (UNIT_ALIASES[keyOf(rawUnit)] ?? rawUnit.toLowerCase()) : null;

  const price = amount(input.price, 'Price', 'price');
  const costPrice = amount(input.costPrice, 'Cost price', 'costPrice');
  const wholesalePrice = amount(input.wholesalePrice, 'Wholesale price', 'wholesalePrice');
  const creditPrice = amount(input.creditPrice, 'Credit price', 'creditPrice');
  const taxRate = amount(input.taxRate, 'Tax', 'taxRate', 100);
  const stock = amount(input.stock, 'Stock', 'stock', 10_000_000);
  const lowStockAlert = amount(input.lowStockAlert, 'Low stock alert', 'lowStockAlert', 10_000_000);

  const size = text(input.size, 'Size', 100, 'size');
  const color = text(input.color, 'Color', 100, 'color');
  const variantCell = text(input.variant, 'Variant', 500, 'variant');
  let variants: string[] = [];
  if (variantCell) variants = variantCell.split(',').map((v) => v.trim()).filter(Boolean);
  else if (size || color) variants = [[size, color].filter(Boolean).join(' / ')];
  if (variants.some((v) => v.length > 100)) fail('variant', 'Variant ka naam bohat lamba hai (100 haroof tak)');

  const sku = code(input.sku, 'SKU', 'sku');
  const barcode = code(input.barcode, 'Barcode', 'barcode');

  let pack: ParsedPack | null = null;
  const packName = text(input.packName, 'Pack ka naam', 40, 'packName');
  const packQty = amount(input.packQty, 'Pack me kitne', 'packQty', 1_000_000);
  const packPrice = amount(input.packPrice, 'Pack price', 'packPrice');
  const packBarcode = code(input.packBarcode, 'Pack barcode', 'packBarcode');
  if (packName || packQty !== null || packPrice !== null || packBarcode) {
    if (!packName) fail('packName', 'Pack ka naam likhein (jaise Carton, Dozen)');
    else if (packQty === null) fail('packQty', `${packName} me kitne ${unit ?? 'pcs'} hain — "Pack me kitne" likhein`);
    else if (packQty <= 1) fail('packQty', 'Pack me 1 se zyada hone chahiye');
    else if (unit && keyOf(packName) === keyOf(unit)) fail('packName', 'Pack ka naam aur unit ek jaise hain');
    else pack = { name: packName, qty: packQty, price: packPrice, barcode: packBarcode };
  }

  const batchNumber = text(input.batchNumber, 'Batch number', 60, 'batchNumber');
  const expiryRaw = (input.expiryDate ?? '').trim();
  const expiry = expiryRaw ? parseDate(expiryRaw) : null;
  if (expiryRaw && !expiry) fail('expiryDate', `Expiry date "${expiryRaw}" samajh nahi aayi — 2027-03-31 ya 31/03/2027 likhein`);

  const { list: imeis, bad } = parseImeis(input.imei);
  if (bad.length) fail('imei', `IMEI 15 number ka hota hai — ye theek nahi: ${bad.slice(0, 3).join(', ')}`);
  else if (new Set(imeis).size !== imeis.length) fail('imei', 'Ek hi IMEI do dafa likha hai');
  else if (imeis.length && stock !== null && stock !== imeis.length) {
    fail('stock', `Stock ${stock} hai magar IMEI ${imeis.length} hain — phone ka stock IMEI ginti se banta hai, Stock khaali chhor dein`);
  }

  return {
    row: input.row, name, sku, barcode, unit,
    category: text(input.category, 'Category', 100, 'category'),
    brand: text(input.brand, 'Brand', 100, 'brand'),
    description: text(input.description, 'Description', 2000, 'description'),
    price, costPrice, wholesalePrice, creditPrice, taxRate,
    stock: imeis.length ? imeis.length : stock,
    lowStockAlert,
    variants, size, color, pack, batchNumber, expiry, imeis, errors, warnings, fieldErrors,
  };
}
