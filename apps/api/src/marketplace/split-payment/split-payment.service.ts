import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../core/queue/queue.service';
import { CreateSplitDto } from './dto/create-split.dto';

@Injectable()
export class SplitPaymentService {
  constructor(private readonly prisma: PrismaService, private readonly queue: QueueService) {}

  async create(initiatorId: string, dto: CreateSplitDto) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: dto.orderId, customerId: initiatorId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Order already paid');

    const totalShares = dto.participants.reduce((s, p) => s + p.shareAmount, 0);
    if (Math.abs(totalShares - Number(order.total)) > 0.01) {
      throw new BadRequestException(`Sum of shares (${totalShares}) must equal order total (${order.total})`);
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const split = await this.prisma.splitPayment.create({
      data: {
        orderId: dto.orderId,
        initiatorId,
        totalAmount: order.total,
        status: 'PENDING',
        shareLinkToken: token,
        expiresAt,
        participants: {
          create: dto.participants.map((p) => ({
            customerId: p.customerId,
            phone: p.phone,
            name: p.name,
            shareAmount: p.shareAmount,
          })),
        },
      },
      include: { participants: true },
    });

    // Send SMS invites to phone-based participants
    for (const p of split.participants) {
      if (p.phone) {
        await this.queue.sendSms({
          toPhone: p.phone,
          message: `${p.name ?? 'Aap'} — Nafaa order pe PKR ${p.shareAmount} share pay karna hai. Link: ${process.env.APP_URL}/split/${token}/${p.id}`,
        });
      }
      if (p.customerId) {
        await this.queue.createNotification({
          customerId: p.customerId,
          type: 'SPLIT_PAYMENT_INVITE',
          title: '💸 Aap ko split payment invite mila',
          body: `PKR ${p.shareAmount} ka share pay karain`,
          actionUrl: `/split/${token}/${p.id}`,
          channels: ['PUSH', 'IN_APP'],
        });
      }
    }

    return { split, shareLink: `${process.env.APP_URL}/split/${token}` };
  }

  async getByToken(token: string) {
    const split = await this.prisma.splitPayment.findUnique({
      where: { shareLinkToken: token },
      include: { participants: true },
    });
    if (!split) throw new NotFoundException();
    if (split.expiresAt < new Date()) {
      await this.prisma.splitPayment.update({ where: { id: split.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Split payment link expired');
    }
    return split;
  }

  async payShare(participantId: string, paymentRef: string, amount: number) {
    const p = await this.prisma.splitPaymentParticipant.findUnique({
      where: { id: participantId }, include: { split: true },
    });
    if (!p) throw new NotFoundException();
    if (p.status === 'PAID') throw new BadRequestException('Already paid');
    if (Math.abs(amount - Number(p.shareAmount)) > 0.01) {
      throw new BadRequestException('Amount mismatch');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.splitPaymentParticipant.update({
        where: { id: participantId },
        data: { status: 'PAID', paidAmount: amount, paymentRef, paidAt: new Date(), respondedAt: new Date() },
      });

      const split = await tx.splitPayment.update({
        where: { id: p.splitId },
        data: { paidAmount: { increment: amount } },
        include: { participants: true },
      });

      const allPaid = split.participants.every((x) => x.id === participantId || x.status === 'PAID');
      const fullPaidAmount = Number(split.paidAmount);

      if (allPaid && Math.abs(fullPaidAmount - Number(split.totalAmount)) < 0.01) {
        await tx.splitPayment.update({ where: { id: split.id }, data: { status: 'FULLY_PAID' } });
        await tx.marketplaceOrder.update({
          where: { id: split.orderId },
          data: { paymentStatus: 'PAID', paidAt: new Date() },
        });
      } else {
        await tx.splitPayment.update({ where: { id: split.id }, data: { status: 'PARTIALLY_PAID' } });
      }
      return updated;
    });
  }

  async mySplits(customerId: string) {
    return this.prisma.splitPayment.findMany({
      where: {
        OR: [{ initiatorId: customerId }, { participants: { some: { customerId } } }],
      },
      orderBy: { createdAt: 'desc' },
      include: { participants: true },
    });
  }
}
