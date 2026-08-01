import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertApplianceSerialDto } from './dto/upsert-serial.dto';

@Injectable()
export class ApplianceSerialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertApplianceSerialDto) {
    const dup = await this.prisma.applianceSerialTracking.findFirst({
      where: { tenantId: user.tenantId, serialNumber: dto.serialNumber },
    });
    if (dup) throw new BadRequestException(`Serial "${dto.serialNumber}" exists`);

    return this.prisma.applianceSerialTracking.create({
      data: {
        ...dto,
        tenantId: user.tenantId,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        installationScheduledFor: dto.installationScheduledFor ? new Date(dto.installationScheduledFor) : null,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { productId?: string; status?: string; installationStatus?: string; search?: string }) {
    return this.prisma.applianceSerialTracking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.status && { status: params.status }),
        ...(params.installationStatus && { installationStatus: params.installationStatus as any }),
        ...(params.search && {
          OR: [
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
            { modelNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.applianceSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return s;
  }

  async lookupBySerial(user: AuthenticatedUser, code: string) {
    return this.prisma.applianceSerialTracking.findFirst({
      where: { tenantId: user.tenantId, serialNumber: code },
    });
  }

  async warrantyCheck(user: AuthenticatedUser, code: string) {
    const s = await this.lookupBySerial(user, code);
    if (!s) return { found: false };
    const now = new Date();
    const isExpired = s.warrantyEndDate ? new Date(s.warrantyEndDate) < now : true;
    const daysRemaining = s.warrantyEndDate
      ? Math.max(0, Math.floor((new Date(s.warrantyEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const compressorValid = s.compressorWarrantyEndDate ? new Date(s.compressorWarrantyEndDate) > now : false;
    const motorValid = s.motorWarrantyEndDate ? new Date(s.motorWarrantyEndDate) > now : false;

    return {
      found: true,
      serial: s,
      warranty: {
        isValid: !isExpired,
        endDate: s.warrantyEndDate,
        daysRemaining,
        compressorValid,
        compressorEndDate: s.compressorWarrantyEndDate,
        motorValid,
        motorEndDate: s.motorWarrantyEndDate,
      },
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertApplianceSerialDto) {
    const s = await this.prisma.applianceSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.applianceSerialTracking.update({
      where: { id },
      data: {
        ...dto,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : undefined,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        installationScheduledFor: dto.installationScheduledFor ? new Date(dto.installationScheduledFor) : undefined,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.applianceSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.applianceSerialTracking.delete({ where: { id } });
  }
}
