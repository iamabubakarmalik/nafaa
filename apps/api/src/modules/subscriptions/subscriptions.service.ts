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

  /**
   * Get current active subscription for tenant
   * Returns active/trial sub OR auto-creates a trial if none exists
   */
  async getCurrent(user: AuthenticatedUser) {
    // Look for ACTIVE or TRIAL subscription first (the "live" one)
    let sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (sub) {
      // Check if expired and auto-update status
      if (sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
        sub = await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' },
          include: { plan: true },
        });
      }
      if (sub.status === 'ACTIVE' && sub.currentPeriodEnd < new Date()) {
        sub = await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE' },
          include: { plan: true },
        });
      }
      return sub;
    }

    // No active subscription — check if there's a pending upgrade
    const pending = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING_PAYMENT',
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    if (pending) return pending;

    // First time user — create trial
    const trialPlan = await this.prisma.plan.findUnique({
      where: { slug: 'free-trial' },
    });
    if (!trialPlan) return null;

    return this.prisma.subscription.create({
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
  }

  /**
   * Get any pending upgrade (PENDING_PAYMENT subscription with unpaid invoice)
   * Used by mobile/web to show "Pending Upgrade" banner
   */
  async getPendingUpgrade(user: AuthenticatedUser) {
    const pending = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING_PAYMENT',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        invoices: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!pending || pending.invoices.length === 0) return null;

    return {
      subscription: {
        id: pending.id,
        plan: pending.plan,
        interval: pending.interval,
        amount: pending.amount,
        createdAt: pending.createdAt,
      },
      invoice: pending.invoices[0],
    };
  }

  /**
   * Start subscription upgrade — DOES NOT cancel current subscription
   * Creates PENDING_PAYMENT subscription + invoice
   * Current TRIAL/ACTIVE sub stays UNTOUCHED until payment is approved
   */
  async startSubscription(
    user: AuthenticatedUser,
    planId: string,
    interval: BillingInterval,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    if (plan.slug === 'free-trial') {
      throw new BadRequestException('Free trial khud activate nahi kar sakte');
    }

    // Calculate amount + period based on interval
    let amount = plan.priceMonthly;
    let periodEnd = addMonths(new Date(), 1);

    if (interval === 'QUARTERLY') {
      amount = plan.priceQuarterly;
      periodEnd = addMonths(new Date(), 3);
    } else if (interval === 'YEARLY') {
      amount = plan.priceYearly;
      periodEnd = addMonths(new Date(), 12);
    }

    if (!amount || amount <= 0) {
      throw new BadRequestException('Is plan ki price set nahi hai');
    }

    // Check for existing pending upgrade — return that instead of creating duplicate
    const existingPending = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING_PAYMENT',
        planId: plan.id,
        interval,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        invoices: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingPending && existingPending.invoices.length > 0) {
      // Reuse existing pending — don't duplicate
      return {
        subscription: existingPending,
        invoice: existingPending.invoices[0],
        reused: true,
      };
    }

    // Cancel ONLY other pending upgrades (different plan/interval)
    // DO NOT touch active TRIAL / ACTIVE subscription
    await this.prisma.subscription.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING_PAYMENT',
      },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // Also cancel any prior unpaid invoices for those pending
    await this.prisma.invoice.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING',
        subscription: { status: 'CANCELLED' },
      },
      data: { status: 'CANCELLED' },
    });

    // Create new PENDING subscription + invoice in single transaction
    return this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
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
      const invoice = await tx.invoice.create({
        data: {
          tenantId: user.tenantId,
          subscriptionId: sub.id,
          invoiceNumber,
          status: 'PENDING',
          subtotal: amount,
          total: amount,
          amountDue: amount,
          description: `${plan.name} — ${interval.toLowerCase()}`,
          dueDate: addDays(new Date(), 7),
          periodStart: new Date(),
          periodEnd,
        },
      });

      return { subscription: sub, invoice, reused: false };
    });
  }

  /**
   * Cancel a pending upgrade (before payment)
   * Does NOT affect active subscription
   */
  async cancelPendingUpgrade(user: AuthenticatedUser, subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        tenantId: user.tenantId,
        status: 'PENDING_PAYMENT',
      },
    });
    if (!sub) throw new NotFoundException('Pending upgrade not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await tx.invoice.updateMany({
        where: {
          subscriptionId: sub.id,
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        data: { status: 'CANCELLED' },
      });
      return { success: true };
    });
  }

  /**
   * Cancel current ACTIVE subscription (sets cancelAtPeriodEnd = true)
   * User retains access until current period ends
   */
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

  /**
   * Re-activate cancelled subscription (only works during current period)
   */
  async reactivate(user: AuthenticatedUser) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['ACTIVE', 'TRIAL'] },
        cancelAtPeriodEnd: true,
      },
    });
    if (!sub) throw new NotFoundException('No cancellable subscription found');

    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: false },
    });
  }
}
