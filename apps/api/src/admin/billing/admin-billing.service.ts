import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { EmailService } from '../../modules/email/email.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { ReferralsService } from '../../modules/customers/referrals/referrals.service';
import { SmsService } from '../../modules/sms/sms.service';
import { SubscriptionsService } from '../../modules/billing/subscriptions/subscriptions.service';

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly referrals: ReferralsService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async stats() {
    const [pending, approved, rejected, totalRevenue, todayRevenue] =
      await Promise.all([
        this.prisma.payment.count({ where: { status: 'PENDING' } }),
        this.prisma.payment.count({ where: { status: 'APPROVED' } }),
        this.prisma.payment.count({ where: { status: 'REJECTED' } }),
        this.prisma.payment.aggregate({
          where: { status: 'APPROVED' },
          _sum: { amount: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            status: 'APPROVED',
            approvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      pending,
      approved,
      rejected,
      totalApproved: totalRevenue._sum.amount ?? 0,
      todayApproved: todayRevenue._sum.amount ?? 0,
    };
  }

  async list(params: {
    status?: PaymentStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { transactionId: { contains: params.search, mode: 'insensitive' } },
        { payerName: { contains: params.search, mode: 'insensitive' } },
        { tenant: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: { select: { id: true, name: true, slug: true } },
          invoice: {
            include: {
              subscription: { include: { plan: { select: { name: true } } } },
            },
          },
          upload: true,
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async approve(adminUser: AuthenticatedUser, paymentId: string, notes?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment already processed');
    }

    let fullyPaid = false;
    const subscriptionId = payment.subscriptionId ?? payment.invoice?.subscriptionId;

    // Approving the payment and activating the plan commit together — an
    // approved payment must never be left without the subscription it bought.
    const { result, activated } = await this.prisma.$transaction(async (tx) => {
      const approved = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'APPROVED',
          approvedById: adminUser.id,
          approvedAt: new Date(),
          paidAt: new Date(),
          notes: notes ?? payment.notes,
        },
      });

      if (payment.invoiceId) {
        const invoice = payment.invoice!;
        const newPaid = invoice.amountPaid + payment.amount;
        const newDue = Math.max(invoice.total - newPaid, 0);
        fullyPaid = newDue === 0;

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newPaid,
            amountDue: newDue,
            status: fullyPaid ? 'PAID' : 'PENDING',
            paidAt: fullyPaid ? new Date() : null,
          },
        });
      }

      // Activation lives in ONE place (SubscriptionsService) so the manual and
      // Stripe paths can never drift: it re-anchors the billing period at
      // approval time, stacks a same-plan renewal onto the remaining days, and
      // supersedes the leftover trial / replaced plan.
      const act =
        fullyPaid && subscriptionId
          ? await this.subscriptions.activateWithin(
              tx,
              subscriptionId,
              payment.invoiceId ?? undefined,
            )
          : null;

      return { result: approved, activated: act };
    });

    // Post-commit: notification + email for the newly active plan.
    if (activated) {
      await this.subscriptions.announceActivation(activated);
    }

    if (!fullyPaid) {
      // Partial payment — no activation happened, so say exactly that.
      await this.notifications.create({
        tenantId: payment.tenantId,
        type: 'PAYMENT_APPROVED',
        title: 'Partial Payment Approved ✅',
        message: `Rs ${payment.amount} receive ho gaya. Baqi amount pay karne par plan activate hoga.`,
        link: '/billing',
      });
    }

    // SMS to tenant owner (the email is sent by activateFromPayment)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payment.tenantId },
      select: { phone: true },
    });

    if (tenant?.phone) {
      this.smsService
        .send({
          tenantId: payment.tenantId,
          templateSlug: 'payment-approved',
          toPhone: tenant.phone,
          variables: { amount: payment.amount.toString() },
        })
        .catch((e) => console.error('Payment approved SMS failed:', e.message));
    }

    if (payment.invoice) {
      await this.referrals.convertReferral(payment.tenantId, payment.amount);
    }

    return result;
  }

  async reject(adminUser: AuthenticatedUser, paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment already processed');
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason || 'Not specified',
      },
    });

    await this.notifications.create({
      tenantId: payment.tenantId,
      type: 'PAYMENT_REJECTED',
      title: 'Payment Rejected ❌',
      message:
        `Aap ka Rs ${payment.amount} payment reject ho gaya. Reason: ${reason || 'Not specified'}. ` +
        `Invoice abhi bhi open hai — sahi receipt dobara upload karein.`,
      link: payment.invoiceId ? `/billing/invoice/${payment.invoiceId}/pay` : '/billing',
    });

    // Send email + SMS to tenant owner about rejection
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payment.tenantId },
      include: {
        users: { where: { role: 'OWNER', isActive: true }, take: 1 },
      },
    });

    const owner = tenant?.users[0];
    if (owner) {
      const appUrlRej = process.env.APP_URL || 'http://localhost:5173';
      this.emailService
        .send({
          tenantId: payment.tenantId,
          templateSlug: 'payment-rejected',
          toEmail: owner.email,
          toName: owner.fullName,
          variables: {
            name: owner.fullName,
            shopName: tenant?.name || 'Aap ki dukan',
            reason: reason || 'Payment details verify nahi ho sake.',
            appUrl: appUrlRej,
          },
        })
        .catch((e) => console.error('Payment rejected email failed:', e.message));

      if (tenant?.phone) {
        this.smsService
          .send({
            tenantId: payment.tenantId,
            templateSlug: 'payment-rejected',
            toPhone: tenant.phone,
            variables: {
              amount: payment.amount.toString(),
              reason: reason || 'Not specified',
            },
          })
          .catch((e) => console.error('Payment rejected SMS failed:', e.message));
      }
    }

    return updated;
  }
}
