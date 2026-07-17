import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertRouteDto } from './dto/upsert-route.dto';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertRouteDto) {
    const count = await this.prisma.dairyRoute.count({ where: { tenantId: user.tenantId } });
    const routeNumber = `RT-${String(count + 1).padStart(3, '0')}`;
    return this.prisma.dairyRoute.create({
      data: { tenantId: user.tenantId, routeNumber, ...dto },
    });
  }

  async list(user: AuthenticatedUser, params: { slot?: string; status?: string; active?: boolean; search?: string }) {
    return this.prisma.dairyRoute.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.slot && { slot: params.slot as any }),
        ...(params.status && { status: params.status as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { routeNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { areaName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route not found');

    const customers = await this.prisma.dairyCustomer.findMany({
      where: { routeId: id, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    let assignedStaff = null;
    if (r.assignedStaffId) {
      assignedStaff = await this.prisma.staff.findUnique({ where: { id: r.assignedStaffId } });
    }

    return { ...r, customers, assignedStaff };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertRouteDto) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route not found');
    return this.prisma.dairyRoute.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route not found');
    return this.prisma.dairyRoute.update({ where: { id }, data: { isActive: false } });
  }

  async recalculateStats(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route not found');

    const customers = await this.prisma.dairyCustomer.findMany({
      where: { routeId: id, status: 'ACTIVE' },
    });

    const totalCustomers = customers.length;
    const totalDailyLiters = customers.reduce((s, c) => s + c.morningQuantity + c.eveningQuantity, 0);

    return this.prisma.dairyRoute.update({
      where: { id },
      data: { totalCustomers, totalDailyLiters },
    });
  }

  async todayDeliveries(user: AuthenticatedUser, id: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        routeId: id,
        deliveryDate: { gte: start, lte: end },
      },
      include: { customer: true },
      orderBy: { deliveryDate: 'asc' },
    });
  }
}
