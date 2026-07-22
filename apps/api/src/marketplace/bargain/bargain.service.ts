import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BargainStatus, Prisma } from '@prisma/client';
import { addHours } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { StartBargainDto } from './dto/start-bargain.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';

const BARGAIN_TTL_HOURS = 24;

@Injectable()
export class MarketplaceBargainService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // START BARGAIN
  // ═══════════════════════════════════════════════════════════

  async start(customerId: string, dto: StartBargainDto) {
    const product = await this.prisma.productMarketplaceProfile.findUnique({
      where: { productId: dto.productId },
      include: {
        shop: {
          select: {
            id: true, tenantId: true,
            marketplaceProfile: {
              select: {
                bargainEnabled: true, bargainMinPercent: true, publicName: true,
              },
            },
          },
        },
      },
    });
    if (!product || !product.isListedOnMarketplace || !product.isAvailable) {
      throw new NotFoundException('Product not available');
    }
    if (!product.bargainEnabled) {
      throw new BadRequestException('Is product par bargaining allowed nahi hai');
    }
    if (!product.shop.marketplaceProfile?.bargainEnabled) {
      throw new BadRequestException('Shop bargaining accept nahi karti');
    }

    // Validate offer range
    const originalPrice = Number(product.publicPrice);
    const minPct = product.shop.marketplaceProfile.bargainMinPercent ?? 80;
    const minPrice = product.bargainMinPrice
      ? Number(product.bargainMinPrice)
      : (originalPrice * minPct) / 100;

    if (dto.offerPrice < minPrice) {
      throw new BadRequestException(
        `Offer bohat kam hai. Minimum offer: ${minPrice.toFixed(0)} PKR`,
      );
    }
    if (dto.offerPrice >= originalPrice) {
      throw new BadRequestException('Offer original price se kam honi chahiye');
    }

    // Prevent duplicate active bargain on same product
    const existing = await this.prisma.bargain.findFirst({
      where: {
        customerId, productId: dto.productId,
        status: { in: ['PENDING', 'COUNTER_OFFERED'] },
      },
    });
    if (existing) {
      throw new BadRequestException('Aap ka is product par pehle se active bargain hai');
    }

    const bargain = await this.prisma.$transaction(async (tx) => {
      const b = await tx.bargain.create({
        data: {
          customerId,
          shopId: product.shopId,
          tenantId: product.shop.tenantId,
          productId: dto.productId,
          variantId: dto.variantId,
          productName: product.publicName,
          originalPrice: product.publicPrice,
          customerOffer: new Prisma.Decimal(dto.offerPrice),
          currentOffer: new Prisma.Decimal(dto.offerPrice),
          quantity: dto.quantity ?? 1,
          status: BargainStatus.PENDING,
          offerCount: 1,
          maxOffers: 3,
          expiresAt: addHours(new Date(), BARGAIN_TTL_HOURS),
        },
      });
      await tx.bargainMessage.create({
        data: {
          bargainId: b.id,
          senderType: 'CUSTOMER',
          customerId,
          offeredPrice: new Prisma.Decimal(dto.offerPrice),
          action: 'OFFER',
          message: dto.message,
        },
      });
      return b;
    });

    return bargain;
  }

  // ═══════════════════════════════════════════════════════════
  // CUSTOMER COUNTER OFFER
  // ═══════════════════════════════════════════════════════════

  async counterOffer(customerId: string, bargainId: string, dto: CounterOfferDto) {
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, customerId },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    if (bargain.status !== 'COUNTER_OFFERED') {
      throw new BadRequestException('Aap sirf shop ke counter par respond kar sakte hain');
    }
    if (bargain.expiresAt < new Date()) {
      throw new BadRequestException('Bargain expire ho gaya');
    }
    if (bargain.offerCount >= bargain.maxOffers) {
      throw new BadRequestException('Maximum offer rounds khatam');
    }
    if (dto.offerPrice >= Number(bargain.originalPrice)) {
      throw new BadRequestException('Offer original price se kam honi chahiye');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.bargain.update({
        where: { id: bargainId },
        data: {
          currentOffer: new Prisma.Decimal(dto.offerPrice),
          status: BargainStatus.PENDING,
          offerCount: { increment: 1 },
        },
      });
      await tx.bargainMessage.create({
        data: {
          bargainId,
          senderType: 'CUSTOMER',
          customerId,
          offeredPrice: new Prisma.Decimal(dto.offerPrice),
          action: 'COUNTER',
          message: dto.message,
        },
      });
      return u;
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // ACCEPT SHOP'S OFFER
  // ═══════════════════════════════════════════════════════════

  async accept(customerId: string, bargainId: string) {
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, customerId },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    if (!['PENDING', 'COUNTER_OFFERED'].includes(bargain.status)) {
      throw new BadRequestException('Bargain accept nahi ho sakta');
    }
    if (bargain.expiresAt < new Date()) {
      throw new BadRequestException('Bargain expire ho gaya');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.bargain.update({
        where: { id: bargainId },
        data: {
          status: BargainStatus.ACCEPTED,
          finalPrice: bargain.currentOffer,
        },
      });
      await tx.bargainMessage.create({
        data: {
          bargainId,
          senderType: 'CUSTOMER',
          customerId,
          action: 'ACCEPT',
          offeredPrice: bargain.currentOffer,
        },
      });
      return u;
    });

    return { ...updated, message: 'Deal done! Ab cart mein add kar ke checkout karain' };
  }

  // ═══════════════════════════════════════════════════════════
  // REJECT
  // ═══════════════════════════════════════════════════════════

  async reject(customerId: string, bargainId: string, reason?: string) {
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, customerId },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    if (!['PENDING', 'COUNTER_OFFERED'].includes(bargain.status)) {
      throw new BadRequestException('Bargain reject nahi ho sakta');
    }

    await this.prisma.$transaction([
      this.prisma.bargain.update({
        where: { id: bargainId },
        data: {
          status: BargainStatus.REJECTED,
          rejectedBy: 'CUSTOMER',
          rejectedAt: new Date(),
          rejectReason: reason,
        },
      }),
      this.prisma.bargainMessage.create({
        data: {
          bargainId,
          senderType: 'CUSTOMER',
          customerId,
          action: 'REJECT',
          message: reason,
        },
      }),
    ]);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // LIST MY BARGAINS
  // ═══════════════════════════════════════════════════════════

  async listMy(customerId: string, status?: BargainStatus[], limit = 20, offset = 0) {
    const where: Prisma.BargainWhereInput = { customerId };
    if (status?.length) where.status = { in: status };

    const [items, total, counts] = await Promise.all([
      this.prisma.bargain.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit, skip: offset,
        include: {
          shop: {
            select: {
              id: true,
              marketplaceProfile: {
                select: { slug: true, publicName: true, logoUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.bargain.count({ where }),
      this.prisma.bargain.groupBy({
        by: ['status'],
        where: { customerId },
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => (statusCounts[c.status] = c._count.status));

    return {
      items,
      total,
      counts: statusCounts,
      limit, offset,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET BARGAIN DETAIL WITH MESSAGES
  // ═══════════════════════════════════════════════════════════

  async getDetail(customerId: string, bargainId: string) {
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, customerId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        shop: {
          select: {
            id: true,
            marketplaceProfile: {
              select: { slug: true, publicName: true, logoUrl: true },
            },
          },
        },
      },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    return {
      ...bargain,
      canCounter: bargain.status === 'COUNTER_OFFERED'
        && bargain.expiresAt > new Date()
        && bargain.offerCount < bargain.maxOffers,
      canAccept: ['PENDING', 'COUNTER_OFFERED'].includes(bargain.status)
        && bargain.expiresAt > new Date(),
      isExpired: bargain.expiresAt < new Date(),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CANCEL (customer-side)
  // ═══════════════════════════════════════════════════════════

  async cancel(customerId: string, bargainId: string) {
    const bargain = await this.prisma.bargain.findFirst({
      where: { id: bargainId, customerId },
    });
    if (!bargain) throw new NotFoundException('Bargain not found');
    if (!['PENDING', 'COUNTER_OFFERED'].includes(bargain.status)) {
      throw new BadRequestException('Sirf active bargain cancel ho sakta hai');
    }
    await this.prisma.bargain.update({
      where: { id: bargainId },
      data: {
        status: BargainStatus.REJECTED,
        rejectedBy: 'CUSTOMER',
        rejectedAt: new Date(),
        rejectReason: 'Customer cancelled',
      },
    });
    return { success: true };
  }
}
