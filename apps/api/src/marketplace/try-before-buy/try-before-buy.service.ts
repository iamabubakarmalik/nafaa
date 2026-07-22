import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TryBeforeBuyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../core/queue/queue.service';
import { RequestTrialDto } from './dto/request-trial.dto';

const DEPOSIT_PCT = 0.5; // 50% of product price

@Injectable()
export class TryBeforeBuyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async request(customerId: string, dto: RequestTrialDto) {
    const profile = await this.prisma.productMarketplaceProfile.findFirst({
      where: { productId: dto.productId, isListedOnMarketplace: true },
    });
    if (!profile) throw new NotFoundException('Product not available on marketplace');

    const address = await this.prisma.customerAddress.findFirst({
      where: { id: dto.addressId, customerId },
    });
    if (!address) throw new NotFoundException('Address not found');

    const productPrice = Number(profile.publicPrice);
    const deposit = productPrice * DEPOSIT_PCT;
    const trialDays = dto.trialDays ?? 3;

    const req = await this.prisma.tryBeforeBuyRequest.create({
      data: {
        customerId,
        shopId: profile.shopId,
        productId: dto.productId,
        variantId: dto.variantId,
        productName: profile.publicName,
        productImageUrl: profile.publicImages[0],
        productPrice,
        depositAmount: deposit,
        status: 'REQUESTED',
        trialDays,
        addressId: dto.addressId,
        addressSnapshot: address as unknown as Prisma.InputJsonValue,
        customerNotes: dto.customerNotes,
      },
    });

    // Notify shop
    await this.queue.createNotification({
      tenantId: profile.tenantId,
      type: 'TRIAL_REQUEST',
      title: '🎁 Naya Try-Before-Buy request',
      body: `${profile.publicName} — deposit PKR ${deposit.toFixed(0)}`,
      data: { requestId: req.id },
      channels: ['PUSH', 'IN_APP'],
    });

    return req;
  }

  async approve(shopStaffId: string, requestId: string) {
    const req = await this.prisma.tryBeforeBuyRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException();
    if (req.status !== 'REQUESTED') throw new BadRequestException('Not in REQUESTED state');
    return this.prisma.tryBeforeBuyRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async payDeposit(customerId: string, requestId: string, paymentRef: string) {
    const req = await this.prisma.tryBeforeBuyRequest.findFirst({
      where: { id: requestId, customerId },
    });
    if (!req) throw new NotFoundException();
    if (req.status !== 'APPROVED') throw new BadRequestException('Not approved yet');

    return this.prisma.tryBeforeBuyRequest.update({
      where: { id: requestId },
      data: {
        status: 'DEPOSIT_PAID',
        depositPaid: req.depositAmount,
        depositPaidAt: new Date(),
      },
    });
  }

  async markDelivered(requestId: string) {
    const req = await this.prisma.tryBeforeBuyRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException();
    const trialEnd = new Date(Date.now() + req.trialDays * 86400000);
    return this.prisma.tryBeforeBuyRequest.update({
      where: { id: requestId },
      data: {
        status: 'IN_TRIAL',
        deliveredAt: new Date(),
        trialStartedAt: new Date(),
        trialEndsAt: trialEnd,
      },
    });
  }

  async purchase(customerId: string, requestId: string, orderId: string) {
    const req = await this.prisma.tryBeforeBuyRequest.findFirst({
      where: { id: requestId, customerId },
    });
    if (!req) throw new NotFoundException();
    return this.prisma.tryBeforeBuyRequest.update({
      where: { id: requestId },
      data: {
        status: 'PURCHASED',
        purchasedAt: new Date(),
        purchaseOrderId: orderId,
        refundAmount: req.depositPaid,
      },
    });
  }

  async returnItem(customerId: string, requestId: string, condition: string, photos: string[]) {
    const req = await this.prisma.tryBeforeBuyRequest.findFirst({
      where: { id: requestId, customerId },
    });
    if (!req) throw new NotFoundException();

    // If item damaged, forfeit part of deposit
    const isDamaged = condition === 'DAMAGED' || condition === 'HEAVILY_USED';
    const forfeitAmount = isDamaged ? Number(req.depositPaid) * 0.5 : 0;
    const refundAmount = Number(req.depositPaid) - forfeitAmount;

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.tryBeforeBuyRequest.update({
        where: { id: requestId },
        data: {
          status: 'RETURNED',
          returnedAt: new Date(),
          itemConditionOnReturn: condition,
          photosOnReturn: photos,
          refundAmount,
          forfeitedAmount: forfeitAmount,
          forfeitReason: isDamaged ? 'Item damaged/heavily used' : null,
        },
      });
      if (refundAmount > 0) {
        await tx.marketplaceCustomer.update({
          where: { id: customerId },
          data: { walletBalance: { increment: refundAmount } },
        });
        await tx.customerWalletTxn.create({
          data: {
            customerId,
            type: 'REFUND',
            amount: refundAmount,
            balanceAfter: 0,
            reason: `Try-Before-Buy return refund (${req.productName})`,
            referenceId: requestId,
            referenceType: 'TRY_BEFORE_BUY',
          },
        });
      }
      return u;
    });

    return updated;
  }

  async myRequests(customerId: string, status?: TryBeforeBuyStatus) {
    return this.prisma.tryBeforeBuyRequest.findMany({
      where: { customerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async shopRequests(shopId: string, status?: TryBeforeBuyStatus) {
    return this.prisma.tryBeforeBuyRequest.findMany({
      where: { shopId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
