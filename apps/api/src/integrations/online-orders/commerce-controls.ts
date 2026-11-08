/**
 * Platform-wide commerce controls set by the super admin (Admin > Online
 * store > Controls). Stored as one JSON row in system_settings so no schema
 * change is needed. Merchant-side code reads it through `commerceControls()`,
 * which caches the row for a short time so push paths add no real load.
 */

import { PrismaService } from '../../prisma/prisma.service';
import { JobKind } from './catalog-jobs';

export const COMMERCE_CONTROLS_KEY = 'commerce.controls';

/** Channel types the kill switch can pause. */
export const KILL_SWITCH_TYPES = ['SHOPIFY', 'DARAZ', 'WOOCOMMERCE', 'CUSTOM_WEBSITE', 'FOODPANDA', 'MANUAL'] as const;
export type KillSwitchType = (typeof KILL_SWITCH_TYPES)[number];

/** Merchant commerce modules that can show a "Coming soon" tile. */
export const COMMERCE_MODULES = [
  'orders', 'catalog', 'dispatch', 'couriers', 'cod', 'returns', 'abandoned_carts', 'growth', 'whatsapp', 'storefront', 'payment_links',
] as const;
export type CommerceModule = (typeof COMMERCE_MODULES)[number];

export interface CommerceControls {
  /** Channel type → pushes (stock, price, content) paused platform-wide. */
  killSwitch: Partial<Record<KillSwitchType, boolean>>;
  /** Short reason shown in logs and to the admin. */
  killSwitchNote: string | null;
  /** Defaults applied to new shops/channels (stored; merchant side adopts them on creation). */
  newShopDefaults: {
    autoLink: boolean;
    postOrderCosts: boolean;
    stockMode: 'all' | 'percent' | 'fixed';
  };
  /** Catalog job limits; null keeps the built-in value. */
  catalogJobs: {
    chunkSize: Partial<Record<JobKind, number>>;
    delayMs: number | null;
  };
  /** Default WhatsApp message templates by key (order confirm, dispatch, delivery …). */
  whatsappTemplates: Array<{ key: string; label: string; text: string }>;
  /** Default custom order stages offered to shops with none of their own. */
  customStatuses: Array<{ key: string; label: string; color: string }>;
  /** Module → true shows the "Coming soon" tile instead of the module. */
  comingSoon: Partial<Record<CommerceModule, boolean>>;
}

export const DEFAULT_COMMERCE_CONTROLS: CommerceControls = {
  killSwitch: {},
  killSwitchNote: null,
  newShopDefaults: { autoLink: true, postOrderCosts: false, stockMode: 'all' },
  catalogJobs: { chunkSize: {}, delayMs: null },
  whatsappTemplates: [],
  customStatuses: [],
  comingSoon: {},
};

const clampInt = (v: unknown, min: number, max: number): number | null => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min ? Math.min(max, n) : null;
};
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Cleans any stored or posted value into a full, safe controls object. */
export function parseCommerceControls(raw: unknown): CommerceControls {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const d = DEFAULT_COMMERCE_CONTROLS;
  const killSwitch: CommerceControls['killSwitch'] = {};
  for (const t of KILL_SWITCH_TYPES) if (r.killSwitch?.[t] === true) killSwitch[t] = true;
  const comingSoon: CommerceControls['comingSoon'] = {};
  for (const m of COMMERCE_MODULES) if (r.comingSoon?.[m] === true) comingSoon[m] = true;
  const chunkSize: CommerceControls['catalogJobs']['chunkSize'] = {};
  for (const k of ['IMPORT_ALL', 'LINK_ALL', 'PUSH', 'PUBLISH'] as JobKind[]) {
    const n = clampInt(r.catalogJobs?.chunkSize?.[k], 1, 500);
    if (n !== null) chunkSize[k] = n;
  }
  const nd = r.newShopDefaults ?? {};
  return {
    killSwitch,
    killSwitchNote: str(r.killSwitchNote, 300) || null,
    newShopDefaults: {
      autoLink: typeof nd.autoLink === 'boolean' ? nd.autoLink : d.newShopDefaults.autoLink,
      postOrderCosts: typeof nd.postOrderCosts === 'boolean' ? nd.postOrderCosts : d.newShopDefaults.postOrderCosts,
      stockMode: ['all', 'percent', 'fixed'].includes(nd.stockMode) ? nd.stockMode : d.newShopDefaults.stockMode,
    },
    catalogJobs: { chunkSize, delayMs: clampInt(r.catalogJobs?.delayMs, 100, 60_000) },
    whatsappTemplates: (Array.isArray(r.whatsappTemplates) ? r.whatsappTemplates : [])
      .map((t: any) => ({ key: str(t?.key, 40), label: str(t?.label, 80), text: str(t?.text, 2000) }))
      .filter((t: { key: string; text: string }) => t.key && t.text)
      .slice(0, 30),
    customStatuses: (Array.isArray(r.customStatuses) ? r.customStatuses : [])
      .map((s: any) => ({ key: str(s?.key, 30).toLowerCase().replace(/[^a-z0-9_-]/g, '_'), label: str(s?.label, 40), color: str(s?.color, 20) || 'slate' }))
      .filter((s: { key: string; label: string }) => s.key && s.label)
      .slice(0, 20),
    comingSoon,
  };
}

const CACHE_MS = 30_000;
let cache: { at: number; value: CommerceControls } | null = null;

/** Current controls, cached for 30 seconds. Never throws: a read error gives the defaults. */
export async function commerceControls(prisma: PrismaService): Promise<CommerceControls> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  let parsed: unknown = null;
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: COMMERCE_CONTROLS_KEY } });
    parsed = row ? JSON.parse(row.value) : null;
  } catch {
    parsed = null;
  }
  const value = parseCommerceControls(parsed);
  cache = { at: Date.now(), value };
  return value;
}

/** Drops the cache in this process (after the admin saves). Other processes catch up within 30 seconds. */
export function clearCommerceControlsCache() {
  cache = null;
}

/** True when the super admin paused pushes for this channel type. */
export async function pushPaused(prisma: PrismaService, type: string): Promise<boolean> {
  const c = await commerceControls(prisma);
  return c.killSwitch[type as KillSwitchType] === true;
}

/** Merchant-facing note when a push is refused by the kill switch (Roman Urdu, like the rest of the merchant API). */
export const pausedMessage = (type: string) =>
  `${type === 'WOOCOMMERCE' ? 'WooCommerce' : type === 'SHOPIFY' ? 'Shopify' : type === 'DARAZ' ? 'Daraz' : type} par bhejna Nafaa ne thori der ke liye rok rakha hai — baad me khud chal jayega`;
