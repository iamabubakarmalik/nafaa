import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { ImeiStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateImeiDto } from './dto/create-imei.dto';
import { BulkCreateImeiDto } from './dto/bulk-create-imei.dto';

@Injectable()
export class ImeiService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateImeiDto) {
    // Check duplicate IMEI
    const existing = await this.prisma.productImei.findFirst({
      where: { tenantId: user.tenantId, imei1: dto.imei1 },
    });
    if (existing) {
      throw new ConflictException(`IMEI ${dto.imei1} already exists`);
    }

    const warrantyExpiry = dto.warrantyMonths
      ? new Date(Date.now() + dto.warrantyMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const imei = await this.prisma.productImei.create({
      data: {
        tenantId: user.tenantId,
        productId: dto.productId,
        variantId: dto.variantId,
        imei1: dto.imei1,
        imei2: dto.imei2,
        serialNumber: dto.serialNumber,
        costPrice: dto.costPrice ?? 0,
        warrantyMonths: dto.warrantyMonths ?? 12,
        warrantyExpiry,
        color: dto.color,
        notes: dto.notes,
        purchasedAt: new Date(),
      },
    });

    // Increment product stock
    if (dto.variantId) {
      await this.prisma.productVariant.update({
        where: { id: dto.variantId },
        data: { stock: { increment: 1 } },
      });
    }
    await this.prisma.product.update({
      where: { id: dto.productId },
      data: { stock: { increment: 1 } },
    });

    return imei;
  }

  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateImeiDto) {
    // Check duplicates
    const imeis = dto.imeis.map((i) => i.imei1);
    const existing = await this.prisma.productImei.findMany({
      where: { tenantId: user.tenantId, imei1: { in: imeis } },
      select: { imei1: true },
    });

    if (existing.length > 0) {
      throw new ConflictException(
        `IMEIs already exist: ${existing.map((e) => e.imei1).join(', ')}`,
      );
    }

    const warrantyExpiry = dto.warrantyMonths
      ? new Date(Date.now() + dto.warrantyMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const count = dto.imeis.length;

    await this.prisma.$transaction(async (tx) => {
      await tx.productImei.createMany({
        data: dto.imeis.map((i) => ({
          tenantId: user.tenantId,
          productId: dto.productId,
          variantId: dto.variantId,
          imei1: i.imei1,
          imei2: i.imei2,
          serialNumber: i.serialNumber,
          costPrice: dto.costPrice ?? 0,
          warrantyMonths: dto.warrantyMonths ?? 12,
          warrantyExpiry,
          color: i.color,
          purchasedAt: new Date(),
        })),
      });

      if (dto.variantId) {
        await tx.productVariant.update({
          where: { id: dto.variantId },
          data: { stock: { increment: count } },
        });
      }
      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: { increment: count } },
      });
    });

    return { count, message: `${count} IMEIs added successfully` };
  }

  async listByProduct(user: AuthenticatedUser, productId: string, status?: ImeiStatus) {
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByVariant(user: AuthenticatedUser, variantId: string, status?: ImeiStatus) {
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        variantId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async availableForSale(user: AuthenticatedUser, productId: string, variantId?: string) {
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        ...(variantId && { variantId }),
        status: 'IN_STOCK',
      },
      orderBy: { purchasedAt: 'asc' }, // FIFO
    });
  }

  async search(user: AuthenticatedUser, query: string) {
    return this.prisma.productImei.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { imei1: { contains: query } },
          { imei2: { contains: query } },
          { serialNumber: { contains: query } },
        ],
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
      },
      take: 20,
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const imei = await this.prisma.productImei.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: true,
        variant: true,
      },
    });
    if (!imei) throw new NotFoundException('IMEI not found');
    return imei;
  }

  async update(user: AuthenticatedUser, id: string, data: Partial<CreateImeiDto>) {
    await this.findOne(user, id);

    const updateData: any = { ...data };
    if (data.warrantyMonths) {
      updateData.warrantyExpiry = new Date(
        Date.now() + data.warrantyMonths * 30 * 24 * 60 * 60 * 1000,
      );
    }
    delete updateData.productId; // can't change product
    delete updateData.variantId;

    return this.prisma.productImei.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const imei = await this.findOne(user, id);
    if (imei.status === 'SOLD') {
      throw new BadRequestException('Cannot delete sold IMEI');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImei.delete({ where: { id } });

      if (imei.variantId) {
        await tx.productVariant.update({
          where: { id: imei.variantId },
          data: { stock: { decrement: 1 } },
        });
      }
      await tx.product.update({
        where: { id: imei.productId },
        data: { stock: { decrement: 1 } },
      });
    });

    return { success: true };
  }

  /** Mark IMEI as sold (called by sales module) */
  async markSold(
    tx: any,
    tenantId: string,
    imeiId: string,
    saleItemId: string,
    soldPrice: number,
  ) {
    const imei = await tx.productImei.findFirst({
      where: { id: imeiId, tenantId },
    });
    if (!imei) throw new NotFoundException('IMEI not found');
    if (imei.status !== 'IN_STOCK') {
      throw new BadRequestException(`IMEI ${imei.imei1} is not in stock (${imei.status})`);
    }

    return tx.productImei.update({
      where: { id: imeiId },
      data: {
        status: 'SOLD',
        saleItemId,
        soldPrice,
        soldAt: new Date(),
      },
    });
  }

  async stats(user: AuthenticatedUser) {
    const [total, inStock, sold, returned] = await Promise.all([
      this.prisma.productImei.count({ where: { tenantId: user.tenantId } }),
      this.prisma.productImei.count({ where: { tenantId: user.tenantId, status: 'IN_STOCK' } }),
      this.prisma.productImei.count({ where: { tenantId: user.tenantId, status: 'SOLD' } }),
      this.prisma.productImei.count({ where: { tenantId: user.tenantId, status: 'RETURNED' } }),
    ]);

    return { total, inStock, sold, returned };
  }
}
