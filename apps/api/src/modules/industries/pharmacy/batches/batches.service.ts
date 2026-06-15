import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateBatchDto } from './dto/create-batch.dto';

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateBatchDto) {
    const existing = await this.prisma.productBatch.findFirst({
      where: {
        tenantId: user.tenantId,
        productId: dto.productId,
        batchNumber: dto.batchNumber,
      },
    });
    if (existing) {
      throw new ConflictException(`Batch ${dto.batchNumber} already exists for this product`);
    }

    const batch = await this.prisma.productBatch.create({
      data: {
        tenantId: user.tenantId,
        productId: dto.productId,
        variantId: dto.variantId,
        batchNumber: dto.batchNumber,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        quantity: dto.quantity,
        costPrice: dto.costPrice ?? 0,
        notes: dto.notes,
      },
    });

    if (dto.variantId) {
      await this.prisma.productVariant.update({
        where: { id: dto.variantId },
        data: { stock: { increment: dto.quantity } },
      });
    }
    await this.prisma.product.update({
      where: { id: dto.productId },
      data: { stock: { increment: dto.quantity } },
    });

    return batch;
  }

  async listByProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.productBatch.findMany({
      where: { tenantId: user.tenantId, productId, isActive: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async available(user: AuthenticatedUser, productId: string, variantId?: string) {
    return this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        ...(variantId && { variantId }),
        isActive: true,
        quantity: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' }, // FEFO (First Expired First Out)
    });
  }

  async expiringSoon(user: AuthenticatedUser, days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: {
          lte: cutoff,
          gte: new Date(),
        },
      },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
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
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async stats(user: AuthenticatedUser) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [total, expiringSoon, expired, totalQuantity] = await Promise.all([
      this.prisma.productBatch.count({
        where: { tenantId: user.tenantId, isActive: true, quantity: { gt: 0 } },
      }),
      this.prisma.productBatch.count({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          quantity: { gt: 0 },
          expiryDate: { gte: now, lte: in30Days },
        },
      }),
      this.prisma.productBatch.count({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          quantity: { gt: 0 },
          expiryDate: { lt: now },
        },
      }),
      this.prisma.productBatch.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { quantity: true },
      }),
    ]);

    return {
      total,
      expiringSoon,
      expired,
      totalQuantity: totalQuantity._sum.quantity || 0,
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { product: true, variant: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async update(user: AuthenticatedUser, id: string, data: Partial<CreateBatchDto>) {
    await this.findOne(user, id);

    const updateData: any = { ...data };
    if (data.manufactureDate) updateData.manufactureDate = new Date(data.manufactureDate);
    if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);
    delete updateData.productId;
    delete updateData.variantId;

    return this.prisma.productBatch.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const batch = await this.findOne(user, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.productBatch.update({
        where: { id },
        data: { isActive: false, quantity: 0 },
      });

      if (batch.variantId) {
        await tx.productVariant.update({
          where: { id: batch.variantId },
          data: { stock: { decrement: batch.quantity } },
        });
      }
      await tx.product.update({
        where: { id: batch.productId },
        data: { stock: { decrement: batch.quantity } },
      });
    });

    return { success: true };
  }
}
