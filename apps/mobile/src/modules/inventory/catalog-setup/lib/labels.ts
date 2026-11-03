/**
 * Barcode labels, same as the web: the shop's label design (saved on the
 * server, so every counter prints the same stickers), sheet layouts in exact
 * millimetres (thermal roll or A4 sticker sheets), barcodes as inline SVG and
 * the print document. The print queue stays on this phone.
 */

import JsBarcode from 'jsbarcode';
import { isEan13 } from '@nafaa/core/inventory';
import { apiClient } from '@/core/api/client';
import { formatMoney } from '@/core/format';
import { msg } from '@/core/i18n';
import { kv } from '@/core/storage/kv';
import type { PackRow, ProductDetail } from '@/core/offline';
import { esc } from './print';

export type LabelSheet = 'thermal' | 'a4-65' | 'a4-40' | 'a4-24' | 'a4-21' | 'a4-14' | 'custom';
export type LabelFormat = 'CODE128' | 'EAN13' | 'QR';

export interface LabelConfig {
  sheet: LabelSheet; widthMm: number; heightMm: number; cols: number; gapMm: number; marginMm: number; format: LabelFormat;
  showShop: boolean; showName: boolean; showVariant: boolean; showPrice: boolean; showOldPrice: boolean; showSku: boolean; showUnit: boolean;
  showCode: boolean; showExpiry: boolean; border: boolean; priceSource: 'retail' | 'wholesale' | 'credit' | 'cost-code'; align: 'left' | 'center';
  fontScale: number; barHeight: number; shopText: string; footerText: string; copies: 'one' | 'stock';
}

export const LABEL_DEFAULTS: LabelConfig = {
  sheet: 'thermal', widthMm: 50, heightMm: 30, cols: 1, gapMm: 2, marginMm: 0, format: 'CODE128',
  showShop: true, showName: true, showVariant: true, showPrice: true, showOldPrice: false, showSku: false,
  showUnit: false, showCode: true, showExpiry: false, border: false, priceSource: 'retail', align: 'center',
  fontScale: 1, barHeight: 0.7, shopText: '', footerText: '', copies: 'one',
};

export const labelsApi = {
  settings: () => apiClient.get<{ config: LabelConfig; missingBarcodes: number }>('/barcode-labels/settings').then((r) => r.data),
  save: (patch: Partial<LabelConfig>) => apiClient.patch<LabelConfig>('/barcode-labels/settings', patch).then((r) => r.data),
  assign: (productIds: string[], variants = true) => apiClient.post<{ products: number; variants: number }>('/barcode-labels/assign', { productIds, variants }).then((r) => r.data),
};

export interface LabelData { name: string; variant?: string; unit?: string; sku?: string; code: string; price: number; oldPrice?: number | null; expiry?: string | null }

export const SAMPLE: LabelData = { name: 'Namoona cheez', variant: 'Large', unit: 'Piece', sku: 'SKU-101', code: '2001234567893', price: 1250, oldPrice: 1500, expiry: '12/2027' };

interface SheetPreset { label: string; hint: string; w: number; h: number; cols: number; rows: number; gapX: number; gapY: number }

export const A4_SHEETS: Record<Exclude<LabelSheet, 'thermal' | 'custom'>, SheetPreset> = {
  'a4-65': { label: msg('65 label'), hint: msg('Choti cheezein, cosmetics, pharmacy'), w: 38.1, h: 21.2, cols: 5, rows: 13, gapX: 2.5, gapY: 0 },
  'a4-40': { label: msg('40 label'), hint: msg('Grocery aur general store'), w: 48.5, h: 25.4, cols: 4, rows: 10, gapX: 0, gapY: 0 },
  'a4-24': { label: msg('24 label'), hint: msg('Kapre, joote, bari qeemat'), w: 64, h: 33.9, cols: 3, rows: 8, gapX: 2, gapY: 0 },
  'a4-21': { label: msg('21 label'), hint: msg('Shelf aur dabbe'), w: 63.5, h: 38.1, cols: 3, rows: 7, gapX: 2.5, gapY: 0 },
  'a4-14': { label: msg('14 label'), hint: msg('Bara label, carton aur box'), w: 99.1, h: 38.1, cols: 2, rows: 7, gapX: 2.5, gapY: 0 },
};
export const THERMAL_SIZES: Array<[number, number]> = [[50, 30], [40, 25], [38, 25], [58, 40]];

const A4_W = 210;
const A4_H = 297;

export interface SheetLayout { roll: boolean; pageW: number; pageH: number; w: number; h: number; cols: number; rows: number; gapX: number; gapY: number; left: number; top: number; perPage: number }

export function sheetLayout(c: LabelConfig): SheetLayout {
  if (c.sheet === 'thermal') {
    const cols = Math.min(Math.max(1, c.cols), 4);
    const pageW = cols * c.widthMm + (cols - 1) * c.gapMm;
    return { roll: true, pageW, pageH: c.heightMm, w: c.widthMm, h: c.heightMm, cols, rows: 1, gapX: c.gapMm, gapY: 0, left: 0, top: 0, perPage: cols };
  }
  if (c.sheet === 'custom') {
    const m = c.marginMm;
    const fitCols = Math.max(1, Math.floor((A4_W - 2 * m + c.gapMm) / (c.widthMm + c.gapMm)));
    const rows = Math.max(1, Math.floor((A4_H - 2 * m + c.gapMm) / (c.heightMm + c.gapMm)));
    const cols = Math.min(Math.max(1, c.cols), fitCols);
    return { roll: false, pageW: A4_W, pageH: A4_H, w: c.widthMm, h: c.heightMm, cols, rows, gapX: c.gapMm, gapY: c.gapMm, left: m, top: m, perPage: cols * rows };
  }
  const s = A4_SHEETS[c.sheet];
  const left = (A4_W - s.cols * s.w - (s.cols - 1) * s.gapX) / 2;
  const top = (A4_H - s.rows * s.h - (s.rows - 1) * s.gapY) / 2;
  return { roll: false, pageW: A4_W, pageH: A4_H, w: s.w, h: s.h, cols: s.cols, rows: s.rows, gapX: s.gapX, gapY: s.gapY, left, top, perPage: s.cols * s.rows };
}

export const labelPrice = (n: number) => formatMoney(n);

/** Linear barcode as an SVG that stretches to its box; EAN-13 only for valid codes. */
export function linearSvg(code: string, ean: boolean): { svg: string; modules: number } {
  try {
    const target: { encodings?: Array<{ data: string }> } = {};
    JsBarcode(target as never, code, { format: ean && isEan13(code) ? 'EAN13' : 'CODE128', margin: 0, displayValue: false, flat: true });
    const bits = (target.encodings ?? []).map((e) => e.data).join('');
    if (!bits) return { svg: '', modules: 0 };
    let rects = '';
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== '1') continue;
      let run = 1;
      while (bits[i + run] === '1') run++;
      rects += `<rect x="${i}" y="0" width="${run}" height="60"/>`;
      i += run - 1;
    }
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bits.length} 60" width="100%" height="100%" preserveAspectRatio="none"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g></svg>`, modules: bits.length };
  } catch {
    return { svg: '', modules: 0 };
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mm = (n: number) => `${n.toFixed(2)}mm`;

function labelBody(d: LabelData, c: LabelConfig, lay: SheetLayout, shopName: string, cache: Map<string, { svg: string; modules: number }>) {
  const { w, h } = lay;
  const fs = c.fontScale;
  const pad = clamp(Math.min(w, h) * 0.05, 0.8, 2.5);
  const innerW = w - 2 * pad;
  const small = clamp(h * 0.07, 1.5, 3) * fs;
  const nameSize = clamp(h * 0.09, 1.9, 4.2) * fs;
  const priceSize = clamp(h * 0.12, 2.3, 6.5) * fs;
  const lh = 1.15;
  const rows: string[] = [];
  let used = 0;
  const line = (size: number, html: string, cls = 't', lines = 1) => { rows.push(`<div class="${cls}" style="font-size:${mm(size)}">${html}</div>`); used += size * lh * lines + 0.25; };
  const shop = (c.shopText || shopName).trim();
  if (c.showShop && shop) line(small, esc(shop), 't sh');
  if (c.showName) line(nameSize, esc(d.name), 'nm', d.name.length * nameSize * 0.55 > innerW ? 2 : 1);
  const meta = [c.showVariant && d.variant, c.showUnit && d.unit, c.showSku && d.sku].filter(Boolean).join(' · ');
  if (meta) line(small, esc(meta));
  if (c.showExpiry && d.expiry) line(small, `Exp ${esc(d.expiry)}`);
  const after: string[] = [];
  let afterUsed = 0;
  const tail = (size: number, html: string, cls = 't') => { after.push(`<div class="${cls}" style="font-size:${mm(size)}">${html}</div>`); afterUsed += size * lh + 0.25; };
  if (c.showCode && d.code) tail(small * 0.95, esc(d.code), 't cd');
  if (c.showPrice) {
    const old = c.showOldPrice && d.oldPrice && d.oldPrice > d.price ? `<span class="old" style="font-size:${mm(priceSize * 0.62)}">${esc(labelPrice(d.oldPrice))}</span>` : '';
    tail(priceSize, `${old}${esc(labelPrice(d.price))}`, 't pr');
  }
  if (c.footerText.trim()) tail(small, esc(c.footerText.trim()));
  let bar = '';
  if (d.code) {
    const room = Math.max(2.5, h - 2 * pad - used - afterUsed - 0.6);
    // QR needs a QR encoder the app does not carry yet; QR designs print Code 128 here.
    const key = `${c.format}|${d.code}`;
    let b = cache.get(key);
    if (!b) { b = linearSvg(d.code, c.format === 'EAN13'); cache.set(key, b); }
    const maxW = Math.min(innerW, b.modules * 0.5);
    if (b.svg) bar = `<div class="bc" style="height:${mm(room * c.barHeight)}"><div style="width:${mm(maxW)};height:100%">${b.svg}</div></div>`;
  }
  return rows.join('') + bar + after.join('');
}

/** Full print document for the labels (copies already expanded). `skip` leaves used stickers on the first A4 sheet. */
export function renderLabels(labels: LabelData[], c: LabelConfig, o: { shopName: string; skip?: number }): string {
  const lay = sheetLayout(c);
  const pad = clamp(Math.min(lay.w, lay.h) * 0.05, 0.8, 2.5);
  const skip = lay.roll ? 0 : Math.min(Math.max(0, o.skip ?? 0), lay.perPage - 1);
  const cache = new Map<string, { svg: string; modules: number }>();
  const pages: string[] = [];
  let slot = skip;
  let current: string[] = [];
  const flush = () => { pages.push(`<section class="pg">${current.join('')}</section>`); current = []; };
  for (const d of labels) {
    const x = lay.left + (slot % lay.cols) * (lay.w + lay.gapX);
    const y = lay.top + Math.floor(slot / lay.cols) * (lay.h + lay.gapY);
    current.push(`<div class="l${c.border ? ' b' : ''}" style="left:${mm(x)};top:${mm(y)}">${labelBody(d, c, lay, o.shopName, cache)}</div>`);
    slot++;
    if (slot >= lay.perPage) { flush(); slot = 0; }
  }
  if (current.length) flush();
  const center = c.align === 'center';
  const css = `
@page { size: ${mm(lay.pageW)} ${mm(lay.pageH)}; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; }
.pg { position: relative; width: ${mm(lay.pageW)}; height: ${mm(lay.pageH)}; overflow: hidden; page-break-after: always; }
.pg:last-child { page-break-after: auto; }
.l { position: absolute; width: ${mm(lay.w)}; height: ${mm(lay.h)}; padding: ${mm(pad)}; display: flex; flex-direction: column; justify-content: center; overflow: hidden; line-height: 1.15; text-align: ${center ? 'center' : 'left'}; }
.l.b { border: 0.25mm solid #000; border-radius: 1mm; }
.t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.25mm; }
.sh { font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.nm { font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; margin-bottom: 0.25mm; }
.bc { display: flex; justify-content: ${center ? 'center' : 'flex-start'}; margin: 0.3mm 0; flex-shrink: 0; }
.bc svg { display: block; width: 100%; height: 100%; }
.cd { font-family: 'Courier New', monospace; letter-spacing: 0.08em; }
.pr { font-weight: 800; }
.old { text-decoration: line-through; font-weight: 400; margin-right: 1mm; }`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Barcode labels</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
}

/* ───────────── the queue ───────────── */

export interface QueueLine { id: string; productId: string; variantId?: string; unitId?: string; qty: number; expiry?: string | null }
export const MAX_QTY = 5000;
const STORE = 'nafaa.inv.label-queue.v1';
export const loadQueue = (): QueueLine[] => kv.get<QueueLine[]>(STORE, []).filter((l) => l && typeof l.productId === 'string' && l.qty > 0);
export const saveQueue = (lines: QueueLine[]) => kv.set(STORE, lines);
export const sameItem = (a: Pick<QueueLine, 'productId' | 'variantId' | 'unitId'>, b: Pick<QueueLine, 'productId' | 'variantId' | 'unitId'>) =>
  a.productId === b.productId && (a.variantId ?? '') === (b.variantId ?? '') && (a.unitId ?? '') === (b.unitId ?? '');

/** Packs a line can be printed in (not the base unit). */
export const packsFor = (p: ProductDetail | undefined, variantId?: string): PackRow[] =>
  (p?.packs ?? []).filter((u) => !u.isBase && (!u.variantId || u.variantId === variantId));

export interface ResolvedLine { line: QueueLine; product?: ProductDetail; pack?: PackRow; data: LabelData | null; stock: number; missingCode: boolean }

/** A queue line with the latest prices from the phone. Same tier rule as the counter; a pack never borrows the product barcode. */
export function resolveLine(line: QueueLine, product: ProductDetail | undefined, c: LabelConfig): ResolvedLine {
  if (!product) return { line, data: null, stock: 0, missingCode: false };
  const pack = line.unitId ? product.packs.find((u) => u.id === line.unitId) : undefined;
  const v = line.variantId ? product.variants.find((x) => x.id === line.variantId) : undefined;
  const rate = pack?.conversionRate || 1;
  const tier = c.priceSource === 'wholesale' ? 'WHOLESALE' : c.priceSource === 'credit' ? 'CREDIT' : 'RETAIL';
  const retail = v?.price ?? product.price;
  const wholesale = v?.wholesalePrice ?? product.wholesalePrice;
  const credit = v?.creditPrice ?? product.creditPrice;
  let price = tier === 'WHOLESALE' && wholesale && wholesale > 0 ? wholesale : tier === 'CREDIT' && credit && credit > 0 ? credit : retail;
  if (pack) {
    const own = tier === 'WHOLESALE' ? pack.wholesalePrice : tier === 'CREDIT' ? pack.creditPrice : pack.price;
    price = own && own > 0 ? own : price * rate;
  }
  const mrpUnit = pack ?? product.packs.find((u) => u.isBase && (!u.variantId || u.variantId === v?.id));
  const oldPrice = mrpUnit?.mrpPrice && mrpUnit.mrpPrice > price ? mrpUnit.mrpPrice : null;
  const code = (pack ? pack.barcode : v ? v.barcode : product.barcode) || '';
  const baseStock = Number(v ? v.stock : product.stock) || 0;
  return {
    line, product, pack, stock: Math.max(0, Math.floor(baseStock / rate)), missingCode: !code,
    data: {
      name: product.name, variant: v?.name, unit: pack ? pack.unitLabel || pack.unitName : product.unit,
      sku: pack?.sku || v?.sku || product.sku || undefined, code, price: Math.round(price * 100) / 100, oldPrice, expiry: line.expiry,
    },
  };
}
