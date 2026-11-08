import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { periodRange } from '../../modules/inventory/taxonomy/taxonomy.helper';
import { apiMessage } from '../../common/i18n/api-message';
import { OnlineOrdersService } from './online-orders.service';
import { CourierAccountsService } from './courier-accounts.service';
import { CourierRulesService } from './courier-rules.service';
import { OrderCostsService, assertManager } from './order-costs.service';
import { OrderScanService } from './order-scan.service';
import { pickCourier } from './courier-rules';
import { codFeeOf, rateCharge } from './order-costs';
import { phoneKey } from './customer-risk';
import { advancePaid } from './payment-links.service';
import { courierHoldsCash, courierName } from './couriers';
import { COURIER_APIS } from './courier-api/registry';
import { cityKey } from './courier-api/http';
import { appendTimeline, patchOrderMetadata } from './order-metadata';
import { LIFECYCLE_RANK } from './order-board';
import {
  AfterBook, AFTER_BOOK, DispatchSettings, PAKPOST, RateHistory, ReportTab, ScanProblem, auditRow, buildLoadsheets, compareRates,
  defaultDispatchSettings, dispatchCheck, labelOf, normalizeDispatchSettings, pakPostTrackUrl, reportTabs, reportTotals,
} from './dispatch';

const settingsKey = (tenantId: string) => `dispatch_settings:${tenantId}`;
const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
const HISTORY_DAYS = 180;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BULK = 100;

const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
const isTest = (meta: unknown) => !!(meta as any)?.test;
const errText = (e: any) => String(e?.response?.message ?? e?.message ?? 'Nahi hua').slice(0, 300);

/** COD the courier collects: the booked amount, else the total less any advance (0 when paid). */
function codOf(o: { paymentStatus: string; total: unknown; metadata: unknown }): number {
  const booked = Number((o.metadata as any)?.courierBooking?.cod);
  if (Number.isFinite(booked) && booked >= 0 && (o.metadata as any)?.courierBooking) return booked;
  if (o.paymentStatus === 'PAID') return 0;
  return Math.max(0, Math.round(Number(o.total) - advancePaid(o.metadata)));
}

const SCAN_TEXT: Record<ScanProblem, string> = {
  NOT_ACCEPTED: 'Order abhi accept nahi hua — pehle accept karein',
  NOT_PACKED: 'Order pack nahi hua — pehle packing scan karein',
  ALREADY_SENT: 'Ye parcel pehle hi bheja ja chuka',
  DELIVERED: 'Ye order deliver ho chuka',
  RETURNED: 'Ye order wapas aa chuka (RTO)',
  CANCELLED: 'Ye order cancel hai — parcel mat bhejein',
  DELETED: 'Ye order delete hai — parcel mat bhejein',
};

/**
 * Dispatch desk: bulk courier booking with rate compare, labels, the day's
 * loadsheets, cancel booking, dispatch scan, re-dispatch and claims, the
 * dispatch report, the COD (CPR) audit and Pakistan Post. Booking and status
 * changes go through the courier and order services, so stock, bills, the
 * timeline and status hooks stay on their one path.
 */
@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly couriers: CourierAccountsService,
    private readonly rules: CourierRulesService,
    private readonly costs: OrderCostsService,
    private readonly scanner: OrderScanService,
    private readonly tz: TenantTimezoneService,
  ) {}

  // ─── Settings ────────────────────────────────────────────────

  async settings(tenantId: string): Promise<DispatchSettings> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: settingsKey(tenantId) } });
    if (!row) return defaultDispatchSettings();
    try { return normalizeDispatchSettings(JSON.parse(row.value)); } catch { return defaultDispatchSettings(); }
  }

  async getSettings(user: AuthenticatedUser) {
    const [s, tenant] = await Promise.all([
      this.settings(user.tenantId),
      this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, phone: true, address: true } }),
    ]);
    return { ...s, shop: { name: tenant?.name ?? '', phone: tenant?.phone ?? '', address: tenant?.address ?? '' } };
  }

  async saveSettings(user: AuthenticatedUser, body: unknown) {
    assertManager(user);
    const value = JSON.stringify(normalizeDispatchSettings(body));
    await this.prisma.systemSetting.upsert({
      where: { key: settingsKey(user.tenantId) },
      create: { key: settingsKey(user.tenantId), value, category: 'online_orders', isPublic: false },
      update: { value },
    });
    return this.getSettings(user);
  }

  // ─── Rate compare ────────────────────────────────────────────

  /** Connected couriers Nafaa can book through their API. */
  private async connected(tenantId: string) {
    const configs = await this.prisma.courierConfig.findMany({ where: { tenantId, isActive: true }, select: { provider: true } });
    return configs.map((c) => c.provider as string).filter((c) => !!COURIER_APIS[c]);
  }

  /** Delivered and returned parcels per courier, in total and per city, over the last 180 days. */
  private async history(tenantId: string) {
    const rows = await this.prisma.channelOrder.groupBy({
      by: ['courierCode', 'customerCity', 'orderStatus'],
      where: {
        tenantId,
        courierCode: { notIn: ['RIDER', 'OTHER'] },
        dispatchedAt: { gte: new Date(Date.now() - HISTORY_DAYS * 86_400_000) },
        orderStatus: { in: ['DELIVERED', 'RETURNED'] },
      },
      _count: { _all: true },
    });
    const all = new Map<string, { delivered: number; returned: number }>();
    const city = new Map<string, { delivered: number; returned: number }>();
    for (const r of rows) {
      if (!r.courierCode) continue;
      const key = r.orderStatus === 'DELIVERED' ? 'delivered' : 'returned';
      const a = all.get(r.courierCode) ?? { delivered: 0, returned: 0 };
      a[key] += r._count._all;
      all.set(r.courierCode, a);
      const ck = `${r.courierCode}|${cityKey(r.customerCity)}`;
      const c = city.get(ck) ?? { delivered: 0, returned: 0 };
      c[key] += r._count._all;
      city.set(ck, c);
    }
    return (code: string, c: string | null): RateHistory | undefined => {
      const a = all.get(code);
      if (!a) return undefined;
      const x = city.get(`${code}|${cityKey(c)}`) ?? { delivered: 0, returned: 0 };
      return { delivered: a.delivered, returned: a.returned, cityDelivered: x.delivered, cityReturned: x.returned };
    };
  }

  private async bookable(user: AuthenticatedUser, scope: ShopScope, ids: string[]) {
    return this.prisma.channelOrder.findMany({
      where: { id: { in: ids }, tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any) },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, customerCity: true, customerPhone: true, total: true, metadata: true,
        paymentStatus: true, integrationId: true, weightKg: true, nafaaSaleId: true, orderStatus: true, courierBookedAt: true, courierStatus: true,
        trackingNumber: true, dispatchedAt: true,
      },
    });
  }

  /**
   * Each connected courier's price for the picked orders (rate card), its
   * RTO rate in their cities, and which courier fits best. Also what the
   * auto-booking rules would pick.
   */
  async rates(user: AuthenticatedUser, scope: ShopScope, body: { orderIds?: string[]; weightKg?: number }) {
    const ids = [...new Set(body?.orderIds ?? [])].slice(0, MAX_BULK);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const [codes, settings, hist, orders, saved] = await Promise.all([
      this.connected(user.tenantId), this.costs.settings(user.tenantId), this.history(user.tenantId),
      this.bookable(user, scope, ids), this.rules.saved(user.tenantId),
    ]);
    const weight = Number(body?.weightKg) > 0 ? Number(body.weightKg) : null;
    const sum = new Map<string, { charge: number; codFee: number; expected: number; priced: number; rto: number; rtoN: number; bestFor: number; basis: Set<string> }>();
    for (const code of codes) sum.set(code, { charge: 0, codFee: 0, expected: 0, priced: 0, rto: 0, rtoN: 0, bestFor: 0, basis: new Set() });
    for (const o of orders) {
      const history: Record<string, RateHistory | undefined> = {};
      for (const code of codes) history[code] = hist(code, o.customerCity);
      const quotes = compareRates(codes, settings.couriers, history, { city: o.customerCity, weightKg: weight ?? o.weightKg, cod: codOf(o) });
      for (const q of quotes) {
        const s = sum.get(q.code)!;
        if (q.expected !== null) { s.charge += q.charge!; s.codFee += q.codFee; s.expected += q.expected; s.priced++; }
        if (q.rtoRate !== null) { s.rto += q.rtoRate; s.rtoN++; s.basis.add(q.basis); }
        if (q.best) s.bestFor++;
      }
    }
    const list = codes.map((code) => {
      const s = sum.get(code)!;
      return {
        code, name: courierName(code),
        charge: s.priced ? Math.round(s.charge) : null,
        codFee: Math.round(s.codFee),
        expected: s.priced ? Math.round(s.expected) : null,
        priced: s.priced,
        rtoRate: s.rtoN ? Math.round((s.rto / s.rtoN) * 10) / 10 : null,
        basis: s.basis.has('CITY') ? 'CITY' : s.basis.has('ALL') ? 'ALL' : 'NONE',
        bestFor: s.bestFor,
      };
    });
    const pick = [...list].sort((a, b) => b.bestFor - a.bestFor || (a.expected ?? Infinity) - (b.expected ?? Infinity))[0];
    // What the saved rules would do for each order (risk included).
    let auto: { byCourier: Record<string, number>; ask: number } | null = null;
    if (saved) {
      const risk = await this.orders.customerRisk(user.tenantId, orders.map((o) => o.customerPhone), orders.map((o) => o.id)).catch(() => null);
      auto = { byCourier: {}, ask: 0 };
      for (const o of orders) {
        const d = pickCourier(saved, { city: o.customerCity, cod: codOf(o), risk: risk?.get(phoneKey(o.customerPhone) ?? '')?.level ?? null, integrationId: o.integrationId });
        if (d.action === 'BOOK' && codes.includes(d.courier)) auto.byCourier[d.courier] = (auto.byCourier[d.courier] ?? 0) + 1;
        else auto.ask++;
      }
    }
    const ready = orders.filter((o) => o.nafaaSaleId && ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus) && !o.dispatchedAt
      && !(o.courierBookedAt && o.trackingNumber && o.courierStatus !== 'CANCELLED'));
    return {
      orders: orders.length, ready: ready.length,
      couriers: list,
      pick: pick && (pick.bestFor > 0 || pick.expected !== null) ? pick.code : codes[0] ?? null,
      auto,
      rateCardMissing: list.filter((c) => c.charge === null).map((c) => c.code),
    };
  }

  // ─── Bulk booking ────────────────────────────────────────────

  /**
   * Books many orders. `courier` is a courier code, AUTO (the shop's rules
   * per order) or BEST (the rate compare's pick per order). A booked order
   * then moves to Packed or Dispatched as the shop chose; a failed move is
   * reported next to the CN, the booking stands.
   */
  async book(user: AuthenticatedUser, scope: ShopScope, body: {
    orderIds?: string[]; courier?: string; weightKg?: number; pieces?: number; serviceType?: string; after?: string;
  }) {
    const ids = [...new Set(body?.orderIds ?? [])].slice(0, MAX_BULK);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const mode = String(body?.courier ?? '').toUpperCase();
    const settings = await this.settings(user.tenantId);
    const after: AfterBook = AFTER_BOOK.includes(body?.after as AfterBook) ? (body.after as AfterBook) : settings.afterBook;
    const codes = await this.connected(user.tenantId);
    if (!codes.length) throw new BadRequestException('Koi courier API se jura nahi — Couriers page se jorein');
    if (mode !== 'AUTO' && mode !== 'BEST' && !codes.includes(mode)) throw new BadRequestException(apiMessage('{{code}} jura nahi', { code: courierName(mode) ?? mode }));

    const orders = await this.bookable(user, scope, ids);
    const saved = mode === 'AUTO' ? await this.rules.saved(user.tenantId) : null;
    if (mode === 'AUTO' && !saved) throw new BadRequestException('Auto booking ke rules nahi bane — Courier rules page par banayein ya courier chunein');
    const risk = mode === 'AUTO'
      ? await this.orders.customerRisk(user.tenantId, orders.map((o) => o.customerPhone), orders.map((o) => o.id)).catch(() => null)
      : null;
    const [costSettings, hist] = mode === 'BEST' ? await Promise.all([this.costs.settings(user.tenantId), this.history(user.tenantId)]) : [null, null];

    const results: Array<{ id: string; ok: boolean; courier?: string; trackingNumber?: string; moved?: string | null; moveError?: string; error?: string }> = [];
    for (const id of ids) {
      const o = orders.find((x) => x.id === id);
      if (!o) { results.push({ id, ok: false, error: 'Order nahi mila' }); continue; }
      let code = mode;
      if (mode === 'AUTO') {
        const d = pickCourier(saved!, { city: o.customerCity, cod: codOf(o), risk: risk?.get(phoneKey(o.customerPhone) ?? '')?.level ?? null, integrationId: o.integrationId });
        if (d.action === 'ASK') { results.push({ id, ok: false, error: d.reason }); continue; }
        if (!codes.includes(d.courier)) { results.push({ id, ok: false, error: apiMessage('{{code}} ka API jura nahi', { code: courierName(d.courier) }).message }); continue; }
        code = d.courier;
      } else if (mode === 'BEST') {
        const history: Record<string, RateHistory | undefined> = {};
        for (const c of codes) history[c] = hist!(c, o.customerCity);
        code = compareRates(codes, costSettings!.couriers, history, { city: o.customerCity, weightKg: body?.weightKg ?? o.weightKg, cod: codOf(o) }).find((q) => q.best)?.code ?? codes[0];
      }
      try {
        const r = await this.couriers.book(user, scope, id, {
          courier: code,
          weightKg: Number(body?.weightKg) > 0 ? Number(body.weightKg) : o.weightKg ?? undefined,
          pieces: Number(body?.pieces) > 0 ? Math.round(Number(body.pieces)) : undefined,
          serviceType: body?.serviceType,
        });
        const out: (typeof results)[number] = { id, ok: true, courier: code, trackingNumber: r.trackingNumber, moved: null };
        const to = after === 'PACKED' ? 'PACKED' : after === 'DISPATCHED' ? 'DISPATCHED' : null;
        const target = to === 'PACKED' ? LIFECYCLE_RANK.READY : LIFECYCLE_RANK.OUT_FOR_DELIVERY;
        if (to && (LIFECYCLE_RANK[o.orderStatus] ?? 0) < target) {
          try {
            await this.orders.move(user, scope, id, { to, reason: apiMessage('{{courier}} par book', { courier: courierName(code) }).message });
            out.moved = to;
          } catch (e) { out.moveError = errText(e); }
        }
        results.push(out);
      } catch (e) {
        results.push({ id, ok: false, courier: code, error: errText(e) });
      }
    }
    return { booked: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  // ─── Cancel booking / remove tracking ────────────────────────

  /**
   * Cancels each order's booking through the courier's API when it allows,
   * else (manual CN, a courier without cancel, or `local`) only clears the
   * CN in Nafaa with a note. A parcel the courier already picked up is never
   * cleared without `local`.
   */
  async cancel(user: AuthenticatedUser, scope: ShopScope, body: { ids?: string[]; local?: boolean; note?: string }) {
    const ids = [...new Set(body?.ids ?? [])].slice(0, MAX_BULK);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const note = body?.note?.trim().slice(0, 200) || null;
    const orders = await this.prisma.channelOrder.findMany({
      where: { id: { in: ids }, tenantId: user.tenantId, ...(scope.whereLoose as any) },
      select: { id: true, trackingNumber: true, courierCode: true, courierBookedAt: true, courierStatus: true, orderStatus: true, metadata: true },
    });
    const results: Array<{ id: string; ok: boolean; via?: 'API' | 'LOCAL'; error?: string }> = [];
    for (const id of ids) {
      const o = orders.find((x) => x.id === id);
      if (!o) { results.push({ id, ok: false, error: 'Order nahi mila' }); continue; }
      if (!o.trackingNumber) { results.push({ id, ok: false, error: 'Is order par koi CN nahi' }); continue; }
      if (o.orderStatus === 'DELIVERED' || CLOSED.includes(o.orderStatus)) { results.push({ id, ok: false, error: 'Band ya deliver ho chuke order ka CN nahi hatta' }); continue; }
      const api = o.courierCode ? COURIER_APIS[o.courierCode] : undefined;
      const viaApi = !!o.courierBookedAt && o.courierStatus !== 'CANCELLED';
      const pickedUp = !!o.courierStatus && !['BOOKED', 'BOOKING', 'CANCELLED'].includes(o.courierStatus);
      try {
        if (viaApi && api?.features.cancel && !pickedUp && !body?.local) {
          await this.couriers.cancelBooking(user, scope, id);
          await this.orders.addTimeline(user, id, 'CANCEL_BOOKING', apiMessage('{{courier}} booking cancel · CN {{cn}}', { courier: courierName(o.courierCode), cn: o.trackingNumber }).message + (note ? ` · ${note}` : ''));
          results.push({ id, ok: true, via: 'API' });
          continue;
        }
        if (pickedUp && !body?.local) {
          results.push({ id, ok: false, error: 'Courier parcel utha chuka — courier se baat karein. Sirf Nafaa se CN hatane ke liye "Sirf Nafaa me" chunein' });
          continue;
        }
        const meta = (o.metadata ?? {}) as any;
        const cleared = [...(Array.isArray(meta.trackingCleared) ? meta.trackingCleared : []), {
          at: new Date().toISOString(), by: user.id, cn: o.trackingNumber, courier: o.courierCode, note,
          apiBooked: viaApi, reason: viaApi ? (api?.features.cancel ? 'local' : 'no-api-cancel') : 'manual',
        }].slice(-20);
        await patchOrderMetadata(this.prisma, id, { trackingCleared: cleared });
        await this.prisma.channelOrder.update({
          where: { id },
          data: { trackingNumber: null, courierLabelUrl: null, courierBookedAt: null, courierStatus: viaApi ? 'CANCELLED' : null, courierStatusAt: new Date() },
        });
        await this.detachShipment(id);
        await this.orders.addTimeline(user, id, 'CANCEL_BOOKING', apiMessage('CN {{cn}} sirf Nafaa se hataya', { cn: o.trackingNumber }).message + (note ? ` · ${note}` : ''));
        results.push({ id, ok: true, via: 'LOCAL' });
      } catch (e) {
        results.push({ id, ok: false, error: errText(e) });
      }
    }
    return { done: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  /** The courier's portal row for an order's old CN stops pointing at the order. */
  private async detachShipment(orderId: string) {
    const s = await this.prisma.courierShipment.findUnique({ where: { orderId } });
    if (s) await this.prisma.courierShipment.update({ where: { id: s.id }, data: { orderId: `ext:${s.provider}:${s.trackingNumber}` } }).catch(() => null);
  }

  // ─── Labels ──────────────────────────────────────────────────

  async labels(user: AuthenticatedUser, scope: ShopScope, body: { ids?: string[] }) {
    const ids = [...new Set(body?.ids ?? [])].slice(0, 200);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const [orders, s] = await Promise.all([
      this.prisma.channelOrder.findMany({
        where: { id: { in: ids }, tenantId: user.tenantId, ...(scope.whereLoose as any) },
        select: {
          id: true, externalOrderNumber: true, externalOrderId: true, trackingNumber: true, courierCode: true, courierName: true, courierLabelUrl: true,
          customerName: true, customerPhone: true, customerAddress: true, customerCity: true, items: true, total: true, paymentStatus: true, metadata: true,
          weightKg: true, notes: true,
        },
      }),
      this.getSettings(user),
    ]);
    const labels = ids.map((id) => orders.find((o) => o.id === id)).filter((o): o is (typeof orders)[number] => !!o).map((o) => {
      const meta = (o.metadata ?? {}) as any;
      return labelOf({
        id: o.id, number: orderNo(o), trackingNumber: o.trackingNumber, courierCode: o.courierCode,
        courierName: courierName(o.courierCode) ?? o.courierName, courierLabelUrl: o.courierLabelUrl,
        customerName: o.customerName, customerPhone: o.customerPhone, customerAddress: o.customerAddress, customerCity: o.customerCity,
        items: (Array.isArray(o.items) ? (o.items as any[]) : []).map((i) => ({ name: String(i?.name ?? 'Item'), variant: i?.variant ?? null, quantity: Number(i?.quantity) || 0 })),
        cod: codOf(o), weightKg: Number(meta.courierBooking?.weightKg) || o.weightKg, pieces: Number(meta.courierBooking?.pieces) || null, notes: o.notes,
      });
    });
    return {
      size: s.labelSize,
      from: {
        name: s.returnName || s.shop.name,
        phone: s.returnPhone || s.shop.phone,
        address: s.returnAddress || s.shop.address,
      },
      labels,
    };
  }

  // ─── Loadsheet ───────────────────────────────────────────────

  private async dayRange(tenantId: string, day?: string) {
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const key = day && DAY_KEY.test(day) ? day : businessDayKey(new Date(), tz, dayStartHour);
    return { key, range: await periodRange(this.tz, tenantId, key, key) };
  }

  /** Parcels booked on a business day (API bookings and hand-written CNs dispatched that day), per courier. */
  async loadsheet(user: AuthenticatedUser, scope: ShopScope, q: { day?: string; courier?: string }) {
    const { key, range } = await this.dayRange(user.tenantId, q.day);
    const courier = q.courier ? String(q.courier).toUpperCase() : null;
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any),
        trackingNumber: { not: null },
        courierCode: courier ? courier : { notIn: ['RIDER'] },
        orderStatus: { notIn: ['CANCELLED', 'REJECTED'] },
        OR: [{ courierBookedAt: range }, { courierBookedAt: null, dispatchedAt: range }],
      },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, trackingNumber: true, courierCode: true, customerName: true, customerCity: true,
        total: true, paymentStatus: true, metadata: true, items: true, weightKg: true,
      },
      orderBy: { courierBookedAt: 'asc' },
      take: 2000,
    });
    const sheets = buildLoadsheets(rows.filter((r) => !isTest(r.metadata)).map((r) => {
      const meta = (r.metadata ?? {}) as any;
      const qty = (Array.isArray(r.items) ? (r.items as any[]) : []).reduce((n, i) => n + (Number(i?.quantity) || 0), 0);
      return {
        orderId: r.id, number: orderNo(r), trackingNumber: r.trackingNumber!, courierCode: r.courierCode ?? 'OTHER',
        customerName: r.customerName, city: r.customerCity, cod: codOf(r),
        pieces: Number(meta.courierBooking?.pieces) || qty || 1,
        weightKg: Number(meta.courierBooking?.weightKg) || r.weightKg || null,
      };
    }));
    const saved = await this.prisma.courierLoadsheet.findMany({
      where: { tenantId: user.tenantId, day: key, ...(courier ? { courierCode: courier } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return {
      day: key,
      sheets: sheets.map((s) => ({
        ...s,
        courierName: courierName(s.courierCode),
        canSubmit: !!COURIER_APIS[s.courierCode]?.adapter.loadsheet,
        submitted: saved.filter((x) => x.courierCode === s.courierCode).map((x) => ({
          id: x.id, at: x.createdAt, parcels: x.parcels, source: x.source, externalRef: x.externalRef, apiError: x.apiError,
        })),
      })),
    };
  }

  /**
   * Saves the day's sheet for a courier and, when the courier has a
   * loadsheet API (Leopards, PostEx), hands the CNs to it. A courier error
   * is kept on the saved sheet; Nafaa's own sheet still prints.
   */
  async submitLoadsheet(user: AuthenticatedUser, scope: ShopScope, body: { day?: string; courier?: string; orderIds?: string[] }) {
    const courier = String(body?.courier ?? '').toUpperCase();
    if (!courier) throw new BadRequestException('Courier chunein');
    const data = await this.loadsheet(user, scope, { day: body?.day, courier });
    const sheet = data.sheets.find((s) => s.courierCode === courier);
    const pickIds = body?.orderIds?.length ? new Set(body.orderIds) : null;
    const rows = (sheet?.rows ?? []).filter((r) => !pickIds || pickIds.has(r.orderId));
    if (!rows.length) throw new BadRequestException('Is din is courier ka koi parcel nahi');
    const api = COURIER_APIS[courier];
    let ref: string | null = null;
    let pdf: Buffer | undefined;
    let url: string | null = null;
    let apiError: string | null = null;
    if (api?.adapter.loadsheet) {
      try {
        const r = await this.couriers.courierLoadsheet(user.tenantId, courier, rows.map((x) => x.trackingNumber));
        ref = r?.ref ?? null; pdf = r?.pdf; url = r?.url ?? null;
      } catch (e) {
        apiError = errText(e);
      }
    }
    const saved = await this.prisma.courierLoadsheet.create({
      data: {
        tenantId: user.tenantId, courierCode: courier, day: data.day,
        orderIds: rows.map((r) => r.orderId), trackingNumbers: rows.map((r) => r.trackingNumber),
        parcels: rows.length, pieces: rows.reduce((s, r) => s + r.pieces, 0), codTotal: rows.reduce((s, r) => s + r.cod, 0),
        source: ref || pdf || url ? 'API' : 'NAFAA', externalRef: ref, apiError, createdById: user.id,
      },
    });
    for (const r of rows) await patchOrderMetadata(this.prisma, r.orderId, { loadsheet: { id: saved.id, day: data.day, ref } }).catch(() => null);
    return {
      id: saved.id, parcels: rows.length, externalRef: ref, apiError, url,
      pdfBase64: pdf ? pdf.toString('base64') : null,
    };
  }

  // ─── Dispatch scan ───────────────────────────────────────────

  /** Scanned CN or order number: the parcel is handed to the courier (Dispatched). */
  async scan(user: AuthenticatedUser, scope: ShopScope, body: { code?: string; force?: boolean }) {
    const found = await this.scanner.lookup(user, scope, String(body?.code ?? ''));
    const o = await this.prisma.channelOrder.findUniqueOrThrow({
      where: { id: found.id },
      select: { id: true, orderStatus: true, nafaaSaleId: true, dispatchedAt: true, deletedAt: true, trackingNumber: true, courierCode: true, customerName: true, customerCity: true, total: true, paymentStatus: true, metadata: true, externalOrderNumber: true, externalOrderId: true },
    });
    const view = {
      id: o.id, number: orderNo(o), customerName: o.customerName, customerCity: o.customerCity, trackingNumber: o.trackingNumber,
      courierCode: o.courierCode, courierLabel: courierName(o.courierCode), cod: codOf(o), orderStatus: o.orderStatus,
    };
    const problem = dispatchCheck(o, body?.force === true);
    if (problem) return { ok: false, code: problem, message: SCAN_TEXT[problem], order: view };
    await this.orders.move(user, scope, o.id, { to: 'DISPATCHED', reason: 'Dispatch scan' });
    await patchOrderMetadata(this.prisma, o.id, { dispatchScan: { at: new Date().toISOString(), by: user.id } });
    return { ok: true, code: null, message: null, order: { ...view, orderStatus: 'OUT_FOR_DELIVERY' }, noCn: !o.trackingNumber };
  }

  // ─── Re-dispatch and claims ──────────────────────────────────

  /**
   * Sends a parcel again with a new CN: a fresh API booking (`book`) or a
   * hand-written CN. The old CN stays in metadata.redispatches. Only for
   * parcels still out (not delivered, not received back).
   */
  async redispatch(user: AuthenticatedUser, scope: ShopScope, id: string, body: { courier?: string; trackingNumber?: string; book?: boolean; weightKg?: number; note?: string }) {
    const o = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any) } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (o.orderStatus === 'RETURNED') throw new BadRequestException('Parcel wapas receive ho chuka — Replacement order banayein');
    if (!['READY', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)) throw new BadRequestException('Sirf bheje hue (ya pack) parcel dobara bhej sakte hain');
    const code = String(body?.courier ?? o.courierCode ?? '').toUpperCase();
    if (!code) throw new BadRequestException('Courier chunein');
    const meta = (o.metadata ?? {}) as any;
    const entry = { at: new Date().toISOString(), by: user.id, fromCn: o.trackingNumber, fromCourier: o.courierCode, toCourier: code, toCn: null as string | null, note: body?.note?.trim().slice(0, 200) || null };
    const before = { trackingNumber: o.trackingNumber, courierCode: o.courierCode, courierName: o.courierName, courierBookedAt: o.courierBookedAt, courierStatus: o.courierStatus, courierStatusAt: o.courierStatusAt, courierLabelUrl: o.courierLabelUrl };

    if (body?.book) {
      if (!COURIER_APIS[code]) throw new BadRequestException(apiMessage('{{code}} ka API jura nahi — CN khud likhein', { code: courierName(code) }));
      // Free the order for a new booking, keeping the old CN in the log.
      await this.prisma.channelOrder.update({ where: { id }, data: { courierStatus: 'CANCELLED', courierStatusAt: new Date() } });
      try {
        const r = await this.couriers.book(user, scope, id, { courier: code, weightKg: Number(body.weightKg) > 0 ? Number(body.weightKg) : o.weightKg ?? undefined });
        entry.toCn = r.trackingNumber;
      } catch (e) {
        await this.prisma.channelOrder.update({ where: { id }, data: before }).catch(() => null);
        throw e;
      }
    } else {
      const cn = String(body?.trackingNumber ?? '').trim().slice(0, 60);
      if (!cn) throw new BadRequestException('Naya CN likhein');
      if (cn === o.trackingNumber) throw new BadRequestException('Naya CN purane jaisa hai');
      entry.toCn = cn;
      await this.prisma.channelOrder.update({
        where: { id },
        data: { trackingNumber: cn, courierCode: code, courierName: courierName(code), courierBookedAt: null, courierLabelUrl: null, courierStatus: null, courierStatusAt: new Date() },
      });
    }
    if (before.trackingNumber && before.trackingNumber !== entry.toCn) await this.detachShipment(id);
    const fresh = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id }, select: { metadata: true, stage: true } });
    const m = (fresh.metadata ?? {}) as any;
    await this.prisma.channelOrder.update({
      where: { id },
      data: {
        dispatchedAt: new Date(),
        ...(fresh.stage === 'ISSUE' ? { stage: null } : {}),
        metadata: {
          ...m,
          firstDispatchedAt: m.firstDispatchedAt ?? o.dispatchedAt?.toISOString() ?? null,
          redispatches: [...(Array.isArray(meta.redispatches) ? meta.redispatches : []), entry].slice(-10),
          courierTrail: undefined,
        },
      },
    });
    if (o.orderStatus === 'READY') await this.orders.move(user, scope, id, { to: 'DISPATCHED', reason: 'Re-dispatch' });
    else await appendTimeline(this.prisma, id, { at: entry.at, by: user.id, byName: null, from: 'DISPATCHED', to: 'DISPATCHED', note: `Re-dispatch: ${entry.fromCn ?? '-'} → ${entry.toCn} (${courierName(code)})` });
    return this.orders.view(id);
  }

  /** Claim against the courier for a lost or damaged parcel. OPEN puts the CLAIM flag on the order. */
  async claim(user: AuthenticatedUser, scope: ShopScope, id: string, body: { status?: string; amount?: number; note?: string }) {
    const o = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) }, select: { id: true, stage: true, metadata: true, courierCode: true } });
    if (!o) throw new NotFoundException('Order nahi mila');
    const status = ['OPEN', 'WON', 'LOST', 'NONE'].includes(String(body?.status)) ? String(body.status) : 'OPEN';
    const amount = Number(body?.amount);
    const prev = (o.metadata as any)?.claim ?? null;
    const claim = status === 'NONE' ? null : {
      status, amount: Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : prev?.amount ?? null,
      note: body?.note?.trim().slice(0, 300) || prev?.note || null, courier: o.courierCode,
      openedAt: prev?.openedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), by: user.id,
    };
    await patchOrderMetadata(this.prisma, id, { claim });
    const stage = status === 'OPEN' ? 'CLAIM' : o.stage === 'CLAIM' ? null : o.stage;
    return this.orders.addTimeline(user, id, status === 'NONE' ? 'CLAIM_REMOVED' : `CLAIM_${status}`, claim?.note ?? null, stage !== o.stage ? { stage } : {});
  }

  // ─── Dispatch report ─────────────────────────────────────────

  async report(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string; courier?: string; integrationId?: string }) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const toKey = q.to && DAY_KEY.test(q.to) ? q.to : today;
    const fromKey = q.from && DAY_KEY.test(q.from) ? q.from : toKey.slice(0, 8) + '01';
    if (fromKey > toKey) throw new BadRequestException('Date sahi nahi');
    const range = await periodRange(this.tz, user.tenantId, fromKey, toKey);
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any),
        dispatchedAt: range,
        ...(q.courier ? { courierCode: String(q.courier).toUpperCase() } : {}),
        ...(q.integrationId ? { integrationId: q.integrationId } : {}),
      },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerPhone: true, customerCity: true, total: true,
        paymentStatus: true, orderStatus: true, courierStatus: true, stage: true, courierCode: true, trackingNumber: true, dispatchedAt: true,
        deliveredAt: true, returnedAt: true, replacementOfId: true, metadata: true, codSettledAt: true,
      },
      orderBy: { dispatchedAt: 'desc' },
      take: 5000,
    });
    const now = Date.now();
    const list = rows.filter((r) => !isTest(r.metadata)).map((r) => {
      const meta = (r.metadata ?? {}) as any;
      const tabs = reportTabs({
        orderStatus: r.orderStatus, courierStatus: r.courierStatus, stage: r.stage, dispatchedAt: r.dispatchedAt!, replacementOfId: r.replacementOfId,
        rtoReceived: !!meta.rtoReceived, claim: !!meta.claim && meta.claim.status === 'OPEN', redispatched: Array.isArray(meta.redispatches) && meta.redispatches.length > 0,
      }, now);
      return {
        id: r.id, number: orderNo(r), customerName: r.customerName, customerPhone: r.customerPhone, city: r.customerCity,
        courierCode: r.courierCode, courierName: courierName(r.courierCode), trackingNumber: r.trackingNumber,
        orderStatus: r.orderStatus, courierStatus: r.courierStatus, lastEvent: meta.courierTrail?.label ?? null,
        dispatchedAt: r.dispatchedAt!, deliveredAt: r.deliveredAt, returnedAt: r.returnedAt, settled: !!r.codSettledAt,
        total: Number(r.total), cod: codOf(r), day: businessDayKey(r.dispatchedAt!, tz, dayStartHour), tabs,
      };
    });
    const totals = reportTotals(list);
    const days = new Map<string, { day: string; dispatched: number; delivered: number; returned: number }>();
    for (const r of list) {
      const d = days.get(r.day) ?? { day: r.day, dispatched: 0, delivered: 0, returned: 0 };
      d.dispatched++;
      if (r.tabs.includes('delivered')) d.delivered++;
      if (r.tabs.includes('returns')) d.returned++;
      days.set(r.day, d);
    }
    const byCourier = new Map<string, { code: string; name: string | null; dispatched: number; delivered: number; returned: number; inProcess: number; cancelled: number; deliveredCod: number }>();
    for (const r of list) {
      const code = r.courierCode ?? 'OTHER';
      const c = byCourier.get(code) ?? { code, name: courierName(code), dispatched: 0, delivered: 0, returned: 0, inProcess: 0, cancelled: 0, deliveredCod: 0 };
      c.dispatched++;
      if (r.tabs.includes('delivered')) { c.delivered++; c.deliveredCod += r.cod; }
      if (r.tabs.includes('returns')) c.returned++;
      if (r.tabs.includes('open')) c.inProcess++;
      if (r.tabs.includes('cancelled')) c.cancelled++;
      byCourier.set(code, c);
    }
    const tabCounts = Object.fromEntries((['all', 'open', 'delivered', 'returns', 'rto_wh', 'pending_rto', 'ofd', 'issue', 'stuck', 'claims', 'redispatched', 'replacement', 'cancelled'] as ReportTab[])
      .map((t) => [t, list.filter((r) => r.tabs.includes(t)).length]));
    return {
      from: fromKey, to: toKey, totals, tabCounts,
      daily: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
      couriers: [...byCourier.values()].map((c) => ({
        ...c, deliveredCod: Math.round(c.deliveredCod),
        successRate: c.delivered + c.returned ? Math.round((c.delivered / (c.delivered + c.returned)) * 1000) / 10 : null,
      })).sort((a, b) => b.dispatched - a.dispatched),
      rows: list,
      capped: rows.length >= 5000,
    };
  }

  // ─── COD (CPR) audit ─────────────────────────────────────────

  /**
   * Delivered COD parcels against what the courier paid: the statement's
   * received amount (from COD reconcile) against COD less the allowed
   * charges, and the charges the courier deducted against the rate card.
   */
  async codAudit(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string; courier?: string }) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const toKey = q.to && DAY_KEY.test(q.to) ? q.to : today;
    const fromKey = q.from && DAY_KEY.test(q.from) ? q.from : toKey.slice(0, 8) + '01';
    const range = await periodRange(this.tz, user.tenantId, fromKey, toKey);
    const [settings, rows] = await Promise.all([
      this.costs.settings(user.tenantId),
      this.prisma.channelOrder.findMany({
        where: {
          tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any),
          orderStatus: 'DELIVERED', deliveredAt: range,
          courierCode: q.courier ? String(q.courier).toUpperCase() : { notIn: ['RIDER', 'OTHER'] },
        },
        select: {
          id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerCity: true, courierCode: true, trackingNumber: true,
          total: true, paymentStatus: true, metadata: true, weightKg: true, courierCharge: true, codFee: true, deliveredAt: true, codSettledAt: true, codSettlementRef: true,
        },
        orderBy: { deliveredAt: 'desc' },
        take: 5000,
      }),
    ]);
    const now = Date.now();
    const list = rows.filter((r) => !isTest(r.metadata) && courierHoldsCash(r.courierCode)).map((r) => {
      const meta = (r.metadata ?? {}) as any;
      const cod = codOf(r);
      const rate = settings.couriers[r.courierCode!];
      const fromStatement = (k: string) => ['STATEMENT', 'API'].includes(meta.costSources?.[k]);
      const received = meta.codStatement && Number.isFinite(Number(meta.codStatement.received)) && meta.codStatement.received !== null ? Number(meta.codStatement.received) : null;
      const a = auditRow({
        cod, received,
        charge: fromStatement('courierCharge') && r.courierCharge !== null ? Number(r.courierCharge) : null,
        codFee: fromStatement('codFee') && r.codFee !== null ? Number(r.codFee) : null,
        rateCharge: rateCharge(rate, r.customerCity, Number(meta.courierBooking?.weightKg) || r.weightKg),
        rateCodFee: codFeeOf(rate, cod),
      });
      const waitingDays = r.paymentStatus === 'PAID' || !r.deliveredAt ? null : Math.floor((now - r.deliveredAt.getTime()) / 86_400_000);
      return {
        id: r.id, number: orderNo(r), customerName: r.customerName, city: r.customerCity, courierCode: r.courierCode, courierName: courierName(r.courierCode),
        trackingNumber: r.trackingNumber, deliveredAt: r.deliveredAt, paid: r.paymentStatus === 'PAID', settlementRef: r.codSettlementRef,
        cod, received, deducted: r.courierCharge !== null || r.codFee !== null ? Math.round((Number(r.courierCharge) || 0) + (Number(r.codFee) || 0)) : null,
        ...a, waitingDays, inStatement: received !== null,
      };
    }).filter((r) => r.cod > 0);
    const sum = (f: (r: (typeof list)[number]) => number) => Math.round(list.reduce((s, r) => s + f(r), 0));
    const byCourier = new Map<string, { code: string; name: string | null; parcels: number; cod: number; expectedNet: number; received: number; short: number; overCharge: number; unpaid: number; unpaidValue: number }>();
    for (const r of list) {
      const c = byCourier.get(r.courierCode!) ?? { code: r.courierCode!, name: r.courierName, parcels: 0, cod: 0, expectedNet: 0, received: 0, short: 0, overCharge: 0, unpaid: 0, unpaidValue: 0 };
      c.parcels++; c.cod += r.cod; c.expectedNet += r.expectedNet; c.received += r.received ?? 0; c.short += r.short; c.overCharge += r.overCharge;
      if (!r.paid) { c.unpaid++; c.unpaidValue += r.cod; }
      byCourier.set(c.code, c);
    }
    return {
      from: fromKey, to: toKey,
      totals: {
        parcels: list.length, cod: sum((r) => r.cod), expectedNet: sum((r) => r.expectedNet), received: sum((r) => r.received ?? 0),
        short: sum((r) => r.short), shortCount: list.filter((r) => r.short > 0).length,
        overCharge: sum((r) => r.overCharge), overChargeCount: list.filter((r) => r.overCharge > 0).length,
        unpaid: list.filter((r) => !r.paid).length, unpaidValue: sum((r) => (r.paid ? 0 : r.cod)),
        notInStatement: list.filter((r) => r.paid && !r.inStatement).length,
        late: list.filter((r) => (r.waitingDays ?? 0) > 10).length,
        rateCardMissing: [...new Set(list.filter((r) => !settings.couriers[r.courierCode!]).map((r) => r.courierCode!))],
      },
      couriers: [...byCourier.values()].map((c) => ({ ...c, cod: Math.round(c.cod), expectedNet: Math.round(c.expectedNet), received: Math.round(c.received), short: Math.round(c.short), overCharge: Math.round(c.overCharge), unpaidValue: Math.round(c.unpaidValue) })),
      rows: list,
    };
  }

  // ─── Pakistan Post ───────────────────────────────────────────

  async postOffice(user: AuthenticatedUser, scope: ShopScope) {
    const base: Prisma.ChannelOrderWhereInput = { tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any) };
    const select = {
      id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerPhone: true, customerAddress: true, customerCity: true,
      total: true, paymentStatus: true, metadata: true, items: true, weightKg: true, orderStatus: true, trackingNumber: true, courierCode: true, dispatchedAt: true, acceptedAt: true,
    } as const;
    const [marked, candidates] = await Promise.all([
      this.prisma.channelOrder.findMany({
        where: { ...base, courierCode: PAKPOST, orderStatus: { notIn: ['CANCELLED', 'REJECTED', 'RETURNED'] }, OR: [{ trackingNumber: null }, { orderStatus: { not: 'DELIVERED' } }] },
        select, orderBy: { acceptedAt: 'asc' }, take: 500,
      }),
      this.prisma.channelOrder.findMany({
        where: { ...base, nafaaSaleId: { not: null }, orderStatus: { in: ['CONFIRMED', 'PREPARING', 'READY'] }, trackingNumber: null, dispatchedAt: null, OR: [{ courierCode: null }, { courierCode: { notIn: [PAKPOST] } }] },
        select, orderBy: { acceptedAt: 'asc' }, take: 300,
      }),
    ]);
    const view = (o: (typeof marked)[number]) => ({
      id: o.id, number: orderNo(o), customerName: o.customerName, customerPhone: o.customerPhone, address: o.customerAddress, city: o.customerCity,
      cod: codOf(o), total: Number(o.total), orderStatus: o.orderStatus, article: o.trackingNumber, weightKg: o.weightKg,
      items: (Array.isArray(o.items) ? (o.items as any[]) : []).map((i) => `${Number(i?.quantity) || 1} x ${String(i?.name ?? 'Item')}`).join(', ').slice(0, 200),
      trackUrl: o.trackingNumber ? pakPostTrackUrl(o.trackingNumber) : null, dispatchedAt: o.dispatchedAt,
    });
    return {
      toBook: marked.filter((o) => !o.trackingNumber).map(view),
      sent: marked.filter((o) => !!o.trackingNumber).map(view),
      candidates: candidates.filter((o) => !isTest(o.metadata)).map(view),
    };
  }

  /** Marks accepted orders to go by Pakistan Post (or takes the mark off). */
  async markPost(user: AuthenticatedUser, scope: ShopScope, body: { ids?: string[]; on?: boolean }) {
    const ids = [...new Set(body?.ids ?? [])].slice(0, 300);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const on = body?.on !== false;
    const r = await this.prisma.channelOrder.updateMany({
      where: {
        id: { in: ids }, tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any), trackingNumber: null, dispatchedAt: null,
        ...(on ? { orderStatus: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } } : { courierCode: PAKPOST }),
      },
      data: on ? { courierCode: PAKPOST, courierName: courierName(PAKPOST) } : { courierCode: null, courierName: null },
    });
    return { updated: r.count, skipped: ids.length - r.count };
  }

  /**
   * Article numbers from the post office receipt. Each order gets its
   * article as the tracking number; with `dispatch` it also moves to
   * Dispatched (the parcel is with the post office).
   */
  async articles(user: AuthenticatedUser, scope: ShopScope, body: { items?: Array<{ id?: string; article?: string }>; dispatch?: boolean }) {
    const items = (Array.isArray(body?.items) ? body.items : [])
      .map((i) => ({ id: String(i?.id ?? ''), article: String(i?.article ?? '').toUpperCase().replace(/\s+/g, '').slice(0, 40) }))
      .filter((i) => i.id && i.article).slice(0, 300);
    if (!items.length) throw new BadRequestException('Koi article number nahi');
    const dupes = items.filter((i, n) => items.findIndex((x) => x.article === i.article) !== n).map((i) => i.article);
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const it of items) {
      if (dupes.includes(it.article)) { results.push({ id: it.id, ok: false, error: apiMessage('Article {{article}} do orders par', { article: it.article }).message }); continue; }
      const o = await this.prisma.channelOrder.findFirst({
        where: { id: it.id, tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any) },
        select: { id: true, orderStatus: true, nafaaSaleId: true, dispatchedAt: true },
      });
      if (!o) { results.push({ id: it.id, ok: false, error: 'Order nahi mila' }); continue; }
      if (CLOSED.includes(o.orderStatus) || o.orderStatus === 'DELIVERED') { results.push({ id: it.id, ok: false, error: 'Band ya deliver ho chuka order' }); continue; }
      try {
        if (body?.dispatch && o.nafaaSaleId && !o.dispatchedAt && o.orderStatus !== 'OUT_FOR_DELIVERY') {
          await this.orders.move(user, scope, o.id, { to: 'DISPATCHED', trackingNumber: it.article, courierCode: PAKPOST, reason: 'Pakistan Post' });
        } else {
          await this.prisma.channelOrder.update({ where: { id: o.id }, data: { trackingNumber: it.article, courierCode: PAKPOST, courierName: courierName(PAKPOST) } });
        }
        results.push({ id: it.id, ok: true });
      } catch (e) {
        results.push({ id: it.id, ok: false, error: errText(e) });
      }
    }
    return { done: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }
}
