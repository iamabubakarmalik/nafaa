import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ChannelOrder, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { ExpensesService } from '../../modules/finance/expenses/expenses.service';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { periodRange } from '../../modules/inventory/taxonomy/taxonomy.helper';
import { KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REVENUE, billMathCte } from '../../common/helpers/business-math.helper';
import { COURIERS, courierName } from './couriers';
import { paidAdvance } from './order-money';
import { shopDue } from './shop-due';
import {
  BillPart, COST_KINDS, COST_LABEL, CostKind, CostOrder, CostSource, OrderCostSettings, OrderCosts, normalizeCostSettings, orderCosts, orderProfit,
  postableCosts, r2,
} from './order-costs';
import { OrderStatusEvent, orderEvents } from './order-events';

const settingKey = (tenantId: string) => `online_order_costs:${tenantId}`;
const CATEGORY = 'Online selling costs';
/** Expense.sourceType of a posted order's selling costs; sourceId is the order id. */
export const ORDER_COSTS_SOURCE = 'ONLINE_ORDER_COSTS';
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const POST_ON = ['DELIVERED', 'RETURNED', 'SETTLED'];

type CostRow = Pick<ChannelOrder, 'id' | 'orderStatus' | 'courierCode' | 'customerCity' | 'integrationId' | 'dispatchedAt' | 'total' | 'metadata'
  | 'paymentStatus' | 'courierCharge' | 'codFee' | 'gatewayFee' | 'packagingCost' | 'rtoCost'>;

const COST_SELECT = {
  id: true, orderStatus: true, courierCode: true, customerCity: true, integrationId: true, dispatchedAt: true, total: true, metadata: true,
  paymentStatus: true, courierCharge: true, codFee: true, gatewayFee: true, packagingCost: true, rtoCost: true,
} as const;

/** The pure cost inputs of an order row. */
export function costOrderOf(o: CostRow): CostOrder {
  const meta = (o.metadata ?? {}) as any;
  const links = (Array.isArray(meta.payments) ? meta.payments : []).filter((p: any) => p?.status === 'PAID' && p?.provider !== 'MANUAL');
  const isCod = !!meta.cod;
  return {
    orderStatus: o.orderStatus,
    isCod,
    courierCode: o.courierCode,
    customerCity: o.customerCity,
    integrationId: o.integrationId,
    dispatched: !!o.dispatchedAt,
    weightKg: Number(meta.courierBooking?.weightKg) || null,
    codAmount: isCod ? Math.max(0, shopDue(o) - paidAdvance(meta)) : 0,
    links,
    saved: { courierCharge: o.courierCharge, codFee: o.codFee, gatewayFee: o.gatewayFee, packagingCost: o.packagingCost, rtoCost: o.rtoCost },
    sources: (meta.costSources ?? {}) as Partial<Record<CostKind, CostSource>>,
  };
}

/**
 * Selling costs of online orders: the shop's rates, each order's costs and
 * true profit, the online profit report, and the expense that carries an
 * order's costs into the P&L.
 *
 * Posting: when the shop has "post to expenses" on, an order's costs are
 * written as one PAID expense in the "Online selling costs" category once the
 * order is delivered or returned, and its amount follows later actual figures
 * (a settlement statement, a correction by hand). The expense is marked with
 * sourceType ONLINE_ORDER_COSTS and the order id, and the order keeps
 * `costsPostedAt`, so it is never written twice. Method is bank transfer:
 * couriers take their charges out of the COD remittance, so the drawer is
 * never touched. An expense the shop deleted is not written again.
 */
@Injectable()
export class OrderCostsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderCostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private readonly onStatus = (e: OrderStatusEvent) => {
    if (!POST_ON.includes(e.status)) return;
    this.post(e.tenantId, e.orderId).catch((err) => this.logger.warn(`Order costs ${e.orderId}: ${(err as Error).message}`));
  };

  onModuleInit() { orderEvents.on('status', this.onStatus); }
  onModuleDestroy() { orderEvents.off('status', this.onStatus); }

  // ═══════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════

  async settings(tenantId: string): Promise<OrderCostSettings & { chosen: boolean }> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: settingKey(tenantId) } });
    let raw: unknown = null;
    try { raw = row?.value ? JSON.parse(row.value) : null; } catch { raw = null; }
    // No row: a shop created after the feature, so posting starts on.
    return { ...normalizeCostSettings(raw, true), chosen: !!row };
  }

  async getSettings(user: AuthenticatedUser) {
    const [s, channels] = await Promise.all([
      this.settings(user.tenantId),
      this.prisma.integration.findMany({ where: { tenantId: user.tenantId }, select: { id: true, type: true, displayName: true, config: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    return {
      settings: s,
      channels: channels.map((c) => ({ id: c.id, type: c.type, displayName: c.displayName, platform: (c.config as any)?.platform ?? null })),
      couriers: COURIERS.filter((c) => c.code !== 'RIDER' && c.code !== 'OTHER').map((c) => ({ code: c.code, name: c.name })),
    };
  }

  async saveSettings(user: AuthenticatedUser, body: unknown) {
    assertManager(user);
    const before = await this.settings(user.tenantId);
    const next = normalizeCostSettings({ ...before, ...((body && typeof body === 'object') ? body : {}) }, before.postExpenses);
    const value = JSON.stringify(next);
    await this.prisma.systemSetting.upsert({
      where: { key: settingKey(user.tenantId) },
      create: { key: settingKey(user.tenantId), value, category: 'online_orders', isPublic: false },
      update: { value },
    });
    return { settings: { ...next, chosen: true } };
  }

  // ═══════════════════════════════════════════════════════════
  // ONE ORDER
  // ═══════════════════════════════════════════════════════════

  /** Bill net, cost and delivery charge of live bills, by sale id. */
  async billParts(saleIds: string[]): Promise<Map<string, BillPart>> {
    const out = new Map<string, BillPart>();
    const ids = [...new Set(saleIds.filter(Boolean))];
    for (let i = 0; i < ids.length; i += 2000) {
      const chunk = ids.slice(i, i + 2000);
      const where = Prisma.sql`s.id IN (${Prisma.join(chunk)}) AND s.status::text <> 'VOIDED'`;
      const rows = await this.prisma.$queryRaw<Array<{ id: string; net: number; cost: number; delivery: number }>>`
        WITH ${billMathCte(where)}
        SELECT s.id, (s.total - s."refundedAmount")::float8 AS net, bm.cost::float8 AS cost, s."serviceCharges"::float8 AS delivery
        FROM "Sale" s JOIN bm ON bm.id = s.id
        WHERE ${where}`;
      for (const r of rows) out.set(r.id, { net: Number(r.net) || 0, cost: Number(r.cost) || 0, delivery: Number(r.delivery) || 0 });
    }
    return out;
  }

  /** Costs and true profit of one order, for the order panel. */
  async forOrder(tenantId: string, order: CostRow & { nafaaSaleId: string | null; costsPostedAt: Date | null }) {
    const s = await this.settings(tenantId);
    const costs = orderCosts(costOrderOf(order), s);
    const bill = order.nafaaSaleId ? (await this.billParts([order.nafaaSaleId])).get(order.nafaaSaleId) ?? null : null;
    const meta = (order.metadata ?? {}) as any;
    return {
      costs,
      profit: orderProfit(bill, costs),
      posting: {
        on: s.postExpenses,
        postedAt: order.costsPostedAt,
        expenseNumber: meta.costExpense?.number ?? null,
      },
      rateMissing: costs.courierMissing,
    };
  }

  /** Costs typed by hand on the order panel. An empty value clears that cost back to the rate card. */
  async setCosts(user: AuthenticatedUser, scope: ShopScope, id: string, body: Partial<Record<CostKind, number | string | null>>) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, tenantId: user.tenantId, ...(scope.whereLoose as any) }, select: { id: true, metadata: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    const values: Partial<Record<CostKind, number | null>> = {};
    for (const k of COST_KINDS) {
      if (!(k in (body ?? {}))) continue;
      const v = body[k];
      if (v === null || v === '') { values[k] = null; continue; }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new BadRequestException(`${COST_LABEL[k]} sahi amount nahi`);
      values[k] = r2(n);
    }
    if (!Object.keys(values).length) throw new BadRequestException('Koi cost nahi bheji');
    await this.saveCosts(order.id, values, 'MANUAL');
    await this.post(user.tenantId, order.id).catch((e) => this.logger.warn(`Order costs ${id}: ${(e as Error).message}`));
    const fresh = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id }, select: { ...COST_SELECT, nafaaSaleId: true, costsPostedAt: true } });
    return this.forOrder(user.tenantId, fresh);
  }

  /** Saves known costs on the order with where they came from. */
  async saveCosts(orderId: string, values: Partial<Record<CostKind, number | null>>, source: CostSource) {
    const row = await this.prisma.channelOrder.findUnique({ where: { id: orderId }, select: { metadata: true } });
    const meta = ((row?.metadata ?? {}) as any);
    const sources = { ...(meta.costSources ?? {}) };
    for (const k of Object.keys(values) as CostKind[]) {
      if (values[k] === null) delete sources[k];
      else sources[k] = source;
    }
    await this.prisma.channelOrder.update({ where: { id: orderId }, data: { ...values, metadata: { ...meta, costSources: sources } } });
  }

  // ═══════════════════════════════════════════════════════════
  // POSTING TO EXPENSES (P&L)
  // ═══════════════════════════════════════════════════════════

  /**
   * Writes (or brings up to date) the order's selling-cost expense. Safe to
   * call any number of times; does nothing while the shop has posting off,
   * before the order is delivered or returned, and for test orders.
   */
  async post(tenantId: string, orderId: string): Promise<{ posted: boolean; amount?: number; expenseNumber?: string }> {
    const s = await this.settings(tenantId);
    if (!s.postExpenses) return { posted: false };
    const order = await this.prisma.channelOrder.findFirst({
      where: { id: orderId, tenantId },
      select: { ...COST_SELECT, shopId: true, externalOrderNumber: true, externalOrderId: true, trackingNumber: true, costsPostedAt: true, deliveredAt: true, returnedAt: true },
    });
    if (!order || (order.metadata as any)?.test) return { posted: false };
    if (!['DELIVERED', 'RETURNED'].includes(order.orderStatus)) return { posted: false };
    const costs = orderCosts(costOrderOf(order), s);
    const { amount, parts } = postableCosts(costs);
    const num = String(order.externalOrderNumber ?? order.externalOrderId).replace(/^#+/, '');
    const title = `Order #${num}: ${parts.map((p) => `${COST_LABEL[p.kind]} ${Math.round(p.value)}`).join(' + ')}`.slice(0, 120);
    const description = [
      `Online order #${num}${order.orderStatus === 'RETURNED' ? ' (wapas aaya)' : ''}`,
      courierName(order.courierCode),
      order.trackingNumber ? `CN ${order.trackingNumber}` : null,
      costs.estimated ? 'kuch amount rate card se andaza' : null,
      'Nafaa ne khud likha (Selling costs setting)',
    ].filter(Boolean).join(' · ').slice(0, 500);
    const meta = (order.metadata ?? {}) as any;

    if (order.costsPostedAt) {
      const id = meta.costExpense?.id as string | undefined;
      const exp = id ? await this.prisma.expense.findFirst({ where: { id, tenantId }, select: { id: true, amount: true, status: true, expenseNumber: true } }) : null;
      // Deleted or cancelled by the shop: leave it that way.
      if (!exp || exp.status === 'CANCELLED') return { posted: false };
      if (Math.abs(exp.amount - amount) > 0.004) {
        await this.prisma.expense.update({ where: { id: exp.id }, data: { amount, title, description } });
        await this.freeze(order.id, costs);
      }
      return { posted: true, amount, expenseNumber: exp.expenseNumber };
    }
    if (!(amount > 0)) return { posted: false };

    // Claim the order first, so two events never write two expenses.
    const claim = await this.prisma.channelOrder.updateMany({ where: { id: order.id, costsPostedAt: null }, data: { costsPostedAt: new Date() } });
    if (!claim.count) return { posted: false };
    try {
      const twin = await this.prisma.expense.findFirst({ where: { tenantId, sourceType: ORDER_COSTS_SOURCE, sourceId: order.id }, select: { id: true, expenseNumber: true } });
      const exp = twin ?? await this.expenses.create(await this.actor(tenantId), new ShopScope(null, true), {
        title,
        description,
        amount,
        paymentMethod: 'BANK_TRANSFER',
        status: 'PAID',
        categoryId: await this.categoryId(tenantId),
        expenseDate: (order.orderStatus === 'RETURNED' ? order.returnedAt : order.deliveredAt)?.toISOString() ?? new Date().toISOString(),
        ...(order.shopId && { shopId: order.shopId }),
      } as any);
      if (!twin) await this.prisma.expense.update({ where: { id: exp.id }, data: { sourceType: ORDER_COSTS_SOURCE, sourceId: order.id } });
      await this.freeze(order.id, costs, { id: exp.id, number: exp.expenseNumber });
      return { posted: true, amount, expenseNumber: exp.expenseNumber };
    } catch (e) {
      await this.prisma.channelOrder.update({ where: { id: order.id }, data: { costsPostedAt: null } }).catch(() => null);
      throw e;
    }
  }

  /** Saves the posted values on the order, so a later rate change never moves a posted expense. */
  private async freeze(orderId: string, costs: OrderCosts, expense?: { id: string; number: string }) {
    const row = await this.prisma.channelOrder.findUnique({ where: { id: orderId }, select: { metadata: true } });
    const meta = ((row?.metadata ?? {}) as any);
    const sources = { ...(meta.costSources ?? {}) };
    const data: Partial<Record<CostKind, number>> = {};
    for (const k of COST_KINDS) {
      data[k] = costs[k].value;
      sources[k] = costs[k].source === 'ESTIMATE' || costs[k].source === 'NONE' ? 'ESTIMATE' : costs[k].source;
    }
    await this.prisma.channelOrder.update({
      where: { id: orderId },
      data: { ...data, metadata: { ...meta, costSources: sources, ...(expense && { costExpense: expense }) } },
    });
  }

  private async categoryId(tenantId: string) {
    const c = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: CATEGORY } },
      create: { tenantId, name: CATEGORY, color: '#0ea5e9', icon: 'truck' },
      update: { isActive: true },
      select: { id: true },
    });
    return c.id;
  }

  /** The shop owner, in whose name system expenses are written. */
  private async actor(tenantId: string): Promise<AuthenticatedUser> {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true, role: UserRole.OWNER },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true },
    });
    if (!owner) throw new BadRequestException('Dukaan ka koi active malik nahi mila');
    return { id: owner.id, sub: owner.id, tenantId, email: owner.email, role: owner.role, shopId: null, permissions: [] } as AuthenticatedUser;
  }

  // ═══════════════════════════════════════════════════════════
  // PROFIT REPORT
  // ═══════════════════════════════════════════════════════════

  /**
   * True profit of the period's online orders (received in the period, test
   * orders left out, only orders that got a bill), in total and by channel,
   * courier, city and product. Product rows split an order's delivery
   * charge and selling costs by each line's share of the order.
   */
  async profitReport(user: AuthenticatedUser, scope: ShopScope, q: { from?: string; to?: string; integrationId?: string }) {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const today = businessDayKey(new Date(), tz, dayStartHour);
    const to = q.to && DAY_KEY.test(q.to) ? q.to : today;
    const from = q.from && DAY_KEY.test(q.from) ? q.from : to.slice(0, 8) + '01';
    if (from > to) throw new BadRequestException('Date sahi nahi');
    const range = await periodRange(this.tz, user.tenantId, from, to);
    const [s, orders] = await Promise.all([
      this.settings(user.tenantId),
      this.prisma.channelOrder.findMany({
        where: {
          tenantId: user.tenantId, ...(scope.whereLoose as any), receivedAt: range, nafaaSaleId: { not: null },
          ...(q.integrationId ? { integrationId: q.integrationId } : {}),
        },
        select: { ...COST_SELECT, nafaaSaleId: true, items: true, integration: { select: { id: true, displayName: true, type: true } } },
        take: 30_000,
      }),
    ]);
    const live = orders.filter((o) => !(o.metadata as any)?.test);
    const bills = await this.billParts(live.map((o) => o.nafaaSaleId!));
    const lines = await this.productLines([...bills.keys()]);

    type Agg = { orders: number; sale: number; cost: number; deliveryCollected: number; profit: number; estimated: number } & Record<CostKind, number>;
    const blank = (): Agg => ({ orders: 0, sale: 0, cost: 0, deliveryCollected: 0, profit: 0, estimated: 0, courierCharge: 0, codFee: 0, gatewayFee: 0, packagingCost: 0, rtoCost: 0 });
    const add = (a: Agg, p: { sale: number; cost: number; deliveryCollected: number; profit: number }, c: Record<CostKind, number>, share = 1, count = 1, est = false) => {
      a.orders += count; a.sale += p.sale * share; a.cost += p.cost * share; a.deliveryCollected += p.deliveryCollected * share; a.profit += p.profit * share;
      for (const k of COST_KINDS) a[k] += c[k] * share;
      if (est) a.estimated += count;
    };
    const total = blank();
    const byChannel = new Map<string, Agg & { name: string; type: string }>();
    const byCourier = new Map<string, Agg & { code: string; name: string }>();
    const byCity = new Map<string, Agg & { city: string }>();
    const byProduct = new Map<string, Agg & { name: string; qty: number }>();
    const missingRates = new Set<string>();

    for (const o of live) {
      const costs = orderCosts(costOrderOf(o), s);
      if (costs.courierMissing && o.courierCode) missingRates.add(o.courierCode);
      const bill = bills.get(o.nafaaSaleId!) ?? null;
      const p = orderProfit(bill, costs);
      const c = Object.fromEntries(COST_KINDS.map((k) => [k, costs[k].value])) as Record<CostKind, number>;
      add(total, p, c, 1, 1, costs.estimated);
      const ch = byChannel.get(o.integrationId) ?? { ...blank(), name: o.integration.displayName, type: o.integration.type };
      add(ch, p, c, 1, 1, costs.estimated); byChannel.set(o.integrationId, ch);
      const code = o.courierCode ?? 'NONE';
      const co = byCourier.get(code) ?? { ...blank(), code, name: courierName(o.courierCode) ?? 'Courier nahi likha' };
      add(co, p, c, 1, 1, costs.estimated); byCourier.set(code, co);
      const cityName = (o.customerCity ?? '').trim();
      const ck = cityName.toLowerCase() || '—';
      const ci = byCity.get(ck) ?? { ...blank(), city: cityName || 'Shehar nahi likha' };
      add(ci, p, c, 1, 1, costs.estimated); byCity.set(ck, ci);

      // Product rows: the bill's lines; a returned parcel splits its costs by the order's items.
      const own = bill ? lines.get(o.nafaaSaleId!) ?? [] : [];
      const parts = own.length
        ? own.map((l) => ({ key: l.productId, name: l.name, weight: l.revenue, qty: l.qty, sale: l.revenue, cost: l.cost }))
        : ((Array.isArray(o.items) ? o.items : []) as any[]).filter((it) => it?.productId).map((it) => ({
          key: String(it.productId), name: String(it.name ?? 'Item'), weight: (Number(it.price) || 0) * (Number(it.quantity) || 0), qty: 0, sale: 0, cost: 0,
        }));
      const weightSum = parts.reduce((t, x) => t + Math.max(0, x.weight), 0);
      for (const x of parts) {
        const share = weightSum > 0 ? Math.max(0, x.weight) / weightSum : 1 / parts.length;
        const row = byProduct.get(x.key) ?? { ...blank(), name: x.name, qty: 0 };
        row.orders += 1; row.qty += x.qty; row.sale += x.sale; row.cost += x.cost;
        row.deliveryCollected += p.deliveryCollected * share;
        for (const k of COST_KINDS) row[k] += c[k] * share;
        row.profit += x.sale - x.cost + (p.deliveryCollected - p.sellingCosts) * share;
        if (costs.estimated) row.estimated += 1;
        byProduct.set(x.key, row);
      }
    }

    const finish = <T extends Agg>(a: T) => {
      const sellingCosts = COST_KINDS.reduce((t, k) => t + a[k], 0);
      const paid = a.sale + a.deliveryCollected;
      const out: any = { ...a, sellingCosts: r2(sellingCosts), margin: paid > 0 ? Math.round((a.profit / paid) * 1000) / 10 : null };
      for (const k of ['sale', 'cost', 'deliveryCollected', 'profit', ...COST_KINDS] as const) out[k] = r2(a[k]);
      return out as T & { sellingCosts: number; margin: number | null };
    };
    const list = <T extends Agg>(m: Map<string, T>, limit = 50) => [...m.values()].map(finish).sort((a, b) => b.sale + b.deliveryCollected - (a.sale + a.deliveryCollected)).slice(0, limit);
    return {
      range: { from, to },
      posting: s.postExpenses,
      missingRates: [...missingRates].map((c) => ({ code: c, name: courierName(c) })),
      totals: finish(total),
      byChannel: list(byChannel),
      byCourier: list(byCourier),
      byCity: list(byCity, 30),
      byProduct: list(byProduct, 30),
    };
  }

  /** Each live bill's lines by product: revenue after discounts and refunds, cost and quantity kept. */
  private async productLines(saleIds: string[]) {
    const out = new Map<string, Array<{ productId: string; name: string; revenue: number; cost: number; qty: number }>>();
    for (let i = 0; i < saleIds.length; i += 2000) {
      const chunk = saleIds.slice(i, i + 2000);
      if (!chunk.length) continue;
      const where = Prisma.sql`s.id IN (${Prisma.join(chunk)}) AND s.status::text <> 'VOIDED'`;
      const rows = await this.prisma.$queryRaw<Array<{ sale: string; product: string; name: string; revenue: number; cost: number; qty: number }>>`
        WITH ${billMathCte(where)}
        SELECT si."saleId" AS sale, COALESCE(si."productId", si.id) AS product, COALESCE(MAX(bm_p.name), 'Item') AS name,
          COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue, COALESCE(SUM(${LINE_COST}), 0)::float8 AS cost, COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
        ${LINE_COST_JOINS}
        WHERE ${where}
        GROUP BY 1, 2`;
      for (const r of rows) {
        const list = out.get(r.sale) ?? [];
        list.push({ productId: r.product, name: r.name, revenue: Number(r.revenue) || 0, cost: Number(r.cost) || 0, qty: Number(r.qty) || 0 });
        out.set(r.sale, list);
      }
    }
    return out;
  }
}

/** Selling-cost and courier settings are set by the owner or a manager, like courier accounts. */
export function assertManager(user: AuthenticatedUser) {
  const ok: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN];
  if (!ok.includes(user.role)) throw new ForbiddenException('Ye setting sirf malik ya manager badal sakta hai');
}
