/**
 * Jewelry rules shared by web and mobile: karat purity, tola/gram, a piece's
 * price at today's rate (metal + banwai + wastage + stones), old gold value
 * with kaat, trade-in allocation on a bill, and the custom order flow.
 */

export const TOLA = 11.664;

export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM' | 'PALLADIUM' | 'ROSE_GOLD' | 'WHITE_GOLD' | 'IMITATION' | 'MIXED' | 'OTHER';

export type Purity = 'KARAT_24' | 'KARAT_22' | 'KARAT_21' | 'KARAT_18' | 'KARAT_14' | 'KARAT_10' | 'KARAT_9'
  | 'STERLING_925' | 'SILVER_999' | 'SILVER_925' | 'SILVER_800' | 'PLATINUM_950' | 'PLATINUM_900' | 'OTHER';

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

export const gramsToTola = (g: number) => (Number(g) || 0) / TOLA;
export const perGramFrom = (value: number, unit: 'tola' | 'gram') => (unit === 'tola' ? value / TOLA : value);
export const fromPerGram = (gram: number, unit: 'tola' | 'gram') => Math.round(unit === 'tola' ? gram * TOLA : gram);

/** Fine metal in each karat (22K = 91.6%). */
export const PURITY_FACTOR: Record<string, number> = {
  KARAT_24: 0.9999, KARAT_22: 0.916, KARAT_21: 0.875, KARAT_18: 0.75, KARAT_14: 0.583, KARAT_10: 0.417, KARAT_9: 0.375,
  STERLING_925: 0.925, SILVER_999: 0.999, SILVER_925: 0.925, SILVER_800: 0.8, PLATINUM_950: 0.95, PLATINUM_900: 0.9,
};

export const GOLD_KARATS: Purity[] = ['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18'];
export const SILVER_GRADES: Purity[] = ['SILVER_999', 'SILVER_925'];
export const COMMON_PURITIES: Purity[] = ['KARAT_22', 'KARAT_21', 'KARAT_24', 'KARAT_18', 'SILVER_999', 'SILVER_925'];

export function metalOf(purity?: string | null): MetalType {
  if (!purity) return 'GOLD';
  if (purity.startsWith('SILVER') || purity.startsWith('STERLING')) return 'SILVER';
  if (purity.startsWith('PLATINUM')) return 'PLATINUM';
  return 'GOLD';
}

export interface RateLike { metalType: string; purity: string; ratePerGram: number; buyRate?: number | null; isActive?: boolean }

/** Active selling rates keyed "GOLD_KARAT_22". */
export function rateMap<R extends RateLike>(rates: R[] | undefined) {
  const m = new Map<string, R>();
  for (const r of rates ?? []) if (r.isActive !== false) m.set(`${r.metalType}_${r.purity}`, r);
  return m;
}
export const rateFor = <R extends RateLike>(rates: Map<string, R>, metalType: string, purity: string) => rates.get(`${metalType}_${purity}`);

/** Per-gram rate of a karat from the 24K rate, unless the shop typed its own. */
export function derivedRate(purity: string, baseGram24: number, typedGram?: number | null) {
  if (typedGram && typedGram > 0) return typedGram;
  if (purity === 'KARAT_24') return baseGram24;
  return baseGram24 * ((PURITY_FACTOR[purity] ?? 1) / PURITY_FACTOR.KARAT_24);
}

/** Buying rate for old gold: selling rate less a percent (0..20). */
export const buyRateOf = (sellGram: number, cutPct: number) => r2(sellGram * (1 - Math.min(Math.max(cutPct, 0), 20) / 100));

export interface PieceCalc {
  netWeight: number;
  ratePerGram: number;
  makingChargePerGram?: number;
  makingChargeFixed?: number;
  makingChargePct?: number;
  wastagePct?: number;
  wastageGrams?: number;
  polishCharges?: number;
  hallmarkCharges?: number;
  stoneValue?: number;
}

/** Same sums the server uses for a bill line. */
export function piecePrice(p: PieceCalc) {
  const metal = r2(p.netWeight * p.ratePerGram);
  const making = r2((p.makingChargePerGram ?? 0) * p.netWeight + (p.makingChargeFixed ?? 0) + (metal * (p.makingChargePct ?? 0)) / 100);
  const wastage = r2(((p.wastagePct ?? 0) / 100) * metal + (p.wastageGrams ?? 0) * p.ratePerGram);
  const other = r2((p.polishCharges ?? 0) + (p.hallmarkCharges ?? 0));
  const stones = r2(p.stoneValue ?? 0);
  return { metal, making, wastage, other, stones, total: r2(metal + making + wastage + other + stones) };
}

export interface PricedPiece {
  metalType: string; purity: string; netWeight: number;
  makingChargePerGram?: number; makingChargeFixed?: number; makingChargePct?: number; wastagePct?: number; wastageGrams?: number;
  polishCharge?: number; designerCharge?: number; otherCharges?: number; hallmarkCharge?: number;
  gemstones?: Array<{ totalValue?: number | null }>;
}

export const stonesOf = (j: Pick<PricedPiece, 'gemstones'>) => r2((j.gemstones ?? []).reduce((s, g) => s + (Number(g.totalValue) || 0), 0));

/** A catalog piece priced at today's rate; null when its karat has no rate. */
export function profilePrice<R extends RateLike>(j: PricedPiece, rates: Map<string, R>) {
  const rate = rateFor(rates, j.metalType, j.purity);
  if (!rate) return null;
  return {
    rate: rate.ratePerGram,
    ...piecePrice({
      netWeight: j.netWeight, ratePerGram: rate.ratePerGram,
      makingChargePerGram: j.makingChargePerGram, makingChargeFixed: j.makingChargeFixed, makingChargePct: j.makingChargePct,
      wastagePct: j.wastagePct, wastageGrams: j.wastageGrams,
      polishCharges: (j.polishCharge ?? 0) + (j.designerCharge ?? 0) + (j.otherCharges ?? 0), hallmarkCharges: j.hallmarkCharge,
      stoneValue: stonesOf(j),
    }),
  };
}

/** Old gold value: weight x buying rate of its karat, less kaat percent (capped at 50). */
export function oldGoldValue<R extends RateLike>(gramsIn: number, purity: string, rates: Map<string, R>, kaatPct: number) {
  const rate = rateFor(rates, metalOf(purity), purity);
  const perGram = rate ? rate.buyRate || rate.ratePerGram : 0;
  const full = r2(gramsIn * perGram);
  return { perGram, full, value: r2(full * (1 - Math.min(Math.max(kaatPct, 0), 50) / 100)) };
}

/** A counter line: either a priced piece or a plain product at its own price. */
export interface BillLine extends PieceCalc { qty: number; plain?: boolean; making?: number; other?: number; stones?: number }

export function lineTotal(l: BillLine) {
  if (l.plain) return r2((l.making ?? 0) * l.qty);
  return r2(piecePrice({
    netWeight: l.netWeight, ratePerGram: l.ratePerGram, makingChargeFixed: l.making ?? 0, wastagePct: l.wastagePct, wastageGrams: l.wastageGrams,
    polishCharges: l.other ?? 0, stoneValue: l.stones ?? 0,
  }).total * l.qty);
}

export interface OldGoldRecord { code: string; value: number; grams: number; purity: string }

/** Totals of a counter bill: each old gold record pays up to what is left; old gold never gives change. */
export function billTotals(lines: BillLine[], discount: number, golds: OldGoldRecord[]) {
  const subtotal = r2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const weight = r3(lines.reduce((s, l) => s + l.netWeight * l.qty, 0));
  const disc = Math.min(Math.max(discount, 0), subtotal);
  const tradeIns = golds.reduce<Array<OldGoldRecord & { amount: number }>>((acc, g) => {
    const left = r2(subtotal - disc - acc.reduce((s, x) => s + x.amount, 0));
    return [...acc, { ...g, amount: r2(Math.max(Math.min(g.value, left), 0)) }];
  }, []);
  const oldValue = r2(tradeIns.reduce((s, g) => s + g.amount, 0));
  const oldGrams = r3(golds.reduce((s, g) => s + g.grams, 0));
  return { subtotal, weight, discount: disc, tradeIns, oldValue, oldGrams, total: r2(Math.max(subtotal - disc - oldValue, 0)) };
}

/** Next step for an open custom order. */
export const NEXT_STATUS: Record<string, string | undefined> = {
  DRAFT: 'CONFIRMED', QUOTED: 'CONFIRMED', CONFIRMED: 'DESIGNING', DESIGNING: 'IN_PRODUCTION', METAL_ISSUED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'POLISHING', POLISHING: 'QUALITY_CHECK', QUALITY_CHECK: 'READY', HALLMARKING: 'READY', ON_HOLD: 'IN_PRODUCTION',
};
export const isOrderClosed = (s: string) => s === 'DELIVERED' || s === 'CANCELLED';

/** Metal a karigar still holds: issued less received, returned and wasted. */
export const karigarOutstanding = (k: { metalIssuedGrams: number; metalReturnedGrams: number; wastageGrams: number }) =>
  r3(Math.max((k.metalIssuedGrams || 0) - (k.metalReturnedGrams || 0) - (k.wastageGrams || 0), 0));

/** Wastage as a percent of the metal given. */
export const wastagePctOf = (issued: number, wasted: number) => (issued > 0 ? r2((wasted / issued) * 100) : 0);

/** Old gold bought over the counter: net weight (less stones) at the buying rate, less kaat and testing charges. */
export function exchangeBuy(input: { grossWeight: number; stoneWeight: number; rate: number; kaatPct: number; testing: number }) {
  const net = r3(Math.max((Number(input.grossWeight) || 0) - (Number(input.stoneWeight) || 0), 0));
  const gross = r2(net * input.rate);
  const kaat = r2((gross * Math.min(Math.max(Number(input.kaatPct) || 0, 0), 50)) / 100);
  return { net, gross, kaat, pay: r2(Math.max(gross - kaat - (Number(input.testing) || 0), 0)) };
}

/** Estimated price of a custom order: expected weight at today's rate plus banwai. */
export const orderEstimate = (weight: number, ratePerGram: number, making: number) => r2((Number(weight) || 0) * ratePerGram + (Number(making) || 0));
