/**
 * Morning summary: yesterday's sale, profit, expenses, udhaar and stock in one
 * short message, written from a template (no model call, no cost).
 *
 * Numbers use the dashboard's own path so "kal" here always equals "kal" on
 * the dashboard and the report centre: the window is the dashboard's
 * [startOfBusinessDayTz(today) − 1 day, startOfBusinessDayTz(today)), and
 * sale, bills, credit, gross profit, expenses, write-offs and net profit come
 * from business-math.helper (saleFigures / profitFigures), the functions the
 * dashboard overview and the report centre call. The best seller uses the
 * same bill CTE. Udhaar outstanding is the khata receivable (positive
 * customer balances; the branch's own ledger on a single-branch view). Low
 * stock counts come from LowStockService, as on the Low stock page.
 *
 * Delivery: a cron checks every ten minutes and sends one in-app notification
 * (with mobile push, through NotificationsService) per person per day. Time:
 * the shop's own report time (Settings → Reports) when it is in the morning,
 * otherwise AI_MORNING_TIME (default 09:00), in the shop's timezone. People:
 * the owner and active users with ai.use and reports.view, narrowed to the
 * recipients chosen in Settings → Reports. WhatsApp: there is no server-side
 * WhatsApp sender in the app, so delivery is in-app only.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { PERMISSIONS, hasPermission } from '../../common/constants/permissions.constants';
import { hiddenFiguresFor, normalizeReportsConfig, type ReportsConfig } from '../../common/helpers/reports-config.helper';
import { businessDayKey, startOfBusinessDayTz, subDaysTz, tzParts } from '../../common/helpers/business-time.helper';
import { LINE_REVENUE, billMathCte, liveSaleSql, profitFigures, saleFigures } from '../../common/helpers/business-math.helper';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { LowStockService } from '../inventory/low-stock/low-stock.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AI_MORNING_FALLBACK_TIME } from './ai.config';
import { money } from './ai-render';
import type { MorningSummary } from './ai.types';

const KIND = 'ai-morning-summary';
const SEND_WINDOW_MINUTES = 120;
const WEEKDAY_NAMES = ['Itwaar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const r2 = (v: number) => Math.round(v * 100) / 100;

interface Viewer { tenantId: string; role: string; permissions: string[]; shopId: string | null }

function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAY_NAMES[wd]}, ${d} ${MONTHS[m - 1]}`;
}

/** "08:30" → minutes after midnight, or null when malformed. */
function minutesOf(value?: string | null): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59 ? h * 60 + min : null;
}

@Injectable()
export class MorningSummaryService {
  private readonly logger = new Logger('NafaaAiMorning');
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly lowStock: LowStockService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Local time the morning summary goes out for a shop. */
  sendTime(reportTime?: string | null): number {
    const own = minutesOf(reportTime);
    if (own != null && own < 12 * 60) return own;
    return minutesOf(process.env.AI_MORNING_TIME) ?? minutesOf(AI_MORNING_FALLBACK_TIME)!;
  }

  private async settings(tenantId: string) {
    const s = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { shopName: true, notifyDailySummary: true, dailySummaryTime: true, reportsConfig: true, tenant: { select: { name: true } } },
    });
    return {
      shop: s?.shopName || s?.tenant?.name || 'Dukaan',
      enabled: s?.notifyDailySummary ?? true,
      time: s?.dailySummaryTime ?? null,
      config: normalizeReportsConfig(s?.reportsConfig),
    };
  }

  /** Positive khata balances: the branch's own ledger, or every customer's balance. */
  private async outstanding(tenantId: string, shopId: string | null): Promise<number> {
    if (shopId) {
      const g = await this.prisma.customerLedger.groupBy({ by: ['customerId'], where: { tenantId, shopId }, _sum: { amount: true } });
      return r2(g.reduce((s, x) => s + Math.max(0, Number(x._sum.amount ?? 0)), 0));
    }
    const a = await this.prisma.customer.aggregate({ where: { tenantId, balance: { gt: 0.005 } }, _sum: { balance: true } });
    return r2(Number(a._sum.balance ?? 0));
  }

  /** Khata payments received in the window (same SQL date handling as the sale figures). */
  private async collected(tenantId: string, shopId: string | null, gte: Date, lt: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ v: number }>>`
      SELECT COALESCE(-SUM(l.amount), 0)::float8 AS v FROM "CustomerLedger" l
      WHERE l."tenantId" = ${tenantId} AND l.type::text = 'PAYMENT_RECEIVED'
        ${shopId ? Prisma.sql`AND l."shopId" = ${shopId}` : Prisma.empty}
        AND l."createdAt" >= ${gte} AND l."createdAt" < ${lt}`;
    return r2(Math.max(0, Number(rows[0]?.v ?? 0)));
  }

  /** Best seller of the window by what it earned after discounts and returns. */
  private async topItem(tenantId: string, shopId: string | null, gte: Date, lt: Date): Promise<string | null> {
    const where = liveSaleSql({ tenantId, shopId }, { gte, lt });
    const rows = await this.prisma.$queryRaw<Array<{ name: string | null }>>`
      WITH ${billMathCte(where)}
      SELECT p.name FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
      LEFT JOIN "Product" p ON p.id = si."productId"
      WHERE ${where}
      GROUP BY p.name ORDER BY SUM(${LINE_REVENUE}) DESC NULLS LAST LIMIT 1`;
    return rows[0]?.name ?? null;
  }

  private async stockCounts(viewer: Viewer, shopId: string | null): Promise<{ out: number; low: number }> {
    const user = { id: '', sub: '', email: '', tenantId: viewer.tenantId, role: viewer.role, permissions: viewer.permissions, shopId: viewer.shopId } as unknown as AuthenticatedUser;
    const rows = await this.lowStock.rows(user, new ShopScope(shopId, !shopId), this.lowStock.settings());
    return { out: rows.filter((r) => r.status === 'out' && !r.ignored).length, low: rows.filter((r) => r.status === 'low' && !r.ignored).length };
  }

  /** Builds the summary for one viewer, showing only what they may see. */
  async build(viewer: Viewer, shopId: string | null, info?: Awaited<ReturnType<MorningSummaryService['settings']>>): Promise<MorningSummary> {
    const tenantId = viewer.tenantId;
    const s = info ?? await this.settings(tenantId);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const now = new Date();
    // The dashboard's own window for "kal".
    const todayStart = startOfBusinessDayTz(now, tz, dayStartHour);
    const yesterdayStart = subDaysTz(todayStart, 1, tz);
    const dayBeforeStart = subDaysTz(yesterdayStart, 1, tz);
    const day = shiftKey(businessDayKey(now, tz, dayStartHour), -1);
    const can = (p: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) => hasPermission(viewer.role, viewer.permissions, p);
    if (!can(PERMISSIONS.REPORTS_VIEW)) {
      return { allowed: false, day, title: '', text: 'Subah ka khulasa dekhne ke liye Reports ki permission chahiye.', figures: null };
    }
    const hidden = hiddenFiguresFor(viewer.role, s.config as ReportsConfig);
    const seesProfit = can(PERMISSIONS.COST_VIEW) && can(PERMISSIONS.PROFIT_REPORT_VIEW) && !hidden.includes('profit');
    const seesKhata = can(PERMISSIONS.KHATA_VIEW);
    const seesExpenses = can(PERMISSIONS.EXPENSES_VIEW);
    const scope = { tenantId, shopId };
    const win = { gte: yesterdayStart, lt: todayStart };

    const [f, prevSales, top, stock, owed, got] = await Promise.all([
      profitFigures(this.prisma, scope, win),
      saleFigures(this.prisma, scope, { gte: dayBeforeStart, lt: yesterdayStart }),
      this.topItem(tenantId, shopId, yesterdayStart, todayStart),
      this.stockCounts(viewer, shopId),
      seesKhata ? this.outstanding(tenantId, shopId) : Promise.resolve(0),
      seesKhata ? this.collected(tenantId, shopId, yesterdayStart, todayStart) : Promise.resolve(0),
    ]);
    const sales = f.sales;
    const average = sales.bills ? r2(sales.net / sales.bills) : 0;
    const prev = prevSales.net;
    const change = prev > 0.005 ? Math.round(((sales.net - prev) / prev) * 100) : null;
    const figures: NonNullable<MorningSummary['figures']> = {
      sales: sales.net, bills: sales.bills, average, previousDay: prev, change,
      ...(seesProfit && {
        grossProfit: f.grossProfit, netProfit: f.netProfit,
        profitInHand: f.credit.realised, profitOnKhata: f.credit.pending, otherIncome: f.otherIncome,
      }),
      ...(seesExpenses && { expenses: f.expenses }),
      ...(seesKhata && { khata: { given: sales.credit, collected: got, outstanding: owed } }),
      lowStock: stock,
      topItem: top,
    };

    const title = `Subah ka khulasa: kal ${money(sales.net)} ki sale`;
    const lines: string[] = [`☀️ Subah bakhair! Kal (${dayLabel(day)}) ka khulasa — ${s.shop}`];
    if (!sales.bills) {
      lines.push('• Kal koi bill nahi bana.');
    } else {
      const trend = change == null ? '' : change === 0 ? ' — pichhle din jitni' : ` — pichhle din se ${Math.abs(change)}% ${change > 0 ? 'zyada' : 'kam'}`;
      lines.push(`• Sale: ${money(sales.net)} (${sales.bills} bill, average ${money(average)})${trend}`);
    }
    if (seesProfit && sales.bills) {
      lines.push(`• Profit: ${money(f.grossProfit)} · expenses aur stock nuksan ke baad ${money(f.netProfit)}`);
      // Khata bills: profit in hand and profit still to come, so nothing is hidden.
      if (f.credit.pending > 0.5 || f.credit.fromOlderBills > 0.5) {
        lines.push(`• Haath mein aaya profit ${money(f.credit.realised)} · udhaar mein profit ${money(f.credit.pending)}`);
      }
    }
    if (seesProfit && f.otherIncome > 0) lines.push(`• Doosri aamdani: ${money(f.otherIncome)}`);
    else if (seesExpenses && f.expenses > 0) lines.push(`• Expenses: ${money(f.expenses)}`);
    if (seesKhata) lines.push(`• Udhaar: ${money(sales.credit)} diya, ${money(got)} wapas aaya — kul baqi ${money(owed)}`);
    if (stock.out || stock.low) lines.push(`• Stock: ${stock.out} cheezein khatam, ${stock.low} kam`);
    if (top && sales.bills) lines.push(`• Sab se zyada bika: ${top}`);
    return { allowed: true, day, title, text: lines.join('\n'), figures };
  }

  /** GET /ai/morning-summary for the signed-in user and their branch view. */
  forUser(user: AuthenticatedUser, scope: ShopScope): Promise<MorningSummary> {
    return this.build({ tenantId: user.tenantId, role: user.role, permissions: user.permissions ?? [], shopId: user.shopId }, scope.shopId);
  }

  /* ───────────────────────── scheduled delivery ───────────────────────── */

  @Cron('*/10 * * * *', { name: 'ai-morning-summary' })
  async tick() {
    if (this.running || process.env.AI_MORNING_SUMMARY === 'off') return;
    this.running = true;
    try {
      const sent = await this.runDue();
      if (sent) this.logger.log(`Morning summary sent to ${sent} people`);
    } catch (e: any) {
      this.logger.error(`Morning summary run failed: ${e?.message}`);
    } finally {
      this.running = false;
    }
  }

  async runDue(): Promise<number> {
    const rows = await this.prisma.tenantSettings.findMany({
      where: { notifyDailySummary: true, tenant: { status: { in: ['ACTIVE', 'TRIAL'] } } },
      select: { tenantId: true, dailySummaryTime: true },
    });
    const now = new Date();
    let sent = 0;
    for (const row of rows) {
      try {
        const { tz, dayStartHour } = await this.tz.clock(row.tenantId);
        const p = tzParts(now, tz);
        const past = (p.hour * 60 + p.minute - this.sendTime(row.dailySummaryTime) + 1440) % 1440;
        if (past >= SEND_WINDOW_MINUTES) continue;
        const day = shiftKey(businessDayKey(now, tz, dayStartHour), -1);
        sent += await this.deliver(row.tenantId, day);
      } catch (e: any) {
        this.logger.warn(`Morning summary failed for ${row.tenantId}: ${e?.message}`);
      }
    }
    return sent;
  }

  /** Sends `day`'s summary to every recipient who has not had it yet. */
  private async deliver(tenantId: string, day: string): Promise<number> {
    const done = await this.prisma.notification.findMany({
      where: {
        tenantId, createdAt: { gte: new Date(Date.now() - 2 * 86_400_000) },
        AND: [{ metadata: { path: ['kind'], equals: KIND } }, { metadata: { path: ['day'], equals: day } }],
      },
      select: { userId: true },
    });
    const already = new Set(done.map((x) => x.userId));
    const info = await this.settings(tenantId);
    const chosen = info.config.summary.recipientIds;
    const people = (await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, role: true, permissions: true, shopId: true },
    })).filter((u) => !already.has(u.id) && (!chosen || chosen.includes(u.id))
      && (u.role === 'OWNER' || (hasPermission(u.role, u.permissions, PERMISSIONS.AI_USE) && hasPermission(u.role, u.permissions, PERMISSIONS.REPORTS_VIEW))));
    if (!people.length) return 0;

    let sent = 0;
    for (const u of people) {
      const summary = await this.build({ tenantId, role: u.role, permissions: u.permissions, shopId: u.shopId }, u.role === 'OWNER' ? null : u.shopId, info);
      if (!summary.allowed || !summary.figures) continue;
      // A closed shop gets nothing: no bills and nothing owed changes.
      if (!summary.figures.bills && !summary.figures.expenses) continue;
      await this.notifications.create({
        tenantId, userId: u.id, type: NotificationType.INFO,
        title: summary.title, message: summary.text, link: '/ai',
        metadata: { kind: KIND, day },
      });
      sent++;
    }
    return sent;
  }
}
