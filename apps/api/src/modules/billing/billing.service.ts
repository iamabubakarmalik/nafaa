import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminNotificationsService } from '../admin/notifications/admin-notifications.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly adminNotifications: AdminNotificationsService,
    private readonly emailService: EmailService,
  ) {}

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-PK').format(n);
  }

  private get appUrl() {
    return this.configService.get<string>('APP_URL') || 'http://localhost:5173';
  }

  bankInfo() {
    return {
      holderName: this.configService.get('NAFAA_PAYMENT_HOLDER_NAME'),
      bank: {
        name: this.configService.get('NAFAA_BANK_NAME'),
        accountTitle: this.configService.get('NAFAA_BANK_ACCOUNT_TITLE'),
        accountNumber: this.configService.get('NAFAA_BANK_ACCOUNT_NUMBER'),
        iban: this.configService.get('NAFAA_BANK_IBAN'),
      },
      jazzcash: {
        number: this.configService.get('NAFAA_JAZZCASH_NUMBER'),
        title: this.configService.get('NAFAA_PAYMENT_HOLDER_NAME'),
      },
      easypaisa: {
        number: this.configService.get('NAFAA_EASYPAISA_NUMBER'),
        title: this.configService.get('NAFAA_PAYMENT_HOLDER_NAME'),
      },
      nayapay: {
        number: this.configService.get('NAFAA_NAYAPAY_NUMBER'),
        handle: this.configService.get('NAFAA_NAYAPAY_HANDLE'),
        title: this.configService.get('NAFAA_PAYMENT_HOLDER_NAME'),
      },
      // Backward compatibility
      bankName: this.configService.get('NAFAA_BANK_NAME'),
      accountTitle: this.configService.get('NAFAA_BANK_ACCOUNT_TITLE'),
      accountNumber: this.configService.get('NAFAA_BANK_ACCOUNT_NUMBER'),
      iban: this.configService.get('NAFAA_BANK_IBAN'),
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
      title: 'Payment Submitted ✅',
      message: `Aap ki payment Rs ${dto.amount} review ke liye submit ho gayi. Admin 24 hours mein approve karega.`,
      link: '/billing',
    });

    // Admin notification
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

    // Send confirmation email to tenant owner
    this.sendPaymentSubmittedEmail(user.tenantId, payment.id, invoice.id, dto).catch(
      (e) => console.error('Payment submitted email failed:', e.message),
    );

    return payment;
  }

  /**
   * Send "payment submitted, pending approval" email to tenant owner
   */
  private async sendPaymentSubmittedEmail(
    tenantId: string,
    paymentId: string,
    invoiceId: string,
    dto: SubmitPaymentDto,
  ) {
    try {
      const [owner, invoice, subscription] = await Promise.all([
        this.prisma.user.findFirst({
          where: { tenantId, role: 'OWNER' },
          select: { email: true, fullName: true },
        }),
        this.prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: { invoiceNumber: true },
        }),
        this.prisma.subscription.findFirst({
          where: { tenantId, status: { in: ['PENDING_PAYMENT', 'ACTIVE', 'TRIAL'] } },
          orderBy: { createdAt: 'desc' },
          include: { plan: { select: { name: true } } },
        }),
      ]);

      if (!owner || !invoice) return;

      // Map payment method to readable label
      const methodLabels: Record<string, string> = {
        MANUAL_BANK: 'Bank Transfer',
        JAZZCASH: 'JazzCash',
        EASYPAISA: 'EasyPaisa',
        STRIPE: 'Stripe',
        CASH: 'Cash',
      };

      await this.emailService.send({
        tenantId,
        templateSlug: 'payment-submitted',
        toEmail: owner.email,
        toName: owner.fullName,
        variables: {
          name: owner.fullName,
          planName: subscription?.plan?.name || 'Subscription Plan',
          amount: this.formatAmount(dto.amount),
          paymentMethod: methodLabels[dto.provider] || dto.provider,
          reference: dto.transactionId || paymentId.slice(0, 12).toUpperCase(),
          invoiceNumber: invoice.invoiceNumber,
          appUrl: this.appUrl,
        },
      });

      console.log(`📧 Payment submitted email sent to ${owner.email}`);
    } catch (e: any) {
      console.error('Payment submitted email failed:', e.message);
    }
  }
}
