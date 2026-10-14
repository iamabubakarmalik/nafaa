/**
 * Retail import endpoint kept for older clients. Rows are handed to the
 * shared product import, so they get the same checks and the opening stock
 * is booked the same way (OPENING_BALANCE in the branch in view, or the main
 * shop). The response is still the BulkImportJob record.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { ProductImportService } from '../../../modules/inventory/products/import/product-import.service';
import { BulkImportDto } from './dto/bulk-import.dto';

const cell = (v: unknown) => (v === undefined || v === null ? undefined : String(v));

@Injectable()
export class BulkImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importer: ProductImportService,
  ) {}

  async importProducts(user: AuthenticatedUser, scope: ShopScope, dto: BulkImportDto) {
    const rows = dto.rows.map((r, i) => ({
      row: i + 1,
      name: cell(r.name),
      sku: cell(r.sku),
      barcode: cell(r.barcode),
      category: cell(r.category),
      brand: cell(r.brand),
      unit: cell(r.unit),
      price: cell(r.price),
      costPrice: cell(r.costPrice),
      wholesalePrice: cell(r.wholesalePrice),
      stock: cell(r.stock),
      lowStockAlert: cell(r.lowStockAlert),
    }));
    const { jobId } = await this.importer.runCreate(user, scope, {
      rows, fileName: dto.fileName, totalRows: rows.length, done: true,
    });
    return this.prisma.bulkImportJob.findUniqueOrThrow({ where: { id: jobId } });
  }

  listJobs(user: AuthenticatedUser) {
    return this.prisma.bulkImportJob.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  getJob(user: AuthenticatedUser, id: string) {
    return this.prisma.bulkImportJob.findFirst({ where: { id, tenantId: user.tenantId } });
  }
}
