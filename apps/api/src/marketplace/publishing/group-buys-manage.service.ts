import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupBuysManageService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('No shop found');
    return shop.id;
  }

  async list(tenantId: string, shopId: string | null | undefined, opts: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { shopId: resolvedShopId };
    if (opts.status) where.status = opts.status;

    const [items, total, statusCounts] = await Promise.all([
      this.prisma.groupBuy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          participants: {
            take: 5,
            include: {
              customer: { select: { id: true, fullName: true, avatarUrl: true } },
            },
          },
        },
      }),
      this.prisma.groupBuy.count({ where }),
      this.prisma.groupBuy.groupBy({
        by: ['status'],
        where: { shopId: resolvedShopId },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {};
    statusCounts.forEach((s) => { counts[s.status] = s._count._all; });

    const productIds = items.map((gb) => gb.productId);
    const productProfiles = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, publicImages: true },
    });
    const imgMap = new Map(productProfiles.map((p) => [p.productId, p.publicImages?.[0]]));
    const priceRows = await this.prisma.productMarketplaceProfile.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, publicPrice: true },
    });
    const priceMap = new Map(priceRows.map(r => [r.productId, Number(r.publicPrice)]));

    return {
      items: items.map((gb) => ({
        ...gb,
        originalPrice: Number(priceMap.get(gb.productId) || 0),
        groupPrice: Number(gb.groupPrice),
        productImage: imgMap.get(gb.productId),
        participantsPreview: gb.participants.map((p) => ({
          id: p.customerId,
          fullName: p.customer.fullName,
          avatarUrl: p.customer.avatarUrl,
          quantity: p.quantity,
        })),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts,
    };
  }

  async create(tenantId: string, shopId: string | null | undefined, dto: any) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const product = await this.prisma.productMarketplaceProfile.findFirst({
      where: { productId: dto.productId, shopId: resolvedShopId, isListedOnMarketplace: true },
    });
    if (!product) throw new BadRequestException('Product not listed on marketplace');

    return this.prisma.groupBuy.create({
      data: {
        productId: dto.productId,
        shopId: resolvedShopId,
        tenantId,
        productName: product.publicName,
        regularPrice: product.publicPrice,
        groupPrice: dto.groupPrice,
        minParticipants: dto.minParticipants,
        maxParticipants: dto.maxParticipants,
        currentCount: 0,
        status: 'ACTIVE',
        startsAt: new Date(dto.startsAt),
        expiresAt: new Date(dto.expiresAt),
      },
    });
  }

  async cancel(tenantId: string, shopId: string | null | undefined, groupBuyId: string, reason?: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const gb = await this.prisma.groupBuy.findFirst({
      where: { id: groupBuyId, shopId: resolvedShopId },
    });
    if (!gb) throw new NotFoundException();

    return this.prisma.groupBuy.update({
      where: { id: groupBuyId },
      data: { status: 'CANCELLED' },
    });
  }
}
