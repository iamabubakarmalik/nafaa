import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { PERMISSIONS, hasPermission } from '../../common/constants/permissions.constants';
import { StockAdjustmentsService } from '../../modules/inventory/stock-adjustments/stock-adjustments.service';
import { OnlineOrdersService } from './online-orders.service';
import { OrderCostsService, costOrderOf } from './order-costs.service';
import { orderCosts } from './order-costs';
import { courierName } from './couriers';
import { cnKey } from './cod-reconcile';
import { checkPack } from './order-scan';

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
const PACKABLE = ['CONFIRMED', 'PREPARING', 'READY'];
const code = (v: unknown) => String(v ?? '').toUpperCase().replace(/\s+/g, '');

/**
 * Scanning at the packing table and at the returns desk.
 *
 *   lookup     an order by its number or courier CN, with every line's
 *              barcodes and SKUs (variant first) so the screen can check
 *              each scanned item on the spot
 *   packed     the scanned counts must match the order exactly; then the
 *              order moves to READY through the normal status change
 *   rtoReceive a returned parcel: the order is marked returned through the
 *              normal RTO path (its bill is voided, which puts the stock back
 *              in the order's branch); items the shop marks damaged are then
 *              written off with a stock adjustment (DAMAGE), so the loss shows
 *              at cost. The parcel's courier and return charges are kept on
 *              the order from the cost model.
 */
@Injectable()
export class OrderScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly costs: OrderCostsService,
    private readonly adjustments: StockAdjustmentsService,
  ) {}

  async lookup(user: AuthenticatedUser, scope: ShopScope, raw: string) {
    const term = String(raw ?? '').trim().replace(/^#+/, '');
    if (term.length < 2) throw new BadRequestException('Order number ya CN scan karein');
    const base = { tenantId: user.tenantId, ...(scope.whereLoose as any) } as Prisma.ChannelOrderWhereInput;
    const cn = cnKey(term);
    const byCn = cn.length >= 4
      ? await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM channel_orders WHERE "tenantId" = ${user.tenantId} AND "trackingNumber" IS NOT NULL
            AND upper(regexp_replace("trackingNumber", '[^A-Za-z0-9]', '', 'g')) = ${cn} LIMIT 5`
      : [];
    const found = await this.prisma.channelOrder.findMany({
      where: {
        ...base,
        AND: [{ OR: [
          ...(byCn.length ? [{ id: { in: byCn.map((r) => r.id) } }] : []),
          { externalOrderNumber: { in: [term, `#${term}`] } },
          { externalOrderId: term },
        ] }],
      },
      orderBy: { receivedAt: 'desc' },
      take: 3,
    });
    const order = found.find((o) => !(o.metadata as any)?.test) ?? found[0];
    if (!order) throw new NotFoundException(`"${term}" ka koi order nahi mila`);
    return this.view(order);
  }

  private async view(order: Awaited<ReturnType<PrismaService['channelOrder']['findFirstOrThrow']>>) {
    const items = (Array.isArray(order.items) ? order.items : []) as any[];
    const productIds = [...new Set(items.map((i) => i?.productId).filter(Boolean))] as string[];
    const variantIds = [...new Set(items.map((i) => i?.variantId).filter(Boolean))] as string[];
    const [products, variants] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: order.tenantId }, select: { id: true, name: true, sku: true, barcode: true, images: { take: 1, select: { url: true } } } }) : [],
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true, sku: true, barcode: true } }) : [],
    ]);
    const meta = (order.metadata ?? {}) as any;
    const lines = items.map((it, index) => {
      const p = products.find((x) => x.id === it?.productId);
      const v = it?.variantId ? variants.find((x) => x.id === it.variantId) : undefined;
      // A product with sizes is identified by its size's codes, never the base product's.
      const codes = [...new Set((v ? [v.barcode, v.sku] : [p?.barcode, p?.sku, it?.sku]).map(code).filter((c) => c.length >= 2))];
      return {
        index, name: String(it?.name ?? p?.name ?? 'Item'), variant: it?.variant ?? v?.name ?? null, quantity: Number(it?.quantity) || 0,
        image: it?.image ?? p?.images[0]?.url ?? null, codes, matched: !!p,
      };
    });
    const number = String(order.externalOrderNumber ?? order.externalOrderId).replace(/^#+/, '');
    const packProblem = !order.nafaaSaleId ? 'Order abhi accept nahi hua — pehle accept karein (bill banega)'
      : CLOSED.includes(order.orderStatus) ? 'Ye order band hai (cancel ya wapas)'
        : !PACKABLE.includes(order.orderStatus) ? 'Ye order courier ko ja chuka'
          : lines.some((l) => !l.codes.length) ? 'Kuch items ka barcode/SKU nahi — un ko haath se gin kar tick karein' : null;
    const returnProblem = order.orderStatus === 'RETURNED' && meta.rtoReceived ? 'Ye parcel pehle hi wapas receive ho chuka'
      : !order.dispatchedAt ? 'Ye order kabhi bheja hi nahi gaya — wapas nahi aa sakta'
        : order.orderStatus === 'CANCELLED' || order.orderStatus === 'REJECTED' ? 'Ye order cancel hai'
          : order.paymentStatus === 'PAID' && order.codSettledAt ? 'Is order ka paisa settle ho chuka — Returns se return karein'
            : null;
    return {
      id: order.id, number, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus,
      customerName: order.customerName, customerCity: order.customerCity, total: Number(order.total),
      courierCode: order.courierCode, courierLabel: courierName(order.courierCode) ?? order.courierName, trackingNumber: order.trackingNumber,
      courierBooked: !!order.courierBookedAt && !!order.trackingNumber && order.courierStatus !== 'CANCELLED',
      shopId: order.shopId,
      packed: meta.packed ?? null,
      rtoReceived: meta.rtoReceived ?? null,
      lines,
      canPack: !packProblem || packProblem.startsWith('Kuch items'), packProblem,
      canReturn: !returnProblem, returnProblem,
    };
  }

  /** Everything scanned and nothing extra: the order is packed (READY). */
  async packed(user: AuthenticatedUser, scope: ShopScope, id: string, body: { counts?: Record<string, number>; manual?: number[] }) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    const v = await this.view(order);
    if (!v.canPack) throw new BadRequestException(v.packProblem ?? 'Ye order pack nahi ho sakta');
    const check = checkPack(v.lines, body?.counts ?? {}, body?.manual ?? []);
    if (!check.ok) throw new ConflictException(check.message);
    if (order.orderStatus !== 'READY') await this.orders.updateStatus(user, scope, id, { status: 'READY' });
    const fresh = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id }, select: { metadata: true } });
    await this.prisma.channelOrder.update({
      where: { id },
      data: { metadata: { ...((fresh.metadata as any) ?? {}), packed: { at: new Date().toISOString(), by: user.id, scanned: true, manual: body?.manual ?? [] } } },
    });
    return { ok: true, order: await this.view(await this.prisma.channelOrder.findUniqueOrThrow({ where: { id } })) };
  }

  /**
   * A returned parcel at the shop. `damaged[index]` is how many of that line
   * came back unfit to sell; the rest goes back on the shelf.
   */
  async rtoReceive(user: AuthenticatedUser, scope: ShopScope, id: string, body: { damaged?: Record<string, number>; reason?: string }) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    const v = await this.view(order);
    if (!v.canReturn) throw new BadRequestException(v.returnProblem ?? 'Ye parcel wapas receive nahi ho sakta');
    const damaged = Object.entries(body?.damaged ?? {})
      .map(([k, q]) => ({ line: v.lines[Number(k)], qty: Math.floor(Number(q)) }))
      .filter((d) => d.line && d.qty > 0);
    for (const d of damaged) {
      if (d.qty > d.line.quantity) throw new BadRequestException(`${d.line.name}: ${d.line.quantity} se zyada kharab nahi ho sakte`);
    }
    if (damaged.length && !hasPermission(user.role, user.permissions, PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE)) {
      throw new ForbiddenException('Kharab maal likhne ke liye stock adjustment ki ijazat chahiye — sab wapas shelf par rakhein ya malik se kahein');
    }

    // 1. The normal RTO path: bill voided, every item back in the order's branch.
    if (order.orderStatus !== 'RETURNED') {
      await this.orders.markReturned(user, scope, id, body?.reason?.trim() || 'Parcel wapas aaya (scan)');
    }
    // 2. Damaged items leave the shelf again as a damage write-off (loss at cost).
    const items = (Array.isArray(order.items) ? order.items : []) as any[];
    const written: Array<{ index: number; qty: number; ref?: string }> = [];
    const failed: string[] = [];
    for (const d of damaged) {
      const it = items[d.line.index];
      if (!it?.productId) { failed.push(d.line.name); continue; }
      try {
        const adj: any = await this.adjustments.create(user, new ShopScope(order.shopId, false), {
          productId: it.productId, variantId: it.variantId ?? undefined, shopId: order.shopId ?? undefined,
          type: 'DAMAGE', reasonCode: 'DAMAGE', quantity: d.qty,
          reason: `RTO parcel kharab — order #${v.number}`, note: order.trackingNumber ? `CN ${order.trackingNumber}` : undefined,
        } as any);
        written.push({ index: d.line.index, qty: d.qty, ref: adj?.reference ?? adj?.adjustmentNumber ?? undefined });
      } catch (e) {
        failed.push(`${d.line.name}: ${(e as any)?.response?.message ?? (e as Error).message}`);
      }
    }
    // 3. Keep the parcel's courier and return charges from the cost model.
    const row = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id } });
    const s = await this.costs.settings(user.tenantId);
    const c = orderCosts(costOrderOf(row), s);
    const keep: Record<string, number> = {};
    if (row.courierCharge === null && c.courierCharge.value > 0) keep.courierCharge = c.courierCharge.value;
    if (row.rtoCost === null && c.rtoCost.value > 0) keep.rtoCost = c.rtoCost.value;
    if (Object.keys(keep).length) await this.costs.saveCosts(id, keep, 'ESTIMATE');
    const after = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id }, select: { metadata: true } });
    await this.prisma.channelOrder.update({
      where: { id },
      data: { metadata: { ...((after.metadata as any) ?? {}), rtoReceived: { at: new Date().toISOString(), by: user.id, damaged: written, failed } } },
    });
    await this.costs.post(user.tenantId, id).catch(() => null);
    return {
      ok: true,
      restocked: v.lines.reduce((t, l) => t + l.quantity, 0) - written.reduce((t, w) => t + w.qty, 0),
      damaged: written.reduce((t, w) => t + w.qty, 0),
      failed,
      rtoCost: c.courierCharge.value + c.rtoCost.value,
      order: await this.view(await this.prisma.channelOrder.findUniqueOrThrow({ where: { id } })),
    };
  }
}
