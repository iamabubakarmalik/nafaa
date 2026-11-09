import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { periodRange } from '../../modules/inventory/taxonomy/taxonomy.helper';
import { TrackEvent } from './courier-api/tracking-events';
import { COURIER_APIS } from './courier-api/registry';
import { courierName } from './couriers';
import { orderCosts } from './order-costs';
import { OrderCostsService, assertManager, costOrderOf } from './order-costs.service';
import { CourierRulesService } from './courier-rules.service';
import { CourierRule, emptyRules } from './courier-rules';
import { advancePaid } from './payment-links.service';
import { ScoreParcel, bestByCity, scorecard } from './courier-score';
import { failedAttempts, parcelState } from './tracking-map';
import { cityLabel, sameCity } from './pk-cities';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** COD counts as paid on time when it arrives within this many days of delivery. */
export const COD_ON_TIME_DAYS = 7;
const BEST_PREFIX = 'best-';
const MAX_ROWS = 20_000;

/**
 * Multi-courier scorecard (/online-orders/couriers-score) and the "best
 * courier per city" feed to auto booking. Numbers come from the shop's own
 * parcels; charges from saved costs, else the rate card.
 */
@Injectable()
export class CourierScoreService {
  private readonly bestCache = new Map<string, { at: number; cities: ReturnType<typeof scorecard>['cities'] }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly costs: OrderCostsService,
    private readonly rules: CourierRulesService,
  ) {}

  private async parcels(tenantId: string, scope: ShopScope | null, range: { gte: Date; lt: Date }): Promise<{ rows: ScoreParcel[]; capped: boolean }> {
    const [settings, list] = await Promise.all([
      this.costs.settings(tenantId),
      this.prisma.channelOrder.findMany({
        where: {
          tenantId, deletedAt: null, ...((scope?.whereLoose ?? {}) as any),
          dispatchedAt: range,
          courierCode: { notIn: ['RIDER', 'OTHER'] },
          NOT: { courierCode: null },
          orderStatus: { notIn: ['CANCELLED', 'REJECTED', 'PENDING', 'ACCEPTING'] },
        },
        select: {
          id: true, orderStatus: true, courierCode: true, customerCity: true, integrationId: true, dispatchedAt: true, deliveredAt: true, total: true,
          metadata: true, paymentStatus: true, courierCharge: true, codFee: true, gatewayFee: true, packagingCost: true, rtoCost: true,
          codSettledAt: true, courierStatus: true, courierBookedAt: true, stage: true,
        },
        take: MAX_ROWS,
      }),
    ]);
    const now = Date.now();
    const rows = list.filter((r) => !(r.metadata as any)?.test).map((r): ScoreParcel => {
      const meta = (r.metadata ?? {}) as any;
      const events: TrackEvent[] = Array.isArray(meta.courierTrail?.events) ? meta.courierTrail.events : [];
      const c = orderCosts(costOrderOf(r), settings);
      const cost = c.courierCharge.value + c.codFee.value + c.rtoCost.value;
      return {
        courier: r.courierCode!,
        city: cityLabel(r.customerCity),
        outcome: r.orderStatus === 'DELIVERED' ? 'DELIVERED' : r.orderStatus === 'RETURNED' ? 'RETURNED' : 'OPEN',
        sentAt: r.dispatchedAt!,
        deliveredAt: r.deliveredAt,
        attempts: events.length ? failedAttempts(events) : null,
        stuck: parcelState({ orderStatus: r.orderStatus, courierStatus: r.courierStatus, dispatchedAt: r.dispatchedAt, courierBookedAt: r.courierBookedAt, events }, now) === 'STUCK',
        cod: meta.cod && r.paymentStatus !== 'PAID' ? Math.max(0, Number(r.total) - advancePaid(meta)) : meta.cod ? Number(r.total) : 0,
        codSettledAt: r.codSettledAt,
        cost: cost > 0 ? cost : null,
        claim: (!!meta.claim && meta.claim.status !== 'REJECTED') || r.stage === 'CLAIM',
      };
    });
    return { rows, capped: list.length >= MAX_ROWS };
  }

  private async connected(tenantId: string) {
    const configs = await this.prisma.courierConfig.findMany({ where: { tenantId, isActive: true }, select: { provider: true } });
    return configs.map((c) => c.provider as string).filter((c) => !!COURIER_APIS[c]);
  }

  async score(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string }) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const toKey = q.to && DAY_KEY.test(q.to) ? q.to : today;
    const fromKey = q.from && DAY_KEY.test(q.from) ? q.from : (() => {
      const [y, m, d] = toKey.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d - 89)).toISOString().slice(0, 10);
    })();
    if (fromKey > toKey) throw new BadRequestException('Date sahi nahi');
    const range = await periodRange(this.tz, user.tenantId, fromKey, toKey);
    const [{ rows, capped }, connected, saved] = await Promise.all([this.parcels(user.tenantId, scope, range), this.connected(user.tenantId), this.rules.saved(user.tenantId)]);
    const card = scorecard(rows, {}, { fallbackCycle: COD_ON_TIME_DAYS });
    const applied = (saved?.rules ?? []).filter((r) => r.id.startsWith(BEST_PREFIX)).map((r) => ({ city: r.cities[0] ?? '', courier: r.courier }));
    return {
      from: fromKey, to: toKey, onTimeDays: COD_ON_TIME_DAYS, sample: rows.length, capped,
      couriers: card.couriers.map((c) => ({ ...c, name: courierName(c.code), connected: connected.includes(c.code) })),
      bestOverall: card.bestOverall,
      cities: card.cities.map((c) => ({ ...c, bestName: courierName(c.best), runnerUpName: courierName(c.runnerUp), bookable: !!c.best && connected.includes(c.best) })),
      connected,
      autoBooking: { trigger: saved?.trigger ?? 'OFF', applied },
    };
  }

  /** Best courier per city over the last 180 days (cached 10 minutes per shop). */
  private async cityBest(tenantId: string) {
    const hit = this.bestCache.get(tenantId);
    if (hit && Date.now() - hit.at < 10 * 60_000) return hit.cities;
    const lt = new Date();
    const { rows } = await this.parcels(tenantId, null, { gte: new Date(lt.getTime() - 180 * 86_400_000), lt });
    const cities = scorecard(rows, {}, { fallbackCycle: COD_ON_TIME_DAYS }).cities;
    this.bestCache.set(tenantId, { at: Date.now(), cities });
    return cities;
  }

  /** The best bookable courier for a city, or null when the shop's history cannot tell yet. */
  async bestFor(tenantId: string, city: string | null): Promise<string | null> {
    if (!city) return null;
    const [cities, connected] = await Promise.all([this.cityBest(tenantId), this.connected(tenantId)]);
    const row = cities.find((c) => sameCity(c.city, city));
    return row?.couriers.find((x) => x.best && connected.includes(x.code))?.code ?? null;
  }

  /**
   * Writes one auto-booking rule per city ("Lahore → TCS") from the best
   * bookable courier, above the shop's own rules. Rules written before by
   * this button are replaced; the shop's own rules and the on/off switch
   * stay as they are.
   */
  async applyBest(user: AuthenticatedUser, body: { cities?: string[] }) {
    assertManager(user);
    this.bestCache.delete(user.tenantId);
    const [cities, connected, current] = await Promise.all([this.cityBest(user.tenantId), this.connected(user.tenantId), this.rules.get(user)]);
    const wanted = Array.isArray(body?.cities) && body.cities.length ? body.cities.map(String) : null;
    const map = bestByCity(cities.filter((c) => !wanted || wanted.some((w) => sameCity(w, c.city))), connected);
    const own = (current.rules.rules ?? []).filter((r) => !r.id.startsWith(BEST_PREFIX));
    const room = Math.max(0, 30 - own.length);
    const fresh: CourierRule[] = Object.entries(map).slice(0, room).map(([city, courier], i) => ({
      id: `${BEST_PREFIX}${i + 1}`, cities: [city], codMin: null, codMax: null, risks: [], channelIds: [], action: 'BOOK', courier,
    }));
    const base = current.saved ? current.rules : { ...emptyRules(), ...current.rules };
    await this.rules.save(user, { ...base, rules: [...fresh, ...own] });
    return { applied: fresh.length, skipped: Object.keys(map).length - fresh.length, trigger: base.trigger, rules: fresh.map((r) => ({ city: r.cities[0], courier: r.courier, name: courierName(r.courier) })) };
  }
}
