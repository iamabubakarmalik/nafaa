import { Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { WebsiteConfig } from './website-config';

/**
 * Writes for the channel price source: taking a channel price into Nafaa, the
 * per-link price record, and the price history. The decision itself is in
 * channel-price.ts (`priceDecision`).
 */

export type PriceLogKind = 'PULL' | 'PUSH' | 'HOLD' | 'KEEP_NAFAA' | 'KEEP_CHANNEL' | 'RECOVER_CHANNEL' | 'RECOVER_NAFAA';
export type PullTarget = 'PRODUCT' | 'VARIANT' | 'SHOP' | 'CHANNEL';

export interface PriceLink {
  id: string;
  productId: string;
  variantId: string | null;
  priceOverride: number | null;
  product: { price: number; hasVariants?: boolean };
  variant: { price: number } | null;
}

/**
 * Where a channel price lands in Nafaa:
 *  - the link's own price when the channel has a price rule, already uses a
 *    link price, or the merchant picked "sirf is channel ki price";
 *  - else the branch price where the channel's branch has one;
 *  - else the size price, or the product price.
 */
/** A rule that changes the price (FIXED 0 without rounding changes nothing). */
export const hasPriceRule = (rule: WebsiteConfig['priceRule']) => rule.mode !== 'NONE' && (rule.value !== 0 || rule.rounding !== 'NONE');

export function pullTarget(cfg: Pick<WebsiteConfig, 'priceRule' | 'websitePriceTo'>, link: Pick<PriceLink, 'variantId' | 'priceOverride'>, hasBranchPrice: boolean): PullTarget {
  if (hasPriceRule(cfg.priceRule) || cfg.websitePriceTo === 'CHANNEL' || (link.priceOverride !== null && link.priceOverride > 0)) return 'CHANNEL';
  if (hasBranchPrice) return 'SHOP';
  return link.variantId ? 'VARIANT' : 'PRODUCT';
}

/** A link made without a size on a product with sizes has no single price to set. */
export const canPull = (link: Pick<PriceLink, 'variantId' | 'product'>) => !(link.product.hasVariants && !link.variantId);

/** Sets `price` in Nafaa for one link. Returns what changed, or null when nothing could be set. */
export async function pullPrice(
  prisma: PrismaService,
  ch: Integration,
  cfg: Pick<WebsiteConfig, 'priceRule' | 'websitePriceTo'>,
  shopId: string | null,
  link: PriceLink,
  price: number,
  branchPrice: number | null,
): Promise<{ target: PullTarget; oldPrice: number | null } | null> {
  if (!(price > 0) || !canPull(link)) return null;
  const value = Math.round(price * 100) / 100;
  const target = pullTarget(cfg, link, branchPrice !== null && !!shopId);
  switch (target) {
    case 'CHANNEL':
      await prisma.productChannelMapping.update({ where: { id: link.id }, data: { priceOverride: value } });
      return { target, oldPrice: link.priceOverride };
    case 'SHOP':
      await prisma.shopStock.updateMany({ where: { shopId: shopId!, productId: link.productId, variantId: link.variantId }, data: { shopPrice: value } });
      return { target, oldPrice: branchPrice };
    case 'VARIANT':
      await prisma.productVariant.update({ where: { id: link.variantId! }, data: { price: value } });
      return { target, oldPrice: link.variant?.price ?? null };
    default: {
      const res = await prisma.product.updateMany({ where: { id: link.productId, tenantId: ch.tenantId }, data: { price: value } });
      return res.count ? { target, oldPrice: link.product.price } : null;
    }
  }
}

export type SyncField = 'price' | 'title' | 'description' | 'images' | 'stock' | 'product';
export type SyncLogKind = PriceLogKind | 'HAND_EDIT' | 'IMPORT' | 'PUBLISH';

export interface SyncLogRow {
  tenantId: string; integrationId: string; mappingId?: string | null; productId: string; variantId?: string | null;
  field: SyncField; direction: 'IN' | 'OUT' | 'NONE'; kind: SyncLogKind; target?: string | null;
  oldValue?: string | number | null; newValue?: string | number | null; note?: string | null; userId?: string | null;
}

const text = (v: string | number | null | undefined) => (v === null || v === undefined ? null : String(v).slice(0, 500));

/** Per-product sync history rows. History is a display aid: a failed write never fails the sync. */
export async function logSync(prisma: PrismaService, rows: SyncLogRow[]) {
  if (!rows.length) return;
  try {
    for (let k = 0; k < rows.length; k += 1000) {
      await prisma.channelSyncLog.createMany({
        data: rows.slice(k, k + 1000).map((r) => ({
          tenantId: r.tenantId, integrationId: r.integrationId, mappingId: r.mappingId ?? null, productId: r.productId, variantId: r.variantId ?? null,
          field: r.field, direction: r.direction, kind: r.kind, target: r.target ?? null,
          oldValue: text(r.oldValue), newValue: text(r.newValue), note: r.note?.slice(0, 300) ?? null, userId: r.userId ?? null,
        })),
      });
    }
  } catch {
    // History table missing (migration not applied yet) or a write error: the sync itself stands.
  }
}

/** Price rows of the sync history. */
export async function logPrice(prisma: PrismaService, rows: Array<{
  tenantId: string; integrationId: string; mappingId?: string | null; productId: string; variantId?: string | null;
  kind: PriceLogKind; target?: PullTarget | null; oldPrice?: number | null; newPrice?: number | null; channelPrice?: number | null; note?: string | null; userId?: string | null;
}>) {
  const inbound: PriceLogKind[] = ['PULL', 'KEEP_CHANNEL', 'RECOVER_CHANNEL'];
  await logSync(prisma, rows.map((r) => ({
    tenantId: r.tenantId, integrationId: r.integrationId, mappingId: r.mappingId, productId: r.productId, variantId: r.variantId,
    field: 'price', direction: inbound.includes(r.kind) ? 'IN' : r.kind === 'HOLD' ? 'NONE' : 'OUT', kind: r.kind, target: r.target,
    oldValue: r.oldPrice ?? null, newValue: r.newPrice ?? null, note: r.note, userId: r.userId,
  })));
}

/** One channel activity row for a batch of price work (shown under the channel's Activity). */
export async function logPriceBatch(prisma: PrismaService, ch: Integration, operation: 'PRICE_PULL' | 'PRICE_HOLD' | 'PRICE_RESOLVE' | 'PRICE_RECOVERY' | 'CONTENT_PULL' | 'CONTENT_PUSH' | 'STOCK_HAND_EDIT' | 'AUTO_PUBLISH', count: number, details: Record<string, unknown>) {
  if (!count) return;
  await prisma.syncLog.create({
    data: {
      integrationId: ch.id, tenantId: ch.tenantId, operation, direction: ['PRICE_PULL', 'CONTENT_PULL', 'STOCK_HAND_EDIT'].includes(operation) ? 'INBOUND' : 'OUTBOUND', status: 'SUCCESS',
      recordsSuccess: count, recordsFailed: 0, details: details as Prisma.InputJsonValue, completedAt: new Date(),
    },
  }).catch(() => null);
}
