import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { endOfDayTz, startOfDayTz, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { UpsertGiftPackDto } from './dto/upsert-gift-pack.dto';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** A `yyyy-mm-dd` key is a shop day (Pakistan time); `end` takes its last moment. */
function shopDay(value: string | undefined | null, end: boolean): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? zonedToUtc(Number(m[1]), Number(m[2]), Number(m[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Tareekh sahi likhein');
  return end ? endOfDayTz(d) : startOfDayTz(d);
}

/**
 * Lines of a pack. Packs saved while the request pipe emptied every line
 * hold `[]` entries; those are skipped so the list still opens and the
 * owner can re-add the toys.
 */
function packItems(items: unknown): Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number }> {
  return (Array.isArray(items) ? items : []).filter(
    (i): i is { productId: string; variantId?: string; quantity: number; unitPrice: number } =>
      !!i && typeof i === 'object' && !Array.isArray(i) && typeof (i as any).productId === 'string',
  );
}

@Injectable()
export class GiftPacksService {
  constructor(private readonly prisma: PrismaService) {}

  private computeTotals(items: Array<{ quantity: number; unitPrice: number }>, packPrice: number) {
    const originalPrice = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
    const savings = Math.max(originalPrice - packPrice, 0);
    const savingsPct = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;
    return { originalPrice, savings, savingsPct: Number(savingsPct.toFixed(2)) };
  }

  /**
   * Checks a pack before it is saved: at least two lines of this shop's own
   * toys, whole quantities, a price above zero and a sensible date window.
   * Line prices are the toys' current prices when left out.
   */
  private async checked(user: AuthenticatedUser, dto: UpsertGiftPackDto, id?: string) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Pack ka naam likhein');
    const dup = await this.prisma.toyGiftPack.findFirst({
      where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' }, ...(id && { NOT: { id } }) },
      select: { id: true },
    });
    if (dup) throw new BadRequestException(`Gift pack "${name}" pehle se hai`);
    const lines = packItems(dto.items);
    if (lines.length < 2) throw new BadRequestException('Gift pack me kam se kam 2 khilone hon');
    const ids = [...new Set(lines.map((l) => l.productId))];
    const products = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, price: true } });
    if (products.length !== ids.length) throw new BadRequestException('Pack me koi khilona is dukaan ka nahi');
    const price = new Map(products.map((p) => [p.id, p.price]));
    const variantIds = lines.map((l) => l.variantId).filter((v): v is string => !!v);
    if (variantIds.length) {
      const ok = await this.prisma.productVariant.count({ where: { id: { in: variantIds }, productId: { in: ids } } });
      if (ok !== new Set(variantIds).size) throw new BadRequestException('Pack me koi variant sahi nahi');
    }
    const items = lines.map((l) => {
      const quantity = Math.floor(Number(l.quantity));
      if (!(quantity >= 1)) throw new BadRequestException('Har khilone ki quantity kam se kam 1');
      const unitPrice = l.unitPrice === undefined || l.unitPrice === null ? (price.get(l.productId) ?? 0) : r2(Number(l.unitPrice));
      if (!(unitPrice >= 0)) throw new BadRequestException('Khilone ki qeemat sahi likhein');
      return { productId: l.productId, ...(l.variantId && { variantId: l.variantId }), quantity, unitPrice };
    });
    const giftPackPrice = r2(Number(dto.giftPackPrice));
    if (!(giftPackPrice > 0)) throw new BadRequestException('Pack ki qeemat likhein');
    const validFrom = shopDay(dto.validFrom, false);
    const validUntil = shopDay(dto.validUntil, true);
    if (validFrom && validUntil && validUntil < validFrom) throw new BadRequestException('Khatam hone ki tareekh shuru se pehle nahi ho sakti');
    return { name, items, giftPackPrice, validFrom, validUntil };
  }

  async create(user: AuthenticatedUser, dto: UpsertGiftPackDto) {
    const c = await this.checked(user, dto);
    const { originalPrice, savings, savingsPct } = this.computeTotals(c.items, c.giftPackPrice);

    return this.prisma.toyGiftPack.create({
      data: {
        tenantId: user.tenantId,
        name: c.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        targetAgeGroup: dto.targetAgeGroup,
        targetGender: dto.targetGender,
        occasion: dto.occasion,
        items: c.items,
        itemCount: c.items.length,
        originalPrice,
        giftPackPrice: c.giftPackPrice,
        savings,
        savingsPct,
        isGiftWrapped: dto.isGiftWrapped ?? true,
        includesCard: dto.includesCard ?? true,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        isSeasonal: dto.isSeasonal ?? false,
        seasonName: dto.seasonName,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
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
    packs.forEach((p) => packItems(p.items).forEach((i) => allProductIds.add(i.productId)));

    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: Array.from(allProductIds) } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    return packs.map((p) => ({
      ...p,
      items: packItems(p.items).map((i) => ({ ...i, product: map.get(i.productId) ?? null })),
    }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack nahi mila');

    const ids = packItems(p.items).map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: ids } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const map = new Map(products.map((x) => [x.id, x]));

    // Buildable? check stock of every component
    const items = packItems(p.items).map((i) => {
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
    if (!p) throw new NotFoundException('Gift pack nahi mila');
    const c = await this.checked(user, dto, id);
    const { originalPrice, savings, savingsPct } = this.computeTotals(c.items, c.giftPackPrice);

    return this.prisma.toyGiftPack.update({
      where: { id },
      data: {
        name: c.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        targetAgeGroup: dto.targetAgeGroup,
        targetGender: dto.targetGender,
        occasion: dto.occasion,
        items: c.items,
        itemCount: c.items.length,
        originalPrice,
        giftPackPrice: c.giftPackPrice,
        savings,
        savingsPct,
        isGiftWrapped: dto.isGiftWrapped,
        includesCard: dto.includesCard,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
        isSeasonal: dto.isSeasonal,
        seasonName: dto.seasonName,
        // The form always sends the window; empty means no limit.
        validFrom: c.validFrom,
        validUntil: c.validUntil,
      },
    });
  }

  async duplicate(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack nahi mila');

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
    const qty = Math.floor(Number(quantity));
    if (!(qty >= 1 && qty <= 1000)) throw new BadRequestException('Quantity sahi nahi');
    quantity = qty;
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack nahi mila');
    return this.prisma.toyGiftPack.update({ where: { id }, data: { totalSold: { increment: quantity } } });
  }

  /** Takes the pack off the counter; its sales history stays. */
  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.toyGiftPack.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Gift pack nahi mila');
    return this.prisma.toyGiftPack.update({ where: { id }, data: { isActive: false, isFeatured: false } });
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
