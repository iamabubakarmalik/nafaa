import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateTableDto } from './dto/create-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateTableDto) {
    const existing = await this.prisma.restaurantTable.findFirst({
      where: { tenantId: user.tenantId, tableNumber: dto.tableNumber },
    });
    if (existing) {
      throw new ConflictException(`Table ${dto.tableNumber} already exists`);
    }

    return this.prisma.restaurantTable.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
      },
    });
  }

  async list(user: AuthenticatedUser, shopId?: string) {
    return this.prisma.restaurantTable.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(shopId && { shopId }),
      },
      orderBy: [{ floor: 'asc' }, { tableNumber: 'asc' }],
    });
  }

  async stats(user: AuthenticatedUser) {
    const [total, available, occupied, reserved] = await Promise.all([
      this.prisma.restaurantTable.count({
        where: { tenantId: user.tenantId, isActive: true },
      }),
      this.prisma.restaurantTable.count({
        where: { tenantId: user.tenantId, isActive: true, status: 'AVAILABLE' },
      }),
      this.prisma.restaurantTable.count({
        where: { tenantId: user.tenantId, isActive: true, status: 'OCCUPIED' },
      }),
      this.prisma.restaurantTable.count({
        where: { tenantId: user.tenantId, isActive: true, status: 'RESERVED' },
      }),
    ]);

    return { total, available, occupied, reserved };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const table = await this.prisma.restaurantTable.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async update(user: AuthenticatedUser, id: string, data: Partial<CreateTableDto>) {
    await this.findOne(user, id);
    return this.prisma.restaurantTable.update({
      where: { id },
      data,
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: TableStatus, saleId?: string) {
    await this.findOne(user, id);
    return this.prisma.restaurantTable.update({
      where: { id },
      data: {
        status,
        currentSaleId: status === 'OCCUPIED' ? saleId : null,
        occupiedAt: status === 'OCCUPIED' ? new Date() : null,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const table = await this.findOne(user, id);
    if (table.status === 'OCCUPIED') {
      throw new BadRequestException('Cannot delete occupied table');
    }
    await this.prisma.restaurantTable.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }
}
