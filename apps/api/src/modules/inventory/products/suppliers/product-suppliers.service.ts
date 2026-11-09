/**
 * Where each product can be bought: its suppliers with their code, usual and
 * last cost (per base unit), minimum order, delivery days and the preferred
 * one. Also the bulk changes made from the products page (category, brand,
 * supplier, price percent), which all run over many products at once.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { syncBaseUnits } from '../../../../industries/retail/product-units/unit-math';
import { BulkProductUpdateDto, ReplaceSupplierLinksDto } from './product-suppliers.dto';
import { pickPreferred } from './product-suppliers.helper';
import { apiMessage } from '../../../../common/i18n/api-message';

const LINK_SELECT = {
  id: true, productId: true, supplierId: true, supplierSku: true, costPrice: true, lastPurchasePrice: true, lastPurchasedAt: true,
  minOrderQty: true, leadDays: true, unitId: true, isPreferred: true, notes: true,
  supplier: { select: { id: true, name: true, phone: true, city: true, isActive: true } },
} satisfies Prisma.ProductSupplierSelect;

/** New price after a percent change, rounded to the step (never below one step). */
export function bumpPrice(old: number, percent: number, step = 1): number {
  const raw = (Number(old) || 0) * (1 + percent / 100);
  if (!(raw > 0)) return 0;
  const s = step > 0 ? step : 1;
  return Math.max(s, Math.round(Math.round(raw / s) * s * 100) / 100);
}

@Injectable()
export class ProductSuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  private async product(tenantId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId }, select: { id: true, unit: true } });
    if (!p) throw new NotFoundException('Product nahi mila');
    return p;
  }

  /** A product's suppliers, preferred first, with the last few real purchase prices from each. */
  async list(user: AuthenticatedUser, productId: string) {
    const p = await this.product(user.tenantId, productId);
    const [links, lines, units] = await Promise.all([
      this.prisma.productSupplier.findMany({ where: { tenantId: user.tenantId, productId }, select: LINK_SELECT, orderBy: [{ isPreferred: 'desc' }, { lastPurchasedAt: 'desc' }] }),
      this.prisma.purchaseItem.findMany({
        where: { productId, purchase: { tenantId: user.tenantId, status: { in: ['RECEIVED', 'PARTIAL'] } } },
        orderBy: { purchase: { purchasedAt: 'desc' } },
        take: 60,
        select: {
          unitName: true, conversionRate: true, quantity: true, costPrice: true,
          purchase: { select: { id: true, purchaseNumber: true, purchasedAt: true, supplierId: true } },
        },
      }),
      this.prisma.productUnit.findMany({ where: { productId, variantId: null, isActive: true }, select: { id: true, unitName: true, conversionRate: true } }),
    ]);
    const history = new Map<string, Array<{ purchaseId: string; purchaseNumber: string; purchasedAt: Date; unitName: string; quantity: number; costPrice: number; baseCost: number }>>();
    for (const l of lines) {
      const list = history.get(l.purchase.supplierId) ?? [];
      if (list.length >= 5) continue;
      const rate = Number(l.conversionRate) || 1;
      list.push({
        purchaseId: l.purchase.id, purchaseNumber: l.purchase.purchaseNumber, purchasedAt: l.purchase.purchasedAt,
        unitName: l.unitName, quantity: l.quantity, costPrice: l.costPrice, baseCost: Math.round((l.costPrice / rate) * 100) / 100,
      });
      history.set(l.purchase.supplierId, list);
    }
    const unitName = new Map(units.map((u) => [u.id, u]));
    return {
      baseUnit: p.unit,
      units,
      items: links.map((l) => ({
        ...l,
        unit: l.unitId ? unitName.get(l.unitId) ?? null : null,
        purchases: history.get(l.supplierId) ?? [],
      })),
    };
  }

  /** Saves the whole list from the editor; purchase history fields are kept. */
  async replace(user: AuthenticatedUser, productId: string, dto: ReplaceSupplierLinksDto) {
    await this.product(user.tenantId, productId);
    const seen = new Set<string>();
    for (const l of dto.links) {
      if (seen.has(l.supplierId)) throw new BadRequestException('Ek supplier do dafa laga hai');
      seen.add(l.supplierId);
    }
    const ids = [...seen];
    const [suppliers, units] = await Promise.all([
      ids.length ? this.prisma.supplier.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true } }) : [],
      this.prisma.productUnit.findMany({ where: { productId, variantId: null }, select: { id: true } }),
    ]);
    if (suppliers.length !== ids.length) throw new NotFoundException('Supplier nahi mila');
    const unitIds = new Set(units.map((u) => u.id));
    const links = pickPreferred(dto.links);

    await this.prisma.$transaction(async (tx) => {
      await tx.productSupplier.deleteMany({ where: { tenantId: user.tenantId, productId, supplierId: { notIn: ids } } });
      for (const l of links) {
        const data = {
          supplierSku: l.supplierSku?.trim() || null,
          // Left out (a user without cost.view never sees it): keep the stored cost.
          ...(l.costPrice !== undefined && { costPrice: l.costPrice != null && l.costPrice > 0 ? l.costPrice : null }),
          minOrderQty: l.minOrderQty != null && l.minOrderQty > 0 ? l.minOrderQty : null,
          leadDays: l.leadDays ?? null,
          unitId: l.unitId && unitIds.has(l.unitId) ? l.unitId : null,
          isPreferred: !!l.isPreferred,
          notes: l.notes?.trim() || null,
        };
        await tx.productSupplier.upsert({
          where: { productId_supplierId: { productId, supplierId: l.supplierId } },
          update: data,
          create: { ...data, tenantId: user.tenantId, productId, supplierId: l.supplierId },
        });
      }
    });
    return this.list(user, productId);
  }

  /**
   * Every link of the shop (or of one supplier), small enough for the
   * purchase editor to load once: preferred supplier and costs per product.
   */
  async map(user: AuthenticatedUser, supplierId?: string) {
    return this.prisma.productSupplier.findMany({
      where: { tenantId: user.tenantId, ...(supplierId && { supplierId }) },
      select: { productId: true, supplierId: true, isPreferred: true, costPrice: true, lastPurchasePrice: true, unitId: true, minOrderQty: true, supplierSku: true },
    });
  }

  /** One change for many products: category, brand, a supplier, or a price percent. */
  async bulkUpdate(user: AuthenticatedUser, dto: BulkProductUpdateDto) {
    const tenantId = user.tenantId;
    const ids = [...new Set(dto.productIds)];
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, price: true, wholesalePrice: true, creditPrice: true },
    });
    if (!products.length) throw new NotFoundException('Products nahi mile');
    const pids = products.map((p) => p.id);
    const out: Record<string, number> = {};

    if (dto.categoryId !== undefined) {
      const categoryId = dto.categoryId === 'none' || !dto.categoryId ? null : dto.categoryId;
      if (categoryId && !(await this.prisma.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } }))) {
        throw new NotFoundException('Category nahi mili');
      }
      out.category = (await this.prisma.product.updateMany({ where: { tenantId, id: { in: pids } }, data: { categoryId } })).count;
    }
    if (dto.brandId !== undefined) {
      const brandId = dto.brandId === 'none' || !dto.brandId ? null : dto.brandId;
      if (brandId && !(await this.prisma.brand.findFirst({ where: { id: brandId, tenantId }, select: { id: true } }))) {
        throw new NotFoundException('Brand nahi mila');
      }
      out.brand = (await this.prisma.product.updateMany({ where: { tenantId, id: { in: pids } }, data: { brandId } })).count;
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true } });
      if (!supplier) throw new NotFoundException('Supplier nahi mila');
      const supplierId = supplier.id;
      await this.prisma.$transaction(async (tx) => {
        const had = await tx.productSupplier.findMany({ where: { tenantId, productId: { in: pids } }, select: { productId: true, supplierId: true, isPreferred: true } });
        const linked = new Set(had.filter((h) => h.supplierId === supplierId).map((h) => h.productId));
        const withPreferred = new Set(had.filter((h) => h.isPreferred).map((h) => h.productId));
        const fresh = pids.filter((id) => !linked.has(id));
        if (fresh.length) {
          await tx.productSupplier.createMany({
            data: fresh.map((productId) => ({ tenantId, productId, supplierId, isPreferred: !!dto.preferred || !withPreferred.has(productId) })),
            skipDuplicates: true,
          });
        }
        if (dto.preferred) {
          await tx.productSupplier.updateMany({ where: { tenantId, productId: { in: pids }, supplierId: { not: supplierId } }, data: { isPreferred: false } });
          await tx.productSupplier.updateMany({ where: { tenantId, productId: { in: pids }, supplierId }, data: { isPreferred: true } });
        }
        out.supplier = fresh.length;
      });
    }
    if (dto.pricePercent !== undefined && dto.pricePercent !== 0) {
      const field = dto.priceField ?? 'price';
      const step = dto.roundTo ?? 1;
      const pct = dto.pricePercent;
      let changed = 0;
      await this.prisma.$transaction(async (tx) => {
        for (const p of products) {
          const old = Number(p[field]) || 0;
          if (!(old > 0)) continue;
          await tx.product.update({ where: { id: p.id }, data: { [field]: bumpPrice(old, pct, step) } });
          if (dto.withPacks) {
            const packs = await tx.productUnit.findMany({ where: { productId: p.id, isBase: false }, select: { id: true, price: true, wholesalePrice: true, creditPrice: true } });
            for (const u of packs) {
              const v = Number(u[field]) || 0;
              if (v > 0) await tx.productUnit.update({ where: { id: u.id }, data: { [field]: bumpPrice(v, pct, step) } });
            }
          }
          await syncBaseUnits(tx, p.id);
          changed++;
        }
      }, { timeout: 120_000 });
      out.price = changed;
    }
    if (!Object.keys(out).length) throw new BadRequestException('Kuch badalne ko nahi chuna');
    const total = Object.values(out).reduce((a, b) => Math.max(a, b), 0);
    return { ...out, ...apiMessage('{{count}} products badal gaye', { count: total }) };
  }
}
