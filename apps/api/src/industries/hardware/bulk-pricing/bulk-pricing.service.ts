import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertBulkPricingDto } from './dto/upsert-bulk-pricing.dto';

@Injectable()
export class BulkPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertBulkPricingDto) {
    return this.prisma.hardwareBulkPricing.create({
      data: { tenantId: user.tenantId, ...dto },
    });
  }

  async listByProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.hardwareBulkPricing.findMany({
      where: { tenantId: user.tenantId, productId, isActive: true },
      orderBy: { minQuantity: 'asc' },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertBulkPricingDto) {
    const p = await this.prisma.hardwareBulkPricing.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Pricing not found');
    return this.prisma.hardwareBulkPricing.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.hardwareBulkPricing.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Pricing not found');
    return this.prisma.hardwareBulkPricing.delete({ where: { id } });
  }

  async calculatePrice(user: AuthenticatedUser, productId: string, quantity: number) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const profile = await this.prisma.hardwareProductProfile.findUnique({ where: { productId } });
    const tiers = await this.prisma.hardwareBulkPricing.findMany({
      where: { tenantId: user.tenantId, productId, isActive: true },
      orderBy: { minQuantity: 'desc' },
    });

    // Find matching tier
    const matchedTier = tiers.find((t) => quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity));

    // Default pricing hierarchy: bulk > wholesale > retail > product.price
    let unitPrice = product.price;
    let priceSource = 'RETAIL';

    if (matchedTier) {
      unitPrice = matchedTier.price;
      priceSource = matchedTier.label || 'BULK';
    } else if (profile) {
      if (profile.minBulkQty && quantity >= profile.minBulkQty && profile.bulkPrice) {
        unitPrice = profile.bulkPrice;
        priceSource = 'BULK';
      } else if (profile.wholesalePrice && quantity >= 10) {
        unitPrice = profile.wholesalePrice;
        priceSource = 'WHOLESALE';
      } else if (profile.retailPrice) {
        unitPrice = profile.retailPrice;
        priceSource = 'RETAIL';
      }
    }

    const totalPrice = unitPrice * quantity;
    const totalSaved = (product.price - unitPrice) * quantity;

    return {
      productId,
      productName: product.name,
      quantity,
      unitPrice,
      totalPrice,
      totalSaved,
      priceSource,
      matchedTier,
      allTiers: tiers.reverse(),
    };
  }
}
