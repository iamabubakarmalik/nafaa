import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockHold } from './stock-handover';

/**
 * Database side of the stock handover: links put on hold by the push guard,
 * what the channel counts, and the channel stock each push replaced (kept on
 * the link so a wrong push can be undone).
 */

export interface GuardHold { id: string; channelStock: number | null; nafaaStock: number }

/** Puts links on hold after the push guard stopped them; logs it once per run. */
export async function holdLinks(prisma: PrismaService, integration: { id: string; tenantId: string }, holds: GuardHold[]) {
  if (!holds.length) return;
  const since = new Date().toISOString();
  for (const h of holds) {
    const hold: StockHold = { since, channelStock: h.channelStock, nafaaStock: h.nafaaStock, reason: 'guard' };
    await prisma.productChannelMapping.updateMany({
      where: { id: h.id, integrationId: integration.id, stockHold: { equals: Prisma.DbNull } },
      data: { stockHold: hold as any },
    }).catch(() => null);
  }
  await prisma.syncLog.create({
    data: {
      integrationId: integration.id, tenantId: integration.tenantId, operation: 'STOCK_HOLD', direction: 'OUTBOUND', status: 'SUCCESS',
      recordsProcessed: holds.length, recordsSuccess: holds.length,
      details: { held: holds.slice(0, 300) } as any, completedAt: new Date(),
    },
  }).catch(() => null);
}

/** Records whether the channel counts stock for these links. */
export async function markTracking(prisma: PrismaService, integrationId: string, ids: string[], tracks: boolean) {
  for (let k = 0; k < ids.length; k += 1000) {
    await prisma.productChannelMapping.updateMany({ where: { integrationId, id: { in: ids.slice(k, k + 1000) } }, data: { tracksStock: tracks } }).catch(() => null);
  }
}

export interface StockPushRecord { id: string; from: number | null; to: number }

/**
 * Keeps, on each link, the channel stock a push replaced: `stockPush` is the
 * latest, `firstStockPush` is never overwritten (the stock before Nafaa's
 * first push), and the channel stock seen becomes what was sent. One
 * statement per 500 links.
 */
export async function recordStockPushes(prisma: PrismaService, rows: StockPushRecord[]) {
  const at = new Date().toISOString();
  for (let k = 0; k < rows.length; k += 500) {
    const chunk = rows.slice(k, k + 500).map((r) => ({ id: r.id, p: { at, from: r.from, to: r.to } }));
    if (!chunk.length) continue;
    await prisma.$executeRawUnsafe(
      `UPDATE "product_channel_mappings" m
         SET "externalData" = COALESCE(m."externalData", '{}'::jsonb)
           || jsonb_build_object('stockPush', v.p, 'channelStock', v.p->'to', 'channelStockAt', v.p->'at')
           || CASE WHEN COALESCE(m."externalData", '{}'::jsonb) ? 'firstStockPush' THEN '{}'::jsonb ELSE jsonb_build_object('firstStockPush', v.p) END
        FROM jsonb_to_recordset($1::jsonb) AS v(id text, p jsonb)
       WHERE m.id = v.id`,
      JSON.stringify(chunk),
    ).catch(() => null);
  }
}
