import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.meatSubscription.count({ where: { tenantId: user.tenantId } });
    const subscriptionNumber = 'SUB-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const nextDeliveryDate = this.calculateNextDate(startDate, dto.frequency);

    return this.prisma.meatSubscription.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        subscriptionNumber,
        startDate,
        nextDeliveryDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  private calculateNextDate(from: Date, frequency: string): Date {
    const next = new Date(from);
    switch (frequency) {
      case 'DAILY': next.setDate(next.getDate() + 1); break;
      case 'ALTERNATE_DAY': next.setDate(next.getDate() + 2); break;
      case 'WEEKLY': next.setDate(next.getDate() + 7); break;
      case 'BIWEEKLY': next.setDate(next.getDate() + 14); break;
      case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
      default: next.setDate(next.getDate() + 7);
    }
    return next;
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; frequency?: string }) {
    return this.prisma.meatSubscription.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.frequency && { frequency: params.frequency as any }),
      },
      orderBy: { nextDeliveryDate: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.meatSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const s = await this.prisma.meatSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Subscription not found');
    return this.prisma.meatSubscription.update({ where: { id }, data: dto });
  }

  async pause(user: AuthenticatedUser, id: string, reason?: string) {
    return this.prisma.meatSubscription.update({
      where: { id },
      data: { status: 'PAUSED', pausedAt: new Date(), pauseReason: reason },
    });
  }

  async resume(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.meatSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Not found');
    return this.prisma.meatSubscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
        pauseReason: null,
        nextDeliveryDate: this.calculateNextDate(new Date(), s.frequency),
      },
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    return this.prisma.meatSubscription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });
  }

  async markDelivered(user: AuthenticatedUser, id: string, revenue: number) {
    const s = await this.prisma.meatSubscription.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Not found');
    return this.prisma.meatSubscription.update({
      where: { id },
      data: {
        lastDeliveryDate: new Date(),
        nextDeliveryDate: this.calculateNextDate(new Date(), s.frequency),
        totalDeliveries: s.totalDeliveries + 1,
        totalRevenue: s.totalRevenue + revenue,
      },
    });
  }
}
