import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingInterval, Prisma } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

/** Months added to the billing period for each interval. */
const INTERVAL_MONTHS: Record<BillingInterval, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger('SubscriptionsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notifications: NotificationsService,
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
   * Build a collision-resistant invoice number.
   * The old `INV-<last 8 digits of Date.now()>` scheme repeats every ~28 hours
   * and `invoiceNumber` is UNIQUE, so two tenants subscribing in the same
   * millisecond-window could crash each other's checkout.
   */
  private async nextInvoiceNumber(tx: any): Promise<string> {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
      const candidate = `INV-${ym}-${suffix}`;
      const clash = await tx.invoice.findUnique({
        where: { invoiceNumber: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    return `INV-${ym}-${Date.now().toString(36).toUpperCase()}`;
  }

  /** Price + period length for a plan/interval pair. */
  private priceFor(plan: any, interval: BillingInterval) {
    const amount =
      interval === 'YEARLY'
        ? plan.priceYearly
        : interval === 'QUARTERLY'
          ? plan.priceQuarterly
          : plan.priceMonthly;

    if (!amount || amount <= 0) {
      throw new BadRequestException(
        `${plan.name} ki ${interval.toLowerCase()} price set nahi hai. Doosra interval choose karein.`,
      );
    }
    return { amount, months: INTERVAL_MONTHS[interval] };
  }

  /**
   * Start / change a subscription purchase — ONE atomic operation.
   *
   * A tenant is allowed exactly **one open checkout** at a time, and that
   * checkout is *editable*. So:
   *
   *  1. Same plan + same interval already open → hand back the same invoice.
   *  2. Different plan or interval → **re-price the open invoice in place**.
   *     This is what stops the "har click pe nayi invoice" pile-up: switching
   *     Basic-monthly → Basic-yearly edits INV-…, it does not mint a new one.
   *  3. A receipt is already under review → refuse to touch it, because the
   *     admin is about to approve money against those exact numbers.
   *  4. Nothing open → create the pending subscription + its invoice.
   */
  async startSubscription(
    user: AuthenticatedUser,
    planId: string,
    interval: BillingInterval,
  ) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) {
      throw new BadRequestException('Ye plan filhaal available nahi hai');
    }
    if (plan.slug === 'free-trial') {
      throw new BadRequestException('Free trial khud activate nahi kar sakte');
    }

    const { amount, months } = this.priceFor(plan, interval);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const periodEnd = addMonths(now, months);
      const description = `${plan.name} — ${interval.toLowerCase()}`;

      const openCheckouts = await tx.subscription.findMany({
        where: { tenantId: user.tenantId, status: 'PENDING_PAYMENT' },
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          invoices: {
            where: { status: { in: ['PENDING', 'OVERDUE'] } },
            orderBy: { createdAt: 'desc' },
            include: {
              payments: {
                where: { status: 'PENDING' },
                select: { id: true },
              },
            },
          },
        },
      });

      // ─── STEP 1: is any open invoice frozen by money in flight? ───
      for (const checkout of openCheckouts) {
        const frozenInvoice = checkout.invoices.find(
          (inv) => inv.payments.length > 0 || inv.amountPaid > 0,
        );
        if (!frozenInvoice) continue;

        if (checkout.planId === plan.id && checkout.interval === interval) {
          // Same thing they already paid for — just send them back to it.
          return {
            subscription: checkout,
            invoice: frozenInvoice,
            reused: true,
            repriced: false,
            locked: true,
            cancelledCount: 0,
          };
        }

        throw new BadRequestException(
          `Aap ki ${checkout.plan.name} ki payment abhi review mein hai (${frozenInvoice.invoiceNumber}). ` +
            `Admin ke approve ya reject karne ka intezaar karein — uske baad plan change kar sakte hain.`,
        );
      }

      // ─── STEP 2: keep the newest open checkout, retire any strays ───
      const [keeper, ...strays] = openCheckouts;
      let cancelledCount = 0;

      if (strays.length > 0) {
        const strayIds = strays.map((s) => s.id);
        const res = await tx.subscription.updateMany({
          where: { id: { in: strayIds } },
          data: { status: 'CANCELLED', cancelledAt: now },
        });
        cancelledCount = res.count;
        await tx.invoice.updateMany({
          where: {
            subscriptionId: { in: strayIds },
            status: { in: ['PENDING', 'OVERDUE'] },
          },
          data: { status: 'CANCELLED' },
        });
        this.logger.log(`🗑️  Retired ${cancelledCount} stray pending checkouts`);
      }

      if (keeper) {
        const invoice = keeper.invoices[0];

        if (invoice) {
          const unchanged =
            keeper.planId === plan.id &&
            keeper.interval === interval &&
            invoice.total === amount;

          if (unchanged) {
            this.logger.log(`♻️  Reusing open checkout: ${invoice.invoiceNumber}`);
            return {
              subscription: keeper,
              invoice,
              reused: true,
              repriced: false,
              locked: false,
              cancelledCount,
            };
          }

          // ─── Re-price the SAME invoice instead of minting a new one ───
          const subscription = await tx.subscription.update({
            where: { id: keeper.id },
            data: {
              planId: plan.id,
              interval,
              amount,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
            include: { plan: true },
          });

          const repricedInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PENDING',
              subtotal: amount,
              total: amount,
              amountDue: amount,
              description,
              dueDate: addDays(now, 7),
              periodStart: now,
              periodEnd,
            },
          });

          this.logger.log(
            `✏️  Re-priced ${invoice.invoiceNumber} → ${plan.name} ${interval} (Rs ${amount})`,
          );

          return {
            subscription,
            invoice: repricedInvoice,
            reused: true,
            repriced: true,
            locked: false,
            cancelledCount,
          };
        }

        // Pending subscription with no invoice — an orphan. Retire it.
        await tx.subscription.update({
          where: { id: keeper.id },
          data: { status: 'CANCELLED', cancelledAt: now },
        });
        cancelledCount++;
      }

      // ─── STEP 3: nothing open — create a fresh checkout ───
      const subscription = await tx.subscription.create({
        data: {
          tenantId: user.tenantId,
          planId: plan.id,
          status: 'PENDING_PAYMENT',
          interval,
          amount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      const invoice = await tx.invoice.create({
        data: {
          tenantId: user.tenantId,
          subscriptionId: subscription.id,
          invoiceNumber: await this.nextInvoiceNumber(tx),
          status: 'PENDING',
          subtotal: amount,
          total: amount,
          amountDue: amount,
          description,
          dueDate: addDays(now, 7),
          periodStart: now,
          periodEnd,
        },
      });

      this.logger.log(
        `✨ New checkout: ${plan.name} ${interval} → ${invoice.invoiceNumber}`,
      );

      return {
        subscription,
        invoice,
        reused: false,
        repriced: false,
        locked: false,
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
      include: {
        invoices: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          include: {
            payments: { where: { status: 'PENDING' }, select: { id: true } },
          },
        },
      },
    });
    if (!sub) throw new NotFoundException('Pending upgrade not found');

    // Money already submitted against this invoice — cancelling it here would
    // leave the admin approving a payment for a dead invoice.
    const underReview = sub.invoices.find((inv) => inv.payments.length > 0);
    if (underReview) {
      throw new BadRequestException(
        `${underReview.invoiceNumber} ki payment review mein hai — cancel nahi ho sakti. ` +
          `Admin ke reject karne ka intezaar karein.`,
      );
    }

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

  /**
   * ⭐ THE single place a subscription becomes ACTIVE.
   *
   * Manual receipt approval (admin) and Stripe's webhook both call this, so the
   * two paths can never drift apart again.
   *
   * What it guarantees:
   *  - The billing period is anchored at **approval time**, not at checkout
   *    time. Paying a 5-day-old invoice no longer silently burns 5 days.
   *  - Renewing the SAME plan while it is still live **stacks** on the
   *    remaining days instead of throwing them away.
   *  - Every other subscription of the tenant (leftover trial, the plan being
   *    replaced, rival checkouts) is superseded, so `getCurrent()` has exactly
   *    one truthful answer.
   */
  async activateFromPayment(subscriptionId: string, paidInvoiceId?: string) {
    const activated = await this.prisma.$transaction((tx) =>
      this.activateWithin(tx, subscriptionId, paidInvoiceId),
    );
    return this.announceActivation(activated);
  }

  /**
   * Same activation, but run inside a transaction the caller already owns —
   * so approving a payment and activating the plan commit or fail together.
   * The caller must pass the returned value to {@link announceActivation}
   * once its own transaction has committed.
   */
  async activateWithin(
    tx: Prisma.TransactionClient,
    subscriptionId: string,
    paidInvoiceId?: string,
  ) {
    const sub = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!sub) return null;

    const now = new Date();
    const months = INTERVAL_MONTHS[sub.interval] ?? 1;

    // Longest-running live plan, if any — that is what we may stack onto.
    const live = await tx.subscription.findFirst({
      where: {
        tenantId: sub.tenantId,
        id: { not: sub.id },
        status: { in: ['ACTIVE', 'PAST_DUE'] },
      },
      orderBy: { currentPeriodEnd: 'desc' },
      select: { planId: true, currentPeriodEnd: true },
    });

    const stacks =
      !!live && live.planId === sub.planId && live.currentPeriodEnd > now;
    const periodStart = stacks ? live!.currentPeriodEnd : now;
    const periodEnd = addMonths(periodStart, months);

    // ─── Supersede everything else this tenant has ───
    const others = await tx.subscription.findMany({
      where: {
        tenantId: sub.tenantId,
        id: { not: sub.id },
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PENDING_PAYMENT'] },
      },
      select: { id: true },
    });

    if (others.length > 0) {
      const otherIds = others.map((s) => s.id);
      await tx.subscription.updateMany({
        where: { id: { in: otherIds } },
        data: { status: 'CANCELLED', cancelledAt: now },
      });
      await tx.invoice.updateMany({
        where: {
          subscriptionId: { in: otherIds },
          status: { in: ['PENDING', 'OVERDUE'] },
        },
        data: { status: 'CANCELLED' },
      });
    }

    const updated = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      include: {
        plan: true,
        tenant: { select: { id: true, name: true } },
      },
    });

    await tx.invoice.updateMany({
      where: {
        subscriptionId: sub.id,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      data: {
        status: 'PAID',
        paidAt: now,
        amountPaid: sub.amount,
        amountDue: 0,
        periodStart,
        periodEnd,
      },
    });

    // The caller may have already flipped its invoice to PAID; stamp the real
    // period on it so the printed invoice matches the subscription.
    if (paidInvoiceId) {
      await tx.invoice.updateMany({
        where: { id: paidInvoiceId, status: 'PAID' },
        data: { periodStart, periodEnd },
      });
    }

    await tx.tenant.update({
      where: { id: sub.tenantId },
      data: { status: 'ACTIVE' },
    });

    return { sub: updated, stacked: stacks, superseded: others.length };
  }

  /** Post-commit side effects for an activation: log, notify, email. */
  async announceActivation(
    activated: Awaited<ReturnType<SubscriptionsService['activateWithin']>>,
  ) {
    if (!activated) {
      this.logger.warn('activateFromPayment: subscription not found');
      return null;
    }

    const { sub, stacked, superseded } = activated;
    this.logger.log(
      `✅ Activated ${sub.plan.name} (${sub.interval}) for tenant ${sub.tenantId} — ` +
        `till ${sub.currentPeriodEnd.toISOString()}${stacked ? ' (stacked)' : ''}, ` +
        `${superseded} superseded`,
    );

    const periodEndLabel = new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'long',
      timeZone: 'Asia/Karachi',
    }).format(sub.currentPeriodEnd);

    this.notifications
      .create({
        tenantId: sub.tenantId,
        type: 'PAYMENT_APPROVED',
        title: `${sub.plan.name} Active ✅`,
        message: stacked
          ? `Renew ho gaya — ab ${periodEndLabel} tak chalega.`
          : `Plan activate ho gaya. ${periodEndLabel} tak valid hai.`,
        link: '/billing',
      })
      .catch((e: any) =>
        this.logger.error(`Activation notification failed: ${e.message}`),
      );

    try {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId: sub.tenantId, role: 'OWNER' },
        select: { email: true, fullName: true },
      });

      if (owner) {
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
            periodEnd: periodEndLabel,
            appUrl: this.appUrl,
          },
        });
      }
    } catch (e: any) {
      this.logger.error(`Payment approved email failed: ${e.message}`);
    }

    return sub;
  }

  /** @deprecated Kept as an alias — use {@link activateFromPayment}. */
  async notifyPaymentApprovedAndActivate(subscriptionId: string) {
    return this.activateFromPayment(subscriptionId);
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
