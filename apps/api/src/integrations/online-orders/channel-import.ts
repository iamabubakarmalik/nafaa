/**
 * Pure helpers for bringing channel products into Nafaa: clean description
 * text, Daraz SKU options, stock and sale prices, weight units, and matching
 * channel SKUs to the sizes of an existing Nafaa product.
 */

import { normalizeName, sizeKey } from './product-matcher';

export interface RemoteOption { name: string; value: string }

/** HTML from a channel description → plain text with paragraph breaks kept. */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = String(html)
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|ul|ol|tr|table|section)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text ? text.slice(0, 20_000) : null;
}

const OPTION_LABELS: Record<string, string> = { color_family: 'Color', color: 'Color', colour: 'Color', size: 'Size' };

/** "color_family" → "Color", "ram_memory" → "Ram Memory". */
export function optionLabel(key: string, defs?: Record<string, string>): string {
  if (defs?.[key]) return defs[key];
  const k = key.trim();
  if (OPTION_LABELS[k.toLowerCase()]) return OPTION_LABELS[k.toLowerCase()];
  return k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Option labels from a Daraz product's `variation` block ({ Variation1: { name, label } }). */
export function darazOptionDefs(product: any): Record<string, string> {
  const out: Record<string, string> = {};
  const v = product?.variation;
  if (v && typeof v === 'object') {
    for (const d of Object.values(v) as any[]) {
      if (d?.name) out[String(d.name)] = String(d.label || optionLabel(String(d.name)));
    }
  }
  return out;
}

const NOT_SET = (x: unknown) => x === null || x === undefined || String(x).trim() === '' || String(x).trim().toLowerCase() === 'not specified';

/**
 * Variation values of one Daraz SKU. Newer API responses put them in
 * `saleProp`; older ones as top-level `color_family` / `size` / `Variation`.
 */
export function darazOptions(sku: any, defs: Record<string, string> = {}): RemoteOption[] {
  const out: RemoteOption[] = [];
  const seen = new Set<string>();
  const add = (key: string, value: unknown) => {
    if (NOT_SET(value)) return;
    const name = optionLabel(key, defs);
    if (seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    out.push({ name, value: String(value).trim() });
  };
  const sale = sku?.saleProp;
  if (sale && typeof sale === 'object') for (const [k, v] of Object.entries(sale)) add(k, v);
  for (const k of Object.keys(defs)) add(k, sku?.[k]);
  for (const k of ['color_family', 'size', 'Variation', 'variation']) add(k === 'Variation' || k === 'variation' ? 'Variation' : k, sku?.[k]);
  return out;
}

/** Daraz stock of one SKU: `quantity`, else the sellable units per warehouse. */
export function darazStock(sku: any): number | null {
  if (sku?.quantity !== undefined && sku?.quantity !== null && sku?.quantity !== '') return Number(sku.quantity) || 0;
  const wh: any[] = Array.isArray(sku?.multiWarehouseInventories) ? sku.multiWarehouseInventories : [];
  if (wh.length) return wh.reduce((s, w) => s + (Number(w?.sellableQuantity ?? w?.quantity) || 0), 0);
  if (sku?.Available !== undefined && sku?.Available !== null) return Number(sku.Available) || 0;
  return null;
}

/** Daraz date "2026-11-01 00:00" or "2026-11-01" → ms; NaN when unreadable. */
const darazDate = (s: unknown) => (s ? Date.parse(String(s).trim().replace(' ', 'T')) : NaN);

/**
 * Regular price, the price customers pay now and the struck-out price for a
 * Daraz SKU. A special price counts while it is below the price and inside its dates.
 */
export function darazPrices(sku: any, now = Date.now()): { price: number; sellPrice: number | null; compareAt: number | null } {
  const price = Number(sku?.price ?? 0) || 0;
  const special = Number(sku?.special_price ?? 0) || 0;
  const from = darazDate(sku?.special_from_date ?? sku?.special_from_time);
  const to = darazDate(sku?.special_to_date ?? sku?.special_to_time);
  const live = special > 0 && special < price && (Number.isNaN(from) || from <= now) && (Number.isNaN(to) || to >= now);
  return { price, sellPrice: live ? special : null, compareAt: live ? price : null };
}

/** Weight in kg, g, lb or oz → the same unit names Nafaa stores. */
export function weightUnit(u: string | null | undefined): string | null {
  const s = String(u ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith('kilo') || s === 'kg') return 'kg';
  if (s.startsWith('gram') || s === 'g') return 'g';
  if (s.startsWith('pound') || s === 'lb' || s === 'lbs') return 'lb';
  if (s.startsWith('ounce') || s === 'oz') return 'oz';
  return null;
}

const TO_KG: Record<string, number> = { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.028349523 };

/** Weight converted between units (2 decimals kept for kg/lb, whole for g). */
export function convertWeight(value: number, from: string, to: string): number {
  if (!TO_KG[from] || !TO_KG[to] || from === to) return value;
  const n = (value * TO_KG[from]) / TO_KG[to];
  return to === 'g' ? Math.round(n) : Math.round(n * 1000) / 1000;
}

/** Size and colour of a channel SKU from its option names. */
export function sizeColor(options: RemoteOption[] | undefined): { size: string | null; color: string | null } {
  const o = options ?? [];
  const size = o.find((x) => /size|saiz|naap/i.test(x.name))?.value ?? null;
  const color = o.find((x) => /colou?r|rang/i.test(x.name))?.value ?? null;
  return { size, color };
}

/** Variant name from options ("Red / M"), else the channel title. */
export function variantName(title: string, options: RemoteOption[] | undefined): string {
  const fromOptions = (options ?? []).map((o) => o.value).filter(Boolean).join(' / ');
  const t = String(title ?? '').trim();
  return (fromOptions || (t && t.toLowerCase() !== 'default' && t.toLowerCase() !== 'default title' ? t : '') || 'Default').slice(0, 120);
}

export interface PlanRemote { key: string; title: string; sku: string | null; barcode?: string | null; options?: RemoteOption[] }
export interface PlanNafaa { id: string; name: string; sku: string | null; barcode?: string | null; size?: string | null; color?: string | null }
export type PlanBy = 'sku' | 'options' | 'name';

const code = (s: string | null | undefined) => String(s ?? '').trim().toLowerCase();
const labels = (v: PlanNafaa) => [v.name, v.size, v.color, [v.color, v.size].filter(Boolean).join(' '), [v.size, v.color].filter(Boolean).join(' ')]
  .filter((x): x is string => !!x && !!x.trim()).map(sizeKey);

/**
 * Which Nafaa size each channel SKU belongs to: by SKU/barcode, then by its
 * options (size and colour), then by name. A Nafaa size is used once.
 */
export function planVariants(remote: PlanRemote[], nafaa: PlanNafaa[]): Map<string, { variantId: string; by: PlanBy }> {
  const out = new Map<string, { variantId: string; by: PlanBy }>();
  const used = new Set<string>();
  const take = (key: string, v: PlanNafaa | undefined, by: PlanBy) => {
    if (!v || used.has(v.id) || out.has(key)) return;
    used.add(v.id);
    out.set(key, { variantId: v.id, by });
  };
  // 1. SKU or barcode
  for (const r of remote) {
    const codes = [code(r.sku), code(r.barcode)].filter(Boolean);
    if (!codes.length) continue;
    const hits = nafaa.filter((v) => !used.has(v.id) && (codes.includes(code(v.sku)) || codes.includes(code(v.barcode))));
    if (hits.length === 1) take(r.key, hits[0], 'sku');
  }
  // 2. Options: size and colour must both agree where both sides have them
  for (const r of remote) {
    if (out.has(r.key)) continue;
    const { size, color } = sizeColor(r.options);
    if (!size && !color) continue;
    const hits = nafaa.filter((v) => {
      if (used.has(v.id)) return false;
      if (!v.size && !v.color) return false;
      if (size && v.size && sizeKey(size) !== sizeKey(v.size)) return false;
      if (color && v.color && normalizeName(color) !== normalizeName(v.color)) return false;
      if (size && !v.size && color && !v.color) return false;
      return (!!size && !!v.size) || (!!color && !!v.color);
    });
    // Prefer the size with both fields agreeing when there are several.
    const full = hits.filter((v) => (!size || v.size) && (!color || v.color));
    const pick = full.length === 1 ? full[0] : hits.length === 1 ? hits[0] : undefined;
    take(r.key, pick, 'options');
  }
  // 3. Name: options joined, or the channel title
  for (const r of remote) {
    if (out.has(r.key)) continue;
    const wants = [variantName(r.title, r.options), r.title].map(sizeKey).filter((x) => x && x !== 'default');
    const hits = nafaa.filter((v) => !used.has(v.id) && labels(v).some((l) => wants.includes(l)));
    if (hits.length === 1) take(r.key, hits[0], 'name');
  }
  return out;
}
