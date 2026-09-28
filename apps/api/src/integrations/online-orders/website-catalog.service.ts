import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { applyStockDelta } from '../../common/shop-scope';

export interface CatalogExportOptions {
  page?: number;
  limit?: number;
  search?: string;
  updatedSince?: Date;
  skus?: string[];
}

export interface ImportOptions {
  shopId: string | null;
  /** Pehle se maujood product ki qeemat website wali kar do */
  updatePrice?: boolean;
  /** Pehle se maujood product ka stock website wala kar do */
  updateStock?: boolean;
}

export interface ImportResult {
  success: true;
  imported: number;
  updated: number;
  failed: number;
  total: number;
  errors: { name: string; error: string }[];
}

const MAX_IMPORT = 2000;

const toNum = (v: any): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const toStr = (v: any): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s || undefined;
};

/**
 * POS ⇄ Website products.
 *
 * Export: website ko Nafaa ke products (asli branch stock ke saath) dena —
 * API se bhi, aur WooCommerce/Shopify CSV ke liye bhi.
 *
 * Import: website ke products Nafaa me lana. Stock hamesha `ShopStock` me
 * jata hai (applyStockDelta), warna product POS par "shop me available
 * nahi" dikhata hai.
 */
@Injectable()
export class WebsiteCatalogService {
  private readonly logger = new Logger(WebsiteCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // EXPORT  (Nafaa → Website)
  // ═══════════════════════════════════════════════════════════

  async exportProducts(tenantId: string, shopId: string | null, opts: CatalogExportOptions = {}) {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
    const page = Math.max(opts.page ?? 1, 1);

    const where: Prisma.ProductWhereInput = { tenantId, isActive: true };
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { sku: { equals: opts.search } },
        { barcode: { equals: opts.search } },
      ];
    }
    if (opts.updatedSince && !Number.isNaN(opts.updatedSince.getTime())) {
      where.updatedAt = { gte: opts.updatedSince };
    }
    if (opts.skus?.length) {
      where.OR = [
        { sku: { in: opts.skus } },
        { barcode: { in: opts.skus } },
        { variants: { some: { sku: { in: opts.skus } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 6, select: { url: true } },
          category: { select: { name: true } },
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, name: true, sku: true, barcode: true, price: true, stock: true, size: true, color: true, imageUrl: true },
          },
          ...(shopId && {
            shopStocks: {
              where: { shopId },
              select: { variantId: true, stock: true, shopPrice: true },
            },
          }),
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const products = items.map((p: any) => {
      const rows: any[] = p.shopStocks ?? [];
      const baseRow = rows.find((r) => r.variantId === null);
      const variants = (p.variants ?? []).map((v: any) => {
        const row = rows.find((r) => r.variantId === v.id);
        const stock = shopId ? Number(row?.stock ?? 0) : Number(v.stock ?? 0);
        return {
          id: v.id,
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          size: v.size,
          color: v.color,
          image: v.imageUrl,
          price: Number(row?.shopPrice ?? v.price),
          stock: Math.max(stock, 0),
          inStock: stock > 0,
        };
      });

      const baseStock = shopId ? Number(baseRow?.stock ?? 0) : Number(p.stock ?? 0);
      const stock = variants.length
        ? variants.reduce((s: number, v: any) => s + v.stock, 0)
        : Math.max(baseStock, 0);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        description: p.description,
        shortDescription: p.shortDescription,
        price: Number(baseRow?.shopPrice ?? p.price),
        unit: p.unit,
        category: p.category?.name ?? null,
        images: p.images.map((i: any) => i.url),
        stock,
        inStock: stock > 0,
        variants,
        updatedAt: p.updatedAt,
      };
    });

    return { products, total, page, limit, hasMore: page * limit < total };
  }

  /**
   * SKU → bechne layak stock. Jo orders aa chuke magar abhi accept nahi hue
   * unka maal "reserved" hai — warna sync website ka stock wapas bara kar
   * deta aur wahi cheez dobara bik jati.
   */
  async stockBySku(tenantId: string, shopId: string | null, integrationId: string, skus: string[]) {
    const stock: Record<string, number> = {};
    for (let i = 0; i < skus.length; i += 500) {
      const res = await this.exportProducts(tenantId, shopId, { skus: skus.slice(i, i + 500), limit: 500 });
      for (const p of res.products) {
        if (p.sku) stock[p.sku] = p.stock;
        if (p.barcode) stock[p.barcode] = p.stock;
        for (const v of p.variants) if (v.sku) stock[v.sku] = v.stock;
      }
    }
    const pending = await this.prisma.channelOrder.findMany({
      where: { integrationId, orderStatus: { in: ['PENDING', 'ACCEPTING'] } },
      select: { items: true },
      take: 500,
    });
    for (const o of pending) {
      for (const it of (o.items as any[]) ?? []) {
        if (it?.sku && stock[it.sku] !== undefined) {
          stock[it.sku] = Math.max(0, stock[it.sku] - Number(it.quantity ?? 0));
        }
      }
    }
    return stock;
  }

  /** Website ki CSV ke liye — sab products ek saath (page by page jama karke) */
  async exportAll(tenantId: string, shopId: string | null) {
    const all: Awaited<ReturnType<WebsiteCatalogService['exportProducts']>>['products'] = [];
    for (let page = 1; page <= 40; page++) {
      const res = await this.exportProducts(tenantId, shopId, { page, limit: 500 });
      all.push(...res.products);
      if (!res.hasMore) break;
    }
    return all;
  }

  // ═══════════════════════════════════════════════════════════
  // IMPORT  (Website → Nafaa)
  // ═══════════════════════════════════════════════════════════

  async importProducts(integration: { id: string; tenantId: string; displayName: string }, raw: any[], opts: ImportOptions): Promise<ImportResult> {
    const list = (Array.isArray(raw) ? raw : []).slice(0, MAX_IMPORT);
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: { name: string; error: string }[] = [];
    const categoryCache = new Map<string, string>();

    for (const p of list) {
      const name = toStr(p?.name ?? p?.productName ?? p?.title);
      try {
        if (!name) throw new Error('naam khali hai');

        const sku = toStr(p.sku);
        const barcode = toStr(p.barcode ?? p.gtin ?? p.ean);
        const externalId = toStr(p.id ?? p.productId ?? p.externalId) ?? sku;
        const price = toNum(p.price ?? p.regularPrice ?? p.regular_price ?? p.salePrice);
        const costPrice = toNum(p.costPrice ?? p.cost);
        const stock = toNum(p.stock ?? p.quantity ?? p.inventory ?? p.stock_quantity);
        const description = toStr(p.description ?? p.desc);
        const categoryName = toStr(p.category ?? p.categoryName ?? (Array.isArray(p.categories) ? p.categories[0] : undefined));
        const images: string[] = (Array.isArray(p.images) ? p.images : p.image ? [p.image] : [])
          .map((i: any) => toStr(typeof i === 'string' ? i : i?.src ?? i?.url))
          .filter((u: any): u is string => !!u && /^https?:\/\//i.test(u))
          .slice(0, 5);

        const isNew = await this.prisma.$transaction(async (tx) => {
          // 1. Pehle ka link, 2. SKU, 3. Barcode
          let product: { id: string } | null = null;
          if (externalId) {
            const mapping = await tx.productChannelMapping.findFirst({
              where: { integrationId: integration.id, externalProductId: externalId },
              select: { productId: true },
            });
            if (mapping) {
              product = await tx.product.findFirst({
                where: { id: mapping.productId, tenantId: integration.tenantId },
                select: { id: true },
              });
            }
          }
          if (!product && sku) {
            product = await tx.product.findFirst({ where: { tenantId: integration.tenantId, sku }, select: { id: true } });
          }
          if (!product && barcode) {
            product = await tx.product.findFirst({ where: { tenantId: integration.tenantId, barcode }, select: { id: true } });
          }

          const created = !product;
          if (!product) {
            const categoryId = categoryName
              ? await this.findOrCreateCategory(tx, integration.tenantId, categoryName, categoryCache)
              : undefined;
            product = await tx.product.create({
              data: {
                tenantId: integration.tenantId,
                name: name.slice(0, 250),
                sku: sku ?? null,
                barcode: barcode ?? null,
                price: price ?? 0,
                // Cost website nahi batati — 0 rakhte hain, andaza nahi lagate,
                // taake profit report jhooti na ho. Malik baad me daal sakta hai.
                costPrice: costPrice ?? 0,
                description: description ?? null,
                categoryId,
                isActive: true,
              },
              select: { id: true },
            });
            if (images.length) {
              await tx.productImage.createMany({
                data: images.map((url, i) => ({ productId: product!.id, url, sortOrder: i, isPrimary: i === 0 })),
              });
            }
          } else if (opts.updatePrice && price !== undefined) {
            await tx.product.update({ where: { id: product.id }, data: { price } });
          }

          // Stock sirf asli branch me — naye product ka opening stock, ya
          // malik ne "stock bhi update karo" chuna ho.
          if (opts.shopId && stock !== undefined && (created || opts.updateStock)) {
            const row = await tx.shopStock.findFirst({
              where: { shopId: opts.shopId, productId: product.id, variantId: null },
              select: { stock: true },
            });
            const delta = stock - Number(row?.stock ?? 0);
            if (delta !== 0 || !row) {
              await applyStockDelta({
                tx,
                tenantId: integration.tenantId,
                shopId: opts.shopId,
                productId: product.id,
                delta,
                movementType: created ? 'OPENING_BALANCE' : delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                reference: 'WEBSITE-IMPORT',
                note: `${integration.displayName} se import`,
              });
            }
          }

          if (externalId) {
            await tx.productChannelMapping.upsert({
              where: { integrationId_productId: { integrationId: integration.id, productId: product.id } },
              create: {
                integrationId: integration.id,
                productId: product.id,
                externalProductId: externalId,
                externalSku: sku,
                syncStatus: 'SUCCESS',
                lastSyncedAt: new Date(),
              },
              update: { externalProductId: externalId, externalSku: sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
            });
          }
          return created;
        });

        if (isNew) imported++;
        else updated++;
      } catch (e: any) {
        failed++;
        if (errors.length < 25) errors.push({ name: name ?? '(bina naam)', error: e?.message ?? 'Error' });
      }
    }

    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { totalProductsSynced: { increment: imported + updated }, lastSyncAt: new Date(), lastSyncStatus: 'SUCCESS' },
    }).catch(() => null);

    this.logger.log(`📥 ${integration.displayName}: ${imported} naye, ${updated} update, ${failed} fail`);
    return { success: true, imported, updated, failed, total: list.length, errors };
  }

  private async findOrCreateCategory(tx: any, tenantId: string, name: string, cache: Map<string, string>) {
    const key = name.toLowerCase();
    const hit = cache.get(key);
    if (hit) return hit;
    const existing = await tx.category.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    const id = existing?.id ?? (await tx.category.create({ data: { tenantId, name: name.slice(0, 100) }, select: { id: true } })).id;
    cache.set(key, id);
    return id;
  }
}
