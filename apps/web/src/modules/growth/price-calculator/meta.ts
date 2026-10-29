/**
 * Labels, logos and the starting state of the price calculator, shared by
 * the page, the product editor's modal and the bulk view.
 */

import type { BrandName } from '@/assets/brands/BrandLogo';
import type { BreakdownKey, CalcContext, ChannelFees, ChannelKind, QuoteBody, TargetMode } from '../api/growth.api';

export const KIND_LABEL: Record<ChannelKind, string> = { DARAZ: 'Daraz', SHOPIFY: 'Shopify', WOOCOMMERCE: 'WooCommerce', WEBSITE: 'Apni website' };
export const KIND_BRAND: Record<ChannelKind, BrandName> = { DARAZ: 'daraz', SHOPIFY: 'shopify', WOOCOMMERCE: 'woocommerce', WEBSITE: 'website' };

export const BREAKDOWN: Record<BreakdownKey, { label: string; color: string }> = {
  cost: { label: 'Product cost', color: '#64748b' },
  tax: { label: 'GST / tax', color: '#a855f7' },
  packaging: { label: 'Packaging', color: '#94a3b8' },
  shipping: { label: 'Courier / shipping', color: '#0ea5e9' },
  codFee: { label: 'COD fee', color: '#06b6d4' },
  commission: { label: 'Commission', color: '#f97316' },
  paymentFee: { label: 'Payment fee', color: '#f59e0b' },
  fixedFee: { label: 'Fixed fee', color: '#eab308' },
  ads: { label: 'Ads', color: '#ec4899' },
  rto: { label: 'RTO (wapsi) ka nuksan', color: '#ef4444' },
  profit: { label: 'Profit', color: '#16a34a' },
};

/** Typed inputs; an empty box means "use the default". */
export interface CalcState {
  cost: string;
  courierCode: string;
  city: string;
  weightKg: string;
  courierCharge: string;
  codPct: string;
  returnPct: string;
  packaging: string;
  deliveryCharge: string;
  adsPerOrder: string;
  taxPct: string;
  targetMode: TargetMode;
  targetValue: string;
  endWith9: boolean;
  kinds: ChannelKind[];
  fees: Record<ChannelKind, ChannelFees>;
  rto: Record<ChannelKind, string>;
  checkPrice: string;
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(Math.round(n * 100) / 100));

/** RTO % the calculator starts with for a channel: saved default, else its history, else 10. */
export const startRto = (ctx: CalcContext, kind: ChannelKind) =>
  ctx.settings.price.rtoPct ?? ctx.rto[kind]?.pct ?? ctx.rto.ALL?.pct ?? 10;

export function initialState(ctx: CalcContext, opts: { cost?: number | null; weightKg?: number | null } = {}): CalcState {
  const d = ctx.settings.price;
  const kinds = ctx.kinds.length ? ctx.kinds : (['WEBSITE', 'DARAZ'] as ChannelKind[]);
  return {
    cost: str(opts.cost ?? ctx.product?.cost ?? null),
    courierCode: d.courier.code ?? ctx.courierCode ?? '',
    city: d.courier.city,
    weightKg: str(opts.weightKg ?? ctx.product?.weightKg ?? d.courier.weightKg),
    courierCharge: '',
    codPct: '',
    returnPct: '',
    packaging: str(d.packaging ?? ctx.packaging ?? 0),
    deliveryCharge: str(d.deliveryCharge),
    adsPerOrder: str(d.adsPerOrder ?? ctx.ads.value ?? 0),
    taxPct: str(d.taxPct ?? ctx.tax.pricePct),
    targetMode: d.target.mode,
    targetValue: str(d.target.value),
    endWith9: d.endWith9,
    kinds,
    fees: { ...d.channels },
    rto: Object.fromEntries((['DARAZ', 'SHOPIFY', 'WOOCOMMERCE', 'WEBSITE'] as ChannelKind[]).map((k) => [k, str(startRto(ctx, k))])) as Record<ChannelKind, string>,
    checkPrice: '',
  };
}

const n = (s: string): number | null => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

/** Quote request for the typed inputs (without the cost, which the caller adds). */
export function quoteBody(s: CalcState): QuoteBody {
  return {
    courier: { code: s.courierCode || null, city: s.city || null, weightKg: n(s.weightKg), charge: n(s.courierCharge), codPct: n(s.codPct), returnPct: n(s.returnPct) },
    packaging: n(s.packaging),
    deliveryCharge: n(s.deliveryCharge),
    adsPerOrder: n(s.adsPerOrder),
    taxPct: n(s.taxPct),
    target: { mode: s.targetMode, value: n(s.targetValue) ?? 0 },
    endWith9: s.endWith9,
    channels: s.kinds.map((kind) => ({ kind, fees: s.fees[kind], rtoPct: n(s.rto[kind]) })),
    checkPrice: n(s.checkPrice),
  };
}

export const num = n;
