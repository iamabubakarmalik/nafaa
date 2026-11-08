import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChannelOrder, Integration, IntegrationCategory, IntegrationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { apiMessage } from '../../common/i18n/api-message';
import { IntegrationService } from '../core/integration.service';
import { OnlineOrdersService } from './online-orders.service';
import { OrderToolsService } from './order-tools.service';
import { OrderChannelSyncService } from './order-channel-sync.service';
import { CLOSED_STATUSES, SYSTEM_STAGES } from './order-board';
import { phoneKey } from './customer-risk';
import { paidAdvance } from './order-money';
import { findPhone, parseOrderText } from './order-parse';
import { MatchIndex, MatchProduct } from './product-matcher';

/** Where a hand-typed order came from (metadata.source). */
export const MANUAL_SOURCES = ['MANUAL', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'PHONE', 'TIKTOK'] as const;
const BULK_ACTIONS = ['assign', 'follow-up', 'tag', 'delete', 'restore', 'stage'];
const DUPLICATE_WINDOW_MS = 48 * 3_600_000;

export interface ManualOrderBody {
  source?: string;
  /** 'NAFAA' or the id of a connected Shopify store. */
  target?: string;
  customer?: { name?: string; phone?: string; address?: string; city?: string };
  items?: Array<{ productId?: string; variantId?: string | null; quantity?: number; price?: number }>;
  discount?: number;
  deliveryFee?: number;
  isCod?: boolean;
  advance?: { amount?: number; method?: string; reference?: string };
  weightKg?: number | null;
  notes?: string;
  replacementOf?: string;
  accept?: boolean;
  /** Set by the Excel import: no new-order alert per row. */
  imported?: boolean;
}

type OrderWithChannel = ChannelOrder & { integration: Integration };

interface CatalogProduct {
  id: string; name: string; sku: string | null; barcode: string | null; hasVariants: boolean; price: unknown;
  variants: Array<{ id: string; name: string; size: string | null; color: string | null; sku: string | null; barcode: string | null; price: unknown }>;
}
interface Catalog { products: CatalogProduct[]; index: MatchIndex }

interface Line {
  name: string; sku?: string; variant?: string; quantity: number; price: number;
  productId?: string; variantId?: string | null; externalProductId?: string; externalVariantId?: string; image?: string;
}

/**
 * Orders the shop enters itself (form, pasted WhatsApp text, Excel), and
 * the board tools around them: assign, follow-up, custom stages, combine,
 * split, duplicates and the extra bulk actions. Bills, status changes and
 * deletes go through OnlineOrdersService so every path stays one path.
 */
@Injectable()
export class OrderEntryService {
  private readonly logger = new Logger(OrderEntryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly tools: OrderToolsService,
    private readonly integrations: IntegrationService,
    private readonly channelSync: OrderChannelSyncService,
  ) {}

  private scopeWhere(user: AuthenticatedUser, scope: ShopScope): Prisma.ChannelOrderWhereInput {
    return { tenantId: user.tenantId, ...(scope.whereLoose as any) };
  }

  private async findOrder(user: AuthenticatedUser, scope: ShopScope, id: string): Promise<OrderWithChannel> {
    const o = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!o) throw new NotFoundException('Order nahi mila');
    return o;
  }

  // ═══════════════════════════════════════════════════════════
  // CUSTOM STAGES, ASSIGN, FOLLOW-UP
  // ═══════════════════════════════════════════════════════════

  stages(user: AuthenticatedUser) {
    return this.tools.customStages(user.tenantId);
  }

  saveStages(user: AuthenticatedUser, body: unknown) {
    return this.tools.saveCustomStages(user, body);
  }

  async assign(user: AuthenticatedUser, scope: ShopScope, id: string, userId: string | null | undefined) {
    await this.findOrder(user, scope, id);
    let name: string | null = null;
    if (userId) {
      const staff = await this.prisma.user.findFirst({ where: { id: String(userId), tenantId: user.tenantId, isActive: true }, select: { id: true, fullName: true, email: true } });
      if (!staff) throw new BadRequestException('Ye staff member nahi mila');
      name = staff.fullName || staff.email;
    }
    return this.orders.addTimeline(user, id, 'ASSIGNED', name, { assignedToId: userId ? String(userId) : null });
  }

  async followUp(user: AuthenticatedUser, scope: ShopScope, id: string, body: { at?: string | null; note?: string }) {
    await this.findOrder(user, scope, id);
    let at: Date | null = null;
    if (body?.at) {
      at = new Date(body.at);
      if (Number.isNaN(at.getTime())) throw new BadRequestException('Follow-up ka waqt sahi nahi');
    }
    const note = body?.note?.trim().slice(0, 200) || null;
    return this.orders.addTimeline(user, id, 'FOLLOW_UP', at ? `${at.toISOString()}${note ? ` — ${note}` : ''}` : null, {
      followUpAt: at, followUpNote: at ? note : null,
    });
  }

  /** Extra actions of POST /online-orders/bulk: assign, follow-up, tag, delete, restore, stage. */
  isBulkAction(action: unknown) {
    return BULK_ACTIONS.includes(String(action ?? ''));
  }

  async bulk(user: AuthenticatedUser, scope: ShopScope, body: {
    action?: string; ids?: string[]; reason?: string; userId?: string | null; at?: string | null; note?: string;
    tags?: string[]; tag?: string; remove?: boolean; stage?: string | null;
  }) {
    const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).map(String))];
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    if (ids.length > 200) throw new BadRequestException('Ek dafa me zyada se zyada 200 orders');
    const action = String(body?.action ?? '');
    const tags = [...(Array.isArray(body?.tags) ? body.tags : []), ...(body?.tag ? [body.tag] : [])].map((t) => String(t).trim().slice(0, 30)).filter(Boolean);
    if (action === 'tag' && !tags.length) throw new BadRequestException('Tag likhein');
    if (action === 'stage' && body.stage) {
      const stage = String(body.stage);
      const custom = (await this.tools.customStages(user.tenantId)).map((c) => `custom:${c.key}`);
      if (!(SYSTEM_STAGES as readonly string[]).includes(stage) && !custom.includes(stage)) throw new BadRequestException('Ye stage nahi mili');
    }

    const results: { id: string; ok: boolean; error?: string; code?: string }[] = [];
    for (const id of ids) {
      try {
        if (action === 'assign') await this.assign(user, scope, id, body.userId ?? null);
        else if (action === 'follow-up') await this.followUp(user, scope, id, { at: body.at ?? null, note: body.note });
        else if (action === 'tag') {
          const o = await this.findOrder(user, scope, id);
          const current: string[] = Array.isArray((o.metadata as any)?.tags) ? (o.metadata as any).tags : [];
          const next = body.remove ? current.filter((t) => !tags.includes(t)) : [...current, ...tags];
          await this.tools.setTags(user, scope, id, next);
        } else if (action === 'delete') await this.orders.softDelete(user, scope, id, body.reason);
        else if (action === 'restore') await this.orders.restore(user, scope, id);
        else if (action === 'stage') {
          if (body.stage) await this.orders.move(user, scope, id, { to: String(body.stage), reason: body.reason });
          else {
            await this.findOrder(user, scope, id);
            await this.orders.addTimeline(user, id, 'STAGE_CLEARED', body.reason ?? null, { stage: null });
          }
        } else throw new BadRequestException('Ghalat kaam');
        results.push({ id, ok: true });
      } catch (e: any) {
        const r = e?.response ?? {};
        const m = r.message ?? e?.message ?? 'Nahi hua';
        results.push({ id, ok: false, error: Array.isArray(m) ? m.join(', ') : String(m), ...(r.code && { code: String(r.code) }) });
      }
    }
    return { done: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  // ═══════════════════════════════════════════════════════════
  // COMBINE / SPLIT / DUPLICATES
  // ═══════════════════════════════════════════════════════════

  /** Same customer's new orders into the oldest one; the others are soft-deleted with mergedIntoId. */
  async combine(user: AuthenticatedUser, scope: ShopScope, body: { ids?: string[] }) {
    const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).map(String))];
    if (ids.length < 2) throw new BadRequestException('Jorne ke liye kam az kam 2 orders chunein');
    if (ids.length > 20) throw new BadRequestException('Ek dafa me zyada se zyada 20 orders jorte hain');
    const list = await this.prisma.channelOrder.findMany({ where: { id: { in: ids }, ...this.scopeWhere(user, scope), deletedAt: null } });
    if (list.length !== ids.length) throw new NotFoundException('Kuch orders nahi mile');
    const problem = combineProblem(list);
    if (problem) throw new BadRequestException(problem);

    const sorted = [...list].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
    const [main, ...rest] = sorted;
    const items = mergeLines(sorted.flatMap((o) => ((o.items as unknown as Line[]) ?? [])));
    const subtotal = round2(items.reduce((s, i) => s + i.price * i.quantity, 0));
    const discount = round2(sorted.reduce((s, o) => s + Number(o.discount), 0));
    const deliveryFee = Math.max(...sorted.map((o) => Number(o.deliveryFee) || 0));
    const total = round2(Math.max(0, subtotal - discount + deliveryFee));
    const meta = (main.metadata ?? {}) as any;
    const payments = sorted.flatMap((o) => (Array.isArray((o.metadata as any)?.payments) ? (o.metadata as any).payments : []));
    const num = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');

    await this.prisma.channelOrder.update({
      where: { id: main.id },
      data: {
        items: items as any, subtotal, discount, deliveryFee, total,
        weightKg: sorted.some((o) => o.weightKg) ? round2(sorted.reduce((s, o) => s + (o.weightKg ?? 0), 0)) : main.weightKg,
        metadata: { ...meta, payments, mergedFrom: [...(meta.mergedFrom ?? []), ...rest.map((o) => ({ id: o.id, number: num(o) }))] },
      },
    });
    for (const o of rest) await this.orders.markDeleted(user, o.id, { reason: `#${num(main)} me jor diya`, mergedIntoId: main.id });
    const order = await this.orders.addTimeline(user, main.id, 'COMBINED', rest.map((o) => `#${num(o)}`).join(', '));
    return { order, merged: rest.map((o) => o.id) };
  }

  /** Moves some items of a new order into a new order of the same channel (before accept only). */
  async split(user: AuthenticatedUser, scope: ShopScope, id: string, body: { itemIndexes?: number[] }) {
    const order = await this.findOrder(user, scope, id);
    if (order.deletedAt) throw new BadRequestException('Delete hua order split nahi hota');
    if (order.nafaaSaleId || order.orderStatus !== 'PENDING') throw new BadRequestException('Split sirf naye order ka hota hai (accept se pehle)');
    const items = ((order.items as unknown as Line[]) ?? []);
    const idx = [...new Set((Array.isArray(body?.itemIndexes) ? body.itemIndexes : []).map(Number))];
    if (!idx.length || idx.some((i) => !Number.isInteger(i) || i < 0 || i >= items.length)) throw new BadRequestException('Alag karne wale items chunein');
    if (idx.length >= items.length) throw new BadRequestException('Kam az kam ek item pehle order me rehna chahiye');

    const moved = items.filter((_, i) => idx.includes(i));
    const kept = items.filter((_, i) => !idx.includes(i));
    const keptSub = round2(kept.reduce((s, i) => s + i.price * i.quantity, 0));
    const movedSub = round2(moved.reduce((s, i) => s + i.price * i.quantity, 0));
    const discount = Math.min(Number(order.discount) || 0, keptSub);
    const keptTotal = round2(Math.max(0, keptSub - discount + (Number(order.deliveryFee) || 0)));
    const meta = (order.metadata ?? {}) as any;
    if (paidAdvance(meta) > keptTotal + 0.5) throw new BadRequestException('Advance pehle order ki nayi raqam se zyada hai — pehle advance theek karein');

    const base = order.externalOrderId;
    const siblings = await this.prisma.channelOrder.count({ where: { integrationId: order.integrationId, externalOrderId: { startsWith: `${base}-S` } } });
    let n = siblings + 1;
    while (await this.prisma.channelOrder.findUnique({ where: { integrationId_externalOrderId: { integrationId: order.integrationId, externalOrderId: `${base}-S${n}` } }, select: { id: true } })) n++;
    const number = String(order.externalOrderNumber ?? base).replace(/^#+/, '');
    const { payments: _p, timeline: _t, edits: _e, mergedFrom: _m, splits: _s, ...copy } = meta;

    const created = await this.prisma.channelOrder.create({
      data: {
        integrationId: order.integrationId, tenantId: order.tenantId, shopId: order.shopId,
        externalOrderId: `${base}-S${n}`, externalOrderNumber: `${number}-S${n}`,
        customerName: order.customerName, customerPhone: order.customerPhone, customerEmail: order.customerEmail,
        customerAddress: order.customerAddress, customerCity: order.customerCity, customerLat: order.customerLat, customerLng: order.customerLng,
        items: moved as any, subtotal: movedSub, deliveryFee: 0, discount: 0, total: movedSub,
        paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, orderStatus: 'PENDING',
        notes: order.notes, receivedAt: order.receivedAt, assignedToId: order.assignedToId,
        metadata: { ...copy, splitFrom: { id: order.id, number } },
      },
    });
    await this.prisma.channelOrder.update({
      where: { id },
      data: {
        items: kept as any, subtotal: keptSub, discount, total: keptTotal,
        metadata: { ...meta, splits: [...(meta.splits ?? []), { id: created.id, number: `${number}-S${n}` }] },
      },
    });
    const updated = await this.orders.addTimeline(user, id, 'SPLIT', `#${number}-S${n}`);
    return { order: updated, newOrder: await this.orders.view(created.id) };
  }

  /** Open orders of the same phone within 48 hours of each other (last 30 days). */
  async duplicates(user: AuthenticatedUser, scope: ShopScope) {
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        ...this.scopeWhere(user, scope), deletedAt: null, customerPhone: { not: null },
        orderStatus: { notIn: [...CLOSED_STATUSES, 'DELIVERED'] },
        receivedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerPhone: true, customerCity: true,
        total: true, orderStatus: true, stage: true, receivedAt: true, nafaaSaleId: true, metadata: true,
        integration: { select: { id: true, type: true, displayName: true } },
      },
      orderBy: { receivedAt: 'asc' },
      take: 5000,
    });
    const byPhone = new Map<string, typeof rows>();
    for (const r of rows) {
      if ((r.metadata as any)?.test) continue;
      const k = phoneKey(r.customerPhone);
      if (k) byPhone.set(k, [...(byPhone.get(k) ?? []), r]);
    }
    const groups: Array<{ phone: string; customerName: string; orders: any[] }> = [];
    for (const [k, list] of byPhone) {
      if (list.length < 2) continue;
      const near = list.filter((o, i) => list.some((x, j) => j !== i && Math.abs(x.receivedAt.getTime() - o.receivedAt.getTime()) <= DUPLICATE_WINDOW_MS));
      if (near.length < 2) continue;
      groups.push({
        phone: k,
        customerName: near[near.length - 1].customerName,
        orders: near.map(({ metadata: _m, ...o }) => ({
          ...o,
          externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
          total: Number(o.total),
          hasBill: !!o.nafaaSaleId,
        })),
      });
    }
    groups.sort((a, b) => b.orders[b.orders.length - 1].receivedAt.getTime() - a.orders[a.orders.length - 1].receivedAt.getTime());
    return { count: groups.length, groups };
  }

  // ═══════════════════════════════════════════════════════════
  // ADD ORDER — form, paste, Excel
  // ═══════════════════════════════════════════════════════════

  /** The tenant's one "Manual orders" channel, made on first use. */
  async manualIntegration(tenantId: string): Promise<Integration> {
    const found = await this.prisma.integration.findFirst({ where: { tenantId, type: 'MANUAL' }, orderBy: { createdAt: 'asc' } });
    if (found) return found;
    return this.prisma.integration.create({
      data: {
        tenantId, type: 'MANUAL', category: IntegrationCategory.SALES_CHANNEL, displayName: 'Manual orders',
        status: IntegrationStatus.CONNECTED, autoSyncEnabled: false, syncDirection: 'INBOUND',
        // Typed prices are the prices billed.
        config: { priceSource: 'WEBSITE' },
      },
    });
  }

  /** Next M-<n> number; one atomic update so two people never get the same number. */
  private async nextManualNumber(integrationId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ seq: number }>>`
      UPDATE "integrations"
      SET "config" = jsonb_set(COALESCE("config", '{}'::jsonb), '{manualSeq}', to_jsonb(COALESCE(("config"->>'manualSeq')::int, 0) + 1))
      WHERE "id" = ${integrationId}
      RETURNING ("config"->>'manualSeq')::int AS seq`;
    const seq = Number(rows[0]?.seq);
    if (!Number.isFinite(seq)) throw new BadRequestException('Order number nahi bana — dobara koshish karein');
    return seq;
  }

  async createManual(user: AuthenticatedUser, scope: ShopScope, body: ManualOrderBody) {
    const source = String(body?.source ?? 'MANUAL').toUpperCase();
    if (!(MANUAL_SOURCES as readonly string[]).includes(source)) throw new BadRequestException('Order kahan se aaya — sahi source chunein');

    let original: OrderWithChannel | null = null;
    if (body?.replacementOf) original = await this.findOrder(user, scope, String(body.replacementOf));

    const c = body?.customer ?? {};
    const name = String(c.name ?? original?.customerName ?? '').trim().slice(0, 100);
    const phoneRaw = String(c.phone ?? original?.customerPhone ?? '').trim();
    const phone = findPhone(phoneRaw) ?? phoneRaw.replace(/[^\d+]/g, '').slice(0, 20);
    if (!name) throw new BadRequestException('Customer ka naam likhein');
    if (phone.replace(/\D/g, '').length < 7) throw new BadRequestException('Customer ka sahi phone number likhein');
    const address = String(c.address ?? original?.customerAddress ?? '').trim().slice(0, 400) || null;
    const city = String(c.city ?? original?.customerCity ?? '').trim().slice(0, 80) || null;

    const lines = await this.buildLines(user.tenantId, body?.items ?? []);
    const num = (v: unknown, label: string) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new BadRequestException(apiMessage('{{label}} sahi likhein', { label }));
      return round2(n);
    };
    const discount = num(body?.discount, 'Discount');
    const deliveryFee = num(body?.deliveryFee, 'Delivery charge');
    const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
    if (discount > subtotal + 0.009) throw new BadRequestException('Discount items ki qeemat se zyada nahi ho sakta');
    const total = round2(Math.max(0, subtotal - discount + deliveryFee));
    const isCod = body?.isCod !== false;
    let weightKg: number | null = null;
    if (body?.weightKg !== undefined && body.weightKg !== null && (body.weightKg as any) !== '') {
      weightKg = Number(body.weightKg);
      if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000) throw new BadRequestException('Wazan sahi likhein (kg)');
    }
    const advanceMethod = body?.advance?.method ? String(body.advance.method).toLowerCase() : null;
    const notes = body?.notes?.trim().slice(0, 500) || undefined;
    const target = String(body?.target ?? 'NAFAA');

    let integration: Integration;
    let externalOrderId: string;
    let externalOrderNumber: string;
    let shopifySync: { channel: string; ok: boolean; message: string } | null = null;
    if (target === 'NAFAA') {
      integration = await this.manualIntegration(user.tenantId);
      const seq = await this.nextManualNumber(integration.id);
      externalOrderId = `M-${seq}`;
      externalOrderNumber = `M-${seq}`;
    } else {
      const shop = await this.prisma.integration.findFirst({ where: { id: target, tenantId: user.tenantId, type: 'SHOPIFY' } });
      if (!shop) throw new BadRequestException('Shopify store nahi mila');
      integration = shop;
      const created = await this.channelSync.createShopifyOrder(shop, {
        customer: { name, phone, address, city }, items: lines, deliveryFee, discount, isCod, notes,
      }).catch((e: any) => {
        throw new BadRequestException(apiMessage('Shopify par order nahi bana: {{reason}}', { reason: String(e?.message ?? '').slice(0, 200) }));
      });
      externalOrderId = created.externalOrderId;
      externalOrderNumber = created.externalOrderNumber;
      shopifySync = { channel: 'SHOPIFY', ok: true, message: 'Shopify par bhi order ban gaya' };
    }

    const metadata = {
      platform: target === 'NAFAA' ? 'manual' : 'shopify',
      source,
      manual: true,
      cod: isCod,
      createdBy: user.id,
      ...(body?.imported && { imported: true }),
      ...(original && { replacementOf: { id: original.id, number: String(original.externalOrderNumber ?? original.externalOrderId).replace(/^#+/, '') } }),
    };
    const received = await this.integrations.receiveChannelOrder(integration.id, {
      externalOrderId,
      externalOrderNumber,
      customerName: name,
      customerPhone: phone,
      customerAddress: address ?? undefined,
      customerCity: city ?? undefined,
      items: lines,
      subtotal,
      deliveryFee,
      discount,
      total,
      paymentMethod: isCod ? 'cod' : advanceMethod ?? 'bank_transfer',
      paymentStatus: isCod ? 'PENDING' : 'PAID',
      orderStatus: 'PENDING',
      notes,
      shopId: scope.shopId ?? null,
      metadata,
    });
    // A Shopify webhook may have stored the order first: our lines (with products) and source win.
    await this.prisma.channelOrder.update({
      where: { id: received.id },
      data: {
        items: lines as any,
        weightKg,
        replacementOfId: original?.id ?? null,
        metadata: { ...((received.metadata as any) ?? {}), ...metadata },
      },
    });

    let advanceError = null as string | null;
    if (isCod && body?.advance && Number(body.advance.amount) > 0) {
      await this.orders.addAdvance(user, scope, received.id, body.advance).catch((e: any) => { advanceError = errText(e); });
    }
    let acceptError = null as string | null;
    let acceptCode = null as string | null;
    if (body?.accept) {
      await this.orders.accept(user, scope, received.id, {}).catch((e: any) => {
        acceptError = errText(e);
        acceptCode = e?.response?.code ?? null;
      });
    }
    const order = await this.orders.addTimeline(user, received.id, 'CREATED', source);
    return { order, accepted: !!body?.accept && !acceptError, acceptError, acceptCode, advanceError, sync: shopifySync };
  }

  /** Lines of a hand-typed order: each needs a product (and size when it has sizes). */
  private async buildLines(tenantId: string, raw: NonNullable<ManualOrderBody['items']>): Promise<Line[]> {
    if (!Array.isArray(raw) || !raw.length) throw new BadRequestException('Kam az kam ek item daalein');
    if (raw.length > 100) throw new BadRequestException('Zyada se zyada 100 items');
    const ids = [...new Set(raw.map((r) => String(r?.productId ?? '')).filter(Boolean))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, tenantId, isActive: true },
      select: {
        id: true, name: true, sku: true, price: true, hasVariants: true,
        images: { take: 1, select: { url: true } },
        variants: { where: { isActive: true }, select: { id: true, name: true, size: true, color: true, sku: true, price: true } },
      },
    });
    return raw.map((r) => {
      const p = products.find((x) => x.id === String(r?.productId ?? ''));
      if (!p) throw new BadRequestException('Har item ka product chunein');
      const v = r.variantId ? p.variants.find((x) => x.id === String(r.variantId)) : undefined;
      if (r.variantId && !v) throw new BadRequestException(apiMessage('{{name}}: chuna hua variant is product ka nahi', { name: p.name }));
      if (p.hasVariants && !v) throw new BadRequestException(apiMessage('{{name}}: is product ke size/variant hain — sahi size chunein', { name: p.name }));
      const quantity = Number(r.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) throw new BadRequestException(apiMessage('{{name}}: tadad sahi likhein', { name: p.name }));
      const price = r.price === undefined || r.price === null || (r.price as any) === '' ? Number(v?.price ?? p.price) : Number(r.price);
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException(apiMessage('{{name}}: qeemat sahi likhein', { name: p.name }));
      const line: Line = {
        name: p.name,
        quantity,
        price: round2(price),
        productId: p.id,
        variantId: v?.id ?? null,
      };
      const sku = v?.sku || p.sku;
      if (sku) line.sku = sku;
      const label = v ? v.name || [v.color, v.size].filter(Boolean).join(' / ') : '';
      if (label) line.variant = label;
      if (p.images[0]?.url) line.image = p.images[0].url;
      return line;
    });
  }

  /** Text pasted from a chat → customer, phone, address, city and matched items. */
  async parse(user: AuthenticatedUser, body: { text?: string }) {
    const text = String(body?.text ?? '');
    if (!text.trim()) throw new BadRequestException('Message paste karein');
    const parsed = parseOrderText(text);
    const catalog = parsed.items.length ? await this.catalog(user.tenantId) : null;
    return {
      ...parsed,
      items: parsed.items.map((it) => ({ ...it, match: catalog ? this.matchText(catalog, it.text) : null })),
    };
  }

  /**
   * Excel rows already read on the client → one manual order per row.
   * Product by SKU/barcode first, then by name. Max 500 rows.
   */
  async importRows(user: AuthenticatedUser, scope: ShopScope, body: { rows?: any[]; source?: string; accept?: boolean }) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) throw new BadRequestException('File me koi row nahi');
    if (rows.length > 500) throw new BadRequestException('Ek dafa me zyada se zyada 500 rows');
    const catalog = await this.catalog(user.tenantId);
    const results: { row: number; ok: boolean; orderId?: string; number?: string; error?: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      try {
        const code = String(r.sku ?? '').trim();
        const productText = String(r.product ?? r.name_of_product ?? '').trim();
        const match = (code && this.matchCode(catalog, code)) || (productText && this.matchText(catalog, productText)) || null;
        if (!match) throw new BadRequestException(apiMessage('Product nahi mila: {{product}}', { product: code || productText || '-' }));
        const cod = r.cod === undefined || r.cod === null || r.cod === '' ? true : /^(1|y|yes|true|cod|haan|han)$/i.test(String(r.cod).trim());
        const res = await this.createManual(user, scope, {
          source: String(r.source ?? body?.source ?? 'MANUAL'),
          target: 'NAFAA',
          customer: { name: r.name, phone: String(r.phone ?? ''), address: r.address, city: r.city },
          items: [{ productId: match.productId, variantId: match.variantId, quantity: Number(r.qty ?? r.quantity ?? 1) || 1, ...(r.price !== undefined && r.price !== '' && { price: Number(r.price) }) }],
          deliveryFee: r.deliveryFee !== undefined && r.deliveryFee !== '' ? Number(r.deliveryFee) : undefined,
          isCod: cod,
          notes: r.notes ? String(r.notes) : undefined,
          accept: body?.accept === true,
          imported: true,
        });
        results.push({ row: i, ok: true, orderId: res.order.id, number: res.order.externalOrderNumber ?? undefined, ...(res.acceptError ? { error: String(res.acceptError) } : {}) });
      } catch (e: any) {
        results.push({ row: i, ok: false, error: errText(e) });
      }
    }
    return { created: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  private async catalog(tenantId: string): Promise<Catalog> {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, name: true, sku: true, barcode: true, hasVariants: true, price: true,
        variants: { where: { isActive: true }, select: { id: true, name: true, size: true, color: true, sku: true, barcode: true, price: true } },
      },
      take: 20_000,
    });
    return { products, index: new MatchIndex(products as unknown as MatchProduct[]) };
  }

  private matchView(catalog: Catalog, productId: string, variantId: string | null) {
    const p = catalog.products.find((x) => x.id === productId);
    if (!p) return null;
    const v = variantId ? p.variants.find((x) => x.id === variantId) : undefined;
    const label = v ? v.name || [v.color, v.size].filter(Boolean).join(' / ') : '';
    return { productId, variantId, name: label ? `${p.name} — ${label}` : p.name, price: Number(v?.price ?? p.price) };
  }

  private matchCode(catalog: Catalog, code: string) {
    const r = catalog.index.match({ title: '', sku: code, barcode: code, hasVariants: false })
      ?? catalog.index.match({ title: '', sku: code, barcode: code, hasVariants: true });
    return r ? this.matchView(catalog, r.productId, r.variantId) : null;
  }

  /** Name match; when the last word is a size ("Shirt M"), the size is tried too. */
  private matchText(catalog: Catalog, text: string) {
    let r = catalog.index.match({ title: text, hasVariants: false });
    if (!r) {
      const parts = text.trim().split(/\s+/);
      if (parts.length > 1) r = catalog.index.match({ title: parts.slice(0, -1).join(' '), variantTitle: parts[parts.length - 1], hasVariants: true });
    }
    return r ? this.matchView(catalog, r.productId, r.variantId) : null;
  }
}

/** Why a set of orders cannot be combined, or null. Exported for tests. */
export function combineProblem(list: Array<{ externalOrderNumber: string | null; externalOrderId: string; nafaaSaleId: string | null; orderStatus: string; customerPhone: string | null; paymentStatus: string; metadata: unknown }>): string | null {
  for (const o of list) {
    const num = String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
    if (o.nafaaSaleId) return apiMessage('#{{num}} ka bill ban chuka — sirf naye orders jorte hain', { num }).message;
    if (o.orderStatus !== 'PENDING') return apiMessage('#{{num}} naya order nahi — sirf naye orders jorte hain', { num }).message;
  }
  const keys = new Set(list.map((o) => phoneKey(o.customerPhone) ?? ''));
  if (keys.size !== 1 || keys.has('')) return 'Sirf ek hi customer (same phone) ke orders jorte hain';
  const paid = new Set(list.map((o) => o.paymentStatus === 'PAID'));
  if (paid.size > 1) return 'Paid aur COD orders ek order nahi bante';
  return null;
}

/** Same product, size and price lines become one line with the quantities added. */
export function mergeLines(lines: Line[]): Line[] {
  const out: Line[] = [];
  for (const l of lines) {
    const hit = out.find((o) => o.name === l.name && (o.variant ?? '') === (l.variant ?? '') && o.price === l.price
      && (o.productId ?? '') === (l.productId ?? '') && (o.variantId ?? null) === (l.variantId ?? null)
      && (o.externalVariantId ?? '') === (l.externalVariantId ?? ''));
    if (hit) hit.quantity += l.quantity;
    else out.push({ ...l });
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function errText(e: any): string {
  const m = e?.response?.message ?? e?.message ?? 'Nahi hua';
  return Array.isArray(m) ? m.join(', ') : String(m);
}
