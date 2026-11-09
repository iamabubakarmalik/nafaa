/**
 * Meta catalog sync: Nafaa products to the shop's Meta catalog (Facebook and
 * Instagram Shops, ads) through the Catalog items_batch API.
 *
 * Items come from the Google feed builder (same links, prices, sale prices
 * and backorder availability). Only items whose content changed since the
 * last send go out; items no longer in the feed are deleted. Runs: after
 * stock changes (debounced), every 15 minutes when products were edited,
 * daily in full, and on "Abhi sync karein". Every run is logged.
 */

import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { apiText } from '../../common/i18n/api-message';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { StockChanged, stockEvents } from '../../common/shop-scope/stock-events';
import { GoogleService } from '../google/google.service';
import { feedAvailability } from '../google/feed';
import { CatalogItemInput, catalogBatches, catalogDiff } from './meta-graph';
import { MetaGraphError, MetaGraphService, metaFail } from './meta-graph.service';
import { MetaService } from './meta.service';
import { metaAccess } from './meta-access';

const DEBOUNCE_MS = 2 * 60_000;

export type CatalogTrigger = 'CHANGE' | 'DAILY' | 'MANUAL';

@Injectable()
export class MetaCatalogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('MetaCatalog');
  private readonly dirty = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private readonly busy = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphService,
    private readonly meta: MetaService,
    private readonly google: GoogleService,
  ) {}

  private readonly onStock = (e: StockChanged) => {
    if (process.env.DISABLE_META_JOBS === '1') return;
    this.dirty.add(e.tenantId);
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const tenants = [...this.dirty];
      this.dirty.clear();
      this.syncTenants(tenants, 'CHANGE').catch((err) => this.logger.warn(`Catalog change sync: ${err?.message}`));
    }, DEBOUNCE_MS);
  };

  onModuleInit() {
    stockEvents.on('changed', this.onStock);
  }

  onModuleDestroy() {
    stockEvents.off('changed', this.onStock);
    if (this.timer) clearTimeout(this.timer);
  }

  /** Every 15 minutes: shops whose products were edited after the last sync. */
  @Cron('0 */15 * * * *')
  async sweep() {
    if (process.env.DISABLE_META_JOBS === '1') return;
    const conns = await this.prisma.metaConnection.findMany({ where: { catalogSync: true, status: 'CONNECTED', catalogId: { not: null } }, select: { tenantId: true, catalogSyncedAt: true } }).catch(() => []);
    const due: string[] = [];
    for (const c of conns) {
      const since = c.catalogSyncedAt ?? new Date(0);
      const changed = await this.prisma.product.count({ where: { tenantId: c.tenantId, updatedAt: { gt: since } } }).catch(() => 0);
      if (changed) due.push(c.tenantId);
    }
    await this.syncTenants(due, 'CHANGE');
  }

  /** Daily full send (refreshes everything Meta holds). */
  @Cron('0 20 3 * * *')
  async daily() {
    if (process.env.DISABLE_META_JOBS === '1') return;
    const conns = await this.prisma.metaConnection.findMany({ where: { catalogSync: true, status: 'CONNECTED', catalogId: { not: null } }, select: { tenantId: true } }).catch(() => []);
    await this.syncTenants(conns.map((c) => c.tenantId), 'DAILY');
  }

  private async syncTenants(tenants: string[], trigger: CatalogTrigger) {
    for (const t of tenants) await this.sync(t, trigger).catch((e) => this.logger.warn(`Catalog ${t}: ${(e as Error).message}`));
  }

  /* ───────────────────────── merchant API ───────────────────────── */

  async overview(user: AuthenticatedUser) {
    const conn = await this.graph.connection(user.tenantId);
    const [runs, items] = await Promise.all([
      this.prisma.metaCatalogSync.findMany({ where: { tenantId: user.tenantId }, orderBy: { startedAt: 'desc' }, take: 15 }),
      conn?.catalogId ? this.prisma.metaCatalogItem.count({ where: { tenantId: user.tenantId, catalogId: conn.catalogId } }) : Promise.resolve(0),
    ]);
    return {
      catalogId: conn?.catalogId ?? null,
      enabled: !!conn?.catalogSync,
      items,
      lastSyncedAt: conn?.catalogSyncedAt?.toISOString() ?? null,
      runs: runs.map((r) => ({
        id: r.id, trigger: r.trigger, status: r.status, sent: r.sent, removed: r.removed, failed: r.failed, unchanged: r.unchanged,
        message: r.message, errors: (r.errors as Array<{ id: string; message: string }> | null) ?? [], startedAt: r.startedAt.toISOString(), finishedAt: r.finishedAt?.toISOString() ?? null,
      })),
    };
  }

  /** Creates a catalog in the chosen business and selects it. */
  async createCatalog(user: AuthenticatedUser, body: { name?: string }) {
    this.meta.assertManager(user);
    const conn = await this.meta.require(user.tenantId);
    if (!conn.businessId) throw new BadRequestException('Pehle Facebook business chunein');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } });
    const name = String(body?.name ?? '').trim().slice(0, 100) || `${tenant?.name ?? 'Nafaa'} — Nafaa`;
    const res = await this.graph.call<{ id: string }>(user.tenantId, { method: 'POST', path: `${conn.businessId}/owned_product_catalogs`, body: { name } });
    const catalogs = [...((Array.isArray(conn.catalogs) ? conn.catalogs : []) as Array<{ id: string; name: string; businessId?: string }>), { id: res.id, name, businessId: conn.businessId }];
    const row = await this.prisma.metaConnection.update({
      where: { tenantId: user.tenantId },
      data: { catalogs: catalogs as unknown as Prisma.InputJsonValue, catalogId: res.id },
    });
    return this.meta.view(row);
  }

  async syncNow(user: AuthenticatedUser) {
    this.meta.assertManager(user);
    return this.sync(user.tenantId, 'MANUAL', { force: true });
  }

  /* ───────────────────────── sync ───────────────────────── */

  async sync(tenantId: string, trigger: CatalogTrigger, o: { force?: boolean } = {}) {
    if (this.busy.has(tenantId)) return { status: 'SKIPPED', message: 'Sync pehle se chal raha hai' };
    const conn = await this.graph.connection(tenantId);
    if (!conn || conn.status !== 'CONNECTED' || !conn.catalogId) {
      if (o.force) throw metaFail('not_connected', apiText('Pehle Facebook jorein aur catalog chunein'));
      return { status: 'SKIPPED' };
    }
    if (!conn.catalogSync && !o.force) return { status: 'SKIPPED' };
    if (!(await metaAccess(this.prisma, tenantId)).live) return { status: 'SKIPPED' };
    const catalogId = conn.catalogId;
    this.busy.add(tenantId);
    const run = await this.prisma.metaCatalogSync.create({ data: { tenantId, catalogId, trigger, status: 'RUNNING' } });
    try {
      let items: CatalogItemInput[];
      try {
        const settings = await this.google.read(tenantId);
        const built = await this.google.buildItems(tenantId, { ...settings, includeOutOfStock: true });
        items = built.items.map((i) => ({ ...i, availability: feedAvailability(i) }));
      } catch (e) {
        throw new BadRequestException(e instanceof BadRequestException && /website ya order form/.test(String((e.getResponse() as any)?.message ?? e.message))
          ? 'Pehle Online store me website ya order form jorein — Facebook ko har product ka safha chahiye'
          : (e as Error).message);
      }
      const sentRows = await this.prisma.metaCatalogItem.findMany({ where: { tenantId, catalogId }, select: { retailerId: true, hash: true } });
      const sent = new Map(sentRows.map((r) => [r.retailerId, r.hash]));
      const diff = catalogDiff(items, sent, trigger === 'DAILY' || trigger === 'MANUAL');
      const batches = catalogBatches(diff);
      const handles: string[] = [];
      const errors: Array<{ id: string; message: string }> = [];
      for (const b of batches) {
        const res = await this.graph.call<{ handles?: string[]; validation_status?: Array<{ retailer_id: string; errors?: Array<{ message: string }> }> }>(tenantId, {
          method: 'POST', path: `${catalogId}/items_batch`, body: b,
        });
        handles.push(...(res?.handles ?? []));
        for (const v of res?.validation_status ?? []) for (const er of v.errors ?? []) errors.push({ id: v.retailer_id, message: er.message });
      }
      const bad = new Set(errors.map((e) => e.id));
      const now = new Date();
      for (const u of diff.upserts) {
        if (bad.has(u.id)) continue;
        await this.prisma.metaCatalogItem.upsert({
          where: { tenantId_catalogId_retailerId: { tenantId, catalogId, retailerId: u.id } },
          create: { tenantId, catalogId, retailerId: u.id, hash: u.hash, syncedAt: now },
          update: { hash: u.hash, syncedAt: now },
        });
      }
      if (diff.deletes.length) await this.prisma.metaCatalogItem.deleteMany({ where: { tenantId, catalogId, retailerId: { in: diff.deletes } } });
      // Batch results arrive later; one status check gives early errors when there is a handle.
      if (handles[0]) {
        const st = await this.graph.call<{ data?: Array<{ status?: string; errors?: Array<{ id?: string; retailer_id?: string; message?: string }> }> }>(tenantId, {
          path: `${catalogId}/check_batch_request_status`, params: { handle: handles[0] }, attempts: 1,
        }).catch(() => null);
        for (const er of st?.data?.[0]?.errors ?? []) errors.push({ id: String(er.retailer_id ?? er.id ?? ''), message: String(er.message ?? '') });
      }
      const failed = new Set(errors.map((e) => e.id)).size;
      const status = errors.length ? (failed >= diff.upserts.length && diff.upserts.length ? 'FAILED' : 'PARTIAL') : 'SUCCESS';
      await this.prisma.metaCatalogSync.update({
        where: { id: run.id },
        data: {
          status, sent: diff.upserts.length - failed, removed: diff.deletes.length, failed, unchanged: diff.unchanged, handles,
          errors: errors.length ? (errors.slice(0, 50) as unknown as Prisma.InputJsonValue) : undefined, finishedAt: new Date(),
        },
      });
      await this.prisma.metaConnection.update({ where: { tenantId }, data: { catalogSyncedAt: now } });
      return { status, sent: diff.upserts.length - failed, removed: diff.deletes.length, failed, unchanged: diff.unchanged };
    } catch (e) {
      const message = e instanceof MetaGraphError ? e.friendly : (e as Error).message;
      await this.prisma.metaCatalogSync.update({ where: { id: run.id }, data: { status: 'FAILED', message: message.slice(0, 500), finishedAt: new Date() } });
      if (o.force) throw e;
      return { status: 'FAILED', message };
    } finally {
      this.busy.delete(tenantId);
    }
  }
}
