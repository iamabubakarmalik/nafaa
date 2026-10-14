import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { UpsertBatchDto } from './dto/upsert-batch.dto';

const SHOP = { select: { id: true, name: true } } as const;

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

  /** Batches of one product in the branch being viewed (every branch on "All shops"). */
  async list(user: AuthenticatedUser, scope: ShopScope, productId: string) {
    await this.ensureProduct(user, productId);
    return this.prisma.productBatch.findMany({
      where: { productId, tenantId: user.tenantId, ...scope.where },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
      include: { variant: { select: { id: true, name: true } }, shop: SHOP },
    });
  }

  async expiringSoon(user: AuthenticatedUser, scope: ShopScope, daysAhead = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { lte: cutoff, gte: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: { select: { id: true, name: true } },
        shop: SHOP,
      },
    });
  }

  async expired(user: AuthenticatedUser, scope: ShopScope) {
    return this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: { lt: new Date() },
      },
      orderBy: { expiryDate: 'desc' },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: { select: { id: true, name: true } },
        shop: SHOP,
      },
    });
  }

  /** A batch on the shelf of one branch: the one named, else the branch being viewed, else the main shop. */
  async create(user: AuthenticatedUser, scope: ShopScope, productId: string, dto: UpsertBatchDto) {
    await this.ensureProduct(user, productId);
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    return this.prisma.productBatch.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        productId,
        variantId: dto.variantId,
        batchNumber: dto.batchNumber,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        quantity: dto.quantity ?? 0,
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
