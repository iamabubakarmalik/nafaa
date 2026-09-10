import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BrandContactDto, CreateClaimDto, ResolveClaimDto, UpdateClaimStatusDto } from './dto/create-claim.dto';

@Injectable()
export class WarrantyClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateClaimDto) {
    const count = await this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const claimNumber = `WC-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.electronicsWarrantyClaim.create({
      data: {
        tenantId: user.tenantId,
        claimNumber,
        ...dto,
        purchaseDate: new Date(dto.purchaseDate),
        imageUrls: dto.imageUrls ?? [],
        documentUrls: dto.documentUrls ?? [],
        handledById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; sentToBrand?: boolean; from?: string; to?: string; search?: string }) {
    return this.prisma.electronicsWarrantyClaim.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.sentToBrand !== undefined && { sentToBrand: params.sentToBrand }),
        ...(params.from || params.to ? {
          claimDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { claimNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
            { imei: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { claimDate: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.electronicsWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim not found');
    return c;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateClaimStatusDto) {
    const c = await this.prisma.electronicsWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim not found');

    const patch: any = { status: dto.status };
    if (dto.status === 'IN_REPAIR' && !c.receivedAt) patch.receivedAt = new Date();
    if (dto.diagnosis) { patch.diagnosis = dto.diagnosis; patch.diagnosedAt = new Date(); }
    if (dto.resolution) patch.resolution = dto.resolution;
    if (dto.notes) patch.internalNotes = ((c.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.electronicsWarrantyClaim.update({ where: { id }, data: patch });
  }

  async contactBrand(user: AuthenticatedUser, id: string, dto: BrandContactDto) {
    const c = await this.prisma.electronicsWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim not found');
    return this.prisma.electronicsWarrantyClaim.update({
      where: { id },
      data: {
        sentToBrand: true,
        brandRef: dto.brandRef,
        brandContactedAt: new Date(),
        brandResponse: dto.brandResponse,
      },
    });
  }

  async resolve(user: AuthenticatedUser, id: string, dto: ResolveClaimDto) {
    const c = await this.prisma.electronicsWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim not found');

    return this.prisma.electronicsWarrantyClaim.update({
      where: { id },
      data: {
        status: 'CLAIMED',
        resolvedAt: new Date(),
        resolutionType: dto.resolutionType,
        replacementSerialNumber: dto.replacementSerialNumber,
        refundAmount: dto.refundAmount ?? 0,
        repairCost: dto.repairCost ?? 0,
        paidByCustomer: dto.paidByCustomer ?? 0,
        paidByBrand: dto.paidByBrand ?? 0,
        isChargeable: dto.isChargeable ?? false,
        resolution: dto.resolution,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.electronicsWarrantyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim not found');
    return this.prisma.electronicsWarrantyClaim.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const where = { tenantId: user.tenantId };

    const [total, active, claimed, inRepair, resolved, expired, sentToBrand, thisMonth, money] =
      await Promise.all([
        this.prisma.electronicsWarrantyClaim.count({ where }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, status: 'CLAIMED' } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, status: 'IN_REPAIR' } }),
        // "Hal ho gaya" = jis par resolvedAt lag chuka hai
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, resolvedAt: { not: null } } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, status: 'EXPIRED' } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, sentToBrand: true } }),
        this.prisma.electronicsWarrantyClaim.count({ where: { ...where, claimDate: { gte: monthStart } } }),
        this.prisma.electronicsWarrantyClaim.aggregate({
          where,
          _sum: { repairCost: true, refundAmount: true, paidByCustomer: true, paidByBrand: true },
        }),
      ]);

    const repairCost = money._sum.repairCost ?? 0;
    const refundAmount = money._sum.refundAmount ?? 0;
    const paidByCustomer = money._sum.paidByCustomer ?? 0;
    const paidByBrand = money._sum.paidByBrand ?? 0;

    return {
      total,
      active,
      claimed,
      inRepair,
      resolved,
      expired,
      sentToBrand,
      thisMonth,
      // Abhi jo khule hain — inhi par kaam karna hai
      pending: active + claimed + inRepair,
      cost: {
        repairCost,
        refundAmount,
        paidByCustomer,
        paidByBrand,
        // Dukan ki apni jeb se kitna gaya
        shopBore: Math.max(0, repairCost + refundAmount - paidByCustomer - paidByBrand),
      },
    };
  }
}
