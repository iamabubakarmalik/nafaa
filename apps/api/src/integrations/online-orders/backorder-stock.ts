/**
 * Backorder stock: the database side of "sell when out of stock".
 *  - floors for accepting an online order (how far below zero a line may go)
 *  - the per-product settings screen (product, sizes, channel links)
 *  - orders waiting for stock, oldest first, and an alert when stock arrives
 */

import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { StockChanged, stockEvents } from '../../common/shop-scope/stock-events';
import { mappingKey } from './mapping-key';
import {
  availability, backorderRule, cleanBackorderInput, leadTimeText, owedUnits, stockFloor, supportsBackorder,
} from './backorder';
import { OnlineProductsService } from './online-products.service';

/** A line of an accepted order sold beyond the stock on hand. */
export interface BackorderLine {
  index: number;
  productId: string;
  variantId: string | null;
  name: string;
  qty: number;
}

type Line = { name: string; quantity: number };
type Match = { productId: string; variantId?: string | null };

/** Orders still to be sent (accepted, not yet handed to the courier). */
const WAITING_STATUSES = ['CONFIRMED', 'PREPARING', 'READY'];
const WAITING_SCAN = 3000;
const ALERT_DEBOUNCE_MS = 20_000;
const ALERT_EVERY_MS = 60 * 60_000;

/**
 * Per order line: the lowest the branch stock may reach (null = normal rule)
 * and which lines go below zero. Lines of the same item add up in order.
 */
export async function backorderFloors(
  prisma: PrismaService,
  integration: Pick<Integration, 'id' | 'type'>,
  shopId: string,
  items: Line[],
  matched: Match[],
): Promise<{ floors: Array<number | null>; lines: BackorderLine[] }> {
  const productIds = [...new Set(matched.map((m) => m?.productId).filter(Boolean))];
  if (!productIds.length || !supportsBackorder(integration.type)) return { floors: items.map(() => null), lines: [] };
  const [products, links, stocks] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, backorder: true, backorderMax: true, variants: { select: { id: true, backorder: true } } },
    }),
    prisma.productChannelMapping.findMany({ where: { integrationId: integration.id, productId: { in: productIds } }, select: { productId: true, variantId: true, backorder: true } }),
    prisma.shopStock.findMany({ where: { shopId, productId: { in: productIds } }, select: { productId: true, variantId: true, stock: true } }),
  ]);
  const used = new Map<string, number>();
  const floors: Array<number | null> = [];
  const lines: BackorderLine[] = [];
  items.forEach((it, i) => {
    const m = matched[i];
    const p = m ? products.find((x) => x.id === m.productId) : undefined;
    if (!m || !p) { floors.push(null); return; }
    const vid = m.variantId ?? null;
    const v = vid ? p.variants.find((x) => x.id === vid) : null;
    const link = links.find((l) => l.productId === p.id && (l.variantId ?? null) === vid) ?? links.find((l) => l.productId === p.id && !l.variantId);
    const floor = stockFloor(backorderRule(p, v, link, integration.type));
    floors.push(floor);
    const key = mappingKey(p.id, vid);
    const before = Number(stocks.find((s) => s.productId === p.id && (s.variantId ?? null) === vid)?.stock ?? 0) - (used.get(key) ?? 0);
    const qty = Number(it.quantity) || 0;
    used.set(key, (used.get(key) ?? 0) + qty);
    const owed = owedUnits(before - qty) - owedUnits(before);
    if (floor !== null && owed > 0) lines.push({ index: i, productId: p.id, variantId: vid, name: it.name, qty: owed });
  });
  return { floors, lines };
}

export interface BackorderSaveBody {
  backorder?: boolean | null;
  max?: number | null;
  leadDays?: number | null;
  note?: string | null;
  variants?: Array<{ id: string; backorder: boolean | null }>;
  links?: Array<{ mappingId: string; backorder: boolean | null }>;
}

@Injectable()
export class BackorderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackorderService.name);
  private readonly queue = new Map<string, Set<string>>();
  private readonly lastAlert = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;
  private readonly onChanged = (e: StockChanged) => this.queueAlert(e);

  constructor(
    private readonly prisma: PrismaService,
    private readonly products: OnlineProductsService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    stockEvents.on('changed', this.onChanged);
  }

  onModuleDestroy() {
    stockEvents.off('changed', this.onChanged);
    if (this.timer) clearTimeout(this.timer);
  }

  // ─── Settings ────────────────────────────────────────────────

  /** The product's backorder settings, sizes, channel links, owed units and waiting orders. */
  async get(user: AuthenticatedUser, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: {
        id: true, name: true, hasVariants: true, backorder: true, backorderMax: true, backorderLeadDays: true, backorderNote: true,
        variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, backorder: true } },
        channelMappings: {
          where: { integration: { isActive: true } },
          select: { id: true, variantId: true, backorder: true, integration: { select: { id: true, displayName: true, type: true } } },
        },
        shopStocks: { select: { shopId: true, variantId: true, stock: true, shop: { select: { name: true } } } },
      },
    });
    if (!p) throw new NotFoundException('Product nahi mila');
    const rows = p.hasVariants && p.variants.length ? p.variants.map((v) => ({ id: v.id as string | null, name: v.name as string | null, backorder: v.backorder })) : [{ id: null, name: null, backorder: null }];
    const stockOf = (vid: string | null) => p.shopStocks.filter((s) => (s.variantId ?? null) === vid).reduce((t, s) => t + Number(s.stock), 0);
    const owedByShop = new Map<string, { shopId: string; shop: string; owed: number }>();
    for (const s of p.shopStocks) {
      const o = owedUnits(Number(s.stock));
      if (!o) continue;
      const cur = owedByShop.get(s.shopId) ?? { shopId: s.shopId, shop: s.shop?.name ?? '', owed: 0 };
      cur.owed += o;
      owedByShop.set(s.shopId, cur);
    }
    const product = { backorder: p.backorder, backorderMax: p.backorderMax, backorderLeadDays: p.backorderLeadDays, backorderNote: p.backorderNote };
    return {
      productId: p.id,
      name: p.name,
      backorder: p.backorder,
      max: p.backorderMax,
      leadDays: p.backorderLeadDays,
      note: p.backorderNote,
      leadText: leadTimeText(backorderRule(product)),
      variants: rows.map((r) => {
        const stock = stockOf(r.id);
        const rule = backorderRule(product, r);
        return { id: r.id, name: r.name, backorder: r.backorder, stock, owed: owedUnits(stock), availability: availability(Math.max(0, stock), rule, stock) };
      }),
      links: p.channelMappings
        .filter((m) => m.integration.type !== 'MANUAL')
        .map((m) => ({
          mappingId: m.id, variantId: m.variantId, channelId: m.integration.id, channel: m.integration.displayName, type: m.integration.type,
          backorder: m.backorder, supported: supportsBackorder(m.integration.type),
        })),
      owed: [...owedByShop.values()],
      waiting: await this.waiting(user.tenantId, [p.id]),
    };
  }

  async save(user: AuthenticatedUser, productId: string, body: BackorderSaveBody) {
    const p = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true, variants: { select: { id: true } } } });
    if (!p) throw new NotFoundException('Product nahi mila');
    const data = cleanBackorderInput({ backorder: body.backorder, max: body.max, leadDays: body.leadDays, note: body.note });
    const tri = (v: unknown) => (v === true ? true : v === false ? false : null);
    const variantIds = new Set(p.variants.map((v) => v.id));
    const variants = (body.variants ?? []).filter((v) => variantIds.has(String(v?.id)));
    const linkIds = (body.links ?? []).map((l) => String(l?.mappingId));
    const owned = linkIds.length
      ? new Set((await this.prisma.productChannelMapping.findMany({ where: { id: { in: linkIds }, productId: p.id }, select: { id: true } })).map((m) => m.id))
      : new Set<string>();
    if (linkIds.some((id) => !owned.has(id))) throw new BadRequestException('Channel link is product ka nahi');
    await this.prisma.$transaction([
      ...(Object.keys(data).length ? [this.prisma.product.update({ where: { id: p.id }, data })] : []),
      ...variants.map((v) => this.prisma.productVariant.update({ where: { id: v.id }, data: { backorder: tri(v.backorder) } })),
      ...(body.links ?? []).map((l) => this.prisma.productChannelMapping.update({ where: { id: String(l.mappingId) }, data: { backorder: tri(l.backorder) } })),
    ]);
    this.pushSoon(user, [p.id]);
    return this.get(user, p.id);
  }

  /** Bulk on/off for many products (Products & stock bar). */
  async bulk(user: AuthenticatedUser, productIds: string[], on: boolean | null) {
    let updated = 0;
    for (let k = 0; k < productIds.length; k += 5000) {
      const r = await this.prisma.product.updateMany({ where: { tenantId: user.tenantId, id: { in: productIds.slice(k, k + 5000) } }, data: { backorder: on } });
      updated += r.count;
    }
    this.pushSoon(user, productIds);
    return updated;
  }

  /** The channel setting goes out with the next stock push; this sends it now (kill switch and channel flags still apply). */
  private pushSoon(user: AuthenticatedUser, productIds: string[]) {
    if (!productIds.length) return;
    this.products.bulk(user, { selection: { productIds }, action: 'push', value: 'stock' })
      .catch((e) => this.logger.debug(`Backorder push skipped: ${e?.message}`));
  }

  // ─── Waiting orders ──────────────────────────────────────────

  /** Accepted orders with backorder lines still to send, oldest first. */
  async waiting(tenantId: string, productIds?: string[]) {
    const orders = await this.prisma.channelOrder.findMany({
      where: { tenantId, orderStatus: { in: WAITING_STATUSES } },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, orderStatus: true, acceptedAt: true, receivedAt: true, metadata: true, shopId: true,
        integration: { select: { displayName: true, type: true } },
      },
      orderBy: { acceptedAt: 'asc' },
      take: WAITING_SCAN,
    });
    const want = productIds?.length ? new Set(productIds) : null;
    const out = orders.flatMap((o) => {
      const lines = (((o.metadata as Prisma.JsonObject | null)?.backorder ?? []) as unknown as BackorderLine[])
        .filter((l) => l && typeof l.productId === 'string' && (!want || want.has(l.productId)));
      if (!lines.length) return [];
      return [{
        id: o.id, number: o.externalOrderNumber ?? o.externalOrderId, customer: o.customerName, status: o.orderStatus,
        acceptedAt: o.acceptedAt ?? o.receivedAt, channel: o.integration.displayName, shopId: o.shopId,
        lines: lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, name: l.name, qty: Number(l.qty) || 0 })),
      }];
    });
    // Current stock of each waiting item, so the screen can say which orders can go now.
    const ids = [...new Set(out.flatMap((o) => o.lines.map((l) => l.productId)))];
    const stocks = ids.length ? await this.prisma.shopStock.findMany({ where: { tenantId, productId: { in: ids } }, select: { shopId: true, productId: true, variantId: true, stock: true } }) : [];
    const left = new Map(stocks.map((s) => [`${s.shopId}|${mappingKey(s.productId, s.variantId)}`, Number(s.stock)]));
    // Units that arrived for the owed lines = branch stock + all units still owed there.
    // They go to the oldest order first; a line is ready when what is left covers it.
    const owedAhead = new Map<string, number>();
    for (const o of out) for (const l of o.lines) {
      const k = `${o.shopId}|${mappingKey(l.productId, l.variantId)}`;
      owedAhead.set(k, (owedAhead.get(k) ?? 0) + l.qty);
    }
    const shared = new Map<string, number>();
    return out.map((o) => ({
      ...o,
      lines: o.lines.map((l) => {
        const k = `${o.shopId}|${mappingKey(l.productId, l.variantId)}`;
        const pool = shared.has(k) ? shared.get(k)! : (left.get(k) ?? 0) + (owedAhead.get(k) ?? 0);
        const ready = pool >= l.qty;
        shared.set(k, pool - l.qty);
        return { ...l, ready };
      }),
    }));
  }

  // ─── Alert when stock arrives ────────────────────────────────

  private queueAlert(e: StockChanged) {
    if (!e?.tenantId || !e.productId) return;
    const set = this.queue.get(e.tenantId) ?? new Set<string>();
    set.add(e.productId);
    this.queue.set(e.tenantId, set);
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushAlerts().catch((err) => this.logger.warn(`Backorder alert: ${err?.message}`));
    }, ALERT_DEBOUNCE_MS);
  }

  /** Stock came in (purchase, adjustment, return) for an item customers are waiting for: tell the shop to send those first. */
  private async flushAlerts() {
    const queued = [...this.queue.entries()];
    this.queue.clear();
    const since = new Date(Date.now() - ALERT_DEBOUNCE_MS - 60_000);
    for (const [tenantId, ids] of queued) {
      const productIds = [...ids].slice(0, 500);
      const incoming = await this.prisma.stockMovement.findMany({
        where: { tenantId, productId: { in: productIds }, quantity: { gt: 0 }, createdAt: { gte: since } },
        select: { productId: true },
        distinct: ['productId'],
      });
      if (!incoming.length) continue;
      const waiting = await this.waiting(tenantId, incoming.map((m) => m.productId));
      for (const productId of new Set(waiting.flatMap((o) => o.lines.map((l) => l.productId)))) {
        const key = `${tenantId}|${productId}`;
        if (Date.now() - (this.lastAlert.get(key) ?? 0) < ALERT_EVERY_MS) continue;
        this.lastAlert.set(key, Date.now());
        const orders = waiting.filter((o) => o.lines.some((l) => l.productId === productId));
        const name = orders[0].lines.find((l) => l.productId === productId)?.name ?? 'Product';
        this.notifications.alert({
          tenantId, event: 'onlineOrder', type: 'INFO',
          title: `Stock aa gaya: ${name}`,
          message: `${orders.length} backorder order intezar me — pehle inhe bhejein (${orders.slice(0, 3).map((o) => o.number).join(', ')})`,
          link: '/online-store/products?filter=backorder',
          metadata: { kind: 'BACKORDER_STOCK', productId },
        });
      }
    }
    if (this.lastAlert.size > 5000) this.lastAlert.clear();
  }
}
