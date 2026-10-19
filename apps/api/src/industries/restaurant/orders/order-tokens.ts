import { Prisma, RestaurantOrderStatus } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import { startOfBusinessDayTz } from '../../../common/helpers/business-time.helper';
import type { BusinessClock } from '../../../common/helpers/tenant-timezone.service';

/** Orders still on the floor or in the kitchen (a delivered order waits for the rider's cash). */
export const OPEN_ORDER: RestaurantOrderStatus[] = ['DRAFT', 'PLACED', 'CONFIRMED', 'COOKING', 'READY', 'SERVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ON_HOLD'];

const DAY_MS = 24 * 3600_000;

/**
 * Adds the token number: the order's place in its branch's business day
 * (1, 2, 3 …), called out at the counter for takeaway. A split bill carries
 * the token of the bill it was split from.
 */
export async function withTokens<T extends { id: string; createdAt: Date; parentOrderId?: string | null }>(
  prisma: PrismaService, tenantId: string, clock: BusinessClock, rows: T[],
): Promise<Array<T & { token: number | null }>> {
  if (!rows.length) return [];
  const parentIds = [...new Set(rows.map((r) => r.parentOrderId).filter((x): x is string => !!x))];
  const parents = parentIds.length
    ? await prisma.restaurantOrder.findMany({ where: { id: { in: parentIds }, tenantId }, select: { id: true, createdAt: true } })
    : [];
  const roots = new Map<string, Date>();
  for (const r of rows) if (!r.parentOrderId) roots.set(r.id, r.createdAt);
  for (const p of parents) roots.set(p.id, p.createdAt);
  if (!roots.size) return rows.map((r) => ({ ...r, token: null }));

  const starts = [...roots.values()].map((d) => startOfBusinessDayTz(d, clock.tz, clock.dayStartHour).getTime());
  const from = new Date(Math.min(...starts));
  const to = new Date(Math.max(...starts) + DAY_MS);
  const found = await prisma.$queryRaw<Array<{ id: string; token: number }>>`
    SELECT t.id, t.token FROM (
      SELECT o.id, ROW_NUMBER() OVER (
        PARTITION BY o."shopId", (((o."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${clock.tz}) - make_interval(hours => ${clock.dayStartHour}::int))::date
        ORDER BY o."createdAt", o.id
      )::int AS token
      FROM "RestaurantOrder" o
      WHERE o."tenantId" = ${tenantId} AND o."parentOrderId" IS NULL AND o."createdAt" >= ${from} AND o."createdAt" < ${to}
    ) t
    WHERE t.id IN (${Prisma.join([...roots.keys()])})`;
  const tokenOf = new Map(found.map((f) => [f.id, Number(f.token)]));
  return rows.map((r) => ({ ...r, token: tokenOf.get(r.parentOrderId ?? r.id) ?? null }));
}
