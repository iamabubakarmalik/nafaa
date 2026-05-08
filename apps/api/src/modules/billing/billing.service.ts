import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminNotificationsService } from '../admin/notifications/admin-notifications.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly adminNotifications: AdminNotificationsService,
  ) {}

  bankInfo() {
    return {
      bankName: this.configService.get('NAFAA_BANK_NAME'),
      accountTitle: this.configService.get('NAFAA_BANK_ACCOUNT_TITLE'),
      accountNumber: this.configService.get('NAFAA_BANK_ACCOUNT_NUMBER'),
      iban: this.configService.get('NAFAA_BANK_IBAN'),
      jazzcash: this.configService.get('NAFAA_JAZZCASH_NUMBER'),
      easypaisa: this.configService.get('NAFAA_EASYPAISA_NUMBER'),
    };
  }

  listInvoices(user: AuthenticatedUser) {
    return this.prisma.invoice.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { include: { plan: true } },
        payments: { include: { upload: true } },
      },
    });
  }

  async getInvoice(user: AuthenticatedUser, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        subscription: { include: { plan: true } },
        payments: { include: { upload: true } },
        tenant: true,
      },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  listPayments(user: AuthenticatedUser) {
    return this.prisma.payment.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: true,
        upload: true,
      },
    });
  }

  async submitPayment(user: AuthenticatedUser, dto: SubmitPaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId: user.tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice already paid');
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId: user.tenantId,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        uploadId: dto.uploadId,
        amount: dto.amount,
        provider: dto.provider,
        status: 'PENDING',
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        transactionId: dto.transactionId,
        payerName: dto.payerName,
        notes: dto.notes,
      },
      include: { upload: true },
    });

    // Tenant notification
    await this.notifications.create({
      tenantId: user.tenantId,
      type: 'INFO',
      title: 'Payment Submitted',
      message: `Aap ki payment Rs ${dto.amount} review ke liye submit ho gayi.`,
      link: '/billing',
    });

    // Admin notification — HIGH PRIORITY
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });

    const isHighValue = dto.amount >= 5000;

    this.adminNotifications
      .create({
        type: isHighValue ? 'HIGH_VALUE_PAYMENT' : 'NEW_PAYMENT',
        priority: isHighValue ? 'HIGH' : 'NORMAL',
        title: isHighValue
          ? `💰 High Value Payment: Rs ${dto.amount}`
          : `💳 New Payment Submitted: Rs ${dto.amount}`,
        message: `${tenant?.name ?? 'Tenant'} ne ${dto.provider} se Rs ${dto.amount} submit kiya. Approval pending.`,
        link: '/billing',
        tenantId: user.tenantId,
        entityType: 'payment',
        entityId: payment.id,
        metadata: {
          amount: dto.amount,
          provider: dto.provider,
          payerName: dto.payerName,
          transactionId: dto.transactionId,
        },
      })
      .catch((e) => console.error('Admin notification failed:', e.message));

    return payment;
  }
}
