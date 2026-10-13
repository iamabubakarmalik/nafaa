import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BulkGenerateDto, ConfirmDeliveryDto, CreateDeliveryDto } from './dto/create-delivery.dto';
import { dayEnd, dayKey, dayNumber, dayRange, dayStart, parseDay, weekdayInTz } from '../dairy-common';

const MILK_TYPES = ['FRESH_MILK', 'BUFFALO_MILK', 'COW_MILK', 'MIXED_MILK', 'RAW_MILK', 'BOILED_MILK'] as const;

@Injectable()
export class DairyDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rate for a customer without a custom rate: the shop's own milk price
   * for that slot (morning/evening price on the dairy profile, else the
   * product's sale price). Never a hard-coded number.
   */
  private async defaultRate(tenantId: string, slot: string): Promise<number> {
    const profile = await this.prisma.dairyProduct.findFirst({
      where: { tenantId, productType: { in: MILK_TYPES as any } },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    if (profile) {
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

  async create(user: AuthenticatedUser, dto: CreateDeliveryDto) {
    const customer = await this.prisma.dairyCustomer.findFirst({ where: { id: dto.dairyCustomerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (!(dto.scheduledQty > 0)) throw new BadRequestException('Miqdar 0 se zyada honi chahiye');

    const slot = dto.slot ?? 'MORNING';
    const rate = dto.ratePerLiter ?? customer.customRate ?? await this.defaultRate(user.tenantId, slot);
    const delivered = dto.deliveredQty ?? dto.scheduledQty;
    const totalAmount = rate * delivered;

    return this.prisma.dairyDelivery.create({
      data: {
        tenantId: user.tenantId,
        dairyCustomerId: dto.dairyCustomerId,
        routeId: customer.routeId,
        deliveryDate: parseDay(dto.deliveryDate) ?? new Date(),
        slot,
        scheduledQty: dto.scheduledQty,
        deliveredQty: delivered,
        returnedQty: dto.returnedQty ?? 0,
        unit: dto.unit ?? 'LITER',
        status: 'SCHEDULED',
        ratePerLiter: rate,
        totalAmount,
        deliveredByStaffId: user.id,
        notes: dto.notes,
      },
    });
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

    // A pause that has run out ends by itself; the shop should not have to remember.
    await this.prisma.dairyCustomer.updateMany({
      where: { tenantId: user.tenantId, status: 'SUSPENDED', pausedTo: { lt: start } },
      data: { status: 'ACTIVE', pausedFrom: null, pausedTo: null },
    });

    // Find active customers matching the route
    const customers = await this.prisma.dairyCustomer.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        ...(dto.routeId && { routeId: dto.routeId }),
      },
    });

    const deliveries: any[] = [];
    for (const c of customers) {
      // Skip if paused
      if (c.pausedFrom && c.pausedTo && end >= c.pausedFrom && start <= c.pausedTo) continue;

      // Frequency check
      if (c.deliveryFrequency === 'ON_DEMAND') continue;
      if (c.deliveryFrequency === 'ALTERNATE_DAY' && dayNo % 2 === 1) continue;
      if (c.deliveryFrequency === 'WEEKLY' && dow !== 1) continue;
      if (c.deliveryFrequency === 'MORNING_ONLY' && slot !== 'MORNING') continue;
      if (c.deliveryFrequency === 'EVENING_ONLY' && slot !== 'EVENING') continue;

      const qty = slot === 'MORNING' ? c.morningQuantity : c.eveningQuantity;
      if (qty <= 0) continue;

      if (c.customRate == null && fallbackRate === null) fallbackRate = await this.defaultRate(user.tenantId, slot);
      const rate = c.customRate ?? fallbackRate ?? 0;
      const totalAmount = rate * qty;

      // Check if delivery already exists
      const existing = await this.prisma.dairyDelivery.findFirst({
        where: {
          dairyCustomerId: c.id,
          slot,
          status: { not: 'CANCELLED' },
          deliveryDate: { gte: start, lte: end },
        },
      });

      if (existing) continue;

      deliveries.push({
        tenantId: user.tenantId,
        dairyCustomerId: c.id,
        routeId: c.routeId,
        deliveryDate: date,
        slot,
        scheduledQty: qty,
        deliveredQty: 0,
        unit: 'LITER',
        status: 'SCHEDULED',
        ratePerLiter: rate,
        totalAmount,
      });
    }

    if (deliveries.length > 0) {
      await this.prisma.dairyDelivery.createMany({ data: deliveries as any });
    }

    return { generatedCount: deliveries.length, date: dayKey(start), slot };
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; routeId?: string; slot?: string; status?: string; from?: string; to?: string }) {
    return this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { dairyCustomerId: params.customerId }),
        ...(params.routeId && { routeId: params.routeId }),
        ...(params.slot && { slot: params.slot as any }),
        ...(params.status && { status: params.status as any }),
        ...(dayRange(params.from, params.to) && { deliveryDate: dayRange(params.from, params.to) }),
      },
      include: { customer: { include: { route: true } } },
      orderBy: [{ deliveryDate: 'desc' }, { slot: 'asc' }],
      take: 300,
    });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmDeliveryDto) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    if (!(dto.deliveredQty >= 0)) throw new BadRequestException('Miqdar sahi likhein');
    if (d.status === 'CANCELLED') throw new BadRequestException('Ye delivery cancel ho chuki hai');

    const totalAmount = d.ratePerLiter * dto.deliveredQty;
    /* Confirming twice (double tap, or correcting the quantity) must only
       move the khata by the difference, never add the whole bill again. */
    const already = d.status === 'DELIVERED';
    const delta = already ? totalAmount - d.totalAmount : totalAmount;

    return this.prisma.$transaction(async (tx) => {
      // Guard against a parallel confirm racing this one.
      const claimed = await tx.dairyDelivery.updateMany({
        where: { id, status: d.status, totalAmount: d.totalAmount },
        data: { status: 'DELIVERED' },
      });
      if (claimed.count === 0) throw new BadRequestException('Delivery abhi badli gayi — dobara koshish karein');

      const updated = await tx.dairyDelivery.update({
        where: { id },
        data: {
          deliveredQty: dto.deliveredQty,
          returnedQty: dto.returnedQty ?? 0,
          totalAmount,
          status: 'DELIVERED',
          deliveredAt: new Date(),
          customerSignature: dto.customerSignature,
          notes: dto.notes,
          deliveredByStaffId: user.id,
        },
      });

      // Update customer balance
      await tx.dairyCustomer.update({
        where: { id: d.dairyCustomerId },
        data: {
          currentBalance: { increment: delta },
          totalPurchases: { increment: delta },
          ...(already ? {} : { totalDeliveries: { increment: 1 } }),
          lastDeliveryDate: new Date(),
        },
      });

      return updated;
    });
  }

  async skipDelivery(user: AuthenticatedUser, id: string, reason: string) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    if (d.status === 'SKIPPED') return d;
    if (d.status === 'CANCELLED') throw new BadRequestException('Ye delivery cancel ho chuki hai');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dairyDelivery.update({
        where: { id },
        data: { status: 'SKIPPED', skipReason: reason, ...(d.status === 'DELIVERED' && { deliveredQty: 0, totalAmount: 0 }) },
      });

      await tx.dairyCustomer.update({
        where: { id: d.dairyCustomerId },
        data: {
          missedDeliveries: { increment: 1 },
          ...(d.status === 'DELIVERED' && this.reverseDelivered(d.totalAmount)),
        },
      });

      return updated;
    });
  }

  /** Khata changes that undo a delivery that was already charged. */
  private reverseDelivered(amount: number) {
    return {
      currentBalance: { decrement: amount },
      totalPurchases: { decrement: amount },
      totalDeliveries: { decrement: 1 },
    };
  }

  async cancelDelivery(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    if (d.status === 'CANCELLED') return d;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dairyDelivery.update({ where: { id }, data: { status: 'CANCELLED' } });
      // A delivered bill was already on the khata; take it off again.
      if (d.status === 'DELIVERED') {
        await tx.dairyCustomer.update({ where: { id: d.dairyCustomerId }, data: this.reverseDelivered(d.totalAmount) });
      }
      return updated;
    });
  }

  async todaysDeliveries(user: AuthenticatedUser, slot?: string, routeId?: string) {
    return this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        deliveryDate: { gte: dayStart(), lte: dayEnd() },
        ...(slot && { slot: slot as any }),
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
    // Litres actually handed over, per slot.
    const morning = delivered.filter((x) => x.slot === 'MORNING');
    const evening = delivered.filter((x) => x.slot === 'EVENING');
    const skipped = deliveries.filter((x) => x.status === 'SKIPPED');
    const pending = deliveries.filter((x) => x.status === 'SCHEDULED');

    return {
      date: dayKey(start),
      totalDeliveries: deliveries.length,
      totalLiters: delivered.reduce((s, x) => s + x.deliveredQty, 0),
      totalRevenue: delivered.reduce((s, x) => s + x.totalAmount, 0),
      deliveredCount: delivered.length,
      skippedCount: skipped.length,
      pendingCount: pending.length,
      morningLiters: morning.reduce((s, x) => s + x.deliveredQty, 0),
      eveningLiters: evening.reduce((s, x) => s + x.deliveredQty, 0),
    };
  }
}
