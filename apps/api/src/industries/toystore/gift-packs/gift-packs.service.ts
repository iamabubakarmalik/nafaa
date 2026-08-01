import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertGiftPackDto } from './dto/upsert-gift-pack.dto';

@Injectable()
export class GiftPacksService {
  constructor(private readonly prisma: PrismaService) {}

  private computeTotals(items: Array<{ quantity: number; unitPrice: number }>, packPrice: number) {
    const originalPrice = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
    const savings = Math.max(originalPrice - packPrice, 0);
    const savingsPct = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
    return { originalPrice, savings, savingsPct: Number(savingsPct.toFixed(2)) };
  }

  async create(user: AuthenticatedUser, dto: UpsertGiftPackDto) {
    if (!dto.items || dto.items.length < 2) throw new BadRequestException('A gift pack needs at least 2 items');

    const dup = await this.prisma.toyGiftPack.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Gift pack "${dto.name}" already exists`);

    const { originalPrice, savings, savingsPct } = this.computeTotals(dto.items, dto.giftPackPrice);

    return this.prisma.toyGiftPack.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        targetAgeGroup: dto.targetAgeGroup,
        targetGender: dto.targetGender,
        occasion: dto.occasion,
        items: dto.items as any,
        itemCount: dto.items.length,
        originalPrice,
        giftPackPrice: dto.giftPackPrice,
        savings,
        savingsPct,
        isGiftWrapped: dto.isGiftWrapped ?? true,
        includesCard: dto.includesCard ?? true,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        isSeasonal: dto.isSeasonal ?? false,
        seasonName: dto.seasonName,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    active?: boolean; featured?: boolean; seasonal?: boolean;
    ageGroup?: string; gender?: string; occasion?: string; search?: string;
  }) {
    const packs = await this.prisma.toyGiftPack.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.seasonal !== undefined && { isSeasonal: params.seasonal }),
        ...(params.ageGroup && { targetAgeGroup: params.ageGroup as any }),
        ...(params.gender && { targetGender: params.gender as any }),
        ...(params.occasion && { occasion: { contains: params.occasion, mode: 'insensitive' } }),
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      orderBy: [{ isFeatured: 'desc' }, { totalSold: 'desc' }],
      take: 200,
    });

    // Attach product details to each pack item
    const allProductIds = new Set<string>();
    packs.forEach((p) => ((p.items as any[]) ?? []).forEach((i) => allProductIds.add(i.productId)));

    const products = await this.prisma.product.findMany({
      where: { id: { in: Array.from(allProductIds) } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    return packs.map((p) => ({
      ...p,
      items: ((p.items as any[]) ?? []).map((i) => ({ ...i, product: map.get(i.productId) ?? null })),
    }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack not found');

    const ids = ((p.items as any[]) ?? []).map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((x) => [x.id, x]));

    // Buildable? check stock of every component
    const items = ((p.items as any[]) ?? []).map((i) => {
      const prod = map.get(i.productId);
      const stock = Number(prod?.stock ?? 0);
      return {
        ...i,
        product: prod ?? null,
        inStock: stock >= Number(i.quantity || 0),
        availableStock: stock,
        buildableUnits: i.quantity > 0 ? Math.floor(stock / i.quantity) : 0,
      };
    });

    const buildableUnits = items.length ? Math.min(...items.map((i) => i.buildableUnits)) : 0;

    return { ...p, items, computed: { buildableUnits, allInStock: items.every((i) => i.inStock) } };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertGiftPackDto) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack not found');
    if (!dto.items || dto.items.length < 2) throw new BadRequestException('A gift pack needs at least 2 items');

    const { originalPrice, savings, savingsPct } = this.computeTotals(dto.items, dto.giftPackPrice);

    return this.prisma.toyGiftPack.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        targetAgeGroup: dto.targetAgeGroup,
        targetGender: dto.targetGender,
        occasion: dto.occasion,
        items: dto.items as any,
        itemCount: dto.items.length,
        originalPrice,
        giftPackPrice: dto.giftPackPrice,
        savings,
        savingsPct,
        isGiftWrapped: dto.isGiftWrapped,
        includesCard: dto.includesCard,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
        isSeasonal: dto.isSeasonal,
        seasonName: dto.seasonName,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async duplicate(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack not found');

    let name = `${p.name} (Copy)`;
    let n = 2;
    while (await this.prisma.toyGiftPack.findFirst({ where: { tenantId: user.tenantId, name } })) {
      name = `${p.name} (Copy ${n++})`;
    }

    return this.prisma.toyGiftPack.create({
      data: {
        tenantId: user.tenantId,
        name,
        description: p.description,
        imageUrl: p.imageUrl,
        targetAgeGroup: p.targetAgeGroup,
        targetGender: p.targetGender,
        occasion: p.occasion,
        items: p.items as any,
        itemCount: p.itemCount,
        originalPrice: p.originalPrice,
        giftPackPrice: p.giftPackPrice,
        savings: p.savings,
        savingsPct: p.savingsPct,
        isGiftWrapped: p.isGiftWrapped,
        includesCard: p.includesCard,
        isActive: false,
        isFeatured: false,
        isSeasonal: p.isSeasonal,
        seasonName: p.seasonName,
      },
    });
  }

  async recordSale(user: AuthenticatedUser, id: string, quantity = 1) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack not found');
    return this.prisma.toyGiftPack.update({ where: { id }, data: { totalSold: { increment: quantity } } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack not found');
    return this.prisma.toyGiftPack.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [total, active, featured, seasonal, agg] = await Promise.all([
      this.prisma.toyGiftPack.count({ where: { tenantId: user.tenantId } }),
      this.prisma.toyGiftPack.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.toyGiftPack.count({ where: { tenantId: user.tenantId, isFeatured: true } }),
      this.prisma.toyGiftPack.count({ where: { tenantId: user.tenantId, isSeasonal: true } }),
      this.prisma.toyGiftPack.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { totalSold: true, savings: true }, _avg: { savingsPct: true },
      }),
    ]);

    return {
      total, active, featured, seasonal,
      totalSold: agg._sum.totalSold ?? 0,
      avgSavingsPct: Number((agg._avg.savingsPct ?? 0).toFixed(1)),
    };
  }
}
