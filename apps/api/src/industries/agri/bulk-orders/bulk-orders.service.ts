import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgriCategory, Prisma, SeasonType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { recordKhataPayment } from '../../_shared/industry-sale.helper';
import { dayRange, ensureKhataCustomer, parseDay, resolveShopId, shopYear } from '../agri-common';

const STATUSES = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED'];

const SEASONS = new Set(Object.values(SeasonType) as string[]);
const CATEGORIES = new Set(Object.values(AgriCategory) as string[]);

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/**
 * Bulk orders (bags of seed, fertiliser, spray for a farmer's season).
 *
 * Money and stock follow the counter's rules: every payment is written on
 * the farmer's khata the day it is received, and when the order reaches the
 * farmer ("Pahunch gaya") a normal bill is made from it. The bill takes the
 * stock out and puts the full amount on the khata, where the payments
 * already received cover it. Before this, orders lived on their own: stock
 * never moved and neither sales, khata nor the day book saw the money.
 */
@Injectable()
export class BulkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: any) {
    const items: any[] = Array.isArray(dto?.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException('Kam az kam ek cheez order me daalein');
    if (!dto.farmerId && !dto.customerId && !String(dto.customerName ?? '').trim()) {
      throw new BadRequestException('Farmer chunein ya customer ka naam likhein');
    }
    let customerId: string | undefined = dto.customerId || undefined;
    if (dto.farmerId) {
      const farmer = await this.prisma.agriFarmer.findFirst({ where: { id: dto.farmerId, tenantId: user.tenantId }, select: { customerId: true, status: true, fullName: true } });
      if (!farmer) throw new NotFoundException('Farmer nahi mila');
      if (farmer.status === 'SUSPENDED' && dto.isCredit) throw new BadRequestException(`${farmer.fullName} ka udhaar roka hua hai — cash order banayein`);
      customerId = customerId ?? farmer.customerId ?? undefined;
    }
    if (customerId) {
      const own = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!own) throw new NotFoundException('Customer nahi mila');
    }
    const productIds = [...new Set(items.map((it) => it.productId).filter(Boolean))] as string[];
    if (productIds.length) {
      const own = await this.prisma.product.count({ where: { id: { in: productIds }, tenantId: user.tenantId } });
      if (own !== productIds.length) throw new BadRequestException('Order ki koi cheez is dukaan ki nahi');
    }

    let subtotal = 0;
    const enrichedItems = items.map((it, idx) => {
      const name = String(it.productName ?? '').trim();
      const qty = Number(it.quantity);
      const price = Number(it.pricePerUnit);
      const discount = Number(it.discount) || 0;
      if (!name) throw new BadRequestException(`Line ${idx + 1}: cheez ka naam likhein`);
      if (!(qty > 0)) throw new BadRequestException(`${name}: quantity 0 se zyada likhein`);
      if (!(price >= 0) || !Number.isFinite(price)) throw new BadRequestException(`${name}: rate sahi likhein`);
      if (discount < 0 || discount > qty * price) throw new BadRequestException(`${name}: discount line ki amount se zyada nahi ho sakta`);
      const total = r2(qty * price - discount);
      subtotal += total;
      return {
        productId: it.productId || null,
        productName: name.slice(0, 160),
        category: CATEGORIES.has(it.category) ? it.category : undefined,
        quantity: qty,
        unit: String(it.unit || 'bag').slice(0, 20),
        pricePerUnit: price,
        discount,
        total,
        batchNumber: it.batchNumber ? String(it.batchNumber).slice(0, 60) : null,
        expiryDate: parseDay(it.expiryDate),
        displayOrder: idx,
      };
    });
    subtotal = r2(subtotal);

    const money = (v: unknown, label: string) => {
      const n = Number(v) || 0;
      if (n < 0) throw new BadRequestException(`${label} manfi nahi ho sakta`);
      return r2(n);
    };
    const bulkDiscount = money(dto.bulkDiscount, 'Discount');
    const taxAmount = money(dto.taxAmount, 'Tax');
    const otherCharges = money(dto.otherCharges, 'Doosre charges');
    const deliveryCharges = money(dto.deliveryCharges, 'Delivery charges');
    if (bulkDiscount > subtotal) throw new BadRequestException('Discount maal ki amount se zyada nahi ho sakta');
    const total = r2(subtotal + taxAmount + otherCharges + deliveryCharges - bulkDiscount);

    const year = shopYear();
    const count = await this.prisma.agriBulkOrder.count({ where: { tenantId: user.tenantId, orderNumber: { startsWith: `AGO-${year}-` } } });
    const orderNumber = `AGO-${year}-${String(count + 1).padStart(4, '0')}`;
    const opt = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

    return this.prisma.agriBulkOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId || scope.shopId || user.shopId || null,
        orderNumber,
        farmerId: dto.farmerId || undefined,
        customerId,
        customerName: opt(dto.customerName, 120),
        customerPhone: opt(dto.customerPhone, 20),
        deliveryDate: parseDay(dto.deliveryDate),
        season: SEASONS.has(dto.season) ? dto.season : undefined,
        cropTarget: opt(dto.cropTarget, 80),
        landAreaAcres: Number(dto.landAreaAcres) > 0 ? Number(dto.landAreaAcres) : null,
        isDelivery: !!dto.isDelivery,
        deliveryAddress: opt(dto.deliveryAddress, 300),
        deliveryCharges,
        transportType: opt(dto.transportType, 60),
        vehicleNumber: opt(dto.vehicleNumber, 30),
        subtotal,
        bulkDiscount,
        taxAmount,
        otherCharges,
        total,
        isCredit: !!dto.isCredit,
        creditDueDate: parseDay(dto.creditDueDate),
        advisorNotes: opt(dto.advisorNotes, 2000),
        farmerNotes: opt(dto.farmerNotes, 2000),
        status: 'CONFIRMED',
        createdById: user.id,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  private where(user: AuthenticatedUser, scope: ShopScope | null, params: { status?: string; farmerId?: string; season?: string; from?: string; to?: string; search?: string }): Prisma.AgriBulkOrderWhereInput {
    const range = dayRange(params.from, params.to);
    const q = params.search?.trim();
    const open = params.status === 'OPEN';
    return {
      tenantId: user.tenantId,
      ...(scope?.shopId && scope.whereLoose),
      ...(open ? { status: { in: ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY'] } } : params.status && STATUSES.includes(params.status) && { status: params.status as any }),
      ...(params.farmerId && { farmerId: params.farmerId }),
      ...(params.season && SEASONS.has(params.season) && { season: params.season as SeasonType }),
      ...(range && { orderDate: range }),
      ...(q && {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q } },
          { cropTarget: { contains: q, mode: 'insensitive' } },
          { items: { some: { productName: { contains: q, mode: 'insensitive' } } } },
        ],
      }),
    };
  }

  /** Bill made from each order, so the page can show it. */
  private async withBills<T extends { orderNumber: string }>(tenantId: string, rows: T[]) {
    const bills = rows.length
      ? await this.prisma.sale.findMany({
        where: { tenantId, sourceRef: { in: rows.map((r) => r.orderNumber) }, status: { not: 'VOIDED' } },
        select: { id: true, saleNumber: true, sourceRef: true },
      })
      : [];
    const byRef = new Map(bills.map((b) => [b.sourceRef, { id: b.id, saleNumber: b.saleNumber }]));
    return rows.map((r) => ({ ...r, bill: byRef.get(r.orderNumber) ?? null }));
  }

  async list(user: AuthenticatedUser, scope: ShopScope | null, params: { status?: string; farmerId?: string; season?: string; from?: string; to?: string; search?: string }) {
    const rows = await this.prisma.agriBulkOrder.findMany({
      where: this.where(user, scope, params),
      include: { items: true },
      orderBy: { orderDate: 'desc' },
      take: 200,
    });
    return this.withBills(user.tenantId, rows);
  }

  /** Paged list for the Bulk orders page, with totals over every matching order. */
  async page(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; farmerId?: string; season?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) {
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 100);
    const page = Math.max(Number(params.page) || 1, 1);
    const where = this.where(user, scope, params);
    const statusless = this.where(user, scope, { ...params, status: undefined });
    const [rows, total, byStatus, sums, bySeason] = await Promise.all([
      this.prisma.agriBulkOrder.findMany({ where, include: { items: true }, orderBy: { orderDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.agriBulkOrder.count({ where }),
      this.prisma.agriBulkOrder.groupBy({ by: ['status'], where: statusless, _count: { _all: true }, _sum: { total: true, paidAmount: true } }),
      this.prisma.agriBulkOrder.aggregate({ where: { ...statusless, status: { not: 'CANCELLED' } }, _sum: { total: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.agriBulkOrder.groupBy({ by: ['season'], where: { ...statusless, status: { not: 'CANCELLED' } }, _count: { _all: true }, _sum: { total: true } }),
    ]);
    const counts: Record<string, number> = {};
    let openValue = 0;
    for (const g of byStatus) {
      counts[g.status] = g._count._all;
      if (!['DELIVERED', 'CANCELLED', 'RETURNED'].includes(g.status)) openValue += (g._sum.total ?? 0);
    }
    const value = r2(sums._sum.total ?? 0);
    const paid = r2(sums._sum.paidAmount ?? 0);
    return {
      items: await this.withBills(user.tenantId, rows),
      total,
      page,
      limit,
      counts,
      stats: { orders: sums._count._all, value, advance: paid, pending: r2(value - paid), openValue: r2(openValue) },
      analytics: { seasons: bySeason.map((g) => ({ season: g.season, orders: g._count._all, value: r2(g._sum.total ?? 0) })) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.agriBulkOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  /** The bill made from this order, if any. */
  private billFor(tenantId: string, orderNumber: string) {
    return this.prisma.sale.findFirst({
      where: { tenantId, sourceRef: orderNumber, status: { not: 'VOIDED' } },
      select: { id: true, saleNumber: true, total: true },
    });
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, status: string, cancellationReason?: string) {
    if (!STATUSES.includes(status)) throw new BadRequestException('Ghalat status');
    const o = await this.getOne(user, id);
    if (o.status === status) return o;
    const billed = await this.billFor(user.tenantId, o.orderNumber);
    if (billed && (status === 'CANCELLED' || status === 'RETURNED')) {
      throw new BadRequestException(`Is order ka bill ${billed.saleNumber} ban chuka hai — maal wapas lene ke liye us bill par Return karein`);
    }
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order dobara nahi khulta — naya order banayein');
    if (billed && status !== 'DELIVERED') throw new BadRequestException(`Order pahunch chuka aur bill ${billed.saleNumber} ban gaya — ab status nahi badalta`);
    if (status === 'CANCELLED' && !String(cancellationReason ?? '').trim()) throw new BadRequestException('Cancel ki wajah likhein');

    if (status === 'DELIVERED' && !billed) await this.bill(user, scope, o);

    const patch: any = { status };
    if (status === 'DELIVERED') patch.deliveryDate = o.deliveryDate ?? new Date();
    if (status === 'CANCELLED') {
      patch.cancelledAt = new Date();
      patch.cancellationReason = String(cancellationReason).trim().slice(0, 300);
    }
    return this.prisma.agriBulkOrder.update({ where: { id }, data: patch, include: { items: true } });
  }

  /** Turns a delivered order into a normal bill on the farmer's khata. */
  private async bill(user: AuthenticatedUser, scope: ShopScope, o: Awaited<ReturnType<BulkOrdersService['getOne']>>) {
    const productLines = o.items.filter((it) => it.productId && it.quantity > 0);
    if (!productLines.length) {
      throw new BadRequestException('Bill ke liye kam az kam ek cheez stock (catalogue) se honi chahiye');
    }
    const customerId = await ensureKhataCustomer(this.prisma, user, {
      customerId: o.customerId, farmerId: o.farmerId, name: o.customerName, phone: o.customerPhone, shopId: o.shopId,
    });
    const charges = [
      // Lines typed by hand have no stock item; they are billed as charges.
      ...o.items.filter((it) => !it.productId && it.total > 0)
        .map((it) => ({ type: 'OTHER', label: `${it.productName} (${it.quantity} ${it.unit})`.slice(0, 120), amount: r2(it.total) })),
      { type: 'DELIVERY', label: 'Delivery / kiraya', amount: r2(o.deliveryCharges) },
      { type: 'OTHER', label: 'Doosre expenses', amount: r2(o.otherCharges) },
      { type: 'OTHER', label: 'Tax', amount: r2(o.taxAmount) },
    ].filter((c) => c.amount > 0);

    const sale: any = await this.sales.create(user, scope, {
      shopId: o.shopId ?? undefined,
      customerId,
      paymentMethod: 'CASH',
      // Payments were written on the khata when received; the bill uses them up there.
      paidAmount: 0,
      allowCredit: true,
      discount: r2(o.bulkDiscount) || undefined,
      note: `Bulk order ${o.orderNumber}`,
      items: productLines.map((it) => ({
        productId: it.productId as string,
        quantity: it.quantity,
        priceOverride: it.pricePerUnit,
        ...(it.discount > 0 && { lineDiscount: it.discount }),
      })),
      ...(charges.length && { serviceCharges: charges }),
    } as any);
    await this.prisma.sale.update({ where: { id: sale.id }, data: { sourceRef: o.orderNumber } });
    if (!o.customerId) {
      await this.prisma.agriBulkOrder.update({ where: { id: o.id }, data: { customerId } });
    }
    return sale;
  }

  async addPayment(user: AuthenticatedUser, id: string, amount: number, paymentMethod?: string) {
    const o = await this.prisma.agriBulkOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order not found');
    if (o.status === 'CANCELLED') throw new BadRequestException('Cancel order par amount nahi li ja sakti');
    amount = r2(amount);
    if (!(amount > 0)) throw new BadRequestException('Amount sahi likhein');
    const remaining = r2(o.total - o.paidAmount);
    if (amount > remaining + 0.01) throw new BadRequestException(`Is order par sirf Rs ${remaining} baqi hain`);

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.agriBulkOrder.updateMany({
        where: { id, paidAmount: o.paidAmount },
        data: { paidAmount: { increment: amount } },
      });
      if (claimed.count === 0) throw new BadRequestException('Order abhi badla gaya — dobara koshish karein');

      const customerId = await ensureKhataCustomer(tx, user, {
        customerId: o.customerId, farmerId: o.farmerId, name: o.customerName, phone: o.customerPhone, shopId: o.shopId,
      });
      const shopId = await resolveShopId(tx, user, o.shopId);
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: o.orderNumber, method: paymentMethod,
        note: `Bulk order ${o.orderNumber} ki payment`,
      });

      const newPaid = r2(o.paidAmount + amount);
      const paymentStatus = newPaid >= o.total - 0.01 ? 'PAID' : newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
      return tx.agriBulkOrder.update({
        where: { id },
        data: { paymentStatus, customerId, ...(paymentMethod && { paymentMethod }) },
        include: { items: true },
      });
    });
  }
}
