import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingInterval } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(user: AuthenticatedUser) {
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (!sub) {
      const trialPlan = await this.prisma.plan.findUnique({
        where: { slug: 'free-trial' },
      });
      if (!trialPlan) return null;

      const created = await this.prisma.subscription.create({
        data: {
          tenantId: user.tenantId,
          planId: trialPlan.id,
          status: 'TRIAL',
          interval: 'MONTHLY',
          amount: 0,
          trialEndsAt: addDays(new Date(), trialPlan.trialDays),
          currentPeriodStart: new Date(),
          currentPeriodEnd: addDays(new Date(), trialPlan.trialDays),
        },
        include: { plan: true },
      });
      return created;
    }

    return sub;
  }

  async startSubscription(
    user: AuthenticatedUser,
    planId: string,
    interval: BillingInterval,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    let amount = plan.priceMonthly;
    let periodEnd = addMonths(new Date(), 1);

    if (interval === 'QUARTERLY') {
      amount = plan.priceQuarterly;
      periodEnd = addMonths(new Date(), 3);
    } else if (interval === 'YEARLY') {
      amount = plan.priceYearly;
      periodEnd = addMonths(new Date(), 12);
    }

    const existing = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'TRIAL'] } },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    const sub = await this.prisma.subscription.create({
      data: {
        tenantId: user.tenantId,
        planId: plan.id,
        status: 'PENDING_PAYMENT',
        interval,
        amount,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });

    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: user.tenantId,
        subscriptionId: sub.id,
        invoiceNumber,
        status: 'PENDING',
        subtotal: amount,
        total: amount,
        amountDue: amount,
        description: `${plan.name} — ${interval}`,
        dueDate: addDays(new Date(), 7),
        periodStart: new Date(),
        periodEnd,
      },
    });

    return { subscription: sub, invoice };
  }

  async cancel(user: AuthenticatedUser) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });
    if (!sub) throw new NotFoundException('No active subscription');

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    });
  }
}
