import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertJewelryProductDto } from './dto/upsert-jewelry-product.dto';

@Injectable()
export class JewelryProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertJewelryProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const { gemstones, ...rest } = dto as any;

    const payload: any = {
      ...rest,
      hallmarkDate: dto.hallmarkDate ? new Date(dto.hallmarkDate) : null,
      insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
    };

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.jewelryProductProfile.findUnique({ where: { productId: dto.productId } });

      const profile = existing
        ? await tx.jewelryProductProfile.update({
            where: { productId: dto.productId },
            data: payload,
          })
        : await tx.jewelryProductProfile.create({
            data: { ...payload, tenantId: user.tenantId },
          });

      // Replace gemstones
      if (Array.isArray(gemstones)) {
        await tx.jewelryGemstone.deleteMany({ where: { jewelryProfileId: profile.id } });
        if (gemstones.length > 0) {
          await tx.jewelryGemstone.createMany({
            data: gemstones.map((g: any) => ({
              jewelryProfileId: profile.id,
              type: g.type,
              count: g.count ?? 1,
              caret: g.caret,
              quality: g.quality,
              color: g.color,
              clarity: g.clarity,
              cut: g.cut,
              shape: g.shape,
              origin: g.origin,
              isCertified: g.isCertified ?? false,
              certificateNumber: g.certificateNumber,
              ratePerCaret: g.ratePerCaret,
              totalValue: g.totalValue,
            })),
          });
        }
      }

      return tx.jewelryProductProfile.findUnique({
        where: { id: profile.id },
        include: { gemstones: true },
      });
    });
  }

  async list(user: AuthenticatedUser, params: {
    category?: string; metalType?: string; purity?: string; style?: string;
    hasStones?: boolean; hasDiamond?: boolean; isBridalCollection?: boolean;
    isFestivalSpecial?: boolean; featured?: boolean; search?: string;
    minWeight?: number; maxWeight?: number;
  }) {
    const profiles = await this.prisma.jewelryProductProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as any }),
        ...(params.metalType && { metalType: params.metalType as any }),
        ...(params.purity && { purity: params.purity as any }),
        ...(params.style && { style: params.style as any }),
        ...(params.hasStones !== undefined && { hasStones: params.hasStones }),
        ...(params.hasDiamond !== undefined && { hasDiamond: params.hasDiamond }),
        ...(params.isBridalCollection !== undefined && { isBridalCollection: params.isBridalCollection }),
        ...(params.isFestivalSpecial !== undefined && { isFestivalSpecial: params.isFestivalSpecial }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.minWeight !== undefined || params.maxWeight !== undefined ? {
          netWeight: {
            ...(params.minWeight !== undefined && { gte: params.minWeight }),
            ...(params.maxWeight !== undefined && { lte: params.maxWeight }),
          },
        } : {}),
      },
      include: { gemstones: true },
      orderBy: [{ isFeatured: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });

    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { sku: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));

    return profiles
      .filter((p) => productsMap.has(p.productId))
      .map((p) => ({ ...p, product: productsMap.get(p.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.jewelryProductProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
      include: { gemstones: true },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.jewelryProductProfile.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { gemstones: true },
    });
    if (!p) throw new NotFoundException('Profile not found');
    const product = await this.prisma.product.findUnique({
      where: { id: p.productId },
      include: { images: true, category: true },
    });
    return { ...p, product };
  }

  async priceAtCurrentRate(user: AuthenticatedUser, id: string) {
    const profile = await this.getOne(user, id);
    const rate = await this.prisma.jewelryMetalRate.findFirst({
      where: {
        tenantId: user.tenantId,
        metalType: profile.metalType,
        purity: profile.purity,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!rate) return { profile, error: 'No active rate found for this metal/purity' };

    const metalValue = profile.netWeight * rate.ratePerGram;
    const makingCharges =
      profile.makingChargePerGram * profile.netWeight +
      profile.makingChargeFixed +
      (metalValue * profile.makingChargePct) / 100;
    const wastageValue = (profile.wastagePct / 100) * metalValue + profile.wastageGrams * rate.ratePerGram;
    const stoneValue = (profile.gemstones || []).reduce((s, g) => s + (g.totalValue || 0), 0);
    const totalOtherCharges = profile.polishCharge + profile.hallmarkCharge + profile.designerCharge + profile.otherCharges;

    const subtotal = metalValue + makingCharges + wastageValue + stoneValue + totalOtherCharges;

    return {
      profile,
      rate: rate.ratePerGram,
      ratePerTola: rate.ratePerTola,
      metalValue,
      makingCharges,
      wastageValue,
      stoneValue,
      otherCharges: totalOtherCharges,
      subtotal,
      ratedAt: rate.effectiveDate,
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.jewelryProductProfile.delete({ where: { id } });
  }
}
