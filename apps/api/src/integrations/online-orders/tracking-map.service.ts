import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { periodRange } from '../../modules/inventory/taxonomy/taxonomy.helper';
import { TrackEvent } from './courier-api/tracking-events';
import { courierName } from './couriers';
import { advancePaid } from './payment-links.service';
import { OrderToolsService } from './order-tools.service';
import { OnlineOrdersService } from './online-orders.service';
import { appendTimeline } from './order-metadata';
import { boardOf } from './order-board';
import { PARCEL_STATES, ParcelState, failedAttempts, journeyOf, lastSeenCity, mapCities, parcelState } from './tracking-map';
import { cityLabel, matchCity } from './pk-cities';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const OPEN_SENT = ['CONFIRMED', 'PREPARING', 'READY'];
const MAX_PARCELS = 3000;

const eventsOf = (meta: unknown): TrackEvent[] => {
  const ev = (meta as any)?.courierTrail?.events;
  return Array.isArray(ev) ? ev : [];
};
const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');

/**
 * Live parcel map (/online-orders/tracking) and the per-order journey. Reads
 * the courier events the status sync already saves on each order
 * (courierTrail.events); it never calls a courier itself.
 */
@Injectable()
export class TrackingMapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly tools: OrderToolsService,
    private readonly orders: OnlineOrdersService,
  ) {}

  /** The shop's own city, from the dispatch return address or the business address. */
  async originCity(tenantId: string): Promise<string | null> {
    const [dispatch, tenant] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: `dispatch_settings:${tenantId}` } }).catch(() => null),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { address: true } }).catch(() => null),
    ]);
    let ret = '';
    try { ret = String(JSON.parse(dispatch?.value ?? '{}')?.returnAddress ?? ''); } catch { /* bad setting: use the business address */ }
    return matchCity(ret)?.name ?? matchCity(tenant?.address)?.name ?? null;
  }

  async map(user: AuthenticatedUser, scope: ShopScope, q: { courier?: string; status?: string; from?: string; to?: string; integrationId?: string; by?: string }) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const todayKey = businessDayKey(new Date(), tz, dayStartHour);
    const today = await periodRange(this.tz, user.tenantId, todayKey, todayKey);
    const sentRange = q.from && q.to && DAY_KEY.test(q.from) && DAY_KEY.test(q.to) ? await periodRange(this.tz, user.tenantId, q.from, q.to) : null;
    if (sentRange && q.from! > q.to!) throw new BadRequestException('Date sahi nahi');
    const status = q.status && (PARCEL_STATES as readonly string[]).includes(q.status) ? (q.status as ParcelState) : null;
    const by = q.by === 'seen' ? 'seen' : 'destination';

    const and: Prisma.ChannelOrderWhereInput[] = [{
      OR: [
        { orderStatus: 'OUT_FOR_DELIVERY' },
        { orderStatus: { in: OPEN_SENT }, courierBookedAt: { not: null }, NOT: { courierStatus: 'CANCELLED' } },
        { orderStatus: 'DELIVERED', deliveredAt: today },
      ],
    }];
    if (sentRange) and.push({ OR: [{ dispatchedAt: sentRange }, { dispatchedAt: null, courierBookedAt: sentRange }] });
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any), AND: and,
        ...(q.courier ? { courierCode: String(q.courier).toUpperCase() } : {}),
        ...(q.integrationId ? { integrationId: q.integrationId } : {}),
      },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerPhone: true, customerCity: true, total: true,
        paymentStatus: true, orderStatus: true, courierStatus: true, courierCode: true, trackingNumber: true, dispatchedAt: true,
        courierBookedAt: true, deliveredAt: true, metadata: true, stage: true, integrationId: true,
      },
      orderBy: { dispatchedAt: 'asc' },
      take: MAX_PARCELS,
    });

    const now = Date.now();
    const parcels = rows.filter((r) => !(r.metadata as any)?.test).map((r) => {
      const events = eventsOf(r.metadata);
      const state = parcelState({ orderStatus: r.orderStatus, courierStatus: r.courierStatus, dispatchedAt: r.dispatchedAt, courierBookedAt: r.courierBookedAt, events }, now);
      if (!state) return null;
      const seen = lastSeenCity(events);
      const last = events[events.length - 1] ?? null;
      const sent = r.dispatchedAt ?? r.courierBookedAt;
      const meta = (r.metadata ?? {}) as any;
      return {
        id: r.id, number: orderNo(r), customerName: r.customerName, customerPhone: r.customerPhone,
        city: cityLabel(r.customerCity), cityRaw: r.customerCity, destination: matchCity(r.customerCity)?.name ?? null,
        seen: seen?.name ?? null, seenKnown: !!seen?.city, state,
        courierCode: r.courierCode, courierName: courierName(r.courierCode), trackingNumber: r.trackingNumber,
        lastEvent: last?.text ?? meta.courierTrail?.label ?? null, lastAt: last?.at ?? meta.courierTrail?.at ?? null,
        rider: [...events].reverse().find((e) => e.rider)?.rider ?? null,
        daysOut: sent ? Math.floor((now - sent.getTime()) / 86_400_000) : null,
        attempts: failedAttempts(events),
        cod: r.paymentStatus === 'PAID' ? 0 : Math.max(0, Math.round(Number(r.total) - advancePaid(r.metadata))),
        stage: r.stage, integrationId: r.integrationId,
        reattemptAsked: Array.isArray(meta.reattemptAsks) && meta.reattemptAsks.length > 0,
      };
    }).filter((p): p is NonNullable<typeof p> => !!p);

    const counts = Object.fromEntries(PARCEL_STATES.map((s) => [s, parcels.filter((p) => p.state === s).length])) as Record<ParcelState, number>;
    const shown = status ? parcels.filter((p) => p.state === status) : parcels;
    const grouped = mapCities(shown.map((p) => ({ id: p.id, state: p.state, destination: p.cityRaw, seen: p.seen })), by);
    const attention = (s: ParcelState) => parcels.filter((p) => p.state === s).sort((a, b) => (b.daysOut ?? 0) - (a.daysOut ?? 0)).slice(0, 60);
    const origin = await this.originCity(user.tenantId);
    const o = matchCity(origin);
    const couriers = [...new Set(parcels.map((p) => p.courierCode).filter(Boolean) as string[])].map((c) => ({ code: c, name: courierName(c) }));
    return {
      at: new Date().toISOString(),
      by,
      counts,
      total: parcels.length,
      cities: grouped.cities,
      unplaced: grouped.unplaced,
      noCity: grouped.noCity,
      origin: o ? { name: o.name, lat: o.lat, lng: o.lng } : null,
      couriers,
      parcels: shown.slice(0, 1500).map(({ cityRaw: _raw, ...p }) => p),
      attention: { stuck: attention('STUCK'), failed: attention('FAILED'), returning: attention('RETURNING') },
      capped: rows.length >= MAX_PARCELS,
    };
  }

  /** The order's journey: steps, cities passed and where it was last seen. */
  async journey(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const o = await this.prisma.channelOrder.findFirst({
      where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) },
      select: {
        id: true, orderStatus: true, customerCity: true, courierCode: true, trackingNumber: true, courierBookedAt: true, dispatchedAt: true,
        deliveredAt: true, returnedAt: true, metadata: true, courierStatus: true,
      },
    });
    if (!o) throw new NotFoundException('Order nahi mila');
    const shipment = await this.prisma.courierShipment.findUnique({ where: { orderId: o.id }, select: { originCity: true, events: true } }).catch(() => null);
    const events = eventsOf(o.metadata).length ? eventsOf(o.metadata) : (Array.isArray(shipment?.events) ? (shipment!.events as unknown as TrackEvent[]) : []);
    const j = journeyOf({
      events, orderStatus: o.orderStatus, bookedAt: o.courierBookedAt, dispatchedAt: o.dispatchedAt, deliveredAt: o.deliveredAt, returnedAt: o.returnedAt,
      originCity: shipment?.originCity ?? (await this.originCity(user.tenantId)), destinationCity: o.customerCity,
    });
    return {
      ...j,
      courierCode: o.courierCode, courierName: courierName(o.courierCode), trackingNumber: o.trackingNumber,
      syncedAt: (o.metadata as any)?.courierTrail?.at ?? null,
      hasCourier: !!o.trackingNumber,
    };
  }

  /**
   * "Please try again" for a failed delivery: kept as a note and on the
   * timeline, with the text to send the courier. Courier APIs here have no
   * re-attempt call, so the shop passes it on (portal, WhatsApp or phone).
   */
  async reattempt(user: AuthenticatedUser, scope: ShopScope, id: string, body: { note?: string }) {
    const o = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any) } });
    if (!o) throw new NotFoundException('Order nahi mila');
    if (!o.trackingNumber) throw new BadRequestException('Is order ka CN nahi — courier ko darkhwast kis parcel ki?');
    const extra = String(body?.note ?? '').trim().slice(0, 200);
    const text = `Re-attempt request: CN ${o.trackingNumber}, ${o.customerName}${o.customerPhone ? ` ${o.customerPhone}` : ''}, ${o.customerCity ?? ''}.${extra ? ` ${extra}` : ''}`.replace(/\s+/g, ' ').trim();
    await this.tools.addNote(user, scope, id, text);
    const meta = ((await this.prisma.channelOrder.findUnique({ where: { id }, select: { metadata: true } }))?.metadata ?? {}) as any;
    const asks = [...(Array.isArray(meta.reattemptAsks) ? meta.reattemptAsks : []), { at: new Date().toISOString(), by: user.id, note: extra || null }].slice(-10);
    await this.prisma.channelOrder.update({ where: { id }, data: { metadata: { ...meta, reattemptAsks: asks } } });
    await appendTimeline(this.prisma, id, { at: new Date().toISOString(), by: user.id, byName: null, from: boardOf(o), to: 'REATTEMPT', note: extra || null });
    return { ok: true, text, order: await this.orders.view(id) };
  }
}
