/**
 * Shop defaults for the growth tools: the price calculator's fees and inputs,
 * and whether ads spend is written to expenses. Stored as
 * `TenantSettings.reportsConfig.growth` (Settings → Reports keeps the key
 * when it saves its own part). Pure functions, shared by the services and
 * the tests.
 *
 * Channel fee presets are rough starting points, not official rates; the UI
 * says so and every number can be changed.
 */

export const CHANNEL_KINDS = ['DARAZ', 'SHOPIFY', 'WOOCOMMERCE', 'WEBSITE'] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export interface FeeCategory { key: string; label: string; pct: number }

export interface ChannelFees {
  /** Channel commission on the item price, %. */
  commissionPct: number;
  /** Payment or gateway fee, % of what the customer pays (prepaid orders; every order when the channel ships). */
  paymentFeePct: number;
  /** Fixed fee per order, Rs. */
  fixedFee: number;
  /** The shop books its own courier; false when the channel ships and charges `shippingFee`. */
  ownCourier: boolean;
  /** Seller's share of the channel's shipping fee per order, Rs (only when the channel ships). */
  shippingFee: number;
  /** Orders paid cash on delivery through the shop's courier, % (only with an own courier). */
  codShare: number;
  /** Commission by category (Daraz); `category` picks one. */
  categories: FeeCategory[];
  category: string | null;
}

export type TargetMode = 'MARGIN' | 'RUPEES';

export interface PriceDefaults {
  channels: Record<ChannelKind, ChannelFees>;
  /** Packaging per order, Rs; null = the online selling-cost setting, else 0. */
  packaging: number | null;
  courier: {
    /** Courier code whose rate card is used; null = the shop's most used courier. */
    code: string | null;
    city: string;
    weightKg: number;
    /** Used when no rate card is set for the courier. */
    charge: number;
    codPct: number;
    codFixed: number;
    /** Return leg as a % of the forward charge. */
    returnPct: number;
  };
  /** Ads cost per order, Rs; null = worked out from the ads log. */
  adsPerOrder: number | null;
  /** Expected returns (RTO), %; null = each channel's own history. */
  rtoPct: number | null;
  /** Delivery charged to the customer per order, Rs. */
  deliveryCharge: number;
  /** GST included in the price, %; null = the shop's tax setting. */
  taxPct: number | null;
  target: { mode: TargetMode; value: number };
  endWith9: boolean;
}

export interface GrowthSettings {
  price: PriceDefaults;
  ads: {
    /** New ads entries are written to expenses (P&L). */
    postExpenses: boolean;
  };
}

export const DARAZ_CATEGORIES: FeeCategory[] = [
  { key: 'mobiles', label: 'Mobiles & tablets', pct: 7 },
  { key: 'electronics', label: 'Electronics & accessories', pct: 12 },
  { key: 'fashion', label: 'Fashion (kapre, joote)', pct: 18 },
  { key: 'beauty', label: 'Beauty & health', pct: 14 },
  { key: 'home', label: 'Home & living', pct: 15 },
  { key: 'grocery', label: 'Grocery', pct: 8 },
  { key: 'other', label: 'Baqi sab', pct: 15 },
];

const fees = (f: Partial<ChannelFees>): ChannelFees => ({
  commissionPct: 0, paymentFeePct: 0, fixedFee: 0, ownCourier: true, shippingFee: 0, codShare: 90, categories: [], category: null, ...f,
});

export const DEFAULT_CHANNEL_FEES: Record<ChannelKind, ChannelFees> = {
  DARAZ: fees({ commissionPct: 15, paymentFeePct: 2, ownCourier: false, shippingFee: 150, codShare: 0, categories: DARAZ_CATEGORIES, category: 'other' }),
  SHOPIFY: fees({ paymentFeePct: 3 }),
  WOOCOMMERCE: fees({ paymentFeePct: 3 }),
  WEBSITE: fees({ paymentFeePct: 3 }),
};

export const DEFAULT_PRICE: PriceDefaults = {
  channels: DEFAULT_CHANNEL_FEES,
  packaging: null,
  courier: { code: null, city: '', weightKg: 0.5, charge: 200, codPct: 4, codFixed: 0, returnPct: 100 },
  adsPerOrder: null,
  rtoPct: null,
  deliveryCharge: 0,
  taxPct: null,
  target: { mode: 'MARGIN', value: 20 },
  endWith9: true,
};

const num = (v: unknown, fallback: number, max = 1_000_000) => {
  const n = Number(v);
  return v !== null && v !== '' && Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
};
const nullable = (v: unknown, max = 1_000_000): number | null => (v === null || v === undefined || v === '' ? null : num(v, 0, max));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function normalizeFees(raw: unknown, base: ChannelFees): ChannelFees {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const seen = new Set<string>();
  const categories = Array.isArray(f.categories)
    ? f.categories
      .map((c: any) => ({ key: String(c?.key ?? '').trim().slice(0, 40), label: String(c?.label ?? '').trim().slice(0, 60), pct: num(c?.pct, 0, 100) }))
      .filter((c: FeeCategory) => c.key && c.label && !seen.has(c.key) && seen.add(c.key))
      .slice(0, 30)
    : base.categories;
  const category = typeof f.category === 'string' && categories.some((c: FeeCategory) => c.key === f.category) ? f.category : base.category;
  return {
    commissionPct: num(f.commissionPct, base.commissionPct, 100),
    paymentFeePct: num(f.paymentFeePct, base.paymentFeePct, 100),
    fixedFee: r2(num(f.fixedFee, base.fixedFee, 100_000)),
    ownCourier: typeof f.ownCourier === 'boolean' ? f.ownCourier : base.ownCourier,
    shippingFee: r2(num(f.shippingFee, base.shippingFee, 100_000)),
    codShare: num(f.codShare, base.codShare, 100),
    categories,
    category,
  };
}

export function normalizeGrowthSettings(raw: unknown): GrowthSettings {
  const g = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const p = (g.price && typeof g.price === 'object' ? g.price : {}) as Record<string, any>;
  const c = (p.courier && typeof p.courier === 'object' ? p.courier : {}) as Record<string, any>;
  const d = DEFAULT_PRICE;
  const channels = {} as Record<ChannelKind, ChannelFees>;
  for (const k of CHANNEL_KINDS) channels[k] = normalizeFees(p.channels?.[k], DEFAULT_CHANNEL_FEES[k]);
  const mode: TargetMode = p.target?.mode === 'RUPEES' ? 'RUPEES' : 'MARGIN';
  return {
    price: {
      channels,
      packaging: p.packaging === undefined ? d.packaging : nullable(p.packaging, 100_000),
      courier: {
        code: typeof c.code === 'string' && /^[A-Z_]{2,20}$/.test(c.code) ? c.code : null,
        city: typeof c.city === 'string' ? c.city.trim().slice(0, 60) : '',
        weightKg: num(c.weightKg, d.courier.weightKg, 100) || d.courier.weightKg,
        charge: r2(num(c.charge, d.courier.charge, 100_000)),
        codPct: num(c.codPct, d.courier.codPct, 20),
        codFixed: r2(num(c.codFixed, d.courier.codFixed, 10_000)),
        returnPct: num(c.returnPct, d.courier.returnPct, 200),
      },
      adsPerOrder: p.adsPerOrder === undefined ? d.adsPerOrder : nullable(p.adsPerOrder, 100_000),
      rtoPct: p.rtoPct === undefined ? d.rtoPct : nullable(p.rtoPct, 90),
      deliveryCharge: r2(num(p.deliveryCharge, d.deliveryCharge, 100_000)),
      taxPct: p.taxPct === undefined ? d.taxPct : nullable(p.taxPct, 50),
      target: { mode, value: num(p.target?.value, d.target.value, mode === 'MARGIN' ? 90 : 10_000_000) },
      endWith9: typeof p.endWith9 === 'boolean' ? p.endWith9 : d.endWith9,
    },
    ads: { postExpenses: typeof g.ads?.postExpenses === 'boolean' ? g.ads.postExpenses : true },
  };
}

/** Channel kind of a sales channel; null for channels that do not sell products (Foodpanda). */
export function channelKind(type: string, platform?: string | null): ChannelKind | null {
  switch (type) {
    case 'DARAZ': return 'DARAZ';
    case 'SHOPIFY': return 'SHOPIFY';
    case 'WOOCOMMERCE': return 'WOOCOMMERCE';
    case 'CUSTOM_WEBSITE':
      if (platform === 'shopify') return 'SHOPIFY';
      if (platform === 'woocommerce' || platform === 'wordpress') return 'WOOCOMMERCE';
      return 'WEBSITE';
    default: return null;
  }
}
