import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BulkGenerateDto, ConfirmDeliveryDto, CreateDeliveryDto } from './dto/create-delivery.dto';

@Injectable()
export class DairyDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateDeliveryDto) {
    const customer = await this.prisma.dairyCustomer.findFirst({ where: { id: dto.dairyCustomerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const rate = dto.ratePerLiter ?? customer.customRate ?? 0;
    const delivered = dto.deliveredQty ?? dto.scheduledQty;
    const totalAmount = rate * delivered;

    return this.prisma.dairyDelivery.create({
      data: {
        tenantId: user.tenantId,
        dairyCustomerId: dto.dairyCustomerId,
        routeId: customer.routeId,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : new Date(),
        slot: dto.slot ?? 'MORNING',
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
    const date = dto.date ? new Date(dto.date) : new Date();
    const slot = dto.slot ?? 'MORNING';

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
      if (c.pausedFrom && c.pausedTo && date >= c.pausedFrom && date <= c.pausedTo) continue;

      // Frequency check
      const dow = date.getDay();
      if (c.deliveryFrequency === 'ALTERNATE_DAY' && dow % 2 === 0) continue;
      if (c.deliveryFrequency === 'WEEKLY' && dow !== 1) continue;
      if (c.deliveryFrequency === 'MORNING_ONLY' && slot !== 'MORNING') continue;
      if (c.deliveryFrequency === 'EVENING_ONLY' && slot !== 'EVENING') continue;

      const qty = slot === 'MORNING' ? c.morningQuantity : c.eveningQuantity;
      if (qty <= 0) continue;

      const rate = c.customRate ?? 200;
      const totalAmount = rate * qty;

      // Check if delivery already exists
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const existing = await this.prisma.dairyDelivery.findFirst({
        where: {
          dairyCustomerId: c.id,
          slot,
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

    return { generatedCount: deliveries.length, date: date.toISOString().split('T')[0], slot };
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; routeId?: string; slot?: string; status?: string; from?: string; to?: string }) {
    return this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { dairyCustomerId: params.customerId }),
        ...(params.routeId && { routeId: params.routeId }),
        ...(params.slot && { slot: params.slot as any }),
        ...(params.status && { status: params.status as any }),
        ...(params.from || params.to ? {
          deliveryDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      include: { customer: { include: { route: true } } },
      orderBy: [{ deliveryDate: 'desc' }, { slot: 'asc' }],
      take: 300,
    });
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmDeliveryDto) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    const totalAmount = d.ratePerLiter * dto.deliveredQty;

    return this.prisma.$transaction(async (tx) => {
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
          currentBalance: { increment: totalAmount },
          totalPurchases: { increment: totalAmount },
          totalDeliveries: { increment: 1 },
          lastDeliveryDate: new Date(),
        },
      });

      return updated;
    });
  }

  async skipDelivery(user: AuthenticatedUser, id: string, reason: string) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dairyDelivery.update({
        where: { id },
        data: { status: 'SKIPPED', skipReason: reason },
      });

      await tx.dairyCustomer.update({
        where: { id: d.dairyCustomerId },
        data: { missedDeliveries: { increment: 1 } },
      });

      return updated;
    });
  }

  async cancelDelivery(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.dairyDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Delivery not found');
    return this.prisma.dairyDelivery.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async todaysDeliveries(user: AuthenticatedUser, slot?: string, routeId?: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        deliveryDate: { gte: start, lte: end },
        ...(slot && { slot: slot as any }),
        ...(routeId && { routeId }),
      },
      include: { customer: { include: { route: true } } },
      orderBy: [{ status: 'asc' }, { slot: 'asc' }],
    });
  }

  async dailySummary(user: AuthenticatedUser, date?: string) {
    const d = date ? new Date(date) : new Date();
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const deliveries = await this.prisma.dairyDelivery.findMany({
      where: { tenantId: user.tenantId, deliveryDate: { gte: start, lte: end } },
    });

    const morning = deliveries.filter((x) => x.slot === 'MORNING');
    const evening = deliveries.filter((x) => x.slot === 'EVENING');
    const delivered = deliveries.filter((x) => x.status === 'DELIVERED');
    const skipped = deliveries.filter((x) => x.status === 'SKIPPED');
    const pending = deliveries.filter((x) => x.status === 'SCHEDULED');

    return {
      date: d.toISOString().split('T')[0],
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
