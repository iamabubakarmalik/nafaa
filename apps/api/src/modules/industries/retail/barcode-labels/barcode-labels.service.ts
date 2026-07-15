import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateBarcodeBatchDto } from './dto/create-batch.dto';

@Injectable()
export class BarcodeLabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateBarcodeBatchDto) {
    const totalLabels = dto.items.reduce((sum, i) => sum + i.quantity, 0);

    return this.prisma.barcodeLabelBatch.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        name: dto.name,
        layout: dto.layout ?? '30_per_sheet',
        paperSize: dto.paperSize ?? 'A4',
        includePrice: dto.includePrice ?? true,
        includeName: dto.includeName ?? true,
        includeShop: dto.includeShop ?? true,
        includeMrp: dto.includeMrp ?? false,
        fontFamily: dto.fontFamily ?? 'monospace',
        items: dto.items as any,
        totalLabels,
      },
    });
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.barcodeLabelBatch.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const batch = await this.prisma.barcodeLabelBatch.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    // Enrich with product/unit data
    const items = batch.items as any[];
    const productIds = [...new Set(items.map((i) => i.productId))];
    const unitIds = [...new Set(items.map((i) => i.unitId).filter(Boolean))];

    const [products, units] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          category: true,
          brand: true,
        },
      }),
      unitIds.length
        ? this.prisma.productUnit.findMany({ where: { id: { in: unitIds } } })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const unitMap = new Map(units.map((u) => [u.id, u]));

    const enrichedItems = items.map((item) => ({
      ...item,
      product: productMap.get(item.productId),
      unit: item.unitId ? unitMap.get(item.unitId) : null,
    }));

    return { ...batch, enrichedItems };
  }

  async markPrinted(user: AuthenticatedUser, id: string) {
    const batch = await this.prisma.barcodeLabelBatch.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    return this.prisma.barcodeLabelBatch.update({
      where: { id },
      data: { printedAt: new Date() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const batch = await this.prisma.barcodeLabelBatch.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return this.prisma.barcodeLabelBatch.delete({ where: { id } });
  }
}
