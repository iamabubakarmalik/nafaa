/**
 * Delivery routes: a rider's round (area, slot, vehicle) that groups home
 * delivery customers. A route is switched off, never deleted; its
 * customers and their history stay.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DairyDeliverySlot, DairyRouteStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { cleanInput, dayEnd, dayStart, nextNumbered, r2 } from '../dairy-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpdateRouteDto, UpsertRouteDto } from './dto/upsert-route.dto';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Branch and rider must belong to this shop. */
  private async check(tenantId: string, dto: UpdateRouteDto) {
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Route ka naam likhein');
    if (dto.shopId) {
      const shop = await this.prisma.shop.findFirst({ where: { id: dto.shopId, tenantId }, select: { id: true } });
      if (!shop) throw new BadRequestException('Branch nahi mili');
    }
    if (dto.assignedStaffId) {
      const staff = await this.prisma.staff.findFirst({ where: { id: dto.assignedStaffId, tenantId }, select: { id: true } });
      if (!staff) throw new BadRequestException('Rider (staff) nahi mila');
    }
  }

  async create(user: AuthenticatedUser, dto: UpsertRouteDto) {
    await this.check(user.tenantId, dto);
    return nextNumbered(
      () => this.prisma.dairyRoute.count({ where: { tenantId: user.tenantId } }),
      'RT-', 3,
      (routeNumber) => this.prisma.dairyRoute.create({ data: { ...cleanInput(dto), name: dto.name.trim(), tenantId: user.tenantId, routeNumber } }),
    );
  }

  async list(user: AuthenticatedUser, params: { slot?: string; status?: string; active?: boolean; search?: string }) {
    const search = params.search?.trim();
    return this.prisma.dairyRoute.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.slot && params.slot in DairyDeliverySlot && { slot: params.slot as DairyDeliverySlot }),
        ...(params.status && params.status in DairyRouteStatus && { status: params.status as DairyRouteStatus }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(search && {
          OR: [
            { routeNumber: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { areaName: { contains: search, mode: 'insensitive' } },
            { vehicleNumber: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route nahi mila');

    const customers = await this.prisma.dairyCustomer.findMany({
      where: { tenantId: user.tenantId, routeId: id, status: { not: 'CLOSED' } },
      orderBy: { name: 'asc' },
    });
    const assignedStaff = r.assignedStaffId
      ? await this.prisma.staff.findFirst({ where: { id: r.assignedStaffId, tenantId: user.tenantId } })
      : null;
    return { ...r, customers, assignedStaff };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateRouteDto) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route nahi mila');
    await this.check(user.tenantId, dto);
    return this.prisma.dairyRoute.update({ where: { id }, data: { ...cleanInput(dto), ...(dto.name !== undefined && { name: dto.name.trim() }) } });
  }

  /** Switches the route off; customers keep it until moved. */
  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route nahi mila');
    return this.prisma.dairyRoute.update({ where: { id }, data: { isActive: false, status: 'DISCONTINUED' } });
  }

  async recalculateStats(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.dairyRoute.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Route nahi mila');
    const customers = await this.prisma.dairyCustomer.findMany({
      where: { tenantId: user.tenantId, routeId: id, status: 'ACTIVE' },
      select: { morningQuantity: true, eveningQuantity: true },
    });
    return this.prisma.dairyRoute.update({
      where: { id },
      data: { totalCustomers: customers.length, totalDailyLiters: r2(customers.reduce((s, c) => s + c.morningQuantity + c.eveningQuantity, 0)) },
    });
  }

  async todayDeliveries(user: AuthenticatedUser, id: string) {
    return this.prisma.dairyDelivery.findMany({
      where: { tenantId: user.tenantId, routeId: id, deliveryDate: { gte: dayStart(), lte: dayEnd() } },
      include: { customer: true },
      orderBy: [{ slot: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
