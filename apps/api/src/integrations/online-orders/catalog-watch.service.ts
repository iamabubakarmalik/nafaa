import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Integration, IntegrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { StockPushService } from './stock-push.service';
import { OnlineProductsService, PRODUCT_CHANNEL_TYPES } from './online-products.service';
import { AlertKind, alertDue, itemKey, pickSureLinks, watchStep } from './catalog-watch';

/** How often a channel's list is read again, by its size (big lists cost many requests). */
export function scanEveryMs(remoteItems: number) {
  if (remoteItems > 1000) return 6 * 3600_000;
  if (remoteItems > 300) return 2 * 3600_000;
  return 30 * 60_000;
}

/**
 * Catalog watch, per channel on a schedule:
 *  - links "Pakka" (SKU/barcode) matches when the channel has "Pakke match khud jorein" on;
 *  - re-sends prices the channel changed on its own (backoff in the price push);
 *  - keeps the Masle panel numbers (open, sure, new unlinked);
 *  - alerts (at most one per channel and kind a day): sync failures, a new
 *    channel product unlinked for 24 h, a disconnected channel.
 * A developer-built website is never read.
 */
@Injectable()
export class CatalogWatchService {
  private readonly logger = new Logger(CatalogWatchService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly products: OnlineProductsService,
    private readonly push: StockPushService,
    private readonly notifications: NotificationsService,
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

  /** Every 5 minutes: channels that just connected (or just switched auto-link on). */
  @Cron('0 */5 * * * *')
  async fresh() {
    if (this.disabled()) return;
    await this.runAll(true);
  }

  async runAll(onlyNew: boolean) {
    if (this.running) return;
    this.running = true;
    try {
      const list = await this.prisma.integration.findMany({
        where: { type: { in: [...PRODUCT_CHANNEL_TYPES] }, isActive: true, apiKey: { not: null }, status: { in: [IntegrationStatus.CONNECTED, IntegrationStatus.ERROR] } },
      });
      for (const i of list) {
        const w = ((i.config as any)?.catalogWatch ?? {}) as any;
        const last = Date.parse(w.scan?.at ?? '');
        if (onlyNew) {
          if (!(i.config as any)?.autoLink || Number.isFinite(last)) continue;
        } else if (Number.isFinite(last) && Date.now() - last < scanEveryMs(Number(w.scan?.items ?? 0)) - 60_000) {
          continue;
        }
        await this.runChannel(i).catch((e) => this.logger.warn(`Catalog watch ${i.displayName}: ${e?.message}`));
      }
    } finally {
      this.running = false;
    }
  }

  async runChannel(i: Integration) {
    const c = this.products.col(i);
    if (c.mode === 'website') return null;
    const now = Date.now();
    const push = c.mode === 'woocommerce' || c.mode === 'shopify' || c.mode === 'daraz';
    const w = ((i.config as any)?.catalogWatch ?? {}) as any;
    const alerts: AlertKind[] = [];

    let disconnected = push && (!this.products.connected(i) || i.status === IntegrationStatus.ERROR);
    const sc = disconnected ? null : await this.products.scan(c, true);
    if (sc?.remoteFailure) {
      const status = Number((sc.remoteFailure as any)?.status ?? 0);
      if (status === 401 || status === 403 || /permission|ijazat|jura nahi/i.test(sc.remoteError ?? '')) disconnected = true;
    }
    if (disconnected) alerts.push('disconnected');

    let autoLinked = 0;
    const linkedKeys = new Set<string>();
    if (sc && !sc.remoteFailure && c.cfg.autoLink) {
      const res = await this.products.linkSureFor(c, sc, true);
      autoLinked = res.saved;
      if (res.saved) for (const l of pickSureLinks(sc.results)) linkedKeys.add(itemKey(l, { externalVariantId: l.externalVariantId ?? null }));
    }

    // Price changed on the channel itself: send Nafaa's price again (the push backs off on repeats).
    if (sc && push && c.cfg.pushPrice) await this.push.pushPricesFor(i).catch((e) => this.logger.warn(`Price drift ${i.displayName}: ${e?.message}`));

    const openKeys = sc ? sc.open.map(({ p, v }) => itemKey(p, v)).filter((k) => !linkedKeys.has(k)) : w.state?.seen ?? [];
    const step = sc && !sc.remoteFailure ? watchStep(w.state, openKeys, now) : { state: w.state ?? null, staleNew: 0 };
    if (step.staleNew > 0) alerts.push('unlinked');

    const failed = push ? await this.prisma.productChannelMapping.count({ where: { integrationId: i.id, syncStatus: 'FAILED' } }) : 0;
    if (failed > 0) alerts.push('sync');

    const sure = sc && !c.cfg.autoLink ? sc.results.filter((r) => r.match?.kind === 'sku').length : 0;
    const sentAlerts: Record<string, string> = { ...(w.alerts ?? {}) };
    for (const kind of alerts) {
      if (!alertDue(sentAlerts[kind], now)) continue;
      await this.alert(i, kind, { failed, staleNew: step.staleNew, reason: sc?.remoteError ?? (i.config as any)?.darazError ?? null });
      sentAlerts[kind] = new Date(now).toISOString();
    }

    const scan = {
      at: new Date(now).toISOString(),
      items: sc ? sc.linked + sc.open.length : Number(w.scan?.items ?? 0),
      open: openKeys.length,
      sure,
      newUnlinked: step.state ? Object.keys(step.state.firstSeen).length : 0,
      autoLinked,
      error: disconnected ? sc?.remoteError ?? 'Channel jura nahi' : sc?.remoteError ?? null,
    };
    await this.products.patchWatch(i.id, () => ({ state: step.state, alerts: sentAlerts, scan }));
    return scan;
  }

  private async alert(i: Integration, kind: AlertKind, info: { failed: number; staleNew: number; reason: string | null }) {
    const filter = kind === 'unlinked' ? 'unlinked' : 'errors';
    const text = {
      sync: { title: `${i.displayName}: Stock/Price nahi ja raha`, message: `${info.failed} ${info.failed === 1 ? 'product' : 'products'} par sync ruka hua hai — Online products me dekhein` },
      unlinked: { title: `${i.displayName}: naye products jure nahi`, message: `${info.staleNew} naye ${info.staleNew === 1 ? 'product' : 'products'} 24 ghante se Nafaa se jure nahi — Stock nahi ja raha` },
      disconnected: { title: `${i.displayName} jura nahi`, message: info.reason ?? 'Channel ki permission khatam — dobara jorein' },
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
