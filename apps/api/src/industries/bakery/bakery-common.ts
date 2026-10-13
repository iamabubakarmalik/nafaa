/**
 * Shared helpers for the bakery API: business-day ranges in the shop's own
 * timezone, per-year document numbers that survive two saves at once, and
 * branch checks for writes.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey, safeDayStart, startOfBusinessDayTz, tzParts, zonedToUtc } from '../../common/helpers/business-time.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopScope } from '../../common/shop-scope';

export const DAY_MS = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Sale statuses that count as sold goods. */
export const SOLD_STATUSES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

/** Order statuses after which nothing is left to do. */
export const CLOSED_ORDER = ['DELIVERED', 'CANCELLED', 'REFUNDED'] as const;

interface DayRange { gte: Date; lt: Date }

export const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
export const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

/** The shop's clock plus helpers bound to it. */
export async function shopClock(tz: TenantTimezoneService, tenantId: string) {
  const { tz: zone, dayStartHour } = await tz.clock(tenantId);
  const start = safeDayStart(dayStartHour);
  /** Start of the business day named by a `yyyy-mm-dd` key. */
  const dayStart = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return zonedToUtc(y, m, d, start, 0, 0, zone);
  };
  const today = (now = new Date()): DayRange => {
    const gte = startOfBusinessDayTz(now, zone, start);
    return { gte, lt: new Date(gte.getTime() + DAY_MS) };
  };
  /** `yyyy-mm-dd` of the business day a moment falls in. */
  const keyOf = (d: Date) => businessDayKey(d, zone, start);
  /** Business days from `from` to `to` (keys, inclusive); undefined when not given. */
  const range = (from?: string, to?: string): DayRange | undefined => {
    const f = from && KEY.test(from) ? from : undefined;
    const t = to && KEY.test(to) ? to : undefined;
    if (!f && !t) return undefined;
    const gte = f ? dayStart(f) : new Date(0);
    const lt = t ? new Date(dayStart(t).getTime() + DAY_MS) : new Date(Date.now() + 3650 * DAY_MS);
    return { gte, lt };
  };
  const year = () => tzParts(new Date(), zone).year;
  return { zone, startHour: start, dayStart, today, keyOf, range, year };
}

export const isDayKey = (v?: string): v is string => !!v && KEY.test(v);

/**
 * Creates a row with the next free `PREFIX-YEAR-0001` number. Two saves at
 * the same moment both read the same last number; the unique index rejects
 * the second, which then retries with the next number.
 */
export async function withNextNumber<T>(
  last: (prefix: string) => Promise<string | null | undefined>,
  prefix: string,
  pad: number,
  create: (number: string) => Promise<T>,
): Promise<T> {
  const latest = await last(prefix);
  const base = Number(String(latest ?? '').slice(prefix.length)) || 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const number = `${prefix}${String(base + 1 + attempt).padStart(pad, '0')}`;
    try {
      return await create(number);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  }
  throw new BadRequestException('Number nahi bana — dobara koshish karein');
}

/**
 * Branch a new record belongs to: an explicit shop (checked against the
 * tenant), else the branch being viewed, else none (consolidated view).
 */
export async function writeShopId(prisma: PrismaService, tenantId: string, scope: ShopScope, explicit?: string | null): Promise<string | null> {
  if (explicit) {
    const shop = await prisma.shop.findFirst({ where: { id: explicit, tenantId }, select: { id: true } });
    if (!shop) throw new NotFoundException('Branch nahi mili');
    return shop.id;
  }
  return scope.shopId ?? null;
}

/** Positive finite number or a 400 with the given message. */
export function positive(value: unknown, message: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(message);
  return n;
}

interface RecipeLine { ingredientId: string; name: string; qty: number; unit: string; costPerUnit: number }
interface Recipe { yieldQty: number; lines: RecipeLine[] }

/**
 * Reads the recipe saved on a bakery product profile (`ingredients` JSON:
 * `{ yield, lines: [{ ingredientId, name, qty, unit, costPerUnit }] }`).
 * Null when the product has no recipe.
 */
export function recipeOf(json: unknown): Recipe | null {
  const raw = json as { yield?: unknown; lines?: unknown } | null;
  const lines = Array.isArray(raw?.lines) ? (raw!.lines as Array<Record<string, unknown>>) : [];
  const clean = lines
    .filter((l) => typeof l?.ingredientId === 'string' && Number(l.qty) > 0)
    .map((l) => ({ ingredientId: String(l.ingredientId), name: String(l.name ?? ''), qty: Number(l.qty), unit: String(l.unit ?? ''), costPerUnit: Number(l.costPerUnit) || 0 }));
  if (!clean.length) return null;
  return { yieldQty: Number(raw?.yield) > 0 ? Number(raw!.yield) : 1, lines: clean };
}
