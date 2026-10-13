/**
 * Profit by product for a period of business days, worked out from the
 * sale lines: revenue after line and bill discounts and after refunds,
 * cost from the price saved on each line at the time of sale (today's
 * product or variant cost only when the line has none), and gross profit
 * by product, variant, category, brand, last supplier, staff and day.
 * Net profit takes off paid expenses and stock written off (damage, loss
 * and count corrections). Every rule comes from business-math.helper.
 * Every figure has the previous period of the same length beside it.
 *
 * Returns are counted against the sale they came from, so a period's
 * figures follow its own bills. Voided bills are left out.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey, safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import {
  LINE_COST_JOINS, LINE_NET, LINE_NO_COST, LINE_REFUND, LINE_UNIT_COST, billMathCte, liveSaleSql, netProfit, paidExpenseWhere, writeOffs,
} from '../../../common/helpers/business-math.helper';
import type { ProfitItemsDto, ProfitRangeDto, ProfitUnitsDto } from './dto/profit-analysis.dto';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
/** Keys removed for users without `cost.view`. */
const COST_KEY = /cost|profit|margin/i;

interface Range { gte: Date; lt: Date }
interface Period { from: string; to: string; days: number; range: Range }

interface Ctx {
  tenantId: string;
  shopId: string | null;
  tz: string;
  h: number;
  q: ProfitRangeDto;
  cur: Period;
  prev: Period;
}

/** Sums straight from SQL for one group. */
interface Measures {
  qty: number; returnedQty: number; gross: number; net: number; discount: number; refund: number;
  cost: number; returnedCost: number; lines: number; bills: number;
  fallbackLines: number; fallbackNet: number; noCostLines: number;
}

interface RawGroup extends Measures {
  g: number;
  productId: string | null; variantId: string | null; categoryId: string | null; brandId: string | null;
  day: string | null; staff: string | null;
}

export interface Figures {
  /** Units kept by customers (sold minus returned). */
  qty: number;
  returnedQty: number;
  /** At list price, before any discount. */
  gross: number;
  discount: number;
  /** Given back on returns. */
  refund: number;
  /** Gross − discount − refund. */
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  bills: number;
  lines: number;
  /** Profit lost to returns: refund minus the cost of what came back. */
  returnProfit: number;
}

export interface ProductProfitRow extends Figures {
  key: string;
  productId: string | null;
  name: string;
  sku: string | null;
  unit: string;
  image: string | null;
  category: { id: string; name: string; color: string | null } | null;
  brand: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
  avgPrice: number;
  avgCost: number;
  fallbackLines: number;
  noCostLines: number;
  prevRevenue: number;
  prevProfit: number;
  revenueRank: number;
  profitRank: number;
  variants: Array<Figures & { variantId: string | null; name: string }>;
}

export interface DimRow extends Figures {
  id: string;
  name: string;
  color: string | null;
  products: number;
  share: number;
  prevRevenue: number;
  prevProfit: number;
}

const blank = (): Measures => ({
  qty: 0, returnedQty: 0, gross: 0, net: 0, discount: 0, refund: 0, cost: 0, returnedCost: 0,
  lines: 0, bills: 0, fallbackLines: 0, fallbackNet: 0, noCostLines: 0,
});

const add = (a: Measures, b: Measures) => {
  for (const k of Object.keys(a) as Array<keyof Measures>) a[k] += Number(b[k]) || 0;
  return a;
};

function figures(m: Measures): Figures {
  const revenue = m.net - m.refund;
  const profit = revenue - m.cost;
  return {
    qty: r2(m.qty - m.returnedQty),
    returnedQty: r2(m.returnedQty),
    gross: r2(m.gross),
    discount: r2(m.discount),
    refund: r2(m.refund),
    revenue: r2(revenue),
    cost: r2(m.cost),
    profit: r2(profit),
    margin: revenue > 0 ? r2((profit / revenue) * 100) : 0,
    bills: m.bills,
    lines: m.lines,
    returnProfit: r2(m.refund - m.returnedCost),
  };
}

function stripCost<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripCost) as T;
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) if (!COST_KEY.test(k)) out[k] = stripCost(v);
  return out as T;
}

/** Calendar arithmetic on "YYYY-MM-DD" keys. */
function addKey(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
const keyDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** Grouping sets the main query can return; the bit order matches `GROUPING(...)` below. */
const SET = {
  variant: { sql: Prisma.sql`(x."productId", x."variantId")`, g: 15 },
  product: { sql: Prisma.sql`(x."productId")`, g: 31 },
  category: { sql: Prisma.sql`(x."categoryId")`, g: 55 },
  brand: { sql: Prisma.sql`(x."brandId")`, g: 59 },
  day: { sql: Prisma.sql`(x.day)`, g: 61 },
  staff: { sql: Prisma.sql`(x.staff)`, g: 62 },
  total: { sql: Prisma.sql`()`, g: 63 },
} as const;
type SetName = keyof typeof SET;

@Injectable()
export class ProfitAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── context ───────────────────────── */

  private async context(user: AuthenticatedUser, scope: ShopScope, q: ProfitRangeDto): Promise<Ctx> {
    const { tz, dayStartHour } = await this.tz.clock(user.tenantId);
    const h = safeDayStart(dayStartHour);
    const today = businessDayKey(new Date(), tz, h);
    let to = q.to && q.to <= today ? q.to : today;
    let from = q.from ?? addKey(to, -29);
    if (from > to) [from, to] = [to, from];
    const at = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, h, 0, 0, tz); };
    const days = keyDiff(from, to) + 1;
    const prevTo = addKey(from, -1);
    const prevFrom = addKey(from, -days);
    return {
      tenantId: user.tenantId,
      shopId: scope.shopId,
      tz, h, q,
      cur: { from, to, days, range: { gte: at(from), lt: at(addKey(to, 1)) } },
      prev: { from: prevFrom, to: prevTo, days, range: { gte: at(prevFrom), lt: at(from) } },
    };
  }

  private canSeeCost(user: AuthenticatedUser) {
    return hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW);
  }

  /**
   * Sale lines of the period as CTE `x`: one row per line with its share of
   * the bill discount, its refunds and its unit cost, by the shared rules in
   * business-math.helper.
   */
  private lines(ctx: Ctx, range: Range): Prisma.Sql {
    const { tenantId, shopId, tz, h, q } = ctx;
    const where = Prisma.sql`${liveSaleSql({ tenantId, shopId }, range)}
      ${q.staffId ? Prisma.sql`AND COALESCE(s."soldById", s."createdById") = ${q.staffId}` : Prisma.empty}`;
    return Prisma.sql`
      WITH ${billMathCte(where)},
      x AS (
        SELECT si.id, si."saleId", s."saleNumber", s."soldAt",
               COALESCE(s."soldById", s."createdById") AS staff,
               to_char(((s."soldAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}) - make_interval(hours => ${h}::int), 'YYYY-MM-DD') AS day,
               si."productId", bm_sv."variantId", si."usedPhoneId", bm_p."categoryId", bm_p."brandId",
               si.quantity AS qty, LEAST(si."returnedQty", si.quantity) AS rqty,
               si.price * si.quantity AS gross,
               ${LINE_NET} AS net,
               ${LINE_REFUND} AS refund,
               ${LINE_UNIT_COST} AS ucost,
               (si."costPrice" <= 0 AND NOT bm.keeps) AS fallback,
               ${LINE_NO_COST} AS nocost
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        JOIN bm ON bm.id = s.id
        ${LINE_COST_JOINS}
        WHERE ${where}
          ${q.categoryId ? Prisma.sql`AND bm_p."categoryId" = ${q.categoryId}` : Prisma.empty}
          ${q.brandId ? Prisma.sql`AND bm_p."brandId" = ${q.brandId}` : Prisma.empty}
      )`;
  }

  private static readonly MEASURES = Prisma.sql`
    COALESCE(SUM(x.qty), 0)::float AS qty,
    COALESCE(SUM(x.rqty), 0)::float AS "returnedQty",
    COALESCE(SUM(x.gross), 0)::float AS gross,
    COALESCE(SUM(x.net), 0)::float AS net,
    COALESCE(SUM(GREATEST(x.gross - x.net, 0)), 0)::float AS discount,
    COALESCE(SUM(x.refund), 0)::float AS refund,
    COALESCE(SUM(x.ucost * (x.qty - x.rqty)), 0)::float AS cost,
    COALESCE(SUM(x.ucost * x.rqty), 0)::float AS "returnedCost",
    COUNT(*)::int AS lines,
    COUNT(DISTINCT x."saleId")::int AS bills,
    (COUNT(*) FILTER (WHERE x.fallback AND x.ucost > 0))::int AS "fallbackLines",
    COALESCE(SUM(x.net) FILTER (WHERE x.fallback AND x.ucost > 0), 0)::float AS "fallbackNet",
    (COUNT(*) FILTER (WHERE x.nocost))::int AS "noCostLines"`;

  private grouped(ctx: Ctx, range: Range, sets: SetName[]) {
    return this.prisma.$queryRaw<RawGroup[]>`
      ${this.lines(ctx, range)}
      SELECT GROUPING(x."productId", x."variantId", x."categoryId", x."brandId", x.day, x.staff)::int AS g,
             x."productId", x."variantId", x."categoryId", x."brandId", x.day, x.staff,
             ${ProfitAnalysisService.MEASURES}
      FROM x
      GROUP BY GROUPING SETS (${Prisma.join(sets.map((s) => SET[s].sql))})`;
  }

  /* ───────────────────────── shared analysis ───────────────────────── */

  private async analyse(user: AuthenticatedUser, scope: ShopScope, q: ProfitRangeDto) {
    const ctx = await this.context(user, scope, q);
    const [cur, prev] = await Promise.all([
      this.grouped(ctx, ctx.cur.range, ['variant', 'product', 'category', 'brand', 'day', 'staff', 'total']),
      this.grouped(ctx, ctx.prev.range, ['product', 'category', 'brand', 'staff', 'total']),
    ]);
    const pick = (rows: RawGroup[], s: SetName) => rows.filter((r) => r.g === SET[s].g);

    const productIds = [...new Set(pick(cur, 'product').map((r) => r.productId).filter((x): x is string => !!x))];
    const variantIds = [...new Set(pick(cur, 'variant').map((r) => r.variantId).filter((x): x is string => !!x))];
    const [products, variants, suppliers] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({
        where: { tenantId: ctx.tenantId, id: { in: productIds } },
        select: {
          id: true, name: true, sku: true, unit: true,
          category: { select: { id: true, name: true, color: true } },
          brand: { select: { id: true, name: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
        },
      }) : [],
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true } }) : [],
      productIds.length ? this.prisma.$queryRaw<Array<{ productId: string; id: string; name: string }>>`
        SELECT DISTINCT ON (pi."productId") pi."productId", su.id, su.name
        FROM "PurchaseItem" pi
        JOIN "Purchase" pu ON pu.id = pi."purchaseId"
        JOIN "Supplier" su ON su.id = pu."supplierId"
        WHERE pu."tenantId" = ${ctx.tenantId} AND pu.status <> 'CANCELLED' AND pi."productId" = ANY(${productIds}::text[])
        ORDER BY pi."productId", pu."purchasedAt" DESC` : [],
    ]);
    const productBy = new Map(products.map((p) => [p.id, p]));
    const variantName = new Map(variants.map((v) => [v.id, v.name]));
    const supplierBy = new Map(suppliers.map((s) => [s.productId, { id: s.id, name: s.name }]));
    const prevBy = new Map(pick(prev, 'product').map((r) => [r.productId ?? '', figures(r)]));

    const variantRows = new Map<string, RawGroup[]>();
    for (const v of pick(cur, 'variant')) {
      const k = v.productId ?? '';
      variantRows.set(k, [...(variantRows.get(k) ?? []), v]);
    }

    const rows: ProductProfitRow[] = pick(cur, 'product').map((r) => {
      const p = r.productId ? productBy.get(r.productId) : undefined;
      const f = figures(r);
      const kept = r.qty - r.returnedQty;
      const vs = (variantRows.get(r.productId ?? '') ?? []).filter((v) => v.variantId);
      const pv = prevBy.get(r.productId ?? '');
      return {
        ...f,
        key: r.productId ?? 'none',
        productId: r.productId,
        name: p?.name ?? (r.productId ? 'Product mita diya gaya' : 'Bina product (custom / service)'),
        sku: p?.sku ?? null,
        unit: p?.unit ?? 'pcs',
        image: p?.images[0]?.url ?? null,
        category: p?.category ?? null,
        brand: p?.brand ?? null,
        supplier: (r.productId && supplierBy.get(r.productId)) || null,
        avgPrice: kept > 0 ? r2(f.revenue / kept) : 0,
        avgCost: kept > 0 ? r2(r.cost / kept) : 0,
        fallbackLines: r.fallbackLines,
        noCostLines: r.noCostLines,
        prevRevenue: pv?.revenue ?? 0,
        prevProfit: pv?.profit ?? 0,
        revenueRank: 0,
        profitRank: 0,
        variants: vs.length
          ? (variantRows.get(r.productId ?? '') ?? [])
            .map((v) => ({ ...figures(v), variantId: v.variantId, name: v.variantId ? variantName.get(v.variantId) ?? 'Variant' : 'Bina variant' }))
            .sort((a, b) => b.revenue - a.revenue)
          : [],
      };
    });
    [...rows].sort((a, b) => b.revenue - a.revenue).forEach((r, i) => { r.revenueRank = i + 1; });
    [...rows].sort((a, b) => b.profit - a.profit).forEach((r, i) => { r.profitRank = i + 1; });

    return { ctx, cur, prev, pick, rows };
  }

  /* ───────────────────────── overview ───────────────────────── */

  async overview(user: AuthenticatedUser, scope: ShopScope, q: ProfitRangeDto) {
    const { ctx, cur, prev, pick, rows } = await this.analyse(user, scope, q);
    const seeCost = this.canSeeCost(user);
    const total = pick(cur, 'total')[0] ?? { ...blank() };
    const prevTotal = pick(prev, 'total')[0] ?? { ...blank() };
    const t = figures(total);
    const pt = figures(prevTotal);

    const [net, prevNet] = await Promise.all([this.netFigures(ctx, ctx.cur.range, t.profit), this.netFigures(ctx, ctx.prev.range, pt.profit)]);

    // Category, brand and staff come from SQL; supplier is added up from products.
    const catPrev = new Map(pick(prev, 'category').map((r) => [r.categoryId ?? '', figures(r)]));
    const brandPrev = new Map(pick(prev, 'brand').map((r) => [r.brandId ?? '', figures(r)]));
    const staffPrev = new Map(pick(prev, 'staff').map((r) => [r.staff ?? '', figures(r)]));
    const catMeta = new Map<string, { name: string; color: string | null }>();
    const brandMeta = new Map<string, string>();
    const productCount = { category: new Map<string, number>(), brand: new Map<string, number>() };
    for (const r of rows) {
      if (r.category) catMeta.set(r.category.id, { name: r.category.name, color: r.category.color });
      if (r.brand) brandMeta.set(r.brand.id, r.brand.name);
      const ck = r.category?.id ?? '';
      const bk = r.brand?.id ?? '';
      productCount.category.set(ck, (productCount.category.get(ck) ?? 0) + 1);
      productCount.brand.set(bk, (productCount.brand.get(bk) ?? 0) + 1);
    }
    const staffIds = pick(cur, 'staff').map((r) => r.staff).filter((x): x is string => !!x);
    const staffNames = staffIds.length
      ? new Map((await this.prisma.user.findMany({ where: { id: { in: staffIds }, tenantId: ctx.tenantId }, select: { id: true, fullName: true } })).map((u) => [u.id, u.fullName]))
      : new Map<string, string>();

    const dim = (id: string, name: string, color: string | null, m: Measures, products: number, p?: Figures): DimRow => {
      const f = figures(m);
      return { ...f, id: id || 'none', name, color, products, share: t.revenue > 0 ? r2((f.revenue / t.revenue) * 100) : 0, prevRevenue: p?.revenue ?? 0, prevProfit: p?.profit ?? 0 };
    };
    const byRevenue = (a: DimRow, b: DimRow) => b.revenue - a.revenue;

    const byCategory = pick(cur, 'category').map((r) => {
      const meta = r.categoryId ? catMeta.get(r.categoryId) : undefined;
      return dim(r.categoryId ?? '', meta?.name ?? 'Bina category', meta?.color ?? null, r, productCount.category.get(r.categoryId ?? '') ?? 0, catPrev.get(r.categoryId ?? ''));
    }).sort(byRevenue);
    const byBrand = pick(cur, 'brand').map((r) =>
      dim(r.brandId ?? '', (r.brandId && brandMeta.get(r.brandId)) || 'Bina brand', null, r, productCount.brand.get(r.brandId ?? '') ?? 0, brandPrev.get(r.brandId ?? ''))).sort(byRevenue);
    const byStaff = pick(cur, 'staff').map((r) =>
      dim(r.staff ?? '', (r.staff && staffNames.get(r.staff)) || 'Pata nahi', null, r, 0, staffPrev.get(r.staff ?? ''))).sort(byRevenue);

    // Supplier: last supplier of each product; bills are not unique across products, so they are left at 0.
    const supplierAgg = new Map<string, { name: string; f: Figures; products: number; prevRevenue: number; prevProfit: number }>();
    for (const r of rows) {
      const id = r.supplier?.id ?? '';
      const s = supplierAgg.get(id) ?? { name: r.supplier?.name ?? 'Kabhi khareeda nahi', f: emptyFigures(), products: 0, prevRevenue: 0, prevProfit: 0 };
      for (const k of ['qty', 'returnedQty', 'gross', 'discount', 'refund', 'revenue', 'cost', 'profit', 'lines', 'returnProfit'] as const) s.f[k] = r2(s.f[k] + r[k]);
      s.products += 1;
      s.prevRevenue += r.prevRevenue;
      s.prevProfit += r.prevProfit;
      supplierAgg.set(id, s);
    }
    const bySupplier: DimRow[] = [...supplierAgg.entries()].map(([id, s]) => ({
      ...s.f, bills: 0, margin: s.f.revenue > 0 ? r2((s.f.profit / s.f.revenue) * 100) : 0,
      id: id || 'none', name: s.name, color: null, products: s.products,
      share: t.revenue > 0 ? r2((s.f.revenue / t.revenue) * 100) : 0, prevRevenue: r2(s.prevRevenue), prevProfit: r2(s.prevProfit),
    })).sort(byRevenue);

    // Trend: by day up to two months, by month beyond that.
    const byMonth = ctx.cur.days > 62;
    const buckets = new Map<string, Measures>();
    for (let k = ctx.cur.from; k <= ctx.cur.to; k = addKey(k, 1)) {
      const bk = byMonth ? k.slice(0, 7) : k;
      if (!buckets.has(bk)) buckets.set(bk, blank());
    }
    const weekday = Array.from({ length: 7 }, () => blank());
    for (const r of pick(cur, 'day')) {
      if (!r.day) continue;
      const bk = byMonth ? r.day.slice(0, 7) : r.day;
      add(buckets.get(bk) ?? buckets.set(bk, blank()).get(bk)!, r);
      add(weekday[new Date(`${r.day}T12:00:00Z`).getUTCDay()], r);
    }
    const trend = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, m]) => {
      const f = figures(m);
      return { key, revenue: f.revenue, profit: f.profit, cost: f.cost, discount: f.discount, refund: f.refund, bills: f.bills, margin: f.margin };
    });

    const brief = (r: ProductProfitRow) => ({
      key: r.key, productId: r.productId, name: r.name, unit: r.unit, image: r.image, category: r.category?.name ?? null,
      qty: r.qty, revenue: r.revenue, profit: r.profit, margin: r.margin, discount: r.discount, refund: r.refund,
      returnedQty: r.returnedQty, returnProfit: r.returnProfit, revenueRank: r.revenueRank, profitRank: r.profitRank,
    });
    const losing = rows.filter((r) => r.profit < 0 && r.revenue > 0);

    const result = {
      range: { from: ctx.cur.from, to: ctx.cur.to, days: ctx.cur.days, prevFrom: ctx.prev.from, prevTo: ctx.prev.to, byMonth },
      filtered: !!(q.categoryId || q.brandId || q.staffId),
      totals: { ...t, products: rows.length },
      prev: { ...pt, products: pick(prev, 'product').length },
      costBasis: {
        lines: total.lines,
        savedLines: total.lines - total.fallbackLines - total.noCostLines,
        fallbackLines: total.fallbackLines,
        fallbackRevenue: r2(total.fallbackNet),
        noCostLines: total.noCostLines,
        noCostProducts: rows.filter((r) => r.noCostLines > 0).length,
      },
      net,
      prevNet,
      trend,
      weekday: weekday.map((w, day) => ({ day, revenue: figures(w).revenue, profit: figures(w).profit, bills: w.bills })),
      byCategory, byBrand, bySupplier, byStaff,
      topEarners: [...rows].sort((a, b) => b.profit - a.profit).slice(0, 10).map(brief),
      topSellers: [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(brief),
      losses: {
        count: losing.length,
        amount: r2(losing.reduce((s, r) => s + r.profit, 0)),
        items: [...losing].sort((a, b) => a.profit - b.profit).slice(0, 10).map(brief),
      },
      discountTop: rows.filter((r) => r.discount > 0).sort((a, b) => b.discount - a.discount).slice(0, 8).map(brief),
      returnTop: rows.filter((r) => r.refund > 0).sort((a, b) => b.refund - a.refund).slice(0, 8).map(brief),
    };
    if (seeCost) return result;
    return stripCost({ ...result, topEarners: [], losses: { count: 0, amount: 0, items: [] } });
  }

  /** Expenses and stock written off in a range, and what is left of gross profit. */
  private async netFigures(ctx: Ctx, range: Range, grossProfit: number) {
    const scope = { tenantId: ctx.tenantId, shopId: ctx.shopId };
    const { categoryId, brandId } = ctx.q;
    const productWhere = categoryId || brandId
      ? { product: { ...(categoryId && { categoryId }), ...(brandId && { brandId }) } }
      : {};
    const productSql = categoryId || brandId
      ? Prisma.sql`TRUE ${categoryId ? Prisma.sql`AND wp."categoryId" = ${categoryId}` : Prisma.empty} ${brandId ? Prisma.sql`AND wp."brandId" = ${brandId}` : Prisma.empty}`
      : undefined;
    const [expenses, w, topWriteOffs] = await Promise.all([
      this.prisma.expense.groupBy({ by: ['categoryId'], where: paidExpenseWhere(scope, range), _sum: { amount: true } }),
      writeOffs(this.prisma, scope, range, productSql),
      this.prisma.stockAdjustment.groupBy({
        by: ['productId'],
        where: { tenantId: ctx.tenantId, ...(ctx.shopId && { shopId: ctx.shopId }), type: { in: ['DAMAGE', 'LOSS'] }, createdAt: { gte: range.gte, lt: range.lt }, ...productWhere },
        _sum: { value: true, quantity: true },
        orderBy: { _sum: { value: 'desc' } },
        take: 5,
      }),
    ]);
    const catIds = expenses.map((e) => e.categoryId).filter((x): x is string => !!x);
    const [cats, prods] = await Promise.all([
      catIds.length ? this.prisma.expenseCategory.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, color: true } }) : [],
      topWriteOffs.length ? this.prisma.product.findMany({ where: { id: { in: topWriteOffs.map((x) => x.productId) } }, select: { id: true, name: true, unit: true } }) : [],
    ]);
    const catBy = new Map(cats.map((c) => [c.id, c]));
    const prodBy = new Map(prods.map((p) => [p.id, p]));
    const expenseTotal = r2(expenses.reduce((s, e) => s + (e._sum.amount ?? 0), 0));
    return {
      grossProfit: r2(grossProfit),
      expenses: expenseTotal,
      expenseCategories: expenses
        .map((e) => ({ id: e.categoryId ?? 'none', name: (e.categoryId && catBy.get(e.categoryId)?.name) || 'Bina category', color: (e.categoryId && catBy.get(e.categoryId)?.color) || null, amount: r2(e._sum.amount ?? 0) }))
        .sort((a, b) => b.amount - a.amount),
      damageCost: w.damage, damageCount: w.damageCount,
      returnDamageCost: w.returnDamage, returnDamageCount: w.returnDamageCount,
      lossCost: w.loss, lossCount: w.lossCount,
      adjustOutCost: w.countedShort, adjustInCost: w.found,
      writeOffCost: w.net,
      topWriteOffs: topWriteOffs.map((x) => ({ productId: x.productId, name: prodBy.get(x.productId)?.name ?? 'Product', unit: prodBy.get(x.productId)?.unit ?? 'pcs', qty: r2(x._sum.quantity ?? 0), writeOffCost: r2(x._sum.value ?? 0) })),
      netProfit: netProfit(grossProfit, expenseTotal, w.net),
    };
  }

  /* ───────────────────────── items (paged) ───────────────────────── */

  async items(user: AuthenticatedUser, scope: ShopScope, q: ProfitItemsDto) {
    const { rows } = await this.analyse(user, scope, q);
    const seeCost = this.canSeeCost(user);
    const view = seeCost ? q.view ?? 'all' : ['discount', 'returns'].includes(q.view ?? '') ? q.view! : 'all';
    const sort = seeCost || !['profit', 'margin', 'loss'].includes(q.sort ?? 'profit') ? q.sort ?? 'profit' : 'revenue';

    let list = rows;
    if (view === 'loss') list = list.filter((r) => r.profit < 0);
    else if (view === 'fallback') list = list.filter((r) => r.fallbackLines > 0);
    else if (view === 'nocost') list = list.filter((r) => r.noCostLines > 0);
    else if (view === 'discount') list = list.filter((r) => r.discount > 0);
    else if (view === 'returns') list = list.filter((r) => r.returnedQty > 0 || r.refund > 0);

    const s = q.search?.trim().toLowerCase();
    if (s) {
      list = list.filter((r) => [r.name, r.sku, r.category?.name, r.brand?.name, r.supplier?.name, ...r.variants.map((v) => v.name)]
        .some((x) => x?.toLowerCase().includes(s)));
    }

    const cmp: Record<string, (a: ProductProfitRow, b: ProductProfitRow) => number> = {
      profit: (a, b) => b.profit - a.profit,
      margin: (a, b) => b.margin - a.margin,
      revenue: (a, b) => b.revenue - a.revenue,
      qty: (a, b) => b.qty - a.qty,
      discount: (a, b) => b.discount - a.discount,
      returns: (a, b) => b.refund - a.refund,
      loss: (a, b) => a.profit - b.profit,
      name: (a, b) => a.name.localeCompare(b.name),
    };
    list = [...list].sort(cmp[sort] ?? cmp.profit);

    const limit = q.limit ?? 50;
    const page = q.page ?? 1;
    const pages = Math.max(1, Math.ceil(list.length / limit));
    const result = { items: list.slice((page - 1) * limit, page * limit), total: list.length, page, pages };
    return seeCost ? result : stripCost(result);
  }

  /* ───────────────────────── IMEI / serial units ───────────────────────── */

  /**
   * Profit per phone or serial-tracked unit, plus every line of the period
   * split by where it came from: new phone (IMEI), used phone, serial unit,
   * repair bill or everything else.
   */
  async units(user: AuthenticatedUser, scope: ShopScope, q: ProfitUnitsDto) {
    const ctx = await this.context(user, scope, q);
    const kinds = Prisma.sql`
      ${this.lines(ctx, ctx.cur.range)},
      k AS (
        SELECT x.*,
               CASE WHEN up.id IS NOT NULL THEN 'USED' WHEN pi.id IS NOT NULL THEN 'IMEI' WHEN est.id IS NOT NULL THEN 'SERIAL'
                    WHEN rt.id IS NOT NULL THEN 'REPAIR' ELSE 'OTHER' END AS kind,
               COALESCE(pi.imei1, up.imei1, est.imei) AS imei,
               COALESCE(est."serialNumber", pi."serialNumber", up."serialNumber") AS serial,
               CASE WHEN x.fallback THEN COALESCE(NULLIF(pi."costPrice", 0), NULLIF(est."purchasePrice", 0), NULLIF(up."totalCost", 0), x.ucost) ELSE x.ucost END AS ucost2
        FROM x
        LEFT JOIN "ProductImei" pi ON pi."saleItemId" = x.id
        LEFT JOIN "ElectronicsSerialTracking" est ON est."saleItemId" = x.id
        LEFT JOIN "UsedPhone" up ON up.id = x."usedPhoneId"
        LEFT JOIN "RepairTicket" rt ON rt."saleId" = x."saleId"
      )`;
    const kind = q.kind && q.kind !== 'all' ? q.kind : null;
    const search = q.search?.trim();
    const [split, units] = await Promise.all([
      this.prisma.$queryRaw<Array<Measures & { kind: string }>>`
        ${kinds}
        SELECT kind,
               COALESCE(SUM(qty), 0)::float AS qty, COALESCE(SUM(rqty), 0)::float AS "returnedQty",
               COALESCE(SUM(gross), 0)::float AS gross, COALESCE(SUM(net), 0)::float AS net,
               COALESCE(SUM(GREATEST(gross - net, 0)), 0)::float AS discount, COALESCE(SUM(refund), 0)::float AS refund,
               COALESCE(SUM(ucost2 * (qty - rqty)), 0)::float AS cost, COALESCE(SUM(ucost2 * rqty), 0)::float AS "returnedCost",
               COUNT(*)::int AS lines, COUNT(DISTINCT "saleId")::int AS bills,
               0::int AS "fallbackLines", 0::float AS "fallbackNet", 0::int AS "noCostLines"
        FROM k GROUP BY kind`,
      this.prisma.$queryRaw<Array<{
        id: string; saleNumber: string; soldAt: Date; productId: string | null; product: string | null; variant: string | null;
        kind: string; imei: string | null; serial: string | null; qty: number; rqty: number; net: number; refund: number; ucost2: number; fallback: boolean;
      }>>`
        ${kinds}
        SELECT k.id, k."saleNumber", k."soldAt", k."productId", p.name AS product, pv.name AS variant, k.kind, k.imei, k.serial,
               k.qty::float AS qty, k.rqty::float AS rqty, k.net::float AS net, k.refund::float AS refund, k.ucost2::float AS ucost2, k.fallback
        FROM k
        LEFT JOIN "Product" p ON p.id = k."productId"
        LEFT JOIN "ProductVariant" pv ON pv.id = k."variantId"
        WHERE k.kind IN ('IMEI', 'USED', 'SERIAL')
          ${kind ? Prisma.sql`AND k.kind = ${kind}` : Prisma.empty}
          ${search ? Prisma.sql`AND (k.imei ILIKE ${`%${search}%`} OR k.serial ILIKE ${`%${search}%`} OR p.name ILIKE ${`%${search}%`} OR k."saleNumber" ILIKE ${`%${search}%`})` : Prisma.empty}
        ORDER BY k."soldAt" DESC
        LIMIT 500`,
    ]);

    const result = {
      range: { from: ctx.cur.from, to: ctx.cur.to },
      split: split.map((s) => ({ kind: s.kind, ...figures(s) })),
      items: units.map((u) => {
        const kept = Math.max(u.qty - u.rqty, 0);
        const revenue = r2(u.net - u.refund);
        const cost = r2(u.ucost2 * kept);
        return {
          id: u.id, saleNumber: u.saleNumber, soldAt: u.soldAt, productId: u.productId,
          name: u.product ?? 'Product', variant: u.variant, kind: u.kind, imei: u.imei, serial: u.serial,
          returned: kept <= 0, revenue, cost, profit: r2(revenue - cost),
          margin: revenue > 0 ? r2(((revenue - cost) / revenue) * 100) : 0,
          costFallback: u.fallback,
        };
      }),
    };
    return this.canSeeCost(user) ? result : stripCost(result);
  }
}

function emptyFigures(): Figures {
  return figures(blank());
}
