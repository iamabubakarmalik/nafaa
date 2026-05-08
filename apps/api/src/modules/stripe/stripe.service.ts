import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeLib from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralsService } from '../referrals/referrals.service';

type StripeClient = InstanceType<typeof StripeLib>;
type StripeEvent = ReturnType<StripeClient['webhooks']['constructEvent']>;

@Injectable()
export class StripeService {
  private stripe: StripeClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly referrals: ReferralsService,
  ) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (key && !key.includes('replace_me')) {
      this.stripe = new StripeLib(key, { apiVersion: '2024-06-20' as any });
    }
  }

  private requireStripe(): StripeClient {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Add STRIPE_SECRET_KEY in .env',
      );
    }
    return this.stripe;
  }

  publishableKey() {
    return {
      publishableKey: this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') || null,
      enabled: !!this.stripe,
    };
  }

  async createCheckoutSession(user: AuthenticatedUser, invoiceId: string) {
    const stripe = this.requireStripe();

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: user.tenantId },
      include: { tenant: true, subscription: { include: { plan: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice already paid');
    }

    const appUrl = this.configService.get<string>('APP_URL');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'pkr',
            product_data: {
              name:
                invoice.subscription?.plan.name ||
                invoice.description ||
                'Nafaa Subscription',
              description: invoice.description || undefined,
            },
            unit_amount: Math.round(invoice.amountDue * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: undefined,
      client_reference_id: invoice.id,
      metadata: {
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        subscriptionId: invoice.subscriptionId || '',
      },
      success_url: `${appUrl}/billing?stripe_success=1&invoice=${invoice.id}`,
      cancel_url: `${appUrl}/billing/invoice/${invoice.id}/pay?stripe_cancel=1`,
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const stripe = this.requireStripe();
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret || secret.includes('replace_me')) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    let event: StripeEvent;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (e: any) {
      throw new BadRequestException(`Webhook signature failed: ${e.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const invoiceId = session.metadata?.invoiceId;
      const tenantId = session.metadata?.tenantId;
      const subscriptionId = session.metadata?.subscriptionId || null;
      const amountTotal = (session.amount_total ?? 0) / 100;

      if (invoiceId && tenantId) {
        await this.markInvoicePaid({
          invoiceId,
          tenantId,
          subscriptionId,
          amount: amountTotal,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : null,
        });
      }
    }

    return { received: true };
  }

  private async markInvoicePaid(args: {
    invoiceId: string;
    tenantId: string;
    subscriptionId: string | null;
    amount: number;
    stripePaymentIntentId: string | null;
  }) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: args.invoiceId },
      });
      if (!invoice || invoice.status === 'PAID') return null;

      await tx.payment.create({
        data: {
          tenantId: args.tenantId,
          invoiceId: invoice.id,
          subscriptionId: args.subscriptionId || invoice.subscriptionId,
          amount: args.amount,
          provider: 'STRIPE',
          status: 'APPROVED',
          payerName: 'Stripe Card',
          stripePaymentIntentId: args.stripePaymentIntentId,
          approvedAt: new Date(),
          paidAt: new Date(),
        },
      });

      const result = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          amountPaid: invoice.total,
          amountDue: 0,
          paidAt: new Date(),
        },
      });

      if (invoice.subscriptionId) {
        await tx.subscription.update({
          where: { id: invoice.subscriptionId },
          data: { status: 'ACTIVE' },
        });
      }

      await tx.tenant.update({
        where: { id: args.tenantId },
        data: { status: 'ACTIVE' },
      });

      return result;
    });

    if (updated) {
      await this.notifications.create({
        tenantId: args.tenantId,
        type: 'PAYMENT_APPROVED',
        title: 'Payment Successful! ✅',
        message: `Rs ${args.amount} payment receive ho gayi. Aap ki subscription active hai.`,
        link: '/billing',
      });

      await this.referrals.convertReferral(args.tenantId, args.amount);
    }
  }
}
