import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ShopScope } from '../../../common/shop-scope';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { addDaysTz, dayEnd, dayKey, dayStart, parseDay } from '../florist-common';

/** Next delivery day on shop time (start of that day). */
function calcNextDelivery(freq: string, from: Date): Date {
  const day = dayStart(from);
  switch ((freq || '').toUpperCase()) {
    case 'DAILY': return addDaysTz(day, 1);
    case 'WEEKLY': return addDaysTz(day, 7);
    case 'BIWEEKLY': return addDaysTz(day, 14);
    case 'MONTHLY': {
      const next = new Date(day);
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    }
    default: return addDaysTz(day, 7);
  }
}

@Injectable()
export class FloristSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateSubscriptionDto) {
    const count = await this.prisma.floristSubscription.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const subscriptionNumber = `FS-${year}-${String(count + 1).padStart(4, '0')}`;
    const start = parseDay(dto.startDate);
    if (!start) throw new BadRequestException('Shuru ki tareekh likhein');
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
    }

    return this.prisma.floristSubscription.create({
      data: {
        tenantId: user.tenantId,
        subscriptionNumber,
        customerId: dto.customerId || undefined,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryAddress: dto.deliveryAddress,
        planName: dto.planName,
        frequency: dto.frequency,
        bouquetType: dto.bouquetType,
        pricePerDelivery: dto.pricePerDelivery,
        startDate: start,
        endDate: parseDay(dto.endDate),
        nextDeliveryDate: start,
        preferences: dto.preferences,
        notes: dto.notes,
        status: 'ACTIVE',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; search?: string }) {
    return this.prisma.floristSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.search && {
          OR: [
            { subscriptionNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { nextDeliveryDate: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.floristSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    return s;
  }

  /**
   * One delivery done. Its price is billed to the customer's khata (they pay
   * through the khata as usual), so subscriptions show in sales, profit and
   * udhaar. Before, a delivery only moved the date and earned nothing.
   */
  async markDelivered(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const s = await this.prisma.floristSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    if (s.status !== 'ACTIVE') throw new BadRequestException('Sirf chalti subscription ki delivery likhi ja sakti hai');
    // A second tap would bill the same delivery twice.
    if (s.nextDeliveryDate && s.nextDeliveryDate > dayEnd()) {
      throw new BadRequestException(`Agli delivery ${dayKey(s.nextDeliveryDate)} ko hai — aaj ki delivery likhi ja chuki hai`);
    }
    const next = calcNextDelivery(s.frequency, new Date());
    const deliveryNo = s.completedDeliveries + 1;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.floristSubscription.updateMany({
        where: { id, completedDeliveries: s.completedDeliveries },
        data: { completedDeliveries: deliveryNo, totalDeliveries: { increment: 1 }, nextDeliveryDate: next },
      });
      if (claimed.count === 0) throw new BadRequestException('Delivery abhi likhi ja chuki hai — page refresh karein');

      let sale: { id: string; saleNumber: string } | null = null;
      if (s.pricePerDelivery > 0) {
        const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
        const customerId = await ensureCustomer(tx, user, { customerId: s.customerId, name: s.customerName, phone: s.customerPhone, shopId });
        const posted = await postIndustrySale(tx, user, {
          saleNumber: `${s.subscriptionNumber}-${deliveryNo}`,
          sourceRef: s.subscriptionNumber,
          shopId,
          customerId,
          lines: [{ label: `${s.planName} — ${s.bouquetType} (delivery ${deliveryNo})`, amount: s.pricePerDelivery }],
          paidAmount: 0,
          paymentMethod: 'CASH',
        });
        sale = { id: posted.id, saleNumber: posted.saleNumber };
        if (!s.customerId) await tx.floristSubscription.update({ where: { id }, data: { customerId } });
      }
      const updated = await tx.floristSubscription.findUniqueOrThrow({ where: { id } });
      return { ...updated, sale };
    });
  }

  async pause(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.floristSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    return this.prisma.floristSubscription.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async resume(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.floristSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    return this.prisma.floristSubscription.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.floristSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    return this.prisma.floristSubscription.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.floristSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    return this.prisma.floristSubscription.delete({ where: { id } });
  }

  async dueToday(user: AuthenticatedUser) {
    // Due today, plus any that were missed on earlier days.
    return this.prisma.floristSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        nextDeliveryDate: { lte: dayEnd() },
      },
      orderBy: { nextDeliveryDate: 'asc' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const [active, paused, cancelled] = await Promise.all([
      this.prisma.floristSubscription.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.floristSubscription.count({ where: { tenantId: user.tenantId, status: 'PAUSED' } }),
      this.prisma.floristSubscription.count({ where: { tenantId: user.tenantId, status: 'CANCELLED' } }),
    ]);
    return { active, paused, cancelled };
  }
}
