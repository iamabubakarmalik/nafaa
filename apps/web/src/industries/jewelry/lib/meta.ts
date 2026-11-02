/**
 * Jewelry words, units and price maths shared by the jewelry screens:
 * karat and metal names, gram/tola display, a piece's price at today's
 * rate, old gold value, order and entry labels, and query keys.
 */

import type { MetalRate, MetalType, Purity } from '../api/metal-rates.api';
import type { JewelryCategory, JewelryProductProfile } from '../api/products.api';
import { t as tr } from '@core/i18n';

export const TOLA = 11.664;

export const KEYS = {
  rates: 'jewelry-rates',
  profiles: 'jewelry-profiles',
  orders: 'jewelry-orders',
  exchanges: 'jewelry-exchanges',
  karigars: 'jewelry-karigars',
  metal: 'jewelry-metal-stock',
  sales: 'jewelry-sales',
  repairs: 'jewelry-repairs',
} as const;

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

/** "12.5 g" or "1.07 tola" style weight text. */
export const grams = (g: number | null | undefined) => `${r3(Number(g) || 0).toLocaleString('en-PK', { maximumFractionDigits: 3 })} g`;
export const tola = (g: number | null | undefined) => `${((Number(g) || 0) / TOLA).toLocaleString('en-PK', { maximumFractionDigits: 3 })} tola`;

export const PURITY_LABEL: Record<string, string> = {
  KARAT_24: '24K', KARAT_22: '22K', KARAT_21: '21K', KARAT_18: '18K', KARAT_14: '14K', KARAT_10: '10K', KARAT_9: '9K',
  STERLING_925: tr('Sterling 925'), SILVER_999: tr('Chandi 999'), SILVER_925: tr('Chandi 925'), SILVER_800: tr('Chandi 800'),
  PLATINUM_950: tr('Platinum 950'), PLATINUM_900: tr('Platinum 900'), OTHER: tr('Doosra'),
};
export const purityLabel = (p?: string | null) => (p ? PURITY_LABEL[p] ?? p : '—');

/** Fine metal in each karat (22K = 91.6%). */
export const PURITY_FACTOR: Record<string, number> = {
  KARAT_24: 0.9999, KARAT_22: 0.916, KARAT_21: 0.875, KARAT_18: 0.75, KARAT_14: 0.583, KARAT_10: 0.417, KARAT_9: 0.375,
  STERLING_925: 0.925, SILVER_999: 0.999, SILVER_925: 0.925, SILVER_800: 0.8, PLATINUM_950: 0.95, PLATINUM_900: 0.9,
};

export const GOLD_KARATS: Purity[] = ['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18'];
export const SILVER_GRADES: Purity[] = ['SILVER_999', 'SILVER_925'];
/** Karats offered in most pickers, most common first. */
export const COMMON_PURITIES: Purity[] = ['KARAT_22', 'KARAT_21', 'KARAT_24', 'KARAT_18', 'SILVER_999', 'SILVER_925'];
export const ALL_PURITIES = Object.keys(PURITY_LABEL) as Purity[];

export function metalOf(purity?: string | null): MetalType {
  if (!purity) return 'GOLD';
  if (purity.startsWith('SILVER') || purity.startsWith('STERLING')) return 'SILVER';
  if (purity.startsWith('PLATINUM')) return 'PLATINUM';
  return 'GOLD';
}

export const METAL_LABEL: Record<string, string> = {
  GOLD: tr('Sona'), SILVER: tr('Chandi'), PLATINUM: tr('Platinum'), PALLADIUM: tr('Palladium'), ROSE_GOLD: tr('Rose gold'),
  WHITE_GOLD: tr('White gold'), IMITATION: tr('Artificial'), MIXED: tr('Mix'), OTHER: tr('Doosra'),
};
export const metalLabel = (m?: string | null) => (m ? METAL_LABEL[m] ?? m : '—');

export const CATEGORY_LABEL: Record<JewelryCategory, string> = {
  RING: tr('Angoothi'), NECKLACE: tr('Necklace'), EARRINGS: tr('Bundey / earrings'), BANGLE: tr('Choori'), BRACELET: tr('Bracelet'), ANKLET: tr('Payal (anklet)'),
  PENDANT: tr('Pendant'), CHAIN: tr('Chain'), NOSE_PIN: tr('Nath / koka'), NOSE_RING: tr('Nath'), MAANG_TIKKA: tr('Teeka'), JHUMKA: tr('Jhumka'), CHOKER: tr('Choker'),
  MANGALSUTRA: tr('Mangalsutra'), HAAR: tr('Haar'), KUNDAN_SET: tr('Kundan set'), BRIDAL_SET: tr('Bridal set'), KADA: tr('Kara'), PAYAL: tr('Payal'), TOE_RING: tr('Bichhua'),
  BROOCH: tr('Brooch'), CUFFLINK: tr('Cufflink'), TIE_PIN: tr('Tie pin'), WATCH: tr('Ghari'), COIN: tr('Sikka'), BAR: tr('Biscuit / bar'), BULLION: tr('Bullion'),
  BUTTON: tr('Button'), RAKHI: tr('Rakhi'), OTHER: tr('Doosra'),
};
export const categoryLabel = (c?: string | null) => (c ? CATEGORY_LABEL[c as JewelryCategory] ?? c : '—');
/** Categories shown first in pickers. */
export const MAIN_CATEGORIES: JewelryCategory[] = ['RING', 'EARRINGS', 'BANGLE', 'NECKLACE', 'CHAIN', 'PENDANT', 'BRACELET', 'HAAR', 'BRIDAL_SET', 'KUNDAN_SET', 'JHUMKA', 'NOSE_PIN', 'MAANG_TIKKA', 'KADA', 'PAYAL', 'COIN', 'BAR', 'OTHER'];

/** Active selling rate per gram for a metal and karat, keyed "GOLD_KARAT_22". */
export function rateMap(rates: MetalRate[] | undefined) {
  const m = new Map<string, MetalRate>();
  for (const r of rates ?? []) if (r.isActive) m.set(`${r.metalType}_${r.purity}`, r);
  return m;
}
export const rateFor = (rates: Map<string, MetalRate>, metalType: string, purity: string) => rates.get(`${metalType}_${purity}`);

/** What a piece is made of, as needed for its price. */
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

/** Fields of a catalog piece that set its price. */
export type PricedPiece = Pick<JewelryProductProfile, 'metalType' | 'purity' | 'netWeight' | 'makingChargePerGram' | 'makingChargeFixed' | 'makingChargePct'
  | 'wastagePct' | 'wastageGrams' | 'polishCharge' | 'designerCharge' | 'otherCharges' | 'hallmarkCharge'> & { gemstones?: Array<{ totalValue?: number | null }> };

/** Stones on a catalog piece: listed gemstones, or nothing. */
export const stonesOf = (j: Pick<PricedPiece, 'gemstones'>) => r2((j.gemstones ?? []).reduce((s, g) => s + (Number(g.totalValue) || 0), 0));

/** A catalog piece priced at today's rate (null when the karat has no rate set). */
export function profilePrice(j: PricedPiece, rates: Map<string, MetalRate>) {
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

/** Old gold value: weight × buying rate of its karat, less kaat percent. */
export function oldGoldValue(gramsIn: number, purity: string, rates: Map<string, MetalRate>, kaatPct: number) {
  const rate = rateFor(rates, metalOf(purity), purity);
  const perGram = rate ? rate.buyRate || rate.ratePerGram : 0;
  const full = r2(gramsIn * perGram);
  return { perGram, full, value: r2(full * (1 - Math.min(Math.max(kaatPct, 0), 50) / 100)) };
}

export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: tr('Draft'), tone: 'bg-slate-100 text-slate-700' },
  QUOTED: { label: tr('Qeemat batayi'), tone: 'bg-slate-100 text-slate-700' },
  CONFIRMED: { label: tr('Pakka'), tone: 'bg-sky-50 text-sky-700' },
  DESIGNING: { label: tr('Design'), tone: 'bg-violet-50 text-violet-700' },
  METAL_ISSUED: { label: tr('Karigar ko sona diya'), tone: 'bg-amber-50 text-amber-800' },
  IN_PRODUCTION: { label: tr('Ban raha hai'), tone: 'bg-amber-50 text-amber-800' },
  POLISHING: { label: tr('Polish'), tone: 'bg-amber-50 text-amber-800' },
  QUALITY_CHECK: { label: tr('Check'), tone: 'bg-indigo-50 text-indigo-700' },
  HALLMARKING: { label: tr('Hallmark'), tone: 'bg-indigo-50 text-indigo-700' },
  READY: { label: tr('Tayyar'), tone: 'bg-emerald-50 text-emerald-700' },
  DELIVERED: { label: tr('De diya'), tone: 'bg-emerald-600 text-white' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700' },
  ON_HOLD: { label: tr('Ruka hua'), tone: 'bg-slate-100 text-slate-600' },
};
export const orderStatus = (s: string) => ORDER_STATUS[s] ?? { label: s, tone: 'bg-slate-100 text-slate-700' };
/** Next step for an open order. */
export const NEXT_STATUS: Record<string, string | undefined> = {
  DRAFT: 'CONFIRMED', QUOTED: 'CONFIRMED', CONFIRMED: 'DESIGNING', DESIGNING: 'IN_PRODUCTION', METAL_ISSUED: 'IN_PRODUCTION',
  IN_PRODUCTION: 'POLISHING', POLISHING: 'QUALITY_CHECK', QUALITY_CHECK: 'READY', HALLMARKING: 'READY', ON_HOLD: 'IN_PRODUCTION',
};

export const ENTRY_LABEL: Record<string, { label: string; in: boolean }> = {
  PURCHASE: { label: tr('Khareed'), in: true }, OPENING: { label: tr('Shuru ka stock'), in: true }, RETURN: { label: tr('Wapsi'), in: true },
  RECEIVE: { label: tr('Karigar se wapas'), in: true }, EXCHANGE_IN: { label: tr('Purana sona aaya'), in: true },
  ISSUE: { label: tr('Karigar ko diya'), in: false }, ADJUSTMENT: { label: tr('Kami / wapas diya'), in: false }, SALE: { label: tr('Becha'), in: false },
};
export const entryLabel = (t: string) => ENTRY_LABEL[t] ?? { label: t, in: false };

export const EXCHANGE_LABEL: Record<string, string> = {
  OLD_GOLD_EXCHANGE: tr('Purana sona'), OLD_SILVER_EXCHANGE: tr('Purani chandi'), BROKEN_JEWELRY: tr('Toota zewar'), PURE_METAL_DEPOSIT: tr('Khalis sona'),
  COIN_EXCHANGE: tr('Sikka / biscuit'), MELT_AND_REMAKE: tr('Galane ke liye'), REPAIR: tr('Repair'), RESIZING: tr('Size theek'), RENOVATION: tr('Polish / naya jaisa'),
};
export const exchangeLabel = (t: string) => EXCHANGE_LABEL[t] ?? t;

export const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—');
export const dayTime = (d?: string | null) => (d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

/** Server message of a failed request, or the fallback. */
export function apiError(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(msg)) return String(msg[0] ?? fallback);
  return typeof msg === 'string' && msg ? msg : fallback;
}
