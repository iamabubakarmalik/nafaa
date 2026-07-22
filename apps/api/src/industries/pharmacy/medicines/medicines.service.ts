import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertMedicineDto } from './dto/upsert-medicine.dto';

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertMedicineDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.pharmacyMedicine.findUnique({ where: { productId: dto.productId } });

    const data: any = {
      ...dto,
      approvalDate: dto.approvalDate ? new Date(dto.approvalDate) : undefined,
      tenantId: user.tenantId,
    };

    if (existing) {
      return this.prisma.pharmacyMedicine.update({ where: { productId: dto.productId }, data, include: { product: true } });
    }
    return this.prisma.pharmacyMedicine.create({ data, include: { product: true } });
  }

  async list(user: AuthenticatedUser, params: { scheduleClass?: string; requiresColdChain?: boolean; requiresPrescription?: boolean; search?: string }) {
    return this.prisma.pharmacyMedicine.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.scheduleClass && { scheduleClass: params.scheduleClass as any }),
        ...(params.requiresColdChain !== undefined && { requiresColdChain: params.requiresColdChain }),
        ...(params.requiresPrescription !== undefined && { requiresPrescription: params.requiresPrescription }),
        ...(params.search && {
          product: {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
              { barcode: { contains: params.search, mode: 'insensitive' } },
            ],
          },
        }),
      },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            category: true,
            productSalts: { include: { salt: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const med = await this.prisma.pharmacyMedicine.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: {
          include: {
            images: true,
            category: true,
            brand: true,
            batches: { orderBy: { expiryDate: 'asc' } },
            productSalts: { include: { salt: true } },
          },
        },
        substitutes: { include: { substitute: { include: { product: true } } } },
      },
    });
    if (!med) throw new NotFoundException('Medicine not found');
    return med;
  }

  async byProductId(user: AuthenticatedUser, productId: string) {
    return this.prisma.pharmacyMedicine.findFirst({
      where: { tenantId: user.tenantId, productId },
      include: {
        product: {
          include: {
            productSalts: { include: { salt: true } },
            batches: { orderBy: { expiryDate: 'asc' } },
          },
        },
        substitutes: { include: { substitute: { include: { product: true } } } },
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const med = await this.prisma.pharmacyMedicine.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!med) throw new NotFoundException('Medicine not found');
    return this.prisma.pharmacyMedicine.delete({ where: { id } });
  }
}
