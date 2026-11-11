/**
 * Super-admin view of distribution use, for per-booker pricing: which
 * businesses have it on, their plan, and how many booker logins they run.
 * Read only; billing flows are not touched.
 *
 * A booker login is an active, non-owner user holding
 * distribution.orders.book. "Active bookers" also booked an order in the
 * last 30 days.
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../admin/common/super-admin.guard';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminArea } from '../../admin/access/admin-access.decorators';

@ApiTags('Admin - Distribution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('plans')
@Controller('admin/distribution')
export class DistributionAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('usage')
  async usage(
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('onlyOn') onlyOn?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const settings = await this.prisma.distributionSettings.findMany({
      where: {
        ...(tenantId ? { tenantId } : { enabled: true }),
        tenant: {
          slug: { not: 'nafaa-system' },
          ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
        },
      },
      select: { tenantId: true, enabled: true, updatedAt: true, tenant: { select: { name: true, status: true, businessType: true } } },
    });
    const ids = settings.map((s) => s.tenantId);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [bookers, active, orders, subs] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['tenantId'],
        where: { tenantId: { in: ids }, isActive: true, role: { notIn: ['OWNER', 'SUPER_ADMIN'] }, permissions: { has: PERMISSIONS.DISTRIBUTION_ORDERS_BOOK } },
        _count: { _all: true },
      }),
      this.prisma.salesOrder.findMany({ where: { tenantId: { in: ids }, bookedAt: { gte: since } }, select: { tenantId: true, bookedById: true }, distinct: ['tenantId', 'bookedById'] }),
      this.prisma.salesOrder.groupBy({ by: ['tenantId'], where: { tenantId: { in: ids }, bookedAt: { gte: since }, status: { not: 'CANCELLED' } }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.subscription.findMany({
        where: { tenantId: { in: ids }, status: { in: ['TRIAL', 'ACTIVE'] } },
        orderBy: { createdAt: 'desc' },
        select: { tenantId: true, status: true, plan: { select: { name: true, slug: true, featureDistribution: true } } },
      }),
    ]);
    const bMap = new Map(bookers.map((b) => [b.tenantId, b._count._all]));
    const oMap = new Map(orders.map((o) => [o.tenantId, o]));
    const sMap = new Map<string, (typeof subs)[number]>();
    for (const s of subs) if (!sMap.has(s.tenantId)) sMap.set(s.tenantId, s);
    const rows = settings.map((s) => ({
      tenantId: s.tenantId, name: s.tenant.name, status: s.tenant.status, businessType: s.tenant.businessType, enabled: s.enabled,
      plan: sMap.get(s.tenantId)?.plan ?? null, subscriptionStatus: sMap.get(s.tenantId)?.status ?? null,
      bookerLogins: bMap.get(s.tenantId) ?? 0,
      activeBookers30d: active.filter((a) => a.tenantId === s.tenantId).length,
      orders30d: oMap.get(s.tenantId)?._count._all ?? 0,
      orderValue30d: Math.round((oMap.get(s.tenantId)?._sum.total ?? 0) * 100) / 100,
    })).sort((a, b) => b.bookerLogins - a.bookerLogins);
    const totals = {
      tenants: rows.length,
      bookerLogins: rows.reduce((s, r) => s + r.bookerLogins, 0),
      switchedOn: rows.filter((r) => r.enabled).length,
      orders30d: rows.reduce((s, r) => s + r.orders30d, 0),
      orderValue30d: Math.round(rows.reduce((s, r) => s + r.orderValue30d, 0)),
    };
    // Without paging params the full list is returned, as before.
    if (!page && !limit) return { tenants: rows, totals };
    const size = Math.min(100, Math.max(1, Number(limit) || 25));
    const current = Math.max(1, Number(page) || 1);
    const filtered = onlyOn === 'true' ? rows.filter((r) => r.enabled) : rows;
    return {
      tenants: filtered.slice((current - 1) * size, current * size),
      totals,
      meta: { page: current, limit: size, total: filtered.length, totalPages: Math.ceil(filtered.length / size) },
    };
  }
}
