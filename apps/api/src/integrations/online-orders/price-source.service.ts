import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Integration, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { WebsiteSetupService } from './website-setup.service';
import { StockPushService } from './stock-push.service';
import { readWebsiteConfig, WebsiteConfig } from './website-config';
import { agreedPrice, channelPrice, recoveryCandidate } from './channel-price';
import { canPull, logPrice, logPriceBatch, pullPrice, pullTarget, PullTarget } from './price-sync';
import { mappingKey } from './mapping-key';
import { friendlySyncError } from './link-sync';

const MANAGERS: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN];
const PUSH_TYPES = ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ'];

const LINK_SELECT = {
  id: true, productId: true, variantId: true, externalTitle: true, externalSku: true, externalData: true, priceOverride: true, priceHold: true,
  product: { select: { name: true, price: true, hasVariants: true } }, variant: { select: { name: true, price: true } },
} satisfies Prisma.ProductChannelMappingSelect;
type LinkRow = Prisma.ProductChannelMappingGetPayload<{ select: typeof LINK_SELECT }>;

export type PriceRecoveryChoice = 'channel' | 'nafaa';

export interface PriceRecoveryRow {
  mappingId: string; productId: string; variantId: string | null; name: string; variantName: string | null;
  externalTitle: string | null; externalSku: string | null;
  /** Price the channel had set before Nafaa's drift re-send. */
  channelPrice: number;
  /** Price Nafaa sent over it. */
  pushedPrice: number;
  /** Nafaa's price for this link now. */
  nafaaPrice: number;
  /** When the channel price was read; when Nafaa last re-sent; how many re-sends. */
  channelPriceAt: string | null; driftPushedAt: string | null; driftPushes: number;
  /** Where "Website ki qeemat wapas" sets the price in Nafaa. */
  target: PullTarget | null;
  held: boolean;
}

/**
 * Price source decisions the merchant takes:
 *  - held links ("Website par qeemat badli — kaunsi rakhein?"): send Nafaa's
 *    price, or take the channel price into Nafaa;
 *  - recovery after the old drift re-send: put the channel's own price back
 *    (in Nafaa and on the channel), or keep Nafaa's price.
 * Previews are read only; nothing is deleted; every change is logged in the
 * price history.
 */
@Injectable()
export class PriceSourceService {
  private readonly logger = new Logger(PriceSourceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly push: StockPushService,
  ) {}

  private assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(user.role)) throw new ForbiddenException('Ye kaam sirf malik ya manager kar sakta hai');
  }

  private async channel(tenantId: string, id: string) {
    const i = await this.setup.requireChannel(tenantId, id);
    if (!PUSH_TYPES.includes(i.type)) throw new NotFoundException('Is channel par Nafaa Price nahi bhejta');
    return i;
  }

  /** Nafaa's price for each link (branch price, rule, link price), keyed by mapping id. */
  private async wantPrices(i: Integration, cfg: WebsiteConfig, rows: LinkRow[]) {
    const shopId = cfg.shopId ?? i.shopId;
    const branch = shopId && rows.length
      ? await this.prisma.shopStock.findMany({
          where: { shopId, productId: { in: [...new Set(rows.map((r) => r.productId))] }, shopPrice: { not: null } },
          select: { productId: true, variantId: true, shopPrice: true },
        })
      : [];
    const byKey = new Map(branch.map((b) => [mappingKey(b.productId, b.variantId), Number(b.shopPrice)]));
    const out = new Map<string, { want: number; branch: number | null }>();
    for (const r of rows) {
      const b = byKey.get(mappingKey(r.productId, r.variantId)) ?? null;
      const base = b ?? Number(r.variantId ? r.variant?.price ?? r.product.price : r.product.price);
      out.set(r.id, { want: channelPrice(base, cfg.priceRule, r.priceOverride), branch: b });
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════
  // HELD PRICES
  // ═══════════════════════════════════════════════════════════

  async holds(user: AuthenticatedUser, channelId: string, q: { page?: number; limit?: number }) {
    const i = await this.channel(user.tenantId, channelId);
    const cfg = readWebsiteConfig(i.config);
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(5, Number(q.limit) || 50));
    const where: Prisma.ProductChannelMappingWhereInput = { integrationId: i.id, NOT: { priceHold: { equals: Prisma.DbNull } } };
    const [total, rows] = await Promise.all([
      this.prisma.productChannelMapping.count({ where }),
      this.prisma.productChannelMapping.findMany({ where, orderBy: { id: 'asc' }, skip: (page - 1) * limit, take: limit, select: LINK_SELECT }),
    ]);
    const want = await this.wantPrices(i, cfg, rows);
    return {
      total, page, pages: Math.ceil(total / limit), priceFrom: cfg.priceFrom,
      items: rows.map((r) => {
        const h = (r.priceHold ?? {}) as Record<string, any>;
        const d = (r.externalData ?? {}) as Record<string, any>;
        return {
          mappingId: r.id, productId: r.productId, variantId: r.variantId, name: r.product.name, variantName: r.variant?.name ?? null,
          externalTitle: r.externalTitle, externalSku: r.externalSku,
          nafaaPrice: want.get(r.id)?.want ?? null,
          channelPrice: Number(d.channelPrice ?? h.channelPrice) || null,
          agreedPrice: agreedPrice(d),
          since: h.since ?? null, channelPriceAt: d.channelPriceAt ?? h.channelPriceAt ?? null,
          target: canPull(r) ? pullTarget(cfg, r, (want.get(r.id)?.branch ?? null) !== null) : null,
        };
      }),
    };
  }

  /**
   * "Nafaa ki bhejein": Nafaa's price goes to the channel. "Website ki Nafaa
   * me lein": the channel price is set in Nafaa (link price with a price rule,
   * else product/branch price, or as the channel setting says). The hold ends.
   */
  async resolve(user: AuthenticatedUser, channelId: string, body: { action?: string; mappingIds?: string[]; all?: boolean }) {
    this.assertManager(user);
    const i = await this.channel(user.tenantId, channelId);
    const action = body?.action;
    if (action !== 'nafaa' && action !== 'website') throw new BadRequestException('Kaam chunein');
    const ids = (body.mappingIds ?? []).map(String);
    if (!body.all && !ids.length) throw new BadRequestException('Koi link nahi chuna');
    const rows = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, NOT: { priceHold: { equals: Prisma.DbNull } }, ...(body.all ? {} : { id: { in: ids.slice(0, 5000) } }) },
      select: LINK_SELECT,
      take: 5000,
    });
    if (!rows.length) return { resolved: 0, sent: 0, taken: 0, skipped: 0, errors: [] as string[] };
    const cfg = readWebsiteConfig(i.config);
    const errors: string[] = [];
    if (action === 'nafaa') {
      const res = await this.sendNafaa(i, rows.map((r) => r.id), errors);
      await this.logDecision(i, cfg, rows, 'KEEP_NAFAA', user.id, 'held');
      await logPriceBatch(this.prisma, i, 'PRICE_RESOLVE', res.sent, { action, by: user.id });
      return { resolved: res.sent, sent: res.sent, taken: 0, skipped: rows.length - res.sent, errors };
    }
    const taken = await this.takeChannel(i, cfg, rows, user.id, 'KEEP_CHANNEL', errors);
    await logPriceBatch(this.prisma, i, 'PRICE_RESOLVE', taken, { action, by: user.id });
    return { resolved: taken, sent: 0, taken, skipped: rows.length - taken, errors };
  }

  /** Explicit push of Nafaa's price for these links (any price source). */
  private async sendNafaa(i: Integration, ids: string[], errors: string[]) {
    let sent = 0;
    for (let k = 0; k < ids.length; k += 500) {
      try {
        sent += (await this.push.pushPricesFor(i, { id: { in: ids.slice(k, k + 500) } }, true, { explicit: true })).sent;
      } catch (e) {
        if (errors.length < 20) errors.push(friendlySyncError(e));
      }
    }
    return { sent };
  }

  /** Sets the channel price in Nafaa for each link and records the agreement; no channel call. */
  private async takeChannel(i: Integration, cfg: WebsiteConfig, rows: LinkRow[], userId: string | null, kind: 'KEEP_CHANNEL' | 'RECOVER_CHANNEL', errors: string[], priceOf?: (r: LinkRow) => number | null) {
    const want = await this.wantPrices(i, cfg, rows);
    const shopId = cfg.shopId ?? i.shopId;
    const at = new Date().toISOString();
    let taken = 0;
    const logs: Parameters<typeof logPrice>[1] = [];
    for (const r of rows) {
      const d = ((r.externalData as any) ?? {}) as Record<string, any>;
      const price = priceOf ? priceOf(r) : Number(d.channelPrice ?? (r.priceHold as any)?.channelPrice);
      if (!price || !(price > 0)) { if (errors.length < 20) errors.push(`${r.product.name}: channel ki Price maloom nahi`); continue; }
      if (!canPull(r)) { if (errors.length < 20) errors.push(`${r.product.name}: bina size jura hai — pehle har size jorein`); continue; }
      try {
        const res = await pullPrice(this.prisma, i, cfg, shopId, r, price, want.get(r.id)?.branch ?? null);
        if (!res) continue;
        await this.prisma.productChannelMapping.update({
          where: { id: r.id },
          data: {
            priceHold: Prisma.DbNull,
            externalData: { ...d, syncedPrice: price, syncedAt: at, pulledPrice: price, pulledAt: at, nafaaPrice: price, nafaaPriceAt: at } as any,
          },
        });
        logs.push({ tenantId: i.tenantId, integrationId: i.id, mappingId: r.id, productId: r.productId, variantId: r.variantId, kind, target: res.target, oldPrice: res.oldPrice, newPrice: price, channelPrice: price, userId });
        taken++;
      } catch (e: any) {
        if (errors.length < 20) errors.push(`${r.product.name}: ${e?.message ?? 'Price nahi badli'}`);
      }
    }
    await logPrice(this.prisma, logs);
    return taken;
  }

  private async logDecision(i: Integration, cfg: WebsiteConfig, rows: LinkRow[], kind: 'KEEP_NAFAA' | 'RECOVER_NAFAA', userId: string | null, note: string) {
    const want = await this.wantPrices(i, cfg, rows);
    await logPrice(this.prisma, rows.map((r) => ({
      tenantId: i.tenantId, integrationId: i.id, mappingId: r.id, productId: r.productId, variantId: r.variantId, kind,
      newPrice: want.get(r.id)?.want ?? null, channelPrice: Number((r.externalData as any)?.channelPrice) || null, userId, note,
    })));
  }

  // ═══════════════════════════════════════════════════════════
  // RECOVERY after the drift re-send
  // ═══════════════════════════════════════════════════════════

  async recoveryPreview(user: AuthenticatedUser, channelId: string) {
    this.assertManager(user);
    return this.previewFor(await this.channel(user.tenantId, channelId));
  }

  async recoveryApply(user: AuthenticatedUser, channelId: string, items: Array<{ mappingId: string; choice: PriceRecoveryChoice }>) {
    this.assertManager(user);
    return this.applyFor(await this.channel(user.tenantId, channelId), items, user.id);
  }

  /** Admin: preview of every push channel of a tenant. */
  async tenantPreview(tenantId: string) {
    const list = await this.prisma.integration.findMany({ where: { tenantId, type: { in: PUSH_TYPES as any } }, orderBy: { createdAt: 'asc' } });
    const channels: Array<{ id: string; name: string; type: string; preview: Awaited<ReturnType<PriceSourceService['previewFor']>> }> = [];
    for (const i of list) channels.push({ id: i.id, name: i.displayName, type: i.type, preview: await this.previewFor(i) });
    return { channels };
  }

  async tenantApply(tenantId: string, channelId: string, items: Array<{ mappingId: string; choice: PriceRecoveryChoice }>, adminId: string) {
    const i = await this.prisma.integration.findFirst({ where: { id: channelId, tenantId } });
    if (!i) throw new NotFoundException('Channel nahi mila');
    return this.applyFor(i, items, adminId);
  }

  async previewFor(i: Integration) {
    const cfg = readWebsiteConfig(i.config);
    const rows: PriceRecoveryRow[] = [];
    let checked = 0;
    let cursor: string | undefined;
    for (;;) {
      const page = await this.prisma.productChannelMapping.findMany({
        where: { integrationId: i.id }, select: LINK_SELECT, orderBy: { id: 'asc' }, take: 1000,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (!page.length) break;
      cursor = page[page.length - 1].id;
      checked += page.length;
      const hits = page.filter((r) => recoveryCandidate(r.externalData as any));
      const want = await this.wantPrices(i, cfg, hits);
      for (const r of hits) {
        const d = (r.externalData ?? {}) as Record<string, any>;
        const c = recoveryCandidate(d)!;
        rows.push({
          mappingId: r.id, productId: r.productId, variantId: r.variantId, name: r.product.name, variantName: r.variant?.name ?? null,
          externalTitle: r.externalTitle, externalSku: r.externalSku,
          channelPrice: c.channelPrice, pushedPrice: c.nafaaPrice, nafaaPrice: want.get(r.id)?.want ?? c.nafaaPrice,
          channelPriceAt: c.at, driftPushedAt: d.driftPushedAt ?? (d.channelPriceBefore as any)?.by ?? null, driftPushes: Number(d.driftPushes) || 0,
          target: canPull(r) ? pullTarget(cfg, r, (want.get(r.id)?.branch ?? null) !== null) : null,
          held: !!r.priceHold,
        });
      }
      if (page.length < 1000) break;
    }
    return {
      channel: { id: i.id, name: i.displayName, type: i.type, priceFrom: cfg.priceFrom, websitePriceTo: cfg.websitePriceTo },
      rows, checked,
      note: 'Sirf wo links jin par Nafaa ne website ki badli hui Price par apni Price dobara bheji thi. Kuch bhi mitaya nahi jata.',
    };
  }

  /**
   * "Website ki qeemat wapas": the channel's own price is set in Nafaa and sent
   * back to the channel. "Nafaa ki qeemat rakhein": Nafaa's price is sent again
   * and the link is marked decided. Rows are worked out again on the server;
   * only links that are still candidates change.
   */
  private async applyFor(i: Integration, items: Array<{ mappingId: string; choice: PriceRecoveryChoice }>, userId: string | null) {
    const picked = new Map((items ?? []).filter((x) => x?.mappingId && (x.choice === 'channel' || x.choice === 'nafaa')).map((x) => [String(x.mappingId), x.choice]));
    if (!picked.size) throw new BadRequestException('Koi link nahi chuna');
    const cfg = readWebsiteConfig(i.config);
    const rows = await this.prisma.productChannelMapping.findMany({ where: { integrationId: i.id, id: { in: [...picked.keys()].slice(0, 5000) } }, select: LINK_SELECT });
    const live = rows.filter((r) => recoveryCandidate(r.externalData as any));
    const errors: string[] = [];
    const at = new Date().toISOString();
    const channelRows = live.filter((r) => picked.get(r.id) === 'channel');
    const nafaaRows = live.filter((r) => picked.get(r.id) === 'nafaa');
    const prices = new Map(channelRows.map((r) => [r.id, recoveryCandidate(r.externalData as any)!.channelPrice]));

    // Channel price back: into Nafaa first, then out to the channel.
    const restored = await this.takeChannel(i, cfg, channelRows, userId, 'RECOVER_CHANNEL', errors, (r) => prices.get(r.id) ?? null);
    const mark = async (r: LinkRow, choice: PriceRecoveryChoice, price: number | null) => {
      const fresh = await this.prisma.productChannelMapping.findUnique({ where: { id: r.id }, select: { externalData: true } });
      await this.prisma.productChannelMapping.update({
        where: { id: r.id },
        data: { priceHold: Prisma.DbNull, externalData: { ...((fresh?.externalData as any) ?? {}), priceRecovery: { at, choice, price, by: userId } } as any },
      }).catch(() => null);
    };
    for (const r of channelRows) await mark(r, 'channel', prices.get(r.id) ?? null);
    for (const r of nafaaRows) await mark(r, 'nafaa', null);

    const sendIds = [...channelRows.map((r) => r.id), ...nafaaRows.map((r) => r.id)];
    const sent = sendIds.length ? (await this.sendNafaa(i, sendIds, errors)).sent : 0;
    if (nafaaRows.length) await this.logDecision(i, cfg, nafaaRows, 'RECOVER_NAFAA', userId, 'recovery');
    await logPriceBatch(this.prisma, i, 'PRICE_RECOVERY', restored + nafaaRows.length, { restored, kept: nafaaRows.length, sent, by: userId });
    this.logger.log(`Price recovery ${i.displayName}: ${restored} channel prices back, ${nafaaRows.length} kept Nafaa, ${sent} sent`);
    return { restored, kept: nafaaRows.length, sent, skipped: picked.size - live.length, errors };
  }

  // ═══════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════

  async history(user: AuthenticatedUser, q: { productId?: string; channelId?: string; limit?: number }) {
    if (!q.productId && !q.channelId) throw new BadRequestException('Product ya channel chunein');
    const limit = Math.min(200, Math.max(10, Number(q.limit) || 50));
    try {
      const rows = await this.prisma.channelSyncLog.findMany({
        where: { tenantId: user.tenantId, ...(q.productId && { productId: q.productId }), ...(q.channelId && { integrationId: q.channelId }) },
        orderBy: { createdAt: 'desc' }, take: limit,
      });
      return { items: rows };
    } catch {
      return { items: [] };
    }
  }
}
