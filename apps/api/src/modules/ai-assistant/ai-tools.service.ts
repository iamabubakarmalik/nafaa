/**
 * Read-only data tools for Nafaa AI.
 *
 * Every tool reads the shop's own data through the same services the app's
 * reports use (report centre, khata, low stock, staff shifts, loyalty, stock
 * analysis, online orders), so an answer matches the report page it links
 * to. Each tool:
 *   - checks the user's permission for that data and returns NO_PERMISSION
 *     when it is missing,
 *   - runs in the user's tenant and selected branch (ShopScope),
 *   - removes cost and profit figures when the user may not see them
 *     (cost.view, profit_report.view, Settings → Reports staff figures),
 *   - returns a compact, aggregated result capped in rows, plus optional
 *     chart, report link and reorder data for the client.
 *
 * No tool writes anything.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../common/constants/permissions.constants';
import { hiddenFigures, isOwnerRole } from '../../common/helpers/reports-config.helper';
import { stripCostKeys } from '../../common/interceptors/cost-masking.interceptor';
import { profitFigures } from '../../common/helpers/business-math.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { ReportsCenterService } from '../reports/reports/reports-center.service';
import { reportRange } from '../reports/reports/report-range';
import { CustomerCreditService } from '../reports/customers-report/customer-credit.service';
import { StaffShiftsService } from '../reports/staff-report/staff-shifts.service';
import { StockAnalysisService } from '../reports/stock-report/stock-analysis.service';
import { LoyaltyService } from '../customers/loyalty/loyalty.service';
import { LowStockService } from '../inventory/low-stock/low-stock.service';
import { OrderToolsService } from '../../integrations/online-orders/order-tools.service';
import type { AiActionProposal, AiChart, AiLink, AiReorder, AiReorderGroup } from './ai.types';
import { ACTION_TOOLS } from './ai-action-tools';
import { hourRange } from './ai-render';

/* ───────────────────────── context and results ───────────────────────── */

export interface AiToolContext {
  user: AuthenticatedUser;
  scope: ShopScope;
  tz: string;
  dayStartHour: number;
  /** 0 = Sunday. */
  weekStart: number;
  /** Today's business day, YYYY-MM-DD. */
  today: string;
  shopName: string;
  branchName: string | null;
  /** May see cost and profit figures. */
  canProfit: boolean;
  /** Settings → Reports hides drawer money from this user. */
  drawerHidden: boolean;
}

export interface AiToolResult {
  /** What the model reads. Compact JSON-able value. */
  data: unknown;
  chart?: AiChart;
  link?: AiLink;
  reorder?: AiReorder;
  /** A proposed write the user must confirm. */
  action?: AiActionProposal;
  /** True when the tool refused (permission, bad input) — not counted as data. */
  refused?: boolean;
}

/* ───────────────────────── small helpers ───────────────────────── */

const n = (v: unknown) => Number(v ?? 0) || 0;
const r2 = (v: number) => Math.round(v * 100) / 100;
const pct = (now: number, before: number | null | undefined) =>
  before == null || Math.abs(before) < 0.005 ? null : r2(((now - before) / Math.abs(before)) * 100);
const WEEKDAYS = ['Itwaar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const KEY = /^\d{4}-\d{2}-\d{2}$/;

function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function monthStart(key: string, back = 0): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return d.toISOString().slice(0, 10);
}
function monthEnd(key: string, back = 0): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - back, 0)).toISOString().slice(0, 10);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keys that never help an answer and cost tokens. */
const DROP_KEYS = new Set([
  'id', 'image', 'images', 'sku', 'barcode', 'color', 'heatmap', 'hourOpen', 'capped', 'page', 'pages', 'grouping',
  'metadata', 'settings', '_cat', '_brand', 'phone', 'email', 'address', 'notes', 'byHour', 'byWeekday',
]);

/**
 * Shrinks a service result for the model: drops ids and noise, caps arrays,
 * rounds numbers and turns dates into YYYY-MM-DD. Arrays longer than `cap`
 * keep the first `cap` rows and note how many were left out.
 */
export function compact(value: unknown, cap = 8, depth = 0): unknown {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return Number.isFinite(value) ? r2(value) : undefined;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return UUID.test(value) ? undefined : value;
  if (typeof value !== 'object') return value;
  if (typeof (value as { toNumber?: () => number }).toNumber === 'function') return r2((value as { toNumber: () => number }).toNumber());
  if (depth > 4) return undefined;
  if (Array.isArray(value)) {
    const rows = value.slice(0, cap).map((x) => compact(x, cap, depth + 1)).filter((x) => x !== undefined);
    return value.length > cap ? [...rows, { _more: value.length - cap }] : rows;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (DROP_KEYS.has(k) || /Id$/.test(k)) continue;
    const c = compact(v, cap, depth + 1);
    if (c === undefined || (Array.isArray(c) && c.length === 0)) continue;
    out[k] = c;
  }
  return out;
}

/* ───────────────────────── tool definitions ───────────────────────── */

const PERIOD_NAMES = [
  'today', 'yesterday', 'this_week', 'last_week', 'last_7_days', 'this_month', 'last_month',
  'last_30_days', 'last_90_days', 'this_year', 'all_time', 'custom',
] as const;
type PeriodName = (typeof PERIOD_NAMES)[number];

const periodProps = {
  period: {
    type: 'string',
    enum: [...PERIOD_NAMES],
    description: 'Time window in the shop\'s business days. "custom" needs from and to. Default: this_month for reports, today for "aaj".',
  },
  from: { type: 'string', description: 'YYYY-MM-DD, only with period=custom.' },
  to: { type: 'string', description: 'YYYY-MM-DD, only with period=custom.' },
} as const;

interface ToolSpec {
  name: string;
  description: string;
  properties: Record<string, unknown>;
  required?: string[];
  /** All listed permissions are needed. */
  needs: PermissionKey[];
  /** Short Roman Urdu status line shown while the tool runs. */
  status: string;
}

const P = PERMISSIONS;

/** Fixed order: the tool list is part of the cached prompt prefix. */
export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'sales_summary',
    description: 'Sales of a period: net sale (after returns), bills, average bill, cash received, udhaar given, discount, refunds, customers; split by payment method, busiest hours and weekdays, day-by-day trend, and the previous period of equal length for comparison.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW],
    status: 'Sale dekh raha hoon…',
  },
  {
    name: 'profit_summary',
    description: 'Profit of a period: sale, cost of goods, gross profit and margin, paid expenses, stock written off (damage, loss), net profit, day-by-day rows and the previous period. Use for any profit or margin question.',
    properties: { ...periodProps },
    needs: [P.PROFIT_REPORT_VIEW, P.COST_VIEW],
    status: 'Profit ka hisaab laga raha hoon…',
  },
  {
    name: 'product_performance',
    description: 'Products or categories/brands in a period ranked by sale (revenue), profit, quantity sold, lowest sellers, or slow stock (in stock but not sold in the period).',
    properties: {
      ...periodProps,
      sort_by: { type: 'string', enum: ['revenue', 'profit', 'qty', 'lowest', 'slow'], description: 'Default revenue.' },
      group_by: { type: 'string', enum: ['product', 'category', 'brand'], description: 'Default product.' },
      limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Rows to return, default 10.' },
    },
    needs: [P.REPORTS_VIEW],
    status: 'Products dekh raha hoon…',
  },
  {
    name: 'stock_reorder',
    description: 'Low stock and reorder suggestions per branch: current stock, units sold per day (recent history), days of stock left, suggested order quantity to cover lead time plus cover days, already on order, last supplier. mode=low_stock lists out/low/soon items; mode=reorder lists what to buy now.',
    properties: {
      mode: { type: 'string', enum: ['low_stock', 'reorder'], description: 'Default reorder.' },
      lead_days: { type: 'integer', minimum: 0, maximum: 60, description: 'Days a supplier takes to deliver. Default 3.' },
      cover_days: { type: 'integer', minimum: 1, maximum: 120, description: 'Days the order should last after it arrives. Default 14.' },
      history_days: { type: 'integer', minimum: 7, maximum: 180, description: 'Sales history used for the daily rate. Default 30.' },
      limit: { type: 'integer', minimum: 1, maximum: 30, description: 'Default 12.' },
    },
    needs: [P.LOW_STOCK_VIEW],
    status: 'Stock aur reorder dekh raha hoon…',
  },
  {
    name: 'stock_value',
    description: 'Stock on hand: total items, value at cost and at sale price, ok/low/out counts, by category, brand and supplier, dead stock.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW],
    status: 'Stock ki value dekh raha hoon…',
  },
  {
    name: 'stock_movements',
    description: 'Stock movement in a period by type (purchase in, sale out, returns, adjustments, damage, loss, transfers) with the products that moved most.',
    properties: { ...periodProps, limit: { type: 'integer', minimum: 1, maximum: 20 } },
    needs: [P.STOCK_MOVEMENTS_VIEW],
    status: 'Stock ki aamad-o-raft dekh raha hoon…',
  },
  {
    name: 'khata_udhaar',
    description: 'Customer udhaar (khata): total receivable, who owes the most, how old the balances are (ageing bands), customers with no payment for 60+ days, over credit limit, udhaar given and recovered in the period.',
    properties: { ...periodProps, limit: { type: 'integer', minimum: 1, maximum: 25, description: 'Debtors to list, default 10.' } },
    needs: [P.KHATA_VIEW],
    status: 'Khata dekh raha hoon…',
  },
  {
    name: 'expenses_summary',
    description: 'Paid expenses of a period: total, per day, share of sale, by category, by payment method, the biggest entries, pending (unpaid) bills, previous period.',
    properties: { ...periodProps },
    needs: [P.EXPENSES_VIEW],
    status: 'Expenses dekh raha hoon…',
  },
  {
    name: 'purchases_suppliers',
    description: 'Purchases of a period and supplier dues: purchase value, paid, on credit, by supplier, items bought most, suppliers the shop owes money to now.',
    properties: { ...periodProps },
    needs: [P.PURCHASES_VIEW],
    status: 'Purchases aur suppliers dekh raha hoon…',
  },
  {
    name: 'customer_insights',
    description: 'Customers in a period: named customers, new vs returning (repeat), walk-in share, top customers by sale, sign-ups.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW, P.CUSTOMERS_VIEW],
    status: 'Customers dekh raha hoon…',
  },
  {
    name: 'loyalty_summary',
    description: 'Loyalty points programme in a period: points earned and redeemed, members with points, outstanding points, tiers.',
    properties: { ...periodProps },
    needs: [P.LOYALTY_VIEW],
    status: 'Loyalty dekh raha hoon…',
  },
  {
    name: 'staff_performance',
    description: 'Staff and cashiers in a period: sale and bills per person, discounts given per person, refunds/returns processed per person, voided bills and who voided them.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW, P.STAFF_VIEW],
    status: 'Staff ka kaam dekh raha hoon…',
  },
  {
    name: 'cash_drawer',
    description: 'Cash drawer shifts in a period: shifts opened/closed, expected vs counted cash, short and excess per person and branch, open drawers now.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW, P.CASH_REGISTER_VIEW],
    status: 'Galle ka hisaab dekh raha hoon…',
  },
  {
    name: 'returns_summary',
    description: 'Returns and voids of a period (counted on the day they were made): amount, count, return rate, reasons, products returned most, by refund method, by staff, voided bills.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW, P.RETURNS_VIEW],
    status: 'Returns dekh raha hoon…',
  },
  {
    name: 'tax_summary',
    description: 'Sales tax of a period: taxed value, tax collected, FBR/PRA invoices sent, failed or pending, by rate.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW],
    status: 'Tax dekh raha hoon…',
  },
  {
    name: 'branches_compare',
    description: 'Compare branches (shops) of the business for a period: sale, bills, cash per branch. Only works on the all-branches view.',
    properties: { ...periodProps },
    needs: [P.REPORTS_VIEW],
    status: 'Branches ka muqabla kar raha hoon…',
  },
  {
    name: 'online_orders',
    description: 'Online orders (own website, Nafaa plugin, Shopify, WooCommerce, Daraz, Foodpanda) in a period: orders, value, by status, by channel, delivered/cancelled/returned (RTO) rates, top cities and products, COD vs prepaid.',
    properties: { ...periodProps },
    needs: [P.ONLINE_ORDERS_VIEW],
    status: 'Online orders dekh raha hoon…',
  },
  {
    name: 'courier_cod',
    description: 'Couriers and cash on delivery for online orders: courier-wise dispatched, delivered and returned (RTO), COD collected vs pending and how old the pending COD is, risky cities.',
    properties: { ...periodProps },
    needs: [P.ONLINE_ORDERS_VIEW],
    status: 'Courier aur COD dekh raha hoon…',
  },
  {
    name: 'marketplace_summary',
    description: 'Nafaa Bazaar (marketplace) for this shop: orders in a period by status, delivered sale value, cancellations, payment methods, products listed, store rating.',
    properties: { ...periodProps },
    needs: [P.ONLINE_ORDERS_VIEW],
    status: 'Nafaa Bazaar dekh raha hoon…',
  },
  {
    name: 'compare_periods',
    description: 'Compare two periods side by side: sale, bills, average bill, cash, udhaar, and (when allowed) gross profit, expenses and net profit, with % change.',
    properties: {
      a: { type: 'object', properties: { ...periodProps }, description: 'First (newer) period.' },
      b: { type: 'object', properties: { ...periodProps }, description: 'Second (older) period.' },
    },
    required: ['a', 'b'],
    needs: [P.REPORTS_VIEW],
    status: 'Do periods ka muqabla kar raha hoon…',
  },
];

/** Tool definitions for the Messages API, in the fixed order above. */
export function toolDefinitions() {
  return [
    ...TOOL_SPECS.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: 'object' as const, properties: t.properties, ...(t.required && { required: t.required }) },
    })),
    ...ACTION_TOOLS.map(({ status: _s, ...t }) => t),
  ];
}

export const TOOL_STATUS: Record<string, string> = Object.fromEntries([...TOOL_SPECS, ...ACTION_TOOLS].map((t) => [t.name, t.status]));

const PERMISSION_WORDS: Partial<Record<PermissionKey, string>> = {
  [P.REPORTS_VIEW]: 'Reports', [P.PROFIT_REPORT_VIEW]: 'Profit report', [P.COST_VIEW]: 'Cost aur profit',
  [P.LOW_STOCK_VIEW]: 'Low stock', [P.STOCK_MOVEMENTS_VIEW]: 'Stock movements', [P.KHATA_VIEW]: 'Khata',
  [P.EXPENSES_VIEW]: 'Expenses', [P.PURCHASES_VIEW]: 'Purchases', [P.CUSTOMERS_VIEW]: 'Customers',
  [P.LOYALTY_VIEW]: 'Loyalty', [P.STAFF_VIEW]: 'Staff', [P.CASH_REGISTER_VIEW]: 'Cash register',
  [P.RETURNS_VIEW]: 'Returns', [P.ONLINE_ORDERS_VIEW]: 'Online orders',
};

/* ───────────────────────── service ───────────────────────── */

@Injectable()
export class AiToolsService {
  private readonly logger = new Logger('NafaaAiTools');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tzService: TenantTimezoneService,
    private readonly center: ReportsCenterService,
    private readonly credit: CustomerCreditService,
    private readonly shifts: StaffShiftsService,
    private readonly stock: StockAnalysisService,
    private readonly loyalty: LoyaltyService,
    private readonly lowStock: LowStockService,
    private readonly orders: OrderToolsService,
  ) {}

  /** Builds the per-request context: clock, names and what the user may see. */
  async context(user: AuthenticatedUser, scope: ShopScope): Promise<AiToolContext> {
    const [{ tz, dayStartHour }, settings, shop, hidden] = await Promise.all([
      this.tzService.clock(user.tenantId),
      this.prisma.tenantSettings.findUnique({
        where: { tenantId: user.tenantId },
        select: { shopName: true, firstDayOfWeek: true, tenant: { select: { name: true } } },
      }),
      scope.shopId ? this.prisma.shop.findFirst({ where: { id: scope.shopId, tenantId: user.tenantId }, select: { name: true } }) : null,
      isOwnerRole(user.role) ? Promise.resolve([] as string[]) : hiddenFigures(this.prisma, user),
    ]);
    const can = (p: PermissionKey) => hasPermission(user.role, user.permissions, p);
    const weekStart = ({ sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 } as Record<string, number>)[(settings?.firstDayOfWeek ?? 'monday').slice(0, 3).toLowerCase()] ?? 1;
    return {
      user, scope, tz, dayStartHour, weekStart,
      today: businessDayKey(new Date(), tz, dayStartHour),
      shopName: settings?.shopName || settings?.tenant?.name || 'Dukaan',
      branchName: shop?.name ?? null,
      canProfit: can(P.PROFIT_REPORT_VIEW) && can(P.COST_VIEW) && !hidden.includes('profit'),
      drawerHidden: hidden.includes('drawer'),
    };
  }

  /** Turns a period input into business-day keys and a readable label. */
  resolvePeriod(ctx: AiToolContext, input: unknown, fallback: PeriodName = 'this_month'): { from: string; to: string; label: string } {
    const i = (input && typeof input === 'object' ? input : {}) as { period?: string; from?: string; to?: string };
    const name = (PERIOD_NAMES as readonly string[]).includes(i.period ?? '') ? (i.period as PeriodName) : fallback;
    const t = ctx.today;
    const weekFrom = shiftKey(t, -((weekdayOfKey(t) - ctx.weekStart + 7) % 7));
    let from = t;
    let to = t;
    switch (name) {
      case 'today': break;
      case 'yesterday': from = to = shiftKey(t, -1); break;
      case 'this_week':
        // On the first day of the week "is hafte" would be today only; read it as the last 7 days.
        if (weekFrom === t) { from = shiftKey(t, -6); return { from, to, label: `last_7_days (${from} → ${to}; the week started today)` }; }
        from = weekFrom; break;
      case 'last_week': from = shiftKey(weekFrom, -7); to = shiftKey(weekFrom, -1); break;
      case 'last_7_days': from = shiftKey(t, -6); break;
      case 'this_month':
        if (monthStart(t) === t) { from = shiftKey(t, -29); return { from, to, label: `last_30_days (${from} → ${to}; the month started today)` }; }
        from = monthStart(t); break;
      case 'last_month': from = monthStart(t, 1); to = monthEnd(t, 1); break;
      case 'last_30_days': from = shiftKey(t, -29); break;
      case 'last_90_days': from = shiftKey(t, -89); break;
      case 'this_year': from = `${t.slice(0, 4)}-01-01`; break;
      case 'all_time': from = 'all'; break;
      case 'custom': {
        const f = KEY.test(i.from ?? '') ? i.from! : null;
        const e = KEY.test(i.to ?? '') ? i.to! : null;
        from = f ?? e ?? t;
        to = e && e <= t ? e : t;
        if (from !== 'all' && from > to) [from, to] = [to, from];
        break;
      }
    }
    return { from, to, label: from === to ? `${name} (${to})` : `${name} (${from} → ${to})` };
  }

  /** The user the report services see: without cost.view when profit is hidden from them. */
  private serviceUser(ctx: AiToolContext): AuthenticatedUser {
    if (ctx.canProfit) return ctx.user;
    return { ...ctx.user, permissions: (ctx.user.permissions ?? []).filter((p) => p !== P.COST_VIEW) };
  }

  /** Removes cost and profit keys when the user may not see them. */
  private guard<T>(ctx: AiToolContext, value: T): T {
    return ctx.canProfit ? value : (stripCostKeys(value) as T);
  }

  private missing(ctx: AiToolContext, needs: PermissionKey[]): PermissionKey[] {
    return needs.filter((p) => !hasPermission(ctx.user.role, ctx.user.permissions, p));
  }

  /** Runs one tool. Never throws: errors come back as data the model can explain. */
  async run(name: string, input: unknown, ctx: AiToolContext): Promise<AiToolResult> {
    const spec = TOOL_SPECS.find((t) => t.name === name);
    if (!spec) return { data: { error: 'UNKNOWN_TOOL' }, refused: true };
    const missing = this.missing(ctx, spec.needs);
    if (missing.length) {
      return {
        refused: true,
        data: {
          error: 'NO_PERMISSION',
          missing: missing.map((p) => PERMISSION_WORDS[p] ?? p),
          note: 'Tell the user politely they do not have access to this information and can ask the shop owner for the permission. Do not guess numbers.',
        },
      };
    }
    const args = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    try {
      const res = await this.dispatch(name, args, ctx);
      // Final pass: ids out, dates as days, numbers rounded; lists are already capped by each tool.
      return { ...res, data: compact(res.data, 31) };
    } catch (e: any) {
      const status = e?.status ?? e?.response?.statusCode;
      if (status === 403) return { refused: true, data: { error: 'NO_PERMISSION', note: e?.message } };
      this.logger.warn(`Tool ${name} failed for ${ctx.user.tenantId}: ${e?.message}`);
      return { refused: true, data: { error: 'DATA_ERROR', note: 'The data could not be read right now. Say so; do not guess numbers.' } };
    }
  }

  private dispatch(name: string, a: Record<string, unknown>, ctx: AiToolContext): Promise<AiToolResult> {
    switch (name) {
      case 'sales_summary': return this.salesSummary(ctx, a);
      case 'profit_summary': return this.profitSummary(ctx, a);
      case 'product_performance': return this.productPerformance(ctx, a);
      case 'stock_reorder': return this.stockReorder(ctx, a);
      case 'stock_value': return this.stockValue(ctx, a);
      case 'stock_movements': return this.stockMovements(ctx, a);
      case 'khata_udhaar': return this.khata(ctx, a);
      case 'expenses_summary': return this.expenses(ctx, a);
      case 'purchases_suppliers': return this.purchases(ctx, a);
      case 'customer_insights': return this.customers(ctx, a);
      case 'loyalty_summary': return this.loyaltySummary(ctx, a);
      case 'staff_performance': return this.staff(ctx, a);
      case 'cash_drawer': return this.cashDrawer(ctx, a);
      case 'returns_summary': return this.returns(ctx, a);
      case 'tax_summary': return this.tax(ctx, a);
      case 'branches_compare': return this.branches(ctx, a);
      case 'online_orders': return this.onlineOrders(ctx, a);
      case 'courier_cod': return this.courierCod(ctx, a);
      case 'marketplace_summary': return this.marketplace(ctx, a);
      case 'compare_periods': return this.comparePeriods(ctx, a);
      default: return Promise.resolve({ data: { error: 'UNKNOWN_TOOL' }, refused: true });
    }
  }

  /* ───────────── sales and profit ───────────── */

  async salesSummary(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'today');
    const s = await this.center.sales(this.serviceUser(ctx), ctx.scope, { from: p.from, to: p.to });
    const t = s.totals;
    const hours = s.hours.filter((h) => h.bills > 0).sort((x, y) => y.net - x.net).slice(0, 4)
      .map((h) => ({ hour: h.hour, time: hourRange(h.hour, 'roman'), timeEn: hourRange(h.hour, 'en'), net: h.net, bills: h.bills }));
    const weekdays = s.weekdays.filter((w) => w.bills > 0).sort((x, y) => y.net - x.net)
      .map((w) => ({ day: WEEKDAYS[w.day], net: w.net, bills: w.bills }));
    const data = this.guard(ctx, {
      period: p.label,
      totals: {
        netSale: t.net, bills: t.bills, averageBill: t.average, grossBeforeReturns: t.gross, refunds: t.refunds,
        discount: t.discount, cashReceived: t.cashIn, udhaarGiven: t.credit, itemsSold: t.qty,
        namedCustomers: t.customers, walkInBills: t.walkInBills, voidedBills: t.voidedBills,
        profit: t.profit, margin: t.margin,
      },
      previousPeriod: s.previous ? { netSale: s.previous.net, bills: s.previous.bills, averageBill: s.previous.average, profit: s.previous.profit } : null,
      changePercent: s.previous ? { netSale: pct(t.net, s.previous.net), bills: pct(t.bills, s.previous.bills) } : null,
      byPayment: s.payments.map((m) => ({ method: m.method, net: m.net, bills: m.bills })),
      busiestHours: hours,
      byWeekday: s.from !== s.to ? weekdays : undefined,
      daily: s.trend.length > 1 ? s.trend.slice(-31).map((d) => ({ day: d.key, net: d.net, bills: d.bills })) : undefined,
    });
    const chart: AiChart | undefined = s.trend.length > 1
      ? { type: s.trend.length > 14 ? 'line' : 'bar', title: 'Sale', unit: 'money', series: [{ key: 'net', label: 'Sale' }], data: s.trend.slice(-31).map((d) => ({ label: d.key.slice(5), net: d.net })) }
      : s.payments.length
        ? { type: 'bar', title: 'Payment method', unit: 'money', series: [{ key: 'net', label: 'Sale' }], data: s.payments.map((m) => ({ label: m.method, net: m.net })) }
        : undefined;
    return { data, chart, link: { label: 'Sales report', to: `/reports?tab=sales` } };
  }

  async profitSummary(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const r = await this.center.profit(ctx.user, ctx.scope, { from: p.from, to: p.to });
    const t = r.totals;
    const data = {
      period: p.label,
      totals: {
        sale: t.sales, costOfGoods: t.cost, grossProfit: t.grossProfit, marginPercent: t.margin,
        expensesPaid: t.expenses, stockWrittenOff: t.damage, netProfit: t.netProfit, netMarginPercent: t.netMargin,
      },
      previousPeriod: r.previous ? { sale: r.previous.sales, grossProfit: r.previous.grossProfit, netProfit: r.previous.netProfit } : null,
      changePercent: r.previous ? { grossProfit: pct(t.grossProfit, r.previous.grossProfit), netProfit: pct(t.netProfit, r.previous.netProfit) } : null,
      dataQuality: t.noCostLines || t.fallbackLines
        ? { linesWithoutCost: t.noCostLines, linesCostedAtTodaysCost: t.fallbackLines, note: 'Lines without cost make profit look higher than it is.' }
        : undefined,
      rows: r.rows.length > 1 ? r.rows.slice(-31).map((x) => ({ key: x.key, sale: x.sales, grossProfit: x.grossProfit, netProfit: x.netProfit })) : undefined,
    };
    const chart: AiChart | undefined = r.rows.length > 1
      ? { type: 'bar', title: 'Profit', unit: 'money', series: [{ key: 'gross', label: 'Gross profit' }, { key: 'net', label: 'Net profit' }], data: r.rows.slice(-31).map((x) => ({ label: x.key.length > 7 ? x.key.slice(5) : x.key, gross: x.grossProfit, net: x.netProfit })) }
      : undefined;
    return { data, chart, link: { label: 'Profit-loss', to: '/profit-loss' } };
  }

  async productPerformance(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const limit = Math.min(20, Math.max(1, Math.trunc(n(a.limit) || 10)));
    let sortBy = String(a.sort_by ?? 'revenue');
    const groupBy = String(a.group_by ?? 'product');
    const note = sortBy === 'profit' && !ctx.canProfit ? 'User may not see profit; ranked by sale instead.' : undefined;
    if (note) sortBy = 'revenue';
    const r = await this.center.items(this.serviceUser(ctx), ctx.scope, { from: p.from, to: p.to });
    let rows: Array<Record<string, unknown>>;
    let metric = sortBy === 'qty' ? 'qty' : sortBy === 'profit' ? 'profit' : 'revenue';
    if (sortBy === 'slow') {
      rows = r.slow.slice(0, limit).map((s) => ({ name: s.name, stock: s.stock, unit: s.unit, stockValue: s.stockValue, lastSold: s.lastSold }));
      metric = 'stock';
    } else if (groupBy !== 'product') {
      const list = groupBy === 'brand' ? r.brands : r.categories;
      rows = [...list].sort((x, y) => (n((y as any)[metric]) - n((x as any)[metric])) * (sortBy === 'lowest' ? -1 : 1)).slice(0, limit)
        .map((c) => ({ name: c.name, revenue: c.revenue, profit: c.profit, qty: c.qty, products: c.products }));
    } else {
      const list = sortBy === 'lowest' ? r.lowest : sortBy === 'qty' ? r.topQty : sortBy === 'profit' ? r.topProfit : r.topRevenue;
      rows = list.slice(0, limit).map((x) => ({ name: x.name, category: x.category, qty: x.qty, unit: x.unit, revenue: x.revenue, profit: x.profit, margin: x.margin, bills: x.bills }));
    }
    const data = this.guard(ctx, {
      period: p.label, sortBy, groupBy, note,
      totals: { products: r.totals.products, revenue: r.totals.revenue, profit: r.totals.profit, slowItemsInStock: r.totals.slowCount },
      rows,
    });
    const chartRows = rows.slice(0, 10);
    const chart: AiChart | undefined = chartRows.length
      ? {
        type: 'bar', title: sortBy === 'slow' ? 'Atka hua maal (stock)' : groupBy === 'product' ? 'Products' : groupBy === 'brand' ? 'Brands' : 'Categories',
        unit: metric === 'qty' || metric === 'stock' ? 'qty' : 'money',
        series: [{ key: 'v', label: metric === 'qty' ? 'Qty' : metric === 'profit' ? 'Profit' : metric === 'stock' ? 'Stock' : 'Sale' }],
        data: chartRows.map((x) => ({ label: String(x.name).slice(0, 24), v: n(x[metric]) })),
      }
      : undefined;
    return { data, chart, link: { label: 'Items report', to: sortBy === 'profit' ? '/profit-report' : '/reports?tab=items' } };
  }

  /* ───────────── stock ───────────── */

  /** Reorder rows grouped by branch and supplier; shared by the tool and GET /ai/reorder. */
  async reorder(ctx: AiToolContext, opts: { leadDays?: number; coverDays?: number; historyDays?: number; mode?: 'reorder' | 'low_stock' }) {
    const leadDays = Math.min(60, Math.max(0, Math.trunc(opts.leadDays ?? 3)));
    const coverDays = Math.min(120, Math.max(1, Math.trunc(opts.coverDays ?? 14)));
    const historyDays = Math.min(180, Math.max(7, Math.trunc(opts.historyDays ?? 30)));
    const settings = this.lowStock.settings({ days: historyDays, targetDays: leadDays + coverDays, soonDays: Math.max(7, leadDays * 2), expiryDays: 30 });
    const all = await this.lowStock.rows(this.serviceUser(ctx), ctx.scope, settings);
    const live = all.filter((r) => !r.ignored);
    // Only items whose own sales speed says they run out within lead + cover days are suggested.
    const rows = opts.mode === 'low_stock'
      ? live.filter((r) => r.status === 'out' || r.status === 'low' || r.status === 'soon')
      : live.filter((r) => !r.made && r.perDay > 0 && r.suggestQty > 0 && r.daysLeft != null && r.daysLeft <= leadDays + coverDays);
    // Low or out of stock but nothing sold in the window: shown apart, never ordered.
    const idle = live.filter((r) => !r.made && r.perDay <= 0 && (r.status === 'out' || r.status === 'low'));
    rows.sort((x, y) => (x.daysLeft ?? Infinity) - (y.daysLeft ?? Infinity) || y.perDay - x.perDay);
    return { rows, idle, leadDays, coverDays, historyDays };
  }

  toReorderPayload(ctx: AiToolContext, r: Awaited<ReturnType<AiToolsService['reorder']>>, cap = 60): AiReorder {
    const groups = new Map<string, AiReorderGroup>();
    for (const x of r.rows.filter((y) => !y.made && y.perDay > 0 && y.suggestQty > 0).slice(0, cap)) {
      const k = `${x.shopId}:${x.supplier?.id ?? '-'}`;
      const g = groups.get(k) ?? { shopId: x.shopId, shopName: x.shopName, supplier: x.supplier ? { id: x.supplier.id, name: x.supplier.name } : null, rows: [] };
      g.rows.push({
        productId: x.productId, name: x.name, unit: x.unit, stock: r2(x.stock), perDay: r2(x.perDay), daysLeft: x.daysLeft == null ? null : r2(x.daysLeft),
        suggestQty: r2(x.suggestQty), onOrder: r2(x.onOrder), ...(ctx.canProfit && { lastCost: r2(x.lastCost) }),
      });
      groups.set(k, g);
    }
    const list = [...groups.values()];
    return {
      leadDays: r.leadDays, coverDays: r.coverDays, historyDays: r.historyDays, groups: list, count: list.reduce((s, g) => s + g.rows.length, 0),
      idle: r.idle.slice(0, cap).map((x) => ({ productId: x.productId, name: x.name, unit: x.unit, stock: r2(x.stock) })),
    };
  }

  async stockReorder(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const mode = a.mode === 'low_stock' ? 'low_stock' : 'reorder';
    const limit = Math.min(30, Math.max(1, Math.trunc(n(a.limit) || 12)));
    const r = await this.reorder(ctx, {
      mode, leadDays: a.lead_days == null ? undefined : n(a.lead_days), coverDays: a.cover_days == null ? undefined : n(a.cover_days),
      historyDays: a.history_days == null ? undefined : n(a.history_days),
    });
    const multi = new Set(r.rows.map((x) => x.shopId)).size > 1;
    const data = this.guard(ctx, {
      mode, leadDays: r.leadDays, coverDays: r.coverDays, salesHistoryDays: r.historyDays,
      counts: { lines: r.rows.length, out: r.rows.filter((x) => x.status === 'out').length, low: r.rows.filter((x) => x.status === 'low').length },
      notSellingLowItems: r.idle.length ? { count: r.idle.length, note: 'Low or out of stock but no sale in the history window; not suggested for ordering.' } : undefined,
      orderValueTotal: r2(r.rows.reduce((s, x) => s + n(x.orderValue), 0)),
      rows: r.rows.slice(0, limit).map((x) => ({
        name: x.name, branch: multi ? x.shopName : undefined, status: x.status, stock: r2(x.stock), unit: x.unit, alertAt: x.alert,
        soldPerDay: r2(x.perDay), daysLeft: x.daysLeft == null ? null : r2(x.daysLeft), suggestOrderQty: r2(x.suggestQty),
        alreadyOnOrder: x.onOrder || undefined, supplier: x.supplier?.name, cost: x.lastCost, orderValue: x.orderValue, madeInHouse: x.made || undefined,
      })),
      more: r.rows.length > limit ? r.rows.length - limit : undefined,
    });
    const top = r.rows.slice(0, 10);
    const chart: AiChart | undefined = top.length
      ? { type: 'bar', title: 'Kitne din ka stock baqi', unit: 'count', series: [{ key: 'days', label: 'Din' }], data: top.map((x) => ({ label: x.name.slice(0, 24), days: x.daysLeft == null ? 0 : r2(x.daysLeft) })) }
      : undefined;
    return { data, chart, link: { label: 'Low stock', to: '/low-stock' }, reorder: mode === 'reorder' ? this.toReorderPayload(ctx, r) : undefined };
  }

  async stockValue(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'last_30_days');
    const r = await this.stock.analytics(this.serviceUser(ctx), ctx.scope, { from: p.from === 'all' ? undefined : p.from, to: p.to });
    const x = r as Record<string, unknown>;
    const data = this.guard(ctx, compact({ periodAsked: p.label, totals: x.totals, status: x.status, byCategory: x.byCategory, bySupplier: x.bySupplier }, 6));
    return { data, link: { label: 'Stock report', to: '/stock-report' } };
  }

  async stockMovements(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'last_7_days');
    const rr = await reportRange(this.tzService, ctx.user.tenantId, { from: p.from, to: p.to });
    const where: Prisma.StockMovementWhereInput = {
      tenantId: ctx.user.tenantId, ...ctx.scope.where, createdAt: { ...(rr.gte && { gte: rr.gte }), lt: rr.lt },
    };
    const limit = Math.min(20, Math.max(1, Math.trunc(n(a.limit) || 10)));
    const [byType, byProduct] = await Promise.all([
      this.prisma.stockMovement.groupBy({ by: ['type'], where, _sum: { quantity: true }, _count: { _all: true } }),
      this.prisma.stockMovement.groupBy({ by: ['productId'], where, _sum: { quantity: true }, _count: { _all: true }, orderBy: { _count: { productId: 'desc' } }, take: limit }),
    ]);
    const names = await this.prisma.product.findMany({ where: { tenantId: ctx.user.tenantId, id: { in: byProduct.map((x) => x.productId) } }, select: { id: true, name: true, unit: true } });
    const nm = new Map(names.map((x) => [x.id, x]));
    const data = {
      period: p.label,
      byType: byType.map((x) => ({ type: x.type, movements: x._count._all, netQty: r2(n(x._sum.quantity)) })).sort((x, y) => y.movements - x.movements),
      mostMoved: byProduct.map((x) => ({ name: nm.get(x.productId)?.name ?? 'Product', unit: nm.get(x.productId)?.unit, movements: x._count._all, netQty: r2(n(x._sum.quantity)) })),
    };
    return {
      data,
      chart: data.byType.length ? { type: 'bar', title: 'Stock movement', unit: 'count', series: [{ key: 'm', label: 'Entries' }], data: data.byType.map((x) => ({ label: x.type, m: x.movements })) } : undefined,
      link: { label: 'Stock movements', to: '/stock-movements' },
    };
  }

  /* ───────────── money owed and spent ───────────── */

  async khata(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'last_30_days');
    const limit = Math.min(25, Math.max(1, Math.trunc(n(a.limit) || 10)));
    const r = await this.credit.khata(ctx.user, ctx.scope, { from: p.from, to: p.to });
    const t = r.totals;
    const data = {
      period: p.label,
      totals: {
        receivable: t.receivable, customersOwing: t.owing, olderThan60Days: t.over60, noPaymentFor60Days: t.noPayment60,
        overCreditLimit: t.overLimit, advanceHeld: t.advance, udhaarGivenInPeriod: t.given, recoveredInPeriod: t.received,
      },
      ageing: r.aging.map((b) => ({ band: b.label, amount: b.amount, customers: b.customers })),
      topDebtors: r.rows.slice(0, limit).map((x) => ({
        name: x.name, balance: x.balance, oldestDays: x.oldestDays, daysSinceLastPayment: x.daysSincePayment, overLimit: x.overLimit || undefined,
      })),
    };
    return {
      data,
      chart: { type: 'bar', title: 'Udhaar kitna purana', unit: 'money', series: [{ key: 'amount', label: 'Udhaar' }], data: r.aging.map((b) => ({ label: b.label, amount: b.amount })) },
      link: { label: 'Khata', to: '/khata' },
    };
  }

  async expenses(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const r = await this.center.expenses(ctx.user, ctx.scope, { from: p.from, to: p.to });
    const data = {
      period: p.label,
      totals: { paid: r.totals.amount, entries: r.totals.count, perDay: r.totals.perDay, percentOfSale: r.totals.ofSales, pendingUnpaid: r.totals.pending, pendingCount: r.totals.pendingCount },
      previousPeriod: r.previous ? { paid: r.previous.amount, entries: r.previous.count } : null,
      changePercent: r.previous ? pct(r.totals.amount, r.previous.amount) : null,
      byCategory: r.categories.slice(0, 8).map((c) => ({ name: c.name, amount: c.amount, entries: c.count, share: c.share })),
      biggest: r.biggest.slice(0, 5).map((e) => ({ title: e.title, amount: e.amount, date: e.date, category: e.category })),
    };
    return {
      data,
      chart: r.categories.length ? { type: 'bar', title: 'Expense by category', unit: 'money', series: [{ key: 'amount', label: 'Expense' }], data: r.categories.slice(0, 8).map((c) => ({ label: c.name, amount: c.amount })) } : undefined,
      link: { label: 'Expenses report', to: '/reports?tab=expenses' },
    };
  }

  async purchases(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const r = await this.center.purchases(this.serviceUser(ctx), ctx.scope, { from: p.from, to: p.to });
    const data = {
      period: p.label,
      totals: {
        purchaseBills: r.totals.bills, value: r.totals.value, paid: r.totals.paid, onCredit: r.totals.credit, returned: r.totals.returned,
        owedToSuppliersNow: r.totals.dueTotal, suppliersOwed: r.totals.dueSuppliers,
      },
      previousPeriod: r.previous,
      bySupplier: r.suppliers.slice(0, 8).map((s) => ({ name: s.name, bills: s.bills, value: s.value, paid: s.paid, share: s.share })),
      itemsBoughtMost: r.items.slice(0, 8),
      supplierDues: r.dues.slice(0, 10).map((d) => ({ name: d.name, due: d.due })),
    };
    return {
      data,
      chart: r.dues.length ? { type: 'bar', title: 'Suppliers ko dena', unit: 'money', series: [{ key: 'due', label: 'Baqi' }], data: r.dues.slice(0, 8).map((d) => ({ label: d.name, due: d.due })) } : undefined,
      link: { label: 'Purchases report', to: '/reports?tab=purchases' },
    };
  }

  /* ───────────── people ───────────── */

  async customers(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const r = await this.center.customers(this.serviceUser(ctx), ctx.scope, { from: p.from, to: p.to });
    const t = r.totals;
    const khata = hasPermission(ctx.user.role, ctx.user.permissions, P.KHATA_VIEW);
    const data = {
      period: p.label,
      totals: {
        namedCustomers: t.customers, newCustomers: t.newCount, newCustomersSale: t.newValue, returningCustomers: t.returning,
        returningCustomersSale: t.returningValue, repeatBuyers: t.repeat, walkInSale: t.walkInValue, walkInBills: t.walkInBills, signups: t.signups,
        ...(khata && { udhaarGiven: t.creditGiven, recovered: t.recovered, outstandingUdhaar: t.outstanding }),
      },
      topCustomers: r.top.slice(0, 10).map((c) => ({ name: c.name, bills: c.bills, sale: c.net, lastVisit: c.last })),
    };
    return {
      data,
      chart: r.top.length ? { type: 'bar', title: 'Top customers', unit: 'money', series: [{ key: 'sale', label: 'Sale' }], data: r.top.slice(0, 8).map((c) => ({ label: c.name, sale: c.net })) } : undefined,
      link: { label: 'Customers report', to: '/reports/customers' },
    };
  }

  async loyaltySummary(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const r = await this.loyalty.overview(ctx.user, ctx.scope, { from: p.from === 'all' ? undefined : p.from, to: p.to });
    return { data: compact({ ...(r as object), periodAsked: p.label }, 6), link: { label: 'Loyalty', to: '/loyalty' } };
  }

  async staff(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'today');
    const user = this.serviceUser(ctx);
    const rr = await reportRange(this.tzService, ctx.user.tenantId, { from: p.from, to: p.to });
    const shop = ctx.scope.shopId ? Prisma.sql`AND s."shopId" = ${ctx.scope.shopId}` : Prisma.empty;
    const since = rr.gte ? Prisma.sql`AND s."soldAt" >= ${rr.gte}` : Prisma.empty;
    const [sales, returns, discounts, voids] = await Promise.all([
      this.center.sales(user, ctx.scope, { from: p.from, to: p.to }),
      hasPermission(ctx.user.role, ctx.user.permissions, P.RETURNS_VIEW) ? this.center.returns(user, ctx.scope, { from: p.from, to: p.to }) : Promise.resolve(null),
      this.prisma.$queryRaw<Array<{ uid: string | null; bills: number; discount: number; manual: number }>>`
        SELECT COALESCE(s."soldById", s."createdById") AS uid, COUNT(*) FILTER (WHERE s.discount > 0)::int AS bills,
          COALESCE(SUM(s.discount), 0)::float8 AS discount,
          COALESCE(SUM(GREATEST(s.discount - s."codeDiscount" - s."loyaltyDiscount", 0)), 0)::float8 AS manual
        FROM "Sale" s
        WHERE s."tenantId" = ${ctx.user.tenantId} AND s.status::text <> 'VOIDED' ${shop} ${since} AND s."soldAt" < ${rr.lt}
        GROUP BY 1`,
      this.prisma.activityLog.findMany({
        where: { tenantId: ctx.user.tenantId, action: 'SALE_VOIDED', createdAt: { ...(rr.gte && { gte: rr.gte }), lt: rr.lt } },
        select: { userId: true, entityId: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: 200,
      }),
    ]);
    // Voided bills of other branches are left out on a single-branch view.
    let voidRows = voids;
    if (ctx.scope.shopId && voids.length) {
      const ids = voids.map((v) => v.entityId).filter((x): x is string => !!x);
      const inShop = new Set((await this.prisma.sale.findMany({ where: { tenantId: ctx.user.tenantId, id: { in: ids }, shopId: ctx.scope.shopId }, select: { id: true } })).map((x) => x.id));
      voidRows = voids.filter((v) => v.entityId && inShop.has(v.entityId));
    }
    const ids = [...new Set([...discounts.map((d) => d.uid), ...voidRows.map((v) => v.userId)].filter((x): x is string => !!x))];
    const people = ids.length ? await this.prisma.user.findMany({ where: { tenantId: ctx.user.tenantId, id: { in: ids } }, select: { id: true, fullName: true } }) : [];
    const name = new Map(people.map((x) => [x.id, x.fullName]));
    const voidBy = new Map<string, number>();
    for (const v of voidRows) voidBy.set(v.userId ? name.get(v.userId) ?? 'Na-maloom' : 'Na-maloom', (voidBy.get(v.userId ? name.get(v.userId) ?? 'Na-maloom' : 'Na-maloom') ?? 0) + 1);
    const data = this.guard(ctx, {
      period: p.label,
      salesByPerson: sales.staff.slice(0, 12).map((s) => ({ name: s.name, bills: s.bills, netSale: s.net, averageBill: s.bills ? r2(s.net / s.bills) : 0, profit: s.profit })),
      discountsByPerson: discounts.filter((d) => d.discount > 0).sort((x, y) => y.discount - x.discount).slice(0, 12)
        .map((d) => ({ name: d.uid ? name.get(d.uid) ?? 'Na-maloom' : 'Na-maloom', billsWithDiscount: d.bills, discount: r2(d.discount), manualDiscount: r2(d.manual) })),
      returnsByPerson: returns ? returns.staff.slice(0, 12).map((s) => ({ name: s.name, returns: s.count, amount: s.amount })) : 'no returns.view permission',
      voidsByPerson: [...voidBy.entries()].map(([who, count]) => ({ name: who, voidedBills: count })),
      voidedBillsTotal: sales.totals.voidedBills, voidedValue: sales.totals.voidedValue,
    });
    return {
      data,
      chart: sales.staff.length ? { type: 'bar', title: 'Staff ki sale', unit: 'money', series: [{ key: 'net', label: 'Sale' }], data: sales.staff.slice(0, 10).map((s) => ({ label: s.name, net: s.net })) } : undefined,
      link: { label: 'Staff report', to: '/reports/staff' },
    };
  }

  async cashDrawer(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    if (ctx.drawerHidden) return { refused: true, data: { error: 'NO_PERMISSION', note: 'The owner has hidden drawer money from staff (Settings → Reports).' } };
    const p = this.resolvePeriod(ctx, a, 'last_7_days');
    const r = await this.shifts.shifts(ctx.user, ctx.scope, { from: p.from === 'all' ? undefined : p.from, to: p.to, limit: 10 });
    const data = compact({
      period: p.label, totals: r.totals, byStaff: r.byStaff, byShop: r.byShop.length > 1 ? r.byShop : undefined,
      recentShifts: r.items.map((x: any) => ({ openedAt: x.openedAt, closedAt: x.closedAt, openedBy: x.openedBy?.fullName ?? x.openedBy?.name, expected: x.expected, counted: x.counted, difference: x.difference, live: x.live })),
    }, 8);
    return { data, link: { label: 'Galle ka hisaab', to: '/reports/staff' } };
  }

  async returns(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const r = await this.center.returns(this.serviceUser(ctx), ctx.scope, { from: p.from, to: p.to });
    const data = this.guard(ctx, compact({
      period: p.label, totals: r.totals, previousPeriod: r.previous, reasons: r.reasons, products: r.products, byMethod: r.methods, byStaff: r.staff,
      voidedBills: r.voided.slice(0, 5).map((v: any) => ({ bill: v.saleNumber, total: v.total, date: v.soldAt, staff: v.staff?.name ?? v.staff })),
    }, 8));
    return {
      data,
      chart: r.reasons.length ? { type: 'bar', title: 'Wapsi ki wajah', unit: 'money', series: [{ key: 'amount', label: 'Amount' }], data: r.reasons.slice(0, 8).map((x) => ({ label: x.reason || 'Baghair wajah', amount: x.amount })) } : undefined,
      link: { label: 'Returns report', to: '/reports?tab=returns' },
    };
  }

  async tax(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const r = await this.center.tax(ctx.user, ctx.scope, { from: p.from, to: p.to });
    return { data: compact({ ...(r as object), periodAsked: p.label }, 8), link: { label: 'Tax report', to: '/reports?tab=tax' } };
  }

  async branches(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    if (ctx.scope.shopId) {
      return { data: { note: `Only branch "${ctx.branchName ?? ''}" is selected. Branch comparison needs the owner's "All shops" view (top bar).` } };
    }
    const p = this.resolvePeriod(ctx, a, 'this_month');
    const s = await this.center.sales(this.serviceUser(ctx), ctx.scope, { from: p.from, to: p.to });
    const data = this.guard(ctx, { period: p.label, branches: s.shops.map((x) => ({ name: x.name, bills: x.bills, netSale: x.net, cashReceived: x.cashIn, profit: x.profit })) });
    return {
      data,
      chart: s.shops.length ? { type: 'bar', title: 'Branch ki sale', unit: 'money', series: [{ key: 'net', label: 'Sale' }], data: s.shops.map((x) => ({ label: x.name, net: x.net })) } : undefined,
      link: { label: 'Sales report', to: '/reports?tab=sales' },
    };
  }

  /* ───────────── online, courier, marketplace ───────────── */

  private async ordersReport(ctx: AiToolContext, a: Record<string, unknown>) {
    const p = this.resolvePeriod(ctx, a, 'last_30_days');
    const r = await this.orders.report(ctx.user, ctx.scope, { from: p.from === 'all' ? undefined : p.from, to: p.to });
    return { p, r: r as any };
  }

  async onlineOrders(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const { p, r } = await this.ordersReport(ctx, a);
    const data = compact({
      period: p.label, totals: r.totals, previousPeriod: r.previous, payment: r.payment, byStatus: r.byStatus, byChannel: r.byChannel,
      byCity: (r.byCity ?? []).slice(0, 6), topProducts: (r.topProducts ?? []).slice(0, 6),
    }, 8);
    const ch = (r.byChannel ?? []) as Array<{ name?: string; label?: string; value?: number; orders?: number }>;
    return {
      data,
      chart: ch.length ? { type: 'bar', title: 'Channel ke orders', unit: 'count', series: [{ key: 'orders', label: 'Orders' }], data: ch.slice(0, 8).map((c) => ({ label: String(c.name ?? c.label ?? 'Channel'), orders: n(c.orders) })) } : undefined,
      link: { label: 'Online orders', to: '/online-orders/reports' },
    };
  }

  async courierCod(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const { p, r } = await this.ordersReport(ctx, a);
    const data = compact({
      period: p.label,
      totals: { dispatched: r.totals?.dispatched, delivered: r.totals?.delivered, returned: r.totals?.returned, rtoRatePercent: r.totals?.rtoRate, deliveryRatePercent: r.totals?.deliveryRate, avgDeliveryDays: r.totals?.avgDeliveryDays },
      cod: r.payment?.cod, prepaid: r.payment?.prepaid, codPendingAgeing: r.codAging, byCourier: r.byCourier, riskyCities: r.riskyCities,
    }, 8);
    const co = (r.byCourier ?? []) as Array<{ name?: string; label?: string; delivered?: number; returned?: number }>;
    return {
      data,
      chart: co.length ? { type: 'bar', title: 'Courier performance', unit: 'count', series: [{ key: 'd', label: 'Delivered' }, { key: 'r', label: 'Returned' }], data: co.slice(0, 8).map((c) => ({ label: String(c.name ?? c.label ?? 'Courier'), d: n(c.delivered), r: n(c.returned) })) } : undefined,
      link: { label: 'COD aur courier', to: '/online-orders/reports' },
    };
  }

  async marketplace(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const p = this.resolvePeriod(ctx, a, 'last_30_days');
    const rr = await reportRange(this.tzService, ctx.user.tenantId, { from: p.from, to: p.to });
    const where: Prisma.MarketplaceOrderWhereInput = {
      tenantId: ctx.user.tenantId, ...(ctx.scope.shopId && { shopId: ctx.scope.shopId }),
      createdAt: { ...(rr.gte && { gte: rr.gte }), lt: rr.lt },
    };
    const [byStatus, byPayment, listed, stores] = await Promise.all([
      this.prisma.marketplaceOrder.groupBy({ by: ['status'], where, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.marketplaceOrder.groupBy({ by: ['paymentMethod'], where, _count: { _all: true } }),
      this.prisma.productMarketplaceProfile.count({ where: { tenantId: ctx.user.tenantId, ...(ctx.scope.shopId && { shopId: ctx.scope.shopId }), isListedOnMarketplace: true } }),
      this.prisma.shopMarketplaceProfile.findMany({
        where: { tenantId: ctx.user.tenantId, ...(ctx.scope.shopId && { shopId: ctx.scope.shopId }) },
        select: { publicName: true, isListedOnMarketplace: true, isOpen: true, isPaused: true, ratingAverage: true, ratingCount: true },
      }),
    ]);
    const orders = byStatus.reduce((s, x) => s + x._count._all, 0);
    const delivered = byStatus.find((x) => x.status === 'DELIVERED');
    const data = compact({
      period: p.label,
      totals: { orders, deliveredOrders: delivered?._count._all ?? 0, deliveredValue: n(delivered?._sum.total), productsListed: listed },
      byStatus: byStatus.map((x) => ({ status: x.status, orders: x._count._all, value: n(x._sum.total) })),
      byPayment: byPayment.map((x) => ({ method: x.paymentMethod, orders: x._count._all })),
      stores: stores.map((s) => ({ name: s.publicName, listed: s.isListedOnMarketplace, open: s.isOpen && !s.isPaused, rating: s.ratingAverage, ratings: s.ratingCount })),
      note: stores.length ? undefined : 'This shop is not on Nafaa Bazaar yet.',
    }, 10);
    return { data, link: { label: 'Nafaa Bazaar', to: '/marketplace/dashboard' } };
  }

  /* ───────────── comparison ───────────── */

  async comparePeriods(ctx: AiToolContext, a: Record<string, unknown>): Promise<AiToolResult> {
    const pa = this.resolvePeriod(ctx, a.a, 'this_month');
    const pb = this.resolvePeriod(ctx, a.b, 'last_month');
    const scope = { tenantId: ctx.user.tenantId, shopId: ctx.scope.shopId };
    const [ra, rb] = await Promise.all([
      reportRange(this.tzService, ctx.user.tenantId, { from: pa.from, to: pa.to }),
      reportRange(this.tzService, ctx.user.tenantId, { from: pb.from, to: pb.to }),
    ]);
    const [fa, fb] = await Promise.all([profitFigures(this.prisma, scope, { gte: ra.gte, lt: ra.lt }), profitFigures(this.prisma, scope, { gte: rb.gte, lt: rb.lt })]);
    const canExp = hasPermission(ctx.user.role, ctx.user.permissions, P.EXPENSES_VIEW);
    const view = (f: typeof fa) => ({
      netSale: f.sales.net, bills: f.sales.bills, averageBill: f.sales.bills ? r2(f.sales.net / f.sales.bills) : 0,
      cashReceived: f.sales.cashIn, udhaarGiven: f.sales.credit,
      ...(canExp && { expensesPaid: f.expenses }),
      ...(ctx.canProfit && { grossProfit: f.sales.grossProfit, netProfit: f.netProfit }),
    });
    const A = view(fa);
    const B = view(fb);
    const change = Object.fromEntries(Object.keys(A).map((k) => [k, pct((A as any)[k], (B as any)[k])]));
    const metrics = (['netSale', 'grossProfit', 'netProfit', 'expensesPaid'] as const).filter((k) => k in A);
    return {
      data: { a: { period: pa.label, ...A }, b: { period: pb.label, ...B }, changePercentAvsB: change },
      chart: {
        type: 'bar', title: 'Muqabla', unit: 'money', series: [{ key: 'a', label: pa.label.split(' ')[0] }, { key: 'b', label: pb.label.split(' ')[0] }],
        data: metrics.map((k) => ({ label: k === 'netSale' ? 'Sale' : k === 'grossProfit' ? 'Gross profit' : k === 'netProfit' ? 'Net profit' : 'Expense', a: (A as any)[k], b: (B as any)[k] })),
      },
      link: { label: 'Reports', to: '/reports?tab=sales' },
    };
  }
}
