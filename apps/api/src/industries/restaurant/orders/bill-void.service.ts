/**
 * A restaurant bill voided after the kitchen made its dishes.
 *
 * The shared void puts every line back on the shelf. A cooked dish has no
 * shelf stock: its ingredients left the store when it was cooked, and the
 * plates were added only so the sale could take them. So for each kitchen
 * dish on a voided bill the plates the void put back are taken out again as
 * kitchen waste (DAMAGE), with a stock adjustment at the plate cost of the
 * bill, so the food that was made shows in write-offs instead of vanishing.
 * Nothing is deleted; every change is a new movement or adjustment.
 *
 * The order keeps its status (its bill shows as voided). An activity log
 * row marks it as handled. The shared void calls in right after it commits;
 * a one-minute sweep catches any bill that call missed.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { applyStockDelta } from '../../../common/shop-scope';
import { OPEN_KOT } from '../kot/kot.service';
import { round2 } from '../recipes/recipe-units';
import { SalesService } from '../../../modules/sales/sales/sales.service';

/** Same prefix the order flow uses for plates the kitchen made. */
const KITCHEN_REF = 'Kitchen:';
/** Only voids this recent are picked up, so older bills are never touched again. */
const SWEEP_WINDOW_MS = 6 * 3600_000;
const DONE_ACTION = 'RESTAURANT_BILL_VOID_WASTE';

type Plate = { productId: string; variantId: string | null; qty: number; cost: number };

@Injectable()
export class BillVoidService implements OnModuleInit {
  private readonly log = new Logger(BillVoidService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  /** Settle right after the void commits; the sweep stays as a backup. */
  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handleSale(tenantId, saleId));
  }

  @Cron('40 * * * * *')
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      const since = new Date(Date.now() - SWEEP_WINDOW_MS);
      const rows = await this.prisma.$queryRaw<Array<{ tenantId: string; orderId: string }>>`
        SELECT o."tenantId", o.id AS "orderId"
        FROM "RestaurantOrder" o
        JOIN "Sale" s ON s.id = o."saleId" AND s."tenantId" = o."tenantId"
        WHERE s.status::text = 'VOIDED' AND s."updatedAt" >= ${since}
          AND NOT EXISTS (
            SELECT 1 FROM "ActivityLog" a
            WHERE a."tenantId" = o."tenantId" AND a.action = ${DONE_ACTION} AND a."entityId" = o.id
          )
        ORDER BY s."updatedAt" ASC
        LIMIT 50`;
      for (const r of rows) {
        try {
          await this.handleOrder(r.tenantId, r.orderId);
        } catch (e) {
          this.log.warn(`Voided bill of order ${r.orderId} not settled: ${(e as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Handles the order behind a voided bill, if there is one. */
  async handleSale(tenantId: string, saleId: string) {
    const o = await this.prisma.restaurantOrder.findFirst({ where: { tenantId, saleId }, select: { id: true } });
    return o ? this.handleOrder(tenantId, o.id) : null;
  }

  async handleOrder(tenantId: string, orderId: string) {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true, orderNumber: true, saleId: true },
    });
    if (!order?.saleId) return null;
    const sale = await this.prisma.sale.findFirst({
      where: { id: order.saleId, tenantId },
      select: {
        id: true, saleNumber: true, status: true, shopId: true,
        items: { select: { productId: true, quantity: true, costPrice: true, variantLink: { select: { variantId: true } } } },
      },
    });
    if (!sale || sale.status !== 'VOIDED' || !sale.shopId) return null;
    const shopId = sale.shopId;

    const voided = await this.prisma.activityLog.findFirst({
      where: { tenantId, action: 'SALE_VOIDED', entityType: 'Sale', entityId: sale.id },
      orderBy: { createdAt: 'desc' },
      select: { userId: true },
    });
    const userId = voided?.userId ?? null;
    const plates = await this.kitchenPlates(tenantId, order.orderNumber, sale);
    const value = round2(plates.reduce((s, p) => s + p.qty * round2(p.cost), 0));
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // One writer per order; the log row written below marks it as done.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`restaurant-void:${order.id}`}))::text`;
      const done = await tx.activityLog.findFirst({ where: { tenantId, action: DONE_ACTION, entityId: order.id }, select: { id: true } });
      if (done) return null;

      for (const p of plates) {
        const unitCost = round2(p.cost);
        await applyStockDelta({
          tx, tenantId, shopId, productId: p.productId, variantId: p.variantId,
          delta: -p.qty, movementType: 'DAMAGE',
          reference: `${KITCHEN_REF} ${order.orderNumber}`,
          note: `Bill ${sale.saleNumber} void — khana ban chuka tha`,
          userId, unitCost,
        });
        await tx.stockAdjustment.create({
          data: {
            tenantId, shopId, productId: p.productId, variantId: p.variantId, createdById: userId,
            type: 'DAMAGE', quantity: p.qty, reason: 'Kitchen waste — bill void',
            note: `${order.orderNumber} · bill ${sale.saleNumber}`, unitCost, value: round2(p.qty * unitCost),
            groupRef: `${KITCHEN_REF} ${order.orderNumber}`,
          },
        });
      }

      // The kitchen stops work on it and a rider still out is released.
      await tx.kot.updateMany({ where: { orderId: order.id, status: { in: OPEN_KOT } }, data: { status: 'CANCELLED', cancelledAt: now } });
      const trip = await tx.deliveryTracking.findUnique({ where: { orderId: order.id } });
      if (trip && !['DELIVERED', 'FAILED', 'RETURNED'].includes(trip.status)) {
        await tx.deliveryTracking.update({ where: { orderId: order.id }, data: { status: 'FAILED', failureReason: 'Bill void' } });
        if (trip.riderId) {
          const busy = await tx.deliveryTracking.count({ where: { riderId: trip.riderId, status: { in: ['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'ARRIVED'] } } });
          if (!busy) await tx.rider.updateMany({ where: { id: trip.riderId, status: 'BUSY' }, data: { status: 'ACTIVE' } });
        }
      }

      await tx.activityLog.create({
        data: {
          tenantId, userId, action: DONE_ACTION, entityType: 'RestaurantOrder', entityId: order.id,
          description: plates.length
            ? `${order.orderNumber}: bill ${sale.saleNumber} void — ${round2(plates.reduce((s, p) => s + p.qty, 0))} plate kitchen waste (Rs ${value})`
            : `${order.orderNumber}: bill ${sale.saleNumber} void — kitchen ka koi khana nahi`,
          metadata: { saleId: sale.id, plates: plates.map((p) => ({ productId: p.productId, variantId: p.variantId, qty: p.qty, unitCost: round2(p.cost) })), value },
        },
      });
      return { orderId: order.id, plates: plates.length, value };
    }, { timeout: 30_000 });
  }

  /**
   * Lines of the bill that the kitchen made and the void put back: dishes
   * with a recipe (their ingredients were used for every plate) and dishes
   * whose plates were made for this order.
   */
  private async kitchenPlates(
    tenantId: string, orderNumber: string,
    sale: { saleNumber: string; items: Array<{ productId: string | null; quantity: number; costPrice: number; variantLink: { variantId: string } | null }> },
  ): Promise<Plate[]> {
    const productIds = [...new Set(sale.items.map((i) => i.productId).filter((x): x is string => !!x))];
    if (!productIds.length) return [];
    const [withRecipe, made, returned] = await Promise.all([
      this.prisma.restaurantMenuItem.findMany({ where: { tenantId, productId: { in: productIds }, recipe: { isNot: null } }, select: { productId: true } }),
      this.prisma.stockMovement.findMany({
        where: { tenantId, productId: { in: productIds }, type: 'ADJUSTMENT_IN', reference: `${KITCHEN_REF} ${orderNumber}` },
        select: { productId: true }, distinct: ['productId'],
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId, productId: { in: productIds }, type: 'RETURN_IN', reference: sale.saleNumber },
        select: { productId: true }, distinct: ['productId'],
      }),
    ]);
    const kitchen = new Set([...withRecipe.map((r) => r.productId), ...made.map((m) => m.productId)]);
    const back = new Set(returned.map((r) => r.productId));

    const rows = new Map<string, Plate>();
    for (const it of sale.items) {
      if (!it.productId || !kitchen.has(it.productId) || !back.has(it.productId) || !(it.quantity > 0)) continue;
      const variantId = it.variantLink?.variantId ?? null;
      const key = `${it.productId}:${variantId ?? ''}`;
      const row = rows.get(key) ?? { productId: it.productId, variantId, qty: 0, cost: 0 };
      // Weighted plate cost when the same dish is on the bill twice.
      const qty = round2(row.qty + it.quantity);
      row.cost = qty > 0 ? (row.cost * row.qty + Number(it.costPrice || 0) * it.quantity) / qty : 0;
      row.qty = qty;
      rows.set(key, row);
    }
    return [...rows.values()];
  }
}
