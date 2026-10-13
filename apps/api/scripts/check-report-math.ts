/**
 * Read-only check that every report works its numbers out the same way.
 *
 * For one tenant and period it runs the real report services and prints net
 * sales, gross profit, expenses, write-offs and net profit from each, next to
 * the shared calculation in common/helpers/business-math.helper. Sales and
 * profit views should match the shared row exactly. Day-close views (Day
 * book) count returns on the day they were made, so they differ by returns
 * whose bill and return fall on different sides of the period edge.
 *
 *   npx ts-node --transpile-only scripts/check-report-math.ts --tenant <tenantId> --from 2026-10-01 --to 2026-10-13
 *
 * Optional: --shop <shopId> for one branch (all branches when left out).
 * Nothing is written to the database.
 */

import { PrismaService } from '../src/prisma/prisma.service';
import { ShopScope } from '../src/common/shop-scope';
import { TenantTimezoneService } from '../src/common/helpers/tenant-timezone.service';
import { profitFigures } from '../src/common/helpers/business-math.helper';
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

    const shared = await profitFigures(prisma, { tenantId, shopId }, range);
    rows.push({
      source: 'Shared rules (dashboards, money)', net: shared.sales.net, grossProfit: shared.sales.grossProfit,
      expenses: shared.expenses, writeOffs: shared.writeOffs.net, netProfit: shared.netProfit,
      note: `${shared.sales.bills} bills · ${shared.sales.fallbackLines} lines at today's cost · ${shared.sales.noCostLines} with no cost`,
    });

    const c = await center.profit(user, scope, { from, to });
    rows.push({ source: 'Reports centre · Munafa', net: c.totals.sales, grossProfit: c.totals.grossProfit, expenses: c.totals.expenses, writeOffs: c.totals.damage, netProfit: c.totals.netProfit });

    const a = await analysis.overview(user, scope, { from, to });
    rows.push({
      source: 'Profit report', net: a.totals.revenue, grossProfit: a.totals.profit, expenses: a.net.expenses, writeOffs: a.net.writeOffCost, netProfit: a.net.netProfit,
      note: 'includes bill service charges',
    });

    const p = await pnl.report(user, scope, { from, to, staff: 'false' });
    const s = p.current;
    rows.push({ source: 'P&L (staff pay off)', net: s.revenue.net, grossProfit: s.grossProfit, expenses: s.expenses.total, writeOffs: s.writeOffs?.net ?? null, netProfit: s.netProfit, note: s.otherIncome.total ? `includes ${money(s.otherIncome.total)} kept booking advances` : undefined });
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

    const off = rows.filter((r) => ['Reports centre · Munafa', 'P&L (staff pay off)', 'Staff report (team)', 'Customers report'].includes(r.source))
      .filter((r) => r.net != null && Math.abs(r.net - shared.sales.net) > 0.01);
    console.log(off.length ? `\nNet sales differ from the shared rules in: ${off.map((r) => r.source).join(', ')}` : '\nNet sales match the shared rules in every sales view.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
