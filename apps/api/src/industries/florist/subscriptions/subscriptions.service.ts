import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

function calcNextDelivery(freq: string, from: Date): Date {
  const next = new Date(from);
  switch ((freq || '').toUpperCase()) {
    case 'DAILY': next.setDate(next.getDate() + 1); break;
    case 'WEEKLY': next.setDate(next.getDate() + 7); break;
    case 'BIWEEKLY': next.setDate(next.getDate() + 14); break;
    case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
    default: next.setDate(next.getDate() + 7);
  }
  return next;
}

@Injectable()
export class FloristSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateSubscriptionDto) {
    const count = await this.prisma.floristSubscription.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const subscriptionNumber = `FS-${year}-${String(count + 1).padStart(4, '0')}`;
    const start = new Date(dto.startDate);

    return this.prisma.floristSubscription.create({
      data: {
        tenantId: user.tenantId,
        subscriptionNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryAddress: dto.deliveryAddress,
        planName: dto.planName,
        frequency: dto.frequency,
        bouquetType: dto.bouquetType,
        pricePerDelivery: dto.pricePerDelivery,
        startDate: start,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
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

  async markDelivered(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.floristSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    const next = calcNextDelivery(s.frequency, new Date());
    return this.prisma.floristSubscription.update({
      where: { id },
      data: {
        completedDeliveries: s.completedDeliveries + 1,
        nextDeliveryDate: next,
      },
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
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    return this.prisma.floristSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        nextDeliveryDate: { gte: start, lte: end },
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
