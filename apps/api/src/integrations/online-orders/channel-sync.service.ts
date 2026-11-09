import { BadRequestException, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Integration, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../common/shop-scope';
import { ChannelContentService } from './channel-content.service';
import { CatalogJobsService } from './catalog-jobs.service';
import { readWebsiteConfig, WebsiteConfig } from './website-config';
import { ContentSnapshot, ContentState, contentDecision, contentHash, handEditQty, isContentEcho, orderUnits, plainText } from './sync-rules';
import { InventoryHookEvent, ProductHookEvent } from './product-hooks';
import { logPriceBatch, logSync, SyncLogRow } from './price-sync';
import { mappingKey } from './mapping-key';

const PUSH_TYPES = ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ'];
/** Inventory events wait this long so the order webhook of the same sale is in first. */
const STOCK_SETTLE_MS = 3 * 60_000;
const MAX_PUBLISH_PER_RUN = 200;

type NafaaContent = { id: string; name: string; description: string | null; images: Array<{ url: string }> };

const snapshotOf = (p: NafaaContent): ContentSnapshot => ({ title: p.name, description: p.description ?? '', images: p.images.map((x) => x.url) });

/**
 * Two-way channel sync beyond prices:
 *  - content (name, description, pictures) by the channel's `contentFrom`,
 *    with Nafaa's own pushes never coming back as channel changes;
 *  - stock edited by hand on the channel ("Website par badla"), taken into
 *    Nafaa as an adjustment; Nafaa's pushes and channel orders are not;
 *  - new Nafaa products made on the channel (marked ones, or all new ones).
 * Every automatic change is written to the per-product sync history.
 */
@Injectable()
export class ChannelSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(ChannelSyncService.name);
  private readonly stockQueue = new Map<string, InventoryHookEvent[]>();
  private readonly stockTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ChannelContentService,
    private readonly jobs: CatalogJobsService,
  ) {}

  onModuleDestroy() {
    for (const t of this.stockTimers.values()) clearTimeout(t);
  }

  // ═══════════════════════════════════════════════════════════
  // CONTENT
  // ═══════════════════════════════════════════════════════════

  private async nafaaContent(tenantId: string, productIds: string[]) {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: { id: true, name: true, description: true, images: { orderBy: { sortOrder: 'asc' }, select: { url: true } } },
    });
    return new Map(rows.map((p) => [p.id, p as NafaaContent]));
  }

  private async linksOf(i: Integration, where: Prisma.ProductChannelMappingWhereInput) {
    return this.prisma.productChannelMapping.findMany({
      where: { ...where, integrationId: i.id, externalProductId: { not: null } },
      select: { id: true, productId: true, variantId: true, externalProductId: true, externalData: true },
    });
  }

  /** Writes the content state on every link of one product listing. */
  private async saveContentState(ids: string[], rows: Array<{ id: string; externalData: unknown }>, state: ContentState) {
    for (const r of rows.filter((x) => ids.includes(x.id))) {
      await this.prisma.productChannelMapping.update({ where: { id: r.id }, data: { externalData: { ...((r.externalData as any) ?? {}), content: state } as any } }).catch(() => null);
    }
  }

  /**
   * Nafaa side: products whose row changed (the minute stock-push sweep). The
   * new fingerprint is recorded and the decision runs (push when Nafaa owns or
   * changed last).
   */
  async nafaaChanged(i: Integration, productIds: string[]) {
    const cfg = readWebsiteConfig(i.config);
    if (cfg.contentFrom === 'NONE' || !PUSH_TYPES.includes(i.type) || !productIds.length) return { pushed: 0 };
    const links = await this.linksOf(i, { productId: { in: productIds } });
    if (!links.length) return { pushed: 0 };
    const products = await this.nafaaContent(i.tenantId, [...new Set(links.map((l) => l.productId))]);
    const now = new Date().toISOString();
    const toPush: string[] = [];
    for (const [key, group] of groupBy(links, (l) => `${l.productId}|${l.externalProductId}`)) {
      const p = products.get(key.split('|')[0]);
      if (!p) continue;
      const prev = ((group[0].externalData as any)?.content ?? {}) as ContentState;
      const hash = contentHash(snapshotOf(p));
      if (prev.nafaaSeen === hash) continue;
      const state: ContentState = { ...prev, nafaaSeen: hash, nafaaSeenAt: now };
      const step = await this.decide(i, cfg, group, p, state, null);
      if (step === 'push') toPush.push(p.id);
    }
    return { pushed: await this.pushContent(i, cfg, toPush) };
  }

  /** Channel side: product webhook bodies with name, description and pictures. */
  async channelChanged(i: Integration, events: ProductHookEvent[]) {
    const cfg = readWebsiteConfig(i.config);
    const withContent = events.filter((e) => e.content);
    if (cfg.contentFrom === 'NONE' || !withContent.length) return { pulled: 0, pushed: 0 };
    const last = new Map<string, ProductHookEvent>();
    for (const e of withContent) last.set(e.externalProductId, e);
    const links = await this.linksOf(i, { externalProductId: { in: [...last.keys()] } });
    if (!links.length) return { pulled: 0, pushed: 0 };
    const products = await this.nafaaContent(i.tenantId, [...new Set(links.map((l) => l.productId))]);
    let pulled = 0;
    const toPush: string[] = [];
    for (const [key, group] of groupBy(links, (l) => `${l.productId}|${l.externalProductId}`)) {
      const [productId, externalProductId] = key.split('|');
      const p = products.get(productId);
      const e = last.get(externalProductId);
      if (!p || !e?.content) continue;
      const prev = ((group[0].externalData as any)?.content ?? {}) as ContentState;
      const hash = contentHash(e.content);
      if (prev.channelSeen === hash) continue;
      // Nafaa's own push coming back: it becomes the agreed channel side, never a change.
      if (isContentEcho(prev, { title: e.content.title, updatedAt: e.at })) {
        await this.saveContentState(group.map((g) => g.id), group, { ...prev, channelSeen: hash, channelSeenAt: e.at, channelSynced: hash });
        continue;
      }
      const state: ContentState = { ...prev, channelSeen: hash, channelSeenAt: e.at, nafaaSeen: prev.nafaaSeen ?? contentHash(snapshotOf(p)), nafaaSeenAt: prev.nafaaSeenAt ?? null };
      const step = await this.decide(i, cfg, group, p, state, e.content);
      if (step === 'pull') pulled++;
      if (step === 'push') toPush.push(p.id);
    }
    const pushed = await this.pushContent(i, cfg, toPush);
    if (pulled) await logPriceBatch(this.prisma, i, 'CONTENT_PULL', pulled, { from: cfg.contentFrom });
    return { pulled, pushed };
  }

  /** Runs the content decision for one listing and records the outcome. Pushes are sent by the caller in one batch. */
  private async decide(i: Integration, cfg: WebsiteConfig, group: Array<{ id: string; productId: string; externalData: unknown }>, p: NafaaContent, state: ContentState, channel: ContentSnapshot | null) {
    const { step, why } = contentDecision(cfg.contentFrom, state);
    const ids = group.map((g) => g.id);
    const now = new Date().toISOString();
    if (step === 'baseline' || step === 'skip') {
      const next = step === 'baseline' ? { ...state, nafaaSynced: state.nafaaSeen, channelSynced: state.channelSeen, syncedAt: now } : state;
      await this.saveContentState(ids, group, next);
      return step;
    }
    if (step === 'pull') {
      if (!channel) { await this.saveContentState(ids, group, state); return 'skip'; }
      const changes = await this.pullContent(i, p, channel);
      const after = (await this.nafaaContent(i.tenantId, [p.id])).get(p.id);
      const nafaaHash = after ? contentHash(snapshotOf(after)) : state.nafaaSeen;
      await this.saveContentState(ids, group, { ...state, nafaaSeen: nafaaHash, nafaaSeenAt: now, nafaaSynced: nafaaHash, channelSynced: state.channelSeen, syncedAt: now });
      await logSync(this.prisma, changes.map((c) => ({
        tenantId: i.tenantId, integrationId: i.id, mappingId: ids[0], productId: p.id, field: c.field, direction: 'IN', kind: 'PULL', target: 'PRODUCT',
        oldValue: c.old, newValue: c.new, note: `${cfg.contentFrom}:${why}`,
      })));
      return 'pull';
    }
    // push: recorded now; the channel's echo of it is recognised by isContentEcho.
    await this.saveContentState(ids, group, { ...state, nafaaSynced: state.nafaaSeen, syncedAt: now, pushedTitle: p.name, pushedAt: now });
    await logSync(this.prisma, [{ tenantId: i.tenantId, integrationId: i.id, mappingId: ids[0], productId: p.id, field: 'product', direction: 'OUT', kind: 'PUSH', newValue: p.name, note: `${cfg.contentFrom}:${why}` }]);
    return 'push';
  }

  private async pushContent(i: Integration, cfg: WebsiteConfig, productIds: string[]) {
    if (!productIds.length || (i.type !== 'SHOPIFY' && i.type !== 'WOOCOMMERCE')) return 0;
    const res = await this.content.push(i, [...new Set(productIds)]);
    if (res.sent) await logPriceBatch(this.prisma, i, 'CONTENT_PUSH', res.sent, { from: cfg.contentFrom, failed: res.failed, errors: res.errors.slice(0, 5) });
    return res.sent;
  }

  /** Channel name, description and pictures into the Nafaa product. Pictures are added, never removed. */
  private async pullContent(i: Integration, p: NafaaContent, c: ContentSnapshot) {
    const changes: Array<{ field: 'title' | 'description' | 'images'; old: string | null; new: string | null }> = [];
    const data: Prisma.ProductUpdateInput = {};
    const title = c.title.trim().slice(0, 250);
    if (title && title !== p.name) { data.name = title; changes.push({ field: 'title', old: p.name, new: title }); }
    const text = plainText(c.description);
    if (text !== plainText(p.description)) { data.description = text || null; changes.push({ field: 'description', old: p.description?.slice(0, 200) ?? null, new: text.slice(0, 200) || null }); }
    if (Object.keys(data).length) await this.prisma.product.updateMany({ where: { id: p.id, tenantId: i.tenantId }, data: data as any });
    const have = new Set(p.images.map((x) => x.url.split('?')[0]));
    const add = c.images.filter((u) => /^https?:\/\//i.test(u) && !have.has(u.split('?')[0])).slice(0, Math.max(0, 20 - p.images.length));
    if (add.length) {
      await this.prisma.productImage.createMany({ data: add.map((url, k) => ({ productId: p.id, url, sortOrder: p.images.length + k, isPrimary: !p.images.length && k === 0 })) });
      changes.push({ field: 'images', old: String(p.images.length), new: String(p.images.length + add.length) });
    }
    return changes;
  }

  // ═══════════════════════════════════════════════════════════
  // STOCK EDITED BY HAND ON THE CHANNEL
  // ═══════════════════════════════════════════════════════════

  /** Shopify inventory_levels/update: queued, checked after the settle time (orders of the same sale come in first). */
  acceptInventory(i: Integration, ev: InventoryHookEvent) {
    if (!readWebsiteConfig(i.config).stockFromChannel) return { queued: false };
    const list = this.stockQueue.get(i.id) ?? [];
    if (list.length < 1000) list.push(ev);
    this.stockQueue.set(i.id, list);
    if (!this.stockTimers.has(i.id)) {
      this.stockTimers.set(i.id, setTimeout(() => {
        this.stockTimers.delete(i.id);
        this.flushInventory(i.id).catch((e) => this.logger.warn(`Hand stock ${i.displayName}: ${e?.message}`));
      }, STOCK_SETTLE_MS));
    }
    return { queued: true };
  }

  private async flushInventory(integrationId: string) {
    const events = this.stockQueue.get(integrationId) ?? [];
    this.stockQueue.delete(integrationId);
    const i = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!i || !i.isActive || i.status !== IntegrationStatus.CONNECTED || !events.length) return null;
    const loc = String((i.config as any)?.shopifyLocationId ?? '').split('/').pop() || null;
    const last = new Map<string, InventoryHookEvent>();
    // Only the location Nafaa sends stock to counts.
    for (const e of events) if (!loc || !e.locationId || e.locationId === loc) last.set(e.inventoryItemId, e);
    if (!last.size) return null;
    const links = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, OR: [...last.keys()].map((id) => ({ externalData: { path: ['inventoryItemId'], equals: id } })) },
      select: { id: true, externalData: true },
    });
    const seen = links.flatMap((l) => {
      const e = last.get(String((l.externalData as any)?.inventoryItemId ?? ''));
      return e ? [{ id: l.id, qty: e.available, at: e.at }] : [];
    });
    return this.takeHandEdits(i, seen);
  }

  /** WooCommerce product webhooks carry the stock of the item (or variation). */
  async wooStock(i: Integration, events: ProductHookEvent[]) {
    if (!readWebsiteConfig(i.config).stockFromChannel) return null;
    const items = events.flatMap((e) => e.stocks.map((s) => ({ ...s, externalProductId: e.externalProductId, at: e.at })));
    if (!items.length) return null;
    const links = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, externalProductId: { in: [...new Set(items.map((x) => x.externalProductId))] } },
      select: { id: true, externalProductId: true, externalVariantId: true },
    });
    const seen = links.flatMap((l) => {
      const hit = [...items].reverse().find((x) => x.externalProductId === l.externalProductId && (x.externalVariantId ?? null) === (l.externalVariantId ?? null));
      return hit ? [{ id: l.id, qty: hit.qty, at: hit.at }] : [];
    });
    // A short wait so an order of the same sale is in before the check.
    await new Promise((r) => setTimeout(r, Number(process.env.HAND_STOCK_SETTLE_MS ?? STOCK_SETTLE_MS)));
    return this.takeHandEdits(i, seen);
  }

  /**
   * Scan fallback: links whose channel stock (read by the catalog watch) is
   * not what Nafaa last sent, read after that send.
   */
  async scanHandEdits(i: Integration) {
    if (!readWebsiteConfig(i.config).stockFromChannel || !PUSH_TYPES.includes(i.type)) return null;
    const links = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, NOT: { externalData: { path: ['stockPush'], equals: Prisma.AnyNull } } },
      select: { id: true, externalData: true },
      take: 20_000,
    });
    const seen = links.flatMap((l) => {
      const d = (l.externalData ?? {}) as any;
      const sent = Number(d.stockPush?.to);
      if (d.channelStock === undefined || d.channelStock === null || Number(d.channelStock) === sent) return [];
      return [{ id: l.id, qty: Number(d.channelStock), at: String(d.channelStockAt ?? '') }];
    });
    return this.takeHandEdits(i, seen);
  }

  /**
   * Applies hand edits: for each link, the change beyond Nafaa's last push and
   * the channel orders since then becomes a Nafaa adjustment. Only where the
   * channel gets all of Nafaa's stock (stock mode "all", no own share), the
   * channel counts the item, and no stock handover is pending.
   */
  private async takeHandEdits(i: Integration, seen: Array<{ id: string; qty: number; at: string }>) {
    const cfg = readWebsiteConfig(i.config);
    const shopId = cfg.shopId ?? i.shopId;
    if (!shopId || !seen.length || cfg.stockMode !== 'ALL') return { taken: 0 };
    const rows = await this.prisma.productChannelMapping.findMany({
      where: { id: { in: seen.map((s) => s.id) }, integrationId: i.id, allocQty: null, stockHold: { equals: Prisma.DbNull }, NOT: { tracksStock: false } },
      select: { id: true, productId: true, variantId: true, externalProductId: true, externalVariantId: true, externalData: true },
    });
    if (!rows.length) return { taken: 0 };
    const oldest = Math.min(...rows.map((r) => Date.parse(String((r.externalData as any)?.stockPush?.at ?? '')) || Date.now()));
    const since = new Date(oldest - 60_000);
    const [sold, cancelled] = await Promise.all([
      this.prisma.channelOrder.findMany({ where: { integrationId: i.id, receivedAt: { gte: since } }, select: { items: true, receivedAt: true } }),
      this.prisma.channelOrder.findMany({ where: { integrationId: i.id, cancelledAt: { gte: since } }, select: { items: true, cancelledAt: true } }),
    ]);
    let taken = 0;
    const logs: SyncLogRow[] = [];
    for (const r of rows) {
      const d = (r.externalData ?? {}) as any;
      const s = seen.find((x) => x.id === r.id)!;
      const pushedAt = d.stockPush?.at ?? null;
      // Orders between Nafaa's push and the channel reading (with a minute's slack each side for webhook delay).
      const from = Date.parse(String(pushedAt ?? '')) - 60_000;
      const to = (Date.parse(s.at) || Date.now()) + 120_000;
      const units = (list: Array<{ items: unknown; receivedAt?: Date; cancelledAt?: Date | null }>, key: 'receivedAt' | 'cancelledAt') =>
        list.filter((o) => { const t = o[key]?.getTime() ?? 0; return t >= from && t <= to; })
          .reduce((n, o) => n + orderUnits(o.items, r.externalProductId, r.externalVariantId), 0);
      const delta = handEditQty({
        seen: s.qty, seenAt: s.at, pushed: d.stockPush?.to ?? null, pushedAt,
        soldSince: units(sold as any, 'receivedAt'), cancelledSince: units(cancelled as any, 'cancelledAt'),
      });
      if (delta === null) continue;
      const before = await this.applyHandEdit(i, shopId, r.productId, r.variantId, delta);
      if (before === null) continue;
      // The channel quantity is now the agreed one: the push that follows sends exactly this back (no loop).
      await this.prisma.productChannelMapping.update({
        where: { id: r.id },
        data: { externalData: { ...d, channelStock: s.qty, channelStockAt: s.at, stockPush: { ...(d.stockPush ?? {}), at: new Date().toISOString(), to: s.qty, from: d.stockPush?.to ?? null, by: 'hand-edit' } } as any },
      }).catch(() => null);
      logs.push({
        tenantId: i.tenantId, integrationId: i.id, mappingId: r.id, productId: r.productId, variantId: r.variantId, field: 'stock', direction: 'IN', kind: 'HAND_EDIT', target: 'STOCK',
        oldValue: before, newValue: before + delta, note: `Website par badla: ${d.stockPush?.to ?? '?'} → ${s.qty}`,
      });
      taken++;
    }
    await logSync(this.prisma, logs);
    if (taken) await logPriceBatch(this.prisma, i, 'STOCK_HAND_EDIT', taken, { items: logs.slice(0, 50).map((l) => l.note) });
    return { taken };
  }

  /** Nafaa branch stock + delta, as an adjustment with reason "Website par badla" (no profit effect). Returns the stock before. */
  private async applyHandEdit(i: Integration, shopId: string, productId: string, variantId: string | null, delta: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.shopStock.findFirst({ where: { shopId, productId, variantId }, select: { stock: true } });
        const before = Number(row?.stock ?? 0);
        const product = await tx.product.findFirst({ where: { id: productId, tenantId: i.tenantId }, select: { costPrice: true } });
        if (!product) return null;
        const item = variantId ? await tx.productVariant.findFirst({ where: { id: variantId, productId }, select: { costPrice: true } }) : null;
        const cost = Number(item?.costPrice || product.costPrice || 0);
        const type = delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
        const reason = 'Website par badla';
        await applyStockDelta({ tx, tenantId: i.tenantId, shopId, productId, variantId, delta, movementType: type, reference: 'CHANNEL-HAND-EDIT', note: `${reason} — ${i.displayName}`, unitCost: cost } as any);
        await tx.stockAdjustment.create({
          data: {
            tenantId: i.tenantId, shopId, productId, variantId, type, quantity: Math.abs(delta), reason, note: i.displayName,
            unitCost: cost, value: Math.round(Math.abs(delta) * cost * 100) / 100, reasonCode: 'CORRECTION', profitEffect: 'NONE',
          },
        });
        return before;
      });
    } catch (e: any) {
      this.logger.warn(`Hand stock ${i.displayName} ${mappingKey(productId, variantId)}: ${e?.message}`);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // NEW NAFAA PRODUCTS ON THE CHANNEL
  // ═══════════════════════════════════════════════════════════

  /** Marks (or unmarks) Nafaa products to be made on channels ("Website par bhi banayein"). */
  async mark(user: AuthenticatedUser, body: { productIds?: string[]; channelIds?: string[]; on?: boolean }) {
    const productIds = [...new Set((body?.productIds ?? []).map(String))].slice(0, 2000);
    if (!productIds.length) throw new BadRequestException('Koi product nahi chuna');
    const channels = await this.prisma.integration.findMany({
      where: { tenantId: user.tenantId, type: { in: ['SHOPIFY', 'WOOCOMMERCE'] }, apiKey: { not: null }, ...(body.channelIds?.length && { id: { in: body.channelIds.map(String) } }) },
      select: { id: true },
    });
    if (!channels.length) throw new BadRequestException('Koi Shopify ya WooCommerce channel nahi jura');
    const own = await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId: user.tenantId }, select: { id: true } });
    let changed = 0;
    for (const c of channels) {
      if (body.on === false) {
        changed += (await this.prisma.channelPublishMark.deleteMany({ where: { integrationId: c.id, productId: { in: own.map((p) => p.id) }, publishedAt: null } })).count;
        continue;
      }
      changed += (await this.prisma.channelPublishMark.createMany({
        data: own.map((p) => ({ tenantId: user.tenantId, integrationId: c.id, productId: p.id, createdById: user.id })), skipDuplicates: true,
      })).count;
    }
    return { changed, channels: channels.length };
  }

  /** Marked products of a channel that are not on it yet. */
  async marks(user: AuthenticatedUser, channelId: string) {
    const rows = await this.prisma.channelPublishMark.findMany({
      where: { tenantId: user.tenantId, integrationId: channelId }, orderBy: { createdAt: 'desc' }, take: 500,
    }).catch(() => []);
    return { items: rows };
  }

  /**
   * Makes due products on the channel through the publish job: marked ones
   * (MARKED or ALL) and, with ALL, every Nafaa product made after the setting
   * was switched on. Products already linked are skipped and their mark closed.
   */
  async publishDue(i: Integration) {
    const cfg = readWebsiteConfig(i.config);
    if (cfg.autoPublish === 'OFF' || (i.type !== 'SHOPIFY' && i.type !== 'WOOCOMMERCE')) return { queued: 0 };
    const marks = await this.prisma.channelPublishMark.findMany({ where: { integrationId: i.id, publishedAt: null }, select: { productId: true }, take: MAX_PUBLISH_PER_RUN }).catch(() => []);
    let ids = marks.map((m) => m.productId);
    if (cfg.autoPublish === 'ALL' && cfg.autoPublishSince) {
      const fresh = await this.prisma.product.findMany({
        where: { tenantId: i.tenantId, isActive: true, createdAt: { gte: new Date(cfg.autoPublishSince) }, channelMappings: { none: { integrationId: i.id } } },
        select: { id: true }, take: MAX_PUBLISH_PER_RUN,
      });
      ids = [...new Set([...ids, ...fresh.map((p) => p.id)])];
    }
    if (!ids.length) return { queued: 0 };
    const linked = await this.prisma.productChannelMapping.findMany({ where: { integrationId: i.id, productId: { in: ids } }, select: { productId: true }, distinct: ['productId'] });
    const done = new Set(linked.map((l) => l.productId));
    if (done.size) await this.prisma.channelPublishMark.updateMany({ where: { integrationId: i.id, productId: { in: [...done] }, publishedAt: null }, data: { publishedAt: new Date() } }).catch(() => null);
    const todo = ids.filter((id) => !done.has(id)).slice(0, MAX_PUBLISH_PER_RUN);
    if (!todo.length) return { queued: 0 };
    const res = await this.jobs.start({ tenantId: i.tenantId, userId: null, kind: 'PUBLISH', integrationId: i.id, items: todo, params: { channelType: i.type, listed: true, auto: cfg.autoPublish } });
    if (!res.existing) {
      await logSync(this.prisma, todo.map((productId) => ({ tenantId: i.tenantId, integrationId: i.id, productId, field: 'product' as const, direction: 'OUT' as const, kind: 'PUBLISH' as const, note: cfg.autoPublish })));
    }
    return { queued: res.existing ? 0 : todo.length };
  }
}

function groupBy<T>(rows: T[], key: (r: T) => string) {
  const out = new Map<string, T[]>();
  for (const r of rows) out.set(key(r), [...(out.get(key(r)) ?? []), r]);
  return out;
}
