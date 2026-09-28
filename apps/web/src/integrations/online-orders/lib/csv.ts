import type { ExportProduct } from '../api/online-orders.api';

/**
 * Products ki CSV — WooCommerce aur Shopify dono ke apne import
 * formats me, taake dukandar seedha unke "Import products" me daal de.
 * Aur ulta: unki export ki hui CSV parh kar Nafaa me lana.
 */

const esc = (v: any): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (header: string[], rows: any[][]) =>
  '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'product';

export function wooCsv(products: ExportProduct[]): string {
  const header = [
    'ID', 'Type', 'SKU', 'Name', 'Published', 'Short description', 'Description',
    'In stock?', 'Stock', 'Regular price', 'Categories', 'Images', 'Parent',
    'Attribute 1 name', 'Attribute 1 value(s)', 'Attribute 1 visible', 'Attribute 1 global',
  ];
  const rows: any[][] = [];
  for (const p of products) {
    const parentSku = p.sku || `NF-${p.id.slice(0, 8)}`;
    if (p.variants.length) {
      rows.push([
        '', 'variable', parentSku, p.name, 1, p.shortDescription ?? '', p.description ?? '',
        p.inStock ? 1 : 0, '', '', p.category ?? '', p.images.join(', '), '',
        'Option', p.variants.map((v) => v.name).join(' | '), 1, 0,
      ]);
      for (const v of p.variants) {
        rows.push([
          '', 'variation', v.sku || '', `${p.name} - ${v.name}`, 1, '', '',
          v.stock > 0 ? 1 : 0, v.stock, v.price, '', '', parentSku,
          'Option', v.name, '', 0,
        ]);
      }
    } else {
      rows.push([
        '', 'simple', parentSku, p.name, 1, p.shortDescription ?? '', p.description ?? '',
        p.inStock ? 1 : 0, p.stock, p.price, p.category ?? '', p.images.join(', '), '',
        '', '', '', '',
      ]);
    }
  }
  return toCsv(header, rows);
}

export function shopifyCsv(products: ExportProduct[]): string {
  const header = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Published',
    'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Inventory Tracker', 'Variant Inventory Qty',
    'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping',
    'Image Src', 'Image Position', 'Status',
  ];
  const rows: any[][] = [];
  for (const p of products) {
    const handle = slug(p.name) + (p.sku ? `-${slug(p.sku)}` : '');
    const variants = p.variants.length ? p.variants : [{ name: 'Default Title', sku: p.sku, price: p.price, stock: p.stock }];
    variants.forEach((v, i) => {
      rows.push([
        handle, i === 0 ? p.name : '', i === 0 ? p.description ?? '' : '', '', '', i === 0 ? p.category ?? '' : '',
        i === 0 ? 'TRUE' : '', i === 0 ? 'Title' : '', v.name, v.sku ?? '', 'shopify', v.stock,
        'deny', 'manual', v.price, 'TRUE', i === 0 ? p.images[0] ?? '' : '', i === 0 && p.images[0] ? 1 : '', i === 0 ? 'active' : '',
      ]);
    });
    p.images.slice(1).forEach((img, i) => {
      rows.push([handle, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', img, i + 2, '']);
    });
  }
  return toCsv(header, rows);
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ═══════════════════════════════════════════════════════════════
// PARSE — WooCommerce / Shopify / apni simple CSV
// ═══════════════════════════════════════════════════════════════

/** Quotes, commas aur new-lines ke saath sahi CSV parser */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export interface ParsedProduct {
  name: string;
  sku?: string;
  barcode?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  category?: string;
  description?: string;
  images?: string[];
  id?: string;
}

export type CsvFormat = 'woocommerce' | 'shopify' | 'simple';

const n = (v?: string) => {
  if (v === undefined || v === null || v.trim() === '') return undefined;
  const x = Number(v.replace(/[^\d.-]/g, ''));
  return Number.isFinite(x) ? x : undefined;
};
const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || undefined;

export function csvToProducts(text: string): { format: CsvFormat; products: ParsedProduct[] } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { format: 'simple', products: [] };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => {
    for (const nm of names) {
      const i = head.indexOf(nm.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');

  // ─── Shopify ───
  if (col('handle') >= 0 && col('title') >= 0) {
    const iH = col('handle'), iT = col('title'), iSku = col('variant sku'), iP = col('variant price'),
      iQ = col('variant inventory qty'), iImg = col('image src'), iType = col('type', 'product category'),
      iBody = col('body (html)'), iBar = col('variant barcode'), iCost = col('cost per item');
    const byHandle = new Map<string, ParsedProduct>();
    for (const r of rows.slice(1)) {
      const h = get(r, iH);
      if (!h) continue;
      const existing = byHandle.get(h);
      const img = get(r, iImg);
      if (existing) {
        if (img) existing.images = [...(existing.images ?? []), img];
        continue;
      }
      const title = get(r, iT);
      if (!title) continue;
      byHandle.set(h, {
        id: h, name: title, sku: get(r, iSku) || undefined, barcode: get(r, iBar) || undefined,
        price: n(get(r, iP)), costPrice: n(get(r, iCost)), stock: n(get(r, iQ)), category: get(r, iType) || undefined,
        description: stripHtml(get(r, iBody)), images: img ? [img] : [],
      });
    }
    return { format: 'shopify', products: [...byHandle.values()] };
  }

  // ─── WooCommerce ───
  if (col('regular price') >= 0 || (col('type') >= 0 && col('published') >= 0)) {
    const iType = col('type'), iName = col('name'), iSku = col('sku'), iReg = col('regular price'),
      iSale = col('sale price'), iStock = col('stock'), iCat = col('categories'), iImg = col('images'),
      iDesc = col('short description', 'description'), iId = col('id'), iGtin = col('gtin, upc, ean, or isbn', 'gtin');
    const products: ParsedProduct[] = [];
    for (const r of rows.slice(1)) {
      const type = get(r, iType).toLowerCase();
      if (type.includes('variation')) continue; // variation ka parent kaafi hai
      const name = get(r, iName);
      if (!name) continue;
      products.push({
        id: get(r, iId) || undefined, name, sku: get(r, iSku) || undefined, barcode: get(r, iGtin) || undefined,
        price: n(get(r, iSale)) ?? n(get(r, iReg)), stock: n(get(r, iStock)),
        category: get(r, iCat).split(/[>,]/)[0]?.trim() || undefined,
        description: stripHtml(get(r, iDesc)),
        images: get(r, iImg).split(',').map((s) => s.trim()).filter(Boolean),
      });
    }
    return { format: 'woocommerce', products };
  }

  // ─── Simple: name, sku, price, stock, category, barcode, cost, image ───
  const iName = col('name', 'product', 'product name', 'title', 'naam'), iSku = col('sku', 'code'),
    iPrice = col('price', 'sale price', 'qeemat', 'rate'), iStock = col('stock', 'qty', 'quantity'),
    iCat = col('category', 'categories'), iBar = col('barcode'), iCost = col('cost', 'cost price', 'purchase price'),
    iImg = col('image', 'images', 'image url'), iDesc = col('description');
  const products = rows.slice(1).map((r) => ({
    name: get(r, iName), sku: get(r, iSku) || undefined, price: n(get(r, iPrice)), stock: n(get(r, iStock)),
    category: get(r, iCat) || undefined, barcode: get(r, iBar) || undefined, costPrice: n(get(r, iCost)),
    images: get(r, iImg) ? [get(r, iImg)] : [], description: get(r, iDesc) || undefined,
  })).filter((p) => p.name);
  return { format: 'simple', products };
}
