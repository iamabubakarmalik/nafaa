import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  AssignPlanDto,
  ExtendSubscriptionDto,
} from './dto/assign-plan.dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(params: {
    status?: SubscriptionStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.tenant = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { slug: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true, slug: true, status: true } },
          plan: true,
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async stats() {
    const [total, active, trial, pastDue, cancelled, expired, mrrAgg] =
      await Promise.all([
        this.prisma.subscription.count(),
        this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        this.prisma.subscription.count({ where: { status: 'TRIAL' } }),
        this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
        this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
        this.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
        this.prisma.subscription.aggregate({
          where: { status: 'ACTIVE' },
          _sum: { amount: true },
        }),
      ]);

    return {
      total,
      active,
      trial,
      pastDue,
      cancelled,
      expired,
      mrrEstimate: mrrAgg._sum.amount ?? 0,
    };
  }

  async assignPlan(adminUserId: string, dto: AssignPlanDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    let amount = plan.priceMonthly;
    let periodEnd = addMonths(new Date(), 1);

    if (dto.interval === 'QUARTERLY') {
      amount = plan.priceQuarterly;
      periodEnd = addMonths(new Date(), 3);
    } else if (dto.interval === 'YEARLY') {
      amount = plan.priceYearly;
      periodEnd = addMonths(new Date(), 12);
    }

    if (dto.customDays) {
      periodEnd = addDays(new Date(), dto.customDays);
    }

    const existing = await this.prisma.subscription.findFirst({
      where: {
        tenantId: dto.tenantId,
        status: { in: ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT'] },
      },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          tenantId: dto.tenantId,
          planId: plan.id,
          status: dto.markAsPaid !== false ? 'ACTIVE' : 'PENDING_PAYMENT',
          interval: dto.interval,
          amount,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
      const invoice = await tx.invoice.create({
        data: {
          tenantId: dto.tenantId,
          subscriptionId: sub.id,
          invoiceNumber,
          status: dto.markAsPaid !== false ? 'PAID' : 'PENDING',
          subtotal: amount,
          total: amount,
          amountPaid: dto.markAsPaid !== false ? amount : 0,
          amountDue: dto.markAsPaid !== false ? 0 : amount,
          description: `${plan.name} — ${dto.interval} (assigned by admin)`,
          notes: dto.notes,
          dueDate: addDays(new Date(), 7),
          paidAt: dto.markAsPaid !== false ? new Date() : null,
          periodStart: new Date(),
          periodEnd,
        },
      });

      if (dto.markAsPaid !== false) {
        await tx.payment.create({
          data: {
            tenantId: dto.tenantId,
            subscriptionId: sub.id,
            invoiceId: invoice.id,
            amount,
            provider: 'CASH',
            status: 'APPROVED',
            payerName: 'Admin Manual Assignment',
            notes: dto.notes,
            approvedById: adminUserId,
            approvedAt: new Date(),
            paidAt: new Date(),
          },
        });

        await tx.tenant.update({
          where: { id: dto.tenantId },
          data: { status: 'ACTIVE' },
        });
      }

      return { subscription: sub, invoice };
    });

    await this.notifications.create({
      tenantId: dto.tenantId,
      type: 'SUCCESS',
      title: 'Plan Assigned 🎉',
      message: `Aap ko ${plan.name} plan ${dto.markAsPaid !== false ? 'free mein' : ''} assign kiya gaya hai.`,
      link: '/billing',
    });

    return result;
  }

  async extend(adminUserId: string, subscriptionId: string, dto: ExtendSubscriptionDto) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    const newEnd = addDays(sub.currentPeriodEnd, dto.days);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodEnd: newEnd,
        status: 'ACTIVE',
      },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'SUCCESS',
      title: 'Subscription Extended ⏰',
      message: `Aap ki subscription ${dto.days} din extend ho gayi. ${dto.reason ? `Reason: ${dto.reason}` : ''}`,
      link: '/billing',
    });

    return updated;
  }

  async cancel(subscriptionId: string, reason?: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'WARNING',
      title: 'Subscription Cancelled',
      message: reason || 'Aap ki subscription admin ne cancel ki hai.',
    });

    return updated;
  }

  async activate(subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.tenant.update({
      where: { id: sub.tenantId },
      data: { status: 'ACTIVE' },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'SUCCESS',
      title: 'Subscription Activated ✅',
      message: 'Aap ki subscription admin ne activate kar di hai.',
    });

    return updated;
  }
}
