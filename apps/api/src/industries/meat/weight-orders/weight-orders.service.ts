import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MeatOrderStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { ensureCustomer } from '../../_shared/industry-sale.helper';
import { dayEnd, dayKey, dayRange, dayStart } from '../meat-common';
import {
  checkRefundPin, findOrderBill, mustChange, orderNote, payMethod, positive, r2, r3, recordMoney, refundAdvance, str, takeAdvance, withNextNumber,
} from '../meat-money';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
type Body = any;

/** Work steps before hand-over; "delivered" comes only from the bill. */
const OPEN: MeatOrderStatus[] = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'CUTTING', 'PACKED', 'READY', 'OUT_FOR_DELIVERY'];
const CLOSED: MeatOrderStatus[] = ['DELIVERED', 'CANCELLED'];
const LABEL = 'Gosht order';
/** Orders made from a subscription carry this in `occasion`. */
export const SUB_PREFIX = 'Subscription ';

export type OrderTab = 'all' | 'open' | 'today' | 'ready' | 'delivery' | 'delivered' | 'cancelled';
const TABS: OrderTab[] = ['all', 'open', 'today', 'ready', 'delivery', 'delivered', 'cancelled'];

const paymentStatusOf = (paid: number, total: number) => (paid <= 0.005 ? 'UNPAID' : paid >= total - 0.005 ? 'PAID' : 'PARTIALLY_PAID');

interface Line {
  productId: string; productName: string; cutCategory: never | null; requestedKg: number; actualKg: number | null;
  pricePerKg: number; total: number; cuttingInstructions: string | null; packagingNotes: string | null; displayOrder: number;
}

/**
 * Orders by weight: a family's Eid order, a restaurant's daily order, a
 * home delivery. Money taken before the bill is an advance on the
 * customer's khata (it reaches the drawer that day). The hand-over is a
 * normal bill with the actual kg of each line (stock out, sales, profit),
 * noted "Order <number>"; voiding that bill opens the order again.
 */
@Injectable()
export class WeightOrdersService {
  constructor(private readonly prisma: PrismaService, private readonly sales: SalesService) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: Body) {
    const items = await this.lines(user.tenantId, dto?.items);
    const subtotal = r2(items.reduce((s, l) => s + l.total, 0));
    const deliveryCharges = r2(Math.max(Number(dto?.deliveryCharges) || 0, 0));
    const discount = r2(Math.max(Number(dto?.discount) || 0, 0));
    if (discount > subtotal + deliveryCharges) throw new BadRequestException('Discount order se zyada nahi ho sakta');
    const total = r2(subtotal + deliveryCharges - discount);
    const isDelivery = !!dto?.isDelivery;
    const deliveryAddress = str(dto?.deliveryAddress, 1000);
    if (isDelivery && !deliveryAddress) throw new BadRequestException('Delivery ka pata likhein');
    const customerName = str(dto?.customerName, 120);
    const customerPhone = str(dto?.customerPhone, 30);
    const customerId = str(dto?.customerId);
    if (customerId) await this.mustCustomer(user, customerId);
    if (!customerId && !customerName && !customerPhone) throw new BadRequestException('Customer chunein ya naam / phone likhein');
    const advance = r2(Math.max(Number(dto?.advance) || 0, 0));
    if (advance > total + 0.005) throw new BadRequestException(`Advance order (${total}) se zyada nahi ho sakta`);
    const method = advance > 0 ? payMethod(dto?.paymentMethod) : null;
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto?.shopId);
    const neededBy = this.when(dto?.neededBy, 'Kab chahiye — tareekh theek nahi');
    const year = dayKey().slice(0, 4);

    return withNextNumber(
      async (prefix) => (await this.prisma.meatWeightOrder.findFirst({ where: { tenantId: user.tenantId, orderNumber: { startsWith: prefix } }, orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } }))?.orderNumber,
      `MW-${year}-`, 4,
      (orderNumber) => this.prisma.$transaction(async (tx) => {
        const holder = advance > 0
          ? await takeAdvance(tx, user, { reference: orderNumber, label: LABEL, amount: advance, method, customerId, name: customerName, phone: customerPhone, shopId })
          : customerId;
        const order = await tx.meatWeightOrder.create({
          data: {
            tenantId: user.tenantId, shopId, orderNumber, customerId: holder ?? null, customerName, customerPhone,
            neededBy, scheduledDelivery: this.when(dto?.scheduledDelivery, 'Delivery ka waqt theek nahi'),
            isDelivery, deliveryAddress, deliveryCharges, occasion: str(dto?.occasion, 120), specialInstructions: str(dto?.specialInstructions, 2000),
            subtotal, taxAmount: 0, discount, total, paidAmount: advance, paymentStatus: paymentStatusOf(advance, total),
            cuttingStyle: str(dto?.cuttingStyle, 120), packagingPref: str(dto?.packagingPref, 120),
            numberOfPackets: Number(dto?.numberOfPackets) > 0 ? Math.round(Number(dto.numberOfPackets)) : null,
            status: 'CONFIRMED', createdById: user.id, items: { create: items },
          },
          include: { items: { orderBy: { displayOrder: 'asc' } } },
        });
        return order;
      }, { timeout: 20_000 }),
    );
  }

  /** Array of orders (dashboard, older callers). */
  async list(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.meatWeightOrder.findMany({
      where: {
        ...this.base(user, scope, params.search, params.from, params.to),
        ...(params.status && OPEN.concat(CLOSED).includes(params.status as MeatOrderStatus) && { status: params.status as MeatOrderStatus }),
        ...(params.customerId && { customerId: params.customerId }),
      },
      include: { items: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  /** One page of a tab, with counts for every tab and the open money. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: Record<string, string | undefined>) {
    const tab: OrderTab = TABS.includes(q.tab as OrderTab) ? (q.tab as OrderTab) : 'open';
    const page = Math.max(Number(q.page) || 1, 1);
    const limit = Math.min(Math.max(Number(q.limit) || 25, 1), 100);
    const base = this.base(user, scope, q.search, q.from, q.to);
    const where = (t: OrderTab): Prisma.MeatWeightOrderWhereInput => ({ ...base, ...this.tabWhere(t) });
    const [items, total, counts, open] = await Promise.all([
      this.prisma.meatWeightOrder.findMany({
        where: where(tab), include: { items: { orderBy: { displayOrder: 'asc' } } },
        orderBy: tab === 'delivered' || tab === 'cancelled' || tab === 'all' ? { createdAt: 'desc' } : [{ neededBy: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.meatWeightOrder.count({ where: where(tab) }),
      Promise.all(TABS.map((t) => this.prisma.meatWeightOrder.count({ where: where(t) }))),
      this.prisma.meatWeightOrder.aggregate({ where: where('open'), _sum: { total: true, paidAmount: true } }),
    ]);
    return {
      items, total, page, limit,
      counts: Object.fromEntries(TABS.map((t, i) => [t, counts[i]])) as Record<OrderTab, number>,
      openValue: r2(open._sum.total), advances: r2(open._sum.paidAmount),
    };
  }

  /** Order behind each of these bills, for the sales history. */
  async bySales(user: AuthenticatedUser, saleIds: string[]) {
    const ids = saleIds.filter(Boolean).slice(0, 200);
    if (!ids.length) return {};
    const lines = await this.prisma.saleItem.findMany({
      where: { saleId: { in: ids }, note: { startsWith: orderNote('MW-') }, sale: { tenantId: user.tenantId } },
      select: { saleId: true, note: true },
      distinct: ['saleId'],
    });
    const numbers = lines.map((l) => (l.note ?? '').slice(orderNote('').length).trim());
    const orders = await this.prisma.meatWeightOrder.findMany({
      where: { tenantId: user.tenantId, orderNumber: { in: numbers } },
      select: { id: true, orderNumber: true, isDelivery: true, occasion: true },
    });
    const byNumber = new Map(orders.map((o) => [o.orderNumber, o]));
    return Object.fromEntries(lines.map((l, i) => [l.saleId, byNumber.get(numbers[i]) ?? null]).filter(([, o]) => o));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.mustFind(user, id);
    return { ...o, ...(await recordMoney(this.prisma, user.tenantId, o.orderNumber, o.paidAmount)) };
  }

  async bill(user: AuthenticatedUser, id: string) {
    const o = await this.mustFind(user, id);
    return findOrderBill(this.prisma, user.tenantId, o.orderNumber);
  }

  /** Details and lines of an open order; money received stays as it is. */
  async update(user: AuthenticatedUser, id: string, dto: Body) {
    const o = await this.mustFind(user, id);
    if (CLOSED.includes(o.status)) throw new BadRequestException('De diya ya cancel order badla nahi ja sakta');
    const data: Prisma.MeatWeightOrderUpdateManyMutationInput = {};
    for (const k of ['customerName', 'customerPhone', 'deliveryAddress', 'occasion', 'specialInstructions', 'cuttingStyle', 'packagingPref'] as const) {
      if (dto?.[k] !== undefined) data[k] = str(dto[k], k === 'specialInstructions' || k === 'deliveryAddress' ? 2000 : 120);
    }
    if (dto?.customerId !== undefined) {
      const cid = str(dto.customerId);
      if (cid) await this.mustCustomer(user, cid);
      if (o.paidAmount > 0 && cid !== o.customerId) throw new BadRequestException('Advance is customer ke khate par hai — customer nahi badla ja sakta');
      data.customerId = cid;
    }
    if (dto?.neededBy !== undefined) data.neededBy = this.when(dto.neededBy, 'Kab chahiye — tareekh theek nahi');
    if (dto?.scheduledDelivery !== undefined) data.scheduledDelivery = this.when(dto.scheduledDelivery, 'Delivery ka waqt theek nahi');
    if (dto?.isDelivery !== undefined) data.isDelivery = !!dto.isDelivery;
    if (dto?.numberOfPackets !== undefined) data.numberOfPackets = Number(dto.numberOfPackets) > 0 ? Math.round(Number(dto.numberOfPackets)) : null;
    const isDelivery = dto?.isDelivery !== undefined ? !!dto.isDelivery : o.isDelivery;
    const address = dto?.deliveryAddress !== undefined ? str(dto.deliveryAddress) : o.deliveryAddress;
    if (isDelivery && !address) throw new BadRequestException('Delivery ka pata likhein');

    const items = dto?.items !== undefined ? await this.lines(user.tenantId, dto.items) : null;
    const subtotal = items ? r2(items.reduce((s, l) => s + l.total, 0)) : o.subtotal;
    const deliveryCharges = dto?.deliveryCharges !== undefined ? r2(Math.max(Number(dto.deliveryCharges) || 0, 0)) : o.deliveryCharges;
    const discount = dto?.discount !== undefined ? r2(Math.max(Number(dto.discount) || 0, 0)) : o.discount;
    if (discount > subtotal + deliveryCharges) throw new BadRequestException('Discount order se zyada nahi ho sakta');
    const total = r2(subtotal + deliveryCharges - discount);
    if (total + 0.005 < o.paidAmount) throw new BadRequestException(`${o.paidAmount} advance mil chuka hai — order is se kam nahi ho sakta`);
    Object.assign(data, { subtotal, deliveryCharges, discount, total, paymentStatus: paymentStatusOf(o.paidAmount, total) });

    await this.prisma.$transaction(async (tx) => {
      const done = await tx.meatWeightOrder.updateMany({ where: { id, tenantId: user.tenantId, updatedAt: o.updatedAt }, data });
      mustChange(done.count);
      if (items) {
        await tx.meatWeightOrderItem.deleteMany({ where: { orderId: id } });
        await tx.meatWeightOrderItem.createMany({ data: items.map((l) => ({ ...l, orderId: id })) });
      }
    });
    return this.getOne(user, id);
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    const o = await this.mustFind(user, id);
    if (status === o.status) return o;
    if (status === 'DELIVERED') throw new BadRequestException('"De diya" bill banane se hota hai — order par "Bill banayein" dabayein');
    if (o.status === 'DELIVERED') throw new BadRequestException('Order de diya ja chuka — bill void karne se hi wapas khulta hai');
    const patch: Prisma.MeatWeightOrderUpdateManyMutationInput = {};
    if (status === 'CANCELLED') {
      const why = str(reason, 300);
      if (!why) throw new BadRequestException('Cancel ki wajah likhein');
      Object.assign(patch, { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: why });
    } else if (OPEN.includes(status as MeatOrderStatus)) {
      Object.assign(patch, { status: status as MeatOrderStatus, ...(o.status === 'CANCELLED' && { cancelledAt: null, cancellationReason: null }) });
    } else {
      throw new BadRequestException('Ye halat nahi chal sakti');
    }
    const done = await this.prisma.meatWeightOrder.updateMany({ where: { id, tenantId: user.tenantId, status: o.status }, data: patch });
    mustChange(done.count);
    return this.getOne(user, id);
  }

  /** Kg weighed on the scale for each line; the order total follows. */
  async updateActualWeights(user: AuthenticatedUser, id: string, rows: Array<{ itemId: string; actualKg: number }>) {
    const o = await this.mustFind(user, id);
    if (CLOSED.includes(o.status)) throw new BadRequestException('De diya ya cancel order ka wazan nahi badla ja sakta');
    if (!Array.isArray(rows) || !rows.length) throw new BadRequestException('Wazan likhein');
    const byId = new Map(o.items.map((i) => [i.id, i]));
    for (const r of rows) {
      if (!byId.has(r?.itemId)) throw new BadRequestException('Ek line is order ki nahi');
      if (!(Number(r.actualKg) >= 0)) throw new BadRequestException('Wazan theek likhein');
    }
    const kg = new Map(rows.map((r) => [r.itemId, r3(Number(r.actualKg))]));
    const lineTotal = (i: (typeof o.items)[number]) => r2((kg.get(i.id) ?? i.actualKg ?? i.requestedKg) * i.pricePerKg);
    const subtotal = r2(o.items.reduce((s, i) => s + lineTotal(i), 0));
    const total = r2(Math.max(subtotal + o.deliveryCharges - o.discount, 0));
    if (total + 0.005 < o.paidAmount) throw new BadRequestException(`${o.paidAmount} advance mil chuka hai — wazan ke baad order is se kam ban raha hai`);
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.meatWeightOrder.updateMany({ where: { id, tenantId: user.tenantId, updatedAt: o.updatedAt }, data: { subtotal, total, paymentStatus: paymentStatusOf(o.paidAmount, total) } });
      mustChange(done.count);
      for (const i of o.items) {
        if (!kg.has(i.id)) continue;
        await tx.meatWeightOrderItem.update({ where: { id: i.id }, data: { actualKg: kg.get(i.id), total: lineTotal(i) } });
      }
    });
    return this.getOne(user, id);
  }

  /** Advance or later payment before the bill; held on the customer's khata. */
  async addPayment(user: AuthenticatedUser, scope: ShopScope, id: string, body: Body) {
    const amount = r2(positive(body?.amount, 'Amount likhein'));
    const o = await this.mustFind(user, id);
    if (CLOSED.includes(o.status)) throw new BadRequestException(o.status === 'DELIVERED' ? 'Order de diya ja chuka — baqi paisa customer ke khate se lein' : 'Cancel order par paisa nahi liya ja sakta');
    if (body?.expectedPaid !== undefined && Math.abs(Number(body.expectedPaid) - o.paidAmount) > 0.005) throw new BadRequestException('Ye paisa pehle hi darj ho chuka hai — safha taaza karein');
    const paid = r2(o.paidAmount + amount);
    if (paid > o.total + 0.005) throw new BadRequestException(`Baqi sirf ${r2(o.total - o.paidAmount)} hai`);
    const method = payMethod(body?.paymentMethod);
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.meatWeightOrder.updateMany({ where: { id, tenantId: user.tenantId, paidAmount: o.paidAmount, status: o.status }, data: { paidAmount: paid, paymentStatus: paymentStatusOf(paid, o.total) } });
      mustChange(done.count);
      const customerId = await takeAdvance(tx, user, { reference: o.orderNumber, label: LABEL, amount, method, customerId: o.customerId, name: o.customerName, phone: o.customerPhone, shopId: scope.shopId ?? o.shopId });
      if (customerId !== o.customerId) await tx.meatWeightOrder.updateMany({ where: { id, tenantId: user.tenantId }, data: { customerId } });
    });
    return this.getOne(user, id);
  }

  /** Cash back of the unused advance of a cancelled order (refund PIN rule applies). */
  async refund(user: AuthenticatedUser, scope: ShopScope, id: string, managerPin?: string) {
    const o = await this.mustFind(user, id);
    if (o.status !== 'CANCELLED') throw new BadRequestException('Advance sirf cancel order ka wapas hota hai');
    await checkRefundPin(this.prisma, user, managerPin);
    await this.prisma.$transaction(async (tx) => {
      const amount = await refundAdvance(tx, user, { reference: o.orderNumber, label: LABEL, customerId: o.customerId, paidAmount: o.paidAmount, shopId: scope.shopId ?? o.shopId });
      const paid = r2(Math.max(o.paidAmount - amount, 0));
      const done = await tx.meatWeightOrder.updateMany({ where: { id, tenantId: user.tenantId, paidAmount: o.paidAmount }, data: { paidAmount: paid, paymentStatus: paymentStatusOf(paid, o.total) } });
      mustChange(done.count);
    });
    return this.getOne(user, id);
  }

  /**
   * Marks the order handed over once its bill exists. `paidNow` is the money
   * taken with the bill (the bill itself recorded it).
   */
  async delivered(user: AuthenticatedUser, id: string, body: Body) {
    const o = await this.mustFind(user, id);
    const bill = await findOrderBill(this.prisma, user.tenantId, o.orderNumber);
    if (!bill) throw new BadRequestException('Is order ka bill nahi mila — pehle bill banayein');
    if (o.status === 'DELIVERED') return this.getOne(user, id);
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order de diya nahi ho sakta');
    const paidNow = r2(Math.max(Number(body?.paidNow) || 0, 0));
    const paid = r2(Math.min(o.paidAmount + paidNow, Math.max(o.total, bill.total)));
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.meatWeightOrder.updateMany({
        where: { id, tenantId: user.tenantId, status: o.status },
        data: { status: 'DELIVERED', deliveredAt: new Date(), total: bill.total, paidAmount: paid, paymentStatus: paymentStatusOf(paid, bill.total) },
      });
      mustChange(done.count);
      if (o.occasion?.startsWith(SUB_PREFIX)) {
        const number = o.occasion.slice(SUB_PREFIX.length).trim();
        await tx.meatSubscription.updateMany({
          where: { tenantId: user.tenantId, subscriptionNumber: number },
          data: { totalDeliveries: { increment: 1 }, totalRevenue: { increment: bill.total }, lastDeliveryDate: new Date() },
        });
      }
    });
    return this.getOne(user, id);
  }

  /**
   * Hand-over: the order becomes a normal counter bill with the weighed kg
   * of each line (stock out, sales, profit, cash register). `payments` is
   * the money taken now (cash, card, wallet; split allowed); the rest goes
   * on the customer's khata, where the advance already held cancels it.
   */
  async checkout(user: AuthenticatedUser, scope: ShopScope, id: string, body: Body) {
    const o = await this.mustFind(user, id);
    if (o.status === 'DELIVERED') throw new BadRequestException('Is order ka bill pehle ban chuka hai');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order ka bill nahi banta');
    if (body?.expectedTotal !== undefined && Math.abs(Number(body.expectedTotal) - o.total) > 0.005) throw new BadRequestException('Order abhi badla hai — safha taaza kar ke dobara bill banayein');
    if (await findOrderBill(this.prisma, user.tenantId, o.orderNumber)) return this.delivered(user, id, {});

    const parts: Array<{ method: PaymentMethod; amount: number }> = [];
    for (const p of Array.isArray(body?.payments) ? body.payments : []) {
      const amount = r2(Number(p?.amount));
      if (!(amount > 0)) continue;
      const method = payMethod(p?.method) as PaymentMethod;
      const row = parts.find((x) => x.method === method);
      if (row) row.amount = r2(row.amount + amount); else parts.push({ method, amount });
    }
    parts.sort((a, b) => b.amount - a.amount);
    const paidNow = r2(parts.reduce((s, p) => s + p.amount, 0));
    const { khataPaid, legacyPaid } = await recordMoney(this.prisma, user.tenantId, o.orderNumber, o.paidAmount);
    const due = r2(o.total - khataPaid - legacyPaid);
    if (paidNow > Math.max(due, 0) + 0.005) throw new BadRequestException(`Baqi sirf ${Math.max(due, 0)} hai`);
    const credit = r2(o.total - paidNow - legacyPaid);

    let customerId = o.customerId;
    if (!customerId && credit > 0.005) {
      if (!o.customerName && !o.customerPhone) throw new BadRequestException('Baqi paisa khate me jayega — order par customer ka naam ya phone likhein');
      customerId = await ensureCustomer(this.prisma, user, { name: o.customerName, phone: o.customerPhone, shopId: o.shopId });
    }
    const shopId = o.shopId ?? (await resolveWriteShopId(this.prisma, user.tenantId, scope, null));
    const note = orderNote(o.orderNumber);
    // Money noted on the order before khata posting existed counts as paid with the bill.
    const money = legacyPaid > 0 ? [...parts, { method: 'CASH' as PaymentMethod, amount: legacyPaid }] : parts;

    await this.sales.create(user, new ShopScope(shopId, false), {
      shopId, customerId: customerId ?? undefined,
      paymentMethod: money[0]?.method ?? 'CASH',
      paidAmount: r2(paidNow + legacyPaid),
      payments: money.length > 1 ? money : undefined,
      discount: o.discount > 0 ? o.discount : undefined,
      allowCredit: credit > 0.005 ? true : undefined,
      managerPin: str(body?.managerPin) ?? undefined,
      note: [note, o.isDelivery ? o.deliveryAddress : null].filter(Boolean).join(' · '),
      serviceCharges: o.deliveryCharges > 0 ? [{ type: 'DELIVERY', label: 'Delivery charge', amount: o.deliveryCharges }] : undefined,
      items: o.items.map((i) => ({
        // The void listener and the bill lookup find the order by this exact note.
        productId: i.productId, quantity: r3(i.actualKg ?? i.requestedKg), priceOverride: i.pricePerKg, note,
      })),
    } as Parameters<SalesService['create']>[2]);
    if (customerId !== o.customerId) await this.prisma.meatWeightOrder.updateMany({ where: { id, tenantId: user.tenantId }, data: { customerId } });
    return this.delivered(user, id, { paidNow });
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private base(user: AuthenticatedUser, scope: ShopScope, search?: string, from?: string, to?: string): Prisma.MeatWeightOrderWhereInput {
    const range = dayRange(from, to);
    const s = search?.trim();
    return {
      tenantId: user.tenantId,
      ...(scope.shopId && { OR: [{ shopId: scope.shopId }, { shopId: null }] }),
      ...(range && { orderDate: range }),
      ...(s && {
        AND: [{
          OR: [
            { orderNumber: { contains: s, mode: 'insensitive' } },
            { customerName: { contains: s, mode: 'insensitive' } },
            { customerPhone: { contains: s } },
            { deliveryAddress: { contains: s, mode: 'insensitive' } },
            { items: { some: { productName: { contains: s, mode: 'insensitive' } } } },
          ],
        }],
      }),
    };
  }

  private tabWhere(tab: OrderTab): Prisma.MeatWeightOrderWhereInput {
    switch (tab) {
      case 'open': return { status: { in: OPEN } };
      case 'today': return { status: { in: OPEN }, neededBy: { lte: dayEnd() } };
      case 'ready': return { status: { in: ['PACKED', 'READY'] } };
      case 'delivery': return { status: { in: OPEN }, isDelivery: true };
      case 'delivered': return { status: 'DELIVERED' };
      case 'cancelled': return { status: 'CANCELLED' };
      default: return {};
    }
  }

  private when(v: unknown, message: string): Date | null {
    if (v === undefined || v === null || v === '') return null;
    const s = String(v);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? dayStart(s) : new Date(s);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(message);
    return d;
  }

  private async lines(tenantId: string, raw: unknown): Promise<Line[]> {
    if (!Array.isArray(raw) || !raw.length) throw new BadRequestException('Kam se kam ek item likhein');
    if (raw.length > 60) throw new BadRequestException('Ek order me 60 se zyada line nahi');
    const ids = [...new Set(raw.map((r: Body) => String(r?.productId ?? '')).filter(Boolean))];
    if (ids.length !== new Set(raw.map((r: Body) => String(r?.productId ?? ''))).size || raw.some((r: Body) => !r?.productId)) {
      throw new BadRequestException('Har line me apna item chunein');
    }
    const [products, profiles] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: ids }, isActive: true }, select: { id: true, name: true, price: true } }),
      this.prisma.meatProductProfile.findMany({ where: { tenantId, productId: { in: ids } }, select: { productId: true, cutCategory: true } }),
    ]);
    const P = new Map(products.map((p) => [p.id, p]));
    const C = new Map(profiles.map((p) => [p.productId, p.cutCategory]));
    return raw.map((r: Body, i: number) => {
      const p = P.get(String(r.productId));
      if (!p) throw new NotFoundException(`Line ${i + 1}: item nahi mila ya band hai`);
      const kg = r3(positive(r.requestedKg, `${p.name}: kitne kg — likhein`));
      const rate = r.pricePerKg === undefined || r.pricePerKg === null || r.pricePerKg === '' ? p.price : Number(r.pricePerKg);
      if (!(rate > 0)) throw new BadRequestException(`${p.name}: rate likhein`);
      const actualKg = Number(r.actualKg) > 0 ? r3(Number(r.actualKg)) : null;
      return {
        productId: p.id, productName: p.name, cutCategory: (C.get(p.id) ?? null) as never, requestedKg: kg, actualKg,
        pricePerKg: r2(rate), total: r2((actualKg ?? kg) * rate),
        cuttingInstructions: str(r.cuttingInstructions, 300), packagingNotes: str(r.packagingNotes, 300), displayOrder: i,
      };
    });
  }

  private async mustCustomer(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
  }

  private async mustFind(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.meatWeightOrder.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: { orderBy: { displayOrder: 'asc' } } } });
    if (!o) throw new NotFoundException('Order nahi mila');
    return o;
  }
}
