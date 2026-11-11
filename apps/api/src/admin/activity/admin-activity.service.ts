import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { endOfDayTz, startOfDayTz, subDaysTz } from '../../common/helpers/business-time.helper';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Without `paged` this returns the plain list (old behavior). With it, one
   * page plus counts, searched on the text, person and shop, filtered by
   * entity type, admin actions and a Pakistan-time day range.
   */
  async list(params: {
    tenantId?: string; page?: number; limit?: number; paged?: boolean;
    search?: string; entityType?: string; adminOnly?: boolean; from?: string; to?: string;
  }) {
    const limit = Math.min(100, Math.max(1, params.limit ?? 50));
    const page = Math.max(1, params.page ?? 1);
    const include = {
      user: { select: { id: true, fullName: true, role: true } },
      tenant: { select: { id: true, name: true } },
    };
    if (!params.paged) {
      return this.prisma.activityLog.findMany({
        where: params.tenantId ? { tenantId: params.tenantId } : {},
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include,
      });
    }

    const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (ok(params.from)) createdAt.gte = startOfDayTz(new Date(`${params.from}T12:00:00+05:00`));
    if (ok(params.to)) createdAt.lte = endOfDayTz(new Date(`${params.to}T12:00:00+05:00`));
    const term = params.search?.trim();
    const base: Prisma.ActivityLogWhereInput = { tenant: { slug: { not: 'nafaa-system' } } };
    const where: Prisma.ActivityLogWhereInput = {
      ...base,
      ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.adminOnly ? { action: { startsWith: 'ADMIN_' } } : {}),
      ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
      ...(term ? {
        OR: [
          { description: { contains: term, mode: 'insensitive' } },
          { action: { contains: term, mode: 'insensitive' } },
          { user: { fullName: { contains: term, mode: 'insensitive' } } },
          { tenant: { name: { contains: term, mode: 'insensitive' } } },
        ],
      } : {}),
    };
    const todayStart = startOfDayTz();
    const [items, total, all, today, week, types] = await Promise.all([
      this.prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include }),
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.count({ where: base }),
      this.prisma.activityLog.count({ where: { ...base, createdAt: { gte: todayStart } } }),
      this.prisma.activityLog.count({ where: { ...base, createdAt: { gte: subDaysTz(todayStart, 6) } } }),
      this.prisma.activityLog.groupBy({ by: ['entityType'], where: { ...base, entityType: { not: null } }, _count: { _all: true }, orderBy: { _count: { entityType: 'desc' } }, take: 40 }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: { total: all, today, last7d: week, entityTypes: types.map((t) => ({ type: t.entityType as string, count: t._count._all })) },
    };
  }
}
