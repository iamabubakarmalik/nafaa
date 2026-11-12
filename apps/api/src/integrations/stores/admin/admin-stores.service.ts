/**
 * Nafaa admin panel view of every store: overview numbers, the store list
 * and detail, suspend / force password, domains monitor, platform controls
 * and the abuse report queue. Nothing here deletes store data.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StoreAccessService } from '../store-access.service';
import { StoreDomainsService, vercelReady } from '../store-domains.service';
import { StoreRevalidateService } from '../store-revalidate.service';
import { StoreThemeService } from '../store-theme.service';
import { loadControls, mergeControls, saveControls } from '../store-controls';
import { readCheckout } from '../store-settings';
import { themeImportSummary } from '../store-theme-import.service';
import { rootDomain, storefrontUrl, subdomainHost } from '../lib/host';
import { REMOVED_BY_NAFAA, isRemovedByNafaa } from '../lib/hosting';

const CLOSED = ['CANCELLED', 'REJECTED'];
const REPORT_STATUSES = ['OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'];
const n = (v: unknown) => Number(v ?? 0) || 0;
const page = (v: unknown) => Math.max(1, Math.floor(n(v) || 1));
const lim = (v: unknown, d = 25) => Math.max(1, Math.min(100, Math.floor(n(v) || d)));

@Injectable()
export class AdminStoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly domains: StoreDomainsService,
    private readonly revalidate: StoreRevalidateService,
    private readonly theme: StoreThemeService,
  ) {}

  /** Orders and GMV per store channel since a date. */
  private async orderStats(integrationIds: string[], since: Date) {
    if (!integrationIds.length) return new Map<string, { orders: number; gmv: number }>();
    const rows = await this.prisma.channelOrder.groupBy({
      by: ['integrationId'],
      where: { integrationId: { in: integrationIds }, receivedAt: { gte: since }, deletedAt: null, orderStatus: { notIn: CLOSED } },
      _count: { _all: true }, _sum: { total: true },
    });
    return new Map(rows.map((r) => [r.integrationId, { orders: r._count._all, gmv: n(r._sum.total) }]));
  }

  async overview(daysRaw: unknown) {
    const days = [7, 30, 90].includes(Number(daysRaw)) ? Number(daysRaw) : 30;
    const since = new Date(Date.now() - days * 86_400_000);
    const [byStatus, suspended, withDomain, stores, visitors, domainStatus, openReports] = await Promise.all([
      this.prisma.nafaaStore.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.nafaaStore.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.nafaaStore.count({ where: { domains: { some: { status: 'ACTIVE' } } } }),
      this.prisma.nafaaStore.findMany({ select: { id: true, name: true, slug: true, tenantId: true, integrationId: true } }),
      this.prisma.storeAnalyticsDaily.groupBy({ by: ['storeId'], where: { day: { gte: since } }, _sum: { visitors: true } }),
      this.prisma.storeDomain.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.storeAbuseReport.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
    ]);
    const stats = await this.orderStats(stores.map((s) => s.integrationId), since);
    const vis = new Map(visitors.map((v) => [v.storeId, n(v._sum.visitors)]));
    const orders = [...stats.values()].reduce((a, s) => a + s.orders, 0);
    const gmv = [...stats.values()].reduce((a, s) => a + s.gmv, 0);
    const totalVisitors = [...vis.values()].reduce((a, v) => a + v, 0);
    const tenants = await this.prisma.tenant.findMany({ where: { id: { in: [...new Set(stores.map((s) => s.tenantId))] } }, select: { id: true, name: true } });
    const tname = new Map(tenants.map((t) => [t.id, t.name]));
    const daily = await this.prisma.$queryRaw<Array<{ d: Date; orders: bigint; gmv: number }>>`
      SELECT date_trunc('day', o."receivedAt" AT TIME ZONE 'Asia/Karachi') AS d, COUNT(*)::bigint AS orders, COALESCE(SUM(o.total), 0)::float AS gmv
      FROM channel_orders o JOIN integrations i ON i.id = o."integrationId"
      WHERE i.type = 'NAFAA_STORE' AND o."receivedAt" >= ${since} AND o."deletedAt" IS NULL AND o."orderStatus" NOT IN ('CANCELLED', 'REJECTED')
      GROUP BY 1 ORDER BY 1`.catch(() => []);
    const dailyVisitors = await this.prisma.storeAnalyticsDaily.groupBy({ by: ['day'], where: { day: { gte: since } }, _sum: { visitors: true } });
    const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    return {
      days,
      counts: { total: stores.length, DRAFT: count('DRAFT'), PASSWORD: count('PASSWORD'), LIVE: count('LIVE'), CLOSED: count('CLOSED'), suspended, withCustomDomain: withDomain },
      totals: { orders, gmv, visitors: totalVisitors, conversion: totalVisitors ? Math.round((orders / totalVisitors) * 1000) / 10 : 0, aov: orders ? Math.round(gmv / orders) : 0 },
      daily: daily.map((d) => {
        const key = new Date(d.d).toISOString().slice(0, 10);
        return { date: key, orders: Number(d.orders), gmv: n(d.gmv), visitors: n(dailyVisitors.find((v) => v.day.toISOString().slice(0, 10) === key)?._sum.visitors) };
      }),
      topStores: stores
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug, tenantId: s.tenantId, tenantName: tname.get(s.tenantId) ?? null, orders: stats.get(s.integrationId)?.orders ?? 0, gmv: stats.get(s.integrationId)?.gmv ?? 0, visitors: vis.get(s.id) ?? 0 }))
        .sort((a, b) => b.gmv - a.gmv || b.orders - a.orders).slice(0, 10),
      domains: { active: domainStatus.find((d) => d.status === 'ACTIVE')?._count._all ?? 0, pending: domainStatus.filter((d) => d.status === 'PENDING' || d.status === 'VERIFYING').reduce((a, d) => a + d._count._all, 0), error: domainStatus.find((d) => d.status === 'ERROR')?._count._all ?? 0 },
      openReports,
    };
  }

  private async rows(stores: Array<Prisma.NafaaStoreGetPayload<{ include: { domains: true } }>>) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [tenants, stats, pubs] = await Promise.all([
      this.prisma.tenant.findMany({ where: { id: { in: [...new Set(stores.map((s) => s.tenantId))] } }, select: { id: true, name: true, phone: true, users: { where: { role: 'OWNER' }, take: 1, select: { email: true } } } as any }),
      this.orderStats(stores.map((s) => s.integrationId), since),
      this.prisma.storeThemeVersion.groupBy({ by: ['storeId'], where: { storeId: { in: stores.map((s) => s.id) }, publishedAt: { not: null } }, _max: { publishedAt: true } }),
    ]);
    const t = new Map((tenants as any[]).map((x) => [x.id, x]));
    const pub = new Map(pubs.map((p) => [p.storeId, p._max.publishedAt]));
    return Promise.all(stores.map(async (s) => {
      const tenant = t.get(s.tenantId);
      return {
        id: s.id, name: s.name, slug: s.slug, status: s.status, suspended: !!s.suspendedAt, forcedPassword: s.forcedPassword, themeId: s.themeId,
        tenant: { id: s.tenantId, name: tenant?.name ?? null, email: tenant?.users?.[0]?.email ?? null, phone: tenant?.phone ?? null },
        subdomain: subdomainHost(s.slug),
        domains: s.domains.map((d) => ({ id: d.id, hostname: d.hostname, status: d.status, isPrimary: d.isPrimary, sslReady: d.status === 'ACTIVE', error: d.error })),
        entitled: await this.access.entitled(s.tenantId),
        lastPublishedAt: pub.get(s.id)?.toISOString() ?? null,
        orders30d: stats.get(s.integrationId)?.orders ?? 0, gmv30d: stats.get(s.integrationId)?.gmv ?? 0,
        createdAt: s.createdAt.toISOString(), launchedAt: s.launchedAt?.toISOString() ?? null,
      };
    }));
  }

  async list(q: { search?: string; status?: string; domain?: string; theme?: string; page?: string; limit?: string; sort?: string }) {
    const p = page(q.page);
    const l = lim(q.limit);
    const search = String(q.search ?? '').trim().slice(0, 80);
    const and: Prisma.NafaaStoreWhereInput[] = [];
    if (search) {
      const tenantIds = (await this.prisma.tenant.findMany({ where: { name: { contains: search, mode: 'insensitive' } }, select: { id: true }, take: 200 })).map((x) => x.id);
      and.push({ OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search.toLowerCase() } }, { tenantId: { in: tenantIds } }, { domains: { some: { hostname: { contains: search.toLowerCase() } } } }] });
    }
    if (q.status === 'SUSPENDED') and.push({ suspendedAt: { not: null } });
    else if (['DRAFT', 'PASSWORD', 'LIVE', 'CLOSED'].includes(String(q.status))) and.push({ status: q.status, suspendedAt: null });
    if (q.domain === 'custom') and.push({ domains: { some: {} } });
    if (q.domain === 'none') and.push({ domains: { none: {} } });
    if (q.domain === 'error') and.push({ domains: { some: { OR: [{ status: 'ERROR' }, { error: { not: null } }] } } });
    if (q.theme) and.push({ themeId: String(q.theme) });
    const where: Prisma.NafaaStoreWhereInput = { AND: and };
    const sort = String(q.sort ?? 'newest');
    if (sort === 'orders' || sort === 'gmv') {
      const all = await this.prisma.nafaaStore.findMany({ where, select: { id: true, integrationId: true }, take: 5000 });
      const stats = await this.orderStats(all.map((a) => a.integrationId), new Date(Date.now() - 30 * 86_400_000));
      all.sort((a, b) => (sort === 'gmv' ? (stats.get(b.integrationId)?.gmv ?? 0) - (stats.get(a.integrationId)?.gmv ?? 0) : (stats.get(b.integrationId)?.orders ?? 0) - (stats.get(a.integrationId)?.orders ?? 0)));
      const ids = all.slice((p - 1) * l, p * l).map((a) => a.id);
      const rows = await this.prisma.nafaaStore.findMany({ where: { id: { in: ids } }, include: { domains: true } });
      rows.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      return { items: await this.rows(rows), total: all.length, page: p, pages: Math.max(1, Math.ceil(all.length / l)) };
    }
    const [rows, total] = await Promise.all([
      this.prisma.nafaaStore.findMany({ where, include: { domains: true }, orderBy: sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' }, skip: (p - 1) * l, take: l }),
      this.prisma.nafaaStore.count({ where }),
    ]);
    return { items: await this.rows(rows), total, page: p, pages: Math.max(1, Math.ceil(total / l)) };
  }

  private async store(id: string) {
    const s = await this.prisma.nafaaStore.findUnique({ where: { id }, include: { domains: true } });
    if (!s) throw new NotFoundException('Store not found');
    return s;
  }

  async detail(id: string) {
    const s = await this.store(id);
    const [row] = await this.rows([s]);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [integration, visitors, recent, reports] = await Promise.all([
      this.prisma.integration.findUnique({ where: { id: s.integrationId }, select: { id: true, status: true, isActive: true } }),
      this.prisma.storeAnalyticsDaily.aggregate({ where: { storeId: s.id, day: { gte: since } }, _sum: { visitors: true } }),
      this.prisma.channelOrder.findMany({ where: { integrationId: s.integrationId, deletedAt: null }, orderBy: { receivedAt: 'desc' }, take: 10, select: { id: true, externalOrderNumber: true, externalOrderId: true, total: true, orderStatus: true, receivedAt: true } }),
      this.prisma.storeAbuseReport.findMany({ where: { storeId: s.id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, reason: true, status: true, createdAt: true } }),
    ]);
    const v = n(visitors._sum.visitors);
    return {
      ...row,
      settings: s.settings, checkout: readCheckout(s.checkout), suspendReason: s.suspendReason, integration, url: await this.access.storeUrl(s),
      stats30d: { visitors: v, orders: row.orders30d, gmv: row.gmv30d, conversion: v ? Math.round((row.orders30d / v) * 1000) / 10 : 0 },
      recentOrders: recent.map((o) => ({ id: o.id, orderNumber: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, ''), total: n(o.total), status: o.orderStatus, receivedAt: o.receivedAt.toISOString() })),
      reports: reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      impersonate: { tenantId: s.tenantId, path: `/online-store/site?store=${s.id}` },
      lastThemeImport: themeImportSummary(s.migration),
    };
  }

  async themeHistory(id: string) {
    await this.store(id);
    const rows = await this.prisma.storeThemeVersion.findMany({ where: { storeId: id }, orderBy: { version: 'desc' }, take: 100, select: { id: true, version: true, status: true, note: true, themeId: true, publishedAt: true, publishedById: true, updatedAt: true } });
    return { items: await this.theme.withNames(rows) };
  }

  async suspend(id: string, reason: unknown) {
    const s = await this.store(id);
    const text = String(reason ?? '').trim().slice(0, 300);
    if (!text) throw new BadRequestException('Give a reason');
    await this.prisma.nafaaStore.update({ where: { id: s.id }, data: { suspendedAt: new Date(), suspendReason: text } });
    this.access.invalidate(s.id);
    void this.revalidate.sendWithResolve(s.id).catch(() => false);
    return { ok: true };
  }

  async unsuspend(id: string) {
    const s = await this.store(id);
    await this.prisma.nafaaStore.update({ where: { id: s.id }, data: { suspendedAt: null, suspendReason: null } });
    this.access.invalidate(s.id);
    void this.revalidate.sendWithResolve(s.id).catch(() => false);
    return { ok: true };
  }

  async forcePassword(id: string, body: { on?: boolean; message?: string }) {
    const s = await this.store(id);
    const on = body?.on === true;
    const settings = { ...((s.settings ?? {}) as Record<string, any>) };
    if (on && typeof body?.message === 'string') settings.password = { ...(settings.password ?? {}), message: body.message.trim().slice(0, 300) || null };
    await this.prisma.nafaaStore.update({
      where: { id: s.id },
      data: on
        ? { forcedPassword: true, status: s.status === 'LIVE' ? 'PASSWORD' : s.status, settings }
        : { forcedPassword: false },
    });
    this.access.invalidate(s.id);
    void this.revalidate.sendWithResolve(s.id).catch(() => false);
    return { ok: true };
  }

  async revalidateStore(id: string) {
    const s = await this.store(id);
    this.access.invalidate(s.id);
    return { ok: true, sent: await this.revalidate.sendWithResolve(s.id) };
  }

  private async domain(storeId: string | null, domainId: string) {
    const d = await this.prisma.storeDomain.findFirst({ where: { id: domainId, ...(storeId && { storeId }) } });
    if (!d) throw new NotFoundException('Domain not found');
    return d;
  }

  async verifyDomain(storeId: string | null, domainId: string) {
    const d = await this.domain(storeId, domainId);
    if (!vercelReady()) return this.domains.present(d);
    const out = await this.domains.check(d);
    this.access.invalidate(d.storeId);
    return this.domains.present(out);
  }

  /**
   * Domains monitor "Retry": re-adds the host on Vercel when it is missing
   * there, then verifies. The only path that brings back a domain removed by
   * Nafaa (the mark is cleared here). No-op without the Vercel env.
   */
  async retryDomain(domainId: string) {
    let d = await this.domain(null, domainId);
    if (!vercelReady()) return this.domains.present(d);
    if (isRemovedByNafaa(d)) d = await this.prisma.storeDomain.update({ where: { id: d.id }, data: { status: 'PENDING', error: null } });
    try {
      await this.domains.ensureAttached(d);
    } catch (e: any) {
      const failed = await this.prisma.storeDomain.update({ where: { id: d.id }, data: { status: 'ERROR', error: String(e?.message ?? 'Could not add the domain').slice(0, 300), lastCheckedAt: new Date() } });
      return this.domains.present(failed);
    }
    return this.verifyDomain(null, domainId);
  }

  /** Detaches a stuck host from Vercel; the row stays (marked ERROR) and no store data is removed. */
  async removeFromVercel(storeId: string, domainId: string) {
    const d = await this.domain(storeId, domainId);
    if (vercelReady()) await this.domains.detach(d.hostname);
    await this.prisma.storeDomain.update({ where: { id: d.id }, data: { status: 'ERROR', error: REMOVED_BY_NAFAA, isPrimary: false, lastCheckedAt: new Date() } });
    this.access.invalidate(d.storeId);
    return { ok: true };
  }

  /** One-time action: attaches the free `<slug>.<root>` address of every store to the storefront project. */
  async attachAllSubdomains() {
    return this.domains.attachAllSubdomains();
  }

  async domainsList(q: { status?: string; search?: string; page?: string }) {
    const p = page(q.page);
    const search = String(q.search ?? '').trim().toLowerCase().slice(0, 80);
    const where: Prisma.StoreDomainWhereInput = {
      ...(['PENDING', 'VERIFYING', 'ACTIVE', 'ERROR'].includes(String(q.status)) && { status: q.status }),
      ...(search && { hostname: { contains: search } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.storeDomain.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * 50, take: 50, include: { store: { select: { id: true, name: true, slug: true, tenantId: true } } } }),
      this.prisma.storeDomain.count({ where }),
    ]);
    return {
      ready: vercelReady(),
      items: rows.map((d) => ({ ...this.domains.present(d), createdAt: d.createdAt.toISOString(), store: d.store })),
      total, page: p, pages: Math.max(1, Math.ceil(total / 50)),
    };
  }

  async controls() {
    return { ...(await loadControls(this.prisma, true)), rootDomain: rootDomain(), vercelReady: vercelReady(), storefrontUrl: storefrontUrl() };
  }

  async saveControls(body: unknown) {
    const next = mergeControls(await loadControls(this.prisma, true), body);
    await saveControls(this.prisma, next);
    return next;
  }

  async reports(q: { status?: string; storeId?: string; page?: string }) {
    const p = page(q.page);
    const where: Prisma.StoreAbuseReportWhereInput = {
      ...(REPORT_STATUSES.includes(String(q.status)) && { status: q.status }),
      ...(q.storeId && { storeId: String(q.storeId) }),
    };
    const [rows, total, counts] = await Promise.all([
      this.prisma.storeAbuseReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * 50, take: 50, include: { store: { select: { id: true, name: true, slug: true, status: true, suspendedAt: true } } } }),
      this.prisma.storeAbuseReport.count({ where }),
      this.prisma.storeAbuseReport.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      items: rows.map(({ store, ipHash: _ip, ...r }) => ({
        ...r, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null, updatedAt: r.updatedAt.toISOString(),
        store: { id: store.id, name: store.name, slug: store.slug, status: store.status, suspended: !!store.suspendedAt },
      })),
      total, page: p, pages: Math.max(1, Math.ceil(total / 50)),
      counts: Object.fromEntries(REPORT_STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count._all ?? 0])),
    };
  }

  async updateReport(reportId: string, adminId: string, body: { status?: string; adminNote?: string }) {
    const r = await this.prisma.storeAbuseReport.findUnique({ where: { id: reportId } });
    if (!r) throw new NotFoundException('Report not found');
    const status = REPORT_STATUSES.includes(String(body?.status)) ? String(body.status) : r.status;
    const done = status === 'ACTIONED' || status === 'DISMISSED';
    const saved = await this.prisma.storeAbuseReport.update({
      where: { id: r.id },
      data: { status, ...(body?.adminNote !== undefined && { adminNote: String(body.adminNote ?? '').trim().slice(0, 1000) || null }), resolvedAt: done ? r.resolvedAt ?? new Date() : null, resolvedById: done ? adminId : null },
    });
    const { ipHash: _ip, ...out } = saved;
    return out;
  }
}
