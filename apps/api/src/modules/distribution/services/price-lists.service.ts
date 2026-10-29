/**
 * Price lists (customer classes): fixed prices per product and pack, or a
 * base price plus a percent. Also answers "what does this customer pay" for
 * the POS and the booker app.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ImportPriceListDto, PriceListItemDto, SavePriceListDto } from '../dto/setup.dto';
import { listPrice, type PricingList } from '../helpers/pricing';
import { loadCatalog, loadList, pricingFor } from '../helpers/pricing-loader';
import { applySchemes, schemeCovers, schemeIsLive } from '../helpers/scheme-resolver';
import { r2 } from '../distribution.support';

const keyOf = (productId: string, variantId?: string | null, unitId?: string | null) => `${productId}|${variantId ?? ''}|${unitId ?? ''}`;

@Injectable()
export class PriceListsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const [lists, counts, customers] = await Promise.all([
      this.prisma.priceList.findMany({ where: { tenantId }, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] }),
      this.prisma.priceListItem.groupBy({ by: ['priceListId'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.customer.groupBy({ by: ['priceListId'], where: { tenantId, priceListId: { not: null } }, _count: { _all: true } }),
    ]);
    const items = new Map(counts.map((c) => [c.priceListId, c._count._all]));
    const used = new Map(customers.map((c) => [c.priceListId, c._count._all]));
    return lists.map((l) => ({ ...l, itemCount: items.get(l.id) ?? 0, customerCount: used.get(l.id) ?? 0 }));
  }

  async get(user: AuthenticatedUser, id: string) {
    const list = await this.prisma.priceList.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!list) throw new NotFoundException('Price list nahi mili');
    return list;
  }

  async create(user: AuthenticatedUser, dto: SavePriceListDto) {
    const tenantId = user.tenantId;
    await this.assertNameFree(tenantId, dto.name);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.priceList.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
      return tx.priceList.create({
        data: {
          tenantId, name: dto.name.trim(), code: dto.code?.trim() || null, basedOn: dto.basedOn ?? 'WHOLESALE',
          adjustPct: dto.adjustPct ?? 0, isDefault: !!dto.isDefault, isActive: dto.isActive ?? true, note: dto.note?.trim() || null,
        },
      });
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<SavePriceListDto>) {
    const tenantId = user.tenantId;
    const list = await this.get(user, id);
    if (dto.name && dto.name.trim() !== list.name) await this.assertNameFree(tenantId, dto.name, id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.priceList.updateMany({ where: { tenantId, isDefault: true, NOT: { id } }, data: { isDefault: false } });
      return tx.priceList.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.code !== undefined && { code: dto.code?.trim() || null }),
          ...(dto.basedOn !== undefined && { basedOn: dto.basedOn }),
          ...(dto.adjustPct !== undefined && { adjustPct: dto.adjustPct }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
        },
      });
    });
  }

  /** Deletes an unused list; a list customers still use is switched off instead. */
  async remove(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    await this.get(user, id);
    const [customers, settings] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, priceListId: id } }),
      this.prisma.distributionSettings.count({ where: { tenantId, defaultPriceListId: id } }),
    ]);
    if (customers || settings) {
      await this.prisma.priceList.update({ where: { id }, data: { isActive: false, isDefault: false } });
      return { deleted: false, deactivated: true, customers };
    }
    await this.prisma.priceList.delete({ where: { id } });
    return { deleted: true, deactivated: false, customers: 0 };
  }

  /** Rows of a list with product, variant and pack names. */
  async items(user: AuthenticatedUser, id: string, q: { search?: string; page?: number; limit?: number }) {
    const tenantId = user.tenantId;
    await this.get(user, id);
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(q.limit) || 100));
    const search = q.search?.trim();
    const productFilter = search
      ? await this.prisma.product.findMany({
          where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }, { barcode: search }] },
          select: { id: true }, take: 2000,
        })
      : null;
    const where: Prisma.PriceListItemWhereInput = { priceListId: id, ...(productFilter && { productId: { in: productFilter.map((p) => p.id) } }) };
    const [total, rows] = await Promise.all([
      this.prisma.priceListItem.count({ where }),
      this.prisma.priceListItem.findMany({ where, orderBy: [{ productId: 'asc' }, { minQty: 'asc' }], skip: (page - 1) * limit, take: limit }),
    ]);
    const catalog = await loadCatalog(this.prisma, tenantId, rows.map((r) => r.productId));
    return {
      total, page, limit,
      items: rows.map((r) => ({
        ...r,
        productName: catalog.products.get(r.productId)?.name ?? null,
        variantName: r.variantId ? catalog.variants.get(r.variantId)?.name ?? null : null,
        unitName: r.unitId ? catalog.units.get(r.unitId)?.unitName ?? null : catalog.products.get(r.productId)?.unit ?? 'pcs',
        conversionRate: r.unitId ? catalog.units.get(r.unitId)?.conversionRate ?? 1 : 1,
      })),
    };
  }

  /**
   * Grid for editing a list: each product (paged) with its base unit and
   * packs, their retail and wholesale prices, the list's own row and the
   * price the list's rule would give. Cost only for staff with cost.view.
   */
  async grid(user: AuthenticatedUser, id: string, q: { search?: string; categoryId?: string; brandId?: string; page?: number; limit?: number }) {
    const tenantId = user.tenantId;
    const list = await this.get(user, id);
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
    const search = q.search?.trim();
    const where: Prisma.ProductWhereInput = {
      tenantId, isActive: true, isRawMaterial: false,
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...(q.brandId && { brandId: q.brandId }),
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }, { barcode: search }] }),
    };
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit, select: { id: true, name: true, sku: true } }),
    ]);
    const ids = products.map((p) => p.id);
    const [catalog, pl] = await Promise.all([loadCatalog(this.prisma, tenantId, ids), loadList(this.prisma, tenantId, id, ids)]);
    const ruleOnly: PricingList = { id: list.id, basedOn: list.basedOn, adjustPct: list.adjustPct, items: [] };
    const showCost = hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);
    const rowsByKey = new Map((pl?.items ?? []).filter((i) => !(Number(i.minQty) > 0)).map((i) => [keyOf(i.productId, i.variantId, i.unitId), i]));
    return {
      total, page, limit, list,
      products: products.map((p) => {
        const product = catalog.products.get(p.id)!;
        const packs = [null, ...(catalog.unitsByProduct.get(p.id) ?? []).filter((u) => !u.variantId)];
        return {
          productId: p.id, name: p.name, sku: p.sku, baseUnit: product.unit || 'pcs',
          rows: packs.map((u) => {
            const row = rowsByKey.get(keyOf(p.id, null, u?.id ?? null));
            const rate = u ? Number(u.conversionRate) || 1 : 1;
            return {
              unitId: u?.id ?? null, unitName: u?.unitName ?? (product.unit || 'pcs'), conversionRate: rate,
              retail: r2(u && u.price > 0 ? u.price : product.price * rate),
              wholesale: r2(u ? (Number(u.wholesalePrice) || 0) || (Number(product.wholesalePrice) || 0) * rate : Number(product.wholesalePrice) || 0) || null,
              ...(showCost && { cost: r2(u && Number(u.costPrice) > 0 ? Number(u.costPrice) : (Number(product.costPrice) || 0) * rate) }),
              listPrice: row ? r2(row.price) : null,
              rulePrice: listPrice({ product, unit: u, list: ruleOnly }).price,
            };
          }),
        };
      }),
    };
  }

  /** Adds or changes rows; a price of 0 or less removes the row. */
  async upsertItems(user: AuthenticatedUser, id: string, items: PriceListItemDto[]) {
    const tenantId = user.tenantId;
    await this.get(user, id);
    const catalog = await loadCatalog(this.prisma, tenantId, items.map((i) => i.productId));
    for (const it of items) {
      const p = catalog.products.get(it.productId);
      if (!p) throw new BadRequestException(`Item nahi mila: ${it.productId}`);
      if (it.variantId && catalog.variants.get(it.variantId)?.productId !== p.id) throw new BadRequestException(`${p.name}: variant is item ka nahi`);
      if (it.unitId && catalog.units.get(it.unitId)?.productId !== p.id) throw new BadRequestException(`${p.name}: pack is item ka nahi`);
    }
    // Last row wins when the same product, variant, pack and minQty come twice.
    const byKey = new Map(items.map((i) => [`${keyOf(i.productId, i.variantId, i.unitId)}|${Number(i.minQty) || 0}`, i]));
    const existing = await this.prisma.priceListItem.findMany({ where: { priceListId: id, productId: { in: [...new Set(items.map((i) => i.productId))] } } });
    const found = new Map(existing.map((e) => [`${keyOf(e.productId, e.variantId, e.unitId)}|${Number(e.minQty) || 0}`, e]));
    let saved = 0;
    let removed = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const [k, it] of byKey) {
        const old = found.get(k);
        if (!(it.price > 0)) {
          if (old) { await tx.priceListItem.delete({ where: { id: old.id } }); removed++; }
          continue;
        }
        if (old) await tx.priceListItem.update({ where: { id: old.id }, data: { price: r2(it.price) } });
        else {
          await tx.priceListItem.create({
            data: { tenantId, priceListId: id, productId: it.productId, variantId: it.variantId || null, unitId: it.unitId || null, price: r2(it.price), minQty: Number(it.minQty) > 0 ? it.minQty : null },
          });
        }
        saved++;
      }
      // Phones refetch a list whose updatedAt moved.
      await tx.priceList.update({ where: { id }, data: { updatedAt: new Date() } });
    }, { timeout: 60_000 });
    return { saved, removed };
  }

  async deleteItems(user: AuthenticatedUser, id: string, ids: string[]) {
    await this.get(user, id);
    const res = await this.prisma.priceListItem.deleteMany({ where: { priceListId: id, tenantId: user.tenantId, id: { in: ids } } });
    await this.prisma.priceList.update({ where: { id }, data: { updatedAt: new Date() } });
    return { removed: res.count };
  }

  /**
   * Rows from a sheet: the product is found by SKU, barcode (product or pack)
   * or exact name, the pack by name. Rows that match nothing come back with
   * the reason and are not saved.
   */
  async importRows(user: AuthenticatedUser, id: string, dto: ImportPriceListDto) {
    const tenantId = user.tenantId;
    await this.get(user, id);
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, sku: true, barcode: true, unit: true },
    });
    const units = await this.prisma.productUnit.findMany({
      where: { tenantId, isActive: true, variantId: null },
      select: { id: true, productId: true, unitName: true, barcode: true, sku: true },
    });
    const byCode = new Map<string, { productId: string; unitId: string | null }>();
    const byName = new Map<string, string>();
    for (const p of products) {
      if (p.sku) byCode.set(p.sku.trim().toLowerCase(), { productId: p.id, unitId: null });
      if (p.barcode) byCode.set(p.barcode.trim().toLowerCase(), { productId: p.id, unitId: null });
      byName.set(p.name.trim().toLowerCase(), p.id);
    }
    for (const u of units) {
      for (const c of [u.barcode, u.sku]) if (c) byCode.set(c.trim().toLowerCase(), { productId: u.productId, unitId: u.id });
    }
    const unitsByProduct = new Map<string, typeof units>();
    for (const u of units) unitsByProduct.set(u.productId, [...(unitsByProduct.get(u.productId) ?? []), u]);
    const baseUnit = new Map(products.map((p) => [p.id, (p.unit || 'pcs').toLowerCase()]));

    const good: PriceListItemDto[] = [];
    const unmatched: Array<{ row: number; reason: string }> = [];
    dto.rows.forEach((row, i) => {
      const hit = (row.code && byCode.get(row.code.trim().toLowerCase())) || null;
      const productId = hit?.productId ?? (row.name ? byName.get(row.name.trim().toLowerCase()) : undefined) ?? (row.code ? byName.get(row.code.trim().toLowerCase()) : undefined);
      if (!productId) { unmatched.push({ row: i + 1, reason: 'Item nahi mila (SKU, barcode ya naam)' }); return; }
      let unitId = hit?.unitId ?? null;
      const wanted = row.unitName?.trim().toLowerCase();
      if (wanted && wanted !== baseUnit.get(productId)) {
        const u = (unitsByProduct.get(productId) ?? []).find((x) => x.unitName.trim().toLowerCase() === wanted);
        if (!u) { unmatched.push({ row: i + 1, reason: `Pack "${row.unitName}" is item par nahi` }); return; }
        unitId = u.id;
      }
      good.push({ productId, unitId, price: row.price, minQty: row.minQty ?? null });
    });
    const res = good.length ? await this.upsertItems(user, id, good) : { saved: 0, removed: 0 };
    return { ...res, matched: good.length, unmatched };
  }

  /**
   * What a customer (or a list) pays for the given products: every pack,
   * with the list or tier price, plus the schemes that can apply. Used by the
   * POS when a customer is picked, and by the order screens.
   */
  async resolve(user: AuthenticatedUser, q: { customerId?: string; priceListId?: string; productIds?: string }) {
    const tenantId = user.tenantId;
    const productIds = (q.productIds ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);
    if (!productIds.length) throw new BadRequestException('productIds chahiye');
    if (q.customerId) {
      const ok = await this.prisma.customer.findFirst({ where: { id: q.customerId, tenantId }, select: { id: true } });
      if (!ok) throw new NotFoundException('Customer nahi mila');
    }
    const { list, tier, schemes, catalog } = await pricingFor(this.prisma, tenantId, { customerId: q.customerId, priceListId: q.priceListId, productIds });
    const now = new Date();
    const items = [];
    for (const productId of productIds) {
      const product = catalog.products.get(productId);
      if (!product) continue;
      const variants = [...catalog.variants.values()].filter((v) => v.productId === productId);
      for (const variant of [null, ...variants]) {
        for (const unit of [null, ...(catalog.unitsByProduct.get(productId) ?? []).filter((u) => !u.variantId || u.variantId === variant?.id)]) {
          const rate = unit ? Number(unit.conversionRate) || 1 : 1;
          const res = listPrice({ product, variant, unit, list, tier });
          items.push({
            productId, variantId: variant?.id ?? null, unitId: unit?.id ?? null,
            unitName: unit?.unitName ?? product.unit ?? 'pcs', conversionRate: rate,
            price: res.price, perBase: Math.round((res.price / rate) * 10_000) / 10_000, source: res.source,
          });
        }
      }
    }
    const applicable = schemes.filter((s) => schemeIsLive(s, now) && productIds.some((pid) => {
      const p = catalog.products.get(pid);
      return p && schemeCovers(s, { productId: pid, brandId: p.brandId, categoryId: p.categoryId }, list?.id ?? null);
    }));
    return {
      priceListId: list?.id ?? null, priceListName: list?.name ?? null, tier: list ? null : tier,
      items, schemes: applicable,
    };
  }

  /** Scheme check for a cart without saving anything (POS and order screens). */
  async previewSchemes(user: AuthenticatedUser, dto: { customerId?: string; lines: Array<{ productId: string; variantId?: string | null; baseQty: number; unitPrice: number }> }) {
    const tenantId = user.tenantId;
    const { list, schemes, catalog } = await pricingFor(this.prisma, tenantId, { customerId: dto.customerId, productIds: dto.lines.map((l) => l.productId) });
    const lines = dto.lines.map((l) => {
      const p = catalog.products.get(l.productId);
      const packs: Record<string, number> = { [p?.unit || 'pcs']: 1 };
      for (const u of catalog.unitsByProduct.get(l.productId) ?? []) if (!u.variantId || u.variantId === (l.variantId ?? null)) packs[u.unitName] = Number(u.conversionRate) || 1;
      return { productId: l.productId, brandId: p?.brandId ?? null, categoryId: p?.categoryId ?? null, baseQty: l.baseQty, unitPrice: l.unitPrice, packs };
    });
    return { priceListId: list?.id ?? null, lines: applySchemes(lines, schemes, { priceListId: list?.id ?? null }) };
  }

  private async assertNameFree(tenantId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.priceList.findFirst({
      where: { tenantId, name: { equals: name.trim(), mode: 'insensitive' }, ...(exceptId && { NOT: { id: exceptId } }) },
      select: { id: true },
    });
    if (clash) throw new BadRequestException('Is naam ki price list pehle se hai');
  }
}
