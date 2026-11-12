/**
 * Platform-wide controls for Nafaa Stores, set in the admin panel and kept in
 * systemSetting `stores_platform_controls`: theme switches, policy templates,
 * allowed payments, limits, blocked words/domains, the checkout kill switch
 * and the maintenance banner. Read through a 30-second cache.
 */
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeHtml } from './lib/sanitize-html';
import { POLICY_KINDS, PolicyKind } from './store-settings';
import { THEME_IDS, ThemeId } from './theme/theme-doc';

export const CONTROLS_KEY = 'stores_platform_controls';

export interface StoreControls {
  themes: Record<ThemeId, { enabled: boolean; featured: boolean }>;
  policyTemplates: Partial<Record<PolicyKind, { title: string; bodyHtml: string }>>;
  payments: { COD: boolean; SAFEPAY: boolean; JAZZCASH: boolean; EASYPAISA: boolean };
  maxCustomDomains: number;
  maxStoresPerShop: number;
  blockedKeywords: string[];
  blockedDomains: string[];
  checkout: { paused: boolean; message: string | null };
  banner: { enabled: boolean; message: string | null; tone: 'info' | 'warning' };
}

const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {});
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};
const words = (v: unknown, max: number) =>
  [...new Set((Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\n,]/) : []).map((x) => String(x).trim().toLowerCase()).filter((x) => x.length >= 2 && x.length <= 80))].slice(0, max);

export function readControls(raw: unknown): StoreControls {
  const r = obj(raw);
  const t = obj(r.themes);
  const p = obj(r.payments);
  const pt = obj(r.policyTemplates);
  const c = obj(r.checkout);
  const b = obj(r.banner);
  const themes = {} as StoreControls['themes'];
  for (const id of THEME_IDS) themes[id] = { enabled: bool(obj(t[id]).enabled, true), featured: bool(obj(t[id]).featured, false) };
  const policyTemplates: StoreControls['policyTemplates'] = {};
  for (const k of POLICY_KINDS) {
    const x = obj(pt[k]);
    const body = text(x.bodyHtml, 50_000);
    if (body) policyTemplates[k] = { title: text(x.title, 120) ?? k, bodyHtml: sanitizeHtml(body, 50_000) };
  }
  return {
    themes,
    policyTemplates,
    payments: { COD: bool(p.COD, true), SAFEPAY: bool(p.SAFEPAY, true), JAZZCASH: bool(p.JAZZCASH, true), EASYPAISA: bool(p.EASYPAISA, true) },
    maxCustomDomains: int(r.maxCustomDomains, 0, 20, 2),
    maxStoresPerShop: int(r.maxStoresPerShop, 1, 20, 3),
    blockedKeywords: words(r.blockedKeywords, 500),
    blockedDomains: words(r.blockedDomains, 2000).map((d) => d.replace(/^https?:\/\//, '').replace(/\/.*$/, '')),
    checkout: { paused: bool(c.paused, false), message: text(c.message, 300) },
    banner: { enabled: bool(b.enabled, false), message: text(b.message, 300), tone: b.tone === 'warning' ? 'warning' : 'info' },
  };
}

/** Merge of a partial admin update (one level deep), then cleaned. */
export function mergeControls(current: StoreControls, patch: unknown): StoreControls {
  const p = obj(patch);
  const out: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(p)) {
    if (k === 'themes' && v && typeof v === 'object') {
      const themes: Record<string, unknown> = { ...current.themes };
      for (const [id, val] of Object.entries(v as object)) themes[id] = { ...obj(themes[id]), ...obj(val) };
      out.themes = themes;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = { ...obj((current as any)[k]), ...v };
    else out[k] = v;
  }
  return readControls(out);
}

let cache: { at: number; value: StoreControls } | null = null;

export async function loadControls(prisma: PrismaService, fresh = false): Promise<StoreControls> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.value;
  const row = await prisma.systemSetting.findUnique({ where: { key: CONTROLS_KEY } }).catch(() => null);
  let raw: unknown = {};
  try { raw = row?.value ? JSON.parse(row.value) : {}; } catch { raw = {}; }
  const value = readControls(raw);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveControls(prisma: PrismaService, value: StoreControls) {
  await prisma.systemSetting.upsert({
    where: { key: CONTROLS_KEY },
    create: { key: CONTROLS_KEY, value: JSON.stringify(value), category: 'stores', isPublic: false },
    update: { value: JSON.stringify(value) },
  });
  cache = { at: Date.now(), value };
}

/** A blocked keyword found in the text, or null. */
export const blockedWord = (c: StoreControls, ...texts: string[]) => {
  const hay = texts.join(' ').toLowerCase();
  return c.blockedKeywords.find((w) => hay.includes(w)) ?? null;
};

export const blockedDomain = (c: StoreControls, host: string) => c.blockedDomains.some((d) => host === d || host.endsWith(`.${d}`));
