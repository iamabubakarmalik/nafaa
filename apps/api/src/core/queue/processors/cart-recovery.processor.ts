import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from '../queue.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.CART_RECOVERY)
export class CartRecoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(CartRecoveryProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) { super(); }

  async process(job: Job) {
    const { customerId } = job.data;
    const cart = await this.prisma.marketplaceCart.findUnique({
      where: { customerId },
      include: { lines: true },
    });
    if (!cart || cart.lines.length === 0) return;

    const customer = await this.prisma.marketplaceCustomer.findUnique({
      where: { id: customerId },
      select: { fullName: true, phone: true, marketingSms: true, marketingPush: true },
    });
    if (!customer) return;

    const total = cart.lines.reduce(
      (s, l) => s + Number(l.unitPrice) * l.quantity,
      0,
    );

    await this.queue.createNotification({
      customerId,
      type: 'CART_ABANDONED',
      title: '🛒 Aap ka cart intezar kar raha hai!',
      body: `${cart.lines.length} items — total PKR ${total.toFixed(0)}. Ab checkout karain aur 5% discount payein!`,
      actionUrl: '/market/cart',
      data: { totalAmount: total, itemCount: cart.lines.length },
      channels: ['PUSH', 'SMS', 'IN_APP'],
    });

    this.logger.log(`🛒 Cart recovery sent to ${customerId}`);
  }
}
