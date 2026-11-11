import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminSystemErrorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: { status?: string; source?: string; search?: string; sort?: string; page?: string; limit?: string }) {
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const page = Math.max(1, Number(q.page) || 1);
    const term = q.search?.trim();
    const where: Prisma.ServerErrorWhereInput = {
      ...(q.status === 'resolved' ? { resolvedAt: { not: null } } : q.status === 'all' ? {} : { resolvedAt: null }),
      ...(q.source === 'http' || q.source === 'job' ? { source: q.source } : {}),
      ...(term ? { OR: [{ message: { contains: term, mode: 'insensitive' } }, { route: { contains: term, mode: 'insensitive' } }] } : {}),
    };
    const orderBy: Prisma.ServerErrorOrderByWithRelationInput =
      q.sort === 'count' ? { count: 'desc' } : q.sort === 'first' ? { firstSeenAt: 'desc' } : { lastSeenAt: 'desc' };
    const since = new Date(Date.now() - DAY);
    const [items, total, open, last24h, jobs] = await Promise.all([
      this.prisma.serverError.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        select: { id: true, source: true, method: true, route: true, status: true, message: true, count: true, firstSeenAt: true, lastSeenAt: true, resolvedAt: true, lastTenantId: true },
      }),
      this.prisma.serverError.count({ where }),
      this.prisma.serverError.count({ where: { resolvedAt: null } }),
      this.prisma.serverError.count({ where: { lastSeenAt: { gte: since } } }),
      this.prisma.serverError.count({ where: { resolvedAt: null, source: 'job' } }),
    ]);
    const tenantIds = [...new Set(items.map((i) => i.lastTenantId).filter((x): x is string => !!x))];
    const tenants = tenantIds.length ? await this.prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }) : [];
    const names = new Map(tenants.map((t) => [t.id, t.name]));
    return {
      items: items.map((i) => ({ ...i, message: i.message.split('\n')[0].slice(0, 300), lastTenantName: i.lastTenantId ? names.get(i.lastTenantId) ?? null : null })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: { open, last24h, openJobErrors: jobs },
    };
  }

  async get(id: string) {
    const e = await this.prisma.serverError.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Error not found');
    const [tenant, user, resolvedBy] = await Promise.all([
      e.lastTenantId ? this.prisma.tenant.findUnique({ where: { id: e.lastTenantId }, select: { id: true, name: true } }) : null,
      e.lastUserId ? this.prisma.user.findUnique({ where: { id: e.lastUserId }, select: { id: true, fullName: true, email: true } }) : null,
      e.resolvedById ? this.prisma.user.findUnique({ where: { id: e.resolvedById }, select: { id: true, fullName: true } }) : null,
    ]);
    return { ...e, lastTenant: tenant, lastUser: user, resolvedBy };
  }

  async setResolved(id: string, userId: string, resolved: boolean) {
    const found = await this.prisma.serverError.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('Error not found');
    return this.prisma.serverError.update({
      where: { id },
      data: resolved ? { resolvedAt: new Date(), resolvedById: userId } : { resolvedAt: null, resolvedById: null },
      select: { id: true, resolvedAt: true },
    });
  }

  async resolveAll(userId: string) {
    const r = await this.prisma.serverError.updateMany({ where: { resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: userId } });
    return { resolved: r.count };
  }
}
