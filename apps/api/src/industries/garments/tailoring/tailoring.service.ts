/**
 * Stitching orders: booking with measurements and an advance, the work
 * steps, payments before delivery (held on the customer's khata) and the
 * bill on delivery. Fabric taken from the shop's own stock leaves stock
 * with that bill.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GarmentOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId, toPaymentMethod,
} from '../../_shared/industry-sale.helper';
import {
  DAY_MS, findBill, garmentClock, ownCustomer, ownProduct, opt, paging, parseDay, payStatus, personNames, r2, withNextNumber,
} from '../common/garments-common';
import { AddPaymentDto, CreateTailoringOrderDto, UpdateOrderStatusDto, UpdateTailoringOrderDto } from './dto/create-tailoring-order.dto';

type Db = Prisma.TransactionClient;
type ItemInput = CreateTailoringOrderDto['items'][number];

/** Orders that can no longer change. */
const CLOSED: GarmentOrderStatus[] = ['DELIVERED', 'CANCELLED'];
const VIEWS = ['active', 'today', 'tomorrow', 'late', 'trial', 'ready', 'unpaid', 'done', 'all'] as const;
type View = (typeof VIEWS)[number];

const due = (o: { total: number; paidAmount: number }) => r2(Math.max(Number(o.total) - Number(o.paidAmount), 0));

export interface TailoringQuery {
  view?: string; page?: string; limit?: string; search?: string; from?: string; to?: string;
  priority?: string; tailorId?: string; sort?: string; customerId?: string;
}

@Injectable()
export class TailoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly sales: SalesService,
  ) {}

  /** Line totals: stitching, embroidery and accessories are per piece; fabric is for the whole line. */
  private price(items: ItemInput[], snapshot: unknown) {
    const t = { subtotal: 0, stitching: 0, embroidery: 0, fabric: 0, accessory: 0 };
    const lines = items.map((it) => {
      const q = Math.max(Math.floor(Number(it.quantity) || 1), 1);
      const stitching = r2((it.stitchingCost ?? 0) * q);
      const embroidery = r2((it.embroideryCost ?? 0) * q);
      const fabric = r2(it.fabricCost ?? 0);
      const accessory = r2((it.accessoryCost ?? 0) * q);
      const total = r2(stitching + embroidery + fabric + accessory);
      t.subtotal += total; t.stitching += stitching; t.embroidery += embroidery; t.fabric += fabric; t.accessory += accessory;
      return {
        productId: opt(it.productId), variantId: opt(it.variantId), garmentName: it.garmentName.trim(), categoryType: it.categoryType,
        quantity: q, fabricProductId: opt(it.fabricProductId), fabricVariantId: opt(it.fabricVariantId),
        fabricMeters: it.fabricMeters ?? null, fabricCost: fabric, stitchingCost: stitching, embroideryCost: embroidery,
        accessoryCost: accessory, total, size: opt(it.size), colorName: opt(it.colorName), designNotes: opt(it.designNotes),
        measurementSnapshot: (snapshot ?? it.measurementSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
        referenceImageUrls: it.referenceImageUrls ?? [],
      };
    });
    return { lines, totals: { subtotal: r2(t.subtotal), stitching: r2(t.stitching), embroidery: r2(t.embroidery), fabric: r2(t.fabric), accessory: r2(t.accessory) } };
  }

  /** Checks links (customer, measurement, fabric) belong to this shop; returns the measurement snapshot. */
  private async checkLinks(user: AuthenticatedUser, dto: { customerId?: string; measurementProfileId?: string; items?: ItemInput[] }) {
    const customer = await ownCustomer(this.prisma as unknown as Db, user, opt(dto.customerId));
    let snapshot: unknown = null;
    if (opt(dto.measurementProfileId)) {
      const profile = await this.prisma.garmentMeasurementProfile.findFirst({ where: { id: dto.measurementProfileId, tenantId: user.tenantId } });
      if (!profile) throw new NotFoundException('Naap nahi mila');
      if (customer && profile.customerId !== customer.id) throw new BadRequestException('Ye naap is customer ka nahi');
      snapshot = profile;
    }
    for (const it of dto.items ?? []) {
      if (!it.garmentName?.trim()) throw new BadRequestException('Har kapre ka naam likhein');
      if (opt(it.fabricProductId)) {
        await ownProduct(this.prisma as unknown as Db, user, it.fabricProductId!, opt(it.fabricVariantId));
        if (!(Number(it.fabricMeters) > 0)) throw new BadRequestException(`"${it.garmentName}" — dukaan ka kapra kitne meter lagega, likhein`);
      }
    }
    return { customer, snapshot };
  }

  async create(user: AuthenticatedUser, dto: CreateTailoringOrderDto, activeShopId?: string | null) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const { customer, snapshot } = await this.checkLinks(user, dto);
    const name = opt(dto.customerName) ?? customer?.name;
    if (!name && !customer) throw new BadRequestException('Customer ka naam likhein');
    const { lines, totals } = this.price(dto.items, snapshot);
    const tax = r2(dto.taxAmount ?? 0);
    const discount = r2(dto.discount ?? 0);
    if (discount > totals.subtotal + tax) throw new BadRequestException('Discount kul amount se zyada nahi ho sakta');
    const total = r2(Math.max(totals.subtotal + tax - discount, 0));
    const advance = r2(dto.advanceAmount ?? 0);
    if (advance > total + 0.01) throw new BadRequestException(`Advance kul amount (Rs ${total}) se zyada nahi ho sakta`);
    const promisedDate = parseDay(clock, dto.promisedDate);
    const shopId = await resolveIndustryShopId(this.prisma as unknown as Db, user, dto.shopId || activeShopId);

    const order = await withNextNumber(
      async (prefix) => (await this.prisma.garmentTailoringOrder.findFirst({
        where: { tenantId: user.tenantId, orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' }, select: { orderNumber: true },
      }))?.orderNumber,
      `TO-${clock.year()}-`,
      (orderNumber) => this.prisma.$transaction(async (tx) => {
        const created = await tx.garmentTailoringOrder.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            orderNumber,
            customerId: customer?.id ?? null,
            measurementProfileId: opt(dto.measurementProfileId) ?? null,
            customerName: name,
            customerPhone: opt(dto.customerPhone) ?? customer?.phone ?? undefined,
            customerNotes: opt(dto.customerNotes),
            orderStatus: dto.status ?? 'CONFIRMED',
            priority: dto.priority ?? 'NORMAL',
            collectionId: opt(dto.collectionId),
            tailorId: opt(dto.tailorId),
            designerId: opt(dto.designerId),
            promisedDate,
            subtotal: totals.subtotal,
            stitchingCharges: totals.stitching,
            embroideryCharges: totals.embroidery,
            fabricCharges: totals.fabric,
            accessoryCharges: totals.accessory,
            discount,
            taxAmount: tax,
            total,
            designReferenceUrls: dto.designReferenceUrls ?? [],
            designInstructions: opt(dto.designInstructions),
            internalNotes: opt(dto.internalNotes),
            items: { create: lines.map((l, idx) => ({ ...l, fabricMeters: l.fabricMeters ?? undefined, displayOrder: idx })) },
          },
        });
        if (advance > 0) await this.takePayment(tx, user, created, { amount: advance, paymentMethod: dto.advanceMethod ?? 'CASH', notes: 'Booking par advance' });
        return created;
      }),
    );
    return this.getOne(user, order.id);
  }

  /** Records money before delivery: a payment row plus the advance on the customer's khata. */
  private async takePayment(
    tx: Db, user: AuthenticatedUser,
    order: { id: string; orderNumber: string; shopId: string | null; customerId: string | null; customerName: string | null; customerPhone: string | null; paidAmount: number; total: number },
    p: { amount: number; paymentMethod: string; reference?: string; notes?: string },
  ) {
    await tx.garmentTailoringPayment.create({
      data: { orderId: order.id, amount: p.amount, paymentMethod: p.paymentMethod, reference: p.reference, notes: p.notes, receivedById: user.id },
    });
    const shopId = await resolveIndustryShopId(tx, user, order.shopId);
    const customerId = await ensureCustomer(tx, user, {
      customerId: order.customerId, name: order.customerName, phone: order.customerPhone, shopId,
    });
    await recordKhataPayment(tx, user, {
      customerId, shopId, amount: p.amount, method: p.paymentMethod, reference: order.orderNumber, note: `Silai advance ${order.orderNumber}`,
    });
    const paid = r2(Number(order.paidAmount) + p.amount);
    return tx.garmentTailoringOrder.update({
      where: { id: order.id },
      data: { paidAmount: paid, paymentStatus: payStatus(paid, Number(order.total)), customerId, shopId },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; priority?: string; customerId?: string; tailorId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.garmentTailoringOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { orderStatus: params.status as GarmentOrderStatus }),
        ...(params.priority && { priority: params.priority as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.tailorId && { tailorId: params.tailorId }),
        ...(params.from || params.to ? {
          orderDate: {
            ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
            ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
          },
        } : {}),
        ...this.searchWhere(params.search),
      },
      include: { items: { take: 3 }, payments: true },
      orderBy: [{ priority: 'desc' }, { promisedDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  private searchWhere(search?: string): Prisma.GarmentTailoringOrderWhereInput {
    const s = search?.trim();
    if (!s) return {};
    return {
      OR: [
        { orderNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { customerPhone: { contains: s } },
        { items: { some: { garmentName: { contains: s, mode: 'insensitive' } } } },
      ],
    };
  }

  /** One page of orders for a view (active, today, late…), with counts per view and money of the view. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: TailoringQuery) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const view: View = VIEWS.includes(q.view as View) ? (q.view as View) : 'active';
    const { page, limit } = paging(q);
    const range = clock.range(q.from, q.to);
    const base: Prisma.GarmentTailoringOrderWhereInput = {
      tenantId: user.tenantId,
      AND: [scope.whereLoose, this.searchWhere(q.search)],
      ...(q.priority && { priority: q.priority as never }),
      ...(q.tailorId && { tailorId: q.tailorId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(range && { promisedDate: range }),
    };
    // Whole lines: the list prints slips and shows money per garment.
    const include = { items: { orderBy: { displayOrder: 'asc' as const } } };
    const open = await this.prisma.garmentTailoringOrder.findMany({
      where: { ...base, orderStatus: { notIn: CLOSED } },
      include,
      orderBy: [{ promisedDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      take: 2000,
    });
    const today = clock.today();
    const tomorrow = { gte: today.lt, lt: new Date(today.lt.getTime() + DAY_MS) };
    const inRange = (d: Date | null, r: { gte: Date; lt: Date }) => !!d && d >= r.gte && d < r.lt;
    const views: Record<Exclude<View, 'done' | 'all'>, typeof open> = {
      active: open,
      today: open.filter((o) => inRange(o.promisedDate, today)),
      tomorrow: open.filter((o) => inRange(o.promisedDate, tomorrow)),
      late: open.filter((o) => !!o.promisedDate && o.promisedDate < today.gte && o.orderStatus !== 'READY'),
      trial: open.filter((o) => o.orderStatus === 'QUALITY_CHECK'),
      ready: open.filter((o) => o.orderStatus === 'READY'),
      unpaid: open.filter((o) => due(o) > 0.5),
    };
    const closedWhere: Prisma.GarmentTailoringOrderWhereInput = { ...base, orderStatus: { in: CLOSED } };
    const [doneCount, allCount] = await Promise.all([
      this.prisma.garmentTailoringOrder.count({ where: closedWhere }),
      this.prisma.garmentTailoringOrder.count({ where: base }),
    ]);
    const counts = {
      active: open.length, today: views.today.length, tomorrow: views.tomorrow.length, late: views.late.length,
      trial: views.trial.length, ready: views.ready.length, unpaid: views.unpaid.length, done: doneCount, all: allCount,
    };

    let items: typeof open;
    let total: number;
    if (view === 'done' || view === 'all') {
      const orderBy: Prisma.GarmentTailoringOrderOrderByWithRelationInput = q.sort === 'amount' ? { total: 'desc' } : q.sort === 'due' ? { promisedDate: 'desc' } : { createdAt: 'desc' };
      [items, total] = await Promise.all([
        this.prisma.garmentTailoringOrder.findMany({ where: view === 'done' ? closedWhere : base, include, orderBy, skip: (page - 1) * limit, take: limit }),
        Promise.resolve(view === 'done' ? doneCount : allCount),
      ]);
    } else {
      const list = [...views[view]];
      if (q.sort === 'amount') list.sort((a, b) => b.total - a.total);
      else if (q.sort === 'recent') list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      total = list.length;
      items = list.slice((page - 1) * limit, page * limit);
    }
    const names = await personNames(this.prisma as unknown as Db, user.tenantId, items.map((o) => o.tailorId));
    const shown = view === 'done' || view === 'all' ? null : views[view];
    return {
      items: items.map((o) => ({ ...o, tailorName: o.tailorId ? names.get(o.tailorId) ?? null : null })),
      total, page, pages: Math.max(Math.ceil(total / limit), 1), counts,
      totals: shown ? { value: r2(shown.reduce((s, o) => s + o.total, 0)), due: r2(shown.reduce((s, o) => s + due(o), 0)), advance: r2(shown.reduce((s, o) => s + o.paidAmount, 0)) } : null,
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('Order nahi mila');

    const [customer, measurementProfile, bill, names, fabrics] = await Promise.all([
      order.customerId ? this.prisma.customer.findFirst({ where: { id: order.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } }) : null,
      order.measurementProfileId ? this.prisma.garmentMeasurementProfile.findFirst({ where: { id: order.measurementProfileId, tenantId: user.tenantId } }) : null,
      findBill(this.prisma as unknown as Db, user.tenantId, order.orderNumber),
      personNames(this.prisma as unknown as Db, user.tenantId, [order.tailorId, ...order.payments.map((p) => p.receivedById)]),
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId, id: { in: order.items.map((i) => i.fabricProductId).filter((x): x is string => !!x) } },
        select: { id: true, name: true, unit: true },
      }),
    ]);
    const fabricName = new Map(fabrics.map((f) => [f.id, f.name]));
    return {
      ...order,
      items: order.items.map((i) => ({ ...i, fabricName: i.fabricProductId ? fabricName.get(i.fabricProductId) ?? null : null })),
      payments: order.payments.map((p) => ({ ...p, receivedByName: p.receivedById ? names.get(p.receivedById) ?? null : null })),
      tailorName: order.tailorId ? names.get(order.tailorId) ?? null : null,
      customer, measurementProfile, bill,
    };
  }

  /** Edits an open order. Paid money stays; the new total may not fall below it. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateTailoringOrderDto) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus)) throw new BadRequestException(`Order ${order.orderNumber} band ho chuka — badla nahi ja sakta`);
    const clock = await garmentClock(this.tz, user.tenantId);
    const customerId = dto.customerId !== undefined ? opt(dto.customerId) ?? null : order.customerId;
    if (order.customerId && customerId !== order.customerId && Number(order.paidAmount) > 0) {
      throw new BadRequestException('Advance mil chuka hai — customer nahi badla ja sakta');
    }
    const { customer, snapshot } = await this.checkLinks(user, {
      customerId: customerId ?? undefined,
      measurementProfileId: dto.measurementProfileId !== undefined ? dto.measurementProfileId : order.measurementProfileId ?? undefined,
      items: dto.items,
    });

    const data: Prisma.GarmentTailoringOrderUpdateInput = {
      ...(dto.customerId !== undefined && { customerId }),
      ...(dto.measurementProfileId !== undefined && { measurementProfileId: opt(dto.measurementProfileId) ?? null }),
      ...(dto.customerName !== undefined && { customerName: opt(dto.customerName) ?? customer?.name ?? null }),
      ...(dto.customerPhone !== undefined && { customerPhone: opt(dto.customerPhone) ?? null }),
      ...(dto.customerNotes !== undefined && { customerNotes: opt(dto.customerNotes) ?? null }),
      ...(dto.priority && { priority: dto.priority }),
      ...(dto.collectionId !== undefined && { collectionId: opt(dto.collectionId) ?? null }),
      ...(dto.tailorId !== undefined && { tailorId: opt(dto.tailorId) ?? null }),
      ...(dto.designerId !== undefined && { designerId: opt(dto.designerId) ?? null }),
      ...(dto.promisedDate !== undefined && { promisedDate: parseDay(clock, dto.promisedDate) }),
      ...(dto.designReferenceUrls && { designReferenceUrls: dto.designReferenceUrls }),
      ...(dto.designInstructions !== undefined && { designInstructions: opt(dto.designInstructions) ?? null }),
      ...(dto.internalNotes !== undefined && { internalNotes: opt(dto.internalNotes) ?? null }),
    };

    const moneyChanged = dto.items !== undefined || dto.discount !== undefined || dto.taxAmount !== undefined;
    return this.prisma.$transaction(async (tx) => {
      if (moneyChanged) {
        const items = dto.items ?? (await tx.garmentTailoringOrderItem.findMany({ where: { orderId: id }, orderBy: { displayOrder: 'asc' } })).map((i) => ({
          ...i, garmentName: i.garmentName, quantity: i.quantity,
          stitchingCost: i.quantity ? i.stitchingCost / i.quantity : 0, embroideryCost: i.quantity ? i.embroideryCost / i.quantity : 0,
          accessoryCost: i.quantity ? i.accessoryCost / i.quantity : 0, fabricCost: i.fabricCost,
          categoryType: i.categoryType ?? undefined, fabricMeters: i.fabricMeters ?? undefined,
        })) as unknown as ItemInput[];
        const { lines, totals } = this.price(items, snapshot ?? undefined);
        const tax = r2(dto.taxAmount ?? order.taxAmount);
        const discount = r2(dto.discount ?? order.discount);
        if (discount > totals.subtotal + tax) throw new BadRequestException('Discount kul amount se zyada nahi ho sakta');
        const total = r2(Math.max(totals.subtotal + tax - discount, 0));
        if (total + 0.01 < Number(order.paidAmount)) {
          throw new BadRequestException(`Rs ${r2(order.paidAmount)} pehle mil chuke — kul amount is se kam nahi ho sakti`);
        }
        if (dto.items) {
          // Lines of an open order are a draft of the bill; they are rewritten as a whole.
          await tx.garmentTailoringOrderItem.deleteMany({ where: { orderId: id } });
          await tx.garmentTailoringOrderItem.createMany({
            data: lines.map((l, idx) => ({ ...l, orderId: id, fabricMeters: l.fabricMeters ?? undefined, measurementSnapshot: l.measurementSnapshot ?? Prisma.JsonNull, displayOrder: idx })),
          });
        }
        Object.assign(data, {
          subtotal: totals.subtotal, stitchingCharges: totals.stitching, embroideryCharges: totals.embroidery,
          fabricCharges: totals.fabric, accessoryCharges: totals.accessory, discount, taxAmount: tax, total,
          paymentStatus: payStatus(Number(order.paidAmount), total),
        });
      }
      await tx.garmentTailoringOrder.update({ where: { id }, data });
      return id;
    }).then(() => this.getOne(user, id));
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } }, payments: { orderBy: { paidAt: 'desc' }, take: 1 } },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus) && dto.status !== order.orderStatus) {
      throw new BadRequestException(`Order ${order.orderNumber} pehle hi ${order.orderStatus === 'DELIVERED' ? 'deliver' : 'cancel'} ho chuka hai`);
    }
    if (order.orderStatus === dto.status) return this.getOne(user, id);

    const patch: Prisma.GarmentTailoringOrderUpdateInput = { orderStatus: dto.status };
    const now = new Date();
    if (dto.status === 'READY') patch.readyDate = now;
    if (dto.status === 'QUALITY_CHECK' && dto.notes) patch.qualityCheckNotes = dto.notes;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = opt(dto.cancellationReason) ?? null;
    }
    if (dto.notes && dto.status !== 'QUALITY_CHECK') {
      patch.internalNotes = [order.internalNotes, dto.notes.trim()].filter(Boolean).join('\n');
    }

    if (dto.status !== 'DELIVERED') {
      await this.prisma.garmentTailoringOrder.update({ where: { id }, data: patch });
      return this.getOne(user, id);
    }

    // Delivery is when the stitching income is earned: it becomes a sale.
    // Advances already sit on the customer's khata and are used up by it.
    const total = r2(order.total);
    const advance = r2(order.paidAmount);
    const balance = r2(Math.max(total - advance, 0));
    const paidNow = r2(Math.max(dto.paidNow ?? balance, 0));
    if (paidNow > balance + 0.01) throw new BadRequestException(balance > 0 ? `Baqi sirf Rs ${balance} hai` : 'Is order ki poori amount mil chuki hai');
    const stillOwed = r2(balance - paidNow);
    const method = dto.paymentMethod ?? order.payments[0]?.paymentMethod ?? 'CASH';

    const shopId = await resolveIndustryShopId(this.prisma as unknown as Db, user, order.shopId);
    let customerId = order.customerId;
    const legacyPaid = r2(Math.max(advance - (await paidOnKhata(this.prisma as unknown as Db, user.tenantId, order.orderNumber)), 0));
    const onKhata = r2(advance - legacyPaid);
    if (!customerId && (stillOwed > 0 || onKhata > 0)) {
      if (!order.customerName?.trim()) {
        throw new BadRequestException(`Rs ${stillOwed} baqi hai — poori amount lein, ya udhaar ke liye customer ka naam likhein`);
      }
      customerId = await ensureCustomer(this.prisma as unknown as Db, user, { name: order.customerName, phone: order.customerPhone, shopId });
    }

    const fromStock = order.items.filter((i) => i.fabricProductId && Number(i.fabricMeters) > 0);
    if (total > 0 && fromStock.length) {
      await this.billWithFabric(user, order, { shopId, customerId, paidAmount: r2(paidNow + legacyPaid), method });
    }

    await this.prisma.$transaction(async (tx) => {
      if (total > 0 && !fromStock.length) {
        const lines = order.items.map((it) => ({
          label: `Silai: ${it.quantity > 1 ? `${it.quantity}x ` : ''}${it.garmentName}`,
          amount: Number(it.total) || 0,
        }));
        lines.push({ label: 'Tax', amount: Number(order.taxAmount) || 0 });
        await postIndustrySale(tx, user, {
          saleNumber: order.orderNumber, sourceRef: order.orderNumber, shopId, customerId,
          lines, discount: Number(order.discount) || 0, paidAmount: r2(paidNow + legacyPaid), paymentMethod: method,
        });
      }
      if (paidNow > 0) {
        await tx.garmentTailoringPayment.create({
          data: { orderId: id, amount: paidNow, paymentMethod: method, notes: 'Delivery par wasooli', receivedById: user.id },
        });
      }
      const paidTotal = r2(advance + paidNow);
      await tx.garmentTailoringOrder.update({
        where: { id },
        data: { ...patch, deliveredAt: now, shopId, customerId, paidAmount: paidTotal, paymentStatus: payStatus(paidTotal, total) },
      });
    });
    return this.getOne(user, id);
  }

  /**
   * The delivery bill when the shop's own fabric was used: fabric goes out
   * as real product lines (stock and cost follow), stitching and extras as
   * charges on the same bill. A retried delivery finds the first bill.
   */
  private async billWithFabric(
    user: AuthenticatedUser,
    order: Prisma.GarmentTailoringOrderGetPayload<{ include: { items: true } }>,
    p: { shopId: string; customerId: string | null; paidAmount: number; method: string },
  ) {
    const existing = await findBill(this.prisma as unknown as Db, user.tenantId, order.orderNumber);
    if (existing) return existing;
    const items = order.items
      .filter((i) => i.fabricProductId && Number(i.fabricMeters) > 0)
      .map((i) => ({
        productId: i.fabricProductId!,
        variantId: i.fabricVariantId ?? undefined,
        quantity: Number(i.fabricMeters),
        priceOverride: r2(Number(i.fabricCost) / Number(i.fabricMeters)),
        note: `Silai ${order.orderNumber}: ${i.garmentName}`,
      }));
    const charges: Array<{ type: string; label: string; amount: number }> = [];
    for (const i of order.items) {
      const work = r2(Number(i.stitchingCost) + Number(i.embroideryCost) + Number(i.accessoryCost));
      if (work > 0) charges.push({ type: 'CUSTOM', label: `Silai: ${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.garmentName}`, amount: work });
      if (!i.fabricProductId && Number(i.fabricCost) > 0) charges.push({ type: 'CUSTOM', label: `Kapra: ${i.garmentName}`, amount: r2(i.fabricCost) });
    }
    if (Number(order.taxAmount) > 0) charges.push({ type: 'OTHER', label: 'Tax', amount: r2(order.taxAmount) });
    return this.sales.create(user, new ShopScope(p.shopId, false), {
      shopId: p.shopId,
      customerId: p.customerId ?? undefined,
      paymentMethod: toPaymentMethod(p.method),
      paidAmount: p.paidAmount,
      discount: r2(order.discount),
      allowCredit: p.customerId ? true : undefined,
      items,
      serviceCharges: charges,
    } as never, { source: 'POS', sourceRef: order.orderNumber });
  }

  async addPayment(user: AuthenticatedUser, id: string, dto: AddPaymentDto) {
    const order = await this.prisma.garmentTailoringOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.orderStatus === 'CANCELLED') throw new BadRequestException('Cancel shuda order par payment nahi li ja sakti');
    if (order.orderStatus === 'DELIVERED') {
      throw new BadRequestException('Order deliver ho chuka — baqi amount customer ke khate se wasool karein');
    }
    const left = due(order);
    if (dto.amount > left + 0.01) {
      throw new BadRequestException(left > 0 ? `Baqi sirf Rs ${left} hai` : 'Is order ki poori amount mil chuki hai');
    }
    await this.prisma.$transaction((tx) => this.takePayment(tx, user, order, {
      amount: r2(dto.amount), paymentMethod: dto.paymentMethod, reference: dto.reference, notes: dto.notes,
    }));
    return this.getOne(user, id);
  }

  /** Open-order numbers and analytics for a period of booking dates (this month by default). */
  async summary(user: AuthenticatedUser, scope: ShopScope, params: { from?: string; to?: string }) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const todayKey = clock.keyOf(new Date());
    const period = clock.range(params.from, params.to) ?? clock.range(`${todayKey.slice(0, 7)}-01`, todayKey)!;
    const scoped: Prisma.GarmentTailoringOrderWhereInput = { tenantId: user.tenantId, ...scope.whereLoose };

    const [open, booked, delivered] = await Promise.all([
      this.prisma.garmentTailoringOrder.findMany({
        where: { ...scoped, orderStatus: { notIn: CLOSED } },
        select: { orderStatus: true, promisedDate: true, total: true, paidAmount: true, priority: true },
        take: 5000,
      }),
      this.prisma.garmentTailoringOrder.findMany({
        where: { ...scoped, orderDate: { gte: period.gte, lt: period.lt } },
        select: { orderStatus: true, total: true, orderDate: true, tailorId: true, items: { select: { categoryType: true, garmentName: true, quantity: true, total: true } } },
        take: 5000,
      }),
      this.prisma.garmentTailoringOrder.findMany({
        where: { ...scoped, orderStatus: 'DELIVERED', deliveredAt: { gte: period.gte, lt: period.lt } },
        select: { total: true, deliveredAt: true, promisedDate: true, orderDate: true, tailorId: true },
        take: 5000,
      }),
    ]);

    const today = clock.today();
    const openStats = {
      count: open.length,
      value: r2(open.reduce((s, o) => s + o.total, 0)),
      due: r2(open.reduce((s, o) => s + due(o), 0)),
      advance: r2(open.reduce((s, o) => s + o.paidAmount, 0)),
      today: open.filter((o) => o.promisedDate && o.promisedDate >= today.gte && o.promisedDate < today.lt).length,
      late: open.filter((o) => o.promisedDate && o.promisedDate < today.gte && o.orderStatus !== 'READY').length,
      trial: open.filter((o) => o.orderStatus === 'QUALITY_CHECK').length,
      ready: open.filter((o) => o.orderStatus === 'READY').length,
      urgent: open.filter((o) => o.priority === 'URGENT').length,
      unpaid: open.filter((o) => due(o) > 0.5).length,
    };

    const garments = new Map<string, { key: string; pieces: number; value: number }>();
    for (const o of booked) {
      if (o.orderStatus === 'CANCELLED') continue;
      for (const i of o.items) {
        const key = i.categoryType ?? 'OTHER';
        const g = garments.get(key) ?? { key, pieces: 0, value: 0 };
        g.pieces += i.quantity; g.value = r2(g.value + i.total);
        garments.set(key, g);
      }
    }
    const tailors = new Map<string, { id: string; orders: number; value: number }>();
    for (const o of delivered) {
      const key = o.tailorId ?? '';
      const t = tailors.get(key) ?? { id: key, orders: 0, value: 0 };
      t.orders += 1; t.value = r2(t.value + o.total);
      tailors.set(key, t);
    }
    const names = await personNames(this.prisma as unknown as Db, user.tenantId, [...tailors.keys()]);
    const onTime = delivered.filter((o) => o.promisedDate && o.deliveredAt && o.deliveredAt.getTime() < o.promisedDate.getTime() + DAY_MS).length;
    const withPromise = delivered.filter((o) => o.promisedDate).length;
    const byDay = new Map<string, { day: string; booked: number; delivered: number; value: number }>();
    const dayRow = (day: string) => byDay.get(day) ?? { day, booked: 0, delivered: 0, value: 0 };
    for (const o of booked) { const r = dayRow(clock.keyOf(o.orderDate)); r.booked += 1; byDay.set(r.day, r); }
    for (const o of delivered) { const r = dayRow(clock.keyOf(o.deliveredAt!)); r.delivered += 1; r.value = r2(r.value + o.total); byDay.set(r.day, r); }

    return {
      open: openStats,
      period: {
        from: clock.keyOf(period.gte), to: clock.keyOf(new Date(period.lt.getTime() - 1)),
        booked: booked.filter((o) => o.orderStatus !== 'CANCELLED').length,
        bookedValue: r2(booked.filter((o) => o.orderStatus !== 'CANCELLED').reduce((s, o) => s + o.total, 0)),
        cancelled: booked.filter((o) => o.orderStatus === 'CANCELLED').length,
        delivered: delivered.length,
        deliveredValue: r2(delivered.reduce((s, o) => s + o.total, 0)),
        onTimePct: withPromise ? Math.round((onTime / withPromise) * 100) : null,
        avgDays: delivered.length ? Math.round(delivered.reduce((s, o) => s + (o.deliveredAt!.getTime() - o.orderDate.getTime()) / DAY_MS, 0) / delivered.length * 10) / 10 : null,
        garments: [...garments.values()].sort((a, b) => b.value - a.value),
        tailors: [...tailors.values()].map((t) => ({ ...t, name: t.id ? names.get(t.id) ?? 'Karigar' : 'Bina karigar' })).sort((a, b) => b.value - a.value),
        byDay: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
      },
      // Older callers read these three.
      totalRevenue: r2(delivered.reduce((s, o) => s + o.total, 0)),
      pendingCount: openStats.count,
      byStatus: Object.entries(open.reduce<Record<string, number>>((m, o) => { m[o.orderStatus] = (m[o.orderStatus] ?? 0) + 1; return m; }, {}))
        .map(([orderStatus, n]) => ({ orderStatus, _count: { _all: n } })),
    };
  }
}
