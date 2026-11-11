import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '../../core/system-control/cron.decorator';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { StockPushService } from './stock-push.service';
import { OnlineProductsService, PRODUCT_CHANNEL_TYPES } from './online-products.service';
import { AlertKind, alertDue, autoImportAllowed, itemKey, pickSureLinks, watchStep } from './catalog-watch';
import { apiMessage } from '../../common/i18n/api-message';
import { ChannelSyncService } from './channel-sync.service';

/** How often a channel's list is read again, by its size (big lists cost many requests). */
export function scanEveryMs(remoteItems: number) {
  if (remoteItems > 1000) return 6 * 3600_000;
  if (remoteItems > 300) return 2 * 3600_000;
  return 30 * 60_000;
}

/** A run that has not finished after this long is treated as stuck and the next run may start. */
const STUCK_RUN_MS = 45 * 60_000;
/** Product webhooks are checked again once a day for channels that need them. */
const HOOKS_EVERY_MS = 24 * 3600_000;

/**
 * Is a channel's watch run due? `onlyNew`: channels never scanned that link or
 * import by themselves (the 5-minute pass). Otherwise: by list size since the
 * last run. A run that failed before recording a scan counts from lastRunAt,
 * so a failing channel is retried on the normal schedule, not every 5 minutes.
 */
export function dueNow(config: unknown, onlyNew: boolean, now: number) {
  const cfg = (config ?? {}) as any;
  const w = (cfg.catalogWatch ?? {}) as any;
  const scanned = Date.parse(w.scan?.at ?? '');
  const ran = Date.parse(w.lastRunAt ?? '');
  const last = Math.max(Number.isFinite(scanned) ? scanned : 0, Number.isFinite(ran) ? ran : 0);
  if (onlyNew) return (cfg.autoLink === true || cfg.autoImport === true) && !Number.isFinite(scanned) && (!last || now - last >= 30 * 60_000);
  return !last || now - last >= scanEveryMs(Number(w.scan?.items ?? 0)) - 60_000;
}

const hooksDue = (h: { at?: string; ok?: boolean } | null | undefined, now: number) => {
  const at = Date.parse(h?.at ?? '');
  return !Number.isFinite(at) || now - at >= (h?.ok ? HOOKS_EVERY_MS : 6 * 3600_000);
};

/**
 * Catalog watch, per channel on a schedule:
 *  - links "Pakka" (SKU/barcode) matches when the channel has "Pakke match khud jorein" on;
 *  - brings new channel products into Nafaa when "Website ke naye products khud
 *    Nafaa me laayein" is on (product webhooks do it within seconds; this is the fallback);
 *  - runs the price source sync (send, take in, or hold a price changed on the channel);
 *  - keeps the Masle panel numbers (open, sure, new unlinked, new importable);
 *  - alerts (at most one per channel and kind a day): sync failures, a new
 *    channel product unlinked for 24 h, a disconnected channel, prices waiting.
 * Every run records `catalogWatch.lastRunAt` and `lastError`, also when a step fails.
 * A developer-built website is never read.
 */
@Injectable()
export class CatalogWatchService {
  private readonly logger = new Logger(CatalogWatchService.name);
  /** Start of the running sweep, or 0. One sweep at a time per process. */
  private runningSince = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly products: OnlineProductsService,
    private readonly push: StockPushService,
    private readonly notifications: NotificationsService,
    private readonly sync: ChannelSyncService,
  ) {}

  private disabled() {
    return process.env.DISABLE_CATALOG_WATCH === '1';
  }

  /** Every 30 minutes: channels whose next read is due. */
  @Cron('0 7,37 * * * *')
  async sweep() {
    if (this.disabled()) return;
    await this.runAll(false);
  }

  /** Every 5 minutes: channels that just connected (or just switched auto-link or auto-import on). */
  @Cron('0 */5 * * * *')
  async fresh() {
    if (this.disabled()) return;
    await this.runAll(true);
  }

  /** Every 5 minutes: new Nafaa products due on channels ("Naye products Nafaa se khud website par"). */
  @Cron('30 */5 * * * *')
  async publishSweep() {
    if (this.disabled()) return;
    const list = await this.prisma.integration.findMany({
      where: { type: { in: ['SHOPIFY', 'WOOCOMMERCE'] }, isActive: true, status: IntegrationStatus.CONNECTED, apiKey: { not: null } },
    });
    for (const i of list) {
      if (!this.products.connected(i) || ((i.config as any)?.autoPublish ?? 'OFF') === 'OFF') continue;
      await this.sync.publishDue(i).catch((e) => this.logger.warn(`Auto publish ${i.displayName}: ${e?.message}`));
    }
  }

  async runAll(onlyNew: boolean) {
    if (this.runningSince) {
      // A hung channel read must not stop the watch for every channel until a restart.
      if (Date.now() - this.runningSince < STUCK_RUN_MS) return;
      this.logger.warn(`Catalog watch: previous run started ${Math.round((Date.now() - this.runningSince) / 60_000)} min ago, starting a new one`);
    }
    const started = Date.now();
    this.runningSince = started;
    try {
      const list = await this.prisma.integration.findMany({
        where: { type: { in: [...PRODUCT_CHANNEL_TYPES] }, isActive: true, apiKey: { not: null }, status: { in: [IntegrationStatus.CONNECTED, IntegrationStatus.ERROR] } },
        // Least recently watched first, so one slow channel cannot starve the rest.
        orderBy: { updatedAt: 'asc' },
      });
      for (const i of list) {
        if (this.runningSince !== started) return;
        if (!dueNow(i.config, onlyNew, Date.now())) continue;
        await this.runChannel(i).catch((e) => this.logger.warn(`Catalog watch ${i.displayName}: ${e?.message}`));
      }
    } finally {
      if (this.runningSince === started) this.runningSince = 0;
    }
  }

  async runChannel(i: Integration) {
    const c = this.products.col(i);
    if (c.mode === 'website') return null;
    const startedAt = Date.now();
    const w = ((i.config as any)?.catalogWatch ?? {}) as any;
    try {
      return await this.watchChannel(i, c, w, startedAt);
    } catch (e: any) {
      // Record the failure so the channel shows when it last ran and why it stopped.
      const error = String(e?.message ?? e ?? 'Error').slice(0, 300);
      await this.products.patchWatch(i.id, (cur) => ({ ...cur, lastRunAt: new Date(startedAt).toISOString(), lastError: error, lastMs: Date.now() - startedAt }))
        .catch(() => null);
      throw e;
    }
  }

  private async watchChannel(i: Integration, c: ReturnType<OnlineProductsService['col']>, w: any, now: number) {
    const push = c.mode === 'woocommerce' || c.mode === 'shopify' || c.mode === 'daraz';
    const alerts: AlertKind[] = [];
    const stepErrors: string[] = [];
    const step = async <T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await run();
      } catch (e: any) {
        stepErrors.push(`${name}: ${String(e?.message ?? e).slice(0, 160)}`);
        this.logger.warn(`Catalog watch ${i.displayName} ${name}: ${e?.message}`);
        return fallback;
      }
    };

    let disconnected = push && (!this.products.connected(i) || i.status === IntegrationStatus.ERROR);
    const sc = disconnected ? null : await this.products.scan(c, true);
    if (sc?.remoteFailure) {
      const status = Number((sc.remoteFailure as any)?.status ?? 0);
      if (status === 401 || status === 403 || /permission|ijazat|jura nahi/i.test(sc.remoteError ?? '')) disconnected = true;
    }
    if (disconnected) alerts.push('disconnected');
    const readOk = !!sc && !sc.remoteFailure;

    let autoLinked = 0;
    const linkedKeys = new Set<string>();
    if (sc && readOk && c.cfg.autoLink) {
      const res = await step('link', () => this.products.linkSureFor(c, sc, true), { saved: 0, errors: [] as string[] });
      autoLinked = res.saved;
      if (res.saved) for (const l of pickSureLinks(sc.results)) linkedKeys.add(itemKey(l, { externalVariantId: l.externalVariantId ?? null }));
    }

    const openKeys = sc ? sc.open.map(({ p, v }) => itemKey(p, v)).filter((k) => !linkedKeys.has(k)) : w.state?.seen ?? [];
    const watch = sc && readOk ? watchStep(w.state, openKeys, now) : { state: w.state ?? null, staleNew: 0 };

    // New channel products with no Nafaa match: counted for "Naye products website par", imported when auto-import is on.
    let newProducts = sc && readOk && push && watch.state ? this.products.newProductIds(sc, watch.state).length : Number(w.scan?.newProducts ?? 0);
    let autoImported = 0;
    if (sc && readOk && newProducts && autoImportAllowed(c.cfg, c.mode, c.shopId)) {
      const ids = this.products.newProductIds(sc, watch.state);
      const res = await step('import', () => this.products.autoImport(c, ids, 'watch'), { imported: 0, queued: 0 });
      autoImported = res.imported + res.queued;
      if (autoImported) newProducts = Math.max(0, newProducts - autoImported);
    }
    if (watch.staleNew > 0 && !autoImported) alerts.push('unlinked');

    // Price source sync after the read (channel prices are fresh now).
    let prices = { sent: 0, pulled: 0, held: 0 };
    if (sc && readOk && push && c.cfg.priceFrom !== 'NONE') {
      prices = await step('price', () => this.push.pushPricesFor(i), prices);
    }

    // Stock edited by hand on the channel and missed by webhooks (read by this scan).
    let handEdits = 0;
    if (sc && readOk && push && c.cfg.stockFromChannel) {
      handEdits = (await step('stock', () => this.sync.scanHandEdits(i), null))?.taken ?? 0;
    }

    const [failed, priceHeld] = push
      ? await Promise.all([
          this.prisma.productChannelMapping.count({ where: { integrationId: i.id, syncStatus: 'FAILED' } }),
          this.prisma.productChannelMapping.count({ where: { integrationId: i.id, NOT: { priceHold: { equals: Prisma.DbNull } } } }).catch(() => 0),
        ])
      : [0, 0];
    if (failed > 0) alerts.push('sync');
    if (prices.held > 0) alerts.push('price');

    // Product webhooks for channels that auto-import or follow channel prices (checked once a day).
    if (push && !disconnected && (c.cfg.autoImport || c.cfg.priceFrom !== 'NONE' || c.cfg.contentFrom !== 'NONE' || c.cfg.stockFromChannel) && hooksDue(w.productHooks, now)) {
      await step('hooks', () => this.products.installProductHooks(i), null);
    }

    const sure = sc && !c.cfg.autoLink ? sc.results.filter((r) => r.match?.kind === 'sku').length : 0;
    const sentAlerts: Record<string, string> = { ...(w.alerts ?? {}) };
    for (const kind of alerts) {
      if (!alertDue(sentAlerts[kind], now)) continue;
      await this.alert(i, kind, { failed, staleNew: watch.staleNew, held: priceHeld, reason: sc?.remoteError ?? (i.config as any)?.darazError ?? null });
      sentAlerts[kind] = new Date(now).toISOString();
    }

    const scan = {
      at: new Date(now).toISOString(),
      items: sc ? sc.linked + sc.open.length : Number(w.scan?.items ?? 0),
      open: openKeys.length,
      sure,
      newUnlinked: watch.state ? Object.keys(watch.state.firstSeen).length : 0,
      newProducts,
      autoLinked,
      autoImported,
      prices,
      priceHeld,
      handEdits,
      error: disconnected ? sc?.remoteError ?? 'Channel jura nahi' : sc?.remoteError ?? null,
    };
    const lastError = stepErrors.length ? stepErrors.join(' · ').slice(0, 300) : scan.error;
    await this.products.patchWatch(i.id, (cur) => ({
      ...cur, state: watch.state, alerts: sentAlerts, scan, lastRunAt: new Date(now).toISOString(), lastError, lastMs: Date.now() - now,
    }));
    return scan;
  }

  private async alert(i: Integration, kind: AlertKind, info: { failed: number; staleNew: number; held: number; reason: string | null }) {
    const filter = kind === 'unlinked' ? 'unlinked' : kind === 'price' ? 'price-hold' : 'errors';
    const text = {
      sync: {
        title: apiMessage('{{channel}}: Stock/Price nahi ja raha', { channel: i.displayName }),
        message: info.failed === 1
          ? 'Ek product par sync ruka hua hai — Online products me dekhein'
          : apiMessage('{{count}} products par sync ruka hua hai — Online products me dekhein', { count: info.failed }),
      },
      unlinked: {
        title: apiMessage('{{channel}}: naye products jure nahi', { channel: i.displayName }),
        message: info.staleNew === 1
          ? 'Ek naya product 24 ghante se Nafaa se jura nahi — Stock nahi ja raha'
          : apiMessage('{{count}} naye products 24 ghante se Nafaa se jure nahi — Stock nahi ja raha', { count: info.staleNew }),
      },
      disconnected: { title: apiMessage('{{channel}} jura nahi', { channel: i.displayName }), message: info.reason ?? 'Channel ki permission khatam — dobara jorein' },
      price: {
        title: apiMessage('{{channel}}: website par qeemat badli', { channel: i.displayName }),
        message: apiMessage('{{count}} products ki qeemat website par badli — kaunsi rakhein? Products & stock me dekhein', { count: info.held }),
      },
    }[kind];
    await this.notifications.create({
      tenantId: i.tenantId,
      type: kind === 'unlinked' ? 'INFO' : 'WARNING',
      title: text.title,
      message: text.message,
      link: `/online-store/products?channel=${i.id}&filter=${filter}`,
      metadata: { kind: 'ONLINE_PRODUCTS', alert: kind, channelId: i.id },
    } as any).catch((e) => this.logger.warn(`Alert ${i.displayName}: ${e?.message}`));
  }
}
