import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../core/queue/queue.service';

const SURCHARGE_PCT = 0.15; // 15% extra for emergency
const DEFAULT_MINUTES = 30;

@Injectable()
export class EmergencyDeliveryService {
  constructor(private readonly prisma: PrismaService, private readonly queue: QueueService) {}

  async request(customerId: string, orderId: string) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: orderId, customerId },
    });
    if (!order) throw new NotFoundException();
    if (order.deliveryType !== 'DELIVERY') throw new BadRequestException('Emergency only for delivery orders');

    const surcharge = new Prisma.Decimal(Number(order.subtotal) * SURCHARGE_PCT);

    const record = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.emergencyDelivery.create({
        data: {
          orderId,
          customerId,
          shopId: order.shopId,
          status: 'REQUESTED',
          promisedByMinutes: DEFAULT_MINUTES,
          promisedByAt: new Date(Date.now() + DEFAULT_MINUTES * 60 * 1000),
          surchargeAmount: surcharge,
        },
      });
      await tx.marketplaceOrder.update({
        where: { id: orderId },
        data: {
          deliveryFee: { increment: surcharge },
          total: { increment: surcharge },
        },
      });
      return rec;
    });

    // Notify shop urgently
    await this.queue.createNotification({
      tenantId: order.tenantId,
      type: 'EMERGENCY_DELIVERY',
      title: '⚡ EMERGENCY: 30-min delivery',
      body: `Order ${order.orderNumber} — prepare ASAP!`,
      data: { orderId, promisedByAt: record.promisedByAt },
      channels: ['PUSH', 'IN_APP'],
    });

    return record;
  }

  async markDelivered(orderId: string) {
    const rec = await this.prisma.emergencyDelivery.findUnique({ where: { orderId } });
    if (!rec) throw new NotFoundException();

    const now = new Date();
    const wasLate = now > rec.promisedByAt;
    const compensation = wasLate && rec.refundIfLate ? Number(rec.surchargeAmount) : 0;

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.emergencyDelivery.update({
        where: { orderId },
        data: {
          status: 'DELIVERED',
          actualDeliveredAt: now,
          wasLate,
          compensationAmount: compensation,
        },
      });

      // Auto-refund surcharge if late
      if (wasLate && compensation > 0) {
        await tx.marketplaceCustomer.update({
          where: { id: rec.customerId },
          data: { walletBalance: { increment: compensation } },
        });
        await tx.customerWalletTxn.create({
          data: {
            customerId: rec.customerId,
            type: 'REFUND',
            amount: compensation,
            balanceAfter: 0, // recomputed elsewhere
            reason: 'Emergency delivery late — surcharge refund',
            referenceId: orderId,
            referenceType: 'ORDER',
          },
        });
      }
      return u;
    });

    if (wasLate) {
      await this.queue.createNotification({
        customerId: rec.customerId,
        type: 'EMERGENCY_LATE_REFUND',
        title: '🙏 Late delivery — surcharge refunded',
        body: `PKR ${compensation.toFixed(0)} aap ke wallet mein wapas`,
        channels: ['PUSH', 'IN_APP'],
      });
    }

    return updated;
  }

  async list(status?: any, limit = 50) {
    return this.prisma.emergencyDelivery.findMany({
      where: status ? { status } : {},
      orderBy: { promisedByAt: 'asc' },
      take: limit,
    });
  }
}
