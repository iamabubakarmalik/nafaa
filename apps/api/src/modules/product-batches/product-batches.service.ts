import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpsertBatchDto } from './dto/upsert-batch.dto';

@Injectable()
export class ProductBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProduct(user: AuthenticatedUser, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async list(user: AuthenticatedUser, productId: string) {
    await this.ensureProduct(user, productId);
    return this.prisma.productBatch.findMany({
      where: { productId, tenantId: user.tenantId },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
      include: { variant: { select: { id: true, name: true } } },
    });
  }

  async expiringSoon(user: AuthenticatedUser, daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { lte: cutoff, gte: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: { select: { id: true, name: true } },
      },
    });
  }

  async expired(user: AuthenticatedUser) {
    return this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { lt: new Date() },
      },
      orderBy: { expiryDate: 'desc' },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: { select: { id: true, name: true } },
      },
    });
  }

  async create(user: AuthenticatedUser, productId: string, dto: UpsertBatchDto) {
    await this.ensureProduct(user, productId);
    return this.prisma.productBatch.create({
      data: {
        tenantId: user.tenantId,
        productId,
        variantId: dto.variantId,
        batchNumber: dto.batchNumber,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        quantity: dto.quantity,
        costPrice: dto.costPrice ?? 0,
        notes: dto.notes,
      },
    });
  }

  async update(user: AuthenticatedUser, productId: string, id: string, dto: UpsertBatchDto) {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id, productId, tenantId: user.tenantId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    return this.prisma.productBatch.update({
      where: { id },
      data: {
        batchNumber: dto.batchNumber,
        variantId: dto.variantId,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        quantity: dto.quantity,
        costPrice: dto.costPrice ?? 0,
        notes: dto.notes,
      },
    });
  }

  async remove(user: AuthenticatedUser, productId: string, id: string) {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id, productId, tenantId: user.tenantId },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    await this.prisma.productBatch.delete({ where: { id } });
    return { message: 'Batch deleted' };
  }
}
