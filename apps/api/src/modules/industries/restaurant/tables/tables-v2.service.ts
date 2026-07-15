import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ReserveTableDto, UpsertTableDto } from './dto/upsert-table.dto';

@Injectable()
export class TablesV2Service {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertTableDto) {
    const dup = await this.prisma.restaurantTableV2.findFirst({ where: { tenantId: user.tenantId, tableNumber: dto.tableNumber } });
    if (dup) throw new BadRequestException(`Table "${dto.tableNumber}" already exists`);
    return this.prisma.restaurantTableV2.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { status?: string; section?: string; shopId?: string }) {
    return this.prisma.restaurantTableV2.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.status && { status: params.status as any }),
        ...(params.section && { section: params.section }),
        ...(params.shopId && { shopId: params.shopId }),
      },
      orderBy: [{ section: 'asc' }, { tableNumber: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.restaurantTableV2.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        orders: { where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }, include: { items: true }, take: 5 },
      },
    });
    if (!t) throw new NotFoundException('Table not found');
    return t;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertTableDto) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table not found');
    return this.prisma.restaurantTableV2.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table not found');
    return this.prisma.restaurantTableV2.update({ where: { id }, data: { isActive: false } });
  }

  async changeStatus(user: AuthenticatedUser, id: string, status: string) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table not found');
    const patch: any = { status };
    if (status === 'OCCUPIED') patch.occupiedAt = new Date();
    if (status === 'AVAILABLE') {
      patch.occupiedAt = null;
      patch.currentOrderId = null;
      patch.reservedFor = null;
      patch.reservedByName = null;
      patch.reservedByPhone = null;
    }
    return this.prisma.restaurantTableV2.update({ where: { id }, data: patch });
  }

  async reserve(user: AuthenticatedUser, id: string, dto: ReserveTableDto) {
    const t = await this.prisma.restaurantTableV2.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Table not found');
    if (!t.isReservable) throw new BadRequestException('Table is not reservable');
    return this.prisma.restaurantTableV2.update({
      where: { id },
      data: {
        status: 'RESERVED',
        reservedAt: new Date(),
        reservedFor: new Date(dto.reservedFor),
        reservedByName: dto.reservedByName,
        reservedByPhone: dto.reservedByPhone,
        reservationNote: dto.reservationNote,
      },
    });
  }

  async cancelReservation(user: AuthenticatedUser, id: string) {
    return this.changeStatus(user, id, 'AVAILABLE');
  }

  async layout(user: AuthenticatedUser, shopId?: string) {
    const tables = await this.list(user, { shopId });
    const bySection: Record<string, any[]> = {};
    for (const t of tables) {
      const s = t.section || 'Main';
      if (!bySection[s]) bySection[s] = [];
      bySection[s].push(t);
    }
    return {
      sections: Object.entries(bySection).map(([section, items]) => ({ section, tables: items })),
      totalTables: tables.length,
      byStatus: {
        AVAILABLE: tables.filter((t) => t.status === 'AVAILABLE').length,
        OCCUPIED: tables.filter((t) => t.status === 'OCCUPIED').length,
        RESERVED: tables.filter((t) => t.status === 'RESERVED').length,
        CLEANING: tables.filter((t) => t.status === 'CLEANING').length,
      },
    };
  }
}
