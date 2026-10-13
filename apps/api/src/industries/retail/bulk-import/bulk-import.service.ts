/**
 * Retail bulk import (Excel / CSV / pasted sheet). Each row becomes a product
 * with branch stock rows for every active shop; opening stock goes to the
 * branch in view (or the main shop) through the shared stock helper, so the
 * POS can sell it at once and the stock ledger shows an opening entry.
 * Rows whose code or name already exists are skipped, not duplicated.
 */

import { Injectable } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta, resolveWriteShopId, ShopScope } from '../../../common/shop-scope';
import { BulkImportDto, BulkImportRowDto } from './dto/bulk-import.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const key = (v: string) => v.toLowerCase().trim();

/** Short reason for a failed row; raw database errors are not shown to the shopkeeper. */
function rowError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? '';
  if (/Unique constraint/i.test(msg)) return 'Ye code (SKU/barcode) pehle se kisi aur cheez par hai';
  if (msg && msg.length < 160 && !msg.includes('prisma')) return msg;
  return 'Ye line save nahi hui — naam, rate aur stock check karein';
}

@Injectable()
export class BulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importProducts(user: AuthenticatedUser, scope: ShopScope, dto: BulkImportDto) {
    const stockShopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);

    const job = await this.prisma.bulkImportJob.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        jobType: 'PRODUCTS',
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        totalRows: dto.rows.length,
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    const errors: Array<{ row: number; name: string; error: string }> = [];
    let successCount = 0;
    let skipCount = 0;

    const [categories, brands, shops, existing, packCodes] = await Promise.all([
      this.prisma.category.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
      this.prisma.brand.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true } }),
      this.prisma.shop.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true } }),
      this.prisma.product.findMany({ where: { tenantId: user.tenantId }, select: { name: true, sku: true, barcode: true } }),
      this.prisma.productUnit.findMany({ where: { tenantId: user.tenantId, barcode: { not: null } }, select: { barcode: true } }),
    ]);

    const categoryByName = new Map(categories.map((c) => [key(c.name), c.id]));
    const brandByName = new Map(brands.map((b) => [key(b.name), b.id]));
    const names = new Set(existing.map((p) => key(p.name)));
    const codes = new Set<string>();
    for (const p of existing) {
      if (p.sku) codes.add(key(p.sku));
      if (p.barcode) codes.add(key(p.barcode));
    }
    for (const u of packCodes) if (u.barcode) codes.add(key(u.barcode));

    for (let i = 0; i < dto.rows.length; i++) {
      const row: BulkImportRowDto = dto.rows[i];
      const name = (row.name ?? '').trim();
      const sku = row.sku?.trim() || null;
      const barcode = row.barcode?.trim() || null;
      try {
        if (!name) {
          errors.push({ row: i + 1, name: '', error: 'Naam khaali hai' });
          continue;
        }
        if ((sku && codes.has(key(sku))) || (barcode && codes.has(key(barcode)))) {
          skipCount++;
          errors.push({ row: i + 1, name, error: 'Ye SKU/barcode pehle se hai — chhor diya' });
          continue;
        }
        if (names.has(key(name))) {
          skipCount++;
          errors.push({ row: i + 1, name, error: 'Is naam ki cheez pehle se hai — chhor diya' });
          continue;
        }

        let categoryId: string | null = null;
        if (row.category?.trim()) {
          const k = key(row.category);
          categoryId = categoryByName.get(k) ?? null;
          if (!categoryId) {
            const created = await this.prisma.category.create({
              data: { tenantId: user.tenantId, name: row.category.trim(), color: '#6366f1' },
            });
            categoryId = created.id;
            categoryByName.set(k, created.id);
          }
        }

        let brandId: string | null = null;
        if (row.brand?.trim()) {
          const k = key(row.brand);
          brandId = brandByName.get(k) ?? null;
          if (!brandId) {
            const created = await this.prisma.brand.create({
              data: {
                tenantId: user.tenantId,
                name: row.brand.trim(),
                slug: `${slugify(row.brand) || 'brand'}-${Date.now().toString(36)}`,
              },
            });
            brandId = created.id;
            brandByName.set(k, created.id);
          }
        }

        const costPrice = Math.max(num(row.costPrice), 0);
        const opening = Math.max(num(row.stock), 0);

        await this.prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              tenantId: user.tenantId,
              name,
              slug: `${slugify(name) || 'item'}-${Date.now().toString(36)}${i}`,
              sku,
              barcode,
              categoryId,
              brandId,
              unit: row.unit?.trim() || 'pcs',
              price: Math.max(num(row.price), 0),
              costPrice,
              wholesalePrice: row.wholesalePrice ? num(row.wholesalePrice) : null,
              stock: 0,
              lowStockAlert: row.lowStockAlert != null ? Math.max(num(row.lowStockAlert, 5), 0) : 5,
              isActive: true,
            },
          });

          // Every branch gets a row so the POS and transfers see the product.
          await tx.shopStock.createMany({
            data: shops.map((s) => ({ tenantId: user.tenantId, shopId: s.id, productId: product.id, variantId: null, stock: 0, isActive: true })),
          });

          if (opening > 0) {
            await applyStockDelta({
              tx,
              tenantId: user.tenantId,
              shopId: stockShopId,
              productId: product.id,
              delta: opening,
              movementType: StockMovementType.OPENING_BALANCE,
              reference: `IMPORT-${job.id.slice(0, 8)}`,
              note: `Bulk import: ${dto.fileName}`,
              userId: user.id,
              unitCost: costPrice,
            });
          }
        });

        names.add(key(name));
        if (sku) codes.add(key(sku));
        if (barcode) codes.add(key(barcode));
        successCount++;
      } catch (e: unknown) {
        errors.push({ row: i + 1, name, error: rowError(e) });
      }

      if ((i + 1) % 25 === 0) {
        await this.prisma.bulkImportJob.update({ where: { id: job.id }, data: { processedRows: i + 1 } });
      }
    }

    const failed = errors.length - skipCount;
    return this.prisma.bulkImportJob.update({
      where: { id: job.id },
      data: {
        processedRows: dto.rows.length,
        status: errors.length === 0 ? 'COMPLETED' : successCount === 0 && failed > 0 ? 'FAILED' : 'PARTIAL',
        successCount,
        errorCount: failed,
        skipCount,
        errors: errors as never,
        completedAt: new Date(),
        duration: Date.now() - job.startedAt!.getTime(),
      },
    });
  }

  async listJobs(user: AuthenticatedUser) {
    return this.prisma.bulkImportJob.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getJob(user: AuthenticatedUser, id: string) {
    return this.prisma.bulkImportJob.findFirst({
      where: { id, tenantId: user.tenantId },
    });
  }
}
