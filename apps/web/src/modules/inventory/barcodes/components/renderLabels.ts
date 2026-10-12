/**
 * Label sheets and the print document. Every sticker is placed in exact
 * millimetres on an A4 sheet or a thermal roll page, with barcodes drawn as
 * inline SVG, so the same HTML serves the live preview and the print.
 */

import JsBarcode from 'jsbarcode';
import { esc } from '@core/receipt/html';
import { qrSvg } from '@core/payments/qrSvg';
import { formatPKR } from '@core/lib/format';
import type { LabelConfig, LabelSheet } from '../api/barcode-labels.api';

export interface LabelData {
  name: string;
  variant?: string;
  unit?: string;
  sku?: string;
  /** Barcode value; empty when the item has none yet. */
  code: string;
  price: number;
  oldPrice?: number | null;
  expiry?: string | null;
}

interface SheetPreset {
  label: string;
  hint: string;
  w: number;
  h: number;
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
}

/** Common A4 sticker sheets; the grid is centred on the page as the makers print it. */
export const A4_SHEETS: Record<Exclude<LabelSheet, 'thermal' | 'custom'>, SheetPreset> = {
  'a4-65': { label: '65 label', hint: 'Choti cheezein, cosmetics, pharmacy', w: 38.1, h: 21.2, cols: 5, rows: 13, gapX: 2.5, gapY: 0 },
  'a4-40': { label: '40 label', hint: 'Grocery aur general store', w: 48.5, h: 25.4, cols: 4, rows: 10, gapX: 0, gapY: 0 },
  'a4-24': { label: '24 label', hint: 'Kapre, joote, bari qeemat', w: 64, h: 33.9, cols: 3, rows: 8, gapX: 2, gapY: 0 },
  'a4-21': { label: '21 label', hint: 'Shelf aur dabbe', w: 63.5, h: 38.1, cols: 3, rows: 7, gapX: 2.5, gapY: 0 },
  'a4-14': { label: '14 label', hint: 'Bara label, carton aur box', w: 99.1, h: 38.1, cols: 2, rows: 7, gapX: 2.5, gapY: 0 },
};

/** Quick sizes for thermal label rolls (width × height in mm). */
export const THERMAL_SIZES: Array<[number, number]> = [[50, 30], [40, 25], [38, 25], [58, 40]];

const A4_W = 210;
const A4_H = 297;
export const MM_TO_PX = 96 / 25.4;

export interface SheetLayout {
  roll: boolean;
  pageW: number;
  pageH: number;
  w: number;
  h: number;
  cols: number;
  rows: number;
  gapX: number;
  gapY: number;
  left: number;
  top: number;
  perPage: number;
}

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

const ean13Check = (first12: string) =>
  String((10 - (first12.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0) % 10)) % 10);

/** True for a 13-digit code with a correct check digit. */
export const isEan13 = (code: string) => /^\d{13}$/.test(code) && ean13Check(code.slice(0, 12)) === code[12];

export const labelPrice = (n: number) => formatPKR(n, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Linear barcode as SVG that stretches to its box; EAN-13 only for valid codes. */
function linearSvg(code: string, ean: boolean): { svg: string; modules: number } {
  try {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const format = ean && isEan13(code) ? 'EAN13' : 'CODE128';
    JsBarcode(el, code, { format, width: 2, height: 60, margin: 0, displayValue: false, flat: true, lineColor: '#000', background: '#fff' });
    const w = parseFloat(el.getAttribute('width') || '0');
    const h = parseFloat(el.getAttribute('height') || '60');
    el.setAttribute('viewBox', `0 0 ${w} ${h}`);
    el.setAttribute('width', '100%');
    el.setAttribute('height', '100%');
    el.setAttribute('preserveAspectRatio', 'none');
    return { svg: new XMLSerializer().serializeToString(el), modules: w / 2 };
  } catch {
    return { svg: '', modules: 0 };
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mm = (n: number) => `${n.toFixed(2)}mm`;

interface RenderOpts {
  /** Shop line when the design has no own text. */
  shopName: string;
  /** Screen styling and faint outlines for the in-app preview. */
  preview?: boolean;
  /** Empty positions at the start of the first A4 sheet (already used stickers). */
  skip?: number;
  maxPages?: number;
}

function labelBody(d: LabelData, c: LabelConfig, lay: SheetLayout, o: RenderOpts, cache: Map<string, { svg: string; modules: number }>) {
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
  const line = (size: number, html: string, cls = 't', lines = 1) => {
    rows.push(`<div class="${cls}" style="font-size:${mm(size)}">${html}</div>`);
    used += size * lh * lines + 0.25;
  };

  const shop = (c.shopText || o.shopName).trim();
  if (c.showShop && shop) line(small, esc(shop), 't sh');
  if (c.showName) line(nameSize, esc(d.name), 'nm', d.name.length * nameSize * 0.55 > innerW ? 2 : 1);
  const meta = [c.showVariant && d.variant, c.showUnit && d.unit, c.showSku && d.sku].filter(Boolean).join(' · ');
  if (meta) line(small, esc(meta));
  if (c.showExpiry && d.expiry) line(small, `Exp ${esc(d.expiry)}`);

  const after: string[] = [];
  let afterUsed = 0;
  const tail = (size: number, html: string, cls = 't') => {
    after.push(`<div class="${cls}" style="font-size:${mm(size)}">${html}</div>`);
    afterUsed += size * lh + 0.25;
  };
  if (c.showCode && d.code) tail(small * 0.95, esc(d.code), 't cd');
  if (c.showPrice) {
    const old = c.showOldPrice && d.oldPrice && d.oldPrice > d.price
      ? `<span class="old" style="font-size:${mm(priceSize * 0.62)}">${esc(labelPrice(d.oldPrice))}</span>` : '';
    tail(priceSize, `${old}${esc(labelPrice(d.price))}`, 't pr');
  }
  if (c.footerText.trim()) tail(small, esc(c.footerText.trim()));

  let bar = '';
  if (d.code) {
    const room = Math.max(2.5, h - 2 * pad - used - afterUsed - 0.6);
    const key = `${c.format}|${d.code}`;
    if (c.format === 'QR') {
      let q = cache.get(key);
      if (!q) {
        let svg = '';
        try { svg = qrSvg(d.code, 100).replace('width="100" height="100"', 'width="100%" height="100%"'); } catch { /* code too long for a QR */ }
        q = { svg, modules: 0 };
        cache.set(key, q);
      }
      const side = Math.max(4, Math.min(room * c.barHeight, innerW));
      if (q.svg) bar = `<div class="bc" style="height:${mm(side)}"><div style="width:${mm(side)};height:100%">${q.svg}</div></div>`;
    } else {
      let b = cache.get(key);
      if (!b) { b = linearSvg(d.code, c.format === 'EAN13'); cache.set(key, b); }
      // Keep bars from getting wider than 0.5 mm per module on big labels.
      const maxW = Math.min(innerW, b.modules * 0.5);
      if (b.svg) bar = `<div class="bc" style="height:${mm(room * c.barHeight)}"><div style="width:${mm(maxW)};height:100%">${b.svg}</div></div>`;
    }
  }
  return rows.join('') + bar + after.join('');
}

/** Full print document for the given labels (copies already expanded). */
export function renderLabels(labels: LabelData[], c: LabelConfig, o: RenderOpts): string {
  const lay = sheetLayout(c);
  const pad = clamp(Math.min(lay.w, lay.h) * 0.05, 0.8, 2.5);
  const skip = lay.roll ? 0 : Math.min(Math.max(0, o.skip ?? 0), lay.perPage - 1);
  const cache = new Map<string, { svg: string; modules: number }>();
  const pages: string[] = [];
  let slot = skip;
  let current: string[] = [];
  const flush = () => { pages.push(`<section class="pg">${current.join('')}</section>`); current = []; };

  for (const d of labels) {
    if (o.maxPages && pages.length >= o.maxPages) break;
    const col = slot % lay.cols;
    const row = Math.floor(slot / lay.cols);
    const x = lay.left + col * (lay.w + lay.gapX);
    const y = lay.top + row * (lay.h + lay.gapY);
    const cls = `l${c.border ? ' b' : o.preview ? ' g' : ''}`;
    current.push(`<div class="${cls}" style="left:${mm(x)};top:${mm(y)}">${labelBody(d, c, lay, o, cache)}</div>`);
    slot++;
    if (slot >= lay.perPage) { flush(); slot = 0; }
  }
  if (current.length && !(o.maxPages && pages.length >= o.maxPages)) flush();

  // Preview of an A4 sheet also shows the empty sticker positions.
  if (o.preview && !lay.roll && pages.length === 1 && labels.length + skip < lay.perPage) {
    const empty: string[] = [];
    for (let s = 0; s < lay.perPage; s++) {
      if (s >= skip && s < skip + labels.length) continue;
      const x = lay.left + (s % lay.cols) * (lay.w + lay.gapX);
      const y = lay.top + Math.floor(s / lay.cols) * (lay.h + lay.gapY);
      empty.push(`<div class="l e" style="left:${mm(x)};top:${mm(y)}"></div>`);
    }
    pages[0] = pages[0].replace('<section class="pg">', `<section class="pg">${empty.join('')}`);
  }

  const center = c.align === 'center';
  const css = `
@page { size: ${mm(lay.pageW)} ${mm(lay.pageH)}; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { position: relative; width: ${mm(lay.pageW)}; height: ${mm(lay.pageH)}; overflow: hidden; break-after: page; page-break-after: always; }
.pg:last-child { break-after: auto; page-break-after: auto; }
.l { position: absolute; width: ${mm(lay.w)}; height: ${mm(lay.h)}; padding: ${mm(pad)}; display: flex; flex-direction: column; justify-content: center; overflow: hidden; line-height: 1.15; text-align: ${center ? 'center' : 'left'}; }
.l.b { border: 0.25mm solid #000; border-radius: 1mm; }
.t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.25mm; }
.sh { font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.nm { font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; margin-bottom: 0.25mm; }
.bc { display: flex; justify-content: ${center ? 'center' : 'flex-start'}; margin: 0.3mm 0; flex-shrink: 0; }
.bc svg { display: block; width: 100%; height: 100%; }
.cd { font-family: 'Courier New', monospace; letter-spacing: 0.08em; }
.pr { font-weight: 800; }
.old { text-decoration: line-through; font-weight: 400; margin-right: 1mm; }
${o.preview ? `@media screen {
  body { background: transparent; }
  .pg { background: #fff; margin: 0 auto 4mm; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25); }
  .l.g { outline: 0.2mm dashed #cbd5e1; outline-offset: -0.2mm; }
  .l.e { outline: 0.2mm dashed #e2e8f0; outline-offset: -0.2mm; }
}` : ''}`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Barcode labels</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
}
