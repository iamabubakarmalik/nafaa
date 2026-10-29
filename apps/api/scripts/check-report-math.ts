/**
 * Check that every report works its numbers out the same way.
 *
 * For one tenant and period it runs the real report services and prints net
 * sales, gross profit, expenses, write-offs and net profit from each, next to
 * the shared calculation in common/helpers/business-math.helper. Sales and
 * profit views should match the shared row exactly. Day-close views (Day
 * book) count returns on the day they were made, so they differ by returns
 * whose bill and return fall on different sides of the period edge.
 *
 * It then checks the profit identities:
 *   bill profit   = sale figures' gross profit
 *   bill profit   = in hand on the period's bills + still on khata + forgiven
 *   net profit    = headline gross − expenses − stock loss + stock gain + other income
 *   settled parts of a khata bill never exceed its net
 *   no customer's settlement rows are out of date
 * Settlement rows of out-of-date customers are rebuilt first (the same thing
 * any report read does); nothing else is written.
 *
 *   npx ts-node --transpile-only scripts/check-report-math.ts --tenant <tenantId> --from 2026-10-01 --to 2026-10-13
 *
 * Optional: --shop <shopId> for one branch (all branches when left out).
 * Nothing is written to the database.
 */

import { PrismaService } from '../src/prisma/prisma.service';
import { ShopScope } from '../src/common/shop-scope';
import { TenantTimezoneService } from '../src/common/helpers/tenant-timezone.service';
import { headlineGross, netProfit, profitFigures } from '../src/common/helpers/business-math.helper';
import { staleCustomers, syncTenantSettlements } from '../src/common/helpers/sale-settlement.helper';
import { AuthenticatedUser } from '../src/modules/auth/interfaces/jwt-payload.interface';
import { reportRange } from '../src/modules/reports/reports/report-range';
import { ReportsCenterService } from '../src/modules/reports/reports/reports-center.service';
import { ProfitAnalysisService } from '../src/modules/finance/profit-report/profit-analysis.service';
import { PnlService } from '../src/modules/reports/pnl/pnl.service';
import { MoneyService } from '../src/modules/finance/money/money.service';
import { StaffReportService } from '../src/modules/reports/staff-report/staff-report.service';
import { CommissionService } from '../src/modules/hr/commission/commission.service';
import { CustomerInsightsService } from '../src/modules/reports/customers-report/customer-insights.service';
import { DayBookService } from '../src/modules/reports/day-book/day-book.service';
import { DayBookQueries } from '../src/modules/reports/day-book/day-book.queries';

const KEY = /^\d{4}-\d{2}-\d{2}$/;

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

interface Row {
  source: string;
  net: number | null;
  grossProfit: number | null;
  expenses: number | null;
  writeOffs: number | null;
  netProfit: number | null;
  note?: string;
}

const money = (v: number | null) => (v == null ? '—' : v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function nextKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

async function main() {
  const tenantId = arg('--tenant');
  const from = arg('--from');
  const to = arg('--to');
  const shopId = arg('--shop') ?? null;
  if (!tenantId || !from || !to || !KEY.test(from) || !KEY.test(to)) {
    console.error('Usage: --tenant <tenantId> --from YYYY-MM-DD --to YYYY-MM-DD [--shop <shopId>]');
    process.exit(1);
  }

  const prisma = new PrismaService();
  const url = process.env.DATABASE_URL ?? '';
  console.log(`Database: ${url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:****@')}`);

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    const owner = await prisma.user.findFirst({ where: { tenantId, role: 'OWNER' }, select: { id: true, email: true } });
    // Owner view: every figure, including cost and profit.
    const user: AuthenticatedUser = {
      id: owner?.id ?? 'check-report-math', sub: owner?.id ?? 'check-report-math', tenantId,
      email: owner?.email ?? '', role: 'OWNER', shopId, permissions: [],
    };
    const scope = new ShopScope(shopId, !shopId);
    console.log(`Tenant: ${tenant.name} · ${from} → ${to} · ${shopId ? `branch ${shopId}` : 'all branches'}\n`);

    const tz = new TenantTimezoneService(prisma);
    const center = new ReportsCenterService(prisma, tz);
    const analysis = new ProfitAnalysisService(prisma, tz);
    const pnl = new PnlService(prisma, tz, new MoneyService(prisma, tz));
    const staff = new StaffReportService(prisma, tz, new CommissionService(prisma, tz));
    const customers = new CustomerInsightsService(prisma, tz);
    const dayBook = new DayBookService(prisma, tz, new DayBookQueries(prisma));

    const range = await reportRange(tz, tenantId, { from, to });
    const rows: Row[] = [];
    const rebuilt = await syncTenantSettlements(prisma, tenantId, { force: true });
    if (rebuilt) console.log(`Rebuilt settlement rows for ${rebuilt} customer(s) whose khata had changed.\n`);

    const shared = await profitFigures(prisma, { tenantId, shopId }, range);
    rows.push({
      source: 'Shared rules (dashboards, money)', net: shared.sales.net, grossProfit: shared.grossProfit,
      expenses: shared.expenses, writeOffs: shared.writeOffs.net, netProfit: shared.netProfit,
      note: `${shared.sales.bills} bills · ${shared.sales.fallbackLines} lines at today's cost · ${shared.sales.noCostLines} with no cost`,
    });

    const c = await center.profit(user, scope, { from, to });
    rows.push({ source: 'Reports centre · Profit', net: c.totals.sales, grossProfit: c.totals.grossProfit, expenses: c.totals.expenses, writeOffs: c.totals.damage, netProfit: c.totals.netProfit });

    const a = await analysis.overview(user, scope, { from, to });
    rows.push({
      source: 'Profit report', net: a.totals.revenue, grossProfit: a.totals.profit, expenses: a.net.expenses, writeOffs: a.net.writeOffCost, netProfit: a.net.netProfit,
      note: 'gross is the bill profit of the products; includes bill service charges',
    });

    const p = await pnl.report(user, scope, { from, to, staff: 'false' });
    const s = p.current;
    rows.push({ source: 'P&L (staff pay off)', net: s.revenue.net, grossProfit: s.grossProfit, expenses: s.expenses.total, writeOffs: s.writeOffs?.net ?? null, netProfit: s.netProfit, note: s.otherIncome.bookingKept ? `includes ${money(s.otherIncome.bookingKept)} kept booking advances` : undefined });
    const pFull = await pnl.report(user, scope, { from, to });
    rows.push({ source: 'P&L (staff pay on)', net: pFull.current.revenue.net, grossProfit: pFull.current.grossProfit, expenses: pFull.current.expenses.total, writeOffs: pFull.current.writeOffs?.net ?? null, netProfit: pFull.current.netProfit, note: 'adds salaries and commission paid' });

    const st = await staff.overview(user, scope, { from, to });
    rows.push({ source: 'Staff report (team)', net: st.totals.net, grossProfit: st.totals.profit, expenses: null, writeOffs: null, netProfit: null });

    const cu = await customers.overview(user, scope, { from, to });
    rows.push({ source: 'Customers report', net: Math.round((cu.totals.named + cu.totals.walkIn) * 100) / 100, grossProfit: null, expenses: null, writeOffs: null, netProfit: null, note: 'profit there covers named customers only' });

    // Day book, one business day at a time (up to 31 days).
    let day = from;
    let days = 0;
    let dbNet = 0;
    let dbProfit = 0;
    for (; day <= to && days < 31; day = nextKey(day), days++) {
      const d = await dayBook.report(user, scope, day);
      dbNet += d.summary.net;
      dbProfit += d.summary.grossProfit;
    }
    rows.push({
      source: 'Day book (sum of days)', net: Math.round(dbNet * 100) / 100, grossProfit: Math.round(dbProfit * 100) / 100, expenses: null, writeOffs: null, netProfit: null,
      note: day <= to ? 'first 31 days only; returns on the day made' : 'returns on the day made',
    });

    const w = [34, 14, 14, 12, 12, 14];
    const line = (cells: string[]) => cells.map((x, i) => (i === 0 ? x.padEnd(w[i]) : x.padStart(w[i]))).join(' ');
    console.log(line(['Source', 'Net sales', 'Gross profit', 'Expenses', 'Write-offs', 'Net profit']));
    console.log('-'.repeat(w.reduce((x, y) => x + y + 1, 0)));
    for (const r of rows) {
      console.log(line([r.source, money(r.net), money(r.grossProfit), money(r.expenses), money(r.writeOffs), money(r.netProfit)]) + (r.note ? `   ${r.note}` : ''));
    }

    const off = rows.filter((r) => ['Reports centre · Profit', 'P&L (staff pay off)', 'Staff report (team)', 'Customers report'].includes(r.source))
      .filter((r) => r.net != null && Math.abs(r.net - shared.sales.net) > 0.01);
    console.log(off.length ? `\nNet sales differ from the shared rules in: ${off.map((r) => r.source).join(', ')}` : '\nNet sales match the shared rules in every sales view.');

    // ── Profit identities ──
    const cp = shared.credit;
    const near = (a: number, b: number) => Math.abs(a - b) <= 0.05;
    const checks: Array<[string, boolean, string]> = [
      ['Bill profit = sale figures gross profit', near(cp.billProfit, shared.sales.grossProfit), `${money(cp.billProfit)} vs ${money(shared.sales.grossProfit)}`],
      ['Bill profit = in hand on period bills + on khata + forgiven', near(cp.billProfit, cp.realised - cp.fromOlderBills + cp.pending + cp.writtenOff),
        `${money(cp.billProfit)} = ${money(cp.realised - cp.fromOlderBills)} + ${money(cp.pending)} + ${money(cp.writtenOff)}`],
      ['Net = headline − expenses − loss + gain + other income', near(shared.netProfit, netProfit(headlineGross(cp, shared.basis), shared.expenses, shared.writeOffs.lossTotal - shared.writeOffs.gain, shared.otherIncome)),
        `${money(shared.netProfit)} (${shared.basis === 'PAID' ? 'paisa milne par' : 'bill bante hi'})`],
      ['Reports centre profit = shared', near(c.totals.grossProfit, shared.grossProfit) && near(c.totals.netProfit, shared.netProfit) && near(c.totals.billProfit, shared.sales.grossProfit),
        `gross ${money(c.totals.grossProfit)} · net ${money(c.totals.netProfit)}`],
      ['P&L (staff off) net = shared net + kept booking advances', s.netProfit == null || near(s.netProfit, shared.netProfit + s.otherIncome.bookingKept),
        `${money(s.netProfit)} vs ${money(shared.netProfit + s.otherIncome.bookingKept)}`],
      ['P&L other income = shared other income', near(s.otherIncome.income, shared.otherIncome), `${money(s.otherIncome.income)} vs ${money(shared.otherIncome)}`],
    ];
    const [over] = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT COUNT(*)::int AS n FROM (
        SELECT z."saleId", SUM(z.amount) AS settled, MAX(s.total - s."refundedAmount") AS net
        FROM "SaleSettlement" z JOIN "Sale" s ON s.id = z."saleId"
        WHERE z."tenantId" = ${tenantId} AND s.status::text <> 'VOIDED'
        GROUP BY 1) x
      WHERE x.settled > x.net + 0.05`;
    checks.push(['No khata bill settled beyond its net', over.n === 0, `${over.n} bill(s)`]);
    const stale = await staleCustomers(prisma, tenantId);
    checks.push(['Settlement rows up to date', stale.length === 0, `${stale.length} customer(s) out of date`]);

    console.log('\nKhata profit: bill', money(cp.billProfit), '· in hand', money(cp.realised), `(from older bills ${money(cp.fromOlderBills)})`,
      '· on khata', money(cp.pending), '· forgiven', money(cp.writtenOff));
    console.log('Stock loss', money(shared.writeOffs.lossTotal), '· stock gain', money(shared.writeOffs.gain), '· corrections (no effect)', money(shared.writeOffs.correction),
      '· other income', money(shared.otherIncome));
    console.log('');
    for (const [label, ok, detail] of checks) console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(58)} ${detail}`);
    if (checks.some(([, ok]) => !ok)) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
