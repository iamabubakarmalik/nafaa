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
   * Returns ONLY the latest one — older pending are cancelled automatically.
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
   * Start subscription upgrade — ATOMIC operation.
   *
   * Logic:
   *  1. Validate plan + price
   *  2. ✅ If exact same plan+interval already pending → REUSE it (no duplicate!)
   *  3. ⚠️ If different pending exists → cancel it + its invoice
   *  4. Create new pending subscription + invoice
   *
   * Everything inside ONE transaction → no race conditions, no orphan invoices.
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

    // ═══════════════════════════════════════════════════════════
    // SINGLE ATOMIC TRANSACTION — handles everything safely
    // ═══════════════════════════════════════════════════════════
    return this.prisma.$transaction(async (tx) => {
      // ─── STEP 1: Check for existing EXACT MATCH (same plan + interval) ───
      const exactMatch = await tx.subscription.findFirst({
        where: {
          tenantId: user.tenantId,
          status: 'PENDING_PAYMENT',
          planId: plan.id,
          interval,
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

      if (exactMatch && exactMatch.invoices.length > 0) {
        this.logger.log(`♻️  Reusing existing pending: ${exactMatch.id}`);
        return {
          subscription: exactMatch,
          invoice: exactMatch.invoices[0],
          reused: true,
          cancelledCount: 0,
        };
      }

      // ─── STEP 2: Cancel ALL other pending subs + their invoices ───
      const otherPending = await tx.subscription.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'PENDING_PAYMENT',
          // If exact match exists but has no invoice, we still want to cancel it
          // (clean orphan)
          NOT: exactMatch ? { id: exactMatch.id } : undefined,
        },
        select: { id: true },
      });

      const cancelIds = otherPending.map((s) => s.id);
      let cancelledCount = 0;

      if (cancelIds.length > 0) {
        // Cancel old pending subscriptions
        const cancelledSubs = await tx.subscription.updateMany({
          where: { id: { in: cancelIds } },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        cancelledCount = cancelledSubs.count;

        // Cancel their unpaid invoices
        await tx.invoice.updateMany({
          where: {
            subscriptionId: { in: cancelIds },
            status: { in: ['PENDING', 'OVERDUE'] },
          },
          data: { status: 'CANCELLED' },
        });

        this.logger.log(`🗑️  Cancelled ${cancelledCount} old pending subscriptions`);
      }

      // ─── STEP 3: If exactMatch existed but had no invoice (orphan) — cancel & recreate ───
      if (exactMatch && exactMatch.invoices.length === 0) {
        await tx.subscription.update({
          where: { id: exactMatch.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        cancelledCount++;
      }

      // ─── STEP 4: Create fresh pending subscription + invoice ───
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
        include: { plan: true },
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

      this.logger.log(`✨ Created new pending: ${sub.id} → invoice: ${invoice.invoiceNumber}`);

      return {
        subscription: sub,
        invoice,
        reused: false,
        cancelledCount,
      };
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
  // PAYMENT FLOW NOTIFICATIONS
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
   */
  async notifyPaymentApprovedAndActivate(subscriptionId: string) {
    try {
      const sub = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true, tenant: { select: { id: true, name: true } } },
      });
      if (!sub) return;

      await this.prisma.$transaction(async (tx) => {
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
          await tx.invoice.updateMany({
            where: {
              subscriptionId: { in: otherIds },
              status: { in: ['PENDING', 'OVERDUE'] },
            },
            data: { status: 'CANCELLED' },
          });
        }

        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
          },
        });

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

        await tx.tenant.update({
          where: { id: sub.tenantId },
          data: { status: 'ACTIVE' },
        });
      });

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
   * Admin tool — cleanup ALL duplicate pending subscriptions for a tenant.
   * Keeps the LATEST one with a valid invoice, cancels all others.
   */
  async cleanupPendingSubscriptions(tenantId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Find ALL pending with their invoices
      const pending = await tx.subscription.findMany({
        where: { tenantId, status: 'PENDING_PAYMENT' },
        orderBy: { createdAt: 'desc' },
        include: {
          invoices: {
            where: { status: { in: ['PENDING', 'OVERDUE'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (pending.length === 0) {
        return { kept: 0, cancelled: 0, message: 'No pending found' };
      }

      // Prefer one that HAS an invoice as the "keeper"
      const withInvoice = pending.find((p) => p.invoices.length > 0);
      const keep = withInvoice || pending[0];

      const cancelIds = pending.filter((p) => p.id !== keep.id).map((p) => p.id);

      if (cancelIds.length > 0) {
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
      }

      this.logger.log(`🧹 Cleanup for tenant ${tenantId}: kept ${keep.id}, cancelled ${cancelIds.length}`);

      return {
        kept: 1,
        cancelled: cancelIds.length,
        keptId: keep.id,
        message: cancelIds.length > 0
          ? `${cancelIds.length} duplicate cancel ho gaye`
          : 'Sirf 1 pending hai — sab theek hai',
      };
    });
  }
}
