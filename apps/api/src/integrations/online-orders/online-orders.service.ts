import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { deferOnlineLoyalty } from './retention/retention-settings';
import { backorderFloors } from './backorder-stock';
import { supportsBackorder } from './backorder';
import { ChannelOrder, Integration, Prisma, SaleSource, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { SalesService } from '../../modules/sales/sales/sales.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../common/shop-scope';
import { startOfBusinessDayTz, startOfBusinessMonthTz, tzParts } from '../../common/helpers/business-time.helper';
import { IntegrationService } from '../core/integration.service';
import { NormalizedOrder, isCashOnDelivery, mapPaymentMethod } from './order-normalizer';
import { readWebsiteConfig } from './website-config';
import { StatusWebhookService } from './status-webhook.service';
import { COURIERS, courierHoldsCash, courierLink, courierName } from './couriers';
import { mappingKey } from './mapping-key';
import { CustomerRisk, OrderSignals, blockedRisk, emptyHistory, phoneKey, riskOf, withSignals } from './customer-risk';
import { OrderToolsService } from './order-tools.service';
import { emitOrderAccepted, emitOrderStatus } from './order-events';
import { shopDue } from './shop-due';
import { DeliveryMode, buildManualAdvance, orderMoney, paidAdvance } from './order-money';
import { randomBytes } from 'crypto';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { periodRange } from '../../modules/inventory/taxonomy/taxonomy.helper';
import { apiMessage } from '../../common/i18n/api-message';
import {
  BoardStatus, CLOSED_STATUSES, FLAG_STAGES, HOLD_STAGES, LIFECYCLE_RANK, MoveStep, STUCK_DAYS,
  boardOf, isBoardStatus, isColumnStage, isCustomStage, isFlagStage, isHoldStage, planMove,
} from './order-board';
import { OrderChannelSyncService, SyncCustomer, SyncItem, SyncResult } from './order-channel-sync.service';
import { appendTimeline, patchOrderMetadata } from './order-metadata';

/**
 * Online order ka poora safar:
 *
 *   PENDING (naya) ──accept──▶ CONFIRMED ─▶ PREPARING ─▶ READY ─▶ OUT_FOR_DELIVERY ─▶ DELIVERED
 *        │                        │
 *        └──────── cancel ────────┴──▶ CANCELLED  (bill void → stock wapas)
 *
 * Accept par bill POS wale `SalesService.create` se banta hai — is liye
 * stock, cost, khata, loyalty aur sale number bilkul counter jaise chalte hain.
 */

export const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED',
] as const;

/** Band orders — in par aage kuch nahi hota */
const CLOSED: string[] = ['CANCELLED', 'REJECTED', 'RETURNED'];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Accept ke doran order ko "lock" karne wala andar ka status */
const ACCEPTING = 'ACCEPTING';
const LOCK_TTL_MS = 2 * 60_000;
const FLOW: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/** A new order waiting longer than this shows as late. */
const STALE_PENDING_MS = 15 * 60_000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const SOURCE_BY_TYPE: Record<string, SaleSource> = {
  CUSTOM_WEBSITE: 'WEBSITE',
  NAFAA_STORE: 'WEBSITE',
  WOOCOMMERCE: 'WEBSITE',
  SHOPIFY: 'SHOPIFY',
  DARAZ: 'DARAZ',
  FOODPANDA: 'FOODPANDA',
  // Orders typed in by the shop bill as website sales (no separate SaleSource).
  MANUAL: 'WEBSITE',
};

/** Courier states that need the shop's attention (failed attempt, refused). */
const COURIER_PROBLEM = ['ATTEMPTED'];
const COURIER_RETURNING = ['RETURNING', 'RETURNED'];

export interface EditFullBody {
  items?: Array<{ productId?: string; variantId?: string | null; name?: string; sku?: string; variant?: string; quantity?: number; price?: number }>;
  discount?: number;
  deliveryFee?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  notes?: string;
  weightKg?: number | null;
  syncToChannel?: boolean;
}

export interface ItemMatch {
  productId: string;
  variantId?: string | null;
}

interface StoredItem {
  name: string;
  sku?: string;
  externalProductId?: string;
  externalVariantId?: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
  productId?: string;
  variantId?: string | null;
}


@Injectable()
export class OnlineOrdersService implements OnModuleInit {
  private readonly logger = new Logger(OnlineOrdersService.name);

  constructor(
    private readonly tzService: TenantTimezoneService,
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationService,
    private readonly sales: SalesService,
    private readonly notifications: NotificationsService,
    private readonly statusHook: StatusWebhookService,
    private readonly tools: OrderToolsService,
    private readonly channelSync: OrderChannelSyncService,
  ) {}

  /**
   * Daraz/Foodpanda connectors bhi `IntegrationService.receiveChannelOrder`
   * se order dalte hain — un sab par bhi naye order ki ghanti aur
   * auto-accept chale, is liye yahan listener lagate hain.
   */
  onModuleInit() {
    this.integrations.onOrderReceived((order, integration) => this.afterNewOrder(order, integration));
  }

  // ═══════════════════════════════════════════════════════════
  // RECEIVE (website → Nafaa)
  // ═══════════════════════════════════════════════════════════

  async receive(integration: Integration, order: NormalizedOrder, meta: { signed: boolean; test?: boolean }) {
    return this.integrations.receiveChannelOrder(integration.id, {
      externalOrderId: order.externalOrderId,
      externalOrderNumber: order.externalOrderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerAddress: order.customerAddress,
      customerCity: order.customerCity,
      customerLat: order.customerLat,
      customerLng: order.customerLng,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.cancelled ? 'CANCELLED' : 'PENDING',
      notes: order.notes,
      shopId: order.shopId ?? null,
      metadata: {
        platform: order.platform,
        shippingMethod: order.shippingMethod,
        paymentTitle: order.paymentTitle,
        cod: isCashOnDelivery(order.paymentMethod) && order.paymentStatus !== 'PAID',
        signed: meta.signed,
        ...(meta.test && { test: true }),
        ...(order.attribution && { attribution: order.attribution }),
      },
    });
  }

  /** Naya order aaya: ghanti + (agar on ho) khud bill */
  private async afterNewOrder(order: any, integration: Integration) {
    const num = order.externalOrderNumber ?? order.externalOrderId;
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
    const blocked = await this.tools.isBlocked(order.tenantId, order.customerPhone).catch(() => null);
    if (blocked) await this.mergeMetadata(order.id, { blocked: { reason: blocked.reason, at: new Date().toISOString() } });

    // An Excel import adds many orders at once; one alert per row would flood the bell.
    if (!(order.metadata as any)?.imported) this.notifications.alert({
      tenantId: order.tenantId,
      event: 'onlineOrder',
      type: 'INFO',
      shopId: order.shopId ?? null,
      title: blocked ? apiMessage('⛔ Blocked number se order #{{num}}', { num }) : apiMessage('🛍️ Naya online order #{{num}}', { num }),
      message: apiMessage('{{customer}} · Rs {{total}} · {{count}} item', { customer: order.customerName, total: Math.round(Number(order.total)).toLocaleString('en-PK'), count: itemCount }),
      link: `/online-orders?order=${order.id}`,
      metadata: { kind: 'ONLINE_ORDER', channelOrderId: order.id, source: integration.type },
    });

    const config = readWebsiteConfig(integration.config);
    // Block kiye number ka order khud accept nahi — malik khud dekhe
    if (!config.autoAccept || order.orderStatus !== 'PENDING' || blocked) return;
    // A risky COD order waits for an advance when the shop set that rule.
    const rule = await this.tools.riskSettings(order.tenantId).catch(() => null);
    if (rule?.askAdvance && (order.metadata as any)?.cod) {
      const r = (await this.customerRisk(order.tenantId, [order.customerPhone], [order.id]).catch(() => null))?.get(phoneKey(order.customerPhone) ?? '');
      if (r && (r.level === 'HIGH' || r.level === 'BLOCKED')) {
        await this.mergeMetadata(order.id, { autoAcceptError: `RTO khatra — pehle ${rule.advancePct}% advance maangein, phir accept karein` });
        return;
      }
    }

    try {
      const actor = await this.systemActor(order.tenantId);
      await this.accept(actor, new ShopScope(null, true), order.id, {});
      this.logger.log(`⚡ Auto-accept: #${num}`);
    } catch (e: any) {
      // Order PENDING hi rehta hai — malik khud dekh kar accept kar lega
      const reason = e?.response?.message ?? e?.message ?? 'Auto-accept nahi hua';
      await this.mergeMetadata(order.id, { autoAcceptError: String(reason) });
      this.logger.warn(`Auto-accept fail #${num}: ${reason}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LIST / LIVE / DETAIL
  // ═══════════════════════════════════════════════════════════

  private scopeWhere(user: AuthenticatedUser, scope: ShopScope): Prisma.ChannelOrderWhereInput {
    // Branch wala staff sirf apni branch ke (aur bina branch wale) orders dekhe
    return { tenantId: user.tenantId, ...(scope.whereLoose as any) };
  }

  async list(user: AuthenticatedUser, scope: ShopScope, q: {
    status?: string; integrationId?: string; search?: string; limit?: number; offset?: number;
    payment?: 'COD_DUE';
    /** Business days "YYYY-MM-DD"; both needed to narrow by received date. */
    from?: string; to?: string;
    /** COD = cash on delivery orders, PAID = money already received. */
    pay?: 'COD' | 'PAID';
    /** Customer confirmation: CONFIRMED, NO_ANSWER, REFUSED, or NONE (not asked yet). */
    confirm?: 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED' | 'NONE';
    /** Orders board: a tile key (NEW, PACKED, STUCK, custom:<key>, DELETED ...). */
    board?: string;
    city?: string;
    courierCode?: string;
    /** `me`, `none` or a user id. */
    assignedTo?: string;
    stage?: string;
    tag?: string;
  }) {
    // Channel chuna ho to ginti (tabs, aaj, COD) bhi usi channel ki
    const scopeBase: Prisma.ChannelOrderWhereInput = {
      ...this.scopeWhere(user, scope),
      ...(q.integrationId && { integrationId: q.integrationId }),
    };
    // Soft-deleted orders show only on the DELETED tile.
    const base: Prisma.ChannelOrderWhereInput = { ...scopeBase, deletedAt: null };
    const where: Prisma.ChannelOrderWhereInput = { ...base };
    // Extra conditions go in AND so they never replace the branch scope's OR.
    const and: Prisma.ChannelOrderWhereInput[] = [];
    // Filters shared by the list and the board tiles (everything except board/status).
    const filters: Prisma.ChannelOrderWhereInput[] = [];
    if (q.status === 'ACTIVE') where.orderStatus = { in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] };
    else if (q.status === 'CLOSED') where.orderStatus = { in: CLOSED };
    else if (q.status) where.orderStatus = q.status;
    if (q.payment === 'COD_DUE') {
      where.paymentStatus = { not: 'PAID' };
      where.nafaaSaleId = { not: null };
      where.orderStatus = { notIn: CLOSED };
    }
    if (q.pay === 'COD') filters.push({ metadata: { path: ['cod'], equals: true } });
    if (q.pay === 'PAID') filters.push({ paymentStatus: 'PAID' });
    if (q.confirm === 'NONE') filters.push({ metadata: { path: ['confirmation', 'result'], equals: Prisma.AnyNull } });
    else if (q.confirm) filters.push({ metadata: { path: ['confirmation', 'result'], equals: q.confirm } });
    const range = q.from && q.to && DAY_KEY.test(q.from) && DAY_KEY.test(q.to)
      ? await periodRange(this.tzService, user.tenantId, q.from, q.to)
      : null;
    if (range) filters.push({ receivedAt: range });
    if (q.city?.trim()) filters.push({ customerCity: { contains: q.city.trim(), mode: 'insensitive' } });
    if (q.courierCode?.trim()) filters.push({ courierCode: q.courierCode.trim().toUpperCase() });
    if (q.assignedTo === 'none') filters.push({ assignedToId: null });
    else if (q.assignedTo === 'me') filters.push({ assignedToId: user.id });
    else if (q.assignedTo?.trim()) filters.push({ assignedToId: q.assignedTo.trim() });
    if (q.stage?.trim()) filters.push({ stage: q.stage.trim() });
    if (q.tag?.trim()) filters.push({ metadata: { path: ['tags'], array_contains: [q.tag.trim()] } });
    if (q.search?.trim()) {
      const s = q.search.trim();
      filters.push({
        OR: [
          { externalOrderNumber: { contains: s.replace(/^#/, ''), mode: 'insensitive' } },
          { externalOrderId: { contains: s, mode: 'insensitive' } },
          { customerName: { contains: s, mode: 'insensitive' } },
          { customerPhone: { contains: s } },
          { trackingNumber: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    /* Dukaan ka apna karobari din — raat 12 baje band hone wali
       dukaan ke liye raat 1 baje ka order abhi "aaj" ka hai */
    const { tz, dayStartHour } = await this.tzService.clock(user.tenantId);
    const today = startOfBusinessDayTz(new Date(), tz, dayStartHour);
    const customStages = await this.tools.customStages(user.tenantId).catch(() => []);
    if (q.board) {
      if (q.board === 'DELETED') where.deletedAt = { not: null };
      const bw = this.boardWhere(q.board, today);
      if (bw) and.push(bw);
    }
    and.push(...filters);
    if (and.length) where.AND = and;
    // NOT on a JSON path drops rows that lack the key (SQL NULL), so test orders are left out this way.
    const notTest: Prisma.ChannelOrderWhereInput = { OR: [{ metadata: { path: ['test'], equals: Prisma.AnyNull } }, { metadata: { path: ['test'], equals: false } }] };
    const staleBefore = new Date(Date.now() - STALE_PENDING_MS);
    const alertSelect = { id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, receivedAt: true, orderStatus: true } as const;
    const [items, total, counts, rangeCounts, todayAgg, codDue, stale, staleCount, cancelAsked, cancelAskedCount] = await Promise.all([
      this.prisma.channelOrder.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: Math.min(q.limit ?? 50, 200),
        skip: q.offset ?? 0,
        include: { integration: { select: { id: true, type: true, displayName: true } } },
      }),
      this.prisma.channelOrder.count({ where }),
      this.prisma.channelOrder.groupBy({ by: ['orderStatus'], where: base, _count: { _all: true } }),
      range
        ? this.prisma.channelOrder.groupBy({ by: ['orderStatus'], where: { ...base, AND: [{ receivedAt: range }] }, _count: { _all: true } })
        : Promise.resolve(null),
      this.prisma.channelOrder.aggregate({
        where: { ...base, receivedAt: { gte: today }, orderStatus: { notIn: CLOSED } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.channelOrder.findMany({
        where: { ...base, paymentStatus: { not: 'PAID' }, nafaaSaleId: { not: null }, orderStatus: { notIn: CLOSED } },
        select: { total: true, metadata: true },
        take: 5000,
      }).then((rows) => ({ _count: { _all: rows.length }, _sum: { total: rows.reduce((t, r) => t + shopDue(r), 0) } })),
      this.prisma.channelOrder.findMany({
        where: { ...base, orderStatus: 'PENDING', receivedAt: { lt: staleBefore }, AND: [notTest] },
        orderBy: { receivedAt: 'asc' },
        take: 4,
        select: alertSelect,
      }),
      this.prisma.channelOrder.count({ where: { ...base, orderStatus: 'PENDING', receivedAt: { lt: staleBefore }, AND: [notTest] } }),
      this.prisma.channelOrder.findMany({
        where: { ...base, orderStatus: { notIn: ['CANCELLED', 'REJECTED', 'RETURNED'] }, AND: [{ metadata: { path: ['cancelRequested'], equals: true } }] },
        orderBy: { receivedAt: 'desc' },
        take: 4,
        select: alertSelect,
      }),
      this.prisma.channelOrder.count({
        where: { ...base, orderStatus: { notIn: ['CANCELLED', 'REJECTED', 'RETURNED'] }, AND: [{ metadata: { path: ['cancelRequested'], equals: true } }] },
      }),
    ]);
    const boardCounts = await this.boardCounts(scopeBase, filters, today, customStages.map((c) => `custom:${c.key}`));
    const assigneeIds = [...new Set(items.map((o) => o.assignedToId).filter((x): x is string => !!x))];
    const assignees = assigneeIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: assigneeIds }, tenantId: user.tenantId }, select: { id: true, fullName: true, email: true } })
      : [];

    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => { statusCounts[c.orderStatus] = c._count._all; });
    const rangeStatusCounts: Record<string, number> | null = rangeCounts ? {} : null;
    rangeCounts?.forEach((c) => { rangeStatusCounts![c.orderStatus] = c._count._all; });
    const alertRow = (o: (typeof stale)[number]) => ({
      ...o,
      externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
    });

    const times = new Map<string, Array<{ id: string; at: Date }>>();
    const [risks, avgOrder] = await Promise.all([
      this.customerRisk(user.tenantId, items.map((o) => o.customerPhone), [], times).catch(() => new Map<string, CustomerRisk>()),
      this.avgOrderValue(user.tenantId),
    ]);

    return {
      items: items.map((o) => {
        // Is order ko chhod kar pichhli history
        const r = risks.get(phoneKey(o.customerPhone) ?? '');
        const isTest = !!(o.metadata as any)?.test;
        const a = o.assignedToId ? assignees.find((u) => u.id === o.assignedToId) : undefined;
        const view = { ...this.present(o), assigneeName: a ? a.fullName || a.email : null };
        if (!r || isTest) return { ...view, risk: null };
        const self = minusSelf(r, o.orderStatus, Number(o.total));
        const risk = withSignals(r.level === 'BLOCKED' ? { ...r, ...self } : riskOf(self), this.signals(o, avgOrder, times, null));
        return { ...view, risk: { ...risk, duplicateOpen: !CLOSED.includes(o.orderStatus) && o.orderStatus !== 'DELIVERED' ? self.open : 0 } };
      }),
      total,
      /** Orders board tiles: count per tile with the same filters (board and status left out). */
      boardCounts,
      customStages,
      counts: statusCounts,
      /** Status counts inside from/to; null when no dates were given. */
      rangeCounts: rangeStatusCounts,
      stats: {
        todayOrders: todayAgg._count._all,
        todayValue: Number(todayAgg._sum.total ?? 0),
        codDueCount: codDue._count._all,
        codDueValue: Number(codDue._sum.total ?? 0),
      },
      alerts: {
        staleMinutes: STALE_PENDING_MS / 60_000,
        stalePending: { count: staleCount, oldest: stale.map(alertRow) },
        cancelRequests: { count: cancelAskedCount, latest: cancelAsked.map(alertRow) },
      },
    };
  }

  /**
   * The where clause of one board tile. Lifecycle tiles leave out orders
   * that sit in a column stage (holds, packed-not-sent, custom), so every
   * open order is in exactly one column. null = no extra condition.
   */
  private boardWhere(board: string, today: Date): Prisma.ChannelOrderWhereInput | null {
    const plain: Prisma.ChannelOrderWhereInput = { OR: [{ stage: null }, { stage: { in: [...FLAG_STAGES] } }] };
    const open = { notIn: CLOSED_STATUSES };
    const now = Date.now();
    switch (board) {
      case 'ALL': case 'DELETED': return null;
      case 'TODAY': return { receivedAt: { gte: today } };
      case 'NEW': return { orderStatus: { in: ['PENDING', 'ACCEPTING'] }, ...plain };
      case 'CONFIRMED': return { orderStatus: { in: ['CONFIRMED', 'PREPARING'] }, ...plain };
      case 'PACKED': return { orderStatus: 'READY', ...plain };
      case 'PACKED_NOT_SENT': return { orderStatus: 'READY', stage: 'PACKED_NOT_SENT' };
      case 'DISPATCHED': return { orderStatus: 'OUT_FOR_DELIVERY', ...plain };
      case 'DELIVERED': return { orderStatus: 'DELIVERED', ...plain };
      case 'RETURNED': return { orderStatus: 'RETURNED' };
      case 'CANCELLED': return { orderStatus: { in: ['CANCELLED', 'REJECTED'] } };
      case 'OUT_FOR_DELIVERY': return { courierStatus: 'OUT_FOR_DELIVERY', orderStatus: { notIn: [...CLOSED_STATUSES, 'DELIVERED'] } };
      case 'STUCK': return { orderStatus: 'OUT_FOR_DELIVERY', dispatchedAt: { lt: new Date(now - STUCK_DAYS * 86_400_000) } };
      case 'ISSUES': return { OR: [{ stage: 'ISSUE' }, { courierStatus: { in: COURIER_PROBLEM }, orderStatus: { notIn: [...CLOSED_STATUSES, 'DELIVERED'] } }] };
      case 'RETURNING': return { courierStatus: { in: COURIER_RETURNING }, orderStatus: { notIn: CLOSED_STATUSES } };
      case 'REPLACEMENT': return { replacementOfId: { not: null } };
      case 'CLAIM': return { stage: 'CLAIM' };
      case 'FOLLOW_UP': return { followUpAt: { lte: new Date(now) } };
      case 'COD_DUE': return { paymentStatus: { not: 'PAID' }, nafaaSaleId: { not: null }, orderStatus: open };
      default:
        if ((HOLD_STAGES as readonly string[]).includes(board) || isCustomStage(board)) return { stage: board, orderStatus: open };
        throw new BadRequestException('Ghalat board');
    }
  }

  /** Counts for every board tile, with the list's filters (board and status left out). */
  private async boardCounts(scopeBase: Prisma.ChannelOrderWhereInput, filters: Prisma.ChannelOrderWhereInput[], today: Date, customKeys: string[]) {
    const live: Prisma.ChannelOrderWhereInput = { ...scopeBase, deletedAt: null, ...(filters.length && { AND: filters }) };
    const count = (board: string) => {
      const w: Prisma.ChannelOrderWhereInput = { ...scopeBase, deletedAt: board === 'DELETED' ? { not: null } : null };
      const extra = this.boardWhere(board, today);
      return this.prisma.channelOrder.count({ where: { ...w, AND: [...filters, ...(extra ? [extra] : [])] } });
    };
    const separate = ['TODAY', 'OUT_FOR_DELIVERY', 'STUCK', 'ISSUES', 'RETURNING', 'REPLACEMENT', 'FOLLOW_UP', 'COD_DUE', 'DELETED'];
    const [groups, ...rest] = await Promise.all([
      this.prisma.channelOrder.groupBy({ by: ['orderStatus', 'stage'], where: live, _count: { _all: true } }),
      ...separate.map(count),
    ]);
    const out: Record<string, number> = {
      ALL: 0, NEW: 0, PAY_PENDING: 0, ON_HOLD: 0, NO_STOCK: 0, CUSTOMER_QUERY: 0, CONFIRMED: 0, PACKED: 0, PACKED_NOT_SENT: 0,
      DISPATCHED: 0, DELIVERED: 0, RETURNED: 0, CANCELLED: 0, CLAIM: 0,
    };
    for (const k of customKeys) out[k] = 0;
    for (const g of groups as Array<{ orderStatus: string; stage: string | null; _count: { _all: number } }>) {
      const n = g._count._all;
      out.ALL += n;
      if (g.stage === 'CLAIM') out.CLAIM += n;
      if (g.orderStatus === 'RETURNED') { out.RETURNED += n; continue; }
      if (CLOSED_STATUSES.includes(g.orderStatus)) { out.CANCELLED += n; continue; }
      if (g.stage && isColumnStage(g.stage)) {
        if (g.stage === 'PACKED_NOT_SENT') { if (g.orderStatus === 'READY') out.PACKED_NOT_SENT += n; continue; }
        out[g.stage] = (out[g.stage] ?? 0) + n;
        continue;
      }
      const col = boardOf({ orderStatus: g.orderStatus, stage: null });
      out[col] = (out[col] ?? 0) + n;
    }
    separate.forEach((k, i) => { out[k] = rest[i] as number; });
    return out;
  }

  /** Har page par chalne wali halki query — sidebar badge aur naye order ka popup */
  async live(user: AuthenticatedUser, scope: ShopScope) {
    const where: Prisma.ChannelOrderWhereInput = { ...this.scopeWhere(user, scope), orderStatus: 'PENDING', deletedAt: null };
    const [pendingCount, latest] = await Promise.all([
      this.prisma.channelOrder.count({ where }),
      this.prisma.channelOrder.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: 5,
        select: {
          id: true, externalOrderId: true, externalOrderNumber: true, customerName: true, customerCity: true,
          total: true, items: true, paymentMethod: true, receivedAt: true, metadata: true,
          integration: { select: { type: true, displayName: true } },
        },
      }),
    ]);
    return {
      pendingCount,
      latest: latest.map((o) => ({
        ...o,
        externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
        total: Number(o.total),
        itemCount: Array.isArray(o.items) ? (o.items as any[]).length : 0,
        items: undefined,
      })),
    };
  }

  /**
   * Phone se customer ki history (is dukaan ke saare channels, 1 saal) —
   * ek hi query me kai phones. excludeIds = jin orders ko ginti me na lo.
   */
  async customerRisk(
    tenantId: string, phones: (string | null | undefined)[], excludeIds: string[] = [],
    /** Filled with every order time per phone key, for the duplicate-order check. */
    times?: Map<string, Array<{ id: string; at: Date }>>,
  ): Promise<Map<string, CustomerRisk>> {
    const keys = [...new Set(phones.map(phoneKey).filter((k): k is string => !!k))].slice(0, 100);
    const out = new Map<string, CustomerRisk>();
    if (!keys.length) return out;
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        receivedAt: { gte: new Date(Date.now() - 365 * 86_400_000) },
        OR: keys.map((k) => ({ customerPhone: { endsWith: k.slice(-7) } })),
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      select: { id: true, customerPhone: true, orderStatus: true, total: true, metadata: true, receivedAt: true },
      take: 5000,
    });
    const hist = new Map(keys.map((k) => [k, emptyHistory()]));
    for (const o of rows) {
      const k = phoneKey(o.customerPhone);
      const h = k ? hist.get(k) : undefined;
      if (!h || (o.metadata as any)?.test) continue;
      if (times) times.set(k!, [...(times.get(k!) ?? []), { id: o.id, at: o.receivedAt }]);
      h.total++;
      if (o.orderStatus === 'DELIVERED') { h.delivered++; h.spent += Number(o.total); }
      else if (o.orderStatus === 'RETURNED') h.returned++;
      else if (o.orderStatus === 'CANCELLED' || o.orderStatus === 'REJECTED') h.cancelled++;
      else h.open++;
    }
    const blocks = await this.tools.blocklist(tenantId).catch(() => []);
    for (const [k, h] of hist) {
      const b = blocks.find((x) => x.key === k);
      out.set(k, b ? blockedRisk(h, b.reason) : riskOf(h));
    }
    return out;
  }

  async detail(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');

    // Customer ki shakhsi details kis ne dekhin — access log (Shopify/GDPR shart)
    this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'ONLINE_ORDER_VIEWED',
        entityType: 'ChannelOrder',
        entityId: order.id,
        description: `Online order #${String(order.externalOrderNumber ?? order.externalOrderId).replace(/^#+/, '')} ki customer details dekhi`,
        metadata: { channel: order.integration.type },
      },
    }).catch(() => null);

    const config = readWebsiteConfig(order.integration.config);
    const shopId = order.shopId ?? config.shopId ?? order.integration.shopId ?? scope.shopId ?? null;
    const items = (order.items as unknown as StoredItem[]) ?? [];

    // Har item ka Nafaa product + branch stock — accept se pehle dikh jaye
    const resolved = await Promise.all(items.map((it) => this.resolveItem(order.tenantId, order.integrationId, it)));
    const productIds = resolved.filter(Boolean).map((r) => r!.productId);
    const [products, stocks] = await Promise.all([
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, price: true, backorder: true, images: { take: 1, select: { url: true } } },
          })
        : [],
      productIds.length && shopId
        ? this.prisma.shopStock.findMany({ where: { shopId, productId: { in: productIds } }, select: { productId: true, variantId: true, stock: true } })
        : [],
    ]);

    const sale = order.nafaaSaleId
      ? await this.prisma.sale.findFirst({
          where: { id: order.nafaaSaleId, tenantId: user.tenantId },
          select: { id: true, saleNumber: true, total: true, status: true, soldAt: true, shop: { select: { id: true, name: true } } },
        })
      : null;

    const times = new Map<string, Array<{ id: string; at: Date }>>();
    const [riskMap, avgOrder, covered, riskRule] = await Promise.all([
      this.customerRisk(order.tenantId, [order.customerPhone], [order.id], times).catch(() => null),
      this.avgOrderValue(order.tenantId),
      this.cityCheck && order.customerCity && !CLOSED.includes(order.orderStatus) && !order.dispatchedAt
        ? this.cityCheck(order.tenantId, order.customerCity).catch(() => null) : Promise.resolve(null),
      this.tools.riskSettings(order.tenantId).catch(() => null),
    ]);
    const baseRisk = riskMap?.get(phoneKey(order.customerPhone) ?? '') ?? null;
    const isTest = !!(order.metadata as any)?.test;
    const risk = baseRisk && !isTest
      ? { ...withSignals(baseRisk, this.signals(order, avgOrder, times, covered)), duplicateOpen: !CLOSED.includes(order.orderStatus) && order.orderStatus !== 'DELIVERED' ? baseRisk.open : 0 }
      : null;
    // Ask for an advance on a risky COD order, when the shop set that rule.
    const due = orderMoney(order).codDue;
    const riskAdvice = risk && riskRule?.askAdvance && (risk.level === 'HIGH' || risk.level === 'BLOCKED') && (order.metadata as any)?.cod && due > 0 && !order.dispatchedAt
      ? { pct: riskRule.advancePct, amount: Math.max(1, Math.round((Number(order.total) * riskRule.advancePct) / 100)) }
      : null;

    return {
      ...this.present(order),
      risk,
      riskAdvice,
      integration: { id: order.integration.id, type: order.integration.type, displayName: order.integration.displayName },
      autoPrint: config.autoPrint,
      fulfilShopId: shopId,
      // The edit page shows "change on the channel too" only when this is true.
      canSyncEdit: this.channelSync.canEdit(order.integration),
      sale,
      lines: items.map((it, i) => {
        const r = resolved[i];
        const p = r ? products.find((x) => x.id === r.productId) : undefined;
        const st = r ? stocks.find((s) => s.productId === r.productId && (s.variantId ?? null) === (r.variantId ?? null)) : undefined;
        return {
          index: i,
          ...it,
          lineTotal: it.price * it.quantity,
          match: r && p
            ? {
                productId: p.id, variantId: r.variantId ?? null, name: p.name, sku: p.sku,
                nafaaPrice: Number(p.price), image: p.images[0]?.url ?? null,
                stock: st ? Number(st.stock) : 0,
                // Sell when out of stock: accepting takes the stock below zero (owed), so it is not "short".
                enough: (st ? Number(st.stock) >= it.quantity : false) || (p.backorder === true && supportsBackorder(order.integration.type)),
                backorder: p.backorder === true && supportsBackorder(order.integration.type),
                via: r.via,
              }
            : null,
        };
      }),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ACCEPT → BILL + STOCK
  // ═══════════════════════════════════════════════════════════

  async accept(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    body: { matches?: Record<string, ItemMatch>; shopId?: string },
  ) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.nafaaSaleId) throw new BadRequestException('Is order ka bill pehle ban chuka hai');
    if (['CANCELLED', 'REJECTED'].includes(order.orderStatus)) {
      throw new BadRequestException('Cancel hua order accept nahi ho sakta');
    }
    const staleLock = order.orderStatus === ACCEPTING && this.isStaleLock(order.processedAt);
    if (order.orderStatus === ACCEPTING && !staleLock) {
      throw new ConflictException('Is order ka bill abhi ban raha hai — thori der me dekhein');
    }

    const config = readWebsiteConfig(order.integration.config);
    const items = (order.items as unknown as StoredItem[]) ?? [];

    // ─── Har item ka product dhoondo ─────────────────────────
    const matched: (ItemMatch & { via: string })[] = [];
    const unmatched: { index: number; name: string; sku?: string; variant?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const manual = body.matches?.[String(i)];
      if (manual?.productId) {
        const ok = await this.prisma.product.findFirst({
          where: { id: manual.productId, tenantId: user.tenantId, isActive: true },
          select: { id: true, hasVariants: true },
        });
        if (!ok) throw new BadRequestException(apiMessage('{{itemsName}}: chuna hua product nahi mila', { itemsName: items[i].name }));
        // A product with sizes keeps its stock on the variants, so the base row is empty.
        if (ok.hasVariants && !manual.variantId) {
          throw new BadRequestException(apiMessage('{{itemsName}}: is product ke size/variant hain — jodte waqt sahi size chunein', { itemsName: items[i].name }));
        }
        if (manual.variantId) {
          const v = await this.prisma.productVariant.findFirst({
            where: { id: manual.variantId, productId: manual.productId, isActive: true },
            select: { id: true },
          });
          if (!v) throw new BadRequestException(apiMessage('{{itemsName}}: chuna hua variant is product ka nahi', { itemsName: items[i].name }));
        }
        matched[i] = { productId: manual.productId, variantId: manual.variantId ?? null, via: 'manual' };
        continue;
      }
      const r = await this.resolveItem(user.tenantId, order.integrationId, items[i]);
      if (r) matched[i] = r;
      else unmatched.push({ index: i, name: items[i].name, sku: items[i].sku, variant: items[i].variant });
    }
    if (unmatched.length) {
      throw new ConflictException({
        code: 'UNMATCHED_ITEMS',
        ...apiMessage('{{unmatchedCount}} item ka Nafaa product nahi mila — pehle jodein', { unmatchedCount: unmatched.length }),
        unmatched,
      });
    }

    // ─── Order lock — do log ek saath accept na kar sakein ───
    // Sirf "Naya" order lock hota hai (ya purana CONFIRMED jiska bill kabhi
    // bana hi nahi, ya ACCEPTING jo crash me atak gaya). processedAt yahan
    // lock ka waqt hai — atka hua lock 2 minute baad chhoot jata hai.
    const lockedAt = new Date();
    const fromStatus = staleLock ? 'PENDING' : order.orderStatus;
    const locked = await this.prisma.channelOrder.updateMany({
      where: {
        id: order.id,
        nafaaSaleId: null,
        OR: [
          { orderStatus: { in: ['PENDING', 'CONFIRMED'] } },
          { orderStatus: ACCEPTING, processedAt: { lt: new Date(Date.now() - LOCK_TTL_MS) } },
          { orderStatus: ACCEPTING, processedAt: null },
        ],
      },
      data: { orderStatus: ACCEPTING, processedAt: lockedAt },
    });
    if (locked.count === 0) throw new ConflictException('Ye order abhi koi aur accept kar raha hai');

    let saleId: string | null = null;
    try {
      const meta = (order.metadata ?? {}) as any;
      const { sale, shopId, riderKeepsDelivery, deliveryFee, backorder } = await this.makeBill(user, scope, order, items, matched, {
        shopId: body.shopId,
        priceOverride: config.priceSource === 'WEBSITE',
        reuseOrphan: true,
      });
      saleId = sale.id;

      // Sirf tab CONFIRMED jab order ab bhi hamare lock me ho
      const now = new Date();
      const done = await this.prisma.channelOrder.updateMany({
        where: { id: order.id, orderStatus: ACCEPTING, processedAt: lockedAt },
        data: {
          orderStatus: 'CONFIRMED',
          nafaaSaleId: sale.id,
          shopId,
          // Holds belong to orders before accept; packed-not-sent needs READY.
          stage: isColumnStage(order.stage) && !isCustomStage(order.stage) ? null : order.stage,
          acceptedAt: now,
          processedAt: now,
          items: items.map((it, i) => ({ ...it, productId: matched[i].productId, variantId: matched[i].variantId ?? null })) as any,
          // Rider apni delivery khud rakhta hai — dukaan ko itna kam milna hai (COD / reports)
          metadata: {
            ...meta, autoAcceptError: undefined, ...(riderKeepsDelivery && deliveryFee > 0 && { riderDelivery: deliveryFee }),
            // Lines sold beyond the stock on hand (backorder): shown as waiting until stock arrives.
            ...(backorder.length && { backorder }),
          },
        },
      });
      if (done.count === 0) {
        // Beech me kisi ne order badal diya — bill wapas lo taake stock sahi rahe
        await this.sales.voidSale(user, new ShopScope(null, true), sale.id, 'Online order accept beech me ruk gaya');
        saleId = null;
        throw new ConflictException('Order beech me badal gaya — dobara dekhein');
      }
      saleId = null; // ab order se jur gaya, catch me kuch wapas nahi karna
      const updated = await this.prisma.channelOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { integration: true },
      });

      await this.rememberMatches(order.integrationId, items, matched);
      this.statusHook.send(updated.integration, updated, 'order.confirmed');
      emitOrderAccepted({ tenantId: updated.tenantId, orderId: updated.id });

      return {
        order: this.present(updated),
        sale: { id: sale.id, saleNumber: sale.saleNumber, total: sale.total },
        autoPrint: config.autoPrint,
      };
    } catch (e) {
      // Bill ban chuka tha magar order se nahi jura → order ko bill se jor do
      // (dobara accept par naya bill na bane)
      if (saleId) {
        await this.prisma.channelOrder.updateMany({
          where: { id: order.id, orderStatus: ACCEPTING, processedAt: lockedAt },
          data: { orderStatus: 'CONFIRMED', nafaaSaleId: saleId, acceptedAt: new Date() },
        }).catch(() => null);
      } else {
        await this.prisma.channelOrder.updateMany({
          where: { id: order.id, orderStatus: ACCEPTING, processedAt: lockedAt },
          data: { orderStatus: fromStatus, processedAt: null },
        });
      }
      throw e;
    }
  }

  /**
   * Makes the POS bill for an order through `SalesService.create`, so stock,
   * cost, khata, loyalty and the sale number work as at the counter. Used by
   * accept and by the full edit. `reuseOrphan` (accept only) picks up a bill
   * an earlier crashed attempt made but never linked to the order.
   */
  private async makeBill(
    user: AuthenticatedUser,
    scope: ShopScope,
    order: ChannelOrder & { integration: Integration },
    items: StoredItem[],
    matched: ItemMatch[],
    opts: { shopId?: string | null; priceOverride: boolean; reuseOrphan?: boolean; discount?: number; deliveryFee?: number },
  ) {
    const config = readWebsiteConfig(order.integration.config);
    const shopId = await resolveWriteShopId(
      this.prisma,
      user.tenantId,
      scope,
      opts.shopId ?? order.shopId ?? config.shopId ?? order.integration.shopId,
    );
    const customerId = await this.findOrCreateCustomer(user.tenantId, shopId, order);
    const meta = (order.metadata ?? {}) as any;
    const paymentMethod = mapPaymentMethod(order.paymentMethod ?? undefined);
    const deliveryFee = opts.deliveryFee ?? Number(order.deliveryFee);
    // Bahar ka rider (Indolj / Foodpanda / Bykea) delivery khud leta hai — bill me shamil nahi.
    // A choice made on this order wins over the channel setting.
    const riderKeepsDelivery = meta.deliveryChoice ? meta.deliveryChoice === 'RIDER' : config.deliveryFeeMode === 'RIDER';
    const discount = opts.discount ?? (Number(order.discount) || 0);
    const billTotal = await this.expectedBillTotal(items, matched, opts.priceOverride ? 'WEBSITE' : 'NAFAA', discount, riderKeepsDelivery ? 0 : deliveryFee);
    const source = SOURCE_BY_TYPE[order.integration.type] ?? 'WEBSITE';
    const sourceRef = order.externalOrderNumber ?? order.externalOrderId;

    // Pichli koshish me bill ban gaya tha lekin order se jura nahi (crash) —
    // dobara bill banane ke bajaye wahi jor do, warna stock do dafa kat-ta.
    const orphan = opts.reuseOrphan
      ? await this.prisma.sale.findFirst({
          where: {
            tenantId: user.tenantId, source, sourceRef, status: { not: 'VOIDED' },
            createdAt: { gte: order.receivedAt },
          },
          select: { id: true, saleNumber: true, total: true },
        })
      : null;

    // Backorder products may take the branch below zero (only for this accepted order).
    const bo = orphan ? { floors: [], lines: [] } : await backorderFloors(this.prisma, order.integration, shopId, items, matched);

    const sale = orphan ?? await this.sales.create(
      user,
      new ShopScope(shopId, false),
      {
        shopId,
        customerId,
        paymentMethod,
        // Online sale poori wasool maani jati hai — COD ka paisa order par
        // "Paisa mil gaya" se track hota hai, customer ke khate me udhaar nahi.
        // Bill ka apna total dete hain (website ka nahi) taake tax/rounding
        // ka farq udhaar ya "change" na ban jaye.
        paidAmount: billTotal,
        discount,
        items: items.map((it, i) => ({
          productId: matched[i].productId,
          variantId: matched[i].variantId ?? undefined,
          quantity: it.quantity,
          ...(opts.priceOverride && { priceOverride: it.price }),
        })),
        serviceCharges: deliveryFee > 0
          ? [riderKeepsDelivery
            ? { type: 'DELIVERY', label: 'Delivery (rider ko — bill me shamil nahi)', amount: deliveryFee, passThrough: true }
            : { type: 'DELIVERY', label: meta.shippingMethod ? `Delivery (${meta.shippingMethod})` : 'Delivery', amount: deliveryFee }]
          : undefined,
      } as any,
      { source, sourceRef },
      { stockFloor: bo.floors, deferLoyalty: await deferOnlineLoyalty(this.prisma, user.tenantId) },
    );
    return { sale: { id: sale.id, saleNumber: sale.saleNumber, total: sale.total }, shopId, riderKeepsDelivery, deliveryFee, backorder: bo.lines };
  }

  private isStaleLock(at: Date | null) {
    return !at || Date.now() - at.getTime() > LOCK_TTL_MS;
  }

  // ═══════════════════════════════════════════════════════════
  // STATUS / CANCEL / PAYMENT
  // ═══════════════════════════════════════════════════════════

  async updateStatus(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    body: { status: string; reason?: string; trackingNumber?: string; courierName?: string; courierCode?: string },
  ) {
    const status = body.status as OrderStatus;
    if (!ORDER_STATUSES.includes(status)) throw new BadRequestException('Ghalat status');
    if (status === 'CANCELLED' || status === 'REJECTED') return this.cancel(user, scope, id, body.reason, status);
    if (status === 'RETURNED') return this.markReturned(user, scope, id, body.reason);

    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (status === 'PENDING') throw new BadRequestException('Order wapas "Naya" nahi ho sakta');
    if (!order.nafaaSaleId) {
      throw new BadRequestException('Pehle order accept karein — accept se hi bill banta hai aur stock kam hota hai');
    }
    if (CLOSED.includes(order.orderStatus)) {
      throw new BadRequestException('Band (cancel / wapas) order ka status nahi badal sakta');
    }
    await this.assertBillAlive(order);

    const now = new Date();
    const meta = (order.metadata ?? {}) as any;
    const data: Prisma.ChannelOrderUpdateInput = { orderStatus: status };
    // Stages that no longer fit the new status are cleared.
    if (isHoldStage(order.stage) || (order.stage === 'PACKED_NOT_SENT' && status !== 'READY')) data.stage = null;
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber.trim() || null;
    if (body.courierCode !== undefined) {
      const code = body.courierCode ? String(body.courierCode).toUpperCase() : null;
      if (code && !COURIERS.some((c) => c.code === code)) throw new BadRequestException('Courier sahi nahi');
      data.courierCode = code;
      if (body.courierName === undefined) data.courierName = courierName(code);
    }
    if (body.courierName !== undefined) data.courierName = body.courierName.trim() || null;
    if (status === 'OUT_FOR_DELIVERY' && !order.dispatchedAt) data.dispatchedAt = now;
    if (status === 'DELIVERED') {
      data.deliveredAt = now;
      if (!order.dispatchedAt) data.dispatchedAt = now;
      // COD: apna rider → paisa haath me. Courier → paisa courier ke paas
      // (COLLECTED) jab tak settlement na aaye — warna "paid" jhoot hota.
      if (order.paymentStatus !== 'PAID' && meta.cod) {
        const code = (data.courierCode as string | null | undefined) ?? order.courierCode;
        if (courierHoldsCash(code)) {
          data.paymentStatus = 'COLLECTED';
        } else {
          data.paymentStatus = 'PAID';
          data.paymentReceivedAt = now;
        }
      }
    }

    const updated = await this.prisma.channelOrder.update({ where: { id }, data, include: { integration: true } });
    this.statusHook.send(updated.integration, updated, 'order.status_changed');
    if (status !== order.orderStatus) emitOrderStatus({ tenantId: updated.tenantId, orderId: updated.id, status });
    return this.present(updated);
  }

  async cancel(user: AuthenticatedUser, scope: ShopScope, id: string, reason?: string, status: 'CANCELLED' | 'REJECTED' = 'CANCELLED') {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus)) return this.present(order);
    if (order.orderStatus === 'DELIVERED') {
      throw new BadRequestException('Deliver ho chuka order cancel nahi hota — Returns se return karein');
    }
    if (order.orderStatus === ACCEPTING && !this.isStaleLock(order.processedAt)) {
      throw new ConflictException('Bill abhi ban raha hai — 2 second baad cancel karein');
    }

    // Bill ban chuka tha → void karo, stock khud wapas aa jata hai
    if (order.nafaaSaleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: order.nafaaSaleId, tenantId: user.tenantId },
        select: { id: true, status: true },
      });
      if (sale && sale.status !== 'VOIDED') {
        await this.sales.voidSale(user, new ShopScope(null, true), sale.id, `Online order cancel: ${reason ?? '-'}`);
      }
    }

    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: { orderStatus: status, cancelledAt: new Date(), cancelReason: reason?.trim() || null, stage: isFlagStage(order.stage) ? order.stage : null },
      include: { integration: true },
    });
    this.statusHook.send(updated.integration, updated, 'order.cancelled');
    return this.present(updated);
  }

  /**
   * COD confirmation — dukandar ne customer se (call / WhatsApp) poocha:
   * CONFIRMED = haan, NO_ANSWER = jawab nahi (dobara koshish), REFUSED = mana.
   * Record order par — kitni dafa koshish hui, kis ne ki.
   */
  async setConfirmation(user: AuthenticatedUser, scope: ShopScope, id: string, body: { result?: string; note?: string }) {
    const result = String(body?.result ?? '').toUpperCase();
    if (!['CONFIRMED', 'NO_ANSWER', 'REFUSED'].includes(result)) throw new BadRequestException('Ghalat jawab');
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus)) throw new BadRequestException('Band order ki confirmation nahi hoti');
    const meta = (order.metadata ?? {}) as any;
    const prev = meta.confirmation ?? {};
    const confirmation = {
      result,
      at: new Date().toISOString(),
      by: user.id,
      attempts: (prev.attempts ?? 0) + 1,
      note: body?.note?.trim().slice(0, 200) || null,
      history: [...(prev.history ?? []), { result, at: new Date().toISOString() }].slice(-10),
    };
    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: { metadata: { ...meta, confirmation } },
      include: { integration: true },
    });
    return this.present(updated);
  }

  /**
   * Kai orders ek saath: accept (bill + stock), agla qadam, cancel, confirm.
   * Har order alag — ek fail ho to baqi chalte rahen; har ek ka natija wapas.
   */
  async bulk(user: AuthenticatedUser, scope: ShopScope, body: { action?: string; ids?: string[]; reason?: string }) {
    const ids = [...new Set(body?.ids ?? [])].slice(0, 100);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const action = String(body?.action ?? '');
    if (!['accept', 'next', 'cancel', 'confirm'].includes(action)) throw new BadRequestException('Ghalat kaam');
    if (action === 'cancel' && !body.reason?.trim()) throw new BadRequestException('Cancel ki wajah likhein');

    const results: { id: string; ok: boolean; error?: string; saleId?: string }[] = [];
    for (const id of ids) {
      try {
        if (action === 'accept') {
          const r = await this.accept(user, scope, id, {});
          results.push({ id, ok: true, saleId: r.sale.id });
        } else if (action === 'next') {
          const o = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, select: { orderStatus: true } });
          if (!o) throw new NotFoundException('Order nahi mila');
          const next = FLOW.includes(o.orderStatus as OrderStatus) ? FLOW[FLOW.indexOf(o.orderStatus as OrderStatus) + 1] : undefined;
          if (!next) throw new BadRequestException('Is order ka agla qadam nahi');
          await this.updateStatus(user, scope, id, { status: next });
          results.push({ id, ok: true });
        } else if (action === 'cancel') {
          await this.cancel(user, scope, id, body.reason!.trim());
          results.push({ id, ok: true });
        } else {
          await this.setConfirmation(user, scope, id, { result: 'CONFIRMED' });
          results.push({ id, ok: true });
        }
      } catch (e: any) {
        const m = e?.response?.message ?? e?.message ?? 'Nahi hua';
        results.push({ id, ok: false, error: Array.isArray(m) ? m.join(', ') : String(m) });
      }
    }
    return { done: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  async markPaid(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus)) {
      throw new BadRequestException('Band (cancel / wapas) order par paisa mark nahi hota');
    }
    await this.assertBillAlive(order);
    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: { paymentStatus: 'PAID', paymentReceivedAt: new Date() },
      include: { integration: true },
    });
    this.statusHook.send(updated.integration, updated, 'order.paid');
    return this.present(updated);
  }

  /**
   * Records an advance the shop received outside a payment link (JazzCash,
   * Easypaisa, bank transfer, cash). It is stored with the payment links in
   * metadata.payments, so courier COD and link amounts drop by the same
   * amount; when it covers the whole order, the order is marked paid.
   */
  async addAdvance(user: AuthenticatedUser, scope: ShopScope, id: string, body: { amount?: unknown; method?: unknown; reference?: unknown }) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus)) throw new BadRequestException('Band (cancel / wapas) order par advance nahi likhte');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Is order ka poora paisa pehle se mil chuka');
    const meta = (order.metadata ?? {}) as any;
    const due = Math.max(0, shopDue(order) - paidAdvance(meta));
    const built = buildManualAdvance(body ?? {}, { due, ref: `adv_${randomBytes(6).toString('hex')}`, userId: user.id ?? null });
    if ('error' in built) throw new BadRequestException(built.error);
    const payments = [...(Array.isArray(meta.payments) ? meta.payments : []), built.entry];
    const updated = await this.prisma.channelOrder.update({
      where: { id }, data: { metadata: { ...meta, payments } }, include: { integration: true },
    });
    if (paidAdvance(updated.metadata) + 0.5 >= shopDue(updated)) {
      return this.markPaid(user, scope, id).catch(() => this.present(updated));
    }
    return this.present(updated);
  }

  /** Removes a hand-recorded advance (a typing mistake). Payment links cannot be removed. */
  async removeAdvance(user: AuthenticatedUser, scope: ShopScope, id: string, ref: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    const meta = (order.metadata ?? {}) as any;
    const list: any[] = Array.isArray(meta.payments) ? meta.payments : [];
    const row = list.find((p) => p?.ref === ref);
    if (!row || row.provider !== 'MANUAL') throw new NotFoundException('Ye advance nahi mila');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Order paid mark ho chuka — advance ab nahi hatta');
    const updated = await this.prisma.channelOrder.update({
      where: { id }, data: { metadata: { ...meta, payments: list.filter((p) => p?.ref !== ref) } }, include: { integration: true },
    });
    return this.present(updated);
  }

  /**
   * Who pays the delivery on this order: the customer (in the bill and COD),
   * nobody (free, the shop bears it) or the outside rider (keeps it; not in
   * the bill). Changed before the bill is made; the order's delivery charge
   * and total follow, and the website's own figures stay in
   * metadata.deliveryOriginal. Once the bill exists it is not changed here:
   * there is no safe way to edit a bill, so the shop is told what to do.
   */
  async setDeliveryMode(user: AuthenticatedUser, scope: ShopScope, id: string, body: { mode?: string }) {
    const mode = String(body?.mode ?? '').toUpperCase() as DeliveryMode;
    if (!['CUSTOMER', 'FREE', 'RIDER'].includes(mode)) throw new BadRequestException('Delivery ka tareeqa chunein');
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus) || order.orderStatus === 'DELIVERED') throw new BadRequestException('Band ya deliver ho chuke order ki delivery nahi badalti');
    if (order.dispatchedAt || (order.courierBookedAt && order.courierStatus !== 'CANCELLED')) {
      throw new BadRequestException('Parcel courier ko ja chuka ya book ho chuka — ab delivery nahi badalti');
    }
    if (order.nafaaSaleId || order.orderStatus === ACCEPTING) {
      throw new BadRequestException('Bill ban chuka hai, is liye delivery yahan se nahi badalti. Farq ho to customer se baqi paisa advance me likhein, ya order cancel karke naya order lein.');
    }
    const meta = (order.metadata ?? {}) as any;
    const fee = Number(meta.deliveryOriginal?.fee ?? (Number(order.deliveryFee) || Number(meta.riderDelivery) || 0));
    if (!(fee > 0)) throw new BadRequestException('Is order par delivery charge hai hi nahi');
    const inTotal = Number(order.deliveryFee) || 0;
    const goods = Math.max(0, Number(order.total) - inTotal);
    const total = mode === 'FREE' ? goods : goods + fee;
    if (paidAdvance(meta) > total + 0.5) throw new BadRequestException('Customer is se zyada advance de chuka — pehle advance theek karein');
    const { riderDelivery: _r, ...rest } = meta;
    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: {
        deliveryFee: mode === 'FREE' ? 0 : fee,
        total,
        metadata: {
          ...rest,
          deliveryOriginal: meta.deliveryOriginal ?? { fee, total: Number(order.total) },
          deliveryChoice: mode,
          deliveryChoiceBy: { by: user.id, at: new Date().toISOString() },
          ...(mode === 'RIDER' && { riderDelivery: fee }),
        },
      },
      include: { integration: true },
    });
    return this.present(updated);
  }

  /**
   * RTO — customer ne parcel nahi liya, courier wapas le aaya. Bill void
   * (stock khud wapas), order "Wapas aaya". COD ka paisa kabhi aana hi nahi.
   */
  async markReturned(user: AuthenticatedUser, scope: ShopScope, id: string, reason?: string) {
    const order = await this.prisma.channelOrder.findFirst({
      where: { id, ...this.scopeWhere(user, scope) },
      include: { integration: true },
    });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.orderStatus === 'RETURNED') return this.present(order);
    if (!order.nafaaSaleId || !order.dispatchedAt) {
      throw new BadRequestException('Wapas sirf bheja hua (raste me / deliver) order aata hai — warna Cancel karein');
    }
    if (order.paymentStatus === 'PAID' && order.codSettledAt) {
      throw new BadRequestException('Is order ka paisa settle ho chuka — Returns se return karein');
    }
    const sale = await this.prisma.sale.findFirst({
      where: { id: order.nafaaSaleId, tenantId: user.tenantId },
      select: { id: true, status: true },
    });
    if (sale && sale.status !== 'VOIDED') {
      await this.sales.voidSale(user, new ShopScope(null, true), sale.id, `RTO — parcel wapas: ${reason ?? '-'}`);
    }
    const updated = await this.prisma.channelOrder.update({
      where: { id },
      data: {
        orderStatus: 'RETURNED',
        stage: isFlagStage(order.stage) ? order.stage : null,
        returnedAt: new Date(),
        returnReason: reason?.trim() || null,
        paymentStatus: order.paymentStatus === 'PAID' ? 'PAID' : 'NOT_COLLECTED',
      },
      include: { integration: true },
    });
    this.statusHook.send(updated.integration, updated, 'order.returned');
    emitOrderStatus({ tenantId: updated.tenantId, orderId: updated.id, status: 'RETURNED' });
    return this.present(updated);
  }

  /** Courier ne COD ka paisa jama karwaya — ek saath kai orders (settlement sheet se) */
  async settleCod(user: AuthenticatedUser, scope: ShopScope, body: { orderIds: string[]; reference?: string }) {
    const ids = [...new Set(body?.orderIds ?? [])].slice(0, 500);
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    const now = new Date();
    const res = await this.prisma.channelOrder.updateMany({
      where: {
        id: { in: ids },
        ...this.scopeWhere(user, scope),
        nafaaSaleId: { not: null },
        orderStatus: { notIn: CLOSED },
        paymentStatus: { not: 'PAID' },
      },
      data: {
        paymentStatus: 'PAID',
        paymentReceivedAt: now,
        codSettledAt: now,
        codSettlementRef: body.reference?.trim().slice(0, 120) || null,
      },
    });
    // The selling-cost expense follows the settlement (it skips orders that did not change).
    for (const id of ids) emitOrderStatus({ tenantId: user.tenantId, orderId: id, status: 'SETTLED' });
    return { settled: res.count };
  }

  /**
   * COD ka hisaab — courier-wise: raste me kitna, courier ke paas kitna
   * (deliver ho chuka, paisa nahi aaya), is mahine kitna mila, RTO kitne %.
   */
  async codSummary(user: AuthenticatedUser, scope: ShopScope) {
    const base: Prisma.ChannelOrderWhereInput = { ...this.scopeWhere(user, scope), nafaaSaleId: { not: null } };
    const since = new Date(Date.now() - 30 * 86_400_000);
    const { tz, dayStartHour } = await this.tzService.clock(user.tenantId);
    const nowP = tzParts(startOfBusinessDayTz(new Date(), tz, dayStartHour), tz);
    const month = startOfBusinessMonthTz(nowP.year, nowP.month, tz, dayStartHour);
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        ...base,
        // In AND so the branch scope's own OR stays in force.
        AND: [{
          OR: [
            { paymentStatus: { not: 'PAID' }, orderStatus: { notIn: ['CANCELLED', 'REJECTED'] } },
            { codSettledAt: { gte: month } },
            { dispatchedAt: { gte: since } },
          ],
        }],
      },
      select: {
        id: true, externalOrderNumber: true, externalOrderId: true, customerName: true, customerCity: true, total: true,
        orderStatus: true, paymentStatus: true, courierCode: true, courierName: true, trackingNumber: true,
        dispatchedAt: true, deliveredAt: true, returnedAt: true, codSettledAt: true, metadata: true,
        integration: { select: { type: true, displayName: true } },
      },
      orderBy: { dispatchedAt: 'desc' },
      take: 2000,
    });

    type Bucket = { code: string; name: string; inTransit: number; inTransitValue: number; withCourier: number; withCourierValue: number; settledMonth: number; settledMonthValue: number; dispatched30: number; returned30: number; age: number[] };
    // Money with the courier by days since delivery: 0–7, 8–15, 16–30, 30+.
    const AGE_MAX = [7, 15, 30, Infinity];
    const ageIndex = (days: number) => AGE_MAX.findIndex((m) => days <= m);
    const buckets = new Map<string, Bucket>();
    const bucket = (code: string | null, name: string | null) => {
      const k = code ?? 'NONE';
      if (!buckets.has(k)) {
        buckets.set(k, { code: k, name: courierName(code) ?? name ?? 'Courier nahi likha', inTransit: 0, inTransitValue: 0, withCourier: 0, withCourierValue: 0, settledMonth: 0, settledMonthValue: 0, dispatched30: 0, returned30: 0, age: [0, 0, 0, 0] });
      }
      return buckets.get(k)!;
    };

    const withCourier: any[] = [];
    for (const o of rows) {
      const b = bucket(o.courierCode, o.courierName);
      const total = shopDue(o);
      const cod = !!(o.metadata as any)?.cod;
      if (o.dispatchedAt && o.dispatchedAt >= since) {
        b.dispatched30++;
        if (o.orderStatus === 'RETURNED') b.returned30++;
      }
      if (!cod) continue;
      if (o.codSettledAt && o.codSettledAt >= month) { b.settledMonth++; b.settledMonthValue += total; }
      if (o.paymentStatus === 'PAID' || CLOSED.includes(o.orderStatus)) continue;
      if (o.orderStatus === 'OUT_FOR_DELIVERY') { b.inTransit++; b.inTransitValue += total; }
      if (o.orderStatus === 'DELIVERED') {
        b.withCourier++; b.withCourierValue += total;
        b.age[ageIndex(o.deliveredAt ? Math.floor((Date.now() - o.deliveredAt.getTime()) / 86_400_000) : 0)] += total;
        withCourier.push({
          ...o,
          externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
          total, metadata: undefined, courier: courierName(o.courierCode) ?? o.courierName,
          daysWaiting: o.deliveredAt ? Math.floor((Date.now() - o.deliveredAt.getTime()) / 86_400_000) : null,
        });
      }
    }

    const couriers = [...buckets.values()]
      .map((b) => ({ ...b, rtoRate: b.dispatched30 ? Math.round((b.returned30 / b.dispatched30) * 100) : 0 }))
      .sort((a, b) => b.withCourierValue + b.inTransitValue - (a.withCourierValue + a.inTransitValue));
    const sum = (k: keyof Bucket) => couriers.reduce((s, c) => s + Number(c[k] ?? 0), 0);
    const dispatched30 = sum('dispatched30');

    return {
      totals: {
        inTransit: sum('inTransit'), inTransitValue: sum('inTransitValue'),
        withCourier: sum('withCourier'), withCourierValue: sum('withCourierValue'),
        settledMonth: sum('settledMonth'), settledMonthValue: sum('settledMonthValue'),
        rtoRate: dispatched30 ? Math.round((sum('returned30') / dispatched30) * 100) : 0,
        returned30: sum('returned30'), dispatched30,
        age: [0, 1, 2, 3].map((i) => couriers.reduce((t, c) => t + c.age[i], 0)),
      },
      ageLabels: ['0–7 din', '8–15 din', '16–30 din', '30+ din'],
      couriers,
      withCourier,
      courierList: COURIERS,
    };
  }

  /** Website ne khud order cancel/paid kiya (customer ne cancel kiya, refund hua) */
  async applyWebsiteUpdate(integration: Integration, externalOrderId: string, update: { cancelled?: boolean; paid?: boolean; reason?: string }) {
    const order = await this.prisma.channelOrder.findUnique({
      where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId } },
    });
    if (!order) throw new NotFoundException('Order nahi mila');

    if (update.paid && order.paymentStatus !== 'PAID') {
      await this.prisma.channelOrder.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', paymentReceivedAt: new Date() } });
    }
    if (update.cancelled && !['CANCELLED', 'REJECTED', 'DELIVERED'].includes(order.orderStatus)) {
      if (order.nafaaSaleId || order.orderStatus === ACCEPTING) {
        // Bill ban chuka hai (ya ban raha hai) — khud void nahi karte, malik ko batate hain
        await this.mergeMetadata(order.id, { cancelRequested: true, cancelRequestReason: update.reason ?? null });
        await this.notifications.create({
          tenantId: order.tenantId,
          type: 'WARNING' as any,
          title: apiMessage('⚠️ Customer ne order #{{num}} cancel kiya', { num: order.externalOrderNumber ?? externalOrderId }),
          message: 'Bill ban chuka hai — Online Orders me ja kar cancel karein taake stock wapas aaye',
          link: `/online-orders?order=${order.id}`,
          metadata: { channelOrderId: order.id },
        } as any).catch(() => null);
      } else {
        await this.prisma.channelOrder.update({
          where: { id: order.id },
          data: { orderStatus: 'CANCELLED', cancelledAt: new Date(), cancelReason: update.reason ?? 'Website par cancel hua' },
        });
      }
    }
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // ORDERS BOARD — move to any status, soft delete
  // ═══════════════════════════════════════════════════════════

  /**
   * Moves an order straight to any board status. Forward from NEW runs
   * accept first (bill + stock); back to NEW or a hold voids the bill; a
   * closed order is reopened first. Every move is kept in metadata.timeline.
   */
  async move(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    body: { to?: string; reason?: string; trackingNumber?: string; courierCode?: string; force?: boolean },
  ) {
    const to = String(body?.to ?? '') as BoardStatus;
    if (!isBoardStatus(to)) throw new BadRequestException('Ghalat status');
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.deletedAt) throw new BadRequestException('Ye order delete hai — pehle wapas layein');
    if (isCustomStage(to)) {
      const keys = (await this.tools.customStages(user.tenantId)).map((c) => `custom:${c.key}`);
      if (!keys.includes(to)) throw new BadRequestException('Ye stage nahi mili');
    }
    const from = boardOf(order);
    const plan = planMove({
      orderStatus: order.orderStatus === ACCEPTING && this.isStaleLock(order.processedAt) ? 'PENDING' : order.orderStatus,
      stage: order.stage,
      nafaaSaleId: order.nafaaSaleId,
      dispatchedAt: order.dispatchedAt,
      codSettledAt: order.codSettledAt,
      courierBooked: !!order.courierBookedAt && !!order.trackingNumber && order.courierStatus !== 'CANCELLED',
    }, to, { force: body?.force === true });
    if ('error' in plan) throw this.moveError(plan.error);

    const reason = body?.reason?.trim().slice(0, 200) || undefined;
    for (const step of plan.steps) await this.runMoveStep(user, scope, id, step, { ...body, reason });

    const fresh = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id }, include: { integration: true } });
    if (!plan.steps.length && fresh.stage === plan.stage) return this.present(fresh);
    if (fresh.stage !== plan.stage) await this.prisma.channelOrder.update({ where: { id }, data: { stage: plan.stage } });
    await appendTimeline(this.prisma, id, { at: new Date().toISOString(), by: user.id, byName: await this.userName(user), from, to, note: reason ?? null });
    return this.view(id);
  }

  /** Same move for many orders; each one on its own, a failure does not stop the rest. */
  async bulkMove(user: AuthenticatedUser, scope: ShopScope, body: { ids?: string[]; to?: string; reason?: string; force?: boolean }) {
    const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).map(String))];
    if (!ids.length) throw new BadRequestException('Koi order nahi chuna');
    if (ids.length > 200) throw new BadRequestException('Ek dafa me zyada se zyada 200 orders');
    if (!isBoardStatus(body?.to)) throw new BadRequestException('Ghalat status');
    const results: { id: string; ok: boolean; error?: string; code?: string }[] = [];
    for (const id of ids) {
      try {
        await this.move(user, scope, id, { to: body.to, reason: body.reason, force: body.force });
        results.push({ id, ok: true });
      } catch (e: any) {
        const r = e?.response ?? {};
        const m = r.message ?? e?.message ?? 'Nahi hua';
        results.push({ id, ok: false, error: Array.isArray(m) ? m.join(', ') : String(m), ...(r.code && { code: String(r.code) }) });
      }
    }
    return { done: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  private moveError(code: string) {
    switch (code) {
      case 'COD_SETTLED':
        return new BadRequestException({ code, ...apiMessage('Is order ka COD settle ho chuka — ab ye peeche nahi ja sakta') });
      case 'NEEDS_FORCE':
        return new ConflictException({ code, ...apiMessage('Parcel bheja ya courier par book ho chuka hai — phir bhi wapas lana hai to dobara confirm karein') });
      case 'BUSY':
        return new ConflictException({ code, ...apiMessage('Is order ka bill abhi ban raha hai — thori der me dekhein') });
      default:
        return new BadRequestException({ code, ...apiMessage('Ghalat status') });
    }
  }

  private async runMoveStep(
    user: AuthenticatedUser, scope: ShopScope, id: string, step: MoveStep,
    body: { reason?: string; trackingNumber?: string; courierCode?: string },
  ) {
    switch (step.op) {
      case 'accept': await this.accept(user, scope, id, {}); return;
      case 'forward':
        await this.updateStatus(user, scope, id, { status: step.status, trackingNumber: body.trackingNumber, courierCode: body.courierCode });
        return;
      case 'back': await this.moveBack(user, scope, id, step.status); return;
      case 'cancel': await this.cancel(user, scope, id, body.reason); return;
      case 'return': await this.markReturned(user, scope, id, body.reason); return;
      case 'revert': await this.reopen(user, id, 'revert', body.reason); return;
      case 'reopen': await this.reopen(user, id, 'reopen', body.reason); return;
    }
  }

  /**
   * Back to PENDING. `revert`: an accepted order (its bill is voided, stock
   * comes back). `reopen`: a cancelled or returned order (bill already void).
   */
  private async reopen(user: AuthenticatedUser, id: string, kind: 'revert' | 'reopen', note?: string) {
    const order = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id } });
    const data: Prisma.ChannelOrderUpdateManyMutationInput = {
      orderStatus: 'PENDING', nafaaSaleId: null, acceptedAt: null, processedAt: null, dispatchedAt: null, deliveredAt: null,
      ...this.undoDeliveredPayment(order),
    };
    if (kind === 'reopen') {
      Object.assign(data, { cancelledAt: null, cancelReason: null, returnedAt: null, returnReason: null });
      if (['NOT_COLLECTED', 'COLLECTED'].includes(order.paymentStatus)) data.paymentStatus = 'PENDING';
    }
    // The order is unlinked from its bill first: voiding a linked bill cancels the order.
    const res = await this.prisma.channelOrder.updateMany({ where: { id, orderStatus: order.orderStatus, nafaaSaleId: order.nafaaSaleId }, data });
    if (!res.count) throw new ConflictException('Order beech me badal gaya — dobara dekhein');
    if (!order.nafaaSaleId) return;
    const sale = await this.prisma.sale.findFirst({ where: { id: order.nafaaSaleId, tenantId: user.tenantId }, select: { id: true, status: true } });
    if (!sale || sale.status === 'VOIDED') return;
    try {
      await this.sales.voidSale(user, new ShopScope(null, true), sale.id, `Online order wapas Naya: ${note ?? '-'}`);
    } catch (e) {
      // The bill stays, so the order goes back to how it was.
      const undo = Object.fromEntries(Object.keys(data).map((k) => [k, (order as any)[k]]));
      await this.prisma.channelOrder.update({ where: { id }, data: undo }).catch(() => null);
      throw e;
    }
  }

  /** An accepted order one or more steps back (packed → confirmed, delivered → dispatched ...). */
  private async moveBack(user: AuthenticatedUser, scope: ShopScope, id: string, status: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    await this.assertBillAlive(order);
    const data: Prisma.ChannelOrderUpdateManyMutationInput = { orderStatus: status };
    if (order.orderStatus === 'DELIVERED') Object.assign(data, { deliveredAt: null }, this.undoDeliveredPayment(order));
    if ((LIFECYCLE_RANK[status] ?? 0) < LIFECYCLE_RANK.OUT_FOR_DELIVERY) data.dispatchedAt = null;
    if (order.stage === 'PACKED_NOT_SENT' && status !== 'READY') data.stage = null;
    const res = await this.prisma.channelOrder.updateMany({ where: { id, orderStatus: order.orderStatus }, data });
    if (!res.count) throw new ConflictException('Order beech me badal gaya — dobara dekhein');
    const updated = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id }, include: { integration: true } });
    this.statusHook.send(updated.integration, updated, 'order.status_changed');
  }

  /** Payment flags that "Delivered" set on a COD order (not a real settlement). */
  private undoDeliveredPayment(o: { metadata: unknown; codSettledAt: Date | null; paymentStatus: string; deliveredAt: Date | null; paymentReceivedAt: Date | null }) {
    if (!(o.metadata as any)?.cod || o.codSettledAt) return {};
    if (o.paymentStatus === 'COLLECTED') return { paymentStatus: 'PENDING' };
    const sameTime = o.deliveredAt && o.paymentReceivedAt && Math.abs(o.paymentReceivedAt.getTime() - o.deliveredAt.getTime()) < 5_000;
    if (o.paymentStatus === 'PAID' && sameTime) return { paymentStatus: 'PENDING', paymentReceivedAt: null };
    return {};
  }

  /** Soft delete: hidden from lists (DELETED tile only). A live bill is cancelled first. */
  async softDelete(user: AuthenticatedUser, scope: ShopScope, id: string, reason?: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.deletedAt) return this.present(order);
    if (order.orderStatus === ACCEPTING && !this.isStaleLock(order.processedAt)) throw new ConflictException('Bill abhi ban raha hai — 2 second baad delete karein');
    if (order.nafaaSaleId && !CLOSED.includes(order.orderStatus)) {
      const sale = await this.prisma.sale.findFirst({ where: { id: order.nafaaSaleId, tenantId: user.tenantId }, select: { status: true } });
      if (sale && sale.status !== 'VOIDED') await this.cancel(user, scope, id, reason?.trim() || 'Order delete');
    }
    return this.markDeleted(user, id, { reason });
  }

  /** Marks an order deleted (also used when orders are combined). */
  async markDeleted(user: AuthenticatedUser, id: string, opts: { reason?: string; mergedIntoId?: string }) {
    const fresh = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id } });
    const now = new Date();
    const note = opts.reason?.trim().slice(0, 200) || null;
    await this.prisma.channelOrder.update({
      where: { id },
      data: { deletedAt: now, ...(opts.mergedIntoId && { mergedIntoId: opts.mergedIntoId }) },
    });
    await patchOrderMetadata(this.prisma, id, { deleted: { at: now.toISOString(), by: user.id, reason: note } });
    await appendTimeline(this.prisma, id, { at: now.toISOString(), by: user.id, byName: await this.userName(user), from: boardOf(fresh), to: 'DELETED', note });
    return this.view(id);
  }

  async restore(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!order.deletedAt) return this.present(order);
    if (order.mergedIntoId) throw new BadRequestException('Ye order doosre order me jor diya gaya tha — wahi order dekhein');
    await this.prisma.channelOrder.update({ where: { id }, data: { deletedAt: null } });
    await appendTimeline(this.prisma, id, { at: new Date().toISOString(), by: user.id, byName: await this.userName(user), from: 'DELETED', to: boardOf(order) });
    return this.view(id);
  }

  /** Removes a soft-deleted order for good; only owner/manager, never with a live bill. */
  async permanentDelete(user: AuthenticatedUser, scope: ShopScope, id: string) {
    if (!['OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(user.role)) throw new ForbiddenException('Hamesha ke liye delete sirf malik ya manager kar sakta hai');
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (!order.deletedAt) throw new BadRequestException('Pehle order delete karein, phir hamesha ke liye hatayein');
    if (order.nafaaSaleId) {
      const sale = await this.prisma.sale.findFirst({ where: { id: order.nafaaSaleId, tenantId: user.tenantId }, select: { status: true } });
      if (sale && sale.status !== 'VOIDED') throw new BadRequestException('Is order ka bill abhi chal raha hai — hamesha ke liye delete nahi hota');
    }
    await this.prisma.channelOrder.delete({ where: { id } });
    return { ok: true, id };
  }

  /** One order as the list shows it (for other services in this module). */
  async view(id: string) {
    const o = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id }, include: { integration: true } });
    return this.present(o);
  }

  /** Adds a timeline entry (assign, follow-up, combine, split ...). */
  async addTimeline(user: AuthenticatedUser, id: string, to: string, note?: string | null, extra: Prisma.ChannelOrderUpdateInput = {}) {
    const o = await this.prisma.channelOrder.findUniqueOrThrow({ where: { id } });
    if (Object.keys(extra).length) await this.prisma.channelOrder.update({ where: { id }, data: extra });
    await appendTimeline(this.prisma, id, { at: new Date().toISOString(), by: user.id, byName: await this.userName(user), from: boardOf(o), to, note: note ?? null });
    return this.view(id);
  }

  private async userName(user: AuthenticatedUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { fullName: true, email: true } }).catch(() => null);
    return u?.fullName || u?.email || null;
  }

  // ═══════════════════════════════════════════════════════════
  // FULL EDIT — items, money, customer; the bill follows
  // ═══════════════════════════════════════════════════════════

  /**
   * Edits everything on an order. With a live bill, the old bill is voided
   * and a new one made through makeBill (same path as accept), so stock,
   * cost, profit and khata stay right. `syncToChannel` sends the change to
   * Shopify / WooCommerce; a sync failure is reported, never rolled back.
   */
  async editFull(user: AuthenticatedUser, scope: ShopScope, id: string, body: EditFullBody) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id, ...this.scopeWhere(user, scope) }, include: { integration: true } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (order.deletedAt) throw new BadRequestException('Delete hua order edit nahi hota');
    if (CLOSED.includes(order.orderStatus)) throw new BadRequestException('Cancel ya wapas aaya order edit nahi hota');
    if (order.orderStatus === 'DELIVERED' && order.codSettledAt) throw new BadRequestException('Deliver aur COD settle ho chuka order edit nahi hota');
    if (order.orderStatus === ACCEPTING && !this.isStaleLock(order.processedAt)) throw new ConflictException('Is order ka bill abhi ban raha hai — thori der me dekhein');

    const meta = (order.metadata ?? {}) as any;
    const oldItems = ((order.items as unknown as StoredItem[]) ?? []).filter(Boolean);
    const items = Array.isArray(body?.items) ? await this.cleanEditItems(user.tenantId, body.items, oldItems) : oldItems;
    if (!items.length) throw new BadRequestException('Kam az kam ek item rakhein');

    const money = (v: unknown, fallback: number, label: string) => {
      if (v === undefined || v === null || v === '') return fallback;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) throw new BadRequestException(apiMessage('{{label}} sahi likhein', { label }));
      return Math.round(n * 100) / 100;
    };
    const discount = money(body?.discount, Number(order.discount) || 0, 'Discount');
    const deliveryFee = money(body?.deliveryFee, Number(order.deliveryFee) || 0, 'Delivery charge');
    const subtotal = Math.round(items.reduce((s, it) => s + it.price * it.quantity, 0) * 100) / 100;
    if (discount > subtotal + 0.009) throw new BadRequestException('Discount items ki qeemat se zyada nahi ho sakta');
    const total = Math.round(Math.max(0, subtotal - discount + deliveryFee) * 100) / 100;

    const text = (v: unknown, max: number) => (v === undefined ? undefined : String(v ?? '').trim().slice(0, max) || null);
    const fields = {
      customerName: text(body?.customerName, 100),
      customerPhone: text(body?.customerPhone, 20),
      customerAddress: text(body?.customerAddress, 400),
      customerCity: text(body?.customerCity, 80),
      notes: text(body?.notes, 500),
    };
    if (fields.customerName === null) throw new BadRequestException('Customer ka naam khali nahi ho sakta');
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== ((order as any)[k] ?? null)) changes[k] = { from: (order as any)[k] ?? null, to: v };
    }
    let weightKg: number | null | undefined;
    if (body?.weightKg !== undefined) {
      weightKg = body.weightKg === null || (body.weightKg as any) === '' ? null : Number(body.weightKg);
      if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000)) throw new BadRequestException('Wazan sahi likhein (kg)');
      if (weightKg !== (order.weightKg ?? null)) changes.weightKg = { from: order.weightKg ?? null, to: weightKg };
    }
    const sig = (list: StoredItem[]) => JSON.stringify(list.map((i) => [i.name, i.variant ?? null, i.quantity, i.price, i.productId ?? null, i.variantId ?? null]));
    const itemsChanged = sig(oldItems) !== sig(items);
    const moneyChanged = Math.abs(total - Number(order.total)) > 0.009 || Math.abs(discount - Number(order.discount)) > 0.009 || Math.abs(deliveryFee - Number(order.deliveryFee)) > 0.009;
    if (itemsChanged) changes.items = { from: summary(oldItems), to: summary(items) };
    if (moneyChanged) changes.total = { from: Number(order.total), to: total };

    const addressChanged = !!(changes.customerAddress || changes.customerCity || changes.customerPhone);
    const booked = !!order.courierBookedAt && !!order.trackingNumber && order.courierStatus !== 'CANCELLED';
    if (booked && (addressChanged || (moneyChanged && meta.cod))) {
      throw new BadRequestException('Courier booking ho chuki — pehle booking cancel karein, phir order badlein aur dobara book karein');
    }
    if (order.dispatchedAt && addressChanged) throw new BadRequestException('Parcel ja chuka — ab courier se address badalwayein');
    if (paidAdvance(meta) > total + 0.5) throw new BadRequestException('Customer is se zyada advance de chuka — pehle advance theek karein');
    if (!Object.keys(changes).length) return { order: this.present(order), sync: null };

    // ─── The bill follows the new items and money ─────────────
    let nafaaSaleId = order.nafaaSaleId;
    let finalItems = items;
    let rebilled = false;
    const liveSale = order.nafaaSaleId
      ? await this.prisma.sale.findFirst({ where: { id: order.nafaaSaleId, tenantId: user.tenantId }, select: { id: true, status: true } })
      : null;
    if (liveSale && liveSale.status !== 'VOIDED' && (itemsChanged || moneyChanged)) {
      const matched: ItemMatch[] = [];
      const unmatched: { index: number; name: string; sku?: string; variant?: string }[] = [];
      for (let i = 0; i < items.length; i++) {
        const r = items[i].productId
          ? { productId: items[i].productId!, variantId: items[i].variantId ?? null }
          : await this.resolveItem(user.tenantId, order.integrationId, items[i]);
        if (r) matched[i] = { productId: r.productId, variantId: r.variantId ?? null };
        else unmatched.push({ index: i, name: items[i].name, sku: items[i].sku, variant: items[i].variant });
      }
      if (unmatched.length) {
        throw new ConflictException({
          code: 'UNMATCHED_ITEMS',
          ...apiMessage('{{unmatchedCount}} item ka Nafaa product nahi mila — pehle jodein', { unmatchedCount: unmatched.length }),
          unmatched,
        });
      }
      finalItems = items.map((it, i) => ({ ...it, productId: matched[i].productId, variantId: matched[i].variantId ?? null }));
      // Unlink first: voiding a bill that is still linked cancels the order.
      await this.prisma.channelOrder.update({ where: { id }, data: { nafaaSaleId: null } });
      try {
        await this.sales.voidSale(user, new ShopScope(null, true), liveSale.id, 'Online order edit — naya bill');
      } catch (e) {
        await this.prisma.channelOrder.update({ where: { id }, data: { nafaaSaleId: liveSale.id } }).catch(() => null);
        throw e;
      }
      const draft = { ...order, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)), items: finalItems } as unknown as typeof order;
      try {
        const made = await this.makeBill(user, scope, draft, finalItems, matched, { shopId: order.shopId, priceOverride: true, discount, deliveryFee });
        nafaaSaleId = made.sale.id;
        rebilled = true;
      } catch (e: any) {
        await this.restoreBill(user, scope, order, oldItems, String(e?.response?.message ?? e?.message ?? ''));
        throw e;
      }
    }

    const now = new Date().toISOString();
    const nextMeta: any = {
      ...meta,
      ...(meta.riderDelivery !== undefined && { riderDelivery: deliveryFee }),
      edits: [...(meta.edits ?? []), { at: now, by: user.id, byName: await this.userName(user), changes, rebilled }].slice(-20),
    };
    const data: Prisma.ChannelOrderUpdateInput = {
      items: finalItems as any,
      subtotal, discount, deliveryFee, total,
      nafaaSaleId,
      metadata: nextMeta,
      ...(weightKg !== undefined && { weightKg }),
    };
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && changes[k]) (data as any)[k] = v;
    let updated = await this.prisma.channelOrder.update({ where: { id }, data, include: { integration: true } });

    let sync: SyncResult | null = null;
    if (body?.syncToChannel) {
      const customer: SyncCustomer = {};
      for (const k of ['customerName', 'customerPhone', 'customerAddress', 'customerCity', 'notes'] as const) if (changes[k]) customer[k] = fields[k];
      sync = await this.channelSync.pushEdit(order.integration, order, oldItems as SyncItem[], finalItems as SyncItem[], Object.keys(customer).length ? customer : null)
        .catch((e: any) => ({ channel: order.integration.type, ok: false, message: String(e?.message ?? 'Sync nahi hua') }));
      if (!sync.ok) {
        const m = (updated.metadata ?? {}) as any;
        updated = await this.prisma.channelOrder.update({
          where: { id },
          data: { metadata: { ...m, syncErrors: [...(m.syncErrors ?? []), { at: now, kind: 'EDIT', channel: sync.channel, message: sync.message }].slice(-20) } },
          include: { integration: true },
        });
      }
    }
    return { order: this.present(updated), sync };
  }

  /**
   * The new bill could not be made after the old one was voided: make the
   * old bill again so stock stays right; if even that fails, the order goes
   * back to NEW without a bill so the shop accepts it again.
   */
  private async restoreBill(user: AuthenticatedUser, scope: ShopScope, order: ChannelOrder & { integration: Integration }, oldItems: StoredItem[], why: string) {
    try {
      const matched = oldItems.map((it) => ({ productId: it.productId as string, variantId: it.variantId ?? null }));
      if (matched.some((m) => !m.productId)) throw new Error('unmatched');
      const made = await this.makeBill(user, scope, order, oldItems, matched, {
        shopId: order.shopId, priceOverride: readWebsiteConfig(order.integration.config).priceSource === 'WEBSITE',
      });
      await this.prisma.channelOrder.update({ where: { id: order.id }, data: { nafaaSaleId: made.sale.id } });
    } catch {
      await this.prisma.channelOrder.update({
        where: { id: order.id },
        data: { nafaaSaleId: null, orderStatus: 'PENDING', acceptedAt: null, processedAt: null, metadata: { ...((order.metadata as any) ?? {}), editError: why.slice(0, 300) } },
      });
    }
  }

  /** Checks edited lines: product/size of this shop, sane quantity and price; channel ids carried over. */
  private async cleanEditItems(tenantId: string, raw: NonNullable<EditFullBody['items']>, oldItems: StoredItem[]): Promise<StoredItem[]> {
    if (raw.length > 100) throw new BadRequestException('Zyada se zyada 100 items');
    const used = new Set<number>();
    const out: StoredItem[] = [];
    for (const r of raw) {
      const label = String(r?.name ?? '').trim() || 'Item';
      const quantity = Number(r?.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) throw new BadRequestException(apiMessage('{{name}}: tadad sahi likhein', { name: label }));
      const price = Number(r?.price);
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException(apiMessage('{{name}}: qeemat sahi likhein', { name: label }));
      let product: { id: string; name: string; sku: string | null; hasVariants: boolean } | null = null;
      let variant: { id: string; name: string; size: string | null; color: string | null; sku: string | null } | null = null;
      if (r?.productId) {
        product = await this.prisma.product.findFirst({ where: { id: String(r.productId), tenantId, isActive: true }, select: { id: true, name: true, sku: true, hasVariants: true } });
        if (!product) throw new BadRequestException(apiMessage('{{name}}: product nahi mila', { name: label }));
        if (product.hasVariants && !r.variantId) throw new BadRequestException(apiMessage('{{name}}: is product ke size/variant hain — sahi size chunein', { name: product.name }));
        if (r.variantId) {
          variant = await this.prisma.productVariant.findFirst({
            where: { id: String(r.variantId), productId: product.id, isActive: true },
            select: { id: true, name: true, size: true, color: true, sku: true },
          });
          if (!variant) throw new BadRequestException(apiMessage('{{name}}: chuna hua variant is product ka nahi', { name: product.name }));
        }
      }
      const name = String(r?.name ?? '').trim().slice(0, 200) || product?.name;
      if (!name) throw new BadRequestException('Item ka naam likhein');
      const variantLabel = r?.variant?.trim() || (variant ? variant.name || [variant.color, variant.size].filter(Boolean).join(' / ') : undefined);
      const j = oldItems.findIndex((o, k) => !used.has(k) && (product
        ? o.productId === product.id && (o.variantId ?? null) === (variant?.id ?? null)
        : o.name === name && (o.variant ?? '') === (variantLabel ?? '')));
      const old = j >= 0 ? oldItems[j] : undefined;
      if (j >= 0) used.add(j);
      out.push(clean({
        name,
        sku: r?.sku?.trim() || variant?.sku || product?.sku || old?.sku || undefined,
        variant: variantLabel || old?.variant,
        quantity,
        price: Math.round(price * 100) / 100,
        image: old?.image,
        externalProductId: old?.externalProductId,
        externalVariantId: old?.externalVariantId,
        productId: product?.id ?? old?.productId,
        variantId: product ? variant?.id ?? null : old?.variantId ?? null,
      }));
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════
  // TEST ORDER
  // ═══════════════════════════════════════════════════════════

  async createTestOrder(tenantId: string, integration: Integration) {
    const config = readWebsiteConfig(integration.config);
    const shopId = config.shopId ?? integration.shopId;

    // Asli products lo jin ka stock ho — taake test me accept → bill → stock sab chal ke dikhe
    const stocked = await this.prisma.shopStock.findMany({
      where: { tenantId, ...(shopId && { shopId }), variantId: null, stock: { gte: 2 }, product: { isActive: true } },
      take: 2,
      orderBy: { stock: 'desc' },
      select: { product: { select: { id: true, name: true, sku: true, price: true } } },
    });

    // Test order ke items seedha Nafaa product se jure aate hain (productId) —
    // is ke liye koi channel link nahi banta, warna Products tab me "TEST-…"
    // ka jhoota link dikhta tha.
    const items = stocked.length
      ? stocked.map((s, i) => ({
          name: s.product.name,
          sku: s.product.sku ?? undefined,
          productId: s.product.id,
          quantity: i === 0 ? 1 : 2,
          price: Number(s.product.price),
        }))
      : [{ name: 'Test Product', sku: 'TEST-001', quantity: 1, price: 500 }];

    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const n = Date.now().toString().slice(-5);
    const order = await this.receive(integration, {
      platform: 'custom',
      externalOrderId: `TEST-${Date.now()}`,
      externalOrderNumber: `TEST-${n}`,
      customerName: 'Test Customer',
      customerPhone: '03000000000',
      customerAddress: 'House 1, Street 1, Model Town',
      customerCity: 'Lahore',
      items,
      subtotal,
      deliveryFee: 150,
      discount: 0,
      total: subtotal + 150,
      paymentMethod: 'cod',
      paymentStatus: 'PENDING',
      cancelled: false,
      notes: 'Ye test order hai — accept karke dekhein, phir cancel kar dein (stock wapas aa jayega)',
      shippingMethod: 'Standard',
      paymentTitle: 'Cash on Delivery',
    }, { signed: true, test: true });

    return { success: true, message: 'Test order aa gaya — Online Orders me dekhein', channelOrderId: order.id };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Item → Nafaa product. Sirf pakki pehchan: pehle ka link, SKU, barcode,
   * variant SKU, ya bilkul same naam (aur wo bhi sirf ek product ho).
   * "Milta julta naam" nahi — warna "Chai" ka order "Chai Patti 1kg" se jud jata tha.
   */
  private async resolveItem(tenantId: string, integrationId: string, it: StoredItem): Promise<(ItemMatch & { via: string }) | null> {
    if (it.productId) {
      if (it.variantId) return { productId: it.productId, variantId: it.variantId, via: 'saved' };
      const saved = await this.prisma.product.findFirst({ where: { id: it.productId, tenantId, isActive: true }, select: { id: true, hasVariants: true } });
      if (saved) {
        const hit = await this.withVariant(saved, it, 'saved');
        if (hit) return hit;
      }
    }

    // 1. SKU/barcode sab se pakki pehchan — variant ka SKU pehle, taake
    //    "Shirt (M)" ka stock "Shirt" ke base stock se na kate
    if (it.sku) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { OR: [{ sku: it.sku }, { barcode: it.sku }], isActive: true, product: { tenantId, isActive: true } },
        select: { id: true, productId: true },
      });
      if (variant) return { productId: variant.productId, variantId: variant.id, via: 'sku' };

      const p = await this.prisma.product.findFirst({
        where: { tenantId, isActive: true, OR: [{ sku: it.sku }, { barcode: it.sku }] },
        select: { id: true, hasVariants: true },
      });
      if (p) return this.withVariant(p, it, 'sku');
    }

    // 2. Pehle ka link (import ya haath se jora hua)
    const extIds = [it.externalVariantId, it.externalProductId].filter(Boolean) as string[];
    if (extIds.length || it.sku) {
      // Variant ka link sab se pakka (Small/Red alag), phir product ka, phir SKU
      const byVariant = it.externalVariantId
        ? await this.prisma.productChannelMapping.findFirst({
            where: { integrationId, externalVariantId: it.externalVariantId },
            select: { productId: true, variantId: true },
          })
        : null;
      const mapping = byVariant ?? await this.prisma.productChannelMapping.findFirst({
        where: {
          integrationId,
          OR: [
            ...(it.externalProductId ? [{ externalProductId: it.externalProductId, externalVariantId: null }] : []),
            ...(extIds.length ? [{ externalProductId: { in: extIds } }] : []),
            ...(it.sku ? [{ externalSku: it.sku }] : []),
          ],
        },
        select: { productId: true, variantId: true },
      });
      if (mapping) {
        const p = await this.prisma.product.findFirst({
          where: { id: mapping.productId, tenantId, isActive: true },
          select: { id: true, hasVariants: true },
        });
        if (p && mapping.variantId) return { productId: p.id, variantId: mapping.variantId, via: 'link' };
        if (p) return this.withVariant(p, it, 'link');
      }
    }

    // 3. Bilkul same naam — aur sirf ek hi product ho
    if (it.name) {
      const same = await this.prisma.product.findMany({
        where: { tenantId, isActive: true, name: { equals: it.name.trim(), mode: 'insensitive' } },
        select: { id: true, hasVariants: true },
        take: 2,
      });
      if (same.length === 1) return this.withVariant(same[0], it, 'name');
    }
    return null;
  }

  /**
   * Variants wala product mila to sahi variant chahiye (naam se: "M", "Black / L").
   * Na mile to null — malik khud chune, base stock se galat na kate.
   */
  private async withVariant(p: { id: string; hasVariants: boolean }, it: StoredItem, via: string) {
    if (!p.hasVariants) return { productId: p.id, variantId: null, via };
    const want = (it.variant ?? '').trim().toLowerCase();
    if (!want) return null;
    const variants = await this.prisma.productVariant.findMany({
      where: { productId: p.id, isActive: true },
      select: { id: true, name: true, size: true, color: true },
    });
    const hit = variants.find((v) =>
      [v.name, v.size, v.color, [v.color, v.size].filter(Boolean).join(' / '), [v.size, v.color].filter(Boolean).join(' / ')]
        .some((x) => x && x.trim().toLowerCase() === want),
    );
    return hit ? { productId: p.id, variantId: hit.id, via } : null;
  }

  /**
   * Bill Sales History se void ho chuka ho to order aage nahi badhta —
   * warna order "Deliver" aur "COD baqi" me ginta rehta jabke bill hai hi nahi.
   */
  private async assertBillAlive(order: { id: string; nafaaSaleId: string | null; tenantId: string }) {
    if (!order.nafaaSaleId) return;
    const sale = await this.prisma.sale.findFirst({
      where: { id: order.nafaaSaleId, tenantId: order.tenantId },
      select: { status: true },
    });
    if (sale && sale.status !== 'VOIDED') return;
    await this.prisma.channelOrder.update({
      where: { id: order.id },
      data: { orderStatus: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Bill void ho gaya tha' },
    });
    throw new BadRequestException('Is order ka bill void ho chuka hai — order cancel kar diya gaya');
  }

  /** SalesService jo total banayega wahi — lines − discount + delivery */
  private async expectedBillTotal(
    items: StoredItem[],
    matched: ItemMatch[],
    priceSource: 'WEBSITE' | 'NAFAA',
    discount: number,
    deliveryFee: number,
  ) {
    let lines = 0;
    if (priceSource === 'WEBSITE') {
      lines = items.reduce((s, it) => s + it.price * it.quantity, 0);
    } else {
      const productIds = [...new Set(matched.map((m) => m.productId))];
      const variantIds = matched.map((m) => m.variantId).filter(Boolean) as string[];
      const [products, variants] = await Promise.all([
        this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true } }),
        variantIds.length
          ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, price: true } })
          : [],
      ]);
      items.forEach((it, i) => {
        const m = matched[i];
        const v = m.variantId ? variants.find((x) => x.id === m.variantId) : undefined;
        const p = products.find((x) => x.id === m.productId);
        lines += Number(v?.price ?? p?.price ?? 0) * it.quantity;
      });
    }
    return Math.max(lines - discount + deliveryFee, 0);
  }

  /** Haath se jora gaya product agli dafa khud mil jaye */
  private async rememberMatches(integrationId: string, items: StoredItem[], matched: (ItemMatch & { via: string })[]) {
    for (let i = 0; i < items.length; i++) {
      const m = matched[i];
      const it = items[i];
      if (!m || m.via !== 'manual') continue;
      const ext = it.externalProductId ?? it.sku;
      if (!ext) continue;
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_linkKey: { integrationId: integrationId, linkKey: mappingKey(m.productId, m.variantId) } },
        create: { linkKey: mappingKey(m.productId, m.variantId), integrationId, productId: m.productId, variantId: m.variantId ?? null, externalProductId: ext, externalVariantId: it.externalVariantId ?? null, externalTitle: it.variant ? `${it.name} — ${it.variant}` : it.name, externalSku: it.sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
        update: { externalProductId: ext, externalVariantId: it.externalVariantId ?? null, externalSku: it.sku, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
      }).catch(() => null);
    }
  }

  private async findOrCreateCustomer(tenantId: string, shopId: string, order: any): Promise<string | undefined> {
    const phone = String(order.customerPhone ?? '').replace(/[^\d+]/g, '');
    if (phone.length < 7) return undefined;
    const existing = await this.prisma.customer.findFirst({ where: { tenantId, phone }, select: { id: true } });
    if (existing) return existing.id;
    const created = await this.prisma.customer.create({
      data: {
        tenantId,
        shopId,
        name: order.customerName || 'Online Customer',
        phone,
        email: order.customerEmail ?? null,
        address: order.customerAddress ?? null,
        city: order.customerCity ?? null,
        notes: 'Website order se aaya customer',
      },
      select: { id: true },
    });
    return created.id;
  }

  /** Auto-accept ke liye: dukaan ka malik (sale uske naam se banti hai) */
  async systemActor(tenantId: string): Promise<AuthenticatedUser> {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true, role: UserRole.OWNER },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true },
    });
    if (!owner) throw new BadRequestException('Dukaan ka koi active malik nahi mila');
    return {
      id: owner.id, sub: owner.id, tenantId, email: owner.email, role: owner.role,
      shopId: null, permissions: [],
    };
  }

  /** Order-level warning signs for the risk badge (customer-risk.withSignals). */
  private signals(
    o: { id: string; customerPhone: string | null; customerCity: string | null; receivedAt: Date; total: unknown; paymentStatus: string; metadata: unknown },
    avgOrder: number | null, times: Map<string, Array<{ id: string; at: Date }>>, cityCovered: boolean | null,
  ): OrderSignals {
    const k = phoneKey(o.customerPhone);
    const others = (k ? times.get(k) ?? [] : []).filter((t) => t.id !== o.id);
    const nearest = others.length ? Math.min(...others.map((t) => Math.abs(t.at.getTime() - o.receivedAt.getTime()) / 60_000)) : null;
    return {
      cod: (o.metadata as any)?.cod ? orderMoney(o as any).codDue : 0,
      avgOrder, nearestOrderMinutes: nearest, cityCovered, city: o.customerCity,
    };
  }

  private readonly avgCache = new Map<string, { at: number; value: number | null }>();
  /** The shop's average delivered online order over 90 days (cached 10 minutes). */
  private async avgOrderValue(tenantId: string): Promise<number | null> {
    const hit = this.avgCache.get(tenantId);
    if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
    const a = await this.prisma.channelOrder.aggregate({
      where: { tenantId, orderStatus: 'DELIVERED', receivedAt: { gte: new Date(Date.now() - 90 * 86_400_000) } },
      _avg: { total: true }, _count: { _all: true },
    }).catch(() => null);
    const value = a && a._count._all >= 5 ? Math.round(Number(a._avg.total ?? 0)) : null;
    this.avgCache.set(tenantId, { at: Date.now(), value });
    return value;
  }

  /** Whether a city is in a connected courier's city list; set by the courier service (it depends on this one). */
  private cityCheck?: (tenantId: string, city: string) => Promise<boolean | null>;
  setCityCheck(fn: (tenantId: string, city: string) => Promise<boolean | null>) { this.cityCheck = fn; }

  private async mergeMetadata(id: string, patch: Record<string, any>) {
    await patchOrderMetadata(this.prisma, id, patch).catch(() => null);
  }

  private present(o: any) {
    const meta = (o.metadata ?? {}) as any;
    const { raw, ...safeMeta } = meta;
    return {
      ...o,
      // Shopify "#1002" bhejta hai — UI khud "#" lagata hai
      externalOrderNumber: o.externalOrderNumber ? String(o.externalOrderNumber).replace(/^#+/, '') : o.externalOrderNumber,
      integration: o.integration
        ? { id: o.integration.id, type: o.integration.type, displayName: o.integration.displayName }
        : undefined,
      metadata: safeMeta,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.deliveryFee),
      discount: Number(o.discount),
      total: Number(o.total),
      isCod: !!meta.cod,
      isTest: !!meta.test,
      platform: meta.platform ?? 'custom',
      nextStatus: FLOW.includes(o.orderStatus) ? FLOW[FLOW.indexOf(o.orderStatus) + 1] ?? null : null,
      // Orders board column (NEW, ON_HOLD, PACKED, custom:<key> ...).
      board: boardOf(o),
      courierLabel: courierName(o.courierCode) ?? o.courierName ?? null,
      courierSite: courierLink(o.courierCode, o.trackingNumber),
      // Nafaa se courier API par book hua (PostEx/Leopards) — label/refresh/cancel yahin se
      courierBooked: !!o.courierBookedAt && !!o.trackingNumber && o.courierStatus !== 'CANCELLED' && o.courierStatus !== 'BOOKING',
      courierTrail: meta.courierTrail ?? null,
      confirmation: meta.confirmation ? { result: meta.confirmation.result, at: meta.confirmation.at, attempts: meta.confirmation.attempts ?? 1, note: meta.confirmation.note ?? null } : null,
      autoBookError: meta.autoBookError ?? null,
      // Advance received, COD the courier still collects, and who keeps the delivery charge.
      money: orderMoney(o, o.integration?.config ? readWebsiteConfig(o.integration.config).deliveryFeeMode : null),
    };
  }
}

/** List me sab orders ek saath ginte hain — har row se us ka apna order nikalo */
function minusSelf(r: CustomerRisk, status: string, total: number) {
  const h = { total: r.total - 1, delivered: r.delivered, returned: r.returned, cancelled: r.cancelled, open: r.open, spent: r.spent };
  if (status === 'DELIVERED') { h.delivered--; h.spent -= total; }
  else if (status === 'RETURNED') h.returned--;
  else if (status === 'CANCELLED' || status === 'REJECTED') h.cancelled--;
  else h.open--;
  for (const k of Object.keys(h) as (keyof typeof h)[]) h[k] = Math.max(0, h[k]);
  return h;
}

/** Short text of an item list for the edit log. */
function summary(items: StoredItem[]) {
  return items.map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ''} x${i.quantity} @${i.price}`).join('; ').slice(0, 500);
}

/** Drops undefined keys so stored JSON stays small. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
