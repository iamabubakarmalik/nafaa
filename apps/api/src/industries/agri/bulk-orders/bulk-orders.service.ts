import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgriCategory, SeasonType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { dayRange, ensureKhataCustomer, khataPayment, resolveShopId } from '../agri-common';

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

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.items?.length) throw new BadRequestException('At least one item required');
    let customerId: string | undefined = dto.customerId || undefined;
    if (dto.farmerId) {
      const farmer = await this.prisma.agriFarmer.findFirst({ where: { id: dto.farmerId, tenantId: user.tenantId }, select: { customerId: true } });
      if (!farmer) throw new NotFoundException('Farmer nahi mila');
      customerId = customerId ?? farmer.customerId ?? undefined;
    }
    if (customerId) {
      const own = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!own) throw new NotFoundException('Customer nahi mila');
    }
    for (const it of dto.items) {
      if (!it.productId) continue;
      const own = await this.prisma.product.findFirst({ where: { id: it.productId, tenantId: user.tenantId }, select: { id: true } });
      if (!own) throw new BadRequestException(`Item "${it.productName ?? ''}" is dukaan ka nahi`);
    }

    const count = await this.prisma.agriBulkOrder.count({ where: { tenantId: user.tenantId } });
    const orderNumber = 'AGO-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    let subtotal = 0;
    const enrichedItems = dto.items.map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.pricePerUnit) || 0;
      const discount = Number(it.discount) || 0;
      const total = Math.max((qty * price) - discount, 0);
      subtotal += total;
      return {
        productId: it.productId || null,
        productName: it.productName,
        category: CATEGORIES.has(it.category) ? it.category : undefined,
        quantity: qty,
        unit: it.unit || 'bag',
        pricePerUnit: price,
        discount,
        total,
        batchNumber: it.batchNumber,
        expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
        displayOrder: idx,
      };
    });

    const bulkDiscount = Number(dto.bulkDiscount) || 0;
    const taxAmount = Number(dto.taxAmount) || 0;
    const otherCharges = Number(dto.otherCharges) || 0;
    const deliveryCharges = Number(dto.deliveryCharges) || 0;
    const total = Math.max(subtotal + taxAmount + otherCharges + deliveryCharges - bulkDiscount, 0);

    return this.prisma.agriBulkOrder.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId || user.shopId || null,
        orderNumber,
        farmerId: dto.farmerId || undefined,
        customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        season: SEASONS.has(dto.season) ? dto.season : undefined,
        cropTarget: dto.cropTarget,
        landAreaAcres: dto.landAreaAcres ? Number(dto.landAreaAcres) : null,
        isDelivery: dto.isDelivery ?? false,
        deliveryAddress: dto.deliveryAddress,
        deliveryCharges,
        transportType: dto.transportType,
        vehicleNumber: dto.vehicleNumber,
        subtotal,
        bulkDiscount,
        taxAmount,
        otherCharges,
        total,
        isCredit: dto.isCredit ?? false,
        creditDueDate: dto.creditDueDate ? new Date(dto.creditDueDate) : null,
        advisorNotes: dto.advisorNotes,
        farmerNotes: dto.farmerNotes,
        status: 'CONFIRMED',
        createdById: user.id,
        items: { create: enrichedItems },
      },
      include: { items: true },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; farmerId?: string; season?: string; from?: string; to?: string; search?: string }) {
    const range = dayRange(params.from, params.to);
    const rows = await this.prisma.agriBulkOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.farmerId && { farmerId: params.farmerId }),
        ...(params.season && { season: params.season as any }),
        ...(range && { orderDate: range }),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      include: { items: true },
      orderBy: { orderDate: 'desc' },
      take: 200,
    });
    // Bill made from each order, so the page can show it.
    const bills = rows.length
      ? await this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, sourceRef: { in: rows.map((r) => r.orderNumber) }, status: { not: 'VOIDED' } },
        select: { id: true, saleNumber: true, sourceRef: true },
      })
      : [];
    const byRef = new Map(bills.map((b) => [b.sourceRef, { id: b.id, saleNumber: b.saleNumber }]));
    return rows.map((r) => ({ ...r, bill: byRef.get(r.orderNumber) ?? null }));
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

    if (status === 'DELIVERED' && !billed) await this.bill(user, scope, o);

    const patch: any = { status };
    if (status === 'DELIVERED') patch.deliveryDate = o.deliveryDate ?? new Date();
    if (status === 'CANCELLED') {
      patch.cancelledAt = new Date();
      patch.cancellationReason = cancellationReason;
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
      await khataPayment(tx, user, {
        customerId, shopId, amount, reference: o.orderNumber,
        note: `Bulk order ${o.orderNumber} ki raqam`,
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
