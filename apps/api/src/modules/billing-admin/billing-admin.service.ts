import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class BillingAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly referrals: ReferralsService,
  ) {}

  private requireOwner(user: AuthenticatedUser) {
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Sirf Owner payments approve/reject kar sakta hai',
      );
    }
  }

  async listPending(user: AuthenticatedUser) {
    this.requireOwner(user);
    return this.prisma.payment.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'PENDING',
        provider: { in: ['MANUAL_BANK', 'JAZZCASH', 'EASYPAISA'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: { include: { subscription: { include: { plan: true } } } },
        upload: true,
      },
    });
  }

  async listAll(user: AuthenticatedUser) {
    this.requireOwner(user);
    return this.prisma.payment.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        invoice: true,
        upload: true,
      },
    });
  }

  async approve(user: AuthenticatedUser, paymentId: string, notes?: string) {
    this.requireOwner(user);

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId: user.tenantId },
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
          approvedById: user.id,
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

    if (payment.invoice) {
      await this.referrals.convertReferral(payment.tenantId, payment.amount);
    }

    return result;
  }

  async reject(user: AuthenticatedUser, paymentId: string, reason?: string) {
    this.requireOwner(user);

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId: user.tenantId },
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

    return updated;
  }

  async stats(user: AuthenticatedUser) {
    this.requireOwner(user);

    const [pending, approved, rejected, totalRevenue] = await Promise.all([
      this.prisma.payment.count({
        where: { tenantId: user.tenantId, status: 'PENDING' },
      }),
      this.prisma.payment.count({
        where: { tenantId: user.tenantId, status: 'APPROVED' },
      }),
      this.prisma.payment.count({
        where: { tenantId: user.tenantId, status: 'REJECTED' },
      }),
      this.prisma.payment.aggregate({
        where: { tenantId: user.tenantId, status: 'APPROVED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      totalApproved: totalRevenue._sum.amount ?? 0,
    };
  }
}
