import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDayTz } from '../../common/helpers/business-time.helper';

const ONLINE_MS = 5 * 60_000;
const MERCHANT = { role: { notIn: [UserRole.SUPER_ADMIN, UserRole.ADMIN_STAFF] }, tenant: { slug: { not: 'nafaa-system' } } };

/**
 * Who is using Nafaa right now: people active in the last 5 minutes and the
 * app they use, today's sign-ups with exact times and the latest sign-ins.
 * Presence comes from User.lastSeenAt (written by PresenceInterceptor).
 */
@Injectable()
export class AdminPresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async live() {
    const now = new Date();
    const since = new Date(now.getTime() - ONLINE_MS);
    const today = startOfDayTz(now);
    const userSelect = {
      id: true, fullName: true, email: true, phone: true, role: true, lastSeenAt: true, lastSeenVia: true, lastLoginAt: true,
      tenant: { select: { id: true, name: true, slug: true, businessType: true } },
    } as const;

    const [online, byApp, activeTodayUsers, activeTodayShops, signups, signIns, staffOnline] = await Promise.all([
      this.prisma.user.findMany({ where: { ...MERCHANT, lastSeenAt: { gte: since } }, select: userSelect, orderBy: { lastSeenAt: 'desc' }, take: 300 }),
      this.prisma.user.groupBy({ by: ['lastSeenVia'], where: { ...MERCHANT, lastSeenAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.user.count({ where: { ...MERCHANT, lastSeenAt: { gte: today } } }),
      this.prisma.tenant.count({ where: { slug: { not: 'nafaa-system' }, lastActiveAt: { gte: today } } }),
      this.prisma.tenant.findMany({
        where: { slug: { not: 'nafaa-system' }, createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true, name: true, slug: true, phone: true, businessType: true, status: true, createdAt: true, lastActiveAt: true,
          users: { where: { role: UserRole.OWNER }, take: 1, select: { fullName: true, email: true, phone: true } },
          onboardingProgress: { take: 1, select: { currentStep: true, isCompleted: true, isSkipped: true } },
        },
      }),
      this.prisma.user.findMany({ where: { ...MERCHANT, lastLoginAt: { not: null } }, select: userSelect, orderBy: { lastLoginAt: 'desc' }, take: 25 }),
      this.prisma.user.findMany({
        where: { role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN_STAFF] }, lastSeenAt: { gte: since } },
        select: { id: true, fullName: true, email: true, lastSeenAt: true },
      }),
    ]);

    const app = (via: string) => byApp.find((r) => r.lastSeenVia === via)?._count._all ?? 0;
    return {
      at: now,
      counts: {
        onlineUsers: online.length,
        onlineShops: new Set(online.map((u) => u.tenant.id)).size,
        web: app('web'),
        desktop: app('desktop'),
        mobile: app('mobile'),
        activeTodayUsers,
        activeTodayShops,
        signupsToday: signups.length,
      },
      online,
      signups: signups.map(({ users, onboardingProgress, ...t }) => ({ ...t, owner: users[0] ?? null, setup: onboardingProgress[0] ?? null })),
      signIns,
      staffOnline,
    };
  }
}
