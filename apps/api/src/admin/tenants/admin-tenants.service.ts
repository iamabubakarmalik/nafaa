import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { apiMessage, notificationText } from '../../common/i18n/api-message';
import { DEFAULT_TZ, addDaysTz, dateKeyTz, startOfDayTz, subDaysTz } from '../../common/helpers/business-time.helper';
import { invalidateEntitlements } from '../../modules/billing/entitlements/entitlements.service';

@Injectable()
export class AdminTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    search?: string;
    status?: TenantStatus;
    /** RETAIL also matches businesses that never answered (empty list). */
    model?: string;
    /** Tenant.businessType; 'NONE' matches shops that have not chosen one. */
    industry?: string;
    /** online (5 min), today, week, idle7, idle30, never */
    activity?: string;
    sort?: 'newest' | 'oldest' | 'name' | 'active';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TenantWhereInput = {
      slug: { not: 'nafaa-system' },
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.model === 'RETAIL'
        ? { AND: [{ OR: [{ businessModels: { has: 'RETAIL' } }, { businessModels: { isEmpty: true } }] }] }
        : params.model
          ? { businessModels: { has: params.model } }
          : {}),
      ...(params.industry === 'NONE'
        ? { businessType: null }
        : params.industry
          ? { businessType: params.industry }
          : {}),
    };
    const activity = tenantActivityWhere(params.activity);
    if (Object.keys(activity).length) where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), activity];
    const orderBy: Prisma.TenantOrderByWithRelationInput | Prisma.TenantOrderByWithRelationInput[] =
      params.sort === 'oldest' ? { createdAt: 'asc' }
        : params.sort === 'name' ? { name: 'asc' }
          : params.sort === 'active' ? [{ lastActiveAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
            : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              sales: true,
              customers: true,
            },
          },
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL', 'PENDING_PAYMENT'] } },
            include: { plan: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    // The plan each shop is really on (a newer unpaid renewal bill is not it), its state and end.
    const subs = items.length ? await this.prisma.subscription.findMany({
      where: { tenantId: { in: items.map((t) => t.id) }, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'EXPIRED'] } },
      orderBy: { createdAt: 'desc' },
      select: { tenantId: true, status: true, trialEndsAt: true, currentPeriodEnd: true, plan: { select: { name: true, slug: true, isFree: true } } },
    }) : [];
    const RANK: Record<string, number> = { ACTIVE: 0, TRIAL: 1, PAST_DUE: 2, EXPIRED: 3 };
    const now = new Date();
    const billingOf = (tenantId: string) => {
      const sub = subs.filter((x) => x.tenantId === tenantId).sort((a, b) => RANK[a.status] - RANK[b.status])[0];
      if (!sub) return { planName: null, planSlug: null, state: 'expired', endsAt: null };
      const endsAt = sub.status === 'TRIAL' ? sub.trialEndsAt : sub.currentPeriodEnd;
      const state = sub.plan.isFree ? 'free' : endsAt && endsAt > now && (sub.status === 'ACTIVE' || sub.status === 'TRIAL') ? (sub.status === 'TRIAL' ? 'trial' : 'active') : 'expired';
      return { planName: sub.plan.name, planSlug: sub.plan.slug, state, endsAt: sub.plan.isFree ? null : endsAt };
    };
    const withBilling = items.map((t) => ({
      ...t,
      billing: { ...billingOf(t.id), paused: !!t.pausedAt && (!t.pausedUntil || t.pausedUntil > now), pausedUntil: t.pausedUntil, pauseReason: t.pauseReason },
    }));

    return {
      items: withBilling,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            lastSeenAt: true,
            lastSeenVia: true,
            createdAt: true,
          },
          orderBy: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }],
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        referredBy: { select: { id: true, name: true, referralCode: true } },
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
            customers: true,
            suppliers: true,
            shops: true,
            referredTenants: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const [salesAgg, expensesAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId: id, status: 'COMPLETED' },
        _sum: { total: true, costOfGoods: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId: id, status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    return {
      tenant,
      stats: {
        totalRevenue: salesAgg._sum.total ?? 0,
        totalCogs: salesAgg._sum.costOfGoods ?? 0,
        totalExpenses: expensesAgg._sum.amount ?? 0,
      },
    };
  }

  /**
   * Everything the Shop 360 page shows besides the profile: health score,
   * 30-day sales by Pakistan day, branches, devices, online channels,
   * couriers, setup progress and a timeline of shop and admin activity.
   */
  async insights(id: string) {
    const exists = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, createdAt: true } });
    if (!exists) throw new NotFoundException('Tenant not found');
    const now = new Date();
    const from30 = startOfDayTz(subDaysTz(now, 29));
    const week = subDaysTz(now, 7);
    const tz = Prisma.raw(`'${DEFAULT_TZ.replace(/'/g, '')}'`);

    const [daily, lastSale, sales7, activeUsers7, shops, devices, integrations, couriers, onlineOrders30, onboarding, activity, adminActions, products, paidSub] = await Promise.all([
      this.prisma.$queryRaw<Array<{ day: string; bills: bigint; total: number | null }>>`
        SELECT to_char("soldAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day, COUNT(*)::bigint AS bills, SUM(total)::float8 AS total
        FROM "Sale" WHERE "tenantId" = ${id} AND status = 'COMPLETED' AND "soldAt" >= ${from30}
        GROUP BY 1`,
      this.prisma.sale.findFirst({ where: { tenantId: id, status: 'COMPLETED' }, orderBy: { soldAt: 'desc' }, select: { soldAt: true } }),
      this.prisma.sale.aggregate({ where: { tenantId: id, status: 'COMPLETED', soldAt: { gte: week } }, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.user.count({ where: { tenantId: id, lastLoginAt: { gte: week } } }),
      this.prisma.shop.findMany({ where: { tenantId: id }, select: { id: true, name: true, isMain: true, isActive: true, createdAt: true }, orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }] }),
      this.prisma.mobileDevice.findMany({ where: { tenantId: id }, orderBy: { lastSeenAt: 'desc' }, take: 20, select: { id: true, platform: true, appVersion: true, osVersion: true, lastSeenAt: true, user: { select: { fullName: true } } } }),
      this.prisma.integration.findMany({ where: { tenantId: id }, select: { id: true, type: true, status: true, isActive: true, lastSyncAt: true, createdAt: true } }),
      this.prisma.courierConfig.findMany({ where: { tenantId: id }, select: { id: true, provider: true, isActive: true } }),
      this.prisma.channelOrder.count({ where: { tenantId: id, receivedAt: { gte: from30 } } }),
      this.prisma.onboardingProgress.findFirst({ where: { tenantId: id }, select: { currentStep: true, completedSteps: true, isCompleted: true, isSkipped: true, completedAt: true } }),
      this.prisma.activityLog.findMany({ where: { tenantId: id }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, action: true, description: true, createdAt: true, user: { select: { fullName: true } } } }),
      this.prisma.adminAuditLog.findMany({ where: { targetId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, action: true, method: true, path: true, actorEmail: true, statusCode: true, createdAt: true } }),
      this.prisma.product.count({ where: { tenantId: id } }),
      this.prisma.subscription.findFirst({ where: { tenantId: id, status: 'ACTIVE', amount: { gt: 0 } }, select: { id: true } }),
    ]);

    const byDay = new Map(daily.map((d) => [d.day, d]));
    const series = Array.from({ length: 30 }, (_, i) => {
      const date = dateKeyTz(addDaysTz(from30, i));
      const d = byDay.get(date);
      return { date, bills: d ? Number(d.bills) : 0, total: Math.round(d?.total ?? 0) };
    });

    // Health: five plain checks, 20 points each.
    const daysSinceSale = lastSale ? Math.floor((now.getTime() - lastSale.soldAt.getTime()) / 86_400_000) : null;
    const setupDone = !!onboarding && (onboarding.isCompleted || onboarding.isSkipped);
    const factors = [
      { key: 'selling', label: 'Sold in the last 3 days', ok: daysSinceSale !== null && daysSinceSale <= 3, detail: daysSinceSale === null ? 'No sale yet' : daysSinceSale === 0 ? 'Sold today' : `Last sale ${daysSinceSale} day${daysSinceSale === 1 ? '' : 's'} ago` },
      { key: 'volume', label: '20+ bills this week', ok: sales7._count._all >= 20, detail: `${sales7._count._all} bills in 7 days` },
      { key: 'team', label: 'Someone signed in this week', ok: activeUsers7 > 0, detail: `${activeUsers7} user${activeUsers7 === 1 ? '' : 's'} active` },
      { key: 'setup', label: 'Setup finished, products added', ok: setupDone && products > 0, detail: `${products} products · setup ${setupDone ? 'done' : 'not finished'}` },
      { key: 'paying', label: 'On a paid plan', ok: !!paidSub, detail: paidSub ? 'Paying' : 'Trial or no plan' },
    ];
    const score = factors.filter((f) => f.ok).length * 20;

    const timeline = [
      ...activity.map((a) => ({ id: `a:${a.id}`, kind: 'shop' as const, title: a.description || a.action, who: a.user?.fullName ?? null, at: a.createdAt })),
      ...adminActions.map((a) => ({ id: `x:${a.id}`, kind: 'admin' as const, title: `${a.action} (${a.method} ${a.path.replace(/^\/api\/admin\//, '')})`, who: a.actorEmail, at: a.createdAt, failed: (a.statusCode ?? 0) >= 400 })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 40);

    return {
      health: { score, label: score >= 80 ? 'Healthy' : score >= 40 ? 'Needs attention' : 'At risk', factors },
      sales: { last7Bills: sales7._count._all, last7Total: Math.round(sales7._sum.total ?? 0), lastSaleAt: lastSale?.soldAt ?? null, daily: series },
      activeUsers7,
      shops,
      devices: devices.map((d) => ({ id: d.id, platform: d.platform, appVersion: d.appVersion, osVersion: d.osVersion, lastSeenAt: d.lastSeenAt, user: d.user?.fullName ?? null })),
      integrations,
      couriers,
      onlineOrders30,
      onboarding,
      timeline,
    };
  }

  /** Shop name, phone, industry and ways of selling. */
  async updateProfile(id: string, dto: { name?: string; phone?: string | null; businessType?: string | null; businessModels?: string[] }) {
    const exists = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, slug: true } });
    if (!exists) throw new NotFoundException('Tenant not found');
    if (exists.slug === 'nafaa-system') throw new BadRequestException('The internal Nafaa shop cannot be edited here.');
    const models = ['RETAIL', 'WHOLESALE', 'DISTRIBUTION', 'ONLINE'];
    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name?.trim() ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.businessType !== undefined ? { businessType: dto.businessType?.trim() || null } : {}),
        ...(dto.businessModels ? { businessModels: dto.businessModels.filter((m) => models.includes(m)) } : {}),
      },
      select: { id: true, name: true, phone: true, businessType: true, businessModels: true },
    });
  }

  /** Ends every session of every user in the shop; they all sign in again. */
  async pause(id: string, reason?: string, until?: string | null) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Shop not found');
    const end = until ? new Date(until) : null;
    if (end && (Number.isNaN(end.getTime()) || end <= new Date())) throw new BadRequestException('Pause end must be a future date');
    const text = reason?.trim().slice(0, 300) || null;
    await this.prisma.tenant.update({ where: { id }, data: { pausedAt: new Date(), pausedUntil: end, pauseReason: text, status: 'SUSPENDED' } });
    const { count } = await this.prisma.session.deleteMany({ where: { user: { tenantId: id } } });
    invalidateEntitlements(id);
    await this.prisma.notification.create({
      data: {
        tenantId: id, type: 'WARNING',
        ...notificationText('Aap ki dukaan rok di gayi hai', text ?? (end ? apiMessage('Nafaa ne aap ki dukaan {{date}} tak rok di hai.', { date: end.toISOString().slice(0, 10) }) : 'Nafaa ne aap ki dukaan rok di hai. Support se rabta karein.')),
      },
    });
    return { paused: true, pausedUntil: end, signedOut: count };
  }

  async unpause(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Shop not found');
    await this.prisma.tenant.update({ where: { id }, data: { pausedAt: null, pausedUntil: null, pauseReason: null, status: 'ACTIVE' } });
    invalidateEntitlements(id);
    await this.prisma.notification.create({ data: { tenantId: id, type: 'INFO', ...notificationText('Aap ki dukaan dobara chalu', 'Nafaa ne aap ki dukaan dobara chalu kar di hai.') } });
    return { paused: false };
  }

  async signOutAll(id: string) {
    const { count } = await this.prisma.session.deleteMany({ where: { user: { tenantId: id } } });
    return { ended: count };
  }

  /** Counts for the Shops page header: by status, new this week, and the industries in use. */
  async stats() {
    const scope = { slug: { not: 'nafaa-system' } };
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [byStatus, newThisWeek, industries, onlineNow, activeToday, idle7] = await Promise.all([
      this.prisma.tenant.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.tenant.count({ where: { ...scope, createdAt: { gte: weekAgo } } }),
      this.prisma.tenant.groupBy({ by: ['businessType'], where: scope, _count: { _all: true }, orderBy: { _count: { businessType: 'desc' } } }),
      this.prisma.tenant.count({ where: { ...scope, ...tenantActivityWhere('online') } }),
      this.prisma.tenant.count({ where: { ...scope, ...tenantActivityWhere('today') } }),
      this.prisma.tenant.count({ where: { ...scope, ...tenantActivityWhere('idle7') } }),
    ]);
    const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
    return {
      total: byStatus.reduce((n, x) => n + x._count._all, 0),
      active: count('ACTIVE'),
      trial: count('TRIAL'),
      suspended: count('SUSPENDED'),
      expired: count('EXPIRED'),
      newThisWeek,
      onlineNow,
      activeToday,
      idle7,
      industries: industries.map((r) => ({ type: r.businessType ?? 'NONE', count: r._count._all })),
    };
  }

  async updateStatus(id: string, status: TenantStatus, reason?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Suspending pauses the shop for real (until reactivated); reactivating clears the pause.
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: status === 'SUSPENDED'
        ? { status, pausedAt: new Date(), pausedUntil: null, pauseReason: reason?.trim() || null }
        : status === 'ACTIVE' ? { status, pausedAt: null, pausedUntil: null, pauseReason: null } : { status },
    });
    invalidateEntitlements(id);
    if (status === 'SUSPENDED') await this.prisma.session.deleteMany({ where: { user: { tenantId: id } } });

    await this.prisma.notification.create({
      data: {
        tenantId: id,
        type: status === 'SUSPENDED' ? 'WARNING' : 'INFO',
        ...notificationText(
          apiMessage('Account {{status}}', { status }),
          reason || apiMessage('Aap ka account status {{status}} kar diya gaya hai.', { status }),
        ),
      },
    });

    return updated;
  }

  async remove(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.slug === 'nafaa-system') {
      throw new NotFoundException('Cannot delete system tenant');
    }
    await this.prisma.tenant.delete({ where: { id } });
    return { message: 'Tenant deleted permanently' };
  }
}

/** Filter shops by when anyone in them was last active. */
export function tenantActivityWhere(activity?: string): Prisma.TenantWhereInput {
  const now = new Date();
  switch (activity) {
    case 'online': return { lastActiveAt: { gte: new Date(now.getTime() - 5 * 60_000) } };
    case 'today': return { lastActiveAt: { gte: startOfDayTz(now) } };
    case 'week': return { lastActiveAt: { gte: subDaysTz(now, 7) } };
    case 'idle7': return { OR: [{ lastActiveAt: { lt: subDaysTz(now, 7) } }, { lastActiveAt: null }] };
    case 'idle30': return { OR: [{ lastActiveAt: { lt: subDaysTz(now, 30) } }, { lastActiveAt: null }] };
    case 'never': return { lastActiveAt: null };
    default: return {};
  }
}
