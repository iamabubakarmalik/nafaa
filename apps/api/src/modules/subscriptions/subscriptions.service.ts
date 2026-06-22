import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingInterval } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger('SubscriptionsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-PK').format(amount);
  }

  private get appUrl() {
    return this.config.get<string>('APP_URL') || 'http://localhost:5173';
  }

  /**
   * Get current LIVE subscription for tenant.
   * Priority: ACTIVE > TRIAL (not expired) > PAST_DUE
   * PENDING_PAYMENT is shown SEPARATELY via getPendingUpgrade().
   * If nothing — auto-create a trial.
   */
  async getCurrent(user: AuthenticatedUser) {
    const now = new Date();

    // 1. Try ACTIVE first
    let sub = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (sub) {
      if (sub.currentPeriodEnd < now) {
        sub = await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE' },
          include: { plan: true },
        });
      }
      return sub;
    }

    // 2. Try TRIAL (not expired)
    sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'TRIAL',
        trialEndsAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    if (sub) return sub;

    // 3. Mark any expired trials as EXPIRED
    await this.prisma.subscription.updateMany({
      where: {
        tenantId: user.tenantId,
        status: 'TRIAL',
        trialEndsAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });

    // 4. Try PAST_DUE
    sub = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId, status: 'PAST_DUE' },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    if (sub) return sub;

    // 5. Check EXPIRED — return latest expired so frontend can show "Expired" state
    sub = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId, status: 'EXPIRED' },
      orderBy: { updatedAt: 'desc' },
      include: { plan: true },
    });
    if (sub) return sub;

    // 6. No subscription history at all — first-time user → create trial
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
   * Get pending upgrade (PENDING_PAYMENT subscription + its unpaid invoice).
   * Returns ONLY the latest one — older pending are cancelled when new one is started.
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
   * Start subscription upgrade — keeps current TRIAL/ACTIVE intact.
   * Cancels any OTHER pending upgrades (different plan) + their invoices.
   * Returns existing pending if exact same plan/interval was already pending.
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

    // Calculate price + period
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

    // 1. Check exact match pending — reuse it
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
      return {
        subscription: existingPending,
        invoice: existingPending.invoices[0],
        reused: true,
      };
    }

    // 2. Cancel ALL other pending upgrades (different plan/interval) + their invoices
    //    Use transaction to make sure both are cancelled together
    await this.prisma.$transaction(async (tx) => {
      // Get IDs of all pending subs (so we can cancel their invoices reliably)
      const oldPending = await tx.subscription.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'PENDING_PAYMENT',
        },
        select: { id: true },
      });

      const oldIds = oldPending.map((s) => s.id);

      if (oldIds.length > 0) {
        // Cancel old pending subscriptions
        await tx.subscription.updateMany({
          where: { id: { in: oldIds } },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });

        // Cancel their unpaid invoices
        await tx.invoice.updateMany({
          where: {
            subscriptionId: { in: oldIds },
            status: { in: ['PENDING', 'OVERDUE'] },
          },
          data: { status: 'CANCELLED' },
        });
      }
    });

    // 3. Create new PENDING subscription + invoice
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
   * Cancel a specific pending upgrade
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
   * Cancel current ACTIVE subscription (at period end)
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
   * Re-activate cancelled subscription
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

  // ───────────────────────────────────────────────────────────
  // PAYMENT FLOW NOTIFICATIONS (called by admin billing service)
  // ───────────────────────────────────────────────────────────

  async notifyPaymentSubmitted(params: {
    tenantId: string;
    subscriptionId: string;
    invoiceId: string;
    paymentMethod: string;
    reference: string;
  }) {
    try {
      const [sub, invoice, owner] = await Promise.all([
        this.prisma.subscription.findUnique({
          where: { id: params.subscriptionId },
          include: { plan: true },
        }),
        this.prisma.invoice.findUnique({ where: { id: params.invoiceId } }),
        this.prisma.user.findFirst({
          where: { tenantId: params.tenantId, role: 'OWNER' },
          select: { email: true, fullName: true },
        }),
      ]);

      if (!sub || !invoice || !owner) return;

      await this.email.send({
        tenantId: params.tenantId,
        templateSlug: 'payment-submitted',
        toEmail: owner.email,
        toName: owner.fullName,
        variables: {
          name: owner.fullName,
          planName: sub.plan.name,
          amount: this.formatAmount(sub.amount),
          paymentMethod: params.paymentMethod,
          reference: params.reference,
          invoiceNumber: invoice.invoiceNumber,
          appUrl: this.appUrl,
        },
      });
    } catch (e: any) {
      this.logger.error(`Payment submitted email failed: ${e.message}`);
    }
  }

  /**
   * Approve payment → Cancel ALL other subs/invoices → Activate this one
   * This is the KEY method that finally activates the upgrade.
   */
  async notifyPaymentApprovedAndActivate(subscriptionId: string) {
    try {
      const sub = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true, tenant: { select: { id: true, name: true } } },
      });
      if (!sub) return;

      await this.prisma.$transaction(async (tx) => {
        // Cancel ALL other subs (TRIAL, ACTIVE, PAST_DUE, other PENDING_PAYMENT)
        const otherSubs = await tx.subscription.findMany({
          where: {
            tenantId: sub.tenantId,
            id: { not: sub.id },
            status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PENDING_PAYMENT'] },
          },
          select: { id: true },
        });
        const otherIds = otherSubs.map((s) => s.id);

        if (otherIds.length > 0) {
          await tx.subscription.updateMany({
            where: { id: { in: otherIds } },
            data: { status: 'CANCELLED', cancelledAt: new Date() },
          });
          // Cancel their pending invoices too
          await tx.invoice.updateMany({
            where: {
              subscriptionId: { in: otherIds },
              status: { in: ['PENDING', 'OVERDUE'] },
            },
            data: { status: 'CANCELLED' },
          });
        }

        // Activate this subscription
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
          },
        });

        // Mark this invoice as paid
        await tx.invoice.updateMany({
          where: {
            subscriptionId: sub.id,
            status: { in: ['PENDING', 'OVERDUE'] },
          },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            amountPaid: sub.amount,
            amountDue: 0,
          },
        });

        // Tenant status → ACTIVE
        await tx.tenant.update({
          where: { id: sub.tenantId },
          data: { status: 'ACTIVE' },
        });
      });

      // Send approval email
      const owner = await this.prisma.user.findFirst({
        where: { tenantId: sub.tenantId, role: 'OWNER' },
        select: { email: true, fullName: true },
      });
      if (!owner) return;

      await this.email.send({
        tenantId: sub.tenantId,
        templateSlug: 'payment-approved',
        toEmail: owner.email,
        toName: owner.fullName,
        variables: {
          name: owner.fullName,
          shopName: sub.tenant.name,
          planName: sub.plan.name,
          amount: this.formatAmount(sub.amount),
          interval: sub.interval,
          periodEnd: new Intl.DateTimeFormat('en-PK', {
            dateStyle: 'long',
            timeZone: 'Asia/Karachi',
          }).format(sub.currentPeriodEnd),
          appUrl: this.appUrl,
        },
      });

      this.logger.log(`✅ Payment approved & subscription activated: ${sub.id}`);
    } catch (e: any) {
      this.logger.error(`Payment approval email failed: ${e.message}`);
    }
  }

  async notifyPaymentRejected(params: { subscriptionId: string; reason?: string }) {
    try {
      const sub = await this.prisma.subscription.findUnique({
        where: { id: params.subscriptionId },
        include: { tenant: { select: { id: true, name: true } } },
      });
      if (!sub) return;

      await this.prisma.$transaction(async (tx) => {
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
      });

      const owner = await this.prisma.user.findFirst({
        where: { tenantId: sub.tenantId, role: 'OWNER' },
        select: { email: true, fullName: true },
      });
      if (!owner) return;

      await this.email.send({
        tenantId: sub.tenantId,
        templateSlug: 'payment-rejected',
        toEmail: owner.email,
        toName: owner.fullName,
        variables: {
          name: owner.fullName,
          shopName: sub.tenant.name,
          reason: params.reason || 'Payment details verify nahi ho sake.',
          appUrl: this.appUrl,
        },
      });
    } catch (e: any) {
      this.logger.error(`Payment rejected email failed: ${e.message}`);
    }
  }

  /**
   * Admin tool — cleanup duplicate/orphan pending subscriptions for a tenant
   * Useful for fixing bad data
   */
  async cleanupPendingSubscriptions(tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Find latest pending
      const pending = await tx.subscription.findMany({
        where: { tenantId, status: 'PENDING_PAYMENT' },
        orderBy: { createdAt: 'desc' },
      });

      if (pending.length <= 1) {
        return { kept: pending.length, cancelled: 0 };
      }

      const keep = pending[0];
      const cancelIds = pending.slice(1).map((p) => p.id);

      await tx.subscription.updateMany({
        where: { id: { in: cancelIds } },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

      await tx.invoice.updateMany({
        where: {
          subscriptionId: { in: cancelIds },
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        data: { status: 'CANCELLED' },
      });

      return { kept: 1, cancelled: cancelIds.length, keptId: keep.id };
    });
  }
}
