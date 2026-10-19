/**
 * Home delivery of milk. The day's sheet is generated from each customer's
 * fixed quantity; marking a delivery done books it as a credit bill on the
 * customer's khata (milk line, stock out of the branch), so deliveries show
 * in the day book, cash register, profit report and khata like any bill.
 *
 * Undoing a delivered entry (naga after all, cancel, or a changed quantity)
 * voids that bill through the shared void, which needs `sales.void` and the
 * manager PIN when the shop asks for one. A bill voided from Sales history
 * cancels its delivery (DairyDeliveryVoidService).
 */
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DairyDeliverySlot, DairyDeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope, applyStockDelta } from '../../../common/shop-scope';
import { hasPermission } from '../../../common/constants/permissions.constants';
import { postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { BulkGenerateDto, ConfirmAllDto, ConfirmDeliveryDto, CreateDeliveryDto, UndoDeliveryDto } from './dto/create-delivery.dto';
import {
  MILK_TYPES, dayEnd, dayKey, dayNumber, dayRange, dayStart, linkKhata, milkProduct, parseDay, r2, r3, weekdayInTz,
} from '../dairy-common';

type Tx = Prisma.TransactionClient;
type Delivery = Prisma.DairyDeliveryGetPayload<object>;

const SLOT_LABEL: Record<string, string> = { MORNING: 'Subah', AFTERNOON: 'Dopahar', EVENING: 'Shaam', NIGHT: 'Raat' };

/** Bill number prefix of a delivery: `DLV-` and the first 12 hex digits of its id. */
export function deliveryBillBase(id: string) {
  return `DLV-${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

/** Id prefix of the delivery a `DLV-` bill belongs to, or null. */
export function deliveryIdPrefix(saleNumber: string) {
  const m = /^DLV-([0-9A-F]{12})(?:-\d+)?$/.exec(saleNumber);
  if (!m) return null;
  const h = m[1].toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}`;
}

@Injectable()
export class DairyDeliveriesService {
  constructor(private readonly prisma: PrismaService, private readonly sales: SalesService) {}

  /**
   * Rate for a customer without a custom rate: the shop's own milk price
   * (home delivery rate, else the morning / evening rate on the dairy
   * profile, else the product's sale price). Never a hard-coded number.
   */
  private async defaultRate(tenantId: string, slot: string): Promise<number> {
    const profile = await this.prisma.dairyProduct.findFirst({
      where: { tenantId, productType: { in: [...MILK_TYPES] } },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    if (profile) {
      if (profile.homeDeliveryPrice && profile.homeDeliveryPrice > 0) return profile.homeDeliveryPrice;
      const slotPrice = slot === 'EVENING' ? profile.eveningPrice : profile.morningPrice;
      if (slotPrice && slotPrice > 0) return slotPrice;
      const product = await this.prisma.product.findFirst({ where: { id: profile.productId, tenantId }, select: { price: true } });
      if (product?.price) return product.price;
    }
    const liter = await this.prisma.product.findFirst({
      where: { tenantId, isActive: true, unit: { in: ['liter', 'litre', 'ltr', 'l'] } },
      orderBy: { updatedAt: 'desc' },
      select: { price: true },
    });
    return liter?.price ?? 0;
  }

  private qty(value: unknown, label: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 1000) throw new BadRequestException(`${label} 0 se zyada aur 1000 se kam likhein`);
    return r3(n);
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateDeliveryDto) {
    const customer = await this.prisma.dairyCustomer.findFirst({ where: { id: dto.dairyCustomerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    if (customer.status === 'CLOSED') throw new BadRequestException('Is customer ka khata band hai');
    const scheduled = this.qty(dto.scheduledQty, 'Quantity');
    const when = parseDay(dto.deliveryDate) ?? new Date();
    if (when.getTime() > dayEnd().getTime() + 86_400_000) throw new BadRequestException('Kal se aage ki delivery abhi nahi likh sakte');

    const slot = dto.slot ?? 'MORNING';
    const rate = dto.ratePerLiter ?? customer.customRate ?? await this.defaultRate(user.tenantId, slot);
    if (!(rate >= 0)) throw new BadRequestException('Rate sahi likhein');

    const created = await this.prisma.dairyDelivery.create({
      data: {
        tenantId: user.tenantId,
        dairyCustomerId: dto.dairyCustomerId,
        routeId: customer.routeId,
        deliveryDate: when,
        slot,
        scheduledQty: scheduled,
        deliveredQty: 0,
        unit: dto.unit ?? 'LITER',
        status: 'SCHEDULED',
        ratePerLiter: rate,
        totalAmount: r2(rate * scheduled),
        notes: dto.notes,
      },
    });
    if (!dto.deliverNow) return created;
    return this.confirmDelivery(user, scope, created.id, { deliveredQty: dto.deliveredQty ?? scheduled, notes: dto.notes });
  }

  async bulkGenerate(user: AuthenticatedUser, dto: BulkGenerateDto) {
    const date = parseDay(dto.date) ?? new Date();
    const slot = dto.slot ?? 'MORNING';
    const start = dayStart(date);
    const end = dayEnd(date);
    const dow = weekdayInTz(date);
    // Day number on shop time, so "alternate day" keeps its rhythm across weeks.
    const dayNo = dayNumber(date);
    let fallbackRate: number | null = null;

    if (dto.routeId) {
      const route = await this.prisma.dairyRoute.findFirst({ where: { id: dto.routeId, tenantId: user.tenantId }, select: { id: true } });
      if (!route) throw new NotFoundException('Route nahi mila');
    }

    // A pause that has run out ends by itself; the shop should not have to remember.
    await this.prisma.dairyCustomer.updateMany({
      where: { tenantId: user.tenantId, status: 'SUSPENDED', pausedTo: { lt: start } },
      data: { status: 'ACTIVE', pausedFrom: null, pausedTo: null },
    });

    const customers = await this.prisma.dairyCustomer.findMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', startDate: { lte: end }, ...(dto.routeId && { routeId: dto.routeId }) },
    });
    const already = new Set((await this.prisma.dairyDelivery.findMany({
      where: { tenantId: user.tenantId, slot, status: { not: 'CANCELLED' }, deliveryDate: { gte: start, lte: end }, dairyCustomerId: { in: customers.map((c) => c.id) } },
      select: { dairyCustomerId: true },
    })).map((d) => d.dairyCustomerId));

    const rows: Prisma.DairyDeliveryCreateManyInput[] = [];
    for (const c of customers) {
      if (already.has(c.id)) continue;
      if (c.pausedFrom && c.pausedTo && end >= c.pausedFrom && start <= c.pausedTo) continue;
      if (c.deliveryFrequency === 'ON_DEMAND') continue;
      if (c.deliveryFrequency === 'ALTERNATE_DAY' && dayNo % 2 === 1) continue;
      if (c.deliveryFrequency === 'WEEKLY' && dow !== 1) continue;
      if (c.deliveryFrequency === 'MORNING_ONLY' && slot !== 'MORNING') continue;
      if (c.deliveryFrequency === 'EVENING_ONLY' && slot !== 'EVENING') continue;

      const qty = slot === 'EVENING' ? c.eveningQuantity : c.morningQuantity;
      if (!(qty > 0)) continue;

      if (c.customRate == null && fallbackRate === null) fallbackRate = await this.defaultRate(user.tenantId, slot);
      const rate = c.customRate ?? fallbackRate ?? 0;
      rows.push({
        tenantId: user.tenantId,
        dairyCustomerId: c.id,
        routeId: c.routeId,
        deliveryDate: start,
        slot,
        scheduledQty: qty,
        deliveredQty: 0,
        unit: 'LITER',
        status: 'SCHEDULED',
        ratePerLiter: rate,
        totalAmount: r2(rate * qty),
      });
    }
    if (rows.length > 0) await this.prisma.dairyDelivery.createMany({ data: rows });
    return { generatedCount: rows.length, date: dayKey(start), slot };
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; routeId?: string; slot?: string; status?: string; from?: string; to?: string; search?: string }) {
    const range = dayRange(params.from, params.to);
    const search = params.search?.trim();
    return this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { dairyCustomerId: params.customerId }),
        ...(params.routeId && { routeId: params.routeId }),
        ...(params.slot && params.slot in DairyDeliverySlot && { slot: params.slot as DairyDeliverySlot }),
        ...(params.status && params.status in DairyDeliveryStatus && { status: params.status as DairyDeliveryStatus }),
        ...(range && { deliveryDate: range }),
        ...(search && {
          customer: { OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { customerNumber: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { address: { contains: search, mode: 'insensitive' as const } },
          ] },
        }),
      },
      include: { customer: { include: { route: true } } },
      orderBy: [{ deliveryDate: 'desc' }, { slot: 'asc' }],
      take: 500,
    });
  }

  /** The live bill of a delivery, if it has one. */
  private activeBill(db: Tx | PrismaService, tenantId: string, deliveryId: string) {
    return db.sale.findFirst({
      where: { tenantId, saleNumber: { startsWith: deliveryBillBase(deliveryId) }, status: { not: 'VOIDED' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, saleNumber: true, status: true },
    });
  }

  /** Next free bill number for a delivery (a corrected delivery gets -2, -3…). */
  private async billNumber(tx: Tx, tenantId: string, deliveryId: string) {
    const base = deliveryBillBase(deliveryId);
    const used = await tx.sale.count({ where: { tenantId, saleNumber: { startsWith: base } } });
    return used === 0 ? base : `${base}-${used + 1}`;
  }

  /** Books a delivery as a bill on the customer's khata and takes the milk out of stock. */
  private async postBill(tx: Tx, user: AuthenticatedUser, scope: ShopScope, d: Delivery, qty: number, paid: number, method?: string) {
    const customer = await tx.dairyCustomer.findUniqueOrThrow({ where: { id: d.dairyCustomerId }, include: { route: { select: { shopId: true } } } });
    const shopId = await resolveIndustryShopId(tx, user, customer.route?.shopId ?? scope.shopId);
    const customerId = await linkKhata(tx, user, customer.id, shopId);
    const product = await milkProduct(tx, user.tenantId, customer.productPreference);
    const amount = r2(d.ratePerLiter * qty);
    const unit = product?.unit || 'liter';
    const saleNumber = await this.billNumber(tx, user.tenantId, d.id);
    const sale = await postIndustrySale(tx, user, {
      saleNumber,
      sourceRef: customer.customerNumber,
      shopId,
      customerId,
      lines: [{
        label: `${product?.name ?? 'Doodh'} ${qty} ${unit} — ${SLOT_LABEL[d.slot] ?? d.slot} delivery ${dayKey(d.deliveryDate)}`,
        amount,
        cost: product ? r2(Number(product.costPrice || 0) * qty) : 0,
        quantity: qty,
        productId: product?.id ?? null,
      }],
      paidAmount: Math.min(paid, amount),
      paymentMethod: method,
    });
    if (product && !product.hasVariants) {
      await applyStockDelta({
        tx, tenantId: user.tenantId, shopId, productId: product.id, delta: -qty,
        movementType: 'SALE_OUT', reference: saleNumber, note: `Ghar delivery: ${customer.name}`, userId: user.id,
        unitCost: Number(product.costPrice || 0), batchMode: 'cap',
      });
    }
    return { sale, amount, credit: r2(amount - Math.min(paid, amount)) };
  }

  /**
   * Takes a delivered entry off the books: its status changes first (so the
   * void listener leaves it alone), then the bill is voided. If the void is
   * refused (no right, wrong PIN) the entry is put back as it was.
   */
  private async undoDelivered(user: AuthenticatedUser, scope: ShopScope, d: Delivery, next: { status: DairyDeliveryStatus; skipReason?: string | null }, managerPin?: string) {
    if (!hasPermission(user.role, user.permissions, 'sales.void')) {
      throw new ForbiddenException('Deliver ho chuki delivery ka bill cancel hota hai — iske liye "Bill void" ki permission chahiye');
    }
    const bill = await this.activeBill(this.prisma, user.tenantId, d.id);
    const claimed = await this.prisma.$transaction(async (tx) => {
      const ok = await tx.dairyDelivery.updateMany({ where: { id: d.id, status: 'DELIVERED' }, data: { ...next, deliveredQty: 0, paidAmount: 0, isPaid: false } });
      if (!ok.count) return false;
      await tx.dairyCustomer.update({
        where: { id: d.dairyCustomerId },
        data: {
          currentBalance: { decrement: r2(d.totalAmount - d.paidAmount) },
          totalPurchases: { decrement: d.totalAmount },
          totalDeliveries: { decrement: 1 },
          ...(next.status === 'SKIPPED' && { missedDeliveries: { increment: 1 } }),
        },
      });
      return true;
    });
    if (!claimed) throw new BadRequestException('Delivery abhi badli gayi — page refresh karein');
    if (!bill) return;
    try {
      await this.sales.voidSale(user, scope, bill.id, `Doodh delivery wapas (${next.status === 'SKIPPED' ? 'naga' : 'cancel'})`, managerPin);
    } catch (e) {
      await this.prisma.$transaction(async (tx) => {
        await tx.dairyDelivery.update({ where: { id: d.id }, data: { status: 'DELIVERED', skipReason: d.skipReason, deliveredQty: d.deliveredQty, paidAmount: d.paidAmount, isPaid: d.isPaid } });
        await tx.dairyCustomer.update({
          where: { id: d.dairyCustomerId },
          data: {
            currentBalance: { increment: r2(d.totalAmount - d.paidAmount) },
            totalPurchases: { increment: d.totalAmount },
            totalDeliveries: { increment: 1 },
            ...(next.status === 'SKIPPED' && { missedDeliveries: { decrement: 1 } }),
          },
        });
      });
      throw e;
    }
  }

  async confirmDelivery(user: AuthenticatedUser, scope: ShopScope, id: string, dto: ConfirmDeliveryDto) {
    let d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (d.status === 'CANCELLED') throw new BadRequestException('Ye delivery cancel ho chuki hai');
    const qty = this.qty(dto.deliveredQty, 'Diya gaya doodh');
    const paid = r2(Math.max(Number(dto.paidAmount) || 0, 0));

    if (d.status === 'DELIVERED') {
      if (Math.abs(d.deliveredQty - qty) < 0.0005 && paid <= 0) return d;
      // A changed quantity replaces the bill: void the old one, book the new one.
      await this.undoDelivered(user, scope, d, { status: 'SCHEDULED' }, dto.managerPin);
      d = await this.prisma.dairyDelivery.findUniqueOrThrow({ where: { id } });
    }
    const before = d;

    return this.prisma.$transaction(async (tx) => {
      // Guard against a double tap or a second phone confirming at once.
      const claimed = await tx.dairyDelivery.updateMany({ where: { id, status: before.status }, data: { status: 'DELIVERED' } });
      if (claimed.count === 0) throw new BadRequestException('Delivery abhi badli gayi — page refresh karein');

      const { amount, credit } = await this.postBill(tx, user, scope, before, qty, paid, dto.paymentMethod);
      const paidNow = r2(amount - credit);
      const updated = await tx.dairyDelivery.update({
        where: { id },
        data: {
          deliveredQty: qty,
          returnedQty: Math.max(Number(dto.returnedQty) || 0, 0),
          totalAmount: amount,
          paidAmount: paidNow,
          isPaid: credit <= 0.009,
          status: 'DELIVERED',
          skipReason: null,
          deliveredAt: new Date(),
          containerReturned: !!dto.containerReturned,
          customerSignature: dto.customerSignature,
          ...(dto.notes !== undefined && { notes: dto.notes }),
          deliveredByStaffId: user.id,
        },
      });
      await tx.dairyCustomer.update({
        where: { id: before.dairyCustomerId },
        data: {
          currentBalance: { increment: credit },
          totalPurchases: { increment: amount },
          ...(paidNow > 0 && { totalPayments: { increment: paidNow }, lastPaymentDate: new Date() }),
          totalDeliveries: { increment: 1 },
          ...(before.status === 'SKIPPED' && { missedDeliveries: { decrement: 1 } }),
          lastDeliveryDate: new Date(),
        },
      });
      return updated;
    }, { timeout: 20_000 });
  }

  /** Marks every pending delivery of a day, slot and route as delivered at its fixed quantity. */
  async confirmAll(user: AuthenticatedUser, scope: ShopScope, dto: ConfirmAllDto) {
    const date = parseDay(dto.date) ?? new Date();
    const pending = await this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId, status: 'SCHEDULED', deliveryDate: { gte: dayStart(date), lte: dayEnd(date) },
        ...(dto.slot && { slot: dto.slot }), ...(dto.routeId && { routeId: dto.routeId }),
        ...(dto.ids?.length && { id: { in: dto.ids } }),
      },
      select: { id: true, scheduledQty: true },
      take: 500,
    });
    let done = 0;
    const failed: Array<{ id: string; reason: string }> = [];
    for (const p of pending) {
      try {
        await this.confirmDelivery(user, scope, p.id, { deliveredQty: p.scheduledQty });
        done++;
      } catch (e) {
        failed.push({ id: p.id, reason: (e as Error).message });
      }
    }
    return { total: pending.length, done, failed };
  }

  async skipDelivery(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UndoDeliveryDto) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (d.status === 'SKIPPED') return d;
    if (d.status === 'CANCELLED') throw new BadRequestException('Ye delivery cancel ho chuki hai');
    const reason = dto.reason?.trim() || 'Naga';
    if (d.status === 'DELIVERED') {
      await this.undoDelivered(user, scope, d, { status: 'SKIPPED', skipReason: reason }, dto.managerPin);
      return this.prisma.dairyDelivery.findUniqueOrThrow({ where: { id } });
    }
    return this.prisma.$transaction(async (tx) => {
      const ok = await tx.dairyDelivery.updateMany({ where: { id, status: d.status }, data: { status: 'SKIPPED', skipReason: reason } });
      if (!ok.count) throw new BadRequestException('Delivery abhi badli gayi — page refresh karein');
      await tx.dairyCustomer.update({ where: { id: d.dairyCustomerId }, data: { missedDeliveries: { increment: 1 } } });
      return tx.dairyDelivery.findUniqueOrThrow({ where: { id } });
    });
  }

  async cancelDelivery(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UndoDeliveryDto) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery nahi mili');
    if (d.status === 'CANCELLED') return d;
    if (d.status === 'DELIVERED') {
      await this.undoDelivered(user, scope, d, { status: 'CANCELLED', skipReason: dto.reason?.trim() || null }, dto.managerPin);
      return this.prisma.dairyDelivery.findUniqueOrThrow({ where: { id } });
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.dairyDelivery.update({ where: { id }, data: { status: 'CANCELLED', ...(dto.reason?.trim() && { skipReason: dto.reason.trim() }) } });
      if (d.status === 'SKIPPED') await tx.dairyCustomer.update({ where: { id: d.dairyCustomerId }, data: { missedDeliveries: { decrement: 1 } } });
      return tx.dairyDelivery.findUniqueOrThrow({ where: { id } });
    });
  }

  async todaysDeliveries(user: AuthenticatedUser, slot?: string, routeId?: string) {
    return this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        deliveryDate: { gte: dayStart(), lte: dayEnd() },
        ...(slot && slot in DairyDeliverySlot && { slot: slot as DairyDeliverySlot }),
        ...(routeId && { routeId }),
      },
      include: { customer: { include: { route: true } } },
      orderBy: [{ status: 'asc' }, { slot: 'asc' }],
    });
  }

  async dailySummary(user: AuthenticatedUser, date?: string) {
    const start = dayStart(date);
    const end = dayEnd(date);

    const deliveries = await this.prisma.dairyDelivery.findMany({
      where: { tenantId: user.tenantId, deliveryDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    });

    const delivered = deliveries.filter((x) => x.status === 'DELIVERED');
    const morning = delivered.filter((x) => x.slot === 'MORNING');
    const evening = delivered.filter((x) => x.slot === 'EVENING');
    const skipped = deliveries.filter((x) => x.status === 'SKIPPED');
    const pending = deliveries.filter((x) => x.status === 'SCHEDULED');

    return {
      date: dayKey(start),
      totalDeliveries: deliveries.length,
      totalLiters: r3(delivered.reduce((s, x) => s + x.deliveredQty, 0)),
      totalRevenue: r2(delivered.reduce((s, x) => s + x.totalAmount, 0)),
      collected: r2(delivered.reduce((s, x) => s + x.paidAmount, 0)),
      deliveredCount: delivered.length,
      skippedCount: skipped.length,
      pendingCount: pending.length,
      pendingLiters: r3(pending.reduce((s, x) => s + x.scheduledQty, 0)),
      morningLiters: r3(morning.reduce((s, x) => s + x.deliveredQty, 0)),
      eveningLiters: r3(evening.reduce((s, x) => s + x.deliveredQty, 0)),
    };
  }
}
