import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
}

/**
 * Map incoming DTO (from frontend) to actual Prisma schema fields.
 * Frontend uses friendly names (contactPhone, address) that we translate to
 * schema names (publicPhone, addressLine1).
 */
function mapDtoToSchema(dto: any): any {
  const data: any = {};

  // Direct fields (same name in DTO and schema)
  const directFields = [
    'publicName', 'tagline', 'description', 'industry',
    'logoUrl', 'coverUrl', 'city', 'area', 'province',
    'lat', 'lng', 'websiteUrl',
    'deliveryFee', 'estimatedDeliveryMinutes', 'deliveryRadiusKm',
    'offersDelivery', 'offersPickup', 'offersDineIn',
    'acceptsCod', 'acceptsCard', 'acceptsJazzcash', 'acceptsEasypaisa',
    'acceptsRaast', 'acceptsWallet',
    'bargainEnabled', 'bargainMinPercent',
    'groupBuyEnabled', 'liveShopEnabled', 'auctionEnabled',
    'prayerTimeMode', 'ramzanScheduleActive',
    'metaTitle', 'metaDescription',
    'cnicNumber', 'businessRegNumber', 'taxNumber',
  ];

  for (const f of directFields) {
    if (dto[f] !== undefined) data[f] = dto[f];
  }

  // ─── Frontend name → Schema name mapping ───
  if (dto.contactPhone !== undefined) data.publicPhone = dto.contactPhone;
  if (dto.contactEmail !== undefined) data.publicEmail = dto.contactEmail;
  // WhatsApp — schema mein alag field nahi, publicPhone fallback ke saath skip
  if (dto.address !== undefined) data.addressLine1 = dto.address;
  if (dto.addressLine1 !== undefined) data.addressLine1 = dto.addressLine1;
  if (dto.addressLine2 !== undefined) data.addressLine2 = dto.addressLine2;

  // Nullable numeric fields
  if (dto.freeDeliveryAbove !== undefined) {
    data.freeDeliveryAbove = dto.freeDeliveryAbove || null;
  }
  if (dto.minOrderAmount !== undefined) {
    data.minOrderAmount = dto.minOrderAmount || 0;
  }
  if (dto.maxOrderAmount !== undefined) {
    data.maxOrderAmount = dto.maxOrderAmount || null;
  }

  return data;
}

/**
 * Map schema fields back to frontend-friendly names when returning data.
 */
function mapSchemaToDto(profile: any, shopName?: string): any {
  if (!profile) return null;
  return {
    ...profile,
    shopName,
    // Frontend-friendly aliases
    contactPhone: profile.publicPhone || '',
    contactEmail: profile.publicEmail || '',
    address: profile.addressLine1 || '',
    whatsappNumber: profile.publicPhone || '',
  };
}

@Injectable()
export class ShopPublishingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShop(tenantId: string, shopId?: string | null) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID missing from session');
    }

    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, tenantId },
        include: { marketplaceProfile: true },
      });
      if (shop) return shop;
    }

    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      include: { marketplaceProfile: true },
    });

    if (!shop) {
      throw new NotFoundException(
        'Koi shop nahi mili. Pehle ek shop banayein Organization > Shops se.',
      );
    }

    return shop;
  }

  async getProfile(tenantId: string, shopId?: string | null) {
    const shop = await this.resolveShop(tenantId, shopId);

    if (shop.marketplaceProfile) {
      return {
        ...mapSchemaToDto(shop.marketplaceProfile, shop.name),
        shopId: shop.id,
      };
    }

    return {
      shopId: shop.id,
      isListedOnMarketplace: false,
      publicName: shop.name,
      tagline: '',
      description: '',
      industry: 'GROCERY',
      city: '',
      area: '',
      address: '',
      deliveryFee: 0,
      freeDeliveryAbove: null,
      minOrderAmount: 0,
      offersDelivery: true,
      offersPickup: true,
      acceptsCod: true,
      acceptsCard: true,
      acceptsJazzcash: true,
      acceptsEasypaisa: true,
      bargainEnabled: false,
      groupBuyEnabled: false,
      contactPhone: '',
      contactEmail: '',
      whatsappNumber: '',
    };
  }

  async updateProfile(tenantId: string, shopId: string | null | undefined, dto: any) {
    const shop = await this.resolveShop(tenantId, shopId);
    const resolvedShopId = shop.id;

    const data = mapDtoToSchema(dto);

    if (shop.marketplaceProfile) {
      const updated = await this.prisma.shopMarketplaceProfile.update({
        where: { shopId: resolvedShopId },
        data,
      });
      return mapSchemaToDto(updated, shop.name);
    }

    const created = await this.prisma.shopMarketplaceProfile.create({
      data: {
        shopId: resolvedShopId,
        tenantId,
        slug: slugify(dto.publicName || shop.name),
        publicName: dto.publicName || shop.name,
        industry: dto.industry || 'GROCERY',
        city: dto.city || '',
        isListedOnMarketplace: false,
        isOpen: true,
        verificationLevel: 'UNVERIFIED',
        ...data,
      },
    });
    return mapSchemaToDto(created, shop.name);
  }

  async publish(tenantId: string, shopId?: string | null) {
    const shop = await this.resolveShop(tenantId, shopId);

    if (!shop.marketplaceProfile) {
      throw new BadRequestException(
        'Pehle marketplace profile complete karein aur save karein.',
      );
    }

    const p = shop.marketplaceProfile;
    if (!p.publicName || !p.city) {
      throw new BadRequestException(
        'Public name aur city zaroori hain. Pehle basic info fill karein.',
      );
    }

    await this.prisma.shopMarketplaceProfile.update({
      where: { shopId: shop.id },
      data: { isListedOnMarketplace: true, listedAt: new Date() },
    });

    return { success: true, message: 'Shop is now live on marketplace!' };
  }

  async unpublish(tenantId: string, shopId?: string | null) {
    const shop = await this.resolveShop(tenantId, shopId);

    if (!shop.marketplaceProfile) {
      throw new BadRequestException('Koi marketplace profile hi nahi hai');
    }

    await this.prisma.shopMarketplaceProfile.update({
      where: { shopId: shop.id },
      data: { isListedOnMarketplace: false },
    });

    return { success: true, message: 'Shop unpublished from marketplace' };
  }
}
