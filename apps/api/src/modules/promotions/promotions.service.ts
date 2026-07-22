import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PromoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).slice(2, 6);
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePromotionDto) {
    const slug = dto.slug ?? slugify(dto.title);
    if (dto.couponCode) {
      const dup = await this.prisma.promotion.findUnique({ where: { couponCode: dto.couponCode.toUpperCase() } });
      if (dup) throw new BadRequestException('Coupon code already exists');
    }
    return this.prisma.promotion.create({
      data: {
        tenantId, shopId: dto.shopId,
        type: dto.type, status: dto.status ?? 'DRAFT', scope: dto.scope,
        title: dto.title, description: dto.description, slug,
        imageUrl: dto.imageUrl, bannerUrl: dto.bannerUrl,
        discountType: dto.discountType, discountValue: dto.discountValue,
        maxDiscount: dto.maxDiscount, minOrderAmount: dto.minOrderAmount ?? 0,
        couponCode: dto.couponCode?.toUpperCase(),
        isPublic: dto.isPublic ?? true, requiresLogin: dto.requiresLogin ?? true,
        usageLimit: dto.usageLimit, perCustomerLimit: dto.perCustomerLimit ?? 1,
        targetProductIds: dto.targetProductIds ?? [],
        targetCategoryIds: dto.targetCategoryIds ?? [],
        excludedProductIds: dto.excludedProductIds ?? [],
        buyQty: dto.buyQty, getQty: dto.getQty, getDiscountPercent: dto.getDiscountPercent,
        startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt),
        isFlashSale: dto.isFlashSale ?? false,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async list(tenantId: string, opts?: {
    status?: PromoStatus; type?: string; search?: string; limit?: number; offset?: number;
  }) {
    const where: Prisma.PromotionWhereInput = { tenantId };
    if (opts?.status) where.status = opts.status;
    if (opts?.type) where.type = opts.type as any;
    if (opts?.search) where.OR = [
      { title: { contains: opts.search, mode: 'insensitive' } },
      { couponCode: { contains: opts.search, mode: 'insensitive' } },
    ];
    const [items, total, counts] = await Promise.all([
      this.prisma.promotion.findMany({ where, orderBy: { createdAt: 'desc' }, take: opts?.limit ?? 20, skip: opts?.offset ?? 0 }),
      this.prisma.promotion.count({ where }),
      this.prisma.promotion.groupBy({ by: ['status'], where: { tenantId }, _count: { status: true } }),
    ]);
    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => (statusCounts[c.status] = c._count.status));
    return { items, total, counts: statusCounts, limit: opts?.limit ?? 20, offset: opts?.offset ?? 0 };
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!p) throw new NotFoundException();
    return p;
  }

  async update(tenantId: string, id: string, dto: UpdatePromotionDto) {
    const p = await this.prisma.promotion.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException();
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        couponCode: dto.couponCode?.toUpperCase(),
      } as any,
    });
  }

  async remove(tenantId: string, id: string) {
    const p = await this.prisma.promotion.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException();
    await this.prisma.promotion.update({ where: { id }, data: { status: 'ARCHIVED' } });
    return { success: true };
  }

  async validateCoupon(dto: ValidateCouponDto, customerId?: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { couponCode: dto.code.toUpperCase() },
    });
    if (!promo) throw new BadRequestException('Invalid coupon');
    if (promo.status !== 'ACTIVE') throw new BadRequestException('Coupon not active');
    if (promo.startsAt > new Date()) throw new BadRequestException('Coupon not started yet');
    if (promo.endsAt < new Date()) throw new BadRequestException('Coupon expired');
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) throw new BadRequestException('Coupon limit reached');
    if (dto.shopId && promo.shopId && promo.shopId !== dto.shopId) throw new BadRequestException('Coupon not valid for this shop');
    if (dto.orderSubtotal !== undefined && Number(promo.minOrderAmount) > dto.orderSubtotal) {
      throw new BadRequestException(`Minimum order PKR ${promo.minOrderAmount} required`);
    }
    if (customerId && promo.perCustomerLimit) {
      const used = await this.prisma.promoRedemption.count({ where: { promotionId: promo.id, customerId } });
      if (used >= promo.perCustomerLimit) throw new BadRequestException('You already used this coupon');
    }

    // Compute discount
    let discountAmount = 0;
    const subtotal = dto.orderSubtotal ?? 0;
    if (promo.discountType === 'PERCENT') {
      discountAmount = (subtotal * Number(promo.discountValue)) / 100;
      if (promo.maxDiscount) discountAmount = Math.min(discountAmount, Number(promo.maxDiscount));
    } else if (promo.discountType === 'FIXED') {
      discountAmount = Number(promo.discountValue);
    } else if (promo.discountType === 'FREE_SHIPPING') {
      discountAmount = 0;
    }

    return {
      valid: true,
      promotion: { id: promo.id, title: promo.title, code: promo.couponCode, discountType: promo.discountType },
      discountAmount: Math.min(discountAmount, subtotal),
      freeShipping: promo.discountType === 'FREE_SHIPPING',
    };
  }

  async redeem(promotionId: string, customerId: string, orderId: string, discountAmount: number) {
    return this.prisma.$transaction([
      this.prisma.promoRedemption.create({
        data: { promotionId, customerId, orderId, discountAmount },
      }),
      this.prisma.promotion.update({
        where: { id: promotionId }, data: { usageCount: { increment: 1 } },
      }),
    ]);
  }

  async listActiveForMarketplace(city?: string) {
    return this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE', isPublic: true,
        startsAt: { lte: new Date() }, endsAt: { gt: new Date() },
      },
      orderBy: [{ isFlashSale: 'desc' }, { displayOrder: 'asc' }],
      take: 20,
    });
  }

  async listFlashSales() {
    return this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE', isFlashSale: true,
        startsAt: { lte: new Date() }, endsAt: { gt: new Date() },
      },
      orderBy: { endsAt: 'asc' }, take: 10,
    });
  }
}
