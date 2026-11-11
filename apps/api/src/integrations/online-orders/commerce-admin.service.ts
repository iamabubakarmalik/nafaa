/**
 * Super-admin view of every shop's online store: channels, catalog jobs,
 * online orders, couriers and the platform commerce controls.
 *
 * Reads only, apart from a few actions that call the same service methods the
 * merchant screens use (pause/resume, catalog re-scan, stock re-push, retry
 * failed links, cancel/retry a catalog job). Nothing is deleted. Every action
 * is written to the tenant's activity log with the admin as the user.
 *
 * Credentials (API keys, secrets, tokens) are never selected.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CourierProvider, Integration, IntegrationStatus, IntegrationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogJobsService } from './catalog-jobs.service';
import { CatalogWatchService } from './catalog-watch.service';
import { OnlineProductsService } from './online-products.service';
import { ACTIVE_STATUSES, JobKind, JOB_KINDS } from './catalog-jobs';
import {
  clearCommerceControlsCache, COMMERCE_CONTROLS_KEY, COMMERCE_MODULES, commerceControls, CommerceControls,
  KILL_SWITCH_TYPES, parseCommerceControls,
} from './commerce-controls';
import { STUCK_DAYS } from './order-board';
import { StockHandoverService } from './stock-handover.service';
import { PriceRecoveryChoice, PriceSourceService } from './price-source.service';

/** Integration types that belong to the online store. */
const COMMERCE_TYPES: IntegrationType[] = ['SHOPIFY', 'DARAZ', 'WOOCOMMERCE', 'CUSTOM_WEBSITE', 'FOODPANDA', 'MANUAL'];
/** Channels Nafaa pushes stock and price to. */
const PUSH_TYPES = ['SHOPIFY', 'DARAZ', 'WOOCOMMERCE'];
const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
const DAY_MS = 86_400_000;

/** Shown kind: an Indolj connection is stored as a custom website with `config.indolj`. */
const KIND_SQL = Prisma.sql`CASE WHEN i."type" = 'CUSTOM_WEBSITE' AND i."config" -> 'indolj' IS NOT NULL THEN 'INDOLJ' ELSE i."type"::text END`;
/** Orders that count: not soft-deleted and not merged into another order. */
const LIVE_ORDER_SQL = Prisma.sql`o."deletedAt" IS NULL AND o."mergedIntoId" IS NULL`;

export interface ChannelQuery {
  search?: string;
  kind?: string;
  status?: string;
  tenantId?: string;
  problems?: boolean;
  page?: number;
  limit?: number;
}

type ChannelRow = {
  id: string; tenantId: string; tenantName: string; tenantStatus: string; kind: string; type: string; name: string;
  status: string; isActive: boolean; lastSyncAt: Date | null; lastSyncStatus: string | null; createdAt: Date;
  siteUrl: string | null; shopifyBilling: string | null; shopifyPlan: any; channelError: string | null;
  totalErrors: number; ordersTotal: number; lastOrderAt: Date | null; links: number; pushFailures: number;
  syncErrors7d: number; webhookErrors7d: number;
};

const n = (v: unknown) => Number(v ?? 0) || 0;
const round = (v: number) => Math.round(v * 100) / 100;

/** YYYY-MM-DD dates are Pakistan calendar days; `to` is inclusive. */
const pktDay = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00+05:00`);

function range(from?: string, to?: string) {
  const end = to && !Number.isNaN(pktDay(to)) ? new Date(pktDay(to) + DAY_MS) : new Date();
  const start = from && !Number.isNaN(pktDay(from)) ? new Date(pktDay(from)) : new Date(end.getTime() - 30 * DAY_MS);
  if (end.getTime() - start.getTime() > 400 * DAY_MS) throw new BadRequestException('Range is limited to 400 days');
  return { start, end };
}

@Injectable()
export class CommerceAdminService {
  private readonly logger = new Logger(CommerceAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: CatalogJobsService,
    private readonly watch: CatalogWatchService,
    private readonly products: OnlineProductsService,
    private readonly handover: StockHandoverService,
    private readonly prices: PriceSourceService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // OVERVIEW
  // ═══════════════════════════════════════════════════════════

  async overview(from?: string, to?: string) {
    const { start, end } = range(from, to);
    const inRange = Prisma.sql`o."receivedAt" >= ${start} AND o."receivedAt" < ${end} AND ${LIVE_ORDER_SQL}`;
    const [channels, daily, totals, byKind, top, sources, couriersCfg, couriersUsed, controls] = await Promise.all([
      this.prisma.$queryRaw<Array<{ kind: string; status: string; isActive: boolean; count: number }>>`
        SELECT ${KIND_SQL} AS kind, i."status"::text AS status, i."isActive", count(*)::int AS count
        FROM integrations i WHERE i."type"::text IN (${Prisma.join(COMMERCE_TYPES)})
        GROUP BY 1, 2, 3`,
      this.prisma.$queryRaw<Array<{ day: Date; orders: number; gmv: number }>>`
        SELECT ((o."receivedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Karachi')::date AS day,
               count(*)::int AS orders,
               coalesce(sum(o."total") FILTER (WHERE o."orderStatus" NOT IN (${Prisma.join(CLOSED)})), 0)::float AS gmv
        FROM channel_orders o WHERE ${inRange} GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<Array<Record<string, number>>>`
        SELECT count(*)::int AS orders,
          coalesce(sum(o."total") FILTER (WHERE o."orderStatus" NOT IN ('CANCELLED', 'REJECTED', 'RETURNED')), 0)::float AS gmv,
          count(*) FILTER (WHERE o."orderStatus" = 'DELIVERED' OR (o."deliveredAt" IS NOT NULL AND o."returnedAt" IS NULL))::int AS delivered,
          count(*) FILTER (WHERE o."orderStatus" = 'RETURNED' OR o."returnedAt" IS NOT NULL)::int AS returned,
          count(*) FILTER (WHERE o."orderStatus" IN ('CANCELLED', 'REJECTED'))::int AS cancelled,
          count(*) FILTER (WHERE o."dispatchedAt" IS NOT NULL OR o."courierBookedAt" IS NOT NULL)::int AS dispatched,
          count(DISTINCT o."tenantId")::int AS merchants
        FROM channel_orders o WHERE ${inRange}`,
      this.prisma.$queryRaw<Array<{ kind: string; orders: number; gmv: number }>>`
        SELECT ${KIND_SQL} AS kind, count(*)::int AS orders,
               coalesce(sum(o."total") FILTER (WHERE o."orderStatus" NOT IN (${Prisma.join(CLOSED)})), 0)::float AS gmv
        FROM channel_orders o JOIN integrations i ON i."id" = o."integrationId"
        WHERE ${inRange} GROUP BY 1 ORDER BY 2 DESC`,
      this.prisma.$queryRaw<Array<{ tenantId: string; name: string; orders: number; gmv: number; delivered: number; returned: number }>>`
        SELECT o."tenantId", t."name", count(*)::int AS orders,
               coalesce(sum(o."total") FILTER (WHERE o."orderStatus" NOT IN (${Prisma.join(CLOSED)})), 0)::float AS gmv,
               count(*) FILTER (WHERE o."orderStatus" = 'DELIVERED')::int AS delivered,
               count(*) FILTER (WHERE o."orderStatus" = 'RETURNED' OR o."returnedAt" IS NOT NULL)::int AS returned
        FROM channel_orders o JOIN "Tenant" t ON t."id" = o."tenantId"
        WHERE ${inRange} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 15`,
      this.prisma.$queryRaw<Array<{ source: string; orders: number }>>`
        SELECT upper(coalesce(o."metadata" ->> 'source', 'MANUAL')) AS source, count(*)::int AS orders
        FROM channel_orders o JOIN integrations i ON i."id" = o."integrationId"
        WHERE ${inRange} AND (i."type" = 'MANUAL' OR o."metadata" ->> 'manual' = 'true')
        GROUP BY 1 ORDER BY 2 DESC`,
      this.prisma.courierConfig.groupBy({ by: ['provider', 'isActive'], _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ courier: string; orders: number; tenants: number }>>`
        SELECT coalesce(o."courierCode", upper(o."courierName"), 'UNKNOWN') AS courier, count(*)::int AS orders, count(DISTINCT o."tenantId")::int AS tenants
        FROM channel_orders o
        WHERE ${inRange} AND (o."courierCode" IS NOT NULL OR o."courierName" IS NOT NULL)
        GROUP BY 1 ORDER BY 2 DESC`,
      commerceControls(this.prisma),
    ]);

    const t = totals[0] ?? {};
    const finished = n(t.delivered) + n(t.returned);
    const kinds = new Map<string, { kind: string; total: number; connected: number; paused: number; error: number; other: number }>();
    for (const r of channels) {
      const k = kinds.get(r.kind) ?? { kind: r.kind, total: 0, connected: 0, paused: 0, error: 0, other: 0 };
      k.total += r.count;
      if (!r.isActive) k.paused += r.count;
      else if (r.status === 'CONNECTED') k.connected += r.count;
      else if (r.status === 'ERROR' || r.status === 'SUSPENDED') k.error += r.count;
      else k.other += r.count;
      kinds.set(r.kind, k);
    }
    const providers = new Map<string, { provider: string; active: number; inactive: number }>();
    for (const c of couriersCfg) {
      const p = providers.get(c.provider) ?? { provider: c.provider, active: 0, inactive: 0 };
      if (c.isActive) p.active += c._count._all; else p.inactive += c._count._all;
      providers.set(c.provider, p);
    }

    return {
      range: { from: start, to: new Date(end.getTime() - 1) },
      channels: [...kinds.values()].sort((a, b) => b.total - a.total),
      totals: {
        orders: n(t.orders), gmv: round(n(t.gmv)), delivered: n(t.delivered), returned: n(t.returned), cancelled: n(t.cancelled),
        dispatched: n(t.dispatched), merchants: n(t.merchants),
        deliveryRate: finished ? round((n(t.delivered) / finished) * 100) : null,
        rtoRate: finished ? round((n(t.returned) / finished) * 100) : null,
        aov: n(t.orders) ? round(n(t.gmv) / n(t.orders)) : 0,
      },
      daily: daily.map((d) => ({ day: new Date(d.day).toISOString().slice(0, 10), orders: d.orders, gmv: round(n(d.gmv)) })),
      byKind: byKind.map((r) => ({ ...r, gmv: round(n(r.gmv)) })),
      topMerchants: top.map((r) => ({ ...r, gmv: round(n(r.gmv)) })),
      manualSources: sources,
      couriers: { accounts: [...providers.values()].sort((a, b) => b.active - a.active), used: couriersUsed },
      pausedTypes: Object.keys(controls.killSwitch),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CHANNELS
  // ═══════════════════════════════════════════════════════════

  async channels(q: ChannelQuery) {
    const limit = Math.min(100, Math.max(1, Math.floor(q.limit ?? 50)));
    const page = Math.max(1, Math.floor(q.page ?? 1));
    const where: Prisma.Sql[] = [Prisma.sql`i."type"::text IN (${Prisma.join(COMMERCE_TYPES)})`, Prisma.sql`t."slug" <> 'nafaa-system'`];
    if (q.tenantId) where.push(Prisma.sql`i."tenantId" = ${q.tenantId}`);
    if (q.kind) where.push(Prisma.sql`${KIND_SQL} = ${q.kind}`);
    if (q.status === 'PAUSED') where.push(Prisma.sql`i."isActive" = false`);
    else if (q.status) where.push(Prisma.sql`i."isActive" = true AND i."status"::text = ${q.status}`);
    if (q.search?.trim()) {
      const s = `%${q.search.trim()}%`;
      where.push(Prisma.sql`(t."name" ILIKE ${s} OR i."displayName" ILIKE ${s} OR i."config" ->> 'siteUrl' ILIKE ${s} OR i."id" = ${q.search.trim()})`);
    }
    const since7 = new Date(Date.now() - 7 * DAY_MS);
    if (q.problems) where.push(Prisma.sql`(i."status" = 'ERROR' OR pf.c > 0 OR se.c > 0)`);
    // Laterals give push failures and failed syncs once, for both the filter and the columns.
    const from = Prisma.sql`
      FROM integrations i JOIN "Tenant" t ON t."id" = i."tenantId"
      CROSS JOIN LATERAL (SELECT count(*)::int AS c FROM product_channel_mappings m WHERE m."integrationId" = i."id" AND (m."syncError" IS NOT NULL OR m."syncStatus" = 'FAILED')) pf
      CROSS JOIN LATERAL (SELECT count(*)::int AS c FROM sync_logs s WHERE s."integrationId" = i."id" AND s."startedAt" >= ${since7} AND s."status" = 'FAILED') se
      WHERE ${Prisma.join(where, ' AND ')}`;
    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<ChannelRow[]>`
        SELECT i."id", i."tenantId", t."name" AS "tenantName", t."status"::text AS "tenantStatus", ${KIND_SQL} AS kind, i."type"::text AS type,
          i."displayName" AS name, i."status"::text AS status, i."isActive", i."lastSyncAt", i."lastSyncStatus"::text AS "lastSyncStatus", i."createdAt",
          i."config" ->> 'siteUrl' AS "siteUrl", i."config" ->> 'shopifyBilling' AS "shopifyBilling", i."config" -> 'shopifyPlan' AS "shopifyPlan",
          coalesce(i."config" ->> 'darazError', i."config" -> 'catalogWatch' -> 'scan' ->> 'error') AS "channelError",
          i."totalErrors", i."totalOrdersSynced" AS "ordersTotal",
          (SELECT max(o."receivedAt") FROM channel_orders o WHERE o."integrationId" = i."id") AS "lastOrderAt",
          (SELECT count(*)::int FROM product_channel_mappings m WHERE m."integrationId" = i."id") AS links,
          pf.c AS "pushFailures", se.c AS "syncErrors7d",
          (SELECT count(*)::int FROM webhook_logs w WHERE w."integrationId" = i."id" AND w."receivedAt" >= ${since7} AND w."errorMessage" IS NOT NULL) AS "webhookErrors7d"
        ${from}
        ORDER BY (pf.c + se.c) DESC, "lastOrderAt" DESC NULLS LAST, i."createdAt" DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<Array<{ total: number }>>`SELECT count(*)::int AS total ${from}`,
    ]);
    const paused = (await commerceControls(this.prisma)).killSwitch;
    return {
      items: rows.map((r) => ({
        ...r,
        shopifyPlan: r.type === 'SHOPIFY' ? { billing: r.shopifyBilling ?? 'direct', ...(r.shopifyPlan ?? {}) } : null,
        canPush: PUSH_TYPES.includes(r.type),
        killSwitch: paused[r.type as keyof typeof paused] === true,
      })),
      meta: { page, limit, total },
    };
  }

  async channel(id: string) {
    const i = await this.prisma.integration.findFirst({
      where: { id, type: { in: COMMERCE_TYPES } },
      select: {
        id: true, tenantId: true, shopId: true, type: true, displayName: true, status: true, isActive: true, config: true,
        syncDirection: true, autoSyncEnabled: true, lastSyncAt: true, lastSyncStatus: true, totalOrdersSynced: true, totalProductsSynced: true,
        totalErrors: true, webhookVerified: true, createdAt: true, updatedAt: true,
      },
    });
    if (!i) throw new NotFoundException('Channel not found');
    const since30 = new Date(Date.now() - 30 * DAY_MS);
    const [tenant, syncLogs, webhookLogs, failedLinks, links, orders30d, lastOrder, jobs] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: i.tenantId }, select: { id: true, name: true, status: true, businessType: true } }),
      this.prisma.syncLog.findMany({
        where: { integrationId: id }, orderBy: { startedAt: 'desc' }, take: 40,
        select: { id: true, operation: true, direction: true, status: true, recordsProcessed: true, recordsSuccess: true, recordsFailed: true, errorMessage: true, startedAt: true, completedAt: true },
      }),
      // Headers and body are left out (signatures, customer data).
      this.prisma.webhookLog.findMany({
        where: { integrationId: id }, orderBy: { receivedAt: 'desc' }, take: 40,
        select: { id: true, source: true, event: true, method: true, responseStatus: true, processed: true, errorMessage: true, receivedAt: true },
      }),
      this.prisma.productChannelMapping.findMany({
        where: { integrationId: id, OR: [{ syncError: { not: null } }, { syncStatus: 'FAILED' }] }, take: 30, orderBy: { lastSyncedAt: 'desc' },
        select: { id: true, productId: true, externalTitle: true, externalSku: true, syncError: true, lastSyncedAt: true, lastPush: true, product: { select: { name: true, sku: true } }, variant: { select: { name: true } } },
      }),
      this.prisma.productChannelMapping.groupBy({ by: ['syncStatus'], where: { integrationId: id }, _count: { _all: true } }),
      this.prisma.channelOrder.count({ where: { integrationId: id, receivedAt: { gte: since30 }, deletedAt: null } }),
      this.prisma.channelOrder.findFirst({ where: { integrationId: id }, orderBy: { receivedAt: 'desc' }, select: { receivedAt: true } }),
      this.prisma.catalogJob.findMany({ where: { integrationId: id }, orderBy: { createdAt: 'desc' }, take: 10, omit: { items: true } }),
    ]);
    const cfg = (i.config ?? {}) as Record<string, any>;
    const paused = (await commerceControls(this.prisma)).killSwitch;
    const kind = i.type === 'CUSTOM_WEBSITE' && cfg.indolj ? 'INDOLJ' : i.type;
    const { config: _c, ...rest } = i;
    return {
      ...rest,
      tenant,
      kind,
      canPush: PUSH_TYPES.includes(i.type),
      canScan: ['SHOPIFY', 'DARAZ', 'WOOCOMMERCE'].includes(i.type) || kind === 'INDOLJ',
      killSwitch: paused[i.type as keyof typeof paused] === true,
      // Only non-secret settings.
      settings: {
        siteUrl: cfg.siteUrl ?? null, platform: cfg.platform ?? null, shopId: cfg.shopId ?? i.shopId ?? null,
        pushStock: cfg.pushStock ?? null, pushPrice: cfg.pushPrice ?? null, pushContent: cfg.pushContent ?? null, autoLink: cfg.autoLink ?? null,
        stockMode: cfg.stockMode ?? null, priceSource: cfg.priceSource ?? null,
        shopifyBilling: i.type === 'SHOPIFY' ? cfg.shopifyBilling ?? 'direct' : null, shopifyPlan: i.type === 'SHOPIFY' ? cfg.shopifyPlan ?? null : null,
        channelError: cfg.darazError ?? cfg.catalogWatch?.scan?.error ?? null,
        lastScan: cfg.catalogWatch?.scan ?? null,
      },
      counts: {
        links: links.reduce((s, l) => s + l._count._all, 0),
        linksByStatus: Object.fromEntries(links.map((l) => [l.syncStatus, l._count._all])),
        failedLinks: await this.prisma.productChannelMapping.count({ where: { integrationId: id, OR: [{ syncError: { not: null } }, { syncStatus: 'FAILED' }] } }),
        orders30d, lastOrderAt: lastOrder?.receivedAt ?? null,
      },
      syncLogs,
      webhookLogs,
      failedLinks: failedLinks.map((m) => ({
        id: m.id, productId: m.productId, product: m.product?.name ?? null, variant: m.variant?.name ?? null, sku: m.externalSku ?? m.product?.sku ?? null,
        externalTitle: m.externalTitle, error: m.syncError, lastSyncedAt: m.lastSyncedAt, lastPush: m.lastPush,
      })),
      jobs: jobs.map((j) => this.jobs.view(j)),
    };
  }

  private async requireChannel(id: string): Promise<Integration> {
    const i = await this.prisma.integration.findFirst({ where: { id, type: { in: COMMERCE_TYPES } } });
    if (!i) throw new NotFoundException('Channel not found');
    return i;
  }

  /** Same change as the merchant's pause/resume button (website-setup.service setActive). */
  async setActive(adminId: string, id: string, active: boolean) {
    const i = await this.requireChannel(id);
    if (i.isActive === active) return { success: true, changed: false };
    // A channel with no API key was removed by the merchant; it is not brought back from here.
    if (active && !i.apiKey && i.type !== 'MANUAL' && i.type !== 'DARAZ' && i.type !== 'SHOPIFY') {
      throw new BadRequestException('This channel was removed by the shop; it cannot be resumed from admin');
    }
    await this.prisma.integration.update({
      where: { id },
      data: { isActive: active, status: active ? IntegrationStatus.CONNECTED : IntegrationStatus.DISCONNECTED },
    });
    await this.log(i.tenantId, adminId, active ? 'ADMIN_COMMERCE_CHANNEL_RESUMED' : 'ADMIN_COMMERCE_CHANNEL_PAUSED', i.id,
      `Super admin ${active ? 'resumed' : 'paused'} the ${i.type} channel "${i.displayName}"`, { previousStatus: i.status });
    return { success: true, changed: true };
  }

  /** Catalog re-scan: the same run as the half-hourly catalog watch (catalog-watch.service runChannel). */
  async rescan(adminId: string, id: string) {
    const i = await this.requireChannel(id);
    if (!i.isActive) throw new BadRequestException('Channel is paused');
    const cfg = (i.config ?? {}) as Record<string, any>;
    if (!PUSH_TYPES.includes(i.type) && !(i.type === 'CUSTOM_WEBSITE' && cfg.indolj)) throw new BadRequestException('This channel has no product list to scan');
    let scan: unknown = null;
    let error: string | null = null;
    try {
      scan = await this.watch.runChannel(i);
    } catch (e: any) {
      error = String(e?.message ?? e).slice(0, 300);
    }
    await this.log(i.tenantId, adminId, 'ADMIN_COMMERCE_CATALOG_RESCAN', i.id, `Super admin re-scanned the catalog of "${i.displayName}"`, { error, scan: scan as any });
    if (error) throw new BadRequestException(`Scan failed: ${error}`);
    return { success: true, scan };
  }

  /**
   * Stock and price re-push for every linked product, or only the failed
   * links. Runs as a background PUSH job, the same job the merchant's bulk
   * "Push" starts (online-products.service bulk), so big catalogs are chunked.
   */
  async repush(adminId: string, id: string, onlyFailed: boolean) {
    const i = await this.requireChannel(id);
    if (!PUSH_TYPES.includes(i.type)) throw new BadRequestException('Nafaa does not push to this channel type');
    if (!i.isActive) throw new BadRequestException('Channel is paused');
    if (!this.products.connected(i)) throw new BadRequestException('Channel is not connected; the shop has to reconnect it');
    if ((await commerceControls(this.prisma)).killSwitch[i.type as keyof CommerceControls['killSwitch']]) {
      throw new BadRequestException(`Pushes to ${i.type} are paused by the kill switch`);
    }
    const rows = await this.prisma.productChannelMapping.findMany({
      where: {
        integrationId: i.id, externalProductId: { not: null },
        ...(onlyFailed && { OR: [{ syncError: { not: null } }, { syncStatus: 'FAILED' }] }),
      },
      select: { productId: true }, distinct: ['productId'],
    });
    const items = rows.map((r) => r.productId);
    if (!items.length) throw new BadRequestException(onlyFailed ? 'No failed links on this channel' : 'No linked products on this channel');
    const res = await this.jobs.start({
      tenantId: i.tenantId, userId: adminId, kind: 'PUSH', integrationId: i.id, items,
      params: { channelIds: [i.id], channelType: i.type, content: false, status: onlyFailed, price: true, action: 'push', by: 'admin' },
    });
    await this.log(i.tenantId, adminId, onlyFailed ? 'ADMIN_COMMERCE_RETRY_FAILED_LINKS' : 'ADMIN_COMMERCE_STOCK_REPUSH', i.id,
      `Super admin ${onlyFailed ? 'retried failed links' : 're-pushed stock and price'} on "${i.displayName}" (${items.length} products)`,
      { jobId: res.job.id, existing: res.existing, products: items.length });
    return res;
  }

  // ═══════════════════════════════════════════════════════════
  // CATALOG JOBS
  // ═══════════════════════════════════════════════════════════

  async jobList(q: { status?: string; tenantId?: string; kind?: string; limit?: number; page?: number; search?: string }) {
    const statusWhere: Prisma.CatalogJobWhereInput =
      q.status === 'active' ? { status: { in: ACTIVE_STATUSES } }
        : q.status === 'failed' ? { OR: [{ status: 'FAILED' }, { status: 'DONE', failed: { gt: 0 } }] }
          : q.status && q.status !== 'all' ? { status: q.status.toUpperCase() } : {};
    const where: Prisma.CatalogJobWhereInput = {
      ...statusWhere,
      ...(q.tenantId && { tenantId: q.tenantId }),
      ...(q.kind && (JOB_KINDS as readonly string[]).includes(q.kind) && { kind: q.kind }),
    };
    // CatalogJob has no shop relation, so a shop-name search resolves ids first.
    if (q.search?.trim()) {
      const hit = await this.prisma.tenant.findMany({ where: { name: { contains: q.search.trim(), mode: 'insensitive' } }, select: { id: true }, take: 200 });
      where.tenantId = q.tenantId ? (hit.some((t) => t.id === q.tenantId) ? q.tenantId : '-') : { in: hit.map((t) => t.id) };
    }
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const page = Math.max(1, q.page ?? 1);
    const [jobs, total, counts] = await Promise.all([
      this.prisma.catalogJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, omit: { items: true } }),
      this.prisma.catalogJob.count({ where }),
      this.prisma.catalogJob.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const [tenants, channels] = await Promise.all([
      this.prisma.tenant.findMany({ where: { id: { in: [...new Set(jobs.map((j) => j.tenantId))] } }, select: { id: true, name: true } }),
      this.prisma.integration.findMany({ where: { id: { in: jobs.map((j) => j.integrationId).filter((x): x is string => !!x) } }, select: { id: true, displayName: true, type: true } }),
    ]);
    const tName = new Map(tenants.map((t) => [t.id, t.name]));
    const cMap = new Map(channels.map((c) => [c.id, c]));
    const now = Date.now();
    return {
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      jobs: jobs.map((j) => ({
        ...this.jobs.view(j),
        tenantId: j.tenantId, tenantName: tName.get(j.tenantId) ?? null,
        channel: j.integrationId ? cMap.get(j.integrationId) ?? null : null,
        createdById: j.createdById, cursor: j.cursor, heartbeatAt: j.heartbeatAt, updatedAt: j.updatedAt,
        // Active job whose lease ran out long ago: no worker is taking it.
        stalled: ACTIVE_STATUSES.includes(j.status as any) && !!j.heartbeatAt && now - j.heartbeatAt.getTime() > 10 * 60_000,
      })),
    };
  }

  async cancelJob(adminId: string, id: string) {
    const job = await this.prisma.catalogJob.findUnique({ where: { id }, omit: { items: true } });
    if (!job) throw new NotFoundException('Job not found');
    const res = await this.jobs.cancel(job.tenantId, id);
    await this.log(job.tenantId, adminId, 'ADMIN_COMMERCE_JOB_CANCELLED', id, `Super admin cancelled a ${job.kind} catalog job (${job.done}/${job.total} done)`, { kind: job.kind, integrationId: job.integrationId });
    return res;
  }

  /** Starts the same work again (same kind, channel, list and settings). Handlers skip what is already done. */
  async retryJob(adminId: string, id: string) {
    const job = await this.prisma.catalogJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (ACTIVE_STATUSES.includes(job.status as any)) throw new BadRequestException('Job is still running');
    if (job.status === 'DONE' && !job.failed) throw new BadRequestException('Job finished without failures');
    const items = Array.isArray(job.items) ? (job.items as unknown[]) : [];
    if (!items.length) throw new BadRequestException('Job has no work list to retry');
    const res = await this.jobs.start({
      tenantId: job.tenantId, userId: adminId, kind: job.kind as JobKind, integrationId: job.integrationId, items,
      params: { ...((job.params as Record<string, unknown>) ?? {}), retryOf: job.id, by: 'admin' },
    });
    await this.log(job.tenantId, adminId, 'ADMIN_COMMERCE_JOB_RETRIED', id, `Super admin retried a ${job.kind} catalog job (${items.length} items)`, { newJobId: res.job.id, existing: res.existing });
    return res;
  }

  // ═══════════════════════════════════════════════════════════
  // ORDERS MONITOR
  // ═══════════════════════════════════════════════════════════

  private readonly orderSelect = {
    id: true, tenantId: true, integrationId: true, externalOrderId: true, externalOrderNumber: true, customerName: true, customerPhone: true,
    customerCity: true, total: true, paymentMethod: true, paymentStatus: true, orderStatus: true, stage: true, nafaaSaleId: true,
    receivedAt: true, acceptedAt: true, dispatchedAt: true, deliveredAt: true, cancelledAt: true, returnedAt: true,
    courierName: true, courierCode: true, trackingNumber: true, courierStatus: true, courierBookedAt: true, deletedAt: true,
    integration: { select: { id: true, type: true, displayName: true } },
  } satisfies Prisma.ChannelOrderSelect;

  async searchOrders(q: string, pageIn?: number, limitIn?: number) {
    const limit = Math.min(100, Math.max(1, Math.floor(limitIn ?? 25)));
    const page = Math.max(1, Math.floor(pageIn ?? 1));
    const s = (q ?? '').trim().replace(/^#/, '');
    if (s.length < 3) throw new BadRequestException('Type at least 3 characters');
    const digits = s.replace(/\D/g, '');
    const phoneTail = digits.length >= 7 ? digits.slice(-10) : null;
    const where: Prisma.ChannelOrderWhereInput = {
      OR: [
        { externalOrderNumber: { in: [s, `#${s}`] } },
        { externalOrderId: s },
        { trackingNumber: s },
        { id: s },
        ...(phoneTail ? [{ customerPhone: { contains: phoneTail } }] : []),
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.channelOrder.findMany({ where, orderBy: { receivedAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: this.orderSelect }),
      this.prisma.channelOrder.count({ where }),
    ]);
    return { orders: await this.withTenants(rows), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async stuckOrders(pageIn?: number, limitIn?: number) {
    const limit = Math.min(100, Math.max(1, Math.floor(limitIn ?? 25)));
    const page = Math.max(1, Math.floor(pageIn ?? 1));
    const now = Date.now();
    const recent = new Date(now - 60 * DAY_MS);
    const pendingBefore = new Date(now - DAY_MS);
    const dispatchedBefore = new Date(now - STUCK_DAYS * DAY_MS);
    const live = { deletedAt: null, mergedIntoId: null } satisfies Prisma.ChannelOrderWhereInput;
    const pendingWhere: Prisma.ChannelOrderWhereInput = { ...live, orderStatus: { in: ['PENDING', 'ACCEPTING'] }, receivedAt: { gte: recent, lt: pendingBefore } };
    const transitWhere: Prisma.ChannelOrderWhereInput = {
      ...live, dispatchedAt: { gte: recent, lt: dispatchedBefore }, deliveredAt: null, returnedAt: null,
      orderStatus: { notIn: ['DELIVERED', ...CLOSED] },
    };
    const [pending, transit, pendingCount, transitCount, pendingByTenant, transitByTenant] = await Promise.all([
      this.prisma.channelOrder.findMany({ where: pendingWhere, orderBy: { receivedAt: 'asc' }, skip: (page - 1) * limit, take: limit, select: this.orderSelect }),
      this.prisma.channelOrder.findMany({ where: transitWhere, orderBy: { dispatchedAt: 'asc' }, skip: (page - 1) * limit, take: limit, select: this.orderSelect }),
      this.prisma.channelOrder.count({ where: pendingWhere }),
      this.prisma.channelOrder.count({ where: transitWhere }),
      this.prisma.channelOrder.groupBy({ by: ['tenantId'], where: pendingWhere, _count: { _all: true } }),
      this.prisma.channelOrder.groupBy({ by: ['tenantId'], where: transitWhere, _count: { _all: true } }),
    ]);
    const ids = [...new Set([...pendingByTenant, ...transitByTenant].map((r) => r.tenantId))];
    const names = new Map((await this.prisma.tenant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
    const byTenant = ids.map((id) => ({
      tenantId: id, name: names.get(id) ?? id,
      pending: pendingByTenant.find((r) => r.tenantId === id)?._count._all ?? 0,
      inTransit: transitByTenant.find((r) => r.tenantId === id)?._count._all ?? 0,
    })).sort((a, b) => b.pending + b.inTransit - (a.pending + a.inTransit));
    return {
      rules: { pendingHours: 24, dispatchedDays: STUCK_DAYS, lookbackDays: 60 },
      counts: { pending: pendingCount, inTransit: transitCount },
      meta: { page, limit },
      byTenant,
      pending: await this.withTenants(pending),
      inTransit: await this.withTenants(transit),
    };
  }

  async order(id: string) {
    const o = await this.prisma.channelOrder.findUnique({
      where: { id },
      select: {
        ...this.orderSelect, customerAddress: true, items: true, subtotal: true, deliveryFee: true, discount: true, metadata: true,
        processedAt: true, paymentReceivedAt: true, cancelReason: true, returnReason: true, courierLabelUrl: true, courierStatusAt: true,
        codSettledAt: true, codSettlementRef: true, courierCharge: true, codFee: true, followUpAt: true, followUpNote: true,
        replacementOfId: true, mergedIntoId: true,
      },
    });
    if (!o) throw new NotFoundException('Order not found');
    const meta = (o.metadata ?? {}) as Record<string, any>;
    const [tenant, sale, shipment] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: o.tenantId }, select: { id: true, name: true } }),
      o.nafaaSaleId ? this.prisma.sale.findFirst({ where: { id: o.nafaaSaleId, tenantId: o.tenantId }, select: { id: true, saleNumber: true, status: true, total: true, createdAt: true } }) : null,
      this.prisma.courierShipment.findUnique({ where: { orderId: o.id }, select: { provider: true, trackingNumber: true, status: true, lastEvent: true, lastEventAt: true, bookedAt: true, deliveredAt: true, returnedAt: true } }).catch(() => null),
    ]);
    const { metadata: _m, ...rest } = o;
    return {
      ...rest,
      tenant,
      sale,
      shipment,
      source: meta.source ?? null,
      platform: meta.platform ?? null,
      autoBookError: meta.autoBookError ?? null,
      timeline: Array.isArray(meta.timeline) ? meta.timeline.slice(-100) : [],
    };
  }

  private async withTenants<T extends { tenantId: string }>(rows: T[]) {
    const names = new Map((await this.prisma.tenant.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.tenantId))] } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
    return rows.map((r) => ({ ...r, tenantName: names.get(r.tenantId) ?? null }));
  }

  // ═══════════════════════════════════════════════════════════
  // COURIERS
  // ═══════════════════════════════════════════════════════════

  async couriers(tenantId?: string, list?: { search?: string; page?: number; limit?: number }) {
    // With `list`, the account table is paged and searched here; without it (shop panel) every account comes back.
    const limit = Math.min(100, Math.max(1, Math.floor(list?.limit ?? 25)));
    const page = Math.max(1, Math.floor(list?.page ?? 1));
    let accountWhere: Prisma.CourierConfigWhereInput = tenantId ? { tenantId } : {};
    if (list?.search?.trim()) {
      const term = list.search.trim();
      const hit = await this.prisma.tenant.findMany({ where: { name: { contains: term, mode: 'insensitive' } }, select: { id: true }, take: 200 });
      accountWhere = { ...accountWhere, OR: [{ tenantId: { in: hit.map((t) => t.id) } }, { provider: { in: Object.values(CourierProvider).filter((v) => v.toLowerCase().includes(term.toLowerCase().replace(/\s+/g, '_'))) } }] };
    }
    const since = new Date(Date.now() - 30 * DAY_MS);
    const tenantSql = tenantId ? Prisma.sql`AND o."tenantId" = ${tenantId}` : Prisma.empty;
    const [accounts, shipments, bookedByTenant, rates, recentErrors] = await Promise.all([
      this.prisma.courierConfig.findMany({
        where: accountWhere,
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
        ...(list && { skip: (page - 1) * limit, take: limit }),
        // apiKey / apiSecret are never read here.
        select: { id: true, tenantId: true, provider: true, isActive: true, isSandbox: true, lastTestedAt: true, lastSyncAt: true, lastError: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.courierShipment.groupBy({ by: ['tenantId', 'provider'], where: tenantId ? { tenantId } : {}, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ tenantId: string; courier: string; booked: number }>>`
        SELECT o."tenantId", o."courierCode" AS courier, count(*)::int AS booked FROM channel_orders o
        WHERE o."courierBookedAt" IS NOT NULL AND o."courierCode" IS NOT NULL ${tenantSql} GROUP BY 1, 2`,
      this.prisma.$queryRaw<Array<{ courier: string; booked: number; failed: number; tenants: number }>>`
        SELECT coalesce(o."courierCode", 'UNKNOWN') AS courier,
          count(*) FILTER (WHERE o."courierBookedAt" >= ${since})::int AS booked,
          count(*) FILTER (WHERE o."metadata" ->> 'autoBookError' IS NOT NULL AND o."courierBookedAt" IS NULL)::int AS failed,
          count(DISTINCT o."tenantId")::int AS tenants
        FROM channel_orders o
        WHERE (o."courierBookedAt" >= ${since} OR (o."receivedAt" >= ${since} AND o."metadata" ->> 'autoBookError' IS NOT NULL)) ${tenantSql}
        GROUP BY 1 ORDER BY 2 DESC`,
      this.prisma.$queryRaw<Array<{ id: string; tenantId: string; number: string | null; courier: string | null; error: string; receivedAt: Date }>>`
        SELECT o."id", o."tenantId", coalesce(o."externalOrderNumber", o."externalOrderId") AS number, o."courierCode" AS courier,
          o."metadata" ->> 'autoBookError' AS error, o."receivedAt"
        FROM channel_orders o
        WHERE o."metadata" ->> 'autoBookError' IS NOT NULL AND o."courierBookedAt" IS NULL AND o."receivedAt" >= ${since} ${tenantSql}
        ORDER BY o."receivedAt" DESC LIMIT 40`,
    ]);
    // Paged mode: account errors and header numbers come from their own queries, not from the visible page.
    const base: Prisma.CourierConfigWhereInput = tenantId ? { tenantId } : {};
    const [errorAccounts, accountTotal, accountActive, accountErrors, matched] = list
      ? await Promise.all([
        this.prisma.courierConfig.findMany({ where: { ...base, lastError: { not: null } }, orderBy: { updatedAt: 'desc' }, take: 40, select: { id: true, tenantId: true, provider: true, lastError: true, updatedAt: true } }),
        this.prisma.courierConfig.count({ where: base }),
        this.prisma.courierConfig.count({ where: { ...base, isActive: true } }),
        this.prisma.courierConfig.count({ where: { ...base, lastError: { not: null } } }),
        this.prisma.courierConfig.count({ where: accountWhere }),
      ])
      : [accounts.filter((a) => a.lastError), accounts.length, accounts.filter((a) => a.isActive).length, accounts.filter((a) => a.lastError).length, accounts.length];
    const tIds = [...new Set([...accounts.map((a) => a.tenantId), ...errorAccounts.map((a) => a.tenantId), ...recentErrors.map((e) => e.tenantId)])];
    const names = new Map((await this.prisma.tenant.findMany({ where: { id: { in: tIds } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
    return {
      accounts: accounts.map((a) => ({
        ...a,
        tenantName: names.get(a.tenantId) ?? null,
        shipments: (shipments.find((s) => s.tenantId === a.tenantId && s.provider === a.provider)?._count._all ?? 0)
          + (bookedByTenant.find((b) => b.tenantId === a.tenantId && b.courier === a.provider)?.booked ?? 0),
      })),
      accountStats: { total: accountTotal, active: accountActive, withError: accountErrors },
      meta: { page, limit, total: matched, totalPages: Math.max(1, Math.ceil(matched / limit)) },
      rates: rates.map((r) => ({ ...r, failureRate: r.booked + r.failed ? round((r.failed / (r.booked + r.failed)) * 100) : null })),
      recentErrors: [
        ...errorAccounts.map((a) => ({ kind: 'account' as const, tenantId: a.tenantId, tenantName: names.get(a.tenantId) ?? null, courier: a.provider, error: a.lastError!, at: a.updatedAt, orderId: null, number: null })),
        ...recentErrors.map((e) => ({ kind: 'booking' as const, tenantId: e.tenantId, tenantName: names.get(e.tenantId) ?? null, courier: e.courier, error: e.error, at: e.receivedAt, orderId: e.id, number: e.number })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 60),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CONTROLS
  // ═══════════════════════════════════════════════════════════

  async controls() {
    clearCommerceControlsCache();
    const [value, row] = await Promise.all([
      commerceControls(this.prisma),
      this.prisma.systemSetting.findUnique({ where: { key: COMMERCE_CONTROLS_KEY }, select: { updatedAt: true, updatedBy: { select: { fullName: true, email: true } } } }),
    ]);
    return { controls: value, updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null, options: { channelTypes: KILL_SWITCH_TYPES, modules: COMMERCE_MODULES, jobKinds: JOB_KINDS } };
  }

  async saveControls(admin: { id: string; tenantId: string }, body: unknown) {
    const before = await commerceControls(this.prisma);
    const next = parseCommerceControls(body);
    await this.prisma.systemSetting.upsert({
      where: { key: COMMERCE_CONTROLS_KEY },
      create: { key: COMMERCE_CONTROLS_KEY, value: JSON.stringify(next), category: 'commerce', description: 'Online store platform controls (Admin > Online store > Controls)', updatedById: admin.id },
      update: { value: JSON.stringify(next), updatedById: admin.id },
    });
    clearCommerceControlsCache();
    const turnedOn = Object.keys(next.killSwitch).filter((k) => !before.killSwitch[k as keyof typeof before.killSwitch]);
    const turnedOff = Object.keys(before.killSwitch).filter((k) => !next.killSwitch[k as keyof typeof next.killSwitch]);
    await this.log(admin.tenantId, admin.id, 'ADMIN_COMMERCE_CONTROLS_SAVED', null,
      `Super admin saved online store controls${turnedOn.length ? `; paused pushes: ${turnedOn.join(', ')}` : ''}${turnedOff.length ? `; resumed pushes: ${turnedOff.join(', ')}` : ''}`,
      { before: before as any, after: next as any });
    return this.controls();
  }

  /** What merchant screens need: paused channel types, "Coming soon" modules and the defaults. */
  async publicControls() {
    const c = await commerceControls(this.prisma);
    return {
      pausedChannelTypes: Object.keys(c.killSwitch),
      pausedNote: c.killSwitchNote,
      comingSoon: c.comingSoon,
      newShopDefaults: c.newShopDefaults,
      whatsappTemplates: c.whatsappTemplates,
      customStatuses: c.customStatuses,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PER TENANT
  // ═══════════════════════════════════════════════════════════

  async tenant(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
    if (!t) throw new NotFoundException('Tenant not found');
    const since30 = new Date(Date.now() - 30 * DAY_MS);
    const [channels, orders, orders30, byStatus, couriers, jobs] = await Promise.all([
      this.channels({ tenantId, limit: 100 }),
      this.prisma.channelOrder.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.channelOrder.count({ where: { tenantId, deletedAt: null, receivedAt: { gte: since30 } } }),
      this.prisma.channelOrder.groupBy({ by: ['orderStatus'], where: { tenantId, deletedAt: null, receivedAt: { gte: since30 } }, _count: { _all: true } }),
      this.couriers(tenantId),
      this.jobList({ tenantId, limit: 10 }),
    ]);
    return {
      tenant: t,
      channels: channels.items,
      orders: { total: orders, last30d: orders30, byStatus30d: Object.fromEntries(byStatus.map((s) => [s.orderStatus, s._count._all])) },
      links: channels.items.reduce((s, c) => s + n(c.links), 0),
      pushFailures: channels.items.reduce((s, c) => s + n(c.pushFailures), 0),
      couriers: couriers.accounts,
      courierErrors: couriers.recentErrors.slice(0, 10),
      jobs: jobs.jobs,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // IMPORT FIX (stock recovery) — read-only preview, apply on an explicit click
  // ═══════════════════════════════════════════════════════════

  stockRecovery(tenantId: string) {
    return this.handover.tenantPreview(tenantId);
  }

  async applyStockRecovery(adminId: string, tenantId: string, channelId: string, mappingIds: string[]) {
    if (!channelId) throw new BadRequestException('Pick a channel');
    const res = await this.handover.tenantApply(tenantId, channelId, mappingIds, adminId);
    await this.log(tenantId, adminId, 'COMMERCE_IMPORT_FIX', channelId, `Import fix applied: ${res.untracked} untracked, ${res.adjusted} stock restored`, { ...res, picked: mappingIds.length });
    return res;
  }

  // ═══════════════════════════════════════════════════════════
  // PRICE RECOVERY (drift re-send) — read-only preview, apply on an explicit click
  // ═══════════════════════════════════════════════════════════

  priceRecovery(tenantId: string) {
    return this.prices.tenantPreview(tenantId);
  }

  async applyPriceRecovery(adminId: string, tenantId: string, channelId: string, items: Array<{ mappingId: string; choice: PriceRecoveryChoice }>) {
    if (!channelId) throw new BadRequestException('Pick a channel');
    const res = await this.prices.tenantApply(tenantId, channelId, items, adminId);
    await this.log(tenantId, adminId, 'COMMERCE_PRICE_RECOVERY', channelId, `Price recovery applied: ${res.restored} channel prices back, ${res.kept} kept Nafaa price`, { ...res, picked: items.length });
    return res;
  }

  // ═══════════════════════════════════════════════════════════

  private async log(tenantId: string, adminId: string, action: string, entityId: string | null, description: string, metadata: Record<string, unknown>) {
    await this.prisma.activityLog.create({
      data: {
        tenantId, userId: adminId, action, entityType: entityId ? (action.includes('JOB') ? 'CATALOG_JOB' : 'INTEGRATION') : 'COMMERCE_CONTROLS', entityId,
        description, metadata: { ...metadata, by: 'super_admin' } as Prisma.InputJsonValue,
      },
    }).catch((e) => this.logger.warn(`Activity log ${action}: ${e?.message}`));
  }
}
