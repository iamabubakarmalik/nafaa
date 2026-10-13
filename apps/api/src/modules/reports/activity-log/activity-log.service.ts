/**
 * Activity log: who did what and when.
 *
 *   list()  the latest 200 entries, as the mobile app reads them.
 *   feed()  filtered by period (business days), person, action, record type,
 *           branch and text, paged by cursor, with counts for the filters.
 *
 * Owners and staff not tied to a branch see the whole business. Staff tied
 * to a branch see entries by people of that branch and their own.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { businessDayKey, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ActivityFeedDto } from './dto/activity-feed.dto';

const DAY = 86_400_000;
const SYSTEM = 'system';

const USER_SELECT = { id: true, fullName: true, role: true, assignedShop: { select: { id: true, name: true } } } as const;

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clocks: TenantTimezoneService,
  ) {}

  list(user: AuthenticatedUser) {
    return this.prisma.activityLog.findMany({
      where: { tenantId: user.tenantId, ...this.branchOnly(user) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, fullName: true, role: true } } },
    });
  }

  /** Staff tied to a branch only see that branch's people and themselves. */
  private branchOnly(user: AuthenticatedUser): Prisma.ActivityLogWhereInput {
    const owner = user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN;
    if (owner || !user.shopId) return {};
    return { OR: [{ userId: user.id }, { user: { shopId: user.shopId } }] };
  }

  private async window(tenantId: string, from?: string, to?: string) {
    const { tz, dayStartHour: h } = await this.clocks.clock(tenantId);
    const start = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, h, 0, 0, tz); };
    const toKey = to ?? businessDayKey(new Date(), tz, h);
    if (from && from > toKey) throw new BadRequestException('Shuru ki date aakhri date ke baad hai');
    return { gte: from ? start(from) : undefined, lt: new Date(start(toKey).getTime() + DAY) };
  }

  async feed(user: AuthenticatedUser, q: ActivityFeedDto) {
    const limit = q.limit ?? 50;
    const owner = user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN;
    const w = await this.window(user.tenantId, q.from, q.to);
    const needle = q.search?.trim();

    // Period, branch and text: shared by the list and the filter counts.
    const base: Prisma.ActivityLogWhereInput[] = [
      { tenantId: user.tenantId, createdAt: { ...(w.gte && { gte: w.gte }), lt: w.lt } },
      this.branchOnly(user),
      ...(owner && q.shopId ? [{ user: { shopId: q.shopId } }] : []),
      ...(needle ? [{
        OR: [
          { description: { contains: needle, mode: 'insensitive' as const } },
          { user: { fullName: { contains: needle, mode: 'insensitive' as const } } },
          { entityId: needle },
        ],
      }] : []),
    ];
    const byUser: Prisma.ActivityLogWhereInput = q.userId ? (q.userId === SYSTEM ? { userId: null } : { userId: q.userId }) : {};
    const byAction: Prisma.ActivityLogWhereInput = q.action ? { action: q.action } : {};
    const byEntity: Prisma.ActivityLogWhereInput = q.entity ? { entityType: q.entity } : {};
    const where: Prisma.ActivityLogWhereInput = { AND: [...base, byUser, byAction, byEntity] };

    const cursor = this.parseCursor(q.cursor);
    const pageWhere: Prisma.ActivityLogWhereInput = cursor
      ? { AND: [where, { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] }] }
      : where;

    const [rows, total, users, actions, entities] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: pageWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true, action: true, entityType: true, entityId: true, description: true, metadata: true,
          ipAddress: true, userAgent: true, createdAt: true, user: { select: USER_SELECT },
        },
      }),
      this.prisma.activityLog.count({ where }),
      // Each filter's counts leave out its own choice so the other options stay visible.
      this.prisma.activityLog.groupBy({ by: ['userId'], where: { AND: [...base, byAction, byEntity] }, _count: { _all: true } }),
      this.prisma.activityLog.groupBy({ by: ['action'], where: { AND: [...base, byUser, byEntity] }, _count: { _all: true } }),
      this.prisma.activityLog.groupBy({ by: ['entityType'], where: { AND: [...base, byUser, byAction] }, _count: { _all: true } }),
    ]);

    const people = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId, id: { in: users.map((u) => u.userId).filter((x): x is string => !!x) } },
      select: USER_SELECT,
    });
    const named = new Map(people.map((p) => [p.id, p]));
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: rows.length > limit && last ? `${last.createdAt.toISOString()}_${last.id}` : null,
      total,
      facets: {
        users: users
          .map((u) => ({ id: u.userId ?? SYSTEM, name: u.userId ? named.get(u.userId)?.fullName ?? 'Purana user' : 'System', role: u.userId ? named.get(u.userId)?.role ?? null : null, count: u._count._all }))
          .sort((a, b) => b.count - a.count),
        actions: actions.map((a) => ({ key: a.action, count: a._count._all })).sort((a, b) => b.count - a.count),
        entities: entities.filter((e) => e.entityType).map((e) => ({ key: e.entityType!, count: e._count._all })).sort((a, b) => b.count - a.count),
      },
    };
  }

  private parseCursor(raw?: string): { at: Date; id: string } | null {
    if (!raw) return null;
    const cut = raw.indexOf('_');
    const at = new Date(raw.slice(0, cut));
    const id = raw.slice(cut + 1);
    if (cut < 0 || Number.isNaN(at.getTime()) || !id) throw new BadRequestException('Ghalat cursor');
    return { at, id };
  }
}
