/**
 * Admin overview of mobile app use: active devices, installs and daily use
 * over time, splits by platform, version, language and industry, businesses
 * on mobile versus web only, and devices still on old versions.
 *
 * Days are business days in the platform time zone (PKT).
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_TZ, dateKeyTz, startOfDayTz, subDaysTz } from '../../common/helpers/business-time.helper';
import { MobileConfigService } from './mobile-config.service';
import { compareVersions } from './mobile-targeting';

const DAY_MS = 86_400_000;

@Injectable()
export class MobileAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configs: MobileConfigService,
  ) {}

  async overview(days = 30) {
    const now = new Date();
    const today = startOfDayTz(now);
    const since7 = new Date(now.getTime() - 7 * DAY_MS);
    const since30 = new Date(now.getTime() - 30 * DAY_MS);
    const rangeStart = subDaysTz(today, days - 1);
    const active30: Prisma.MobileDeviceWhereInput = { lastSeenAt: { gte: since30 } };

    const [
      total, activeToday, active7, active30Count, newToday, withPush,
      installsRaw, dailyRaw, platformRows, versionRows, languageRows, industryRaw,
      mobileTenantsRaw, activeTenantsRaw, olderAppUsers, topTenantsRaw, { config }, modelRows,
    ] = await Promise.all([
      this.prisma.mobileDevice.count(),
      this.prisma.mobileDevice.count({ where: { lastSeenAt: { gte: today } } }),
      this.prisma.mobileDevice.count({ where: { lastSeenAt: { gte: since7 } } }),
      this.prisma.mobileDevice.count({ where: active30 }),
      this.prisma.mobileDevice.count({ where: { firstSeenAt: { gte: today } } }),
      this.prisma.mobileDevice.count({ where: { ...active30, pushToken: { not: null } } }),
      this.prisma.$queryRaw<{ d: string; n: bigint }[]>`
        SELECT to_char(("firstSeenAt" AT TIME ZONE 'UTC') AT TIME ZONE ${DEFAULT_TZ}, 'YYYY-MM-DD') AS d, count(*) AS n
        FROM "MobileDevice" WHERE "firstSeenAt" >= ${rangeStart}
        GROUP BY 1`,
      this.prisma.$queryRaw<{ d: string; n: bigint }[]>`
        SELECT to_char("day", 'YYYY-MM-DD') AS d, count(*) AS n
        FROM "MobileDeviceDay" WHERE "day" >= ${new Date(`${dateKeyTz(rangeStart)}T00:00:00.000Z`)}::date
        GROUP BY 1`,
      this.prisma.mobileDevice.groupBy({ by: ['platform'], where: active30, _count: { _all: true } }),
      this.prisma.mobileDevice.groupBy({ by: ['platform', 'appVersion'], where: active30, _count: { _all: true } }),
      this.prisma.mobileDevice.groupBy({ by: ['language'], where: active30, _count: { _all: true } }),
      this.prisma.$queryRaw<{ industry: string | null; n: bigint }[]>`
        SELECT t."businessType" AS industry, count(*) AS n
        FROM "MobileDevice" d JOIN "Tenant" t ON t.id = d."tenantId"
        WHERE d."lastSeenAt" >= ${since30}
        GROUP BY 1 ORDER BY 2 DESC`,
      this.prisma.mobileDevice.findMany({ where: active30, select: { tenantId: true }, distinct: ['tenantId'] }),
      this.prisma.user.findMany({ where: { lastLoginAt: { gte: since30 }, role: { not: 'SUPER_ADMIN' } }, select: { tenantId: true }, distinct: ['tenantId'] }),
      this.prisma.user.count({ where: { isActive: true, pushTokens: { isEmpty: false }, mobileDevices: { none: {} } } }),
      this.prisma.$queryRaw<{ tenantId: string; name: string; industry: string | null; devices: bigint; lastSeen: Date }[]>`
        SELECT t.id AS "tenantId", t.name, t."businessType" AS industry, count(*) AS devices, max(d."lastSeenAt") AS "lastSeen"
        FROM "MobileDevice" d JOIN "Tenant" t ON t.id = d."tenantId"
        WHERE d."lastSeenAt" >= ${since30}
        GROUP BY t.id ORDER BY devices DESC, "lastSeen" DESC LIMIT 8`,
      this.configs.getConfig(),
      this.prisma.mobileDevice.groupBy({ by: ['deviceModel'], where: active30, _count: { _all: true }, orderBy: { _count: { deviceModel: 'desc' } }, take: 6 }),
    ]);

    // Fill every day in the range so the charts have no gaps.
    const installs = new Map(installsRaw.map((r) => [r.d, Number(r.n)]));
    const daily = new Map(dailyRaw.map((r) => [r.d, Number(r.n)]));
    const series: { date: string; installs: number; active: number }[] = [];
    for (let i = 0; i < days; i++) {
      const key = dateKeyTz(new Date(rangeStart.getTime() + i * DAY_MS + 12 * 3_600_000));
      if (series.length && series[series.length - 1].date === key) continue;
      series.push({ date: key, installs: installs.get(key) ?? 0, active: daily.get(key) ?? 0 });
    }

    const versions = versionRows
      .map((r) => {
        const rel = r.platform === 'ios' || r.platform === 'android' ? config.releases[r.platform] : null;
        const status = rel?.minVersion && compareVersions(r.appVersion, rel.minVersion) < 0
          ? 'unsupported'
          : rel?.latestVersion && compareVersions(r.appVersion, rel.latestVersion) < 0 ? 'outdated' : 'current';
        return { platform: r.platform, version: r.appVersion, devices: r._count._all, status };
      })
      .sort((a, b) => compareVersions(b.version, a.version) || a.platform.localeCompare(b.platform));

    const mobileTenants = new Set(mobileTenantsRaw.map((r) => r.tenantId));
    const activeTenants = new Set([...activeTenantsRaw.map((r) => r.tenantId), ...mobileTenants]);

    return {
      days,
      totals: {
        devices: total,
        activeToday,
        active7d: active7,
        active30d: active30Count,
        newToday,
        pushReachable30d: withPush,
        olderAppUsers,
      },
      series,
      byPlatform: platformRows.map((r) => ({ key: r.platform, devices: r._count._all })).sort((a, b) => b.devices - a.devices),
      byVersion: versions,
      byModel: modelRows.map((r) => ({ key: r.deviceModel ?? 'Unknown', devices: r._count._all })),
      byLanguage: languageRows.map((r) => ({ key: r.language ?? 'unknown', devices: r._count._all })).sort((a, b) => b.devices - a.devices),
      byIndustry: industryRaw.map((r) => ({ key: r.industry ?? 'Not set', devices: Number(r.n) })),
      tenants: {
        active30d: activeTenants.size,
        onMobile: mobileTenants.size,
        webOnly: [...activeTenants].filter((id) => !mobileTenants.has(id)).length,
      },
      oldVersions: {
        outdated: versions.filter((v) => v.status === 'outdated').reduce((s, v) => s + v.devices, 0),
        unsupported: versions.filter((v) => v.status === 'unsupported').reduce((s, v) => s + v.devices, 0),
        latest: { ios: config.releases.ios.latestVersion, android: config.releases.android.latestVersion },
        minimum: { ios: config.releases.ios.minVersion, android: config.releases.android.minVersion },
      },
      topTenants: topTenantsRaw.map((r) => ({ ...r, devices: Number(r.devices) })),
    };
  }

  /** Choices for the targeting pickers: plans, industries in use, app versions seen. */
  async targets() {
    const [plans, industries, versions] = await Promise.all([
      this.prisma.plan.findMany({ where: { isActive: true }, select: { slug: true, name: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.tenant.groupBy({ by: ['businessType'], where: { businessType: { not: null } }, _count: { _all: true } }),
      this.prisma.mobileDevice.groupBy({ by: ['appVersion'], _count: { _all: true } }),
    ]);
    return {
      plans,
      industries: industries
        .filter((i) => i.businessType)
        .map((i) => ({ key: i.businessType as string, tenants: i._count._all }))
        .sort((a, b) => b.tenants - a.tenants || a.key.localeCompare(b.key)),
      versions: versions.map((v) => ({ version: v.appVersion, devices: v._count._all })).sort((a, b) => compareVersions(b.version, a.version)),
    };
  }

  /** Business search for the tenant picker. */
  async searchTenants(q: string) {
    const term = q.trim();
    const rows = await this.prisma.tenant.findMany({
      where: term ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { slug: { contains: term, mode: 'insensitive' } }, { id: term }] } : {},
      select: { id: true, name: true, businessType: true, _count: { select: { mobileDevices: true } } },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return rows.map((r) => ({ id: r.id, name: r.name, businessType: r.businessType, devices: r._count.mobileDevices }));
  }

  /** Names for tenant ids already picked. */
  async tenantNames(ids: string[]) {
    if (!ids.length) return [];
    return this.prisma.tenant.findMany({ where: { id: { in: ids.slice(0, 500) } }, select: { id: true, name: true, businessType: true } });
  }
}
