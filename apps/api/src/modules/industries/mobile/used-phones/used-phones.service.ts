import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateUsedPhoneDto } from './dto/create-used-phone.dto';
import { UpdateUsedPhoneDto } from './dto/update-used-phone.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryUsedPhonesDto } from './dto/query-used-phones.dto';
import { UsedPhoneCondition, UsedPhoneStatus, Prisma } from '@prisma/client';

@Injectable()
export class UsedPhonesService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // VALUATION HELPER — auto-estimate buyback based on condition
  // ════════════════════════════════════════════════════════

  /**
   * Suggest buyback price based on condition + accessories + age.
   * Returns a percentage multiplier of a hypothetical "new" reference price.
   */
  estimateValuation(input: {
    referencePrice: number; // typical new/like-new market price
    condition: UsedPhoneCondition;
    modelYear?: number;
    hasOriginalBox?: boolean;
    hasOriginalCharger?: boolean;
    hasOriginalReceipt?: boolean;
    hasWarrantyLeft?: boolean;
    batteryHealth?: number;
  }): { suggestedBuyback: number; multiplier: number; reasoning: string[] } {
    const reasoning: string[] = [];

    // Base multiplier by condition
    const conditionMultipliers: Record<UsedPhoneCondition, number> = {
      EXCELLENT: 0.85,
      VERY_GOOD: 0.75,
      GOOD: 0.65,
      FAIR: 0.50,
      POOR: 0.30,
    };
    let multiplier = conditionMultipliers[input.condition];
    reasoning.push(`Base ${input.condition}: ${(multiplier * 100).toFixed(0)}%`);

    // Age penalty (3% per year after 1st year)
    if (input.modelYear) {
      const age = new Date().getFullYear() - input.modelYear;
      if (age > 1) {
        const agePenalty = Math.min((age - 1) * 0.03, 0.20);
        multiplier -= agePenalty;
        reasoning.push(`${age}yr old: -${(agePenalty * 100).toFixed(0)}%`);
      }
    }

    // Accessories bonus
    if (input.hasOriginalBox) {
      multiplier += 0.02;
      reasoning.push('Original box: +2%');
    }
    if (input.hasOriginalCharger) {
      multiplier += 0.02;
      reasoning.push('Charger: +2%');
    }
    if (input.hasOriginalReceipt) {
      multiplier += 0.03;
      reasoning.push('Receipt: +3%');
    }
    if (input.hasWarrantyLeft) {
      multiplier += 0.05;
      reasoning.push('Warranty left: +5%');
    }

    // Battery health
    if (input.batteryHealth !== undefined && input.batteryHealth < 80) {
      const batteryPenalty = ((80 - input.batteryHealth) / 100) * 0.5;
      multiplier -= batteryPenalty;
      reasoning.push(`Battery ${input.batteryHealth}%: -${(batteryPenalty * 100).toFixed(0)}%`);
    }

    multiplier = Math.max(0.10, Math.min(multiplier, 0.95));
    const suggestedBuyback = Math.round(input.referencePrice * multiplier);

    return { suggestedBuyback, multiplier, reasoning };
  }

  // ════════════════════════════════════════════════════════
  // CREATE
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateUsedPhoneDto) {
    // IMEI uniqueness check
    const existing = await this.prisma.usedPhone.findFirst({
      where: { tenantId: user.tenantId, imei1: dto.imei1 },
    });
    if (existing) {
      throw new ConflictException(`IMEI ${dto.imei1} already exists (${existing.usedPhoneCode})`);
    }

    // Also check against new phone IMEIs
    const existingNew = await this.prisma.productImei.findFirst({
      where: { tenantId: user.tenantId, imei1: dto.imei1 },
    });
    if (existingNew) {
      throw new ConflictException(`IMEI ${dto.imei1} exists as new phone stock`);
    }

    // Generate code
    const year = new Date().getFullYear();
    const prefix = `UP-${year}-`;
    const last = await this.prisma.usedPhone.findFirst({
      where: { tenantId: user.tenantId, usedPhoneCode: { startsWith: prefix } },
      orderBy: { usedPhoneCode: 'desc' },
      select: { usedPhoneCode: true },
    });
    let nextNum = 1;
    if (last?.usedPhoneCode) {
      const parts = last.usedPhoneCode.split('-');
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) nextNum = n + 1;
    }
    const usedPhoneCode = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // Resolve shop
    const shopId = dto.shopId ?? user.shopId ?? null;

    // Calculate totalCost
    const buyback = dto.buybackPrice ?? 0;
    const refurbish = dto.refurbishCost ?? 0;
    const totalCost = buyback + refurbish;

    return this.prisma.usedPhone.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        usedPhoneCode,
        imei1: dto.imei1,
        imei2: dto.imei2,
        serialNumber: dto.serialNumber,
        brand: dto.brand,
        model: dto.model,
        storage: dto.storage,
        ram: dto.ram,
        color: dto.color,
        modelYear: dto.modelYear,
        ptaStatus: dto.ptaStatus ?? 'PENDING',
        ptaTaxPaid: dto.ptaTaxPaid ?? 0,
        condition: dto.condition ?? 'GOOD',
        conditionNotes: dto.conditionNotes,
        hasOriginalBox: dto.hasOriginalBox ?? false,
        hasOriginalCharger: dto.hasOriginalCharger ?? false,
        hasOriginalCable: dto.hasOriginalCable ?? false,
        hasOriginalEarphones: dto.hasOriginalEarphones ?? false,
        hasOriginalReceipt: dto.hasOriginalReceipt ?? false,
        hasWarrantyLeft: dto.hasWarrantyLeft ?? false,
        warrantyExpiryDate: dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null,
        source: dto.source ?? 'CASH_BUYBACK',
        buybackPrice: buyback,
        estimatedValue: dto.estimatedValue ?? 0,
        refurbishCost: refurbish,
        totalCost,
        resalePrice: dto.resalePrice ?? 0,
        fromCustomerId: dto.fromCustomerId,
        fromCustomerName: dto.fromCustomerName,
        fromCustomerPhone: dto.fromCustomerPhone,
        fromCustomerCnic: dto.fromCustomerCnic,
        cnicPhotoUrl: dto.cnicPhotoUrl,
        imeiPhotoUrl: dto.imeiPhotoUrl,
        devicePhotos: dto.devicePhotos ?? [],
        status: dto.status ?? 'PENDING_INSPECTION',
        notes: dto.notes,
        createdById: user.id,
      },
      include: {
        shop: { select: { id: true, name: true } },
        fromCustomer: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL
  // ════════════════════════════════════════════════════════

  async findAll(user: AuthenticatedUser, query: QueryUsedPhonesDto) {
    const where: Prisma.UsedPhoneWhereInput = {
      tenantId: user.tenantId,
      ...(query.shopId && { shopId: query.shopId }),
      ...(query.status && { status: query.status }),
      ...(query.condition && { condition: query.condition }),
      ...(query.brand && { brand: { contains: query.brand, mode: 'insensitive' } }),
      ...(query.search && {
        OR: [
          { imei1: { contains: query.search } },
          { imei2: { contains: query.search } },
          { serialNumber: { contains: query.search, mode: 'insensitive' as const } },
          { brand: { contains: query.search, mode: 'insensitive' as const } },
          { model: { contains: query.search, mode: 'insensitive' as const } },
          { usedPhoneCode: { contains: query.search, mode: 'insensitive' as const } },
          { fromCustomerName: { contains: query.search, mode: 'insensitive' as const } },
          { fromCustomerPhone: { contains: query.search } },
        ],
      }),
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.usedPhone.findMany({
        where,
        include: {
          shop: { select: { id: true, name: true } },
          fromCustomer: { select: { id: true, name: true, phone: true } },
          _count: { select: { inspections: true } },
        },
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usedPhone.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const phone = await this.prisma.usedPhone.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        shop: { select: { id: true, name: true } },
        fromCustomer: { select: { id: true, name: true, phone: true, cnic: true } },
        inspections: { orderBy: { inspectedAt: 'desc' } },
      },
    });
    if (!phone) throw new NotFoundException('Used phone not found');
    return phone;
  }

  async stats(user: AuthenticatedUser) {
    const [byStatus, byCondition, totalValue, soldStats] = await Promise.all([
      this.prisma.usedPhone.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
      }),
      this.prisma.usedPhone.groupBy({
        by: ['condition'],
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _count: { _all: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _sum: { totalCost: true, resalePrice: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, status: 'SOLD' },
        _sum: { totalCost: true, finalSoldPrice: true },
        _count: { _all: true },
      }),
    ]);

    const totalProfit = (soldStats._sum.finalSoldPrice ?? 0) - (soldStats._sum.totalCost ?? 0);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byCondition: byCondition.map((c) => ({ condition: c.condition, count: c._count._all })),
      inStockCost: totalValue._sum.totalCost ?? 0,
      inStockResaleValue: totalValue._sum.resalePrice ?? 0,
      potentialProfit: (totalValue._sum.resalePrice ?? 0) - (totalValue._sum.totalCost ?? 0),
      totalSold: soldStats._count._all,
      totalRevenue: soldStats._sum.finalSoldPrice ?? 0,
      totalProfit,
    };
  }

  // ════════════════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════════════════

  async update(user: AuthenticatedUser, id: string, dto: UpdateUsedPhoneDto) {
    const phone = await this.findOne(user, id);

    // Recalculate totalCost if either component changed
    const buyback = dto.buybackPrice ?? phone.buybackPrice;
    const refurbish = dto.refurbishCost ?? phone.refurbishCost;
    const totalCost = Number(buyback) + Number(refurbish);

    return this.prisma.usedPhone.update({
      where: { id },
      data: {
        ...dto,
        totalCost,
        warrantyExpiryDate: dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : undefined,
      },
      include: {
        shop: { select: { id: true, name: true } },
        fromCustomer: { select: { id: true, name: true } },
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // INSPECTION
  // ════════════════════════════════════════════════════════

  async addInspection(user: AuthenticatedUser, usedPhoneId: string, dto: CreateInspectionDto) {
    const phone = await this.findOne(user, usedPhoneId);

    return this.prisma.$transaction(async (tx) => {
      const inspection = await tx.usedPhoneInspection.create({
        data: {
          usedPhoneId,
          tenantId: user.tenantId,
          screenCondition: dto.screenCondition,
          bodyCondition: dto.bodyCondition,
          cameraWorks: dto.cameraWorks,
          speakerWorks: dto.speakerWorks,
          microphoneWorks: dto.microphoneWorks,
          chargingPortWorks: dto.chargingPortWorks,
          buttonsWork: dto.buttonsWork,
          faceIdFingerprintWorks: dto.faceIdFingerprintWorks,
          batteryHealth: dto.batteryHealth,
          imeiUnlocked: dto.imeiUnlocked,
          icloudUnlocked: dto.icloudUnlocked,
          softwareIssues: dto.softwareIssues,
          needsRepair: dto.needsRepair ?? false,
          estimatedRepairCost: dto.estimatedRepairCost ?? 0,
          recommendedActions: dto.recommendedActions,
          inspectedById: user.id,
        },
      });

      // Auto-update phone status & refurbish cost
      await tx.usedPhone.update({
        where: { id: usedPhoneId },
        data: {
          inspectedAt: new Date(),
          inspectedById: user.id,
          status: dto.needsRepair ? 'REPAIRING' : 'IN_STOCK',
          refurbishCost: dto.estimatedRepairCost ?? phone.refurbishCost,
          totalCost: Number(phone.buybackPrice) + Number(dto.estimatedRepairCost ?? phone.refurbishCost),
        },
      });

      return inspection;
    });
  }

  // ════════════════════════════════════════════════════════
  // STATUS TRANSITIONS
  // ════════════════════════════════════════════════════════

  async markInStock(user: AuthenticatedUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.usedPhone.update({
      where: { id },
      data: { status: UsedPhoneStatus.IN_STOCK },
    });
  }

  async markSold(user: AuthenticatedUser, id: string, finalPrice: number, saleId?: string) {
    const phone = await this.findOne(user, id);
    if (phone.status === 'SOLD') {
      throw new BadRequestException('Already sold');
    }
    return this.prisma.usedPhone.update({
      where: { id },
      data: {
        status: UsedPhoneStatus.SOLD,
        finalSoldPrice: finalPrice,
        soldAt: new Date(),
        soldSaleId: saleId,
      },
    });
  }

  async markDiscarded(user: AuthenticatedUser, id: string, reason?: string) {
    await this.findOne(user, id);
    return this.prisma.usedPhone.update({
      where: { id },
      data: {
        status: UsedPhoneStatus.DISCARDED,
        notes: reason,
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // REMOVE
  // ════════════════════════════════════════════════════════

  async remove(user: AuthenticatedUser, id: string) {
    const phone = await this.findOne(user, id);
    if (phone.status === 'SOLD') {
      throw new BadRequestException('Cannot delete sold phone');
    }
    await this.prisma.usedPhone.delete({ where: { id } });
    return { message: 'Used phone deleted', usedPhoneCode: phone.usedPhoneCode };
  }
}
