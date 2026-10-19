/**
 * Electronics bundles: several products sold together at one price. The
 * POS splits a bundle into its products at checkout (sale lines noted
 * "Combo: <name>"), so stock and money move through the normal bill.
 *
 * Items are stored as JSON ({ productId, quantity, unitPrice }). Every read
 * adds the live product, how many bundles the branch stock can make, the
 * cost and profit, and how many bills sold the bundle.
 */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ElectronicsBundle, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { BundleItemDto, PatchBundleDto, UpsertBundleDto } from './dto/upsert-bundle.dto';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const LIVE_SALES = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

interface StoredItem { productId: string; quantity: number; unitPrice: number }

const itemsOf = (b: { items: Prisma.JsonValue }): StoredItem[] =>
  (Array.isArray(b.items) ? b.items : [])
    .map((i) => i as unknown as StoredItem)
    .filter((i) => i && typeof i.productId === 'string');

@Injectable()
export class BundlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertBundleDto) {
    const name = dto.name.trim();
    await this.checkName(user.tenantId, name);
    const items = await this.resolveItems(user.tenantId, dto.items);
    const prices = BundlesService.prices(items, dto.bundlePrice);
    const { validFrom, validUntil } = BundlesService.dates(dto.validFrom, dto.validUntil);
    return this.prisma.electronicsBundle.create({
      data: {
        tenantId: user.tenantId,
        name,
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        items: items as unknown as Prisma.InputJsonValue,
        ...prices,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        validFrom,
        validUntil,
      },
    });
  }

  async list(user: AuthenticatedUser, scope: ShopScope, params: { active?: boolean; featured?: boolean; search?: string }) {
    const rows = await this.prisma.electronicsBundle.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.search?.trim() && { name: { contains: params.search.trim(), mode: 'insensitive' } }),
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
    return this.decorate(user.tenantId, scope, rows);
  }

  async getOne(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle nahi mila');
    return (await this.decorate(user.tenantId, scope, [b]))[0];
  }

  async update(user: AuthenticatedUser, scope: ShopScope, id: string, dto: PatchBundleDto) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle nahi mila');
    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== b.name.toLowerCase()) await this.checkName(user.tenantId, name, id);
    const items = dto.items ? await this.resolveItems(user.tenantId, dto.items) : itemsOf(b);
    const prices = dto.items || dto.bundlePrice !== undefined
      ? BundlesService.prices(items, dto.bundlePrice ?? b.bundlePrice)
      : {};
    const dates = dto.validFrom !== undefined || dto.validUntil !== undefined
      ? BundlesService.dates(
          dto.validFrom !== undefined ? dto.validFrom : b.validFrom?.toISOString(),
          dto.validUntil !== undefined ? dto.validUntil : b.validUntil?.toISOString(),
        )
      : {};
    const updated = await this.prisma.electronicsBundle.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl?.trim() || null }),
        ...(dto.items && { items: items as unknown as Prisma.InputJsonValue }),
        ...prices,
        ...dates,
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      },
    });
    return (await this.decorate(user.tenantId, scope, [updated]))[0];
  }

  /**
   * A bundle only groups products; its bills keep their own lines. A bundle
   * that has been sold is switched off instead, so its name stays readable
   * in old bills and reports.
   */
  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle nahi mila');
    const sold = await this.prisma.saleItem.count({ where: { note: `Combo: ${b.name}`, sale: { tenantId: user.tenantId } } });
    if (sold) {
      await this.prisma.electronicsBundle.update({ where: { id }, data: { isActive: false } });
      return { id, archived: true };
    }
    await this.prisma.electronicsBundle.delete({ where: { id } });
    return { id, archived: false };
  }

  // ── helpers ──

  private async checkName(tenantId: string, name: string, exceptId?: string) {
    if (name.length < 2) throw new BadRequestException('Bundle ka naam likhein');
    const dup = await this.prisma.electronicsBundle.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (dup) throw new ConflictException(`"${name}" naam ka bundle pehle se hai`);
  }

  /** Items belong to this tenant, appear once, and carry the product price when none is given. */
  private async resolveItems(tenantId: string, items: BundleItemDto[]): Promise<StoredItem[]> {
    const ids = [...new Set(items.map((i) => i.productId))];
    if (ids.length !== items.length) throw new BadRequestException('Ek product do dafa hai — ek hi line me quantity barhayein');
    const products = await this.prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, price: true, isActive: true, name: true } });
    if (products.length !== ids.length) throw new NotFoundException('Bundle ka koi product nahi mila');
    const inactive = products.find((p) => !p.isActive);
    if (inactive) throw new BadRequestException(`"${inactive.name}" band hai — bundle me nahi ja sakta`);
    const byId = new Map(products.map((p) => [p.id, p]));
    const out = items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: r2(i.unitPrice != null && i.unitPrice > 0 ? i.unitPrice : Number(byId.get(i.productId)!.price) || 0),
    }));
    if (out.length === 1 && out[0].quantity <= 1) {
      throw new BadRequestException('Bundle me kam az kam do cheezein, ya ek cheez ki ek se zyada quantity honi chahiye');
    }
    return out;
  }

  private static prices(items: StoredItem[], bundlePrice: number) {
    const originalPrice = r2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
    const price = r2(bundlePrice);
    if (!(price > 0)) throw new BadRequestException('Bundle ki qeemat likhein');
    if (price > originalPrice) throw new BadRequestException(`Bundle ki qeemat (${price}) alag alag qeemat (${originalPrice}) se zyada hai`);
    const savings = r2(originalPrice - price);
    return { originalPrice, bundlePrice: price, savings, savingsPct: originalPrice > 0 ? r2((savings / originalPrice) * 100) : 0 };
  }

  private static dates(from?: string | null, until?: string | null) {
    const validFrom = from ? new Date(from) : null;
    const validUntil = until ? new Date(until) : null;
    if (validFrom && validUntil && validUntil < validFrom) throw new BadRequestException('Khatam hone ki tareekh shuru se pehle nahi ho sakti');
    return { validFrom, validUntil };
  }

  /** Live product, branch stock, cost, profit and bills sold for each bundle. */
  private async decorate(tenantId: string, scope: ShopScope, bundles: ElectronicsBundle[]) {
    const ids = [...new Set(bundles.flatMap((b) => itemsOf(b).map((i) => i.productId)))];
    const [products, shopRows, profiles, sold] = await Promise.all([
      ids.length
        ? this.prisma.product.findMany({
            where: { id: { in: ids }, tenantId },
            select: {
              id: true, name: true, sku: true, unit: true, price: true, costPrice: true, stock: true, isActive: true,
              images: { select: { url: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
            },
          })
        : [],
      ids.length && scope.shopId
        ? this.prisma.shopStock.findMany({ where: { tenantId, shopId: scope.shopId, productId: { in: ids }, variantId: null }, select: { productId: true, stock: true } })
        : [],
      ids.length
        ? this.prisma.electronicsProductProfile.findMany({ where: { tenantId, productId: { in: ids } }, select: { productId: true, requiresSerial: true, hasImei: true, warrantyMonths: true } })
        : [],
      bundles.length
        ? this.prisma.saleItem.findMany({
            where: { note: { in: bundles.map((b) => `Combo: ${b.name}`) }, sale: { tenantId, status: { in: [...LIVE_SALES] }, ...scope.where } },
            select: { saleId: true, note: true },
            distinct: ['saleId', 'note'],
          })
        : [],
    ]);
    const product = new Map(products.map((p) => [p.id, p]));
    const branch = new Map(shopRows.map((r) => [r.productId, Number(r.stock) || 0]));
    const profile = new Map(profiles.map((p) => [p.productId, p]));
    const bills = new Map<string, number>();
    for (const s of sold) bills.set(s.note ?? '', (bills.get(s.note ?? '') ?? 0) + 1);
    const now = Date.now();

    return bundles.map((b) => {
      let cost = 0;
      let canMake: number | null = null;
      const items = itemsOf(b).map((it) => {
        const p = product.get(it.productId);
        const have = p ? (scope.shopId ? branch.get(it.productId) ?? 0 : Number(p.stock) || 0) : 0;
        const make = it.quantity > 0 ? Math.max(Math.floor(have / it.quantity + 1e-9), 0) : 0;
        canMake = canMake === null ? make : Math.min(canMake, make);
        cost += (Number(p?.costPrice) || 0) * it.quantity;
        const pr = profile.get(it.productId);
        return {
          ...it,
          stock: have,
          product: p ? { ...p, imageUrl: p.images[0]?.url ?? null } : null,
          serial: !!(pr?.requiresSerial || pr?.hasImei),
          warrantyMonths: pr?.warrantyMonths ?? 0,
        };
      });
      const expired = !!b.validUntil && b.validUntil.getTime() < now;
      const upcoming = !!b.validFrom && b.validFrom.getTime() > now;
      const broken = items.some((i) => !i.product || !i.product.isActive);
      return {
        ...b,
        items,
        cost: r2(cost),
        profit: r2(b.bundlePrice - cost),
        canMake: canMake ?? 0,
        soldBills: bills.get(`Combo: ${b.name}`) ?? 0,
        expired,
        upcoming,
        broken,
        sellable: b.isActive && !expired && !upcoming && !broken,
      };
    });
  }
}
