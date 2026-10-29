/**
 * Routes (beats): which customers a booker visits on which weekdays, in
 * which order, and which godown serves them.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { AssignCustomersDto, SaveRouteDto } from '../dto/setup.dto';
import {
  CUSTOMER_CARD, assertShop, assertUser, checkKey, dayStart, shiftKey, shopNames, todayKey, userNames, weekdayOfKey,
} from '../distribution.support';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  async list(user: AuthenticatedUser, q: { bookerId?: string; active?: string } = {}) {
    const tenantId = user.tenantId;
    const routes = await this.prisma.distRoute.findMany({
      where: { tenantId, ...(q.bookerId && { bookerId: q.bookerId }), ...(q.active === 'true' && { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const [counts, users, shops] = await Promise.all([
      this.prisma.customer.groupBy({ by: ['routeId'], where: { tenantId, routeId: { in: routes.map((r) => r.id) }, isActive: true }, _count: { _all: true } }),
      userNames(this.prisma, tenantId, routes.flatMap((r) => [r.bookerId, r.deliveryUserId])),
      shopNames(this.prisma, tenantId, routes.map((r) => r.shopId)),
    ]);
    const byRoute = new Map(counts.map((c) => [c.routeId, c._count._all]));
    return routes.map((r) => ({
      ...r,
      customerCount: byRoute.get(r.id) ?? 0,
      bookerName: r.bookerId ? users.get(r.bookerId) ?? null : null,
      deliveryUserName: r.deliveryUserId ? users.get(r.deliveryUserId) ?? null : null,
      shopName: r.shopId ? shops.get(r.shopId) ?? null : null,
    }));
  }

  async get(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const route = await this.prisma.distRoute.findFirst({ where: { id, tenantId } });
    if (!route) throw new NotFoundException('Route nahi mila');
    const [customers, users, shops] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, routeId: id, isActive: true }, select: CUSTOMER_CARD, orderBy: [{ routeSeq: 'asc' }, { name: 'asc' }] }),
      userNames(this.prisma, tenantId, [route.bookerId, route.deliveryUserId]),
      shopNames(this.prisma, tenantId, [route.shopId]),
    ]);
    return {
      ...route,
      bookerName: route.bookerId ? users.get(route.bookerId) ?? null : null,
      deliveryUserName: route.deliveryUserId ? users.get(route.deliveryUserId) ?? null : null,
      shopName: route.shopId ? shops.get(route.shopId) ?? null : null,
      customers,
    };
  }

  async create(user: AuthenticatedUser, dto: SaveRouteDto) {
    const tenantId = user.tenantId;
    await this.checkRefs(tenantId, dto);
    await this.assertNameFree(tenantId, dto.name);
    return this.prisma.distRoute.create({
      data: {
        tenantId, name: dto.name.trim(), code: dto.code?.trim() || null, area: dto.area?.trim() || null,
        shopId: dto.shopId || null, visitDays: [...new Set(dto.visitDays ?? [])].sort((a, b) => a - b),
        bookerId: dto.bookerId || null, deliveryUserId: dto.deliveryUserId || null,
        isActive: dto.isActive ?? true, sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<SaveRouteDto>) {
    const tenantId = user.tenantId;
    const route = await this.prisma.distRoute.findFirst({ where: { id, tenantId } });
    if (!route) throw new NotFoundException('Route nahi mila');
    await this.checkRefs(tenantId, dto);
    if (dto.name && dto.name.trim() !== route.name) await this.assertNameFree(tenantId, dto.name, id);
    return this.prisma.distRoute.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code: dto.code?.trim() || null }),
        ...(dto.area !== undefined && { area: dto.area?.trim() || null }),
        ...(dto.shopId !== undefined && { shopId: dto.shopId || null }),
        ...(dto.visitDays !== undefined && { visitDays: [...new Set(dto.visitDays)].sort((a, b) => a - b) }),
        ...(dto.bookerId !== undefined && { bookerId: dto.bookerId || null }),
        ...(dto.deliveryUserId !== undefined && { deliveryUserId: dto.deliveryUserId || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  /** Deletes a route with no orders; one with orders is switched off. Its customers come off it either way. */
  async remove(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const route = await this.prisma.distRoute.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!route) throw new NotFoundException('Route nahi mila');
    const orders = await this.prisma.salesOrder.count({ where: { tenantId, routeId: id } });
    return this.prisma.$transaction(async (tx) => {
      const freed = await tx.customer.updateMany({ where: { tenantId, routeId: id }, data: { routeId: null, routeSeq: null } });
      if (orders) {
        await tx.distRoute.update({ where: { id }, data: { isActive: false } });
        return { deleted: false, deactivated: true, customersFreed: freed.count };
      }
      await tx.distRoute.delete({ where: { id } });
      return { deleted: true, deactivated: false, customersFreed: freed.count };
    });
  }

  /** Puts customers on the route in the given order (after the current ones, or replacing them). */
  async assignCustomers(user: AuthenticatedUser, id: string, dto: AssignCustomersDto) {
    const tenantId = user.tenantId;
    const route = await this.prisma.distRoute.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!route) throw new NotFoundException('Route nahi mila');
    const ids = [...new Set(dto.customerIds)];
    const found = await this.prisma.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
    if (found.length !== ids.length) throw new BadRequestException('Kuch customers nahi mile');
    await this.prisma.$transaction(async (tx) => {
      let start = 0;
      if (dto.replace) {
        await tx.customer.updateMany({ where: { tenantId, routeId: id, id: { notIn: ids } }, data: { routeId: null, routeSeq: null } });
      } else {
        const last = await tx.customer.aggregate({ where: { tenantId, routeId: id, id: { notIn: ids } }, _max: { routeSeq: true } });
        start = last._max.routeSeq ?? 0;
      }
      for (let i = 0; i < ids.length; i++) {
        await tx.customer.update({ where: { id: ids[i] }, data: { routeId: id, routeSeq: start + i + 1 } });
      }
    }, { timeout: 60_000 });
    return this.get(user, id);
  }

  async removeCustomer(user: AuthenticatedUser, id: string, customerId: string) {
    const res = await this.prisma.customer.updateMany({ where: { tenantId: user.tenantId, id: customerId, routeId: id }, data: { routeId: null, routeSeq: null } });
    if (!res.count) throw new NotFoundException('Customer is route par nahi');
    return { removed: true };
  }

  /**
   * Routes due on a business day (by weekday), with how far the day has got:
   * customers, visits and orders so far.
   */
  async day(user: AuthenticatedUser, q: { date?: string; bookerId?: string }) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const key = checkKey(q.date) ?? todayKey(clock);
    const weekday = weekdayOfKey(key);
    const gte = dayStart(key, clock);
    const lt = dayStart(shiftKey(key, 1), clock);
    const routes = await this.prisma.distRoute.findMany({
      where: { tenantId, isActive: true, visitDays: { has: weekday }, ...(q.bookerId && { bookerId: q.bookerId }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const ids = routes.map((r) => r.id);
    const [customers, visits, orders, users] = await Promise.all([
      this.prisma.customer.groupBy({ by: ['routeId'], where: { tenantId, routeId: { in: ids }, isActive: true }, _count: { _all: true } }),
      this.prisma.distVisit.findMany({ where: { tenantId, routeId: { in: ids }, checkInAt: { gte, lt } }, select: { routeId: true, customerId: true } }),
      this.prisma.salesOrder.groupBy({ by: ['routeId'], where: { tenantId, routeId: { in: ids }, bookedAt: { gte, lt }, status: { not: 'CANCELLED' } }, _count: { _all: true }, _sum: { total: true } }),
      userNames(this.prisma, tenantId, routes.flatMap((r) => [r.bookerId, r.deliveryUserId])),
    ]);
    const cMap = new Map(customers.map((c) => [c.routeId, c._count._all]));
    const oMap = new Map(orders.map((o) => [o.routeId, o]));
    return {
      date: key, weekday,
      routes: routes.map((r) => {
        const visited = new Set(visits.filter((v) => v.routeId === r.id).map((v) => v.customerId));
        return {
          id: r.id, name: r.name, code: r.code, area: r.area, shopId: r.shopId,
          bookerId: r.bookerId, bookerName: r.bookerId ? users.get(r.bookerId) ?? null : null,
          deliveryUserId: r.deliveryUserId, deliveryUserName: r.deliveryUserId ? users.get(r.deliveryUserId) ?? null : null,
          customers: cMap.get(r.id) ?? 0, visited: visited.size,
          orders: oMap.get(r.id)?._count._all ?? 0, orderValue: oMap.get(r.id)?._sum.total ?? 0,
        };
      }),
    };
  }

  private async checkRefs(tenantId: string, dto: Partial<SaveRouteDto>) {
    if (dto.shopId) await assertShop(this.prisma, tenantId, dto.shopId);
    if (dto.bookerId) await assertUser(this.prisma, tenantId, dto.bookerId, 'Booker');
    if (dto.deliveryUserId) await assertUser(this.prisma, tenantId, dto.deliveryUserId, 'Delivery user');
  }

  private async assertNameFree(tenantId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.distRoute.findFirst({
      where: { tenantId, name: { equals: name.trim(), mode: 'insensitive' }, ...(exceptId && { NOT: { id: exceptId } }) },
      select: { id: true },
    });
    if (clash) throw new BadRequestException('Is naam ka route pehle se hai');
  }
}
