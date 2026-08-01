import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BulkCreateSerialDto, SellSerialDto, UpsertSerialDto } from './dto/upsert-serial.dto';

@Injectable()
export class SerialTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertSerialDto) {
    const dup = await this.prisma.electronicsSerialTracking.findFirst({
      where: { tenantId: user.tenantId, serialNumber: dto.serialNumber },
    });
    if (dup) throw new BadRequestException(`Serial "${dto.serialNumber}" already exists`);

    return this.prisma.electronicsSerialTracking.create({
      data: {
        ...dto,
        tenantId: user.tenantId,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
      },
    });
  }

  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateSerialDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.electronicsSerialTracking.findMany({
      where: { tenantId: user.tenantId, serialNumber: { in: dto.serialNumbers } },
    });
    const existingSet = new Set(existing.map((e) => e.serialNumber));
    const newSerials = dto.serialNumbers.filter((s) => !existingSet.has(s));

    if (newSerials.length === 0) throw new BadRequestException('All serials already exist');

    await this.prisma.electronicsSerialTracking.createMany({
      data: newSerials.map((serialNumber) => ({
        tenantId: user.tenantId,
        productId: dto.productId,
        serialNumber,
        status: 'IN_STOCK' as const,
        purchasePrice: dto.purchasePrice,
        supplierRef: dto.supplierRef,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
        warrantyStatus: dto.warrantyStartDate ? 'ACTIVE' : 'NO_WARRANTY' as any,
      })),
    });

    return { created: newSerials.length, skipped: dto.serialNumbers.length - newSerials.length };
  }

  async list(user: AuthenticatedUser, params: { productId?: string; status?: string; imei?: string; search?: string }) {
    return this.prisma.electronicsSerialTracking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.status && { status: params.status as any }),
        ...(params.imei && { OR: [{ imei: params.imei }, { imei2: params.imei }] }),
        ...(params.search && {
          OR: [
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
            { imei: { contains: params.search } },
            { macAddress: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    const product = await this.prisma.product.findUnique({ where: { id: s.productId }, include: { images: true } });
    return { ...s, product };
  }

  async lookupBySerialOrImei(user: AuthenticatedUser, code: string) {
    return this.prisma.electronicsSerialTracking.findFirst({
      where: {
        tenantId: user.tenantId,
        OR: [
          { serialNumber: code },
          { imei: code },
          { imei2: code },
          { macAddress: code },
        ],
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSerialDto) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
      },
    });
  }

  async sell(user: AuthenticatedUser, id: string, dto: SellSerialDto) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    if (s.status !== 'IN_STOCK' && s.status !== 'RESERVED') {
      throw new BadRequestException(`Cannot sell serial with status ${s.status}`);
    }
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        status: 'SOLD',
        soldPrice: dto.soldPrice,
        soldAt: new Date(),
        soldToCustomerId: dto.soldToCustomerId,
        saleId: dto.saleId,
        invoiceNumber: dto.invoiceNumber,
      },
    });
  }

  async returnSerial(user: AuthenticatedUser, id: string, reason: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        status: 'RETURNED',
        notes: ((s.notes || '') + '\nReturned: ' + reason).trim(),
      },
    });
  }

  async markDefective(user: AuthenticatedUser, id: string, reason: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        status: 'DEFECTIVE',
        notes: ((s.notes || '') + '\nDefective: ' + reason).trim(),
      },
    });
  }

  async warrantyCheck(user: AuthenticatedUser, code: string) {
    const s = await this.lookupBySerialOrImei(user, code);
    if (!s) return { found: false };

    const now = new Date();
    const isExpired = s.warrantyEndDate ? new Date(s.warrantyEndDate) < now : true;
    const daysRemaining = s.warrantyEndDate
      ? Math.max(0, Math.floor((new Date(s.warrantyEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      found: true,
      serial: s,
      warranty: {
        status: s.warrantyStatus,
        startDate: s.warrantyStartDate,
        endDate: s.warrantyEndDate,
        isExpired,
        daysRemaining,
        isValid: !isExpired && s.warrantyStatus === 'ACTIVE',
      },
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    if (s.status === 'SOLD') throw new BadRequestException('Cannot delete sold serial');
    return this.prisma.electronicsSerialTracking.delete({ where: { id } });
  }
}
