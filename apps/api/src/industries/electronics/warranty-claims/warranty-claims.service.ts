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
    const [total, active, inRepair, resolved, sentToBrand] = await Promise.all([
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId } }),
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId, status: 'IN_REPAIR' } }),
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId, status: 'CLAIMED' } }),
      this.prisma.electronicsWarrantyClaim.count({ where: { tenantId: user.tenantId, sentToBrand: true } }),
    ]);
    return { total, active, inRepair, resolved, sentToBrand };
  }
}
