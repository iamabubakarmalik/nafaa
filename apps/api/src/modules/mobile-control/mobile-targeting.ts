/**
 * Pure rules shared by announcements, push broadcasts and update prompts:
 * version comparison, audience targeting and localized text.
 */

export const MOBILE_PLATFORMS = ['ios', 'android'] as const;
export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

export const MOBILE_LANGUAGES = ['en', 'ur', 'roman'] as const;
export type MobileLanguage = (typeof MOBILE_LANGUAGES)[number];

export const AUDIENCES = ['all', 'plan', 'industry', 'tenant'] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Text in the three app languages. English is required; the others fall back to it. */
export interface LocalizedText {
  en: string;
  ur?: string;
  roman?: string;
}

export interface MobileTarget {
  audience: Audience;
  planSlugs: string[];
  industries: string[];
  tenantIds: string[];
  /** Empty: every platform. */
  platforms: string[];
  minVersion: string | null;
  maxVersion: string | null;
}

/** Who is looking: anything unknown (signed out) only matches "all". */
export interface ViewerContext {
  platform?: string | null;
  version?: string | null;
  tenantId?: string | null;
  planSlug?: string | null;
  industry?: string | null;
}

const VERSION_RE = /^\d+(\.\d+){0,3}$/;

export function isValidVersion(v: unknown): v is string {
  return typeof v === 'string' && VERSION_RE.test(v.trim());
}

/**
 * Compares dotted numeric versions ("2.0.10" > "2.0.9"). Missing parts count
 * as 0 and anything after "-" or "+" is ignored. Unparseable input sorts as 0.0.0.
 */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): number {
  const parts = (v: string | null | undefined) =>
    String(v ?? '')
      .trim()
      .split(/[-+]/)[0]
      .split('.')
      .map((p) => {
        const n = parseInt(p, 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
      });
  const x = parts(a);
  const y = parts(b);
  const len = Math.max(x.length, y.length, 3);
  for (let i = 0; i < len; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** True when `version` sits inside [min, max]; open ends allow anything. */
export function versionInRange(version: string | null | undefined, min?: string | null, max?: string | null): boolean {
  if (!min && !max) return true;
  if (!version) return false;
  if (min && compareVersions(version, min) < 0) return false;
  if (max && compareVersions(version, max) > 0) return false;
  return true;
}

export function matchesTarget(target: MobileTarget, ctx: ViewerContext): boolean {
  if (target.platforms.length) {
    if (!ctx.platform || !target.platforms.includes(ctx.platform)) return false;
  }
  if (!versionInRange(ctx.version, target.minVersion, target.maxVersion)) return false;
  switch (target.audience) {
    case 'all':
      return true;
    case 'plan':
      return !!ctx.planSlug && target.planSlugs.includes(ctx.planSlug);
    case 'industry':
      return !!ctx.industry && target.industries.map((i) => i.toUpperCase()).includes(ctx.industry.toUpperCase());
    case 'tenant':
      return !!ctx.tenantId && target.tenantIds.includes(ctx.tenantId);
    default:
      return false;
  }
}

/** A schedule is live when now is inside [startsAt, endsAt); missing ends are open. */
export function isLive(startsAt: Date | null | undefined, endsAt: Date | null | undefined, now = new Date()): boolean {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now >= endsAt) return false;
  return true;
}

export function pickText(text: LocalizedText | null | undefined, lang: string | null | undefined): string {
  if (!text) return '';
  const key = (MOBILE_LANGUAGES as readonly string[]).includes(lang ?? '') ? (lang as MobileLanguage) : 'en';
  return (text[key] ?? '').trim() || text.en || '';
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Keeps en/ur/roman strings only, trimmed and clipped. Returns null when English is empty. */
export function sanitizeText(input: unknown, max = 500): LocalizedText | null {
  if (typeof input === 'string') return input.trim() ? { en: clip(input, max) } : null;
  if (!input || typeof input !== 'object') return null;
  const src = input as Record<string, unknown>;
  const en = clip(src.en, max);
  if (!en) return null;
  const out: LocalizedText = { en };
  const ur = clip(src.ur, max);
  const roman = clip(src.roman, max);
  if (ur) out.ur = ur;
  if (roman) out.roman = roman;
  return out;
}

const strList = (v: unknown, max = 200) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim()))].slice(0, max) : [];

/** Normalizes targeting input from the admin panel. */
export function sanitizeTarget(input: unknown): MobileTarget {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const audience = (AUDIENCES as readonly unknown[]).includes(src.audience) ? (src.audience as Audience) : 'all';
  return {
    audience,
    planSlugs: audience === 'plan' ? strList(src.planSlugs) : [],
    industries: audience === 'industry' ? strList(src.industries).map((i) => i.toUpperCase()) : [],
    tenantIds: audience === 'tenant' ? strList(src.tenantIds, 500) : [],
    platforms: strList(src.platforms).filter((p) => (MOBILE_PLATFORMS as readonly string[]).includes(p)),
    minVersion: isValidVersion(src.minVersion) ? src.minVersion.trim() : null,
    maxVersion: isValidVersion(src.maxVersion) ? src.maxVersion.trim() : null,
  };
}
