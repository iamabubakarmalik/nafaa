/**
 * Collections (Summer Lawn 2026, Eid, Winter): which products belong to
 * which season, what is left on the shelf and how each one sells, plus
 * marking a whole collection "on sale".
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DAY_MS, duplicateName, opt, r2 } from '../common/garments-common';
import { UpsertCollectionDto } from './dto/upsert-collection.dto';

const SOLD = ['COMPLETED', 'PARTIALLY_RETURNED'] as const;

const day = (v: string) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Tareekh sahi nahi');
  return d;
};

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private data(dto: UpsertCollectionDto) {
    const { launchDate, endDate, name, code, description, shopId: _s, ...rest } = dto;
    return {
      ...rest,
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: opt(code) ?? null }),
      ...(description !== undefined && { description: opt(description) ?? null }),
      ...(launchDate !== undefined && { launchDate: launchDate ? day(launchDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? day(endDate) : null }),
    };
  }

  async create(user: AuthenticatedUser, dto: UpsertCollectionDto) {
    return this.prisma.garmentCollection.create({ data: { tenantId: user.tenantId, ...this.data(dto), name: dto.name.trim() } })
      .catch((e) => duplicateName(e, `Collection "${dto.name}" pehle se hai`));
  }

  async list(user: AuthenticatedUser, params: { season?: string; active?: boolean; featured?: boolean; search?: string }) {
    const rows = await this.prisma.garmentCollection.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.season && { season: params.season as never }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { isFeatured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    const counts = await this.prisma.garmentProductProfile.groupBy({
      by: ['collectionId'], where: { tenantId: user.tenantId, collectionId: { in: rows.map((r) => r.id) } }, _count: { _all: true },
    });
    const byId = new Map(counts.map((c) => [c.collectionId, c._count._all]));
    return rows.map((r) => ({ ...r, productCount: byId.get(r.id) ?? 0 }));
  }

  /**
   * Shelf and sales per collection for this branch: products, pieces in
   * stock, stock value at cost, pieces and money sold in the last `days`
   * days, and how many products are marked on sale.
   */
  async stats(user: AuthenticatedUser, scope: ShopScope, days = 30) {
    const profiles = await this.prisma.garmentProductProfile.findMany({
      where: { tenantId: user.tenantId, collectionId: { not: null } },
      select: { productId: true, collectionId: true, isOnSale: true },
    });
    const ids = profiles.map((p) => p.productId);
    const since = new Date(Date.now() - Math.min(Math.max(days, 1), 365) * DAY_MS);
    const [stock, products, sold] = await Promise.all([
      this.prisma.shopStock.groupBy({
        by: ['productId'], where: { tenantId: user.tenantId, productId: { in: ids }, ...scope.where }, _sum: { stock: true },
      }),
      this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, costPrice: true, isActive: true } }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { productId: { in: ids }, sale: { tenantId: user.tenantId, status: { in: [...SOLD] }, createdAt: { gte: since }, ...scope.where } },
        _sum: { quantity: true, total: true },
      }),
    ]);
    const stockOf = new Map(stock.map((s) => [s.productId, Number(s._sum.stock ?? 0)]));
    const costOf = new Map(products.map((p) => [p.id, Number(p.costPrice) || 0]));
    const soldOf = new Map(sold.map((s) => [s.productId!, { qty: Number(s._sum.quantity ?? 0), value: Number(s._sum.total ?? 0) }]));
    const out = new Map<string, { collectionId: string; products: number; onSale: number; stock: number; stockValue: number; soldQty: number; soldValue: number }>();
    for (const p of profiles) {
      const row = out.get(p.collectionId!) ?? { collectionId: p.collectionId!, products: 0, onSale: 0, stock: 0, stockValue: 0, soldQty: 0, soldValue: 0 };
      const units = Math.max(stockOf.get(p.productId) ?? 0, 0);
      row.products += 1;
      if (p.isOnSale) row.onSale += 1;
      row.stock += units;
      row.stockValue = r2(row.stockValue + units * (costOf.get(p.productId) ?? 0));
      row.soldQty += soldOf.get(p.productId)?.qty ?? 0;
      row.soldValue = r2(row.soldValue + (soldOf.get(p.productId)?.value ?? 0));
      out.set(p.collectionId!, row);
    }
    return { days, items: [...out.values()] };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection nahi mili');
    const profiles = await this.prisma.garmentProductProfile.findMany({
      where: { tenantId: user.tenantId, collectionId: id },
      select: { productId: true, isOnSale: true, categoryType: true, gender: true },
      take: 500,
    });
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: profiles.map((p) => p.productId) } },
      select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
      orderBy: { name: 'asc' },
    });
    const sale = new Map(profiles.map((p) => [p.productId, p.isOnSale]));
    return { ...c, products: products.map((p) => ({ ...p, isOnSale: !!sale.get(p.id) })), productCount: profiles.length };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCollectionDto) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection nahi mili');
    return this.prisma.garmentCollection.update({ where: { id }, data: this.data(dto) })
      .catch((e) => duplicateName(e, `Collection "${dto.name}" pehle se hai`));
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection nahi mili');
    return this.prisma.garmentCollection.update({ where: { id }, data: { isFeatured: !c.isFeatured } });
  }

  /** Marks (or unmarks) every product of the collection as on sale; the POS shows them under "Sale". */
  async setOnSale(user: AuthenticatedUser, id: string, onSale: boolean) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection nahi mili');
    const res = await this.prisma.garmentProductProfile.updateMany({ where: { tenantId: user.tenantId, collectionId: id }, data: { isOnSale: onSale } });
    return { updated: res.count, onSale };
  }

  /** Puts products into the collection (their garment details are created when missing). */
  async addProducts(user: AuthenticatedUser, id: string, productIds: string[]) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection nahi mili');
    const own = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: productIds } }, select: { id: true } });
    await this.prisma.$transaction(own.map((p) => this.prisma.garmentProductProfile.upsert({
      where: { productId: p.id },
      update: { collectionId: id },
      create: { tenantId: user.tenantId, productId: p.id, collectionId: id, season: c.season },
    })));
    return { added: own.length };
  }

  /** Takes products out of the collection; the products themselves stay. */
  async removeProducts(user: AuthenticatedUser, id: string, productIds: string[]) {
    const res = await this.prisma.garmentProductProfile.updateMany({
      where: { tenantId: user.tenantId, collectionId: id, productId: { in: productIds } },
      data: { collectionId: null },
    });
    return { removed: res.count };
  }

  /** Switched off, never deleted: products keep their link for history. */
  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.garmentCollection.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Collection nahi mili');
    return this.prisma.garmentCollection.update({ where: { id }, data: { isActive: false } });
  }
}
