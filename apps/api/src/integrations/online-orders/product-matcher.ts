/**
 * Suggests which Nafaa product (and size) a channel listing belongs to.
 *
 * Order: exact SKU/barcode on a Nafaa size, then on the product; then the
 * normalised name plus size; then a fuzzy name match with a score. A Nafaa
 * product that has sizes is only ever suggested at size level, never as the
 * whole product (a size-less link bills "Available: 0").
 */

import { mappingKey } from './mapping-key';

export interface MatchVariant {
  id: string;
  name: string;
  size?: string | null;
  color?: string | null;
  sku?: string | null;
  barcode?: string | null;
}

export interface MatchProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  hasVariants: boolean;
  variants: MatchVariant[];
}

export interface RemoteItem {
  /** Channel product title. */
  title: string;
  /** Channel size/option title ("M", "Black / L"); "Default" or empty for a single item. */
  variantTitle?: string | null;
  hasVariants: boolean;
  sku?: string | null;
  barcode?: string | null;
}

export type MatchKind = 'sku' | 'name' | 'fuzzy';

export interface MatchResult {
  productId: string;
  variantId: string | null;
  kind: MatchKind;
  /** 0..1 */
  score: number;
}

/** Lower case, accents and punctuation removed, single spaces. */
export function normalizeName(s: string | null | undefined): string {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const SIZE_ALIASES: Record<string, string> = {
  small: 's', medium: 'm', med: 'm', large: 'l', xlarge: 'xl', xxlarge: 'xxl', '2xl': 'xxl', '3xl': 'xxxl', xxxlarge: 'xxxl',
  extra: 'x',
};

/** Size words compared loosely: "Medium" = "M", "Extra Large" = "XL". */
export function sizeKey(s: string | null | undefined): string {
  const words = normalizeName(s).split(' ').filter(Boolean).map((w) => SIZE_ALIASES[w] ?? w);
  // "x l" (from "Extra Large") reads as "xl"
  return words.join(' ').replace(/\bx (?=x* ?[sl]\b)/g, 'x');
}

const isDefault = (t: string | null | undefined) => {
  const n = normalizeName(t);
  return !n || n === 'default' || n === 'default title';
};

const code = (s: string | null | undefined) => String(s ?? '').trim().toLowerCase();

function variantLabels(v: MatchVariant): string[] {
  return [v.name, v.size, v.color, [v.color, v.size].filter(Boolean).join(' '), [v.size, v.color].filter(Boolean).join(' ')]
    .filter((x): x is string => !!x && !!x.trim())
    .map(sizeKey);
}

/** The Nafaa size named by a channel option title, if exactly one fits. */
export function findVariant(p: MatchProduct, title: string | null | undefined): MatchVariant | null {
  if (isDefault(title)) return null;
  const want = sizeKey(title);
  const hits = p.variants.filter((v) => variantLabels(v).includes(want));
  return hits.length === 1 ? hits[0] : null;
}

function bigrams(s: string): Map<string, number> {
  const t = ` ${s} `;
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice on character pairs, 0..1. */
export function similarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const A = bigrams(x);
  const B = bigrams(y);
  let both = 0;
  let total = 0;
  for (const n of A.values()) total += n;
  for (const n of B.values()) total += n;
  for (const [g, n] of A) both += Math.min(n, B.get(g) ?? 0);
  return total ? (2 * both) / total : 0;
}

const STOP = new Set(['the', 'and', 'for', 'with', 'new', 'pack', 'pcs', 'piece']);
const tokens = (s: string) => normalizeName(s).split(' ').filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));

export const FUZZY_MIN = 0.6;

/** Lookup tables over the shop's catalog, built once per request. */
export class MatchIndex {
  private readonly byVariantCode = new Map<string, { p: MatchProduct; v: MatchVariant }[]>();
  private readonly byProductCode = new Map<string, MatchProduct[]>();
  private readonly byName = new Map<string, MatchProduct[]>();
  /** "product name + size" → size */
  private readonly byNameSize = new Map<string, { p: MatchProduct; v: MatchVariant }[]>();
  private readonly byToken = new Map<string, MatchProduct[]>();

  constructor(products: MatchProduct[]) {
    const push = <T>(m: Map<string, T[]>, k: string, x: T) => { if (k) m.set(k, [...(m.get(k) ?? []), x]); };
    for (const p of products) {
      for (const c of new Set([code(p.sku), code(p.barcode)])) push(this.byProductCode, c, p);
      const name = normalizeName(p.name);
      push(this.byName, name, p);
      for (const t of new Set(tokens(p.name))) push(this.byToken, t, p);
      for (const v of p.variants) {
        for (const c of new Set([code(v.sku), code(v.barcode)])) push(this.byVariantCode, c, { p, v });
        for (const l of new Set(variantLabels(v))) push(this.byNameSize, `${sizeKey(p.name)} ${l}`.trim(), { p, v });
      }
    }
  }

  /** Best suggestion for one channel item, or null. `taken` = Nafaa link keys already used on this channel. */
  match(r: RemoteItem, taken: Set<string> = new Set()): MatchResult | null {
    const free = (productId: string, variantId: string | null) => !taken.has(mappingKey(productId, variantId));
    const option = r.hasVariants && !isDefault(r.variantTitle) ? r.variantTitle : null;

    // 1. SKU / barcode on a Nafaa size, then on the product.
    for (const c of new Set([code(r.sku), code(r.barcode)])) {
      if (!c) continue;
      const vs = (this.byVariantCode.get(c) ?? []).filter((x) => free(x.p.id, x.v.id));
      if (vs.length === 1) return { productId: vs[0].p.id, variantId: vs[0].v.id, kind: 'sku', score: 1 };
      const ps = this.byProductCode.get(c) ?? [];
      if (ps.length === 1) {
        const p = ps[0];
        if (!p.hasVariants) {
          if (!option && free(p.id, null)) return { productId: p.id, variantId: null, kind: 'sku', score: 1 };
        } else {
          const v = findVariant(p, option);
          if (v && free(p.id, v.id)) return { productId: p.id, variantId: v.id, kind: 'sku', score: 0.98 };
        }
      }
    }

    // 2. Same name (and same size).
    const exact = this.nameMatch(r, option, free);
    if (exact) return exact;

    // 3. Similar name.
    return this.fuzzy(r, option, free);
  }

  private nameMatch(r: RemoteItem, option: string | null | undefined, free: (p: string, v: string | null) => boolean): MatchResult | null {
    const name = normalizeName(r.title);
    const hits: MatchResult[] = [];
    for (const p of this.byName.get(name) ?? []) {
      if (p.hasVariants) {
        const v = findVariant(p, option);
        if (v && free(p.id, v.id)) hits.push({ productId: p.id, variantId: v.id, kind: 'name', score: 0.92 });
      } else if (!option && free(p.id, null)) {
        hits.push({ productId: p.id, variantId: null, kind: 'name', score: 0.9 });
      }
    }
    // "Kurta Black M" on the channel vs product "Kurta" with size "Black / M" in Nafaa
    const combined = sizeKey(option ? `${r.title} ${option}` : r.title);
    for (const { p, v } of this.byNameSize.get(combined) ?? []) {
      if (free(p.id, v.id) && !hits.some((h) => h.variantId === v.id)) hits.push({ productId: p.id, variantId: v.id, kind: 'name', score: 0.88 });
    }
    return hits.length === 1 ? hits[0] : null;
  }

  private fuzzy(r: RemoteItem, option: string | null | undefined, free: (p: string, v: string | null) => boolean): MatchResult | null {
    const seen = new Set<MatchProduct>();
    for (const t of tokens(r.title)) for (const p of this.byToken.get(t) ?? []) seen.add(p);
    let best: MatchResult | null = null;
    let second = 0;
    for (const p of seen) {
      const score = similarity(r.title, p.name);
      if (score < FUZZY_MIN) continue;
      let variantId: string | null = null;
      if (p.hasVariants) {
        const v = findVariant(p, option);
        if (!v) continue;
        variantId = v.id;
      } else if (option) continue;
      if (!free(p.id, variantId)) continue;
      const s = Math.round(score * 0.85 * 100) / 100;
      if (!best || s > best.score) { second = best?.score ?? 0; best = { productId: p.id, variantId, kind: 'fuzzy', score: s }; }
      else if (s > second) second = s;
    }
    // Two names equally close: no guess.
    if (best && second && best.score - second < 0.03) return null;
    return best;
  }
}

/**
 * Suggestions for a whole channel list. A Nafaa product/size is suggested
 * once: if two channel items point at it, the stronger match keeps it.
 */
export function suggestAll<T extends RemoteItem>(items: T[], index: MatchIndex, taken: Set<string>): Array<{ item: T; match: MatchResult | null }> {
  const raw = items.map((item) => ({ item, match: index.match(item, taken) }));
  const bestFor = new Map<string, number>();
  raw.forEach(({ match }, i) => {
    if (!match) return;
    const k = mappingKey(match.productId, match.variantId);
    const cur = bestFor.get(k);
    if (cur === undefined || raw[cur].match!.score < match.score) bestFor.set(k, i);
  });
  return raw.map(({ item, match }, i) => ({
    item,
    match: match && bestFor.get(mappingKey(match.productId, match.variantId)) === i ? match : null,
  }));
}
