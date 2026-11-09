import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Integration, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../common/shop-scope';
import { WebsiteSetupService } from './website-setup.service';
import { ShopifyService } from './shopify.service';
import { ChannelCatalogService } from './channel-catalog.service';
import { OnlineProductsService } from './online-products.service';
import { mappingKey } from './mapping-key';
import { numericId } from './shopify.client';
import { readHold, shopifyUntrackCalls, untrackCandidate } from './stock-handover';
import { markTracking } from './handover-store';
import { friendlySyncError } from './link-sync';

export type RecoveryAction = 'untrack' | 'restore';
export type RecoverySource = 'import-zero' | 'untracked-link' | 'first-push';

export interface RecoveryRow {
  mappingId: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  externalTitle: string | null;
  externalSku: string | null;
  action: RecoveryAction;
  nafaaStock: number;
  /** Shopify "Track quantity" now (null when not read). */
  channelTracked: boolean | null;
  /** Units available on the channel now (null when not read). */
  channelAvailable: number | null;
  /** Opening stock the import gave in Nafaa (null when not imported). */
  importQty: number | null;
  importedAt: string | null;
  /** Stock to bring back in Nafaa (restore rows). */
  found: number | null;
  source: RecoverySource;
  /**
   * untrack rows: 'high' when Shopify changed the item's tracking after the
   * import (Nafaa switched it on), 'low' when it was already counted before
   * (it may be a real 0). Only 'high' rows are picked by default.
   */
  confidence: 'high' | 'low' | null;
  /** When Shopify last changed the inventory item (tracking). */
  channelChangedAt: string | null;
  at: string | null;
  lastPushAt: string | null;
}

export interface RecoveryPreview {
  channel: { id: string; name: string; type: string; shopId: string | null; shopName: string | null };
  rows: RecoveryRow[];
  /** Links looked at. */
  checked: number;
  /** Links with no record to rebuild from. */
  missing: number;
  note: string | null;
  readError: string | null;
}

interface ShopifyItemState { tracked: boolean; available: number | null; inventoryItemId: string; updatedAt: string | null }

const MANAGERS: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN];

/**
 * Stock handover actions and the import fix:
 *  - held links ("Stock milana baqi"): take the channel stock into Nafaa, or send Nafaa stock;
 *  - counting on/off per link (items the channel does not count);
 *  - the import fix: Shopify items that an import left at 0 and a push then
 *    switched to counted get "Track quantity" off again; links whose first push
 *    dropped the channel stock get the old number back in Nafaa.
 * Previews are read only; changes happen only on an explicit apply.
 */
@Injectable()
export class StockHandoverService {
  private readonly logger = new Logger(StockHandoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly setup: WebsiteSetupService,
    private readonly shopify: ShopifyService,
    private readonly catalog: ChannelCatalogService,
    private readonly products: OnlineProductsService,
  ) {}

  private assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(user.role)) throw new ForbiddenException('Ye kaam sirf malik ya manager kar sakta hai');
  }

  private async channel(tenantId: string, id: string) {
    const i = await this.setup.requireChannel(tenantId, id);
    if (!['WOOCOMMERCE', 'SHOPIFY', 'DARAZ'].includes(i.type)) throw new NotFoundException('Is channel par Nafaa Stock nahi bhejta');
    return i;
  }

  // ═══════════════════════════════════════════════════════════
  // HELD LINKS
  // ═══════════════════════════════════════════════════════════

  async holds(user: AuthenticatedUser, channelId: string, q: { page?: number; limit?: number }) {
    const i = await this.channel(user.tenantId, channelId);
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(200, Math.max(5, Number(q.limit) || 50));
    const where: Prisma.ProductChannelMappingWhereInput = { integrationId: i.id, NOT: { stockHold: { equals: Prisma.DbNull } } };
    const [total, rows] = await Promise.all([
      this.prisma.productChannelMapping.count({ where }),
      this.prisma.productChannelMapping.findMany({
        where, orderBy: { id: 'asc' }, skip: (page - 1) * limit, take: limit,
        select: { id: true, productId: true, variantId: true, externalTitle: true, externalSku: true, stockHold: true, product: { select: { name: true } }, variant: { select: { name: true } } },
      }),
    ]);
    const shopId = await this.catalog.stockShop(i);
    const stock = await this.stockOf(shopId, rows.map((r) => r.productId));
    return {
      total, page, pages: Math.ceil(total / limit),
      items: rows.map((r) => {
        const h = readHold(r.stockHold)!;
        return {
          mappingId: r.id, productId: r.productId, variantId: r.variantId, name: r.product.name, variantName: r.variant?.name ?? null,
          externalTitle: r.externalTitle, externalSku: r.externalSku,
          nafaaStock: stock.get(mappingKey(r.productId, r.variantId)) ?? 0, channelStock: h?.channelStock ?? null,
          since: h?.since ?? null, reason: h?.reason ?? 'guard',
        };
      }),
    };
  }

  /**
   * "Channel ka Stock lein": Nafaa stock becomes the channel stock (a
   * correction adjustment, no profit effect). "Nafaa ka Stock bhejein": Nafaa
   * stock goes out. Either way the hold ends and the link pushes as usual.
   */
  async resolve(user: AuthenticatedUser, channelId: string, body: { action?: string; mappingIds?: string[]; all?: boolean }) {
    this.assertManager(user);
    const i = await this.channel(user.tenantId, channelId);
    const action = body?.action;
    if (action !== 'take-channel' && action !== 'send-nafaa') throw new BadRequestException('Kaam chunein');
    const ids = (body.mappingIds ?? []).map(String);
    if (!body.all && !ids.length) throw new BadRequestException('Koi link nahi chuna');
    const rows = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id, NOT: { stockHold: { equals: Prisma.DbNull } }, ...(body.all ? {} : { id: { in: ids.slice(0, 5000) } }) },
      select: { id: true, productId: true, variantId: true, stockHold: true, externalData: true },
      take: 5000,
    });
    const shopId = await this.catalog.importShop(i);
    const errors: string[] = [];
    let adjusted = 0;
    let skipped = 0;
    const done: typeof rows = [];
    for (const r of rows) {
      const h = readHold(r.stockHold);
      if (action === 'take-channel') {
        if (!h || h.channelStock === null) { skipped++; if (errors.length < 20) errors.push('Channel ka Stock maloom nahi — Nafaa ka Stock bhejein ya Nafaa me khud likhein'); continue; }
        try {
          if (await this.setStock(user, i, shopId, r.productId, r.variantId, h.channelStock, `Channel ka Stock liya (${i.displayName})`, 'STOCK-HANDOVER')) adjusted++;
        } catch (e: any) {
          skipped++;
          if (errors.length < 20) errors.push(e?.message ?? 'Stock nahi badla');
          continue;
        }
      }
      done.push(r);
    }
    const at = new Date().toISOString();
    for (const r of done) {
      await this.prisma.productChannelMapping.update({
        where: { id: r.id },
        data: { stockHold: Prisma.DbNull, externalData: { ...((r.externalData as any) ?? {}), handoverAt: at, handover: action } as any },
      });
    }
    if (done.length) this.pushLater(i, [...new Set(done.map((r) => r.productId))]);
    return { resolved: done.length, adjusted, skipped, errors };
  }

  /** "Nafaa se ginti shuru karein" (on) or stop counting (off) for links the channel does not count. */
  async setCounting(user: AuthenticatedUser, body: { mappingIds?: string[]; on?: boolean }) {
    this.assertManager(user);
    const ids = (body?.mappingIds ?? []).map(String).slice(0, 5000);
    if (!ids.length) throw new BadRequestException('Koi link nahi chuna');
    const rows = await this.prisma.productChannelMapping.findMany({
      where: { id: { in: ids }, integration: { tenantId: user.tenantId, type: { in: ['WOOCOMMERCE', 'SHOPIFY'] } } },
      select: { id: true, productId: true, externalData: true, integration: true },
    });
    const at = new Date().toISOString();
    for (const r of rows) {
      const d = { ...((r.externalData as any) ?? {}) };
      if (body.on) d.countOptInAt = at; else delete d.countOptInAt;
      // Opting in sends Nafaa stock as the merchant confirmed: no handover check on the first push.
      if (body.on) d.handoverAt = at;
      await this.prisma.productChannelMapping.update({ where: { id: r.id }, data: { externalData: d, ...(body.on ? { tracksStock: true } : {}) } });
    }
    if (body.on) {
      const byChannel = new Map<string, { i: Integration; ids: string[] }>();
      for (const r of rows) byChannel.set(r.integration.id, { i: r.integration, ids: [...(byChannel.get(r.integration.id)?.ids ?? []), r.productId] });
      for (const { i, ids: pids } of byChannel.values()) this.pushLater(i, [...new Set(pids)]);
    }
    return { updated: rows.length };
  }

  // ═══════════════════════════════════════════════════════════
  // IMPORT FIX (recovery)
  // ═══════════════════════════════════════════════════════════

  async recoveryPreview(user: AuthenticatedUser, channelId: string) {
    this.assertManager(user);
    return this.previewFor(await this.channel(user.tenantId, channelId));
  }

  async recoveryApply(user: AuthenticatedUser, channelId: string, mappingIds: string[]) {
    this.assertManager(user);
    return this.applyFor(await this.channel(user.tenantId, channelId), mappingIds, user);
  }

  /** Admin: preview of every push channel of a tenant. */
  async tenantPreview(tenantId: string) {
    const list = await this.prisma.integration.findMany({ where: { tenantId, type: { in: ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ'] } }, orderBy: { createdAt: 'asc' } });
    const channels: Array<{ id: string; name: string; type: string; preview: RecoveryPreview }> = [];
    for (const i of list) channels.push({ id: i.id, name: i.displayName, type: i.type, preview: await this.previewFor(i) });
    return { channels };
  }

  async tenantApply(tenantId: string, channelId: string, mappingIds: string[], adminId: string) {
    const i = await this.prisma.integration.findFirst({ where: { id: channelId, tenantId } });
    if (!i) throw new NotFoundException('Channel nahi mila');
    return this.applyFor(i, mappingIds, { id: adminId, tenantId } as AuthenticatedUser, true);
  }

  async previewFor(i: Integration): Promise<RecoveryPreview> {
    const shopId = await this.catalog.stockShop(i);
    const shop = shopId ? await this.prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } }) : null;
    const maps = await this.prisma.productChannelMapping.findMany({
      where: { integrationId: i.id },
      select: {
        id: true, productId: true, variantId: true, externalProductId: true, externalVariantId: true, externalTitle: true, externalSku: true,
        externalData: true, lastPush: true, tracksStock: true,
        product: { select: { name: true } }, variant: { select: { name: true } },
      },
    });
    const productIds = [...new Set(maps.map((m) => m.productId))];
    const [stock, imports] = await Promise.all([this.stockOf(shopId, productIds), this.importMoves(i.tenantId, productIds)]);

    // Shopify: what the store shows now for links the import gave 0 (or that are marked untracked).
    let live = new Map<string, ShopifyItemState>();
    let readError: string | null = null;
    const askShopify = i.type === 'SHOPIFY'
      ? maps.filter((m) => m.externalVariantId && (imports.get(mappingKey(m.productId, m.variantId))?.qty === 0 || m.tracksStock === false))
      : [];
    if (askShopify.length) {
      try {
        live = await this.shopifyState(i, askShopify.map((m) => String(m.externalVariantId)));
      } catch (e) {
        readError = friendlySyncError(e);
      }
    }

    const rows: RecoveryRow[] = [];
    let missing = 0;
    for (const m of maps) {
      const k = mappingKey(m.productId, m.variantId);
      const imp = imports.get(k) ?? null;
      const d = (m.externalData ?? {}) as any;
      const base = {
        mappingId: m.id, productId: m.productId, variantId: m.variantId, name: m.product.name, variantName: m.variant?.name ?? null,
        externalTitle: m.externalTitle, externalSku: m.externalSku, nafaaStock: stock.get(k) ?? 0,
        importQty: imp?.qty ?? null, importedAt: imp?.at ?? null, lastPushAt: (m.lastPush as any)?.at ?? null,
      };
      const s = m.externalVariantId ? live.get(String(m.externalVariantId)) : undefined;
      if (s && untrackCandidate({ importQty: imp?.qty ?? null, tracked: s.tracked, available: s.available, tracksStockOnLink: m.tracksStock })) {
        rows.push({
          ...base, action: 'untrack', channelTracked: s.tracked, channelAvailable: s.available, found: null,
          source: imp?.qty === 0 ? 'import-zero' : 'untracked-link', at: imp?.at ?? null,
          confidence: m.tracksStock === false || (!!s.updatedAt && !!imp?.at && Date.parse(s.updatedAt) >= Date.parse(imp.at)) ? 'high' : 'low',
          channelChangedAt: s.updatedAt,
        });
        continue;
      }
      // The first push replaced a positive channel stock with 0 or far less, and Nafaa has not been restocked since.
      const fp = d.firstStockPush;
      const from = Number(fp?.from);
      const to = Number(fp?.to);
      if (fp && Number.isFinite(from) && from > 0 && Number.isFinite(to) && (to <= 0 || (from - to > 5 && to < from * 0.5)) && base.nafaaStock <= to) {
        rows.push({ ...base, action: 'restore', channelTracked: null, channelAvailable: null, found: from, source: 'first-push', at: fp.at ?? null, confidence: null, channelChangedAt: null });
        continue;
      }
      if (!fp && !imp) missing++;
    }
    const note = i.type === 'SHOPIFY'
      ? 'Shopify par Track quantity band karne se item phir se bina ginti bikta hai (pehle jaisa). Nafaa ka Stock nahi badalta.'
      : i.type === 'DARAZ' ? 'Daraz par har item ki ginti hoti hai; sirf wo links jin ka pehla Stock Nafaa ne record kiya.' : null;
    return {
      channel: { id: i.id, name: i.displayName, type: i.type, shopId, shopName: shop?.name ?? null },
      rows, checked: maps.length, missing, note, readError,
    };
  }

  private async applyFor(i: Integration, mappingIds: string[], user: AuthenticatedUser, byAdmin = false) {
    const ids = new Set((mappingIds ?? []).map(String));
    if (!ids.size) throw new BadRequestException('Koi link nahi chuna');
    // The server works out the rows again; only rows it still finds are changed.
    const preview = await this.previewFor(i);
    const picked = preview.rows.filter((r) => ids.has(r.mappingId));
    const errors: string[] = [];
    let untracked = 0;
    let adjusted = 0;
    let skipped = mappingIds.length - picked.length;

    const untrack = picked.filter((r) => r.action === 'untrack');
    if (untrack.length) {
      const client = await this.shopify.client(i);
      if (!client) throw new BadRequestException('Shopify jura nahi — pehle channel dobara jorein');
      const maps = await this.prisma.productChannelMapping.findMany({ where: { integrationId: i.id, id: { in: untrack.map((r) => r.mappingId) } }, select: { id: true, externalVariantId: true, externalData: true } });
      const state = await this.shopifyState(i, [...new Set(maps.map((m) => String(m.externalVariantId ?? '')))].filter(Boolean));
      const ok: string[] = [];
      for (const m of maps) {
        const s = state.get(String(m.externalVariantId));
        if (!s) { skipped++; continue; }
        const [call] = shopifyUntrackCalls([s.inventoryItemId]);
        try {
          await client.mutate(call.query, call.variables, 'inventoryItemUpdate');
          ok.push(m.id);
          const d = { ...((m.externalData as any) ?? {}), untrackedAt: new Date().toISOString() };
          delete d.countOptInAt;
          await this.prisma.productChannelMapping.update({ where: { id: m.id }, data: { externalData: d } });
        } catch (e) {
          skipped++;
          if (errors.length < 20) errors.push(friendlySyncError(e));
        }
      }
      await markTracking(this.prisma, i.id, ok, false);
      untracked = ok.length;
    }

    const restore = picked.filter((r) => r.action === 'restore' && r.found !== null);
    if (restore.length) {
      const shopId = await this.catalog.importShop(i);
      for (const r of restore) {
        try {
          if (await this.setStock(user, i, shopId, r.productId, r.variantId, r.found!, 'Import fix', 'IMPORT-FIX')) adjusted++;
          const m = await this.prisma.productChannelMapping.findUnique({ where: { id: r.mappingId }, select: { externalData: true } });
          await this.prisma.productChannelMapping.update({
            where: { id: r.mappingId },
            data: { stockHold: Prisma.DbNull, externalData: { ...((m?.externalData as any) ?? {}), importFixAt: new Date().toISOString() } as any },
          });
        } catch (e: any) {
          skipped++;
          if (errors.length < 20) errors.push(`${r.name}: ${e?.message ?? 'Stock nahi badla'}`);
        }
      }
      this.pushLater(i, [...new Set(restore.map((r) => r.productId))]);
    }

    await this.prisma.syncLog.create({
      data: {
        integrationId: i.id, tenantId: i.tenantId, operation: 'IMPORT_FIX', direction: 'OUTBOUND', status: errors.length ? 'FAILED' : 'SUCCESS',
        recordsProcessed: picked.length, recordsSuccess: untracked + adjusted, recordsFailed: skipped,
        details: { byAdmin, userId: user.id ?? null, untracked, adjusted, errors: errors.slice(0, 20) } as any, completedAt: new Date(),
      },
    }).catch(() => null);
    return { untracked, adjusted, skipped, errors, pushed: restore.length > 0 };
  }

  /** Shopify "Track quantity" and units for variant ids (read only). */
  private async shopifyState(i: Integration, ids: string[]): Promise<Map<string, ShopifyItemState>> {
    const out = new Map<string, ShopifyItemState>();
    const client = await this.shopify.client(i);
    if (!client || !ids.length) return out;
    for (let k = 0; k < ids.length; k += 100) {
      const gids = ids.slice(k, k + 100).map((id) => `gid://shopify/ProductVariant/${id}`);
      const data = await client.graphql<any>(`query($ids: [ID!]!) { nodes(ids: $ids) { ... on ProductVariant { id inventoryQuantity inventoryItem { id tracked updatedAt } } } }`, { ids: gids });
      for (const n of data?.nodes ?? []) {
        if (!n?.inventoryItem?.id) continue;
        out.set(numericId(n.id), {
          tracked: n.inventoryItem.tracked !== false,
          available: n.inventoryQuantity === null || n.inventoryQuantity === undefined ? null : Number(n.inventoryQuantity),
          inventoryItemId: numericId(n.inventoryItem.id),
          updatedAt: n.inventoryItem.updatedAt ?? null,
        });
      }
    }
    return out;
  }

  /** Opening stock each product/size got from a channel import (the first one). */
  private async importMoves(tenantId: string, productIds: string[]) {
    const out = new Map<string, { qty: number; at: string }>();
    for (let k = 0; k < productIds.length; k += 5000) {
      const rows = await this.prisma.stockMovement.findMany({
        where: { tenantId, productId: { in: productIds.slice(k, k + 5000) }, reference: 'WEBSITE-IMPORT' },
        select: { productId: true, variantId: true, quantity: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      for (const r of rows) {
        const key = mappingKey(r.productId, r.variantId);
        if (!out.has(key)) out.set(key, { qty: Number(r.quantity) || 0, at: r.createdAt.toISOString() });
      }
    }
    return out;
  }

  private async stockOf(shopId: string | null, productIds: string[]) {
    const out = new Map<string, number>();
    if (!shopId || !productIds.length) return out;
    for (let k = 0; k < productIds.length; k += 5000) {
      const rows = await this.prisma.shopStock.findMany({ where: { shopId, productId: { in: productIds.slice(k, k + 5000) } }, select: { productId: true, variantId: true, stock: true } });
      for (const r of rows) out.set(mappingKey(r.productId, r.variantId), Number(r.stock ?? 0));
    }
    return out;
  }

  /**
   * Sets Nafaa branch stock to `target` with a correction adjustment (no
   * profit effect). Returns false when it already matched.
   */
  private async setStock(user: AuthenticatedUser, i: Integration, shopId: string, productId: string, variantId: string | null, target: number, reason: string, reference: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.shopStock.findFirst({ where: { shopId, productId, variantId }, select: { stock: true } });
      const delta = Math.round((Math.max(0, target) - Number(row?.stock ?? 0)) * 10_000) / 10_000;
      if (!delta) return false;
      const item = variantId
        ? await tx.productVariant.findFirst({ where: { id: variantId, productId }, select: { costPrice: true, product: { select: { costPrice: true } } } })
        : null;
      const product = await tx.product.findFirst({ where: { id: productId, tenantId: i.tenantId }, select: { costPrice: true } });
      if (!product) throw new NotFoundException('Product nahi mila');
      const cost = Number(item?.costPrice || product.costPrice || 0);
      const type = delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      await applyStockDelta({
        tx, tenantId: i.tenantId, shopId, productId, variantId, delta, movementType: type, reference, note: `${reason} — ${i.displayName}`,
        userId: user.id ?? null, unitCost: cost,
      } as any);
      await tx.stockAdjustment.create({
        data: {
          tenantId: i.tenantId, shopId, productId, variantId, createdById: user.id ?? null, type, quantity: Math.abs(delta),
          reason, note: i.displayName, unitCost: cost, value: Math.round(Math.abs(delta) * cost * 100) / 100,
          reasonCode: 'CORRECTION', profitEffect: 'NONE',
        },
      });
      return true;
    });
  }

  private pushLater(i: Integration, productIds: string[]) {
    setTimeout(() => {
      this.products.syncProducts(i, productIds, false).catch((e) => this.logger.warn(`Handover push ${i.displayName}: ${e?.message}`));
    }, 0);
  }
}
