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
  taxRate: number | null;
  stock: number | null;
  lowStockAlert: number | null;
  variants: string[];
  size: string | null;
  color: string | null;
  pack: ParsedPack | null;
  batchNumber: string | null;
  expiry: Date | null;
  errors: string[];
  warnings: string[];
}

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

/** Amount or quantity typed by hand: "Rs 1,250", "1250.00", " 12 ". */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/rs\.?|pkr|,|\s/gi, '');
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
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

/** Text, code and amount readers that note what is wrong in `errors`. */
function readers(errors: string[]) {
  const text = (v: string | undefined, label: string, max: number): string | null => {
    const s = (v ?? '').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    if (s.length > max) {
      errors.push(`${label} bohat lamba hai (${max} haroof tak)`);
      return s.slice(0, max);
    }
    return s;
  };
  const code = (v: string | undefined, label: string): string | null => {
    const s = text(v, label, 60);
    // Scanners never send a space, so a barcode with one cannot be scanned.
    if (s && /barcode/i.test(label) && /\s/.test(s)) errors.push(`${label} "${s}" me khali jagah hai`);
    return s;
  };
  const amount = (v: string | undefined, label: string, max = 100_000_000): number | null => {
    const s = (v ?? '').trim();
    if (!s) return null;
    const n = parseNumber(s);
    if (n === null) {
      errors.push(`${label} "${s}" number nahi`);
      return null;
    }
    if (n < 0) {
      errors.push(`${label} minus me nahi ho sakta`);
      return null;
    }
    if (n > max) {
      errors.push(`${label} ${n} bohat bara hai`);
      return null;
    }
    return Math.round(n * 10_000) / 10_000;
  };
  return { text, code, amount };
}

/** A price-update row: what to match on and the new price and cost. */
export function parsePriceRow(input: ImportRowDto) {
  const errors: string[] = [];
  const { text, code, amount } = readers(errors);
  const size = text(input.size, 'Size', 100);
  const color = text(input.color, 'Color', 100);
  return {
    row: input.row,
    name: text(input.name, 'Naam', 200) ?? '',
    sku: code(input.sku, 'SKU'),
    barcode: code(input.barcode, 'Barcode'),
    variant: text(input.variant, 'Variant', 100) ?? ([size, color].filter(Boolean).join(' / ') || null),
    packName: text(input.packName, 'Pack ka naam', 40),
    price: amount(input.price, 'Price'),
    costPrice: amount(input.costPrice, 'Cost price'),
    errors,
  };
}

export function parseRow(input: ImportRowDto): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { text, code, amount } = readers(errors);

  const name = text(input.name, 'Naam', 200) ?? '';
  if (!name) errors.push('Naam khaali hai');

  const rawUnit = text(input.unit, 'Unit', 20);
  const unit = rawUnit ? (UNIT_ALIASES[keyOf(rawUnit)] ?? rawUnit.toLowerCase()) : null;

  const price = amount(input.price, 'Price');
  const costPrice = amount(input.costPrice, 'Cost price');
  const wholesalePrice = amount(input.wholesalePrice, 'Wholesale price');
  const taxRate = amount(input.taxRate, 'Tax', 100);
  const stock = amount(input.stock, 'Stock', 10_000_000);
  const lowStockAlert = amount(input.lowStockAlert, 'Low stock alert', 10_000_000);

  const size = text(input.size, 'Size', 100);
  const color = text(input.color, 'Color', 100);
  const variantCell = text(input.variant, 'Variant', 500);
  let variants: string[] = [];
  if (variantCell) variants = variantCell.split(',').map((v) => v.trim()).filter(Boolean);
  else if (size || color) variants = [[size, color].filter(Boolean).join(' / ')];
  if (variants.some((v) => v.length > 100)) errors.push('Variant ka naam bohat lamba hai (100 haroof tak)');

  const sku = code(input.sku, 'SKU');
  const barcode = code(input.barcode, 'Barcode');

  let pack: ParsedPack | null = null;
  const packName = text(input.packName, 'Pack ka naam', 40);
  const packQty = amount(input.packQty, 'Pack me kitne', 1_000_000);
  const packPrice = amount(input.packPrice, 'Pack price');
  const packBarcode = code(input.packBarcode, 'Pack barcode');
  if (packName || packQty !== null || packPrice !== null || packBarcode) {
    if (!packName) errors.push('Pack ka naam likhein (jaise Carton, Dozen)');
    else if (packQty === null) errors.push(`${packName} me kitne ${unit ?? 'pcs'} hain — "Pack me kitne" likhein`);
    else if (packQty <= 1) errors.push('Pack me 1 se zyada hone chahiye');
    else if (unit && keyOf(packName) === keyOf(unit)) errors.push('Pack ka naam aur unit ek jaise hain');
    else pack = { name: packName, qty: packQty, price: packPrice, barcode: packBarcode };
  }

  const batchNumber = text(input.batchNumber, 'Batch number', 60);
  const expiryRaw = (input.expiryDate ?? '').trim();
  const expiry = expiryRaw ? parseDate(expiryRaw) : null;
  if (expiryRaw && !expiry) errors.push(`Expiry date "${expiryRaw}" samajh nahi aayi — 2027-03-31 ya 31/03/2027 likhein`);

  return {
    row: input.row, name, sku, barcode, unit,
    category: text(input.category, 'Category', 100),
    brand: text(input.brand, 'Brand', 100),
    description: text(input.description, 'Description', 2000),
    price, costPrice, wholesalePrice, taxRate, stock, lowStockAlert,
    variants, size, color, pack, batchNumber, expiry, errors, warnings,
  };
}
