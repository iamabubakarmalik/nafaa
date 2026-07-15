import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { BulkImportDto } from './dto/bulk-import.dto';


function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class BulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importProducts(user: AuthenticatedUser, dto: BulkImportDto) {
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

    const errors: any[] = [];
    let successCount = 0;
    let skipCount = 0;

    // Preload lookups
    const [categories, brands] = await Promise.all([
      this.prisma.category.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.brand.findMany({ where: { tenantId: user.tenantId } }),
    ]);

    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      try {
        // Check duplicate by SKU or barcode
        if (row.sku || row.barcode) {
          const dup = await this.prisma.product.findFirst({
            where: {
              tenantId: user.tenantId,
              OR: [
                row.sku ? { sku: row.sku } : undefined,
                row.barcode ? { barcode: row.barcode } : undefined,
              ].filter(Boolean) as any,
            },
          });
          if (dup) {
            skipCount++;
            errors.push({ row: i + 1, name: row.name, error: 'Duplicate SKU/barcode' });
            continue;
          }
        }

        // Resolve category
        let categoryId: string | null = null;
        if (row.category) {
          const key = row.category.toLowerCase().trim();
          categoryId = categoryByName.get(key) || null;
          if (!categoryId) {
            const newCat = await this.prisma.category.create({
              data: {
                tenantId: user.tenantId,
                name: row.category,
                slug: slugify(row.category) + '-' + Date.now().toString(36),
                color: '#6366f1',
              } as any,
            });
            categoryId = newCat.id;
            categoryByName.set(key, newCat.id);
          }
        }

        // Resolve brand
        let brandId: string | null = null;
        if (row.brand) {
          const key = row.brand.toLowerCase().trim();
          brandId = brandByName.get(key) || null;
          if (!brandId) {
            const newBrand = await this.prisma.brand.create({
              data: {
                tenantId: user.tenantId,
                name: row.brand,
                slug: slugify(row.brand) + '-' + Date.now().toString(36),
              },
            });
            brandId = newBrand.id;
            brandByName.set(key, newBrand.id);
          }
        }

        // Create product
        await this.prisma.product.create({
          data: {
            tenantId: user.tenantId,
            name: row.name,
            slug: slugify(row.name) + '-' + Date.now().toString(36),
            sku: row.sku || null,
            barcode: row.barcode || null,
            categoryId,
            brandId,
            unit: row.unit || 'piece',
            price: Number(row.price) || 0,
            costPrice: Number(row.costPrice) || 0,
            wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : null,
            stock: Number(row.stock) || 0,
            lowStockAlert: Number(row.lowStockAlert) || 5,
            isActive: true,
          },
        });

        successCount++;

        await this.prisma.bulkImportJob.update({
          where: { id: job.id },
          data: { processedRows: i + 1 },
        });
      } catch (e: any) {
        errors.push({ row: i + 1, name: row.name, error: e.message });
      }
    }

    return this.prisma.bulkImportJob.update({
      where: { id: job.id },
      data: {
        status: errors.length === 0 ? 'COMPLETED' : errors.length === dto.rows.length ? 'FAILED' : 'PARTIAL',
        successCount,
        errorCount: errors.length,
        skipCount,
        errors: errors as any,
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
