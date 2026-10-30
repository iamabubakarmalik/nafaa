/**
 * Approval and invoicing. Approving an order makes its invoice at once: a
 * normal Sale through SalesService.create, so stock (FEFO batches), khata,
 * FBR, reports and commission work as for any bill.
 *
 *   - The godown is the order's shop; the bill is sold by the booker
 *     (soldById) and made by the approver; source DISTRIBUTION, sourceRef the
 *     order number.
 *   - The bill is a credit (khata) bill for the full amount. Cash taken at
 *     delivery is posted against it at settlement.
 *   - Each pack line becomes a base-unit line at price ÷ pack size with the
 *     scheme and hand discount as its line discount; free goods are their
 *     own price-0 line noted "Scheme: …".
 *   - Over the credit limit or overdue: the manager PIN (creditMode
 *     WARN_THEN_PIN) or a refusal (BLOCK).
 *
 * An order left APPROVED without its bill (PIN needed, stock short) holds
 * what is free of its goods in the godown (helpers/reservation), so the
 * counter cannot sell them meanwhile; the hold is given back just before
 * the bill is made, or when the order is cancelled.
 *
 * Bulk work runs in chunks, one order at a time, each bill in its own
 * transaction. An order is claimed (APPROVED → INVOICING) before its bill is
 * made, and a bill already made for the order (found by its number) is
 * linked instead of made twice, so a retry after a crash never bills twice.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PIN_NEEDS, requireManagerPin } from '../../../common/helpers/manager-pin.helper';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../sales/sales/sales.service';
import { CreateSaleDto } from '../../sales/sales/dto/create-sale.dto';
import { SCHEME_NOTE } from '../../sales/sales/price-cut.helper';
import { INVOICE_CHUNK } from '../distribution.constants';
import { OrderIdsDto } from '../dto/field.dto';
import { readSettings } from '../helpers/pricing-loader';
import { r4 } from '../distribution.support';
import { releaseOrder, reserveOrder } from '../helpers/reservation';
import { OrdersService } from './orders.service';

/** An order stuck in INVOICING longer than this (a crash mid-way) may be picked up again. */
const STALE_CLAIM_MS = 2 * 60_000;

export interface InvoiceResult {
  id: string;
  orderNumber: string | null;
  ok: boolean;
  status: string | null;
  saleId?: string;
  saleNumber?: string;
  error?: string;
  /** True when a manager PIN would let this order through. */
  needsPin?: boolean;
}

type Order = Awaited<ReturnType<InvoicingService['loadOrders']>>[number];

@Injectable()
export class InvoicingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly orders: OrdersService,
  ) {}

  private loadOrders(tenantId: string, ids: string[]) {
    return this.prisma.salesOrder.findMany({
      where: { tenantId, id: { in: ids } },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  /** Approves booked orders and invoices them (and any approved ones in the list). */
  async approve(user: AuthenticatedUser, dto: OrderIdsDto) {
    const ids = [...new Set(dto.ids)];
    const found = await this.prisma.salesOrder.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, status: true } });
    for (const o of found) {
      if (o.status !== 'BOOKED') continue;
      await this.prisma.salesOrder.updateMany({
        where: { id: o.id, status: 'BOOKED' },
        data: { status: 'APPROVED', approvedById: user.id, approvedAt: new Date() },
      });
    }
    return this.invoice(user, dto);
  }

  /** Invoices approved orders. Orders in any other state come back with the reason. */
  async invoice(user: AuthenticatedUser, dto: OrderIdsDto) {
    const tenantId = user.tenantId;
    const ids = [...new Set(dto.ids)];
    const settings = await readSettings(this.prisma, tenantId);
    const results: InvoiceResult[] = [];
    const pin = { approved: false, tried: false, error: null as string | null };

    for (let i = 0; i < ids.length; i += INVOICE_CHUNK) {
      const chunk = await this.loadOrders(tenantId, ids.slice(i, i + INVOICE_CHUNK));
      const credit = await this.orders.creditSnapshots(tenantId, chunk.map((o) => o.customerId));
      for (const id of ids.slice(i, i + INVOICE_CHUNK)) {
        const order = chunk.find((o) => o.id === id);
        if (!order) { results.push({ id, orderNumber: null, ok: false, status: null, error: 'Order nahi mila' }); continue; }
        const res = await this.invoiceOne(user, order, { mode: settings?.creditMode ?? 'WARN_THEN_PIN', credit: credit.get(order.customerId), managerPin: dto.managerPin, pin });
        results.push(res);
        // A bill raises the khata balance; later orders of the same customer must see it.
        if (res.ok) {
          const snap = credit.get(order.customerId);
          if (snap) snap.balance += order.total;
        }
      }
    }
    return {
      results,
      invoiced: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      needsPin: results.some((r) => r.needsPin),
    };
  }

  private async invoiceOne(
    user: AuthenticatedUser,
    order: Order,
    ctx: {
      mode: string; credit: Parameters<OrdersService['creditOf']>[0]; managerPin?: string; pin: { approved: boolean; tried: boolean; error: string | null };
      /** Money paid on the spot (van sale): only the rest goes on the khata and counts for credit. */
      cashNow?: number;
    },
  ): Promise<InvoiceResult> {
    const base = { id: order.id, orderNumber: order.orderNumber };
    if (order.saleId) return { ...base, ok: true, status: order.status, saleId: order.saleId, error: 'Invoice pehle se bani hui hai' };
    const stale = order.status === 'INVOICING' && Date.now() - order.updatedAt.getTime() > STALE_CLAIM_MS;
    if (order.status !== 'APPROVED' && !stale) {
      return { ...base, ok: false, status: order.status, error: `${order.status} Order ki Invoice nahi ban sakti` };
    }
    if (!order.shopId) return this.fail(order, 'Godown chunein — Order par koi godown / shop nahi');

    // Credit rule before anything is claimed.
    if (ctx.mode !== 'OFF') {
      const status = this.orders.creditOf(ctx.credit, Math.max(0, order.total - (ctx.cashNow ?? 0)));
      if (status.overLimit || status.overdue) {
        if (ctx.mode === 'BLOCK') return this.fail(order, `${status.message} — Invoice nahi ban sakti (Settings: BLOCK)`);
        if (!ctx.pin.approved) {
          if (!ctx.managerPin) return { ...(await this.fail(order, `${status.message} — manager PIN chahiye`)), needsPin: true };
          if (!ctx.pin.tried) {
            ctx.pin.tried = true;
            try {
              await requireManagerPin(this.prisma, user, ctx.managerPin, 'Credit limit / overdue par Invoice', true, PIN_NEEDS.credit);
              ctx.pin.approved = true;
            } catch (e: any) {
              ctx.pin.error = e?.message ?? 'Ghalat PIN';
            }
          }
          if (!ctx.pin.approved) return { ...(await this.fail(order, ctx.pin.error ?? 'Ghalat PIN')), needsPin: true };
        }
      }
    }

    const claim = await this.prisma.salesOrder.updateMany({
      where: { id: order.id, status: order.status, updatedAt: order.updatedAt },
      data: { status: 'INVOICING', invoiceError: null },
    });
    if (!claim.count) return { ...base, ok: false, status: order.status, error: 'Order abhi kisi aur ne badla — dobara koshish karein' };
    // The bill takes the goods itself; a hold left from an earlier try would block it.
    await this.prisma.$transaction((tx) => releaseOrder(tx, order.tenantId, order));

    try {
      // A bill made for this order before a crash is linked, not made again.
      let sale = await this.prisma.sale.findFirst({
        where: { tenantId: user.tenantId, source: 'DISTRIBUTION', sourceRef: order.orderNumber, status: { not: 'VOIDED' } },
        select: { id: true, saleNumber: true },
      });
      if (!sale) {
        const made = await this.sales.create(user, new ShopScope(null, true), this.saleDto(order), { source: 'DISTRIBUTION', sourceRef: order.orderNumber });
        sale = { id: made.id, saleNumber: made.saleNumber };
      }
      const lines = await this.prisma.saleItem.findMany({ where: { saleId: sale.id }, select: { id: true, productId: true, price: true, quantity: true } });
      const take = (productId: string, free: boolean, qty: number) => {
        const i = lines.findIndex((l) => l.productId === productId && (free ? l.price === 0 : l.price > 0) && Math.abs(l.quantity - qty) < 0.0001);
        return i < 0 ? null : lines.splice(i, 1)[0].id;
      };
      await this.prisma.$transaction(async (tx) => {
        for (const it of order.items) {
          const paidId = take(it.productId, false, it.baseQty) ?? take(it.productId, true, it.baseQty);
          const freeId = it.freeBaseQty > 0 ? take(it.freeProductId ?? it.productId, true, it.freeBaseQty) : null;
          await tx.salesOrderItem.update({ where: { id: it.id }, data: { saleItemId: paidId, freeSaleItemId: freeId } });
        }
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { status: order.loadSheetId ? 'LOADED' : 'INVOICED', saleId: sale!.id, invoicedAt: new Date(), invoiceError: null },
        });
      });
      return { ...base, ok: true, status: 'INVOICED', saleId: sale!.id, saleNumber: sale!.saleNumber };
    } catch (e: any) {
      await this.prisma.salesOrder.update({ where: { id: order.id }, data: { status: 'APPROVED', invoiceError: String(e?.message ?? 'Invoice nahi bani').slice(0, 500) } });
      await this.hold({ ...order, reservation: null });
      return { ...base, ok: false, status: 'APPROVED', error: e?.message ?? 'Invoice nahi bani' };
    }
  }

  private async fail(order: Order, error: string): Promise<InvoiceResult> {
    await this.prisma.salesOrder.update({ where: { id: order.id }, data: { invoiceError: error.slice(0, 500) } });
    if (order.status === 'APPROVED') await this.hold(order);
    return { id: order.id, orderNumber: order.orderNumber, ok: false, status: order.status, error };
  }

  /** Holds the godown stock of an approved order still waiting for its bill. Never fails the call. */
  private async hold(order: Order) {
    if (order.vanSessionId) return;
    try {
      await this.prisma.$transaction((tx) => reserveOrder(tx, order.tenantId, order));
    } catch {
      // A hold is a courtesy to the desk; the bill itself still checks stock.
    }
  }

  /**
   * Invoices one approved order sold on the spot (van sale), counting only
   * the part not paid now against the credit limit.
   */
  async invoiceSpot(user: AuthenticatedUser, orderId: string, opts: { cashNow: number; managerPin?: string }): Promise<InvoiceResult> {
    const [order] = await this.loadOrders(user.tenantId, [orderId]);
    if (!order) return { id: orderId, orderNumber: null, ok: false, status: null, error: 'Order nahi mila' };
    const settings = await readSettings(this.prisma, user.tenantId);
    const credit = await this.orders.creditSnapshots(user.tenantId, [order.customerId]);
    return this.invoiceOne(user, order, {
      mode: settings?.creditMode ?? 'WARN_THEN_PIN', credit: credit.get(order.customerId), managerPin: opts.managerPin,
      pin: { approved: false, tried: false, error: null }, cashNow: opts.cashNow,
    });
  }

  /** The bill for an order: pack lines in base units, free goods as their own lines. */
  saleDto(order: Order): CreateSaleDto {
    const items: CreateSaleDto['items'] = [];
    for (const it of order.items) {
      const rate = Number(it.conversionRate) || 1;
      items.push({
        productId: it.productId,
        ...(it.variantId && { variantId: it.variantId }),
        quantity: it.baseQty,
        priceOverride: it.price / rate,
        lineDiscount: Math.round((it.schemeDiscount + it.discount) * 100) / 100,
        priceTier: 'WHOLESALE',
        ...(it.schemeNote && it.schemeDiscount > 0 && { note: it.schemeNote }),
        ...(it.unitName && { unitName: it.unitName, unitQty: it.qty, conversionRate: rate }),
        ...(it.schemeId && { schemeId: it.schemeId }),
      } as CreateSaleDto['items'][number]);
      if (it.freeBaseQty > 0) {
        const own = !it.freeProductId || it.freeProductId === it.productId;
        items.push({
          productId: it.freeProductId ?? it.productId,
          ...(own && it.variantId && { variantId: it.variantId }),
          quantity: it.freeBaseQty,
          priceOverride: 0,
          priceTier: 'WHOLESALE',
          note: `${SCHEME_NOTE}${it.schemeNote ?? 'free'}`,
          ...(it.schemeId && { schemeId: it.schemeId }),
          ...(own && it.unitName && rate > 1 && { unitName: it.unitName, unitQty: r4(it.freeBaseQty / rate), conversionRate: rate }),
        } as CreateSaleDto['items'][number]);
      }
    }
    return {
      shopId: order.shopId!,
      customerId: order.customerId,
      soldById: order.bookedById,
      paymentMethod: 'CASH',
      paidAmount: 0,
      items,
    } as CreateSaleDto;
  }
}
