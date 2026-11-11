import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import {
  AssignPlanDto,
  ExtendSubscriptionDto,
} from './dto/assign-plan.dto';
import { apiMessage } from '../../common/i18n/api-message';
import { startOfDayTz } from '../../common/helpers/business-time.helper';
import { EntitlementsService } from '../../modules/billing/entitlements/entitlements.service';
import { nextInvoiceNumber } from '../../modules/billing/pricing/invoice-number';
import { writeInvoiceItems } from '../../modules/billing/pricing/pricing-core';

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** A plan change shows at once: fresh entitlements and channels paused or resumed. */
  private async refreshShop(tenantId: string) {
    this.entitlements.invalidate(tenantId);
    await this.entitlements.syncChannels(tenantId).catch(() => undefined);
  }

  async list(params: {
    status?: SubscriptionStatus;
    planId?: string;
    interval?: string;
    endingInDays?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = { tenant: { slug: { not: 'nafaa-system' } } };
    if (params.status) where.status = params.status;
    if (params.planId) where.planId = params.planId;
    if (params.interval) where.interval = params.interval as any;
    if (params.endingInDays) {
      // Running plans whose period ends within the next N days.
      where.status = { in: ['ACTIVE', 'TRIAL'] };
      where.currentPeriodEnd = { gte: new Date(), lt: addDays(startOfDayTz(), params.endingInDays + 1) };
    }
    if (params.search) {
      where.tenant = {
        slug: { not: 'nafaa-system' },
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
    const real = { tenant: { slug: { not: 'nafaa-system' } } };
    const [total, active, trial, pastDue, cancelled, expired, byInterval, endingSoon] =
      await Promise.all([
        this.prisma.subscription.count({ where: real }),
        this.prisma.subscription.count({ where: { ...real, status: 'ACTIVE' } }),
        this.prisma.subscription.count({ where: { ...real, status: 'TRIAL' } }),
        this.prisma.subscription.count({ where: { ...real, status: 'PAST_DUE' } }),
        this.prisma.subscription.count({ where: { ...real, status: 'CANCELLED' } }),
        this.prisma.subscription.count({ where: { ...real, status: 'EXPIRED' } }),
        this.prisma.subscription.groupBy({
          by: ['interval'],
          where: { ...real, status: 'ACTIVE' },
          _sum: { amount: true },
        }),
        this.prisma.subscription.count({
          where: {
            ...real,
            status: { in: ['ACTIVE', 'TRIAL'] },
            currentPeriodEnd: { gte: new Date(), lt: addDays(startOfDayTz(), 8) },
          },
        }),
      ]);

    // Monthly recurring revenue: quarterly and yearly amounts are spread over their months.
    const months: Record<string, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };
    const mrr = byInterval.reduce((sum, r) => sum + (r._sum.amount ?? 0) / (months[r.interval] ?? 1), 0);

    return {
      total,
      active,
      trial,
      pastDue,
      cancelled,
      expired,
      endingSoon,
      mrrEstimate: Math.round(mrr),
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

    // An admin deal: a custom price for this period (0 = a free gift).
    const listPrice = amount;
    if (dto.customAmount != null) amount = Math.max(0, Math.round(dto.customAmount));
    const paid = dto.markAsPaid !== false;

    const result = await this.prisma.$transaction(async (tx) => {
      // The new plan replaces every running or waiting one.
      await tx.subscription.updateMany({
        where: {
          tenantId: dto.tenantId,
          status: { in: ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT', 'PAST_DUE'] },
        },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      const sub = await tx.subscription.create({
        data: {
          tenantId: dto.tenantId,
          planId: plan.id,
          status: paid ? 'ACTIVE' : 'PENDING_PAYMENT',
          interval: dto.interval,
          amount,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      const invoice = await tx.invoice.create({
        data: {
          tenantId: dto.tenantId,
          subscriptionId: sub.id,
          invoiceNumber: await nextInvoiceNumber(tx),
          status: paid ? 'PAID' : 'PENDING',
          subtotal: amount,
          total: amount,
          amountPaid: paid ? amount : 0,
          amountDue: paid ? 0 : amount,
          description: `${plan.name} — ${dto.interval} (assigned by admin)`,
          notes: dto.notes,
          dueDate: addDays(new Date(), 7),
          paidAt: paid ? new Date() : null,
          periodStart: new Date(),
          periodEnd,
        },
      });
      await writeInvoiceItems(tx, invoice.id, [{
        kind: 'PLAN',
        refId: plan.id,
        description: amount !== listPrice ? `${plan.name} plan (${dto.interval.toLowerCase()}, admin price)` : `${plan.name} plan (${dto.interval.toLowerCase()})`,
        quantity: 1,
        unitPrice: amount,
        amount,
      }], new Date(), periodEnd);

      // A free gift records no money received.
      if (paid && amount > 0) {
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
      }
      if (paid) {
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
      message: paid && amount === 0
        ? apiMessage('Aap ko {{plan}} plan free mein assign kiya gaya hai.', { plan: plan.name })
        : apiMessage('Aap ko {{plan}} plan assign kiya gaya hai.', { plan: plan.name }),
      link: '/billing',
    });

    await this.refreshShop(dto.tenantId);
    return result;
  }

  async extend(adminUserId: string, subscriptionId: string, dto: ExtendSubscriptionDto) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    // Days are added from today when the period already ended, so an expired
    // shop really gets the days. A trial stays a trial (longer), not a paid plan.
    const now = new Date();
    const isTrial = sub.status === 'TRIAL' || (sub.status === 'EXPIRED' && !!sub.trialEndsAt && sub.trialEndsAt >= sub.currentPeriodEnd);
    const base = isTrial ? (sub.trialEndsAt && sub.trialEndsAt > now ? sub.trialEndsAt : now) : (sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now);
    const newEnd = addDays(base, dto.days);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: isTrial
        ? { trialEndsAt: newEnd, currentPeriodEnd: newEnd, status: 'TRIAL' }
        : { currentPeriodEnd: newEnd, status: 'ACTIVE' },
    });

    await this.notifications.create({
      tenantId: sub.tenantId,
      type: 'SUCCESS',
      title: 'Subscription Extended ⏰',
      message: dto.reason
        ? apiMessage('Aap ki subscription {{days}} din extend ho gayi. Reason: {{reason}}', { days: dto.days, reason: dto.reason })
        : apiMessage('Aap ki subscription {{days}} din extend ho gayi.', { days: dto.days }),
      link: '/billing',
    });

    await this.refreshShop(sub.tenantId);
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

    await this.refreshShop(sub.tenantId);
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

    await this.refreshShop(sub.tenantId);
    return updated;
  }
}
