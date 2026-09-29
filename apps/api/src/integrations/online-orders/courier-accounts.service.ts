import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CourierConfig, CourierProvider, CourierShipmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteSetupService } from './website-setup.service';
import { OrderAccepted, orderEvents } from './order-events';
import { COURIERS, courierName } from './couriers';
import { COURIER_APIS, SettingField, courierApi } from './courier-api/registry';
import { cityKey } from './courier-api/http';
import { isDispatched, isFinal, normalizeCourierStatus } from './courier-api/status';
import { CourierApiError, CourierCity, CourierCreds, CourierSettings, CourierState, PortalShipment, TrackResult } from './courier-api/types';

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
export class CourierAccountsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CourierAccountsService.name);
  private readonly cityCache = new Map<string, { at: number; list: CourierCity[] }>();
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly setup: WebsiteSetupService,
  ) {}

  private readonly onAccepted = (e: OrderAccepted) => {
    this.autoBook(e).catch((err) => this.logger.warn(`Auto-book ${e.orderId}: ${msg(err)}`));
  };

  onModuleInit() {
    orderEvents.on('accepted', this.onAccepted);
  }

  onModuleDestroy() {
    orderEvents.off('accepted', this.onAccepted);
  }

  /**
   * Accept hote hi courier par khud booking — sirf jab kisi jure courier ki
   * setting "autoBook" chalu ho. Fail ho to order par wajah likh do (order
   * waise hi accept rehta hai, dukandar khud book kar le).
   */
  private async autoBook(e: OrderAccepted) {
    const configs = await this.prisma.courierConfig.findMany({ where: { tenantId: e.tenantId, isActive: true } });
    const cfg = configs.find((c) => COURIER_APIS[c.provider] && String((c.settings as any)?.autoBook) === 'true');
    if (!cfg) return;
    const actor = await this.orders.systemActor(e.tenantId);
    try {
      const r = await this.book(actor, new ShopScope(null, true), e.orderId, { courier: cfg.provider });
      this.logger.log(`⚡ Auto-book ${cfg.provider}: ${r.trackingNumber}`);
    } catch (err: any) {
      const reason = String(err?.response?.message ?? err?.message ?? 'Auto-book nahi hua').slice(0, 300);
      const row = await this.prisma.channelOrder.findUnique({ where: { id: e.orderId }, select: { metadata: true } });
      await this.prisma.channelOrder.update({
        where: { id: e.orderId },
        data: { metadata: { ...((row?.metadata as any) ?? {}), autoBookError: `${courierName(cfg.provider)}: ${reason}` } },
      }).catch(() => null);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ACCOUNTS
  // ═══════════════════════════════════════════════════════════

  async list(user: AuthenticatedUser) {
    const configs = await this.prisma.courierConfig.findMany({ where: { tenantId: user.tenantId } });
    const stats = await this.statsByCourier(user.tenantId);
    return COURIERS.filter((c) => c.code !== 'OTHER').map((c) => {
      const api = COURIER_APIS[c.code];
      const cfg = configs.find((x) => x.provider === c.code);
      return {
        code: c.code,
        name: c.name,
        site: c.site,
        mode: api ? 'api' : 'manual',
        color: api?.color ?? '#64748b',
        connected: !!(api && cfg),
        active: !!cfg?.isActive,
        maskedKey: cfg ? mask(decrypt(cfg.apiKey)) : null,
        connectedAt: cfg?.createdAt ?? null,
        lastTestedAt: cfg?.lastTestedAt ?? null,
        lastSyncAt: cfg?.lastSyncAt ?? null,
        lastError: cfg?.lastError ?? null,
        settings: cfg ? readSettings(cfg) : null,
        // Zaroori settings jo abhi khali hain — booking se pehle bharni hain
        missingSettings: cfg && api ? api.settings.filter((d) => d.required && !readSettings(cfg)[d.key]).map((d) => d.label) : [],
        stats: stats[c.code] ?? emptyStats(),
        booked30: stats[c.code]?.booked30 ?? 0,
        connect: api
          ? { credentials: api.credentials, settings: api.settings, portalUrl: api.portalUrl, steps: api.steps, labelKind: api.labelKind, features: api.features }
          : null,
      };
    });
  }

  /** Key paste → courier se check → save (encrypted). Ghalat key save hi nahi hoti. */
  async connect(user: AuthenticatedUser, code: string, body: { credentials?: Record<string, string>; apiKey?: string; apiSecret?: string; settings?: CourierSettings }) {
    this.setup.assertCanManage(user);
    const api = this.apiOrThrow(code);
    // Purana roop (apiKey/apiSecret seedhe) bhi chale
    const raw: Record<string, string> = { ...(body?.apiKey ? { apiKey: body.apiKey } : {}), ...(body?.apiSecret ? { apiSecret: body.apiSecret } : {}), ...(body?.credentials ?? {}) };
    const creds = { apiKey: '' } as CourierCreds;
    for (const f of api.credentials) {
      const v = String(raw[f.key] ?? '').trim();
      if (!v && !f.optional) throw new BadRequestException(`${f.label} daalein`);
      if (v) creds[f.key] = v.slice(0, 500);
    }

    const test = await this.wrap(() => api.adapter.test(creds));
    const settings: CourierSettings = { ...cleanSettings(api.settings, body?.settings) };
    // Ek hi pickup address ho to khud chun lo
    if (!settings.pickupAddressCode && test.pickupAddresses?.length === 1) settings.pickupAddressCode = test.pickupAddresses[0].code;

    const provider = code as CourierProvider;
    const stored = storeCreds(creds);
    await this.prisma.courierConfig.upsert({
      where: { tenantId_provider: { tenantId: user.tenantId, provider } },
      create: { tenantId: user.tenantId, provider, ...stored, isActive: true, settings: settings as any, lastTestedAt: new Date(), lastError: null },
      update: { ...stored, isActive: true, settings: settings as any, lastTestedAt: new Date(), lastError: null },
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
    const settings = { ...readSettings(cfg), ...cleanSettings(courierApi(code)!.settings, body?.settings) };
    // Auto-book sirf ek courier par — do CN na banein
    if (String(settings.autoBook) === 'true') {
      const others = await this.prisma.courierConfig.findMany({ where: { tenantId: user.tenantId, id: { not: cfg.id } } });
      for (const o of others.filter((x) => String((x.settings as any)?.autoBook) === 'true')) {
        await this.prisma.courierConfig.update({ where: { id: o.id }, data: { settings: { ...((o.settings as any) ?? {}), autoBook: null } } });
      }
    }
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

  /** Booking form / settings ke liye: shehar, pickup addresses, services */
  async options(user: AuthenticatedUser, code: string) {
    const { cfg, creds, api } = await this.account(user.tenantId, code);
    const [cities, pickupAddresses, services] = await Promise.all([
      this.cities(user.tenantId, code, creds),
      api.adapter.pickupAddresses ? this.wrap(() => api.adapter.pickupAddresses!(creds, readSettings(cfg))).catch(() => []) : Promise.resolve([]),
      api.adapter.services ? this.wrap(() => api.adapter.services!(creds)).catch(() => []) : Promise.resolve([]),
    ]);
    return { cities, pickupAddresses, services };
  }

  /** Courier ke sab parcels — status filter ke saath (courier ka apna safha) */
  async shipments(
    user: AuthenticatedUser,
    scope: ShopScope,
    code: string,
    q: { filter?: string; search?: string; limit?: number; offset?: number },
  ) {
    const f = q.filter ?? 'active';
    // "to-book": accept ho chuke, abhi kisi courier ko nahi diye — bulk booking ke liye
    const where: Prisma.ChannelOrderWhereInput = f === 'to-book'
      ? {
          tenantId: user.tenantId,
          ...(scope.whereLoose as any),
          nafaaSaleId: { not: null },
          orderStatus: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
          dispatchedAt: null,
          OR: [{ courierBookedAt: null }, { courierStatus: 'CANCELLED' }],
        }
      : {
          tenantId: user.tenantId,
          ...(scope.whereLoose as any),
          courierCode: code,
          OR: [{ courierBookedAt: { not: null } }, { trackingNumber: { not: null } }],
        };
    const and: Prisma.ChannelOrderWhereInput[] = [];
    if (f === 'active') and.push({ orderStatus: { notIn: [...CLOSED, 'DELIVERED'] } });
    if (f === 'booked') and.push({ courierStatus: 'BOOKED' });
    if (f === 'attempted') and.push({ courierStatus: 'ATTEMPTED' });
    if (f === 'returning') and.push({ courierStatus: 'RETURNING' });
    if (f === 'delivered') and.push({ orderStatus: 'DELIVERED' });
    if (f === 'cod') and.push({ orderStatus: 'DELIVERED', paymentStatus: 'COLLECTED' });
    if (f === 'returned') and.push({ orderStatus: 'RETURNED' });
    const term = q.search?.trim();
    if (term) {
      and.push({ OR: [
        { trackingNumber: { contains: term, mode: 'insensitive' } },
        { externalOrderNumber: { contains: term.replace(/^#/, ''), mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term } },
        { customerCity: { contains: term, mode: 'insensitive' } },
      ] });
    }
    if (and.length) where.AND = and;
    const take = Math.min(Math.max(q.limit ?? 50, 1), 200);
    const [rows, total] = await Promise.all([
      this.prisma.channelOrder.findMany({
        where,
        orderBy: f === 'to-book' ? [{ acceptedAt: 'asc' }] : [{ courierBookedAt: 'desc' }, { dispatchedAt: 'desc' }],
        take,
        skip: Math.max(q.offset ?? 0, 0),
        select: {
          id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerPhone: true, customerCity: true,
          total: true, orderStatus: true, paymentStatus: true, trackingNumber: true, courierStatus: true, courierStatusAt: true,
          courierBookedAt: true, dispatchedAt: true, deliveredAt: true, returnedAt: true, codSettledAt: true, metadata: true,
          customerAddress: true, acceptedAt: true, items: true,
        },
      }),
      this.prisma.channelOrder.count({ where }),
    ]);
    return {
      total,
      rows: rows.map(({ metadata, items, ...r }) => ({
        pieces: (Array.isArray(items) ? (items as any[]) : []).reduce((n, i) => n + (Number(i?.quantity) || 0), 0),
        ...r,
        externalOrderNumber: r.externalOrderNumber ? String(r.externalOrderNumber).replace(/^#+/, '') : r.externalOrderNumber,
        total: Number(r.total),
        courierLabel: (metadata as any)?.courierTrail?.label ?? null,
        viaApi: !!r.courierBookedAt,
      })),
    };
  }

  /** Kai orders ek saath book — har order ka alag natija (ek fail ho to baqi chalte rahen) */
  async bulkBook(user: AuthenticatedUser, scope: ShopScope, code: string, body: { orderIds?: string[]; weightKg?: number; serviceType?: string }) {
    const ids = [...new Set(body?.orderIds ?? [])].slice(0, 100);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    await this.account(user.tenantId, code);
    const results: { orderId: string; ok: boolean; trackingNumber?: string; error?: string }[] = [];
    for (const id of ids) {
      try {
        const r = await this.book(user, scope, id, { courier: code, weightKg: body.weightKg, serviceType: body.serviceType });
        results.push({ orderId: id, ok: true, trackingNumber: r.trackingNumber });
      } catch (e: any) {
        results.push({ orderId: id, ok: false, error: e?.response?.message ?? msg(e) });
      }
    }
    return { booked: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  /** "Abhi sync karo" — 30 minute ka intezar nahi */
  async syncNow(user: AuthenticatedUser, code: string) {
    const { cfg } = await this.account(user.tenantId, code);
    await this.syncAccount(cfg).catch((e) => { throw toHttp(e); });
    const fresh = await this.prisma.courierConfig.findUnique({ where: { id: cfg.id } });
    return { ok: true, lastSyncAt: fresh?.lastSyncAt ?? null, lastError: fresh?.lastError ?? null };
  }

  /** Har courier ka hisaab: raste me, deliver, RTO %, courier ke paas paisa */
  private async statsByCourier(tenantId: string) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId,
        courierCode: { not: null },
        OR: [{ dispatchedAt: { gte: since } }, { courierBookedAt: { gte: since } }, { orderStatus: { notIn: [...CLOSED, 'DELIVERED'] }, trackingNumber: { not: null } }, { paymentStatus: 'COLLECTED' }],
      },
      select: { courierCode: true, orderStatus: true, paymentStatus: true, courierStatus: true, courierBookedAt: true, dispatchedAt: true, total: true },
    });
    const out: Record<string, ReturnType<typeof emptyStats>> = {};
    for (const r of rows) {
      const s = (out[r.courierCode!] ??= emptyStats());
      const recent = (r.dispatchedAt && r.dispatchedAt >= since) || (r.courierBookedAt && r.courierBookedAt >= since);
      if (r.courierBookedAt && r.courierBookedAt >= since) s.booked30++;
      if (!CLOSED.includes(r.orderStatus) && r.orderStatus !== 'DELIVERED') {
        s.active++;
        if (r.courierStatus === 'BOOKED') s.awaitingPickup++;
        if (r.courierStatus === 'ATTEMPTED') s.attempted++;
      }
      if (recent && r.dispatchedAt) s.dispatched30++;
      if (recent && r.orderStatus === 'DELIVERED') s.delivered30++;
      if (recent && r.orderStatus === 'RETURNED') s.returned30++;
      if (r.orderStatus === 'DELIVERED' && r.paymentStatus === 'COLLECTED') { s.codPending++; s.codPendingValue += Number(r.total); }
    }
    // Portal par seedha book hue (kisi Nafaa order se nahi jure) — double na gino
    const portal = await this.prisma.courierShipment.findMany({
      where: {
        tenantId,
        orderId: { startsWith: 'ext:' },
        OR: [{ bookedAt: { gte: since } }, { status: { in: ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ON_HOLD'] } }],
      },
      select: { provider: true, status: true, bookedAt: true },
    });
    for (const p of portal) {
      const s = (out[p.provider] ??= emptyStats());
      const recent = p.bookedAt >= since;
      if (recent) { s.booked30++; s.dispatched30++; }
      if (['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ON_HOLD'].includes(p.status)) {
        s.active++;
        if (p.status === 'CREATED') s.awaitingPickup++;
        if (p.status === 'ON_HOLD') s.attempted++;
      }
      if (recent && p.status === 'DELIVERED') s.delivered30++;
      if (recent && p.status === 'RETURNED') s.returned30++;
    }
    for (const s of Object.values(out)) s.rtoRate = s.dispatched30 ? Math.round((s.returned30 / s.dispatched30) * 100) : 0;
    return out;
  }

  // ═══════════════════════════════════════════════════════════
  // BOOKING
  // ═══════════════════════════════════════════════════════════

  /** Order ke liye courier par booking — CN, label, sab khud */
  async book(
    user: AuthenticatedUser,
    scope: ShopScope,
    orderId: string,
    body: { courier: string; cityId?: string; weightKg?: number; pieces?: number; codAmount?: number; notes?: string; serviceType?: string },
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
      if (body?.serviceType) settings.serviceType = String(body.serviceType).slice(0, 60);
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
          metadata: { ...((order.metadata as any) ?? {}), autoBookError: undefined, courierBooking: { by: user.id, cod, weightKg, pieces, city: city.name, at: new Date().toISOString() } },
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
    const { cfg, creds, api } = await this.account(user.tenantId, order.courierCode!);
    if (!api.features.cancel) throw new BadRequestException(`${courierName(order.courierCode)} ki booking API se cancel nahi hoti — courier portal se cancel karein`);
    await this.wrap(() => api.adapter.cancel(creds, order.trackingNumber!, readSettings(cfg)));
    await this.prisma.channelOrder.update({
      where: { id: order.id },
      data: { trackingNumber: null, courierBookedAt: null, courierLabelUrl: null, courierStatus: 'CANCELLED', courierStatusAt: new Date() },
    });
    return { ok: true };
  }

  async label(user: AuthenticatedUser, scope: ShopScope, orderId: string) {
    const order = await this.bookedOrder(user, scope, orderId);
    const { creds, api } = await this.account(user.tenantId, order.courierCode!);
    if (!api.features.label) throw new BadRequestException(`${courierName(order.courierCode)} ka label un ke portal se print karein — CN ${order.trackingNumber}`);
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
    // Portal par seedha book hue parcels bhi (Nafaa ke bahar) — aur Nafaa orders se jorna
    if (api.adapter.listShipments) {
      await this.importPortal(cfg, creds).catch((e) => {
        if (e instanceof CourierApiError && e.auth) throw e;
        this.logger.warn(`Portal import ${cfg.provider}: ${msg(e)}`);
      });
    }
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
          ...(api.features.settlement ? [{ orderStatus: 'DELIVERED', paymentStatus: 'COLLECTED', deliveredAt: { gte: settleSince } }] : []),
        ],
      },
      orderBy: { courierStatusAt: 'asc' },
      take: 300,
    });
    if (!orders.length) {
      await this.prisma.courierConfig.update({ where: { id: cfg.id }, data: { lastSyncAt: new Date(), lastError: null } });
      return;
    }

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
    if (api.features.settlement && api.adapter.paymentSettled) {
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

  /**
   * Courier portal ke parcels (pichhle 30 din, phir har sync par 7 din) →
   * courier_shipments. Order # mil jaye to Nafaa order se jor do — us ke
   * baad tracking, RTO, COD sab usi order par khud.
   */
  private async importPortal(cfg: CourierConfig, creds: CourierCreds) {
    const api = COURIER_APIS[cfg.provider]!;
    const days = cfg.lastSyncAt ? 7 : 30;
    const list: PortalShipment[] = [];
    // 7 din ke tukde — courier lambi range par mana kar deta hai
    for (let end = 0; end < days; end += 7) {
      const to = pkDate(new Date(Date.now() - end * 86_400_000));
      const from = pkDate(new Date(Date.now() - Math.min(days, end + 7) * 86_400_000));
      list.push(...(await api.adapter.listShipments!(creds, from, to)));
    }
    const seen = new Set<string>();
    let linked = 0;
    for (const p of list) {
      if (seen.has(p.trackingNumber)) continue;
      seen.add(p.trackingNumber);
      const state = normalizeCourierStatus(p.statusLabel);
      const existing = await this.prisma.courierShipment.findUnique({ where: { trackingNumber: p.trackingNumber } });
      if (existing && existing.tenantId !== cfg.tenantId) continue;

      // Nafaa order dhoondo (order # se) — jo abhi kisi aur CN se na jura ho
      let orderId = existing && !existing.orderId.startsWith('ext:') ? existing.orderId : null;
      if (!orderId && p.orderRef) {
        const ref = p.orderRef.replace(/^#+/, '').trim();
        const order = await this.prisma.channelOrder.findFirst({
          where: {
            tenantId: cfg.tenantId,
            OR: [{ externalOrderNumber: ref }, { externalOrderNumber: `#${ref}` }, { externalOrderId: ref }],
            AND: [{ OR: [{ trackingNumber: null }, { trackingNumber: p.trackingNumber }] }],
          },
          select: { id: true, trackingNumber: true, courierBookedAt: true, orderStatus: true },
        });
        if (order && !(await this.prisma.courierShipment.findUnique({ where: { orderId: order.id } }))) {
          orderId = order.id;
          if (!order.trackingNumber) {
            await this.prisma.channelOrder.update({
              where: { id: order.id },
              data: {
                courierCode: cfg.provider, courierName: courierName(cfg.provider), trackingNumber: p.trackingNumber,
                courierBookedAt: order.courierBookedAt ?? p.bookedAt ?? new Date(), courierStatus: state, courierStatusAt: new Date(),
              },
            });
            linked++;
          }
        }
      }

      const data = {
        status: shipmentStatus(state),
        codAmount: p.codAmount,
        cnValue: p.codAmount,
        destinationCity: p.city,
        lastEvent: p.statusLabel || null,
        lastEventAt: new Date(),
        deliveredAt: state === 'DELIVERED' ? existing?.deliveredAt ?? new Date() : existing?.deliveredAt ?? null,
        returnedAt: state === 'RETURNED' ? existing?.returnedAt ?? new Date() : existing?.returnedAt ?? null,
        metadata: { source: 'portal', state, orderRef: p.orderRef, customerName: p.customerName, customerPhone: p.customerPhone, address: p.address } as Prisma.InputJsonValue,
      };
      if (existing) {
        await this.prisma.courierShipment.update({ where: { id: existing.id }, data: { ...data, ...(orderId && existing.orderId.startsWith('ext:') ? { orderId } : {}) } });
      } else {
        await this.prisma.courierShipment.create({
          data: {
            tenantId: cfg.tenantId, provider: cfg.provider, trackingNumber: p.trackingNumber,
            orderId: orderId ?? `ext:${cfg.provider}:${p.trackingNumber}`,
            bookedAt: p.bookedAt && !isNaN(+p.bookedAt) ? p.bookedAt : new Date(),
            ...data,
          },
        }).catch(() => null); // do sync ek saath — unique par dusra chup
      }
    }
    return { total: seen.size, linked };
  }

  /** Portal parcels ki list (courier ke safhe ka "Sab parcels") */
  async portalParcels(user: AuthenticatedUser, code: string, q: { filter?: string; search?: string; limit?: number; offset?: number }) {
    const where: Prisma.CourierShipmentWhereInput = { tenantId: user.tenantId, provider: code as CourierProvider };
    const f = q.filter ?? 'all';
    const and: Prisma.CourierShipmentWhereInput[] = [];
    if (f === 'active') and.push({ status: { in: ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ON_HOLD'] } });
    if (f === 'delivered') and.push({ status: 'DELIVERED' });
    if (f === 'returned') and.push({ status: 'RETURNED' });
    if (f === 'attempted') and.push({ status: 'ON_HOLD' });
    if (f === 'unlinked') and.push({ orderId: { startsWith: 'ext:' } });
    const term = q.search?.trim();
    if (term) and.push({ OR: [{ trackingNumber: { contains: term, mode: 'insensitive' } }, { destinationCity: { contains: term, mode: 'insensitive' } }] });
    if (and.length) where.AND = and;
    const take = Math.min(Math.max(q.limit ?? 50, 1), 200);
    const [rows, total] = await Promise.all([
      this.prisma.courierShipment.findMany({ where, orderBy: { bookedAt: 'desc' }, take, skip: Math.max(q.offset ?? 0, 0) }),
      this.prisma.courierShipment.count({ where }),
    ]);
    const orderIds = rows.map((r) => r.orderId).filter((id) => !id.startsWith('ext:'));
    const orders = orderIds.length
      ? await this.prisma.channelOrder.findMany({ where: { id: { in: orderIds }, tenantId: user.tenantId }, select: { id: true, externalOrderNumber: true, externalOrderId: true, orderStatus: true, paymentStatus: true } })
      : [];
    return {
      total,
      rows: rows.map((r) => {
        const m = (r.metadata ?? {}) as any;
        const o = orders.find((x) => x.id === r.orderId);
        return {
          id: r.id,
          trackingNumber: r.trackingNumber,
          bookedAt: r.bookedAt,
          state: (m.state ?? 'UNKNOWN') as CourierState,
          statusLabel: r.lastEvent,
          codAmount: Number(r.codAmount),
          city: r.destinationCity,
          customerName: m.customerName ?? null,
          customerPhone: m.customerPhone ?? null,
          orderRef: m.orderRef ?? null,
          order: o ? { id: o.id, number: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, ''), status: o.orderStatus, paymentStatus: o.paymentStatus } : null,
        };
      }),
    };
  }

  /** Kai CN ka ek label PDF (PostEx) — warna pehle CN ka */
  async bulkLabels(user: AuthenticatedUser, code: string, trackingNumbers: string[]) {
    const tns = [...new Set((trackingNumbers ?? []).map(String).filter(Boolean))].slice(0, 50);
    if (!tns.length) throw new BadRequestException('Koi CN nahi chuna');
    const { creds, api } = await this.account(user.tenantId, code);
    if (!api.features.label) throw new BadRequestException(`${courierName(code)} ka label un ke portal se print karein`);
    // Sirf apne tenant ke CN
    const own = await this.prisma.courierShipment.count({ where: { tenantId: user.tenantId, trackingNumber: { in: tns } } })
      + await this.prisma.channelOrder.count({ where: { tenantId: user.tenantId, trackingNumber: { in: tns } } });
    if (own < 1) throw new BadRequestException('Ye CN aap ke nahi');
    if (api.adapter.bulkLabel) return this.wrap(() => api.adapter.bulkLabel!(creds, tns));
    return this.wrap(() => api.adapter.label(creds, tns[0]));
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

/**
 * apiKey column = pehli key. apiSecret column = baqi sab (JSON), encrypted.
 * Purana roop (apiSecret me seedha password) bhi parh lete hain.
 */
function storeCreds(creds: CourierCreds) {
  const { apiKey, ...rest } = creds;
  const extra = Object.fromEntries(Object.entries(rest).filter(([, v]) => v));
  return { apiKey: encrypt(apiKey)!, apiSecret: Object.keys(extra).length ? encrypt(JSON.stringify(extra)) : null };
}

function credsOf(cfg: CourierConfig): CourierCreds {
  const creds = { apiKey: decrypt(cfg.apiKey) ?? '' } as CourierCreds;
  const extra = decrypt(cfg.apiSecret);
  if (extra) {
    try {
      const obj = JSON.parse(extra);
      if (obj && typeof obj === 'object') Object.assign(creds, obj);
      else creds.apiSecret = extra;
    } catch {
      creds.apiSecret = extra;
    }
  }
  return creds;
}

function readSettings(cfg: CourierConfig): CourierSettings {
  return { ...((cfg.settings as any) ?? {}) };
}

/** Sirf wahi settings jo courier ki list me hain — type ke hisaab se saaf */
function cleanSettings(defs: SettingField[], s?: CourierSettings | null): CourierSettings {
  if (!s || typeof s !== 'object') return {};
  const out: CourierSettings = {};
  for (const d of defs) {
    if (!(d.key in s)) continue;
    const v = s[d.key];
    if (v === null || v === '' || v === undefined) { out[d.key] = null; continue; }
    if (d.type === 'number') {
      const n = Number(v);
      out[d.key] = Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
    } else if (d.type === 'select' && d.options) {
      out[d.key] = d.options.some((o) => o.value === String(v)) ? String(v) : null;
    } else {
      out[d.key] = String(v).slice(0, 200);
    }
  }
  return out;
}

/** "Lahore" / "lahore " / "LHR" → courier list ka "Lahore" */
export function matchCity(list: CourierCity[], name?: string | null): CourierCity | undefined {
  const k = cityKey(name);
  if (!k) return undefined;
  return list.find((c) => cityKey(c.name) === k) ?? list.find((c) => cityKey(c.name).startsWith(k) && k.length >= 4);
}

function emptyStats() {
  return { booked30: 0, active: 0, awaitingPickup: 0, attempted: 0, dispatched30: 0, delivered30: 0, returned30: 0, rtoRate: 0, codPending: 0, codPendingValue: 0 };
}

const mask = (k?: string | null) => (k ? `${'•'.repeat(6)}${k.slice(-4)}` : null);
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

function toHttp(e: unknown) {
  if (e instanceof CourierApiError) return new BadRequestException(e.message);
  return e;
}

/** Pakistan ki tareekh YYYY-MM-DD (server UTC hai) */
const pkDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(d);

function shipmentStatus(s: CourierState): CourierShipmentStatus {
  switch (s) {
    case 'BOOKED': return 'CREATED';
    case 'PICKED_UP': return 'PICKED_UP';
    case 'OUT_FOR_DELIVERY': return 'OUT_FOR_DELIVERY';
    case 'ATTEMPTED': return 'ON_HOLD';
    case 'DELIVERED': return 'DELIVERED';
    case 'RETURNED': return 'RETURNED';
    case 'CANCELLED': return 'CANCELLED';
    default: return 'IN_TRANSIT';
  }
}
