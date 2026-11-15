/**
 * Market home curation, edited from the admin panel (SystemSetting
 * MARKET_HOME_KEY): banners, featured shops and extra home sections.
 * The customer discover feed reads it through readHomeCuration().
 */
import { MarketGate, isMarketGate } from './market-config';

export const MARKET_HOME_KEY = 'market:home';

export interface HomeBanner {
  id: string;
  image: string;
  title: string;
  link: string;
  gate?: MarketGate;
  city?: string;
  active: boolean;
  /** ISO date-time; the banner shows from this moment. */
  startsAt?: string;
  /** ISO date-time; the banner stops after this moment. */
  endsAt?: string;
}

export interface HomeSection {
  id: string;
  title: { en: string; roman: string; ur: string };
  type: 'shops' | 'products';
  gate?: MarketGate;
  shopIds?: string[];
  productIds?: string[];
}

export interface HomeCuration {
  banners: HomeBanner[];
  /** Shop ids (Shop.id) shown first in the featured row, in this order. */
  featuredShopIds: string[];
  sections: HomeSection[];
}

export const EMPTY_HOME: HomeCuration = { banners: [], featuredShopIds: [], sections: [] };

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ids = (v: unknown, max = 50) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim()))].slice(0, max) : []);
const isoOrUndef = (v: unknown) => {
  const s = str(v, 40);
  return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : undefined;
};
const newId = () => Math.random().toString(36).slice(2, 10);

/** Clean any stored or posted value into a valid curation object. */
export function sanitizeHome(raw: unknown): HomeCuration {
  const v = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const banners: HomeBanner[] = (Array.isArray(v.banners) ? v.banners : []).slice(0, 20).flatMap((b: any) => {
    const image = str(b?.image, 1000);
    if (!image) return [];
    return [{
      id: str(b?.id, 40) || newId(),
      image,
      title: str(b?.title, 120),
      link: str(b?.link, 500),
      ...(isMarketGate(b?.gate) && { gate: b.gate }),
      ...(str(b?.city, 80) && { city: str(b?.city, 80) }),
      active: b?.active !== false,
      ...(isoOrUndef(b?.startsAt) && { startsAt: isoOrUndef(b?.startsAt) }),
      ...(isoOrUndef(b?.endsAt) && { endsAt: isoOrUndef(b?.endsAt) }),
    }];
  });
  const sections: HomeSection[] = (Array.isArray(v.sections) ? v.sections : []).slice(0, 12).flatMap((s: any) => {
    const t = s?.title && typeof s.title === 'object' ? s.title : {};
    const en = str(t.en, 80);
    if (!en) return [];
    const type = s?.type === 'products' ? 'products' : 'shops';
    return [{
      id: str(s?.id, 40) || newId(),
      title: { en, roman: str(t.roman, 80) || en, ur: str(t.ur, 80) || en },
      type,
      ...(isMarketGate(s?.gate) && { gate: s.gate }),
      ...(type === 'shops' ? { shopIds: ids(s?.shopIds, 30) } : { productIds: ids(s?.productIds, 30) }),
    } as HomeSection];
  });
  return { banners, featuredShopIds: ids(v.featuredShopIds, 30), sections };
}

export function readHomeCuration(raw: string | null | undefined): HomeCuration {
  try { return sanitizeHome(raw ? JSON.parse(raw) : {}); } catch { return { ...EMPTY_HOME }; }
}

/** Banners active right now. A banner with a city or gate shows only to that city or inside that gate. */
export function liveBanners(home: HomeCuration, opts: { city?: string | null; gate?: string | null; now?: Date } = {}): HomeBanner[] {
  const now = (opts.now ?? new Date()).getTime();
  const city = (opts.city ?? '').trim().toLowerCase();
  return home.banners.filter((b) => {
    if (!b.active) return false;
    if (b.startsAt && Date.parse(b.startsAt) > now) return false;
    if (b.endsAt && Date.parse(b.endsAt) < now) return false;
    if (b.city && b.city.toLowerCase() !== city) return false;
    if (b.gate && b.gate !== (opts.gate ?? null)) return false;
    return true;
  });
}
