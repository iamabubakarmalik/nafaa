/**
 * Small helpers shared by the shoe services: rounding, the sale statuses
 * that count as sold, list paging and core brand slugs.
 */

import { Prisma } from '@prisma/client';

export const DAY_MS = 86_400_000;
export const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Bills whose lines count as sold (returns are taken off per line). */
export const SOLD = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

export const opt = (v?: string | null) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export function paging(q: { page?: string | number; limit?: string | number }, max = 100) {
  const limit = Math.min(Math.max(Number(q.limit) || 30, 1), max);
  const page = Math.max(Number(q.page) || 1, 1);
  return { page, limit, skip: (page - 1) * limit };
}

/** Size order on screen: numbers first (6, 6.5, 7…), then text (S, M, L). */
export function sizeSort(a: string, b: string) {
  const na = parseFloat(a.replace(/[^\d.]/g, ''));
  const nb = parseFloat(b.replace(/[^\d.]/g, ''));
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  if (Number.isFinite(na) !== Number.isFinite(nb)) return Number.isFinite(na) ? -1 : 1;
  return a.localeCompare(b);
}

/**
 * Size and colour of a variant: the saved fields, else read from a name
 * such as "EU 42 / Black" or "UK 8".
 */
export function variantParts(v: { name: string; size?: string | null; color?: string | null }) {
  const [a, b] = v.name.split('/').map((s) => s.trim());
  const size = v.size?.trim() || a.replace(/^(UK|US|EU|PK|CM|KIDS)\s+/i, '').replace(/\s+(NARROW|WIDE|EXTRA_WIDE)$/i, '') || null;
  return { size, color: v.color?.trim() || b || null };
}

/** A core brand slug no other brand of this shop uses ("bata", "bata-2"…). */
export async function freeBrandSlug(db: Prisma.TransactionClient, tenantId: string, name: string) {
  const base = name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'brand';
  const used = new Set((await db.brand.findMany({ where: { tenantId, slug: { startsWith: base } }, select: { slug: true } })).map((b) => b.slug));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
