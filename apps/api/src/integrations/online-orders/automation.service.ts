import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CommerceAutomationRule, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { hourInTz, weekdayInTz } from '../../common/helpers/business-time.helper';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { IntegrationService } from '../core/integration.service';
import { stockEvents, StockChanged } from '../../common/shop-scope/stock-events';
import { OnlineOrdersService } from './online-orders.service';
import { OrderEntryService } from './order-entry.service';
import { OrderToolsService } from './order-tools.service';
import { CourierAccountsService } from './courier-accounts.service';
import { CourierScoreService } from './courier-score.service';
import { OnlineProductsService } from './online-products.service';
import { CommerceGrowthService } from './commerce-growth.service';
import { assertManager } from './order-costs.service';
import { OrderAccepted, OrderStatusEvent, orderEvents } from './order-events';
import { appendTimeline, patchOrderMetadata } from './order-metadata';
import { boardOf } from './order-board';
import { phoneKey } from './customer-risk';
import { advancePaid } from './payment-links.service';
import { courierName } from './couriers';
import { ReviewsService } from './retention/reviews.service';
import { COURIER_APIS } from './courier-api/registry';
import {
  AUTOMATION_EVENTS, Action, AutomationEvent, AutomationRuleInput, Conditions, Facts, GuardStop, OrderFacts, ProductFacts, RECIPE_DEFAULTS, RECIPE_KEYS,
  RecipeKey, advanceAmount, checkConditions, eventOfStatus, guardRun, normalizeConditions, normalizeRule, recipeRule, waLink,
} from './automation';

const ADVANCE_TEXT = 'Assalam o Alaikum {name}! Order #{no} ({total}) bhejne se pehle {advance} advance bhej dein. Baqi paisa delivery par dena hoga. Advance milte hi order bhej denge.';
const CHAIN_TTL_MS = 15_000;
const RECEIVED_DELAY_MS = 3_000;
const STOCK_DEBOUNCE_MS = 20_000;
const RULES_TTL_MS = 60_000;

type Rule = CommerceAutomationRule;
export interface ActionResult { type: Action['type']; ok: boolean; text: string; link?: string | null }

const orderNo = (o: { externalOrderNumber: string | null; externalOrderId: string }) => String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, '');
const errText = (e: any) => {
  const m = e?.response?.message ?? e?.message ?? 'Nahi hua';
  return (Array.isArray(m) ? m.join(', ') : String(m)).slice(0, 200);
};
const money = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

/**
 * Commerce automation rules: listens to order events (received, confirmed,
 * packed, dispatched, delivered, returned, COD paid) and stock changes, checks
 * each enabled rule's conditions and carries out its actions through the
 * same services the screens use. Every run is logged (run table + the
 * order's timeline). A loop guard stops chains and repeats. With
 * AUTOMATION_DRY_RUN=1 every run is a dry run (nothing is changed).
 */
@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationService.name);
  private readonly chain = new Map<string, { depth: number; until: number }>();
  private readonly running = new Set<string>();
  private readonly rulesCache = new Map<string, { at: number; rules: Rule[] }>();
  private readonly stockQueue = new Map<string, Set<string>>();
  private stockTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly orders: OnlineOrdersService,
    private readonly entry: OrderEntryService,
    private readonly tools: OrderToolsService,
    private readonly couriers: CourierAccountsService,
    private readonly score: CourierScoreService,
    private readonly products: OnlineProductsService,
    private readonly growth: CommerceGrowthService,
    private readonly notifications: NotificationsService,
    private readonly integrations: IntegrationService,
    private readonly reviews: ReviewsService,
  ) {}

  private readonly onAccepted = (e: OrderAccepted) => this.fire(e.tenantId, e.orderId, 'CONFIRMED');
  private readonly onStatus = (e: OrderStatusEvent) => {
    const ev = eventOfStatus(e.status);
    if (ev) this.fire(e.tenantId, e.orderId, ev);
  };
  private readonly onStock = (e: StockChanged) => {
    const set = this.stockQueue.get(e.tenantId) ?? new Set<string>();
    set.add(e.productId);
    this.stockQueue.set(e.tenantId, set);
    if (!this.stockTimer) this.stockTimer = setTimeout(() => { this.stockTimer = null; this.flushStock().catch((err) => this.logger.warn(`Stock rules: ${errText(err)}`)); }, STOCK_DEBOUNCE_MS);
  };

  onModuleInit() {
    orderEvents.on('accepted', this.onAccepted);
    orderEvents.on('status', this.onStatus);
    stockEvents.on('changed', this.onStock);
    this.integrations.onOrderReceived((order) => {
      if ((order?.metadata as any)?.imported || (order?.metadata as any)?.test) return;
      // After the new-order hooks (block list, auto-accept) have had their turn.
      setTimeout(() => this.fire(order.tenantId, order.id, 'ORDER_RECEIVED'), RECEIVED_DELAY_MS);
    });
  }

  onModuleDestroy() {
    orderEvents.off('accepted', this.onAccepted);
    orderEvents.off('status', this.onStatus);
    stockEvents.off('changed', this.onStock);
    if (this.stockTimer) clearTimeout(this.stockTimer);
  }

  private dryOnly() {
    return process.env.AUTOMATION_DRY_RUN === '1';
  }

  private fire(tenantId: string, orderId: string, event: AutomationEvent) {
    this.onOrderEvent(tenantId, orderId, event).catch((err) => this.logger.warn(`Automation ${event} ${orderId}: ${errText(err)}`));
  }

  // ─── Rules ───────────────────────────────────────────────────

  private async activeRules(tenantId: string, event: AutomationEvent): Promise<Rule[]> {
    let hit = this.rulesCache.get(tenantId);
    if (!hit || Date.now() - hit.at > RULES_TTL_MS) {
      hit = { at: Date.now(), rules: await this.prisma.commerceAutomationRule.findMany({ where: { tenantId, enabled: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }) };
      this.rulesCache.set(tenantId, hit);
    }
    return hit.rules.filter((r) => r.event === event);
  }

  private depthOf(id: string) {
    const c = this.chain.get(id);
    if (!c || c.until < Date.now()) { this.chain.delete(id); return 0; }
    return c.depth;
  }

  private markChain(id: string, depth: number) {
    this.chain.set(id, { depth, until: Date.now() + CHAIN_TTL_MS });
    if (this.chain.size > 5000) for (const [k, v] of this.chain) if (v.until < Date.now()) this.chain.delete(k);
  }

  // ─── Facts ───────────────────────────────────────────────────

  private async clock(tenantId: string) {
    const { tz } = await this.tz.clock(tenantId);
    const now = new Date();
    return { hour: hourInTz(now, tz), weekday: weekdayInTz(now, tz) };
  }

  private async orderRow(tenantId: string, id: string) {
    return this.prisma.channelOrder.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  private async orderFacts(o: NonNullable<Awaited<ReturnType<AutomationService['orderRow']>>>): Promise<OrderFacts> {
    const meta = (o.metadata ?? {}) as any;
    const [risk, clock] = await Promise.all([
      this.orders.customerRisk(o.tenantId, [o.customerPhone], [o.id]).then((m) => m.get(phoneKey(o.customerPhone) ?? '') ?? null).catch(() => null),
      this.clock(o.tenantId),
    ]);
    const items = Array.isArray(o.items) ? (o.items as any[]) : [];
    return {
      kind: 'order',
      integrationId: o.integrationId,
      city: o.customerCity,
      amount: Number(o.total),
      isCod: !!meta.cod && o.paymentStatus !== 'PAID',
      risk: risk?.level ?? null,
      pastOrders: risk?.total ?? 0,
      returns: risk?.returned ?? 0,
      productIds: items.map((i) => i?.productId).filter((x): x is string => typeof x === 'string'),
      tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
      ...clock,
    };
  }

  private async productFacts(tenantId: string, productId: string): Promise<ProductFacts | null> {
    const p = await this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true, stock: true } });
    if (!p) return null;
    return { kind: 'product', productId: p.id, stock: Number(p.stock), ...(await this.clock(tenantId)) };
  }

  // ─── Running ─────────────────────────────────────────────────

  private async priorRuns(ruleIds: string[], subjectId: string) {
    if (!ruleIds.length) return [];
    const rows = await this.prisma.commerceAutomationRun.findMany({
      where: { ruleId: { in: ruleIds }, dryRun: false, OR: [{ subjectId }, { createdAt: { gte: new Date(Date.now() - 10 * 60_000) } }] },
      select: { ruleId: true, subjectId: true, event: true, createdAt: true, dryRun: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
    return rows.map((r) => ({ ruleId: r.ruleId, subjectId: r.subjectId, event: r.event, at: r.createdAt, dryRun: r.dryRun }));
  }

  private async onOrderEvent(tenantId: string, orderId: string, event: AutomationEvent) {
    const rules = await this.activeRules(tenantId, event);
    if (!rules.length) return;
    const depth = this.depthOf(orderId);
    const o = await this.orderRow(tenantId, orderId);
    if (!o || (o.metadata as any)?.test) return;
    const facts = await this.orderFacts(o);
    const prior = await this.priorRuns(rules.map((r) => r.id), orderId);
    for (const rule of rules) {
      const conditions = normalizeConditions(rule.conditions);
      if (!checkConditions(conditions, facts).every((c) => c.ok)) continue;
      await this.runOne(rule, event, 'ORDER', orderId, depth, prior, () => this.orderActions(rule, orderId, depth));
    }
  }

  private async flushStock() {
    const queued = [...this.stockQueue.entries()];
    this.stockQueue.clear();
    for (const [tenantId, ids] of queued) {
      const rules = await this.activeRules(tenantId, 'STOCK_LOW');
      if (!rules.length) continue;
      for (const productId of [...ids].slice(0, 500)) {
        const facts = await this.productFacts(tenantId, productId);
        if (!facts) continue;
        const linked = await this.prisma.productChannelMapping.count({ where: { productId, listed: true } });
        const prior = await this.priorRuns(rules.map((r) => r.id), productId);
        for (const rule of rules) {
          const actions = (rule.actions as unknown as Action[]) ?? [];
          if (!linked && actions.every((a) => a.type !== 'NOTIFY')) continue;
          if (!checkConditions(normalizeConditions(rule.conditions), facts).every((c) => c.ok)) continue;
          await this.runOne(rule, 'STOCK_LOW', 'PRODUCT', productId, 0, prior, () => this.productActions(rule, tenantId, productId, facts.stock));
        }
      }
    }
  }

  private async runOne(
    rule: Rule, event: AutomationEvent, subjectType: 'ORDER' | 'PRODUCT', subjectId: string, depth: number,
    prior: Awaited<ReturnType<AutomationService['priorRuns']>>, act: () => Promise<ActionResult[]>,
  ) {
    const lock = `${rule.id}:${subjectId}:${event}`;
    if (this.running.has(lock)) return;
    const stop: GuardStop | null = guardRun({ ruleId: rule.id, subjectId, event, depth, prior });
    if (stop) {
      // A repeat is normal (the same event again); a chain or a runaway is worth showing.
      if (stop !== 'ALREADY_RAN') await this.log(rule, event, subjectType, subjectId, depth, false, 'SKIPPED', [{ type: 'NOTE', ok: false, text: stop === 'CHAIN' ? 'Loop guard: rules ek doosre ko chala rahe the — roka' : 'Bohat zyada runs — rule thori der ke liye roka' }]);
      return;
    }
    this.running.add(lock);
    try {
      if (this.dryOnly()) {
        const plan = await this.plan(rule, subjectType, subjectId);
        await this.log(rule, event, subjectType, subjectId, depth, true, 'DONE', plan);
        return;
      }
      if (subjectType === 'ORDER') this.markChain(subjectId, depth + 1);
      const results = await act();
      const ok = results.filter((r) => r.ok).length;
      const status = ok === results.length ? 'DONE' : ok ? 'PARTIAL' : 'FAILED';
      await this.log(rule, event, subjectType, subjectId, depth, false, status, results);
      prior.push({ ruleId: rule.id, subjectId, event, at: new Date(), dryRun: false });
    } finally {
      this.running.delete(lock);
    }
  }

  private async log(rule: Rule, event: AutomationEvent, subjectType: 'ORDER' | 'PRODUCT', subjectId: string, depth: number, dryRun: boolean, status: string, results: ActionResult[]) {
    await this.prisma.commerceAutomationRun.create({
      data: { tenantId: rule.tenantId, ruleId: rule.id, event, subjectType, subjectId, dryRun, status, depth, results: results as unknown as Prisma.InputJsonValue },
    }).catch(() => null);
    if (!dryRun && status !== 'SKIPPED') {
      await this.prisma.commerceAutomationRule.update({ where: { id: rule.id }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } }).catch(() => null);
    }
    if (subjectType === 'ORDER') {
      const o = await this.prisma.channelOrder.findUnique({ where: { id: subjectId }, select: { orderStatus: true, stage: true } });
      if (o) {
        const note = `${rule.name}${dryRun ? ' (dry run)' : ''}: ${results.map((r) => `${r.ok ? '✓' : '✗'} ${r.text}`).join(' · ')}`.slice(0, 400);
        await appendTimeline(this.prisma, subjectId, { at: new Date().toISOString(), by: null, byName: 'Automation', from: boardOf(o), to: 'AUTOMATION', note }).catch(() => null);
      }
    }
  }

  // ─── Actions ─────────────────────────────────────────────────

  private async orderActions(rule: Rule, orderId: string, depth: number): Promise<ActionResult[]> {
    const actor = await this.orders.systemActor(rule.tenantId);
    const scope = new ShopScope(null, true);
    const out: ActionResult[] = [];
    for (const a of (rule.actions as unknown as Action[]) ?? []) {
      this.markChain(orderId, depth + 1);
      try {
        out.push(await this.orderAction(rule, a, actor, scope, orderId));
      } catch (e) {
        out.push({ type: a.type, ok: false, text: `${a.type}: ${errText(e)}` });
      }
    }
    return out;
  }

  private async orderAction(rule: Rule, a: Action, actor: AuthenticatedUser, scope: ShopScope, id: string): Promise<ActionResult> {
    const reason = `Automation: ${rule.name}`.slice(0, 200);
    switch (a.type) {
      case 'SET_STATUS':
        await this.orders.move(actor, scope, id, { to: a.to, reason });
        return { type: a.type, ok: true, text: `Status → ${a.to}` };
      case 'TAG': {
        const o = await this.orderRow(rule.tenantId, id);
        const tags: string[] = Array.isArray((o?.metadata as any)?.tags) ? (o!.metadata as any).tags : [];
        if (!tags.includes(a.tag)) await this.tools.setTags(actor, scope, id, [...tags, a.tag]);
        return { type: a.type, ok: true, text: `Tag: ${a.tag}` };
      }
      case 'ASSIGN':
        await this.entry.assign(actor, scope, id, a.userId);
        return { type: a.type, ok: true, text: 'Staff ko diya' };
      case 'BOOK_COURIER': {
        const o = await this.orderRow(rule.tenantId, id);
        if (!o) throw new NotFoundException('Order nahi mila');
        if (!o.nafaaSaleId) throw new BadRequestException('Order abhi confirm nahi hua — booking confirm ke baad');
        if (o.courierBookedAt && o.courierStatus !== 'CANCELLED') return { type: a.type, ok: true, text: `Pehle se booked (${courierName(o.courierCode)})` };
        const code = a.courier === 'BEST' ? await this.score.bestFor(rule.tenantId, o.customerCity) : a.courier;
        if (!code) throw new BadRequestException('Is shehar ka best courier abhi maloom nahi (kam parcels)');
        if (!COURIER_APIS[code]) throw new BadRequestException(`${courierName(code)} ka API jura nahi`);
        const r: any = await this.couriers.book(actor, scope, id, { courier: code });
        return { type: a.type, ok: true, text: `${courierName(code)} book${r?.trackingNumber ? ` · CN ${r.trackingNumber}` : ''}` };
      }
      case 'ASK_ADVANCE': {
        const o = await this.orderRow(rule.tenantId, id);
        if (!o) throw new NotFoundException('Order nahi mila');
        const ask = await this.advanceAsk(o, a.pct);
        await patchOrderMetadata(this.prisma, id, { advanceAsk: { pct: a.pct, amount: ask.amount, text: ask.text, link: ask.link, at: new Date().toISOString(), rule: rule.name } });
        if (o.orderStatus === 'PENDING' && o.stage !== 'PAY_PENDING') await this.orders.move(actor, scope, id, { to: 'PAY_PENDING', reason });
        await this.tools.addNote(actor, scope, id, `Advance ${a.pct}% (${money(ask.amount)}) maangein — WhatsApp: ${ask.link ?? 'phone number nahi'}`);
        return { type: a.type, ok: true, text: `Advance ${a.pct}% (${money(ask.amount)})`, link: ask.link };
      }
      case 'NOTE':
        await this.tools.addNote(actor, scope, id, a.text);
        return { type: a.type, ok: true, text: 'Note' };
      case 'NOTIFY': {
        const o = await this.orderRow(rule.tenantId, id);
        this.notifications.alert({
          tenantId: rule.tenantId, event: 'onlineOrder', type: 'INFO', shopId: o?.shopId ?? null,
          title: `⚡ ${rule.name}`,
          message: a.text || (o ? `#${orderNo(o)} · ${o.customerName} · ${money(Number(o.total))}` : rule.name),
          link: `/online-orders?order=${id}`, metadata: { kind: 'AUTOMATION', ruleId: rule.id, channelOrderId: id },
        });
        return { type: a.type, ok: true, text: 'Malik ko khabar' };
      }
      case 'REVIEW_REQUEST': {
        const r = await this.reviews.request(rule.tenantId, id, 'AUTOMATION');
        return r ? { type: a.type, ok: true, text: 'Review request bani' } : { type: a.type, ok: false, text: 'Order deliver nahi hua — review request nahi bani' };
      }
      default:
        return { type: a.type, ok: false, text: `${a.type}: order par nahi chalta` };
    }
  }

  private async advanceAsk(o: { tenantId: string; total: unknown; metadata: unknown; customerName: string; customerPhone: string | null; externalOrderNumber: string | null; externalOrderId: string }, pct: number) {
    const [saved, tenant] = await Promise.all([
      this.growth.waTemplates(o.tenantId).catch(() => null),
      this.prisma.tenant.findUnique({ where: { id: o.tenantId }, select: { name: true } }).catch(() => null),
    ]);
    const due = Math.max(0, Number(o.total) - advancePaid(o.metadata));
    const amount = advanceAmount(due, pct);
    const text = (saved?.templates?.advance?.trim() || ADVANCE_TEXT)
      .replace(/\{(\w+)\}/g, (_m, k: string) => ({ name: o.customerName, no: orderNo(o), total: money(Number(o.total)), advance: money(amount), shop: tenant?.name ?? '' } as Record<string, string>)[k] ?? '')
      .replace(/[ \t]{2,}/g, ' ').trim();
    return { amount, text, link: waLink(o.customerPhone, text) };
  }

  private async productActions(rule: Rule, tenantId: string, productId: string, stock: number): Promise<ActionResult[]> {
    const actor = await this.orders.systemActor(tenantId);
    const out: ActionResult[] = [];
    for (const a of (rule.actions as unknown as Action[]) ?? []) {
      try {
        if (a.type === 'HIDE_PRODUCT') {
          // Sell when out of stock is on: the owner wants orders at zero, so the product stays on the channel.
          const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { backorder: true } });
          if (p?.backorder === true) { out.push({ type: a.type, ok: true, text: 'Backorder chalu — channel par rehne diya' }); continue; }
          const r: any = await this.products.bulk(actor, { selection: { productIds: [productId] }, action: 'listed', channelId: a.channelId, value: false });
          out.push({ type: a.type, ok: true, text: `Channel se hataya (${r?.updated ?? 0})` });
        } else if (a.type === 'PUSH_STOCK') {
          await this.products.bulk(actor, { selection: { productIds: [productId] }, action: 'push', channelId: a.channelId });
          out.push({ type: a.type, ok: true, text: 'Stock bheja' });
        } else if (a.type === 'NOTIFY') {
          const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
          this.notifications.alert({
            tenantId, event: 'onlineOrder', type: 'WARNING', title: `⚡ ${rule.name}`,
            message: a.text || `${p?.name ?? 'Product'} · stock ${stock}`, link: '/online-store/products', metadata: { kind: 'AUTOMATION', ruleId: rule.id, productId },
          });
          out.push({ type: a.type, ok: true, text: 'Malik ko khabar' });
        } else out.push({ type: a.type, ok: false, text: `${a.type}: product par nahi chalta` });
      } catch (e) {
        out.push({ type: a.type, ok: false, text: `${a.type}: ${errText(e)}` });
      }
    }
    return out;
  }

  /** What a rule would do on a subject, without doing it. */
  private async plan(rule: Pick<Rule, 'tenantId' | 'actions'>, subjectType: 'ORDER' | 'PRODUCT', subjectId: string): Promise<ActionResult[]> {
    const actions = (rule.actions as unknown as Action[]) ?? [];
    const o = subjectType === 'ORDER' ? await this.orderRow(rule.tenantId, subjectId) : null;
    const out: ActionResult[] = [];
    for (const a of actions) {
      switch (a.type) {
        case 'SET_STATUS': out.push({ type: a.type, ok: true, text: `Status → ${a.to}` }); break;
        case 'TAG': out.push({ type: a.type, ok: true, text: `Tag: ${a.tag}` }); break;
        case 'ASSIGN': out.push({ type: a.type, ok: true, text: 'Staff ko diya jayega' }); break;
        case 'BOOK_COURIER': {
          const code = a.courier === 'BEST' ? await this.score.bestFor(rule.tenantId, o?.customerCity ?? null) : a.courier;
          const ready = !!o?.nafaaSaleId;
          out.push({ type: a.type, ok: !!code && ready, text: !code ? 'Best courier abhi maloom nahi' : `${courierName(code)} par booking${ready ? '' : ' (confirm ke baad)'}` });
          break;
        }
        case 'ASK_ADVANCE': {
          if (!o) { out.push({ type: a.type, ok: false, text: 'Order nahi mila' }); break; }
          const ask = await this.advanceAsk(o, a.pct);
          out.push({ type: a.type, ok: true, text: `Advance ${a.pct}% (${money(ask.amount)})`, link: ask.link });
          break;
        }
        case 'NOTE': out.push({ type: a.type, ok: true, text: `Note: ${a.text}` }); break;
        case 'NOTIFY': out.push({ type: a.type, ok: true, text: 'Malik ko khabar' }); break;
        case 'REVIEW_REQUEST': out.push({ type: a.type, ok: true, text: 'Review link banega (WhatsApp par bhejne ke liye)' }); break;
        case 'HIDE_PRODUCT': out.push({ type: a.type, ok: true, text: 'Channel se hataya jayega' }); break;
        case 'PUSH_STOCK': out.push({ type: a.type, ok: true, text: 'Stock bheja jayega' }); break;
      }
    }
    return out;
  }

  // ─── Screens ─────────────────────────────────────────────────

  private present(r: Rule) {
    return { id: r.id, name: r.name, event: r.event, conditions: normalizeConditions(r.conditions), actions: r.actions as unknown as Action[], enabled: r.enabled, recipe: r.recipe, position: r.position, runCount: r.runCount, lastRunAt: r.lastRunAt, createdAt: r.createdAt };
  }

  async overview(user: AuthenticatedUser) {
    const [rules, runs, staff] = await Promise.all([
      this.prisma.commerceAutomationRule.findMany({ where: { tenantId: user.tenantId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
      this.runs(user, {}),
      this.prisma.user.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' }, take: 200 }),
    ]);
    return {
      events: AUTOMATION_EVENTS,
      rules: rules.map((r) => this.present(r)),
      recipes: RECIPE_KEYS.map((key) => {
        const rule = rules.find((r) => r.recipe === key);
        return { key, defaults: RECIPE_DEFAULTS[key], ruleId: rule?.id ?? null, enabled: !!rule?.enabled, params: (rule ? (rule.conditions as any)?._params : null) ?? RECIPE_DEFAULTS[key] };
      }),
      runs,
      staff: staff.map((s) => ({ id: s.id, name: s.fullName })),
      dryRunOnly: this.dryOnly(),
    };
  }

  async runs(user: AuthenticatedUser, q: { ruleId?: string; orderId?: string; limit?: number }) {
    const rows = await this.prisma.commerceAutomationRun.findMany({
      where: { tenantId: user.tenantId, ...(q.ruleId ? { ruleId: q.ruleId } : {}), ...(q.orderId ? { subjectId: q.orderId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(q.limit) || 40, 1), 200),
      include: { rule: { select: { name: true } } },
    });
    const orderIds = [...new Set(rows.filter((r) => r.subjectType === 'ORDER').map((r) => r.subjectId))];
    const productIds = [...new Set(rows.filter((r) => r.subjectType === 'PRODUCT').map((r) => r.subjectId))];
    const [orders, products] = await Promise.all([
      orderIds.length ? this.prisma.channelOrder.findMany({ where: { id: { in: orderIds } }, select: { id: true, externalOrderNumber: true, externalOrderId: true, customerName: true } }) : [],
      productIds.length ? this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [],
    ]);
    return rows.map((r) => {
      const o = orders.find((x) => x.id === r.subjectId);
      const p = products.find((x) => x.id === r.subjectId);
      return {
        id: r.id, ruleId: r.ruleId, ruleName: r.rule.name, event: r.event, subjectType: r.subjectType, subjectId: r.subjectId,
        subject: o ? `#${orderNo(o)} · ${o.customerName}` : p?.name ?? r.subjectId, dryRun: r.dryRun, status: r.status, results: r.results, at: r.createdAt,
      };
    });
  }

  private invalidate(tenantId: string) {
    this.rulesCache.delete(tenantId);
  }

  private clean(body: unknown): AutomationRuleInput {
    try { return normalizeRule(body); } catch (e) { throw new BadRequestException(errText(e)); }
  }

  async create(user: AuthenticatedUser, body: unknown) {
    assertManager(user);
    const r = this.clean(body);
    const count = await this.prisma.commerceAutomationRule.count({ where: { tenantId: user.tenantId } });
    if (count >= 50) throw new BadRequestException('Zyada se zyada 50 rules');
    const row = await this.prisma.commerceAutomationRule.create({
      data: { tenantId: user.tenantId, name: r.name, event: r.event, conditions: r.conditions as unknown as Prisma.InputJsonValue, actions: r.actions as unknown as Prisma.InputJsonValue, enabled: r.enabled, position: count, createdById: user.id },
    });
    this.invalidate(user.tenantId);
    return this.present(row);
  }

  private async own(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.commerceAutomationRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Rule nahi mila');
    return row;
  }

  async update(user: AuthenticatedUser, id: string, body: unknown) {
    assertManager(user);
    await this.own(user, id);
    const r = this.clean(body);
    const row = await this.prisma.commerceAutomationRule.update({
      where: { id }, data: { name: r.name, event: r.event, conditions: r.conditions as unknown as Prisma.InputJsonValue, actions: r.actions as unknown as Prisma.InputJsonValue, enabled: r.enabled },
    });
    this.invalidate(user.tenantId);
    return this.present(row);
  }

  async setEnabled(user: AuthenticatedUser, id: string, enabled: boolean) {
    assertManager(user);
    await this.own(user, id);
    const row = await this.prisma.commerceAutomationRule.update({ where: { id }, data: { enabled: !!enabled } });
    this.invalidate(user.tenantId);
    return this.present(row);
  }

  async remove(user: AuthenticatedUser, id: string) {
    assertManager(user);
    await this.own(user, id);
    await this.prisma.commerceAutomationRule.delete({ where: { id } });
    this.invalidate(user.tenantId);
    return { ok: true };
  }

  /** Switches a ready-made recipe on (with the shop's numbers) or off. One rule per recipe. */
  async recipe(user: AuthenticatedUser, key: string, body: { enabled?: boolean; params?: Record<string, unknown> }) {
    assertManager(user);
    if (!(RECIPE_KEYS as readonly string[]).includes(key)) throw new BadRequestException('Recipe nahi mili');
    return this.setRecipe(user.tenantId, user.id, key as RecipeKey, body?.enabled !== false, body?.params ?? {});
  }

  /** Used by the recipe switch and by the setup wizard. */
  async setRecipe(tenantId: string, userId: string | null, key: RecipeKey, enabled: boolean, params: Record<string, unknown>) {
    const existing = await this.prisma.commerceAutomationRule.findFirst({ where: { tenantId, recipe: key } });
    if (!enabled) {
      if (existing) await this.prisma.commerceAutomationRule.update({ where: { id: existing.id }, data: { enabled: false } });
      this.invalidate(tenantId);
      return existing ? this.present({ ...existing, enabled: false }) : null;
    }
    const p = { ...RECIPE_DEFAULTS[key], ...(existing ? (existing.conditions as any)?._params : {}), ...params } as Record<string, unknown>;
    let rule: AutomationRuleInput;
    try {
      rule = recipeRule(key, { amount: Number(p.amount) || undefined, city: p.city ? String(p.city) : undefined, courier: p.courier ? String(p.courier) : undefined, returns: Number(p.returns) || undefined, pct: Number(p.pct) || undefined, stock: Number(p.stock) || undefined });
    } catch (e) { throw new BadRequestException(errText(e)); }
    const conditions = { ...rule.conditions, _params: p } as unknown as Prisma.InputJsonValue;
    const data = { name: rule.name, event: rule.event, conditions, actions: rule.actions as unknown as Prisma.InputJsonValue, enabled: true };
    const row = existing
      ? await this.prisma.commerceAutomationRule.update({ where: { id: existing.id }, data })
      : await this.prisma.commerceAutomationRule.create({ data: { ...data, tenantId, recipe: key, createdById: userId, position: -1 } });
    this.invalidate(tenantId);
    return this.present(row);
  }

  /**
   * Dry run: the rule (saved or as typed) against one order, or the last 30
   * orders (products low on stock for STOCK_LOW). Shows which conditions
   * held and what each action would do. Nothing is changed.
   */
  async dryRun(user: AuthenticatedUser, scope: ShopScope, body: { rule?: unknown; ruleId?: string; orderId?: string }) {
    const saved = body?.ruleId ? await this.own(user, body.ruleId) : null;
    const r = saved ? { event: saved.event as AutomationEvent, conditions: normalizeConditions(saved.conditions), actions: saved.actions as unknown as Action[] } : this.clean(body?.rule);
    const asRule = { tenantId: user.tenantId, actions: r.actions as unknown as Prisma.JsonValue };
    const evalOne = async (subjectType: 'ORDER' | 'PRODUCT', id: string, label: string, facts: Facts) => {
      const checks = checkConditions(r.conditions as Conditions, facts);
      const matched = checks.every((c) => c.ok);
      return { subjectType, id, label, matched, checks, actions: matched ? await this.plan(asRule, subjectType, id) : [] };
    };
    const results: Awaited<ReturnType<typeof evalOne>>[] = [];
    if (r.event === 'STOCK_LOW') {
      const below = r.conditions.stockBelow ?? 1;
      const list = await this.prisma.product.findMany({
        where: { tenantId: user.tenantId, isActive: true, stock: { lt: below }, channelMappings: { some: { listed: true } } } as any,
        select: { id: true, name: true }, take: 30,
      }).catch(() => this.prisma.product.findMany({ where: { tenantId: user.tenantId, stock: { lt: below } }, select: { id: true, name: true }, take: 30 }));
      for (const p of list) {
        const f = await this.productFacts(user.tenantId, p.id);
        if (f) results.push(await evalOne('PRODUCT', p.id, p.name, f));
      }
    } else {
      const where = { tenantId: user.tenantId, deletedAt: null, ...(scope.whereLoose as any), ...(body?.orderId ? { id: body.orderId } : {}) };
      const list = await this.prisma.channelOrder.findMany({ where, orderBy: { receivedAt: 'desc' }, take: body?.orderId ? 1 : 30 });
      if (body?.orderId && !list.length) throw new NotFoundException('Order nahi mila');
      for (const o of list) results.push(await evalOne('ORDER', o.id, `#${orderNo(o)} · ${o.customerName}`, await this.orderFacts(o)));
    }
    if (saved && body?.orderId && results[0]) {
      await this.prisma.commerceAutomationRun.create({
        data: { tenantId: user.tenantId, ruleId: saved.id, event: saved.event, subjectType: 'ORDER', subjectId: body.orderId, dryRun: true, status: results[0].matched ? 'DONE' : 'SKIPPED', results: results[0].actions as unknown as Prisma.InputJsonValue },
      }).catch(() => null);
    }
    return { event: r.event, checked: results.length, matched: results.filter((x) => x.matched).length, results };
  }
}
