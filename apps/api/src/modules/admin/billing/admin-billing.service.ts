import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { SmsService } from '../../sms/sms.service';

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly referrals: ReferralsService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
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

    const result = await this.prisma.$transaction(async (tx) => {
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
        const fullyPaid = newDue === 0;

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newPaid,
            amountDue: newDue,
            status: fullyPaid ? 'PAID' : 'PENDING',
            paidAt: fullyPaid ? new Date() : null,
          },
        });

        if (fullyPaid && invoice.subscriptionId) {
          await tx.subscription.update({
            where: { id: invoice.subscriptionId },
            data: { status: 'ACTIVE' },
          });
          await tx.tenant.update({
            where: { id: payment.tenantId },
            data: { status: 'ACTIVE' },
          });
        }
      }

      return approved;
    });

    await this.notifications.create({
      tenantId: payment.tenantId,
      type: 'PAYMENT_APPROVED',
      title: 'Payment Approved ✅',
      message: `Aap ka Rs ${payment.amount} payment approve ho gaya. Subscription active hai.`,
      link: '/billing',
    });

    // Send email + SMS to tenant owner
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payment.tenantId },
      include: {
        users: { where: { role: 'OWNER', isActive: true }, take: 1 },
      },
    });

    const owner = tenant?.users[0];
    if (owner) {
      this.emailService
        .send({
          tenantId: payment.tenantId,
          templateSlug: 'payment-approved',
          toEmail: owner.email,
          toName: owner.fullName,
          variables: {
            name: owner.fullName,
            amount: payment.amount.toString(),
          },
        })
        .catch((e) => console.error('Payment approved email failed:', e.message));

      if (tenant?.phone) {
        this.smsService
          .send({
            tenantId: payment.tenantId,
            templateSlug: 'payment-approved',
            toPhone: tenant.phone,
            variables: {
              amount: payment.amount.toString(),
            },
          })
          .catch((e) => console.error('Payment approved SMS failed:', e.message));
      }
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
      message: `Aap ka Rs ${payment.amount} payment reject ho gaya. Reason: ${reason || 'Not specified'}`,
      link: '/billing',
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
      this.emailService
        .send({
          tenantId: payment.tenantId,
          templateSlug: 'payment-rejected',
          toEmail: owner.email,
          toName: owner.fullName,
          variables: {
            name: owner.fullName,
            amount: payment.amount.toString(),
            reason: reason || 'Not specified',
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
