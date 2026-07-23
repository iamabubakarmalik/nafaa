import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductPublishingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;

    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!shop) {
      throw new NotFoundException(
        'Koi shop nahi mili. Pehle ek shop banayein.',
      );
    }

    return shop.id;
  }

  async getProfile(tenantId: string, shopId: string | null | undefined, productId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { marketplaceProfile: true, images: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product.marketplaceProfile) {
      return { ...product.marketplaceProfile, productName: product.name };
    }

    return {
      productId,
      shopId: resolvedShopId,
      isListedOnMarketplace: false,
      publicName: product.name,
      publicDescription: product.description || '',
      publicPrice: Number(product.price) || 0,
      compareAtPrice: null,
      publicImages: product.images?.map((i) => i.url) || [],
      marketplaceCategory: '',
      isAvailable: true,
      bargainEnabled: false,
      groupBuyEnabled: false,
      bargainMinPrice: null,
    };
  }

  async updateProfile(tenantId: string, shopId: string | null | undefined, productId: string, dto: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { marketplaceProfile: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Build safe data object
    const data: any = {};
    const fields = [
      'publicName', 'publicDescription', 'publicPrice', 'compareAtPrice',
      'publicImages', 'marketplaceCategory', 'isAvailable',
      'bargainEnabled', 'groupBuyEnabled', 'bargainMinPrice',
    ];
    for (const f of fields) {
      if (dto[f] !== undefined) data[f] = dto[f];
    }
    if (dto.compareAtPrice !== undefined) data.compareAtPrice = dto.compareAtPrice || null;
    if (dto.bargainMinPrice !== undefined) data.bargainMinPrice = dto.bargainMinPrice || null;

    if (product.marketplaceProfile) {
      return this.prisma.productMarketplaceProfile.update({
        where: { productId },
        data,
      });
    }

    return this.prisma.productMarketplaceProfile.create({
      data: {
        productId,
        shopId: resolvedShopId,
        tenantId,
        publicName: dto.publicName || product.name,
        publicDescription: dto.publicDescription || '',
        publicPrice: dto.publicPrice || product.price,
        publicImages: dto.publicImages || [],
        marketplaceCategory: dto.marketplaceCategory || 'GROCERY',
        isAvailable: dto.isAvailable ?? true,
        isListedOnMarketplace: false,
        bargainEnabled: dto.bargainEnabled ?? false,
        groupBuyEnabled: dto.groupBuyEnabled ?? false,
        ratingAverage: 0,
        ratingCount: 0,
        totalSold: 0,
        wishlistCount: 0,
      },
    });
  }

  async publish(tenantId: string, shopId: string | null | undefined, productId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const shop = await this.prisma.shop.findFirst({
      where: { id: resolvedShopId, tenantId },
      include: { marketplaceProfile: true },
    });
    if (!shop?.marketplaceProfile?.isListedOnMarketplace) {
      throw new BadRequestException(
        'Pehle apni shop marketplace pe publish karein.',
      );
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { marketplaceProfile: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.marketplaceProfile) {
      throw new BadRequestException(
        'Pehle marketplace profile complete karein.',
      );
    }

    if (!product.marketplaceProfile.publicName || Number(product.marketplaceProfile.publicPrice) <= 0) {
      throw new BadRequestException('Public name aur valid price zaroori hain');
    }

    await this.prisma.productMarketplaceProfile.update({
      where: { productId },
      data: { isListedOnMarketplace: true, listedAt: new Date() },
    });

    return { success: true, message: 'Product is now live on marketplace!' };
  }

  async unpublish(tenantId: string, _shopId: string | null | undefined, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.productMarketplaceProfile.update({
      where: { productId },
      data: { isListedOnMarketplace: false },
    });

    return { success: true };
  }
}
