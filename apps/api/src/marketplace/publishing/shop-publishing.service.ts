import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketChannelService } from '../_shared/market-channel.service';
import { MarketSettingsService } from '../_shared/market-settings.service';
import { isMarketGate, sanitizeFlow } from '../_shared/market-config';

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
  if (dto.whatsappNumber !== undefined) data.whatsappNumber = dto.whatsappNumber || null;
  if (dto.address !== undefined) data.addressLine1 = dto.address;
  if (dto.addressLine1 !== undefined) data.addressLine1 = dto.addressLine1;
  if (dto.addressLine2 !== undefined) data.addressLine2 = dto.addressLine2;

  // Shop photos (http/https links, up to 12) and sub-categories (up to 10)
  if (dto.galleryUrls !== undefined) {
    if (!Array.isArray(dto.galleryUrls)) throw new BadRequestException('Photos ki list sahi nahi');
    data.galleryUrls = [...new Set<string>(dto.galleryUrls.filter((u: unknown) => typeof u === 'string' && /^https?:\/\/\S+$/.test(u.trim())).map((u: string) => u.trim()))].slice(0, 12);
  }
  if (dto.subCategories !== undefined) {
    if (!Array.isArray(dto.subCategories)) throw new BadRequestException('Categories ki list sahi nahi');
    data.subCategories = [...new Set<string>(dto.subCategories.filter((c: unknown) => typeof c === 'string' && c.trim()).map((c: string) => c.trim().slice(0, 60)))].slice(0, 10);
  }

  // Market section and its flow switches
  if (dto.gate !== undefined) {
    if (dto.gate !== null && dto.gate !== '' && !isMarketGate(dto.gate)) throw new BadRequestException('Market section sahi nahi');
    data.gate = dto.gate || null;
  }
  if (dto.flowSettings !== undefined) data.flowSettings = sanitizeFlow(dto.flowSettings);

  // Opening hours ({ mon: { open, close, closed } }) and holiday dates (YYYY-MM-DD)
  if (dto.workingHours !== undefined) {
    data.workingHours = dto.workingHours && typeof dto.workingHours === 'object' && !Array.isArray(dto.workingHours) ? dto.workingHours : null;
  }
  if (Array.isArray(dto.holidayDates)) {
    data.holidayDates = dto.holidayDates
      .filter((d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d))
      .slice(0, 60)
      .map((d: string) => new Date(`${d.slice(0, 10)}T00:00:00.000Z`));
  }

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
    whatsappNumber: profile.whatsappNumber || profile.publicPhone || '',
  };
}

@Injectable()
export class ShopPublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channel: MarketChannelService,
    private readonly settings: MarketSettingsService,
  ) {}

  /** Adds the resolved section (gate), sub-filter and flow to a profile response. */
  private withGate(dto: any, businessType: string | null | undefined, profile: { gate?: string | null; flowSettings?: unknown } | null) {
    const g = this.settings.shopGate({ gate: profile?.gate ?? null, flowSettings: profile?.flowSettings ?? null, tenant: { businessType } });
    return { ...dto, gate: profile?.gate ?? null, resolvedGate: g.gate, gateFilter: g.gateFilter, flowSettings: profile?.flowSettings ?? {}, flow: g.flow };
  }

  private async businessType(tenantId: string) {
    return (await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessType: true } }))?.businessType ?? null;
  }

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

    const businessType = await this.businessType(tenantId);
    if (shop.marketplaceProfile) {
      return this.withGate({
        ...mapSchemaToDto(shop.marketplaceProfile, shop.name),
        shopId: shop.id,
      }, businessType, shop.marketplaceProfile);
    }

    return this.withGate({
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
    }, businessType, null);
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
      return this.withGate(mapSchemaToDto(updated, shop.name), await this.businessType(tenantId), updated);
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
    return this.withGate(mapSchemaToDto(created, shop.name), await this.businessType(tenantId), created);
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
    // Market orders reach the shop's Online Orders through this channel.
    await this.channel.ensureChannel(shop.id);

    return { success: true, message: 'Dukaan ab Nafaa Market par live hai' };
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
