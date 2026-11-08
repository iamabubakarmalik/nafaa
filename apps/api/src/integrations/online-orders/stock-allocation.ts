/**
 * Channel stock allocation. Nafaa holds the stock; each channel gets a share:
 *  - ALL:     Nafaa stock minus the channel buffer (the original behaviour)
 *  - PERCENT: a percent of Nafaa stock (after the buffer)
 *  - FIXED:   a fixed number per product/size (channel default, or the link's own)
 * A link's own `allocQty` wins over the channel mode. An unlisted link gets 0.
 * Fixed shares never add up to more than Nafaa has: when they do, they are
 * scaled down in proportion and the result is flagged.
 */

export type StockMode = 'ALL' | 'PERCENT' | 'FIXED';

export interface StockRule {
  mode: StockMode;
  /** 1–100, used by PERCENT */
  percent: number;
  /** Default units per product/size, used by FIXED */
  fixed: number;
  /** Units kept back from the channel */
  buffer: number;
}

export const DEFAULT_STOCK_RULE: StockRule = { mode: 'ALL', percent: 100, fixed: 0, buffer: 0 };

export function readStockRule(raw: { stockMode?: unknown; stockPercent?: unknown; stockFixed?: unknown; stockBuffer?: unknown } | null | undefined): StockRule {
  const r = raw ?? {};
  const mode: StockMode = r.stockMode === 'PERCENT' || r.stockMode === 'FIXED' ? r.stockMode : 'ALL';
  const int = (v: unknown, min: number, max: number, dflt: number) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
  };
  return {
    mode,
    percent: int(r.stockPercent, 1, 100, 100),
    fixed: int(r.stockFixed, 0, 1_000_000, 0),
    buffer: int(r.stockBuffer, 0, 10_000, 0),
  };
}

export interface Claim {
  channelId: string;
  rule: StockRule;
  /** The link's own units; null = the channel rule */
  allocQty?: number | null;
  listed?: boolean;
}

export interface Allocation {
  qty: Record<string, number>;
  /** Fixed shares were more than the stock and were cut down */
  scaled: boolean;
  /** Sum of the fixed shares asked for */
  fixedAsked: number;
}

/** The fixed units a claim asks for, or null when it takes a share of the stock. */
export function fixedAsk(c: Claim): number | null {
  if (c.listed === false) return null;
  if (c.allocQty !== null && c.allocQty !== undefined && Number.isFinite(Number(c.allocQty))) return Math.max(0, Math.floor(Number(c.allocQty)));
  return c.rule.mode === 'FIXED' ? Math.max(0, c.rule.fixed) : null;
}

/**
 * Splits one product/size's stock between the channels that draw from it.
 * Every result is a whole number between 0 and the stock.
 */
export function allocate(stock: number, claims: Claim[]): Allocation {
  const s = Math.max(0, Math.floor(Number(stock) || 0));
  const qty: Record<string, number> = {};
  const fixed = claims.map((c) => ({ c, ask: fixedAsk(c) })).filter((x): x is { c: Claim; ask: number } => x.ask !== null);
  const fixedAsked = fixed.reduce((n, x) => n + x.ask, 0);
  const scaled = fixedAsked > s;

  // Largest remainder: cut shares keep their proportion and add up to exactly the stock.
  const given = new Map<string, number>();
  if (scaled && fixedAsked > 0) {
    const parts = fixed.map((x) => {
      const exact = (x.ask * s) / fixedAsked;
      return { id: x.c.channelId, base: Math.floor(exact), frac: exact - Math.floor(exact) };
    });
    let left = s - parts.reduce((n, p) => n + p.base, 0);
    for (const p of [...parts].sort((a, b) => b.frac - a.frac)) {
      if (left <= 0) break;
      p.base++;
      left--;
    }
    for (const p of parts) given.set(p.id, p.base);
  } else {
    for (const x of fixed) given.set(x.c.channelId, x.ask);
  }

  for (const c of claims) {
    const free = Math.max(0, s - c.rule.buffer);
    if (c.listed === false) { qty[c.channelId] = 0; continue; }
    if (given.has(c.channelId)) { qty[c.channelId] = Math.min(free, given.get(c.channelId)!); continue; }
    qty[c.channelId] = c.rule.mode === 'PERCENT' ? Math.floor((free * c.rule.percent) / 100) : free;
  }
  return { qty, scaled, fixedAsked };
}

/** One channel alone (no other claims known): the rule applied to the stock. */
export function channelShare(stock: number, rule: StockRule, allocQty?: number | null, listed = true): number {
  return allocate(stock, [{ channelId: '_', rule, allocQty, listed }]).qty._;
}
