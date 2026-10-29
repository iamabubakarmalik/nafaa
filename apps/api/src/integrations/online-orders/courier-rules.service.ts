import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { COURIERS, courierName } from './couriers';
import { COURIER_APIS } from './courier-api/registry';
import { CourierHistory, CourierRules, emptyRules, normalizeRules, rankCouriers } from './courier-rules';
import { OrderCostsService, assertManager, costOrderOf } from './order-costs.service';
import { orderCosts } from './order-costs';

const rulesKey = (tenantId: string) => `courier_rules:${tenantId}`;
const KNOWN = COURIERS.map((c) => c.code as string).filter((c) => c !== 'OTHER');
const cityKey = (s?: string | null) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');
const HISTORY_DAYS = 180;
/** A city needs this many finished parcels before its own numbers are used. */
const CITY_SAMPLE = 8;

/**
 * Courier auto-booking rules (saved per shop) and "best courier" suggestions
 * from the shop's own delivery history.
 *
 * Before a shop saves rules, the older per-courier "book on accept" switch
 * still works; the rules page starts from it, and saving rules switches it
 * off so only one of the two ever books.
 */
@Injectable()
export class CourierRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costs: OrderCostsService,
  ) {}

  /** Saved rules, or null when the shop never saved any. */
  async saved(tenantId: string): Promise<CourierRules | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: rulesKey(tenantId) } });
    if (!row) return null;
    try { return normalizeRules(JSON.parse(row.value), KNOWN); } catch { return emptyRules(); }
  }

  async get(user: AuthenticatedUser) {
    const [saved, configs] = await Promise.all([
      this.saved(user.tenantId),
      this.prisma.courierConfig.findMany({ where: { tenantId: user.tenantId }, select: { provider: true, isActive: true, settings: true } }),
    ]);
    const legacy = configs.find((c) => c.isActive && String((c.settings as any)?.autoBook) === 'true')?.provider ?? null;
    const rules = saved ?? (legacy ? { ...emptyRules(), trigger: 'ACCEPT' as const, fallback: legacy } : emptyRules());
    return {
      rules,
      saved: !!saved,
      couriers: COURIERS.filter((c) => c.code !== 'OTHER' && c.code !== 'RIDER').map((c) => ({
        code: c.code, name: c.name,
        api: !!COURIER_APIS[c.code],
        connected: configs.some((x) => x.provider === c.code && x.isActive) && !!COURIER_APIS[c.code],
      })),
    };
  }

  async save(user: AuthenticatedUser, body: unknown) {
    assertManager(user);
    const rules = normalizeRules(body, KNOWN);
    const value = JSON.stringify(rules);
    await this.prisma.systemSetting.upsert({
      where: { key: rulesKey(user.tenantId) },
      create: { key: rulesKey(user.tenantId), value, category: 'online_orders', isPublic: false },
      update: { value },
    });
    // The older single-courier switch gives way to the rules.
    const old = await this.prisma.courierConfig.findMany({ where: { tenantId: user.tenantId } });
    for (const c of old.filter((x) => String((x.settings as any)?.autoBook) === 'true')) {
      await this.prisma.courierConfig.update({ where: { id: c.id }, data: { settings: { ...((c.settings as any) ?? {}), autoBook: null } } });
    }
    return this.get(user);
  }

  /**
   * Couriers ranked for an order's city by the shop's last 180 days: parcels
   * sent, delivered and returned, and the average charge (saved, else the
   * rate card). Falls back to every city when the city has few parcels.
   */
  async suggest(user: AuthenticatedUser, scope: ShopScope, orderId: string) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id: orderId, tenantId: user.tenantId, ...(scope.whereLoose as any) },
      select: { id: true, customerCity: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    const [settings, all] = await Promise.all([
      this.costs.settings(user.tenantId),
      this.prisma.channelOrder.findMany({
        where: {
          tenantId: user.tenantId,
          courierCode: { notIn: ['RIDER', 'OTHER'] },
          dispatchedAt: { gte: new Date(Date.now() - HISTORY_DAYS * 86_400_000) },
          orderStatus: { in: ['DELIVERED', 'RETURNED'] },
        },
        select: {
          id: true, orderStatus: true, courierCode: true, customerCity: true, integrationId: true, dispatchedAt: true, total: true, metadata: true,
          paymentStatus: true, courierCharge: true, codFee: true, gatewayFee: true, packagingCost: true, rtoCost: true,
        },
        take: 20_000,
      }),
    ]);
    const k = cityKey(order.customerCity);
    const rows = all.filter((r) => !(r.metadata as any)?.test);
    const inCity = k ? rows.filter((r) => cityKey(r.customerCity) === k) : [];
    const basis = inCity.length >= CITY_SAMPLE ? 'CITY' : 'ALL';
    const use = basis === 'CITY' ? inCity : rows;
    const by = new Map<string, CourierHistory>();
    for (const r of use) {
      const h = by.get(r.courierCode!) ?? { code: r.courierCode!, sent: 0, delivered: 0, returned: 0, chargeSum: 0, chargeCount: 0 };
      h.sent++;
      if (r.orderStatus === 'DELIVERED') h.delivered++; else h.returned++;
      // Forward charge only, so returned parcels do not make a courier look dear.
      const charge = orderCosts(costOrderOf({ ...r, orderStatus: 'DELIVERED' }), settings).courierCharge;
      if (charge.value > 0) { h.chargeSum += charge.value; h.chargeCount++; }
      by.set(r.courierCode!, h);
    }
    const ranked = rankCouriers([...by.values()]);
    return {
      city: order.customerCity,
      basis,
      sample: use.length,
      couriers: ranked.map((r) => ({ ...r, name: courierName(r.code) })),
    };
  }
}
