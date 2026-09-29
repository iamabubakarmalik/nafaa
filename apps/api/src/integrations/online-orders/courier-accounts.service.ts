import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CourierConfig, CourierProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteSetupService } from './website-setup.service';
import { COURIERS, courierName } from './couriers';
import { COURIER_APIS, courierApi } from './courier-api/registry';
import { cityKey } from './courier-api/http';
import { isDispatched, isFinal } from './courier-api/status';
import { CourierApiError, CourierCity, CourierCreds, CourierSettings, TrackResult } from './courier-api/types';

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
const CITY_TTL_MS = 12 * 3600_000;
/** Deliver ke baad itne din tak COD settlement dekhte rahenge */
const SETTLEMENT_WINDOW_DAYS = 45;

/**
 * Courier accounts — "ek click" connect (key paste → Nafaa khud check karta
 * hai) aur us ke baad: order se booking, label, tracking aur RTO/deliver
 * khud-ba-khud. Keys AES-256-GCM se encrypted (courier_configs).
 */
@Injectable()
export class CourierAccountsService {
  private readonly logger = new Logger(CourierAccountsService.name);
  private readonly cityCache = new Map<string, { at: number; list: CourierCity[] }>();
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly setup: WebsiteSetupService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // ACCOUNTS
  // ═══════════════════════════════════════════════════════════

  async list(user: AuthenticatedUser) {
    const configs = await this.prisma.courierConfig.findMany({ where: { tenantId: user.tenantId } });
    const since = new Date(Date.now() - 30 * 86_400_000);
    const counts = await this.prisma.channelOrder.groupBy({
      by: ['courierCode'],
      where: { tenantId: user.tenantId, courierBookedAt: { gte: since } },
      _count: { _all: true },
    });
    return COURIERS.filter((c) => c.code !== 'OTHER').map((c) => {
      const api = COURIER_APIS[c.code];
      const cfg = configs.find((x) => x.provider === c.code);
      return {
        code: c.code,
        name: c.name,
        site: c.site,
        mode: api ? 'api' : 'manual',
        connected: !!(api && cfg),
        active: !!cfg?.isActive,
        maskedKey: cfg ? mask(decrypt(cfg.apiKey)) : null,
        lastTestedAt: cfg?.lastTestedAt ?? null,
        lastSyncAt: cfg?.lastSyncAt ?? null,
        lastError: cfg?.lastError ?? null,
        settings: cfg ? readSettings(cfg) : null,
        booked30: counts.find((x) => x.courierCode === c.code)?._count._all ?? 0,
        connect: api ? { fields: api.fields, portalUrl: api.portalUrl, steps: api.steps, labelKind: api.labelKind, autoSettlement: api.autoSettlement } : null,
      };
    });
  }

  /** Key paste → courier se check → save (encrypted). Ghalat key save hi nahi hoti. */
  async connect(user: AuthenticatedUser, code: string, body: { apiKey?: string; apiSecret?: string; settings?: CourierSettings }) {
    this.setup.assertCanManage(user);
    const api = this.apiOrThrow(code);
    const creds: CourierCreds = { apiKey: String(body?.apiKey ?? '').trim(), apiSecret: body?.apiSecret?.trim() || null };
    if (!creds.apiKey) throw new BadRequestException('API key daalein');
    if (api.fields.some((f) => f.key === 'apiSecret') && !creds.apiSecret) throw new BadRequestException('API password bhi daalein');

    const test = await this.wrap(() => api.adapter.test(creds));
    const settings: CourierSettings = { ...cleanSettings(body?.settings) };
    // PostEx: ek hi pickup address ho to khud chun lo
    if (!settings.pickupAddressCode && test.pickupAddresses?.length === 1) settings.pickupAddressCode = test.pickupAddresses[0].code;

    const provider = code as CourierProvider;
    await this.prisma.courierConfig.upsert({
      where: { tenantId_provider: { tenantId: user.tenantId, provider } },
      create: {
        tenantId: user.tenantId, provider, apiKey: encrypt(creds.apiKey)!, apiSecret: encrypt(creds.apiSecret),
        isActive: true, settings: settings as any, lastTestedAt: new Date(), lastError: null,
      },
      update: {
        apiKey: encrypt(creds.apiKey)!, apiSecret: encrypt(creds.apiSecret), isActive: true,
        settings: settings as any, lastTestedAt: new Date(), lastError: null,
      },
    });
    this.cityCache.delete(`${user.tenantId}:${code}`);
    return { ok: true, cities: test.cities, pickupAddresses: test.pickupAddresses ?? [], settings };
  }

  async test(user: AuthenticatedUser, code: string) {
    const { cfg, creds, api } = await this.account(user.tenantId, code);
    try {
      const r = await api.adapter.test(creds);
      await this.prisma.courierConfig.update({ where: { id: cfg.id }, data: { lastTestedAt: new Date(), lastError: null } });
      return { ok: true, cities: r.cities, pickupAddresses: r.pickupAddresses ?? [] };
    } catch (e) {
      await this.prisma.courierConfig.update({ where: { id: cfg.id }, data: { lastError: msg(e) } });
      throw toHttp(e);
    }
  }

  async updateSettings(user: AuthenticatedUser, code: string, body: { settings?: CourierSettings; active?: boolean }) {
    this.setup.assertCanManage(user);
    const { cfg } = await this.account(user.tenantId, code, { includeInactive: true });
    const settings = { ...readSettings(cfg), ...cleanSettings(body?.settings) };
    await this.prisma.courierConfig.update({
      where: { id: cfg.id },
      data: { settings: settings as any, ...(typeof body?.active === 'boolean' ? { isActive: body.active } : {}) },
    });
    return { ok: true, settings };
  }

  async disconnect(user: AuthenticatedUser, code: string) {
    this.setup.assertCanManage(user);
    await this.prisma.courierConfig.deleteMany({ where: { tenantId: user.tenantId, provider: code as CourierProvider } });
    this.cityCache.delete(`${user.tenantId}:${code}`);
    return { ok: true };
  }

  /** Booking form ke liye: shehar list + pickup addresses */
  async options(user: AuthenticatedUser, code: string) {
    const { creds, api } = await this.account(user.tenantId, code);
    const [cities, pickupAddresses] = await Promise.all([
      this.cities(user.tenantId, code, creds),
      api.adapter.pickupAddresses ? this.wrap(() => api.adapter.pickupAddresses!(creds)).catch(() => []) : Promise.resolve([]),
    ]);
    return { cities, pickupAddresses };
  }

  // ═══════════════════════════════════════════════════════════
  // BOOKING
  // ═══════════════════════════════════════════════════════════

  /** Order ke liye courier par booking — CN, label, sab khud */
  async book(
    user: AuthenticatedUser,
    scope: ShopScope,
    orderId: string,
    body: { courier: string; cityId?: string; weightKg?: number; pieces?: number; codAmount?: number; notes?: string },
  ) {
    const code = String(body?.courier ?? '').toUpperCase();
    const { cfg, creds, api } = await this.account(user.tenantId, code);
    const order = await this.prisma.channelOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId, ...(scope.whereLoose as any) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!order.nafaaSaleId) throw new BadRequestException('Pehle order accept karein — phir courier book hoga');
    if (CLOSED.includes(order.orderStatus) || order.orderStatus === 'DELIVERED') throw new BadRequestException('Band ya deliver ho chuke order ki booking nahi hoti');
    if (order.courierBookedAt && order.trackingNumber && order.courierStatus !== 'CANCELLED') {
      throw new ConflictException(`Ye order pehle hi ${courierName(order.courierCode)} par book hai (CN ${order.trackingNumber})`);
    }

    // Do log ek saath "book" dabayein to do CN na banein — pehle claim
    const claim = await this.prisma.channelOrder.updateMany({
      where: {
        id: order.id,
        OR: [
          { courierBookedAt: null },
          { courierStatus: 'CANCELLED' },
          // Pichli booking beech me atak gayi (server restart) — 2 minute baad dobara
          { courierStatus: 'BOOKING', courierStatusAt: { lt: new Date(Date.now() - 2 * 60_000) } },
        ],
      },
      data: { courierBookedAt: new Date(), courierStatus: 'BOOKING', courierStatusAt: new Date() },
    });
    if (!claim.count) throw new ConflictException('Booking ho rahi hai — ek second ruk kar refresh karein');

    try {
      const settings = readSettings(cfg);
      const cities = await this.cities(user.tenantId, code, creds);
      const city = body?.cityId
        ? cities.find((c) => c.id === body.cityId)
        : matchCity(cities, order.customerCity);
      if (!city) {
        throw new BadRequestException(order.customerCity
          ? `"${order.customerCity}" ${courierName(code)} ki shehar list me nahi mila — list se shehar chunein`
          : 'Customer ka shehar likha nahi — list se chunein');
      }
      const items = (Array.isArray(order.items) ? order.items : []) as any[];
      const pieces = Math.max(1, Math.round(body?.pieces ?? items.reduce((s, i) => s + (Number(i?.quantity) || 0), 0)));
      const cod = body?.codAmount !== undefined ? Number(body.codAmount) : order.paymentStatus === 'PAID' ? 0 : Number(order.total);
      if (!Number.isFinite(cod) || cod < 0) throw new BadRequestException('COD raqam sahi nahi');
      const weightKg = Number(body?.weightKg ?? settings.defaultWeightKg ?? 0.5);
      if (!(weightKg > 0 && weightKg <= 100)) throw new BadRequestException('Wazan 0.01 se 100 kg ke beech');
      if (!order.customerPhone) throw new BadRequestException('Customer ka phone nahi — booking ke liye zaroori hai');
      if (!order.customerAddress) throw new BadRequestException('Customer ka address nahi — booking ke liye zaroori hai');

      const ref = String(order.externalOrderNumber ?? order.externalOrderId).replace(/^#+/, '');
      const result = await this.wrap(() => api.adapter.book(creds, settings, {
        orderRef: ref,
        customerName: order.customerName || 'Customer',
        customerPhone: order.customerPhone!,
        customerEmail: order.customerEmail,
        address: order.customerAddress!,
        city,
        codAmount: cod,
        pieces,
        weightKg,
        description: items.map((i) => `${i?.name ?? 'Item'}${i?.variant ? ` (${i.variant})` : ''} x${i?.quantity ?? 1}`).join(', ').slice(0, 250) || `Order ${ref}`,
        notes: body?.notes?.trim() || settings.bookingNote || null,
      }));

      const updated = await this.prisma.channelOrder.update({
        where: { id: order.id },
        data: {
          courierCode: code,
          courierName: courierName(code),
          trackingNumber: result.trackingNumber,
          courierBookedAt: new Date(),
          courierLabelUrl: result.labelUrl ?? null,
          courierStatus: 'BOOKED',
          courierStatusAt: new Date(),
          metadata: { ...((order.metadata as any) ?? {}), courierBooking: { by: user.id, cod, weightKg, pieces, city: city.name, at: new Date().toISOString() } },
        },
      });
      return { ok: true, trackingNumber: result.trackingNumber, labelKind: api.labelKind, order: { id: updated.id, trackingNumber: updated.trackingNumber, courierCode: updated.courierCode } };
    } catch (e) {
      // Claim wapas — dobara book ho sake
      await this.prisma.channelOrder.update({
        where: { id: order.id },
        data: { courierBookedAt: order.courierBookedAt, courierStatus: order.courierStatus, courierStatusAt: order.courierStatusAt },
      }).catch(() => null);
      throw toHttp(e);
    }
  }

  /** Booking cancel — sirf jab tak courier ne parcel nahi uthaya */
  async cancelBooking(user: AuthenticatedUser, scope: ShopScope, orderId: string) {
    const order = await this.bookedOrder(user, scope, orderId);
    if (order.courierStatus && order.courierStatus !== 'BOOKED') {
      throw new BadRequestException('Courier parcel utha chuka — ab booking cancel nahi hoti. Courier se baat karein ya RTO karein');
    }
    const { creds, api } = await this.account(user.tenantId, order.courierCode!);
    await this.wrap(() => api.adapter.cancel(creds, order.trackingNumber!));
    await this.prisma.channelOrder.update({
      where: { id: order.id },
      data: { trackingNumber: null, courierBookedAt: null, courierLabelUrl: null, courierStatus: 'CANCELLED', courierStatusAt: new Date() },
    });
    return { ok: true };
  }

  async label(user: AuthenticatedUser, scope: ShopScope, orderId: string) {
    const order = await this.bookedOrder(user, scope, orderId);
    const { creds, api } = await this.account(user.tenantId, order.courierCode!);
    return this.wrap(() => api.adapter.label(creds, order.trackingNumber!, order.courierLabelUrl));
  }

  /** Abhi courier se status lo (order detail ka "Refresh") */
  async refresh(user: AuthenticatedUser, scope: ShopScope, orderId: string) {
    const order = await this.bookedOrder(user, scope, orderId);
    const { cfg, creds, api } = await this.account(user.tenantId, order.courierCode!);
    const [r] = await this.wrap(() => api.adapter.track(creds, [order.trackingNumber!]));
    if (!r) return { ok: true, status: order.courierStatus, label: null, history: [] };
    await this.applyTracking(cfg, order, r);
    return { ok: true, status: r.state, label: r.label, history: r.history };
  }

  // ═══════════════════════════════════════════════════════════
  // SYNC — har 30 minute: courier ka status → order
  // ═══════════════════════════════════════════════════════════

  @Cron('0 10,40 * * * *')
  async syncAll() {
    if (this.running || process.env.DISABLE_COURIER_SYNC === '1') return;
    this.running = true;
    try {
      const configs = await this.prisma.courierConfig.findMany({ where: { isActive: true, provider: { in: Object.keys(COURIER_APIS) as CourierProvider[] } } });
      for (const cfg of configs) {
        await this.syncAccount(cfg).catch((e) => this.logger.warn(`Courier sync ${cfg.provider} ${cfg.tenantId}: ${msg(e)}`));
      }
    } finally {
      this.running = false;
    }
  }

  private async syncAccount(cfg: CourierConfig) {
    const api = COURIER_APIS[cfg.provider];
    if (!api) return;
    const creds = credsOf(cfg);
    const settleSince = new Date(Date.now() - SETTLEMENT_WINDOW_DAYS * 86_400_000);
    const orders = await this.prisma.channelOrder.findMany({
      where: {
        tenantId: cfg.tenantId,
        courierCode: cfg.provider,
        courierBookedAt: { not: null },
        trackingNumber: { not: null },
        OR: [
          { orderStatus: { notIn: [...CLOSED, 'DELIVERED'] } },
          // Deliver ho gaya, paisa courier ke paas — settlement dekhte raho
          ...(api.autoSettlement ? [{ orderStatus: 'DELIVERED', paymentStatus: 'COLLECTED', deliveredAt: { gte: settleSince } }] : []),
        ],
      },
      orderBy: { courierStatusAt: 'asc' },
      take: 300,
    });
    if (!orders.length) return;

    let results: TrackResult[] = [];
    try {
      results = await api.adapter.track(creds, orders.filter((o) => o.orderStatus !== 'DELIVERED').map((o) => o.trackingNumber!));
    } catch (e) {
      if (e instanceof CourierApiError && e.auth) {
        await this.prisma.courierConfig.update({ where: { id: cfg.id }, data: { lastError: e.message } });
        return;
      }
      throw e;
    }
    for (const r of results) {
      const order = orders.find((o) => o.trackingNumber === r.trackingNumber);
      if (order) await this.applyTracking(cfg, order, r).catch((e) => this.logger.warn(`Courier apply ${r.trackingNumber}: ${msg(e)}`));
    }

    // COD settlement (PostEx batata hai) → paisa mil gaya
    if (api.autoSettlement && api.adapter.paymentSettled) {
      for (const o of orders.filter((x) => x.orderStatus === 'DELIVERED' && x.paymentStatus === 'COLLECTED').slice(0, 100)) {
        const p = await api.adapter.paymentSettled(creds, o.trackingNumber!).catch(() => null);
        if (!p?.settled) continue;
        await this.prisma.channelOrder.updateMany({
          where: { id: o.id, paymentStatus: 'COLLECTED' },
          data: { paymentStatus: 'PAID', paymentReceivedAt: new Date(), codSettledAt: new Date(), codSettlementRef: p.reference ? `${courierName(cfg.provider)} ${p.reference}`.slice(0, 120) : `${courierName(cfg.provider)} (auto)` },
        });
      }
    }
    await this.prisma.courierConfig.update({ where: { id: cfg.id }, data: { lastSyncAt: new Date(), lastError: null } });
  }

  /** Courier ka status order par lagao: utha → raste me, deliver, RTO */
  private async applyTracking(cfg: CourierConfig, order: { id: string; orderStatus: string; courierStatus: string | null; tenantId: string }, r: TrackResult) {
    await this.prisma.channelOrder.update({
      where: { id: order.id },
      data: {
        courierStatus: r.state,
        courierStatusAt: new Date(),
        metadata: await this.withCourierTrail(order.id, r),
      },
    });
    if (CLOSED.includes(order.orderStatus)) return;
    const actor = await this.orders.systemActor(cfg.tenantId);
    const all = new ShopScope(null, true);
    const reason = `${courierName(cfg.provider)}: ${r.label}`;

    if (r.state === 'RETURNED') {
      await this.orders.markReturned(actor, all, order.id, reason);
      return;
    }
    if (r.state === 'DELIVERED' && order.orderStatus !== 'DELIVERED') {
      await this.orders.updateStatus(actor, all, order.id, { status: 'DELIVERED' });
      return;
    }
    if (isDispatched(r.state) && ['CONFIRMED', 'PREPARING', 'READY'].includes(order.orderStatus)) {
      await this.orders.updateStatus(actor, all, order.id, { status: 'OUT_FOR_DELIVERY' });
    }
  }

  private async withCourierTrail(orderId: string, r: TrackResult) {
    const row = await this.prisma.channelOrder.findUnique({ where: { id: orderId }, select: { metadata: true } });
    return { ...((row?.metadata as any) ?? {}), courierTrail: { label: r.label, state: r.state, history: r.history, at: new Date().toISOString() } } as Prisma.InputJsonValue;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private apiOrThrow(code: string) {
    const api = courierApi(code);
    if (!api) throw new BadRequestException(`${courierName(code) ?? code} ka API connect abhi nahi — CN khud likh kar "Rider/courier ko de diya" karein`);
    return api;
  }

  private async account(tenantId: string, code: string, opts: { includeInactive?: boolean } = {}) {
    const api = this.apiOrThrow(code);
    const cfg = await this.prisma.courierConfig.findUnique({ where: { tenantId_provider: { tenantId, provider: code.toUpperCase() as CourierProvider } } });
    if (!cfg || (!opts.includeInactive && !cfg.isActive)) throw new BadRequestException(`${courierName(code)} jura nahi — Settings → Couriers se connect karein`);
    return { cfg, creds: credsOf(cfg), api };
  }

  private async bookedOrder(user: AuthenticatedUser, scope: ShopScope, orderId: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId, ...(scope.whereLoose as any) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!order.courierBookedAt || !order.trackingNumber || !courierApi(order.courierCode)) throw new BadRequestException('Ye order kisi courier par Nafaa se book nahi hua');
    return order;
  }

  private async cities(tenantId: string, code: string, creds: CourierCreds) {
    const key = `${tenantId}:${code}`;
    const hit = this.cityCache.get(key);
    if (hit && Date.now() - hit.at < CITY_TTL_MS) return hit.list;
    const list = await this.wrap(() => courierApi(code)!.adapter.cities(creds));
    list.sort((a, b) => a.name.localeCompare(b.name));
    this.cityCache.set(key, { at: Date.now(), list });
    return list;
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      throw toHttp(e);
    }
  }
}

// ─── chhote helpers ──────────────────────────────────────────

function credsOf(cfg: CourierConfig): CourierCreds {
  return { apiKey: decrypt(cfg.apiKey) ?? '', apiSecret: decrypt(cfg.apiSecret) };
}

function readSettings(cfg: CourierConfig): CourierSettings {
  return { ...((cfg.settings as any) ?? {}) };
}

function cleanSettings(s?: CourierSettings | null): CourierSettings {
  if (!s || typeof s !== 'object') return {};
  const out: CourierSettings = {};
  if (s.pickupAddressCode !== undefined) out.pickupAddressCode = s.pickupAddressCode ? String(s.pickupAddressCode).slice(0, 60) : null;
  if (s.originCityId !== undefined) out.originCityId = s.originCityId ? String(s.originCityId).slice(0, 20) : null;
  if (s.defaultWeightKg !== undefined) {
    const w = Number(s.defaultWeightKg);
    out.defaultWeightKg = w > 0 && w <= 100 ? w : null;
  }
  if (s.bookingNote !== undefined) out.bookingNote = s.bookingNote ? String(s.bookingNote).slice(0, 200) : null;
  return out;
}

/** "Lahore" / "lahore " / "LHR" → courier list ka "Lahore" */
export function matchCity(list: CourierCity[], name?: string | null): CourierCity | undefined {
  const k = cityKey(name);
  if (!k) return undefined;
  return list.find((c) => cityKey(c.name) === k) ?? list.find((c) => cityKey(c.name).startsWith(k) && k.length >= 4);
}

const mask = (k?: string | null) => (k ? `${'•'.repeat(6)}${k.slice(-4)}` : null);
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

function toHttp(e: unknown) {
  if (e instanceof CourierApiError) return new BadRequestException(e.message);
  return e;
}
