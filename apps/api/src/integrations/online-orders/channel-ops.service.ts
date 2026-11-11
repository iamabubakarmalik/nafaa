import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '../../core/system-control/cron.decorator';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { apiText } from '../../common/i18n/api-message';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteSetupService } from './website-setup.service';
import { ShopifyService } from './shopify.service';
import { WooCommerceService } from './woocommerce.service';
import { DarazService } from './daraz.service';
import { OnlineProductsService } from './online-products.service';
import { OrderPlatform, normalizeOrder } from './order-normalizer';
import { readWebsiteConfig } from './website-config';
import { SHOPIFY_ORDERS, shopifyRestShape } from './shopify-orders';
import {
  INBOUND_TARGETS, OUTBOUND_BOARDS, STATUS_DEFS, StatusChannel, compactStatusMap, inboundSteps, isStatusChannel,
  plainStatusKeys, readStatusMap, shopifyStatusKeys,
} from './channel-status-map';

/** How far back "Sync now" looks for orders a webhook may have missed. */
const PULL_DAYS = 3;
/** The background catch-up never looks back more than this. */
const PULL_MAX_HOURS = 24;
const LOG_PAGE = 30;

/**
 * Channel operations shared by every sales channel page: the order status
 * mapping (read, save, apply what a channel reports), pulling recent
 * orders a webhook may have missed, "Sync now", and the readable activity
 * log (sync logs + webhook logs, paginated on the server).
 */
@Injectable()
export class ChannelOpsService {
  private readonly logger = new Logger(ChannelOpsService.name);
  private pulling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly orders: OnlineOrdersService,
    private readonly shopify: ShopifyService,
    private readonly woo: WooCommerceService,
    private readonly daraz: DarazService,
    private readonly products: OnlineProductsService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // STATUS MAPPING
  // ═══════════════════════════════════════════════════════════

  private statusChannel(i: Integration): StatusChannel | null {
    if (!isStatusChannel(i.type)) return null;
    // Indolj runs on a custom website channel but its statuses are fixed.
    if (i.type === 'CUSTOM_WEBSITE' && (readWebsiteConfig(i.config) as any).indolj?.activationToken) return null;
    return i.type;
  }

  /** Whether Nafaa can actually send statuses to this channel right now. */
  private outboundLive(i: Integration) {
    if (i.type === 'SHOPIFY') return this.shopify.isConnected(i);
    if (i.type === 'WOOCOMMERCE') return this.woo.isConnected(i);
    if (i.type === 'DARAZ') return this.daraz.isConnected(i);
    return !!readWebsiteConfig(i.config).statusWebhookUrl;
  }

  async statusMap(user: AuthenticatedUser, id: string) {
    this.setup.assertCanManage(user);
    const i = await this.setup.requireChannel(user.tenantId, id);
    const type = this.statusChannel(i);
    if (!type) return { channel: null, inbound: [], outbound: [], targets: INBOUND_TARGETS, customInbound: false, freeOutbound: false, outboundLive: false };
    const def = STATUS_DEFS[type];
    const map = readStatusMap(type, readWebsiteConfig(i.config).statusMap);
    const defaults = readStatusMap(type, null);
    return {
      channel: type,
      targets: INBOUND_TARGETS,
      customInbound: def.customInbound,
      freeOutbound: def.freeOutbound,
      outboundLive: this.outboundLive(i),
      inbound: Object.entries(map.inbound).map(([key, target]) => ({ key, target, defaultTarget: defaults.inbound[key] ?? 'NONE', custom: !(key in defaults.inbound) })),
      outbound: OUTBOUND_BOARDS.filter((b) => def.outbound[b]).map((board) => ({
        board, action: map.outbound[board]!, defaultAction: defaults.outbound[board]!, options: def.outbound[board]!,
      })),
    };
  }

  async saveStatusMap(user: AuthenticatedUser, id: string, body: { inbound?: Record<string, string>; outbound?: Record<string, string>; remove?: string[] }) {
    this.setup.assertCanManage(user);
    const i = await this.setup.requireChannel(user.tenantId, id);
    const type = this.statusChannel(i);
    if (!type) throw new BadRequestException(apiText('Is channel ke status pakke hain — badle nahi ja sakte'));
    const fresh = await this.prisma.integration.findUniqueOrThrow({ where: { id: i.id }, select: { config: true } });
    const raw = ((fresh.config as any) ?? {}) as Record<string, any>;
    const current = readStatusMap(type, raw.statusMap);
    const next = readStatusMap(type, {
      inbound: { ...current.inbound, ...(body.inbound ?? {}) },
      outbound: { ...current.outbound, ...(body.outbound ?? {}) },
    });
    for (const k of body.remove ?? []) {
      const key = String(k).toLowerCase();
      if (!STATUS_DEFS[type].inbound.some((s) => s.key === key)) delete next.inbound[key];
    }
    await this.prisma.integration.update({ where: { id: i.id }, data: { config: { ...raw, statusMap: compactStatusMap(type, next) } as any } });
    return this.statusMap(user, id);
  }

  /** The channel reported these status keys for one of its orders: run the mapped steps. */
  async applyInbound(integration: Integration, externalOrderId: string, keys: string[], reason?: string) {
    const type = this.statusChannel(integration);
    const order = await this.prisma.channelOrder.findUnique({
      where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId } },
      select: { id: true, orderStatus: true, paymentStatus: true, nafaaSaleId: true, dispatchedAt: true, metadata: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!type) return { success: true, steps: 0, mapped: false };
    if ((order.metadata as any)?.test) return { success: true, steps: 0, mapped: true };
    const steps = inboundSteps(readStatusMap(type, readWebsiteConfig(integration.config).statusMap), keys, order);
    if (!steps.length) return { success: true, steps: 0, mapped: true };
    const why = reason?.trim().slice(0, 200) || apiText('Store par status badla');
    const needsActor = steps.some((s) => s.kind === 'status' || s.kind === 'returned');
    const actor = needsActor ? await this.orders.systemActor(integration.tenantId) : null;
    const all = new ShopScope(null, true);
    for (const s of steps) {
      if (s.kind === 'paid') await this.orders.applyWebsiteUpdate(integration, externalOrderId, { paid: true });
      else if (s.kind === 'cancel') await this.orders.applyWebsiteUpdate(integration, externalOrderId, { cancelled: true, reason: why });
      else if (s.kind === 'returned') await this.orders.markReturned(actor!, all, order.id, why);
      else await this.orders.updateStatus(actor!, all, order.id, { status: s.status });
    }
    return { success: true, steps: steps.length, mapped: true };
  }

  /** Status keys carried by an order webhook of this platform. */
  keysFromWebhook(platform: OrderPlatform, body: any): string[] {
    if (platform === 'shopify') return shopifyStatusKeys(body);
    if (platform === 'woocommerce') return plainStatusKeys(body?.status);
    if (platform === 'custom') return plainStatusKeys(body?.status ?? body?.orderStatus, body?.paymentStatus ?? body?.payment?.status);
    return [];
  }

  // ═══════════════════════════════════════════════════════════
  // ORDER PULL — orders a webhook may have missed
  // ═══════════════════════════════════════════════════════════

  /** Orders updated on the store since `since`: new ones come in, known ones get their mapped status. */
  async pullOrders(i: Integration, since: Date): Promise<{ seen: number; created: number; updated: number }> {
    const out = { seen: 0, created: 0, updated: 0 };
    let rows: Array<{ body: any; platform: OrderPlatform }> = [];
    if (i.type === 'SHOPIFY') {
      if (!this.shopify.isConnected(i) || this.shopify.planBlocked(i)) return out;
      const client = await this.shopify.client(i);
      if (!client) return out;
      const nodes = await client.paginate<any>(SHOPIFY_ORDERS, 'orders', { q: `updated_at:>='${since.toISOString()}'` }, 6);
      rows = nodes.map((n) => ({ body: shopifyRestShape(n), platform: 'shopify' as const }));
    } else if (i.type === 'WOOCOMMERCE') {
      const client = this.woo.client(i);
      if (!client) return out;
      const list = await client.all<any>('/orders', { modified_after: since.toISOString(), dates_are_gmt: true, orderby: 'modified', order: 'asc', per_page: 50 }, 6);
      rows = list
        .filter((o) => !['checkout-draft', 'trash', 'auto-draft'].includes(String(o?.status ?? '')))
        .map((o) => ({ body: o, platform: 'woocommerce' as const }));
    } else if (i.type === 'DARAZ') {
      const r = await this.daraz.syncOrders(i);
      return { seen: r.seen, created: r.created, updated: 0 };
    } else {
      return out;
    }
    for (const { body, platform } of rows) {
      out.seen++;
      try {
        const normalized = normalizeOrder(body, platform);
        if (!normalized.externalOrderId || !normalized.items.length) continue;
        const known = await this.prisma.channelOrder.findUnique({
          where: { integrationId_externalOrderId: { integrationId: i.id, externalOrderId: normalized.externalOrderId } }, select: { id: true },
        });
        await this.orders.receive(i, normalized, { signed: true });
        if (!known) out.created++;
        const r = await this.applyInbound(i, normalized.externalOrderId, this.keysFromWebhook(platform, body));
        if (known && r.steps) out.updated++;
      } catch (e: any) {
        this.logger.warn(`Order pull ${i.displayName}: ${e?.message}`);
      }
    }
    await this.prisma.syncLog.create({
      data: {
        integrationId: i.id, tenantId: i.tenantId, operation: 'ORDER_PULL', direction: 'INBOUND', status: 'SUCCESS',
        recordsProcessed: out.seen, recordsSuccess: out.created + out.updated, recordsFailed: 0, details: out, completedAt: new Date(),
      },
    }).catch(() => null);
    return out;
  }

  /** Every 30 minutes: Shopify and WooCommerce orders updated since the last pull (webhooks can be missed). */
  @Cron('40 */30 * * * *')
  async pullAll() {
    if (this.pulling || process.env.DISABLE_ORDER_PULL === '1') return;
    this.pulling = true;
    try {
      const list = await this.prisma.integration.findMany({ where: { type: { in: ['SHOPIFY', 'WOOCOMMERCE'] }, isActive: true, status: IntegrationStatus.CONNECTED } });
      for (const i of list) {
        if (!(i.type === 'SHOPIFY' ? this.shopify.isConnected(i) : this.woo.isConnected(i))) continue;
        const last = Date.parse(String((i.config as any)?.ordersPulledAt ?? ''));
        const floor = Date.now() - PULL_MAX_HOURS * 3600_000;
        // Ten minutes of overlap; a first run looks back two hours.
        const since = new Date(Number.isFinite(last) ? Math.max(floor, last - 10 * 60_000) : Date.now() - 2 * 3600_000);
        const startedAt = new Date();
        try {
          await this.pullOrders(i, since);
          const fresh = await this.prisma.integration.findUnique({ where: { id: i.id }, select: { config: true } });
          await this.prisma.integration.update({ where: { id: i.id }, data: { config: { ...((fresh?.config as any) ?? {}), ordersPulledAt: startedAt.toISOString() } } });
        } catch (e: any) {
          this.logger.warn(`Order pull ${i.displayName}: ${e?.message}`);
        }
      }
    } finally {
      this.pulling = false;
    }
  }

  /** "Sync now" on the channel page: missed orders from the last few days, then stock and prices. */
  async syncNow(user: AuthenticatedUser, id: string) {
    this.setup.assertCanManage(user);
    const i = await this.setup.requireChannel(user.tenantId, id);
    if (!i.isActive) throw new BadRequestException(apiText('Channel band hai — pehle chalu karein'));
    const result: { orders: { seen: number; created: number; updated: number } | null; catalog: unknown; notes: string[] } = { orders: null, catalog: null, notes: [] };
    try {
      if (['SHOPIFY', 'WOOCOMMERCE', 'DARAZ'].includes(i.type)) result.orders = await this.pullOrders(i, new Date(Date.now() - PULL_DAYS * 86_400_000));
      else result.notes.push(apiText('Ye channel orders khud bhejta hai — laane ko kuch nahi'));
    } catch (e: any) {
      result.notes.push(String(e?.response?.message ?? e?.message ?? e).slice(0, 200));
    }
    if (['SHOPIFY', 'WOOCOMMERCE', 'DARAZ'].includes(i.type)) {
      try {
        result.catalog = await this.products.syncChannel(user, id);
      } catch (e: any) {
        result.notes.push(String(e?.response?.message ?? e?.message ?? e).slice(0, 200));
      }
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIVITY — sync logs + webhook logs, one paginated list
  // ═══════════════════════════════════════════════════════════

  async logs(user: AuthenticatedUser, id: string, q: { page?: string; filter?: string }) {
    this.setup.assertCanManage(user);
    const i = await this.setup.requireChannel(user.tenantId, id);
    const page = Math.max(1, Math.min(500, Math.floor(Number(q.page) || 1)));
    const filter = ['err', 'in', 'out'].includes(String(q.filter)) ? String(q.filter) : 'all';
    const where = filter === 'err' ? Prisma.sql`WHERE NOT x.ok` : filter === 'in' ? Prisma.sql`WHERE x.dir = 'INBOUND'` : filter === 'out' ? Prisma.sql`WHERE x.dir = 'OUTBOUND'` : Prisma.empty;
    const union = Prisma.sql`
      SELECT s.id, 'SYNC' AS source, s.operation AS code, s.direction::text AS dir, (s.status::text <> 'FAILED') AS ok,
             s."errorMessage" AS error, s."startedAt" AS at, s."recordsSuccess" AS done, s."recordsFailed" AS failed,
             s.details->>'orderId' AS ref, s.details->>'action' AS action
        FROM sync_logs s WHERE s."integrationId" = ${i.id}
      UNION ALL
      SELECT w.id, 'WEBHOOK', w.event, 'INBOUND', w.processed, w."errorMessage", w."receivedAt", 0, 0,
             COALESCE(w.body->>'number', w.body->>'name', w.body->>'order_number', w.body->>'orderNumber', w.body->>'id', w.body->>'orderId'),
             w.body->>'status'
        FROM webhook_logs w WHERE w."integrationId" = ${i.id}`;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string; source: string; code: string; dir: string; ok: boolean; error: string | null; at: Date; done: number; failed: number; ref: string | null; action: string | null }>>`
        SELECT * FROM (${union}) x ${where} ORDER BY x.at DESC LIMIT ${LOG_PAGE} OFFSET ${(page - 1) * LOG_PAGE}`,
      this.prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM (${union}) x ${where}`,
    ]);
    return {
      page, pageSize: LOG_PAGE, total: total[0]?.n ?? 0,
      rows: rows.map((r) => ({
        id: r.id, source: r.source, code: r.code, kind: r.dir === 'INBOUND' ? 'IN' : 'OUT', ok: r.ok, error: r.error, at: r.at,
        done: Number(r.done) || 0, failed: Number(r.failed) || 0, ref: r.ref ? String(r.ref).slice(0, 40) : null, action: r.action,
      })),
    };
  }
}
