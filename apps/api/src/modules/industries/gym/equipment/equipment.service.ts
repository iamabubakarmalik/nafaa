import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.equipmentNumber) {
      const count = await this.prisma.gymEquipment.count({ where: { tenantId: user.tenantId } });
      dto.equipmentNumber = 'EQ-' + String(count + 1).padStart(4, '0');
    }
    const dup = await this.prisma.gymEquipment.findFirst({ where: { tenantId: user.tenantId, equipmentNumber: dto.equipmentNumber } });
    if (dup) throw new BadRequestException('Equipment number already exists');

    return this.prisma.gymEquipment.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        lastMaintenanceDate: dto.lastMaintenanceDate ? new Date(dto.lastMaintenanceDate) : null,
        nextMaintenanceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; status?: string; search?: string }) {
    return this.prisma.gymEquipment.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.category && { category: params.category as any }),
        ...(params.status && { status: params.status as any }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { brand: { contains: params.search, mode: 'insensitive' } },
            { equipmentNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const e = await this.prisma.gymEquipment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Equipment not found');
    return e;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.gymEquipment.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
        lastMaintenanceDate: dto.lastMaintenanceDate ? new Date(dto.lastMaintenanceDate) : undefined,
        nextMaintenanceDate: dto.nextMaintenanceDate ? new Date(dto.nextMaintenanceDate) : undefined,
      },
    });
  }

  async recordMaintenance(user: AuthenticatedUser, id: string, dto: { cost: number; notes?: string; nextDate?: string }) {
    const e = await this.prisma.gymEquipment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Equipment not found');

    const nextMaintenanceDate = dto.nextDate ? new Date(dto.nextDate) :
      (e.maintenanceIntervalDays ? (() => { const d = new Date(); d.setDate(d.getDate() + e.maintenanceIntervalDays!); return d; })() : null);

    return this.prisma.gymEquipment.update({
      where: { id },
      data: {
        lastMaintenanceDate: new Date(),
        nextMaintenanceDate,
        totalMaintenanceCost: e.totalMaintenanceCost + dto.cost,
        status: 'AVAILABLE',
        notes: dto.notes ? (e.notes ? e.notes + '\n' + dto.notes : dto.notes) : e.notes,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.gymEquipment.update({ where: { id }, data: { isActive: false } });
  }

  async summary(user: AuthenticatedUser) {
    const [byCategory, byStatus, needsMaintenance] = await Promise.all([
      this.prisma.gymEquipment.groupBy({
        by: ['category'],
        where: { tenantId: user.tenantId, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.gymEquipment.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.gymEquipment.count({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          nextMaintenanceDate: { lte: new Date() },
        },
      }),
    ]);
    return { byCategory, byStatus, needsMaintenance };
  }
}
