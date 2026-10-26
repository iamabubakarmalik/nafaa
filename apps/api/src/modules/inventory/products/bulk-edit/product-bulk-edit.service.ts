/**
 * Bulk product editor (spreadsheet view).
 *
 * `rows` lists products and their variants with the chosen branch's stock,
 * filtered by category, low stock, search or the products of one import.
 * `save` applies changed fields: product fields through ProductsService.update
 * (same checks as the product page), variant price / cost / barcode / alert
 * directly on the variant. Stock is never written here; the editor posts it
 * through the stock adjustment API ("Bulk edit" reason).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS, hasPermission } from '../../../../common/constants/permissions.constants';
import { ShopScope, isServiceProduct, resolveWriteShopId } from '../../../../common/shop-scope';
import { ProductsService } from '../products.service';
import { UpdateProductDto } from '../dto/update-product.dto';
import { BulkEditChangeDto, BulkEditRowsQuery, BulkEditSaveDto } from './product-bulk-edit.dto';

const MAX_ROWS = 10_000;

export interface BulkEditRow {
  productId: string;
  variantId: string | null;
  name: string;
  variant: string;
  category: string;
  brand: string;
  price: number;
  costPrice: number;
  /** Empty (null) means the retail price applies. */
  wholesalePrice: number | null;
  creditPrice: number | null;
  unit: string;
  sku: string;
  barcode: string;
  lowStockAlert: number;
  isActive: boolean;
  stock: number;
  /** Why stock cannot be edited on this row. */
  stockLock: 'variants' | 'imei' | 'service' | null;
}

/** Short reason for a failed save; raw database errors are not shown. */
function saveError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  if (/Unique constraint/i.test(msg)) return 'Ye code pehle se kisi aur cheez par hai';
  if (/SKU already exists/i.test(msg)) return 'Ye SKU pehle se kisi aur product par hai';
  if (/Barcode already exists/i.test(msg)) return 'Ye barcode pehle se kisi aur product par hai';
  if (msg && msg.length < 200 && !/prisma|invocation/i.test(msg)) return msg;
  return 'Save nahi hua';
}

@Injectable()
export class ProductBulkEditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
  ) {}

  async rows(user: AuthenticatedUser, scope: ShopScope, q: BulkEditRowsQuery) {
    const tenantId = user.tenantId;
    const shopId = await resolveWriteShopId(this.prisma, tenantId, scope, q.shopId);
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true, name: true } });

    let ids: string[] | undefined;
    let job: { id: string; fileName: string } | null = null;
    if (q.jobId) {
      const found = await this.prisma.bulkImportJob.findFirst({ where: { id: q.jobId, tenantId }, select: { id: true, fileName: true, metadata: true } });
      if (!found) throw new NotFoundException('Import nahi mila');
      const meta = (found.metadata && typeof found.metadata === 'object' && !Array.isArray(found.metadata) ? found.metadata : {}) as Record<string, unknown>;
      ids = Array.isArray(meta.productIds) ? (meta.productIds as string[]) : [];
      job = { id: found.id, fileName: found.fileName };
    }

    const search = q.search?.trim();
    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(ids && { id: { in: ids } }),
      ...(q.categoryId && { categoryId: q.categoryId === 'none' ? null : q.categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search } },
        ],
      }),
    };
    const [products, categories, brands] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        take: MAX_ROWS + 1,
        select: {
          id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, wholesalePrice: true, creditPrice: true, lowStockAlert: true,
          isActive: true, hasVariants: true, productType: true,
          category: { select: { name: true } },
          brand: { select: { name: true } },
          variants: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true, sku: true, barcode: true, price: true, costPrice: true, wholesalePrice: true, creditPrice: true, lowStockAlert: true },
          },
        },
      }),
      this.prisma.category.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.brand.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, select: { name: true } }),
    ]);
    const truncated = products.length > MAX_ROWS;
    const list = products.slice(0, MAX_ROWS);
    const productIds = list.map((p) => p.id);

    const [stock, phones] = productIds.length
      ? await Promise.all([
        this.prisma.shopStock.findMany({ where: { shopId, productId: { in: productIds } }, select: { productId: true, variantId: true, stock: true } }),
        this.prisma.productImei.findMany({ where: { tenantId, productId: { in: productIds } }, distinct: ['productId'], select: { productId: true } }),
      ])
      : [[], []];
    const stockAt = new Map<string, number>();
    for (const s of stock) {
      const k = `${s.productId}:${s.variantId ?? ''}`;
      stockAt.set(k, (stockAt.get(k) ?? 0) + (Number(s.stock) || 0));
    }
    const imei = new Set(phones.map((p) => p.productId));

    const rows: BulkEditRow[] = [];
    for (const p of list) {
      const service = isServiceProduct(p);
      const variantStock = p.variants.reduce((s, v) => s + (stockAt.get(`${p.id}:${v.id}`) ?? 0), 0);
      const base: BulkEditRow = {
        productId: p.id, variantId: null, name: p.name, variant: '',
        category: p.category?.name ?? '', brand: p.brand?.name ?? '',
        price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0, unit: p.unit ?? 'pcs',
        wholesalePrice: p.wholesalePrice ?? null, creditPrice: p.creditPrice ?? null,
        sku: p.sku ?? '', barcode: p.barcode ?? '', lowStockAlert: Number(p.lowStockAlert) || 0, isActive: p.isActive,
        stock: p.hasVariants && p.variants.length ? variantStock : stockAt.get(`${p.id}:`) ?? 0,
        stockLock: p.hasVariants && p.variants.length ? 'variants' : imei.has(p.id) ? 'imei' : service ? 'service' : null,
      };
      const children: BulkEditRow[] = (p.hasVariants ? p.variants : []).map((v) => ({
        ...base,
        variantId: v.id, variant: v.name,
        price: Number(v.price) || 0, costPrice: Number(v.costPrice) || 0,
        wholesalePrice: v.wholesalePrice ?? null, creditPrice: v.creditPrice ?? null,
        sku: v.sku ?? '', barcode: v.barcode ?? '',
        lowStockAlert: Number(v.lowStockAlert ?? p.lowStockAlert) || 0,
        stock: stockAt.get(`${p.id}:${v.id}`) ?? 0,
        stockLock: imei.has(p.id) ? 'imei' : null,
      }));
      if (q.lowStock && !service) {
        const low = (r: BulkEditRow) => r.stock <= r.lowStockAlert;
        const lowKids = children.filter(low);
        if (children.length ? !lowKids.length : !low(base)) continue;
      } else if (q.lowStock) continue;
      rows.push(base, ...children);
    }

    return {
      shop,
      job,
      truncated,
      rows,
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      brands: brands.map((b) => b.name),
    };
  }

  async save(user: AuthenticatedUser, scope: ShopScope, dto: BulkEditSaveDto) {
    const canCost = hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);
    const categories = new Map<string, string>();
    const brands = new Map<string, string>();
    const results: Array<{ productId: string; variantId: string | null; ok: boolean; error?: string }> = [];
    for (const c of dto.changes) {
      try {
        if (c.variantId) await this.saveVariant(user, c, canCost);
        else await this.saveProduct(user, scope, c, canCost, categories, brands);
        results.push({ productId: c.productId, variantId: c.variantId ?? null, ok: true });
      } catch (e) {
        results.push({ productId: c.productId, variantId: c.variantId ?? null, ok: false, error: saveError(e) });
      }
    }
    return { saved: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  /** A barcode must not be on another product, variant or pack. */
  private async assertCodeFree(tenantId: string, code: string, own: { productId: string; variantId?: string }) {
    const [product, variant, unit] = await Promise.all([
      this.prisma.product.findFirst({ where: { tenantId, barcode: code, NOT: { id: own.productId } }, select: { name: true } }),
      this.prisma.productVariant.findFirst({
        where: { barcode: code, product: { tenantId }, ...(own.variantId && { NOT: { id: own.variantId } }) },
        select: { name: true, product: { select: { name: true } } },
      }),
      this.prisma.productUnit.findFirst({ where: { tenantId, barcode: code }, select: { unitName: true, product: { select: { name: true } } } }),
    ]);
    if (product) throw new Error(`Barcode ${code} pehle se "${product.name}" par hai`);
    if (variant) throw new Error(`Barcode ${code} pehle se "${variant.product.name} (${variant.name})" par hai`);
    if (unit) throw new Error(`Barcode ${code} pehle se "${unit.product.name}" ki ${unit.unitName} par hai`);
  }

  private async saveVariant(user: AuthenticatedUser, c: BulkEditChangeDto, canCost: boolean) {
    const data: Prisma.ProductVariantUpdateManyMutationInput = {};
    if (c.price !== undefined) data.price = c.price;
    if (c.costPrice !== undefined && canCost) data.costPrice = c.costPrice;
    if (c.wholesalePrice !== undefined) data.wholesalePrice = c.wholesalePrice;
    if (c.creditPrice !== undefined) data.creditPrice = c.creditPrice;
    if (c.lowStockAlert !== undefined) data.lowStockAlert = c.lowStockAlert;
    if (c.barcode !== undefined) {
      const code = c.barcode.trim();
      if (code) await this.assertCodeFree(user.tenantId, code, { productId: c.productId, variantId: c.variantId });
      data.barcode = code || null;
    }
    if (!Object.keys(data).length) return;
    const done = await this.prisma.productVariant.updateMany({
      where: { id: c.variantId, productId: c.productId, product: { tenantId: user.tenantId } },
      data,
    });
    if (!done.count) throw new NotFoundException('Variant nahi mila');
  }

  private async saveProduct(
    user: AuthenticatedUser, scope: ShopScope, c: BulkEditChangeDto, canCost: boolean,
    categories: Map<string, string>, brands: Map<string, string>,
  ) {
    // null clears a category, brand or barcode.
    const dto: Omit<UpdateProductDto, 'categoryId' | 'brandId' | 'barcode'> & { categoryId?: string | null; brandId?: string | null; barcode?: string | null } = {};
    if (c.name !== undefined) {
      if (!c.name.trim()) throw new Error('Naam khaali nahi ho sakta');
      dto.name = c.name.trim();
    }
    if (c.price !== undefined) dto.price = c.price;
    if (c.costPrice !== undefined && canCost) dto.costPrice = c.costPrice;
    if (c.wholesalePrice !== undefined) dto.wholesalePrice = c.wholesalePrice;
    if (c.creditPrice !== undefined) dto.creditPrice = c.creditPrice;
    if (c.unit !== undefined && c.unit.trim()) dto.unit = c.unit.trim().toLowerCase();
    if (c.lowStockAlert !== undefined) dto.lowStockAlert = c.lowStockAlert;
    if (c.isActive !== undefined) dto.isActive = c.isActive;
    if (c.barcode !== undefined) {
      const code = c.barcode.trim();
      if (code) await this.assertCodeFree(user.tenantId, code, { productId: c.productId });
      dto.barcode = code || null;
    }
    if (c.category !== undefined) dto.categoryId = c.category.trim() ? await this.categoryId(user.tenantId, c.category.trim(), categories) : null;
    if (c.brand !== undefined) dto.brandId = c.brand.trim() ? await this.brandId(user.tenantId, c.brand.trim(), brands) : null;
    if (!Object.keys(dto).length) return;
    await this.products.update(user, c.productId, dto as unknown as UpdateProductDto, scope);
  }

  private async categoryId(tenantId: string, name: string, cache: Map<string, string>) {
    const k = name.toLowerCase();
    const known = cache.get(k);
    if (known) return known;
    const found = await this.prisma.category.findFirst({ where: { tenantId, name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
    const id = found?.id ?? (await this.prisma.category.create({ data: { tenantId, name }, select: { id: true } })).id;
    cache.set(k, id);
    return id;
  }

  private async brandId(tenantId: string, name: string, cache: Map<string, string>) {
    const k = name.toLowerCase();
    const known = cache.get(k);
    if (known) return known;
    const found = await this.prisma.brand.findFirst({ where: { tenantId, name: { equals: name, mode: 'insensitive' } }, select: { id: true } });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'brand';
    const id = found?.id ?? (await this.prisma.brand.create({ data: { tenantId, name, slug: `${slug}-${Date.now().toString(36)}` }, select: { id: true } })).id;
    cache.set(k, id);
    return id;
  }
}
