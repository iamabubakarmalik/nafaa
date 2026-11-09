/**
 * Per-business retention settings (online loyalty, referral rewards, review
 * links). One JSON row in system_settings, so no schema change is needed.
 */

import { PrismaService } from '../../../prisma/prisma.service';

export const retentionKey = (tenantId: string) => `online_retention:${tenantId}`;

export interface ReviewLink { label: string; url: string }

export interface RetentionSettings {
  loyalty: {
    /** Online orders earn points on delivery instead of when the bill is made. */
    enabled: boolean;
    /** Points per rupee for online orders; null uses the counter's loyalty rate. */
    pointsPerRupee: number | null;
  };
  referral: {
    enabled: boolean;
    friendDiscountType: 'PERCENT' | 'FIXED';
    friendDiscount: number;
    /** Points the referrer gets when the friend's order is delivered. */
    referrerPoints: number;
    /** Only a friend with no earlier delivered order counts. */
    newOnly: boolean;
  };
  reviews: {
    /** Public review pages (Google, Facebook, Daraz …) shown after a good rating. */
    links: ReviewLink[];
    /** Rating from which the public review links are offered. */
    linksFrom: number;
  };
}

export const DEFAULT_RETENTION: RetentionSettings = {
  loyalty: { enabled: false, pointsPerRupee: null },
  referral: { enabled: false, friendDiscountType: 'PERCENT', friendDiscount: 10, referrerPoints: 100, newOnly: true },
  reviews: { links: [], linksFrom: 4 },
};

const num = (v: unknown, min: number, max: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

export function normalizeRetention(raw: unknown): RetentionSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as any;
  const l = r.loyalty ?? {};
  const f = r.referral ?? {};
  const v = r.reviews ?? {};
  const rate = l.pointsPerRupee === null || l.pointsPerRupee === undefined || l.pointsPerRupee === '' ? null : num(l.pointsPerRupee, 0, 10, 0.01);
  const links: ReviewLink[] = (Array.isArray(v.links) ? v.links : [])
    .map((x: any) => ({ label: String(x?.label ?? '').trim().slice(0, 40), url: String(x?.url ?? '').trim().slice(0, 500) }))
    .filter((x: ReviewLink) => x.label && /^https:\/\/[^\s]+$/i.test(x.url))
    .slice(0, 5);
  return {
    loyalty: { enabled: l.enabled === true, pointsPerRupee: rate },
    referral: {
      enabled: f.enabled === true,
      friendDiscountType: f.friendDiscountType === 'FIXED' ? 'FIXED' : 'PERCENT',
      friendDiscount: num(f.friendDiscount, 0, f.friendDiscountType === 'FIXED' ? 100_000 : 90, DEFAULT_RETENTION.referral.friendDiscount),
      referrerPoints: Math.round(num(f.referrerPoints, 0, 100_000, DEFAULT_RETENTION.referral.referrerPoints)),
      newOnly: f.newOnly !== false,
    },
    reviews: { links, linksFrom: Math.round(num(v.linksFrom, 1, 5, 4)) },
  };
}

export async function readRetention(prisma: PrismaService, tenantId: string): Promise<RetentionSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: retentionKey(tenantId) } });
  let raw: unknown = null;
  try { raw = row?.value ? JSON.parse(row.value) : null; } catch { raw = null; }
  return normalizeRetention(raw);
}

/**
 * True when online bills should earn no points at once: online loyalty is on,
 * so points come on delivery (a returned parcel then never earns any).
 */
export async function deferOnlineLoyalty(prisma: PrismaService, tenantId: string): Promise<boolean> {
  try {
    return (await readRetention(prisma, tenantId)).loyalty.enabled;
  } catch {
    return false;
  }
}
