/**
 * The JSON documents on NafaaStore (settings, checkout, shipping, policies):
 * defaults, readers that repair anything malformed, and the merge used by the
 * merchant PATCH routes. Every reader returns a complete object, so callers
 * never check for missing keys.
 */

export type StoreStatus = 'DRAFT' | 'PASSWORD' | 'LIVE' | 'CLOSED';
export const STORE_STATUSES: StoreStatus[] = ['DRAFT', 'PASSWORD', 'LIVE', 'CLOSED'];
export type Lang = 'en' | 'ur';
export type PayCode = 'COD' | 'SAFEPAY' | 'JAZZCASH' | 'EASYPAISA';
export const ONLINE_PAY_CODES = ['SAFEPAY', 'JAZZCASH', 'EASYPAISA'] as const;

export interface StoreSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
  logoWidth: number;
  tagline: string | null;
  contact: { phone: string | null; whatsapp: string | null; email: string | null; address: string | null; hours: string | null };
  social: Partial<Record<'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'x' | 'whatsapp', string>>;
  languages: { default: Lang; enabled: Lang[] };
  currencyDisplay: { symbol: 'Rs' | 'PKR' | '₨'; decimals: 0 | 2 };
  tracking: { metaPixelId: string | null; ga4Id: string | null; googleAdsId: string | null; googleAdsLabel: string | null; tiktokPixelId: string | null };
  whatsappButton: { enabled: boolean; number: string | null; message: string | null; position: 'left' | 'right' };
  seo: { title: string | null; description: string | null; ogImageUrl: string | null; noindex: boolean };
  password: { message: string | null };
  catalogMode: 'ALL' | 'CHOSEN';
  showOutOfStock: boolean;
  newsletter: { enabled: boolean; mode: 'whatsapp' | 'email' | 'both' };
}

export interface PublicCheckoutSettings {
  loginMode: 'guest' | 'optional' | 'required';
  fields: { email: 'hidden' | 'optional' | 'required'; postalCode: 'hidden' | 'optional' | 'required'; province: 'hidden' | 'optional' | 'required'; landmark: 'hidden' | 'optional' };
  notes: boolean;
  marketingOptIn: boolean;
  codConfirmWhatsApp: boolean;
  minOrder: number | null;
  maxCodOrder: number | null;
  termsUrl: string | null;
}

export interface CheckoutSettings extends PublicCheckoutSettings {
  payments: { cod: boolean; SAFEPAY: boolean; JAZZCASH: boolean; EASYPAISA: boolean };
  advance: { mode: 'off' | 'shop_rule' | 'always_cod'; percent: number; minOrder: number | null };
  whatsappNumber: string | null;
  thankYouMessage: string | null;
}

export interface ShippingRate {
  id: string;
  name: string;
  type: 'flat' | 'weight' | 'price';
  price: number;
  min: number | null;
  max: number | null;
  freeAbove: number | null;
  eta: string | null;
}
export interface ShippingZone {
  id: string;
  name: string;
  provinces: string[];
  cities: string[];
  codEnabled: boolean;
  codFee: number | null;
  eta: string | null;
  rates: ShippingRate[];
}
export interface ShippingSettings {
  freeShippingThreshold: number | null;
  defaultEta: string | null;
  codFee: number;
  zones: ShippingZone[];
}

export type PolicyKind = 'refund' | 'privacy' | 'terms' | 'shipping';
export const POLICY_KINDS: PolicyKind[] = ['refund', 'privacy', 'terms', 'shipping'];
export const POLICY_TITLES: Record<PolicyKind, string> = {
  refund: 'Refund policy', privacy: 'Privacy policy', terms: 'Terms of service', shipping: 'Shipping policy',
};
export const POLICY_HANDLES: Record<PolicyKind, string> = {
  refund: 'refund-policy', privacy: 'privacy-policy', terms: 'terms-of-service', shipping: 'shipping-policy',
};
export type Policies = Partial<Record<PolicyKind, { title: string; bodyHtml: string; updatedAt: string }>>;

// ─── small readers ───────────────────────────────────────────

const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
export const str = (v: unknown, max = 300): string | null => {
  const s = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
  return s ? s.slice(0, max) : null;
};
const httpsUrl = (v: unknown): string | null => {
  const s = str(v, 1000);
  return s && /^https:\/\/\S+$/i.test(s) ? s : s && /^\/[^/]\S*$/.test(s) ? s : null;
};
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
export const money = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(Math.min(n, 100_000_000) * 100) / 100 : null;
};
const trackingId = (v: unknown, re: RegExp) => {
  const s = str(v, 60);
  return s && re.test(s) ? s : null;
};
const phone = (v: unknown) => {
  const s = str(v, 30);
  return s && /^[+\d][\d\s-]{6,20}$/.test(s) ? s.replace(/[\s-]/g, '') : null;
};

// ─── settings ────────────────────────────────────────────────

export function readSettings(raw: unknown): StoreSettings {
  const r = obj(raw);
  const c = obj(r.contact);
  const s = obj(r.social);
  const l = obj(r.languages);
  const cd = obj(r.currencyDisplay);
  const t = obj(r.tracking);
  const w = obj(r.whatsappButton);
  const seo = obj(r.seo);
  const nl = obj(r.newsletter);
  const enabled = (Array.isArray(l.enabled) ? l.enabled : ['en']).filter((x: unknown): x is Lang => x === 'en' || x === 'ur');
  if (!enabled.includes('en')) enabled.unshift('en');
  const social: StoreSettings['social'] = {};
  for (const k of ['facebook', 'instagram', 'tiktok', 'youtube', 'x', 'whatsapp'] as const) {
    const v = k === 'whatsapp' ? phone(s[k]) : httpsUrl(s[k]);
    if (v) social[k] = v;
  }
  const logoWidth = Number(r.logoWidth);
  return {
    logoUrl: httpsUrl(r.logoUrl),
    faviconUrl: httpsUrl(r.faviconUrl),
    logoWidth: Number.isFinite(logoWidth) ? Math.max(60, Math.min(300, Math.round(logoWidth))) : 140,
    tagline: str(r.tagline, 160),
    contact: { phone: phone(c.phone), whatsapp: phone(c.whatsapp), email: str(c.email, 160), address: str(c.address, 300), hours: str(c.hours, 120) },
    social,
    languages: { default: oneOf(l.default, ['en', 'ur'] as const, 'en'), enabled: [...new Set(enabled)] },
    currencyDisplay: { symbol: oneOf(cd.symbol, ['Rs', 'PKR', '₨'] as const, 'Rs'), decimals: cd.decimals === 2 ? 2 : 0 },
    tracking: {
      metaPixelId: trackingId(t.metaPixelId, /^\d{6,20}$/),
      ga4Id: trackingId(t.ga4Id, /^G-[A-Z0-9]{4,15}$/i),
      googleAdsId: trackingId(t.googleAdsId, /^AW-\d{6,15}$/i),
      googleAdsLabel: trackingId(t.googleAdsLabel, /^[\w-]{4,40}$/),
      tiktokPixelId: trackingId(t.tiktokPixelId, /^[A-Z0-9]{10,30}$/i),
    },
    whatsappButton: { enabled: bool(w.enabled, true), number: phone(w.number), message: str(w.message, 300), position: oneOf(w.position, ['left', 'right'] as const, 'right') },
    seo: { title: str(seo.title, 70), description: str(seo.description, 320), ogImageUrl: httpsUrl(seo.ogImageUrl), noindex: bool(seo.noindex, false) },
    password: { message: str(obj(r.password).message, 300) },
    catalogMode: oneOf(r.catalogMode, ['ALL', 'CHOSEN'] as const, 'ALL'),
    showOutOfStock: bool(r.showOutOfStock, true),
    newsletter: { enabled: bool(nl.enabled, true), mode: oneOf(nl.mode, ['whatsapp', 'email', 'both'] as const, 'both') },
  };
}

/** Deep merge of a partial update onto stored settings, then repaired by the reader. */
export function mergeSettings(current: unknown, patch: unknown): StoreSettings {
  const a = obj(current);
  const b = obj(patch);
  const out: Record<string, any> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...obj(a[k]), ...v } : v;
  }
  return readSettings(out);
}

// ─── checkout ────────────────────────────────────────────────

export function readCheckout(raw: unknown): CheckoutSettings {
  const r = obj(raw);
  const f = obj(r.fields);
  const p = obj(r.payments);
  const a = obj(r.advance);
  const vis = ['hidden', 'optional', 'required'] as const;
  const pct = Number(a.percent);
  return {
    loginMode: oneOf(r.loginMode, ['guest', 'optional', 'required'] as const, 'optional'),
    fields: {
      email: oneOf(f.email, vis, 'optional'),
      postalCode: oneOf(f.postalCode, vis, 'hidden'),
      province: oneOf(f.province, vis, 'optional'),
      landmark: oneOf(f.landmark, ['hidden', 'optional'] as const, 'optional'),
    },
    notes: bool(r.notes, true),
    marketingOptIn: bool(r.marketingOptIn, true),
    codConfirmWhatsApp: bool(r.codConfirmWhatsApp, true),
    minOrder: money(r.minOrder),
    maxCodOrder: money(r.maxCodOrder),
    termsUrl: httpsUrl(r.termsUrl),
    payments: { cod: bool(p.cod, true), SAFEPAY: bool(p.SAFEPAY, true), JAZZCASH: bool(p.JAZZCASH, true), EASYPAISA: bool(p.EASYPAISA, true) },
    advance: {
      mode: oneOf(a.mode, ['off', 'shop_rule', 'always_cod'] as const, 'shop_rule'),
      percent: Number.isFinite(pct) && pct >= 5 && pct <= 100 ? Math.round(pct) : 30,
      minOrder: money(a.minOrder),
    },
    whatsappNumber: phone(r.whatsappNumber),
    thankYouMessage: str(r.thankYouMessage, 500),
  };
}

export function publicCheckout(c: CheckoutSettings): PublicCheckoutSettings {
  const { payments: _p, advance: _a, whatsappNumber: _w, thankYouMessage: _t, ...pub } = c;
  return pub;
}

// ─── shipping ────────────────────────────────────────────────

export const PROVINCE_CODES = ['PB', 'SD', 'KP', 'BA', 'IS', 'GB', 'AJK'] as const;

export const DEFAULT_SHIPPING: ShippingSettings = {
  freeShippingThreshold: null,
  defaultEta: '3-5 working days',
  codFee: 0,
  zones: [{
    id: 'all-pk', name: 'All Pakistan', provinces: [], cities: [], codEnabled: true, codFee: null, eta: null,
    rates: [{ id: 'standard', name: 'Standard delivery', type: 'flat', price: 250, min: null, max: null, freeAbove: null, eta: '3-5 working days' }],
  }],
};

const id = (v: unknown, fallback: string) => {
  const s = str(v, 40);
  return s && /^[\w-]+$/.test(s) ? s : fallback;
};

export function readShipping(raw: unknown): ShippingSettings {
  const r = obj(raw);
  if (!Array.isArray(r.zones)) return { ...DEFAULT_SHIPPING, ...pickShippingTop(r) };
  const zones: ShippingZone[] = r.zones.slice(0, 50).map((zr: unknown, zi: number) => {
    const z = obj(zr);
    return {
      id: id(z.id, `z${zi + 1}`),
      name: str(z.name, 80) ?? `Zone ${zi + 1}`,
      provinces: (Array.isArray(z.provinces) ? z.provinces : []).filter((p: unknown) => (PROVINCE_CODES as readonly unknown[]).includes(p)),
      cities: [...new Set((Array.isArray(z.cities) ? z.cities : []).map((c: unknown) => str(c, 60)).filter(Boolean) as string[])].slice(0, 500),
      codEnabled: bool(z.codEnabled, true),
      codFee: money(z.codFee),
      eta: str(z.eta, 80),
      rates: (Array.isArray(z.rates) ? z.rates : []).slice(0, 20).map((rr: unknown, ri: number) => {
        const x = obj(rr);
        return {
          id: id(x.id, `r${ri + 1}`),
          name: str(x.name, 80) ?? 'Delivery',
          type: oneOf(x.type, ['flat', 'weight', 'price'] as const, 'flat'),
          price: money(x.price) ?? 0,
          min: money(x.min),
          max: money(x.max),
          freeAbove: money(x.freeAbove),
          eta: str(x.eta, 80),
        };
      }),
    };
  });
  return { ...pickShippingTop(r), zones };
}

function pickShippingTop(r: Record<string, any>) {
  return {
    freeShippingThreshold: money(r.freeShippingThreshold),
    defaultEta: r.defaultEta === undefined ? DEFAULT_SHIPPING.defaultEta : str(r.defaultEta, 80),
    codFee: money(r.codFee) ?? 0,
  };
}

// ─── policies ────────────────────────────────────────────────

export function readPolicies(raw: unknown): Policies {
  const r = obj(raw);
  const out: Policies = {};
  for (const k of POLICY_KINDS) {
    const p = obj(r[k]);
    if (typeof p.bodyHtml === 'string' && p.bodyHtml.trim()) {
      out[k] = { title: str(p.title, 120) ?? POLICY_TITLES[k], bodyHtml: p.bodyHtml, updatedAt: str(p.updatedAt, 40) ?? new Date(0).toISOString() };
    }
  }
  return out;
}

export function policyKindOf(raw: string): PolicyKind | null {
  const s = String(raw ?? '').toLowerCase();
  const byHandle = (Object.entries(POLICY_HANDLES) as Array<[PolicyKind, string]>).find(([, h]) => h === s);
  if (byHandle) return byHandle[0];
  return (POLICY_KINDS as string[]).includes(s) ? (s as PolicyKind) : null;
}
