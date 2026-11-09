/**
 * The online store set up the way each seller works. A few answers (where
 * they sell, which couriers, how much is COD, team size, how they confirm,
 * whether they pack by scan) give the defaults: dashboard work tiles, board
 * tiles hidden, sidebar items hidden or pinned, the recipes to switch on and
 * a confirm message. Everything stays editable afterwards.
 */

import { RecipeKey, RecipeParams } from './automation';

export const SELL_PLACES = ['WEBSITE', 'SHOPIFY', 'WOOCOMMERCE', 'DARAZ', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'TIKTOK', 'FOODPANDA'] as const;
export type SellPlace = (typeof SELL_PLACES)[number];

export interface SetupAnswers {
  places: SellPlace[];
  /** Courier codes (up to 5), PAKPOST for Pakistan Post, RIDER for own riders. */
  couriers: string[];
  codShare: 'MOST' | 'HALF' | 'FEW';
  team: 'SOLO' | 'SMALL' | 'LARGE';
  confirmBy: 'CALL' | 'WHATSAPP' | 'BOTH' | 'NONE';
  packScan: boolean;
}

export interface SetupProfile {
  answers: SetupAnswers | null;
  doneAt: string | null;
  skippedAt: string | null;
  /** Dashboard "Aaj ka kaam" tiles, in order. */
  homeTiles: string[];
  /** Orders board tiles kept out of sight while empty. */
  hiddenTiles: string[];
  /** Commerce sidebar items hidden (paths). */
  hiddenNav: string[];
  /** Pages suggested for pinning (paths). */
  pinnedNav: string[];
}

export const HOME_TILES = ['NEW', 'PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'CONFIRMED', 'PACKED', 'PACKED_NOT_SENT', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'STUCK', 'ISSUES', 'RETURNING', 'FOLLOW_UP', 'COD_DUE', 'CLAIM'] as const;
export const DEFAULT_HOME_TILES = ['NEW', 'PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CONFIRMED', 'PACKED_NOT_SENT', 'STUCK', 'ISSUES', 'RETURNING', 'FOLLOW_UP'];
/** Board tiles a seller may hide (the core flow always shows). */
export const HIDEABLE_TILES = ['PAY_PENDING', 'ON_HOLD', 'NO_STOCK', 'CUSTOMER_QUERY', 'PACKED_NOT_SENT', 'OUT_FOR_DELIVERY', 'STUCK', 'ISSUES', 'RETURNING', 'REPLACEMENT', 'CLAIM', 'FOLLOW_UP', 'COD_DUE', 'TODAY'];
/** Sidebar items a seller may hide; the dashboard, orders and settings always stay. */
export const HIDEABLE_NAV = [
  '/online-orders/new', '/online-orders/pack', '/online-orders/returns-scan', '/online-orders/abandoned', '/online-orders/tracking',
  '/online-store/couriers/rules', '/online-orders/cod/reconcile', '/online-orders/dispatch', '/online-orders/dispatch-scan', '/online-orders/dispatch-report',
  '/online-orders/couriers-score', '/online-orders/post-office', '/online-store/price-calculator', '/online-store/blocklist', '/online-store/whatsapp-templates',
  '/online-orders/profit', '/online-orders/payment-health', '/online-store/ads', '/online-store/automation',
];

export const emptyProfile = (): SetupProfile => ({
  answers: null, doneAt: null, skippedAt: null, homeTiles: [...DEFAULT_HOME_TILES], hiddenTiles: [], hiddenNav: [], pinnedNav: [],
});

const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const listOf = (v: unknown, allowed: readonly string[], max = 40) =>
  [...new Set((Array.isArray(v) ? v : []).map(String).filter((x) => allowed.includes(x)))].slice(0, max);

export function normalizeAnswers(raw: unknown): SetupAnswers {
  const a = (raw && typeof raw === 'object' ? raw : {}) as any;
  return {
    places: listOf(a.places, SELL_PLACES) as SellPlace[],
    couriers: [...new Set((Array.isArray(a.couriers) ? a.couriers : []).map(String).filter((c: string) => /^[A-Z_]{2,20}$/.test(c)))].slice(0, 8) as string[],
    codShare: pick(a.codShare, ['MOST', 'HALF', 'FEW'] as const, 'MOST'),
    team: pick(a.team, ['SOLO', 'SMALL', 'LARGE'] as const, 'SOLO'),
    confirmBy: pick(a.confirmBy, ['CALL', 'WHATSAPP', 'BOTH', 'NONE'] as const, 'CALL'),
    packScan: a.packScan === true,
  };
}

export function normalizeProfile(raw: unknown): SetupProfile {
  const p = (raw && typeof raw === 'object' ? raw : {}) as any;
  const base = emptyProfile();
  const date = (v: unknown) => (typeof v === 'string' && !isNaN(Date.parse(v)) ? v : null);
  const home = listOf(p.homeTiles, HOME_TILES, 20);
  return {
    answers: p.answers ? normalizeAnswers(p.answers) : null,
    doneAt: date(p.doneAt),
    skippedAt: date(p.skippedAt),
    homeTiles: Array.isArray(p.homeTiles) ? home : base.homeTiles,
    hiddenTiles: listOf(p.hiddenTiles, HIDEABLE_TILES),
    hiddenNav: listOf(p.hiddenNav, HIDEABLE_NAV),
    pinnedNav: [...new Set((Array.isArray(p.pinnedNav) ? p.pinnedNav : []).map(String).filter((x: string) => /^\/online-(orders|store)(\/|$)/.test(x)))].slice(0, 12) as string[],
  };
}

export interface SetupDefaults {
  homeTiles: string[];
  hiddenTiles: string[];
  hiddenNav: string[];
  pinnedNav: string[];
  recipes: Array<{ key: RecipeKey; params: RecipeParams }>;
  /** Courier for auto booking when no city rule fits; null = the shop decides. */
  courierFallback: string | null;
  /** Shop's confirm message when it confirms by phone call (null = keep the default). */
  confirmText: string | null;
}

const NON_API = ['RIDER', 'PAKPOST', 'OTHER'];
const STORE_PLACES: SellPlace[] = ['WEBSITE', 'SHOPIFY', 'WOOCOMMERCE'];

/** Defaults from the answers. `apiCouriers` = courier codes Nafaa can book through an API. */
export function defaultsFor(a: SetupAnswers, apiCouriers: string[] = []): SetupDefaults {
  const parcelCouriers = a.couriers.filter((c) => !NON_API.includes(c));
  const ships = parcelCouriers.length > 0 || a.couriers.includes('PAKPOST');
  const many = parcelCouriers.length >= 2;

  const home = DEFAULT_HOME_TILES.filter((k) => {
    if (!ships && ['STUCK', 'ISSUES', 'RETURNING'].includes(k)) return false;
    if (!a.packScan && k === 'PACKED_NOT_SENT') return false;
    return true;
  });
  if (a.codShare !== 'FEW' && ships) home.push('COD_DUE');

  const hiddenTiles: string[] = [];
  if (!ships) hiddenTiles.push('OUT_FOR_DELIVERY', 'STUCK', 'ISSUES', 'RETURNING', 'CLAIM');
  if (!a.packScan) hiddenTiles.push('PACKED_NOT_SENT');
  if (a.codShare === 'FEW') hiddenTiles.push('COD_DUE');
  if (a.team === 'SOLO') hiddenTiles.push('REPLACEMENT');

  const hiddenNav: string[] = [];
  if (!a.packScan) hiddenNav.push('/online-orders/pack', '/online-orders/dispatch-scan');
  if (!a.couriers.includes('PAKPOST')) hiddenNav.push('/online-orders/post-office');
  if (!a.places.some((p) => STORE_PLACES.includes(p))) hiddenNav.push('/online-orders/abandoned');
  if (a.codShare === 'FEW') hiddenNav.push('/online-orders/cod/reconcile');
  if (!parcelCouriers.length) hiddenNav.push('/online-store/couriers/rules', '/online-orders/dispatch-report', '/online-orders/couriers-score', '/online-orders/tracking');
  else if (!many) hiddenNav.push('/online-orders/couriers-score');

  const pinnedNav = ['/online-orders'];
  if (a.confirmBy === 'WHATSAPP' || a.confirmBy === 'BOTH') pinnedNav.push('/online-store/whatsapp-templates');
  if (a.packScan) pinnedNav.push('/online-orders/pack');
  if (parcelCouriers.length) pinnedNav.push('/online-orders/tracking');
  if (many) pinnedNav.push('/online-orders/couriers-score');

  const recipes: SetupDefaults['recipes'] = [];
  if (a.codShare !== 'MOST') recipes.push({ key: 'auto_confirm_prepaid', params: {} });
  if (a.codShare !== 'FEW') recipes.push({ key: 'hold_big_cod_new', params: { amount: 5000 } });
  if (a.codShare === 'MOST') recipes.push({ key: 'rto_advance', params: { returns: 2, pct: 30 } });

  const bookable = parcelCouriers.filter((c) => apiCouriers.includes(c));
  return {
    homeTiles: [...new Set(home)],
    hiddenTiles: [...new Set(hiddenTiles)],
    hiddenNav: [...new Set(hiddenNav)],
    pinnedNav,
    recipes,
    courierFallback: bookable.length === 1 ? bookable[0] : null,
    confirmText: a.confirmBy === 'CALL' ? 'Assalam o Alaikum {name}! {shop} se aap ka order #{no} mil gaya ({total}). Hum jald call karke confirm karenge. Shukriya!' : null,
  };
}
