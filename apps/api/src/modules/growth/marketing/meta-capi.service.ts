/**
 * Meta Conversions API with the shop's own pixel and access token.
 *
 * The shop makes the token in its own Business Manager (Events Manager →
 * pixel → Settings → Conversions API → Generate access token), so no Nafaa
 * app review is involved. Settings live in system_settings
 * (`meta_capi:<tenantId>`), the token encrypted.
 *
 * Every 5 minutes the sweep:
 *   1. queues a Purchase (or the shop's chosen event name) for each order
 *      delivered since the setting was switched on, at most 7 days back
 *      (Meta's limit), and, when switched on, an InitiateCheckout for each
 *      abandoned checkout with a phone or email;
 *   2. sends due events in batches of up to 50 per shop. The payload is built
 *      at send time, so an order returned before sending is skipped.
 *      Failures are retried after 1 min, 5 min, 30 min, 2 h and 6 h; bad
 *      token or pixel errors stop at once.
 *
 * Switches: DISABLE_META_CAPI=1 stops the sweep on this server;
 * AUTOMATION_DRY_RUN=1 builds events but never sends them (marked SKIPPED);
 * the admin kill switch META_CAPI (Admin > Online store > Controls) pauses
 * sending platform-wide.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '../../../core/system-control/cron.decorator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { decrypt, encrypt } from '../../../core/lib/crypto';
import { commerceControls } from '../../../integrations/online-orders/commerce-controls';
import { phoneKey } from '../../../integrations/online-orders/customer-risk';
import {
  CapiItem, MAX_ATTEMPTS, MAX_EVENT_AGE_MS, actionSourceOf, capiRequest, checkoutEvent, isPermanentError, purchaseEvent, retryDelayMs, validPixelId,
} from './meta-capi';

const settingKey = (tenantId: string) => `meta_capi:${tenantId}`;
const MANAGERS = ['OWNER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'];
const EVENT_NAMES = ['Purchase', 'OrderDelivered'] as const;
const BATCH = 50;

export interface CapiSettings {
  enabled: boolean;
  pixelId: string | null;
  /** Encrypted access token. */
  token: string | null;
  testCode: string | null;
  eventName: (typeof EVENT_NAMES)[number];
  sendCheckouts: boolean;
  /** Orders delivered before this time are not sent (set when first switched on). */
  since: string | null;
}

const DEFAULTS: CapiSettings = { enabled: false, pixelId: null, token: null, testCode: null, eventName: 'Purchase', sendCheckouts: false, since: null };

const dryRun = () => process.env.AUTOMATION_DRY_RUN === '1';

@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  /* ───────────────────────── settings ───────────────────────── */

  async read(tenantId: string): Promise<CapiSettings> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: settingKey(tenantId) } });
    let raw: Partial<CapiSettings> = {};
    try { raw = row?.value ? JSON.parse(row.value) : {}; } catch { raw = {}; }
    return {
      ...DEFAULTS, ...raw,
      eventName: (EVENT_NAMES as readonly string[]).includes(String(raw.eventName)) ? raw.eventName! : 'Purchase',
    };
  }

  private async write(tenantId: string, s: CapiSettings) {
    const value = JSON.stringify(s);
    await this.prisma.systemSetting.upsert({ where: { key: settingKey(tenantId) }, create: { key: settingKey(tenantId), value }, update: { value } });
  }

  private assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('Ye setting sirf malik ya manager badal sakte hain');
  }

  async overview(user: AuthenticatedUser) {
    const s = await this.read(user.tenantId);
    const token = s.token ? decrypt(s.token) : null;
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [counts, paused] = await Promise.all([
      this.prisma.metaCapiEvent.groupBy({ by: ['status'], where: { tenantId: user.tenantId, createdAt: { gte: since } }, _count: { _all: true } }),
      this.paused(),
    ]);
    const c = Object.fromEntries(counts.map((x) => [x.status, x._count._all]));
    return {
      enabled: s.enabled, pixelId: s.pixelId, hasToken: !!token, tokenEnd: token ? token.slice(-4) : null,
      testCode: s.testCode, eventName: s.eventName, sendCheckouts: s.sendCheckouts, since: s.since,
      paused, dryRun: dryRun(),
      last7: { sent: c.SENT ?? 0, failed: c.FAILED ?? 0, pending: c.PENDING ?? 0, skipped: c.SKIPPED ?? 0 },
    };
  }

  async save(user: AuthenticatedUser, b: { enabled?: boolean; pixelId?: string | null; token?: string | null; testCode?: string | null; eventName?: string; sendCheckouts?: boolean }) {
    this.assertManager(user);
    const s = await this.read(user.tenantId);
    if (b.pixelId !== undefined) {
      const id = String(b.pixelId ?? '').trim();
      if (id && !validPixelId(id)) throw new BadRequestException('Pixel ID sirf number hota hai (Events Manager me pixel ke naam ke neeche)');
      s.pixelId = id || null;
    }
    if (b.token !== undefined) {
      const t = String(b.token ?? '').trim();
      if (t && (t.length < 30 || /\s/.test(t))) throw new BadRequestException('Ye code poora nahi lagta — Events Manager se dobara copy karein');
      s.token = t ? encrypt(t) : null;
    }
    if (b.testCode !== undefined) s.testCode = String(b.testCode ?? '').trim().slice(0, 40) || null;
    if (b.eventName !== undefined) {
      if (!(EVENT_NAMES as readonly string[]).includes(b.eventName)) throw new BadRequestException('Event sahi nahi');
      s.eventName = b.eventName as CapiSettings['eventName'];
    }
    if (b.sendCheckouts !== undefined) s.sendCheckouts = !!b.sendCheckouts;
    if (b.enabled !== undefined) {
      if (b.enabled && (!s.pixelId || !s.token)) throw new BadRequestException('Pehle Pixel ID aur Meta ka code daalein');
      if (b.enabled && !s.enabled) s.since = new Date().toISOString();
      s.enabled = !!b.enabled;
    }
    if (s.enabled && (!s.pixelId || !s.token)) s.enabled = false;
    await this.write(user.tenantId, s);
    return this.overview(user);
  }

  /** Sends one test event to Meta's Test Events screen. Needs the test code. */
  async test(user: AuthenticatedUser) {
    this.assertManager(user);
    const s = await this.read(user.tenantId);
    const token = s.token ? decrypt(s.token) : null;
    if (!s.pixelId || !token) throw new BadRequestException('Pehle Pixel ID aur Meta ka code daalein');
    if (!s.testCode) throw new BadRequestException('Test code daalein (Events Manager → Test events)');
    const id = `nafaa_test_${Date.now()}`;
    const event = purchaseEvent({
      orderId: id, orderNumber: 'TEST', eventName: s.eventName, deliveredAt: new Date(), value: 1, items: [{ id: 'TEST', quantity: 1, price: 1 }],
      customer: { phone: '03001234567', city: 'Lahore', country: 'pk' }, actionSource: 'website',
    });
    (event as any).event_id = id;
    const row = await this.prisma.metaCapiEvent.create({ data: { tenantId: user.tenantId, eventName: 'Test', eventId: id, value: 1, testCode: s.testCode, status: 'PENDING', nextAttemptAt: new Date() } });
    const res = await this.post(s.pixelId, token, [event], s.testCode);
    await this.prisma.metaCapiEvent.update({
      where: { id: row.id },
      data: res.dryRun
        ? { status: 'SKIPPED', attempts: 1, lastError: 'Test mode: bheja nahi gaya', nextAttemptAt: null }
        : res.ok
        ? { status: 'SENT', sentAt: new Date(), attempts: 1, response: res.body as Prisma.InputJsonValue, nextAttemptAt: null }
        : { status: 'FAILED', attempts: 1, lastError: res.error, response: (res.body ?? Prisma.JsonNull) as Prisma.InputJsonValue, nextAttemptAt: null },
    });
    return { ok: res.ok, message: res.ok ? null : res.error, dryRun: res.dryRun ?? false };
  }

  /* ───────────────────────── event log ───────────────────────── */

  async events(user: AuthenticatedUser, q: { status?: string; page?: string | number; limit?: string | number }) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(q.limit) || 30));
    const where: Prisma.MetaCapiEventWhereInput = {
      tenantId: user.tenantId,
      ...(q.status && ['PENDING', 'SENT', 'FAILED', 'SKIPPED'].includes(q.status) && { status: q.status }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.metaCapiEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.metaCapiEvent.count({ where }),
    ]);
    const orderIds = rows.map((r) => r.orderId).filter(Boolean) as string[];
    const orders = orderIds.length ? await this.prisma.channelOrder.findMany({ where: { id: { in: orderIds } }, select: { id: true, externalOrderNumber: true, externalOrderId: true, customerName: true } }) : [];
    const O = new Map(orders.map((o) => [o.id, o]));
    return {
      items: rows.map((r) => ({
        id: r.id, eventName: r.eventName, status: r.status, value: r.value, currency: r.currency, attempts: r.attempts,
        lastError: r.lastError, sentAt: r.sentAt, createdAt: r.createdAt, nextAttemptAt: r.nextAttemptAt, test: !!r.testCode,
        order: r.orderId && O.get(r.orderId) ? { id: r.orderId, number: String(O.get(r.orderId)!.externalOrderNumber ?? O.get(r.orderId)!.externalOrderId).replace(/^#+/, ''), customer: O.get(r.orderId)!.customerName } : null,
        checkoutId: r.checkoutId,
      })),
      total, page, pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async retry(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.metaCapiEvent.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Event nahi mila');
    if (row.status === 'SENT') throw new BadRequestException('Ye event ja chuka hai');
    if (row.eventName === 'Test') throw new BadRequestException('Test dobara "Test bhejein" se karein');
    await this.prisma.metaCapiEvent.update({ where: { id }, data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), lastError: null } });
    await this.sendDue(user.tenantId);
    return this.prisma.metaCapiEvent.findUniqueOrThrow({ where: { id } });
  }

  /* ───────────────────────── sweep ───────────────────────── */

  private async paused() {
    return !!(await commerceControls(this.prisma)).killSwitch.META_CAPI;
  }

  @Cron('30 */5 * * * *')
  async sweep() {
    if (this.running || process.env.DISABLE_META_CAPI === '1' || process.env.NODE_ENV === 'test') return;
    this.running = true;
    try {
      if (await this.paused()) return;
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { startsWith: 'meta_capi:' } }, select: { key: true } });
      for (const r of rows) {
        const tenantId = r.key.slice('meta_capi:'.length);
        try {
          const s = await this.read(tenantId);
          if (!s.enabled || !s.pixelId || !s.token) continue;
          await this.enqueue(tenantId, s);
          await this.sendDue(tenantId);
        } catch (e) {
          this.logger.warn(`Conversions API sweep failed (${tenantId}): ${(e as Error)?.message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** Queues events for delivered orders (and abandoned checkouts) not queued yet. */
  async enqueue(tenantId: string, s: CapiSettings) {
    const floor = new Date(Math.max(Date.now() - MAX_EVENT_AGE_MS + 3_600_000, s.since ? new Date(s.since).getTime() : 0));
    const delivered = await this.prisma.channelOrder.findMany({
      where: { tenantId, orderStatus: 'DELIVERED', deliveredAt: { gte: floor }, deletedAt: null },
      select: { id: true, total: true, metadata: true },
      take: 2000,
    });
    const live = delivered.filter((o) => !(o.metadata as any)?.test);
    if (live.length) {
      await this.prisma.metaCapiEvent.createMany({
        data: live.map((o) => ({ tenantId, eventName: s.eventName, eventId: `nafaa_purchase_${o.id}`, orderId: o.id, value: Number(o.total) || 0, status: 'PENDING', nextAttemptAt: new Date() })),
        skipDuplicates: true,
      });
    }
    if (s.sendCheckouts) {
      const carts = await this.prisma.abandonedCheckout.findMany({
        where: { tenantId, abandonedAt: { gte: floor }, completedAt: null, recoveredOrderId: null, OR: [{ customerPhone: { not: null } }, { customerEmail: { not: null } }] },
        select: { id: true, total: true },
        take: 2000,
      });
      if (carts.length) {
        await this.prisma.metaCapiEvent.createMany({
          data: carts.map((c) => ({ tenantId, eventName: 'InitiateCheckout', eventId: `nafaa_checkout_${c.id}`, checkoutId: c.id, value: c.total, status: 'PENDING', nextAttemptAt: new Date() })),
          skipDuplicates: true,
        });
      }
    }
  }

  /** Sends the shop's due events. */
  async sendDue(tenantId: string) {
    if (await this.paused()) return;
    const s = await this.read(tenantId);
    const token = s.token ? decrypt(s.token) : null;
    if (!s.pixelId || !token) return;
    const due = await this.prisma.metaCapiEvent.findMany({
      where: { tenantId, status: 'PENDING', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    for (let i = 0; i < due.length; i += BATCH) {
      const part = due.slice(i, i + BATCH);
      const built = await this.build(tenantId, part, s);
      for (const sk of built.skipped) {
        await this.prisma.metaCapiEvent.update({ where: { id: sk.id }, data: { status: 'SKIPPED', lastError: sk.reason, nextAttemptAt: null } });
      }
      if (!built.events.length) continue;
      const res = await this.post(s.pixelId, token, built.events.map((e) => e.payload), s.testCode);
      const ids = built.events.map((e) => e.id);
      if (res.dryRun) {
        await this.prisma.metaCapiEvent.updateMany({ where: { id: { in: ids } }, data: { status: 'SKIPPED', lastError: 'Test mode: bheja nahi gaya', nextAttemptAt: null } });
      } else if (res.ok) {
        await this.prisma.metaCapiEvent.updateMany({
          where: { id: { in: ids } },
          data: { status: 'SENT', sentAt: new Date(), lastError: null, nextAttemptAt: null, attempts: { increment: 1 }, testCode: s.testCode, response: res.body as Prisma.InputJsonValue },
        });
      } else {
        for (const e of built.events) {
          const attempts = e.attempts + 1;
          const final = res.permanent || attempts >= MAX_ATTEMPTS;
          await this.prisma.metaCapiEvent.update({
            where: { id: e.id },
            data: {
              attempts, lastError: res.error, status: final ? 'FAILED' : 'PENDING',
              nextAttemptAt: final ? null : new Date(Date.now() + retryDelayMs(attempts)),
              response: (res.body ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            },
          });
        }
      }
    }
  }

  /** Builds payloads from the current order / checkout data. */
  private async build(tenantId: string, rows: Array<{ id: string; orderId: string | null; checkoutId: string | null; eventName: string; attempts: number }>, s: CapiSettings) {
    const orderIds = rows.map((r) => r.orderId).filter(Boolean) as string[];
    const cartIds = rows.map((r) => r.checkoutId).filter(Boolean) as string[];
    const [orders, carts] = await Promise.all([
      orderIds.length ? this.prisma.channelOrder.findMany({
        where: { tenantId, id: { in: orderIds } },
        select: {
          id: true, externalOrderNumber: true, externalOrderId: true, orderStatus: true, deliveredAt: true, receivedAt: true, total: true, items: true,
          customerName: true, customerPhone: true, customerEmail: true, customerCity: true, landingPage: true, metadata: true, nafaaSaleId: true,
          integration: { select: { type: true } },
        },
      }) : [],
      cartIds.length ? this.prisma.abandonedCheckout.findMany({ where: { tenantId, id: { in: cartIds } } }) : [],
    ]);
    const saleIds = orders.map((o) => o.nafaaSaleId).filter(Boolean) as string[];
    const sales = saleIds.length ? await this.prisma.sale.findMany({ where: { id: { in: saleIds } }, select: { id: true, total: true, refundedAmount: true, status: true } }) : [];
    const S = new Map(sales.map((x) => [x.id, x]));
    const O = new Map(orders.map((o) => [o.id, o]));
    const C = new Map(carts.map((c) => [c.id, c]));
    const events: Array<{ id: string; attempts: number; payload: unknown }> = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const tooOld = (d: Date | null | undefined) => !d || Date.now() - d.getTime() > MAX_EVENT_AGE_MS;

    for (const r of rows) {
      if (r.orderId) {
        const o = O.get(r.orderId);
        if (!o) { skipped.push({ id: r.id, reason: 'Order nahi mila' }); continue; }
        if (o.orderStatus !== 'DELIVERED') { skipped.push({ id: r.id, reason: 'Order ab delivered nahi (return ya cancel)' }); continue; }
        if (tooOld(o.deliveredAt)) { skipped.push({ id: r.id, reason: 'Delivery 7 din se purani — Meta nahi leta' }); continue; }
        const sale = o.nafaaSaleId ? S.get(o.nafaaSaleId) : null;
        const value = sale && String(sale.status) !== 'VOIDED' ? Number(sale.total) - Number(sale.refundedAmount ?? 0) : Number(o.total) || 0;
        const meta = (o.metadata ?? {}) as Record<string, any>;
        const items: CapiItem[] = (Array.isArray(o.items) ? (o.items as any[]) : []).map((it) => ({
          id: it.productId ? (it.variantId ? `${it.productId}_${it.variantId}` : String(it.productId)) : String(it.sku || it.externalVariantId || it.externalProductId || it.name || 'item').slice(0, 100),
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
        }));
        events.push({
          id: r.id, attempts: r.attempts,
          payload: purchaseEvent({
            orderId: o.id, orderNumber: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, ''), eventName: s.eventName,
            deliveredAt: o.deliveredAt!, value: Math.max(0, value), items,
            customer: {
              phone: o.customerPhone, email: o.customerEmail, name: o.customerName, city: o.customerCity, country: 'pk',
              externalId: phoneKey(o.customerPhone), fbclid: meta.attribution?.clickIds?.fbclid ?? null, clickAt: o.receivedAt,
            },
            actionSource: actionSourceOf(o.integration.type, meta.source), sourceUrl: o.landingPage,
          }),
        });
      } else if (r.checkoutId) {
        const c = C.get(r.checkoutId);
        if (!c) { skipped.push({ id: r.id, reason: 'Checkout nahi mila' }); continue; }
        if (c.recoveredOrderId || c.completedAt) { skipped.push({ id: r.id, reason: 'Checkout order ban gaya' }); continue; }
        if (tooOld(c.abandonedAt)) { skipped.push({ id: r.id, reason: '7 din se purana — Meta nahi leta' }); continue; }
        const items: CapiItem[] = (Array.isArray(c.items) ? (c.items as any[]) : []).map((it) => ({
          id: String(it.productId ?? it.sku ?? it.variantId ?? it.name ?? 'item').slice(0, 100), quantity: Number(it.quantity) || 1, price: Number(it.price) || 0,
        }));
        events.push({
          id: r.id, attempts: r.attempts,
          payload: checkoutEvent({
            checkoutId: c.id, at: c.abandonedAt, value: c.total, currency: c.currency ?? 'PKR', items,
            customer: { phone: c.customerPhone, email: c.customerEmail, name: c.customerName, city: c.customerCity, country: 'pk', externalId: c.phoneKey },
          }),
        });
      } else {
        skipped.push({ id: r.id, reason: 'Event ka order nahi' });
      }
    }
    return { events, skipped };
  }

  /** One POST to the Graph API. Never throws. */
  private async post(pixelId: string, token: string, events: unknown[], testCode: string | null): Promise<{ ok: boolean; body?: unknown; error: string | null; permanent?: boolean; dryRun?: boolean }> {
    if (dryRun()) return { ok: false, error: null, dryRun: true };
    const req = capiRequest(pixelId, token, events, testCode);
    try {
      const res = await fetch(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body), signal: AbortSignal.timeout(20_000) });
      const body: any = await res.json().catch(() => null);
      if (res.ok) return { ok: true, body: { events_received: body?.events_received ?? null, fbtrace_id: body?.fbtrace_id ?? null }, error: null };
      const msg = String(body?.error?.error_user_msg ?? body?.error?.message ?? `HTTP ${res.status}`).slice(0, 300);
      return { ok: false, body: { error: { code: body?.error?.code ?? null, type: body?.error?.type ?? null } }, error: msg, permanent: isPermanentError(res.status, body) };
    } catch (e) {
      return { ok: false, error: `Meta tak nahi pohncha: ${(e as Error)?.message ?? 'network'}`.slice(0, 300) };
    }
  }
}
