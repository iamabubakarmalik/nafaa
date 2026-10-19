import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { REGISTER_CLASSES } from '../controlled-log/controlled-log.service';
import { UpsertMedicineDto } from './dto/upsert-medicine.dto';

/** Generic name of a product from its salts, main salt first: "Paracetamol 500mg + Caffeine 65mg". */
export function genericLabel(salts: Array<{ strength: string | null; isMainSalt: boolean; salt: { name: string } }>): string {
  return [...salts]
    .sort((a, b) => Number(b.isMainSalt) - Number(a.isMainSalt))
    .map((s) => [s.salt.name, s.strength].filter(Boolean).join(' '))
    .join(' + ');
}

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertMedicineDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (dto.minTemperature != null && dto.maxTemperature != null && dto.minTemperature > dto.maxTemperature) {
      throw new BadRequestException('Kam se kam temperature zyada wale se bara nahi ho sakta');
    }

    const { productId, approvalDate, ...rest } = dto;
    let approval: Date | null | undefined;
    if (approvalDate) {
      approval = new Date(approvalDate);
      if (Number.isNaN(approval.getTime())) throw new BadRequestException('Approval ki tareekh theek nahi');
    } else if (approvalDate === '') {
      approval = null;
    }
    // A narcotic or controlled medicine always needs a prescription; the register depends on it.
    const data = {
      ...rest,
      ...(approval !== undefined && { approvalDate: approval }),
      ...((rest.isNarcotic || (rest.scheduleClass && REGISTER_CLASSES.includes(rest.scheduleClass))) && { requiresPrescription: true }),
    };

    return this.prisma.pharmacyMedicine.upsert({
      where: { productId },
      create: { ...data, productId, tenantId: user.tenantId },
      update: data,
      include: { product: true },
    });
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

  /**
   * Lean facts for every medicine, for the counter and the products list:
   * schedule flags, form and the generic name. One row per product.
   */
  async lookup(user: AuthenticatedUser) {
    const meds = await this.prisma.pharmacyMedicine.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true, productId: true, scheduleClass: true, requiresPrescription: true, isNarcotic: true,
        requiresColdChain: true, isRefrigerated: true, dosageForm: true, packSize: true, packUnit: true,
        manufacturer: true, registrationNumber: true, isGeneric: true, storageInstructions: true,
        product: { select: { productSalts: { select: { saltId: true, strength: true, isMainSalt: true, salt: { select: { name: true } } } } } },
      },
    });
    return meds.map(({ product, ...m }) => ({
      ...m,
      medicineId: m.id,
      generic: genericLabel(product.productSalts),
      saltIds: product.productSalts.map((s) => s.saltId),
    }));
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
    if (!med) throw new NotFoundException('Dawai nahi mili');
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

  /** Removes only the medicine details; the product, its stock and its bills stay. */
  async remove(user: AuthenticatedUser, id: string) {
    const med = await this.prisma.pharmacyMedicine.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!med) throw new NotFoundException('Dawai nahi mili');
    return this.prisma.pharmacyMedicine.delete({ where: { id } });
  }
}
