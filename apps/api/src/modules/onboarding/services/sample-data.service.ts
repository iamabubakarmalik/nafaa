import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { getSampleProducts } from '../constants/sample-products';

@Injectable()
export class SampleDataService {
  private readonly logger = new Logger(SampleDataService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create sample products for the given business type
   * Creates categories first if not exists
   */
  async createSamples(tenantId: string, businessType: string): Promise<{ productsCreated: number; categoriesCreated: number }> {
    const samples = getSampleProducts(businessType);
    if (!samples.length) return { productsCreated: 0, categoriesCreated: 0 };

    // Get unique category names
    const categoryNames = Array.from(new Set(samples.map((s) => s.category)));

    // Create categories that don't exist
    const existing = await this.prisma.category.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
    const existingMap = new Map(existing.map((c) => [c.name.toLowerCase(), c.id]));

    const palette = ['#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#f59e0b', '#dc2626', '#0891b2', '#ea580c'];
    let categoriesCreated = 0;

    for (const [i, name] of categoryNames.entries()) {
      if (!existingMap.has(name.toLowerCase())) {
        try {
          const cat = await this.prisma.category.create({
            data: { tenantId, name, color: palette[i % palette.length]! },
          });
          existingMap.set(name.toLowerCase(), cat.id);
          categoriesCreated++;
        } catch (e: any) {
          this.logger.warn(`Category create skipped: ${e.message}`);
        }
      }
    }

    // Create products
    let productsCreated = 0;
    for (const sample of samples) {
      try {
        const categoryId = existingMap.get(sample.category.toLowerCase());
        await this.prisma.product.create({
          data: {
            tenantId,
            name: sample.name,
            price: sample.price,
            costPrice: sample.costPrice,
            stock: sample.stock,
            unit: sample.unit,
            categoryId,
            barcode: sample.barcode,
            lowStockAlert: 5,
            isActive: true,
          },
        });
        productsCreated++;
      } catch (e: any) {
        this.logger.warn(`Sample product create skipped: ${e.message}`);
      }
    }

    return { productsCreated, categoriesCreated };
  }
}
