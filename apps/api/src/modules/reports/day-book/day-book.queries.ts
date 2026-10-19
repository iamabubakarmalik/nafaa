/**
 * Raw SQL for the day book: totals for a time window, hourly sales for the
 * day and its two comparison days, item lines net of the bill discount and
 * of returns, per-person figures and payment methods. Grouping happens in
 * the database so a busy day stays one round trip per figure.
 *
 * Cost, bill-discount share and cash follow business-math.helper. As a
 * day-close view, the day's bills count at full value and returns count on
 * the day they were made.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  LINE_COST_JOINS, LINE_NET, LINE_UNIT_COST, RETURN_LINE_COST, billMathCte,
} from '../../../common/helpers/business-math.helper';

export interface Window {
  from: Date;
  to: Date;
}

export interface Scope {
  tenantId: string;
  shopId: string | null;
}

export interface WindowTotals {
  bills: number;
  billed: number;
  cogs: number;
  discount: number;
  soldQty: number;
  returns: number;
  returnCount: number;
  returnCost: number;
  returnQty: number;
}

export interface ItemRow {
  pid: string | null;
  name: string | null;
  sku: string | null;
  unit: string | null;
  cat_id: string | null;
  cat_name: string | null;
  cat_color: string | null;
  qty: number;
  revenue: number;
  cost: number;
  bills: number;
  rqty: number;
  ramount: number;
  rcost: number;
}

export interface HourRow {
  hour: number;
  win: 'day' | 'yesterday' | 'lastWeek';
  bills: number;
  sales: number;
}

export interface PersonRow {
  uid: string | null;
  bills: number;
  voids: number;
  total: number;
  discount: number;
  cogs: number;
  credit: number;
}

export interface MethodRow {
  method: string;
  bills: number;
  billed: number;
  collected: number;
  credit: number;
  booking_bills: number;
}

export interface LowRow {
  pid: string;
  name: string;
  unit: string;
  stock: number;
  alert: number;
  shop: string;
}

@Injectable()
export class DayBookQueries {
  constructor(private readonly prisma: PrismaService) {}

  private saleShop(scope: Scope) {
    return scope.shopId ? Prisma.sql`AND s."shopId" = ${scope.shopId}` : Prisma.empty;
  }

  /** A return belongs to the branch it was made at; older rows fall back to the bill's branch. */
  private returnShop(scope: Scope) {
    return scope.shopId
      ? Prisma.sql`AND (r."shopId" = ${scope.shopId} OR (r."shopId" IS NULL AND s."shopId" = ${scope.shopId}))`
      : Prisma.empty;
  }

  /** Live bills of the window (alias `s`). */
  private liveSales(scope: Scope, w: Window) {
    return Prisma.sql`s."tenantId" = ${scope.tenantId} AND s.status <> 'VOIDED'
      AND s."soldAt" >= ${w.from} AND s."soldAt" < ${w.to} ${this.saleShop(scope)}`;
  }

  /** Bills, sales value, cost and returns for one window. */
  async totals(scope: Scope, w: Window): Promise<WindowTotals> {
    const where = this.liveSales(scope, w);
    const rows = await this.prisma.$queryRaw<WindowTotals[]>`
      WITH ${billMathCte(where)}, b AS (
        SELECT COUNT(*)::int AS bills,
               COALESCE(SUM(s.total), 0)::float8 AS billed,
               COALESCE(SUM(bm."soldCost"), 0)::float8 AS cogs,
               COALESCE(SUM(s.discount), 0)::float8 AS discount
        FROM "Sale" s JOIN bm ON bm.id = s.id
        WHERE ${where}
      ), q AS (
        SELECT COALESCE(SUM(si.quantity), 0)::float8 AS "soldQty"
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."tenantId" = ${scope.tenantId} AND s.status <> 'VOIDED'
          AND s."soldAt" >= ${w.from} AND s."soldAt" < ${w.to} ${this.saleShop(scope)}
      ), r AS (
        SELECT COALESCE(SUM(r."refundAmount"), 0)::float8 AS returns, COUNT(*)::int AS "returnCount"
        FROM "SaleReturn" r JOIN "Sale" s ON s.id = r."saleId"
        WHERE r."tenantId" = ${scope.tenantId} AND r."returnedAt" >= ${w.from} AND r."returnedAt" < ${w.to} ${this.returnShop(scope)}
      ), rc AS (
        SELECT COALESCE(SUM(${RETURN_LINE_COST}), 0)::float8 AS "returnCost",
               COALESCE(SUM(ri.quantity), 0)::float8 AS "returnQty"
        FROM "SaleReturnItem" ri
        JOIN "SaleReturn" r ON r.id = ri."returnId"
        JOIN "SaleItem" si ON si.id = ri."saleItemId"
        JOIN "Sale" s ON s.id = r."saleId"
        ${LINE_COST_JOINS}
        WHERE r."tenantId" = ${scope.tenantId} AND r."returnedAt" >= ${w.from} AND r."returnedAt" < ${w.to} ${this.returnShop(scope)}
      )
      SELECT * FROM b, q, r, rc`;
    return rows[0];
  }

  /** Sales per local hour for the day, the day before and the same weekday last week. */
  hourly(scope: Scope, tz: string, day: Window, yesterday: Window, lastWeek: Window) {
    return this.prisma.$queryRaw<HourRow[]>`
      SELECT EXTRACT(HOUR FROM ((s."soldAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}))::int AS hour,
             CASE WHEN s."soldAt" >= ${day.from} THEN 'day'
                  WHEN s."soldAt" >= ${yesterday.from} THEN 'yesterday'
                  ELSE 'lastWeek' END AS win,
             COUNT(*)::int AS bills,
             COALESCE(SUM(s.total), 0)::float8 AS sales
      FROM "Sale" s
      WHERE s."tenantId" = ${scope.tenantId} AND s.status <> 'VOIDED' ${this.saleShop(scope)}
        AND ((s."soldAt" >= ${day.from} AND s."soldAt" < ${day.to})
          OR (s."soldAt" >= ${yesterday.from} AND s."soldAt" < ${yesterday.to})
          OR (s."soldAt" >= ${lastWeek.from} AND s."soldAt" < ${lastWeek.to}))
      GROUP BY 1, 2`;
  }

  /** Every product sold or returned in the window, net of the bill discount. */
  items(scope: Scope, w: Window) {
    const where = this.liveSales(scope, w);
    return this.prisma.$queryRaw<ItemRow[]>`
      WITH ${billMathCte(where)}, sold AS (
        SELECT si."productId" AS pid,
               SUM(si.quantity)::float8 AS qty,
               SUM(${LINE_NET})::float8 AS revenue,
               SUM(si.quantity * ${LINE_UNIT_COST})::float8 AS cost,
               COUNT(DISTINCT s.id)::int AS bills
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
        ${LINE_COST_JOINS}
        WHERE ${where}
        GROUP BY si."productId"
      ), back AS (
        SELECT ri."productId" AS pid,
               SUM(ri.quantity)::float8 AS qty,
               SUM(ri.total)::float8 AS amount,
               SUM(${RETURN_LINE_COST})::float8 AS cost
        FROM "SaleReturnItem" ri
        JOIN "SaleReturn" r ON r.id = ri."returnId"
        JOIN "SaleItem" si ON si.id = ri."saleItemId"
        JOIN "Sale" s ON s.id = r."saleId"
        ${LINE_COST_JOINS}
        WHERE r."tenantId" = ${scope.tenantId} AND r."returnedAt" >= ${w.from} AND r."returnedAt" < ${w.to} ${this.returnShop(scope)}
        GROUP BY ri."productId"
      )
      SELECT COALESCE(a.pid, b.pid) AS pid, p.name, p.sku, p.unit,
             c.id AS cat_id, c.name AS cat_name, c.color AS cat_color,
             COALESCE(a.qty, 0)::float8 AS qty, COALESCE(a.revenue, 0)::float8 AS revenue,
             COALESCE(a.cost, 0)::float8 AS cost, COALESCE(a.bills, 0)::int AS bills,
             COALESCE(b.qty, 0)::float8 AS rqty, COALESCE(b.amount, 0)::float8 AS ramount,
             COALESCE(b.cost, 0)::float8 AS rcost
      FROM sold a
      FULL OUTER JOIN back b ON a.pid = b.pid
      LEFT JOIN "Product" p ON p.id = COALESCE(a.pid, b.pid)
      LEFT JOIN "Category" c ON c.id = p."categoryId"`;
  }

  /** Bills per seller (soldBy, else the person at the counter), voids included. */
  people(scope: Scope, w: Window) {
    return this.prisma.$queryRaw<PersonRow[]>`
      WITH ${billMathCte(this.liveSales(scope, w))}
      SELECT COALESCE(s."soldById", s."createdById") AS uid,
             COUNT(*) FILTER (WHERE s.status <> 'VOIDED')::int AS bills,
             COUNT(*) FILTER (WHERE s.status = 'VOIDED')::int AS voids,
             COALESCE(SUM(s.total) FILTER (WHERE s.status <> 'VOIDED'), 0)::float8 AS total,
             COALESCE(SUM(s.discount) FILTER (WHERE s.status <> 'VOIDED'), 0)::float8 AS discount,
             COALESCE(SUM(bm."soldCost"), 0)::float8 AS cogs,
             COALESCE(SUM(s."creditAmount") FILTER (WHERE s.status <> 'VOIDED'), 0)::float8 AS credit
      FROM "Sale" s LEFT JOIN bm ON bm.id = s.id
      WHERE s."tenantId" = ${scope.tenantId} AND s."soldAt" >= ${w.from} AND s."soldAt" < ${w.to} ${this.saleShop(scope)}
      GROUP BY 1`;
  }

  /**
   * Bills per payment method. Bills, billed and credit go by the bill's main
   * method; money collected goes by each payment row, so the card part of a
   * cash + card bill shows under Card. Cash rows are already net of change.
   * Trade-in is goods, not money, and is left out of collected. A bill made
   * from a booking carries the booking's earlier payments, which were
   * counted on the day they came in, so it adds nothing here.
   */
  methods(scope: Scope, w: Window) {
    return this.prisma.$queryRaw<MethodRow[]>`
      WITH b AS (
        SELECT s."paymentMethod"::text AS method,
               COUNT(*)::int AS bills,
               SUM(s.total)::float8 AS billed,
               SUM(s."creditAmount")::float8 AS credit,
               COUNT(*) FILTER (WHERE s."bookingId" IS NOT NULL)::int AS booking_bills
        FROM "Sale" s
        WHERE s."tenantId" = ${scope.tenantId} AND s.status <> 'VOIDED'
          AND s."soldAt" >= ${w.from} AND s."soldAt" < ${w.to} ${this.saleShop(scope)}
        GROUP BY 1
      ), p AS (
        SELECT sp.method::text AS method, SUM(sp.amount)::float8 AS collected
        FROM "SalePayment" sp JOIN "Sale" s ON s.id = sp."saleId"
        WHERE s."tenantId" = ${scope.tenantId} AND s.status <> 'VOIDED' AND s."bookingId" IS NULL
          AND sp.method <> 'TRADE_IN'
          AND s."soldAt" >= ${w.from} AND s."soldAt" < ${w.to} ${this.saleShop(scope)}
        GROUP BY 1
      )
      SELECT COALESCE(b.method, p.method) AS method,
             COALESCE(b.bills, 0)::int AS bills,
             COALESCE(b.billed, 0)::float8 AS billed,
             COALESCE(p.collected, 0)::float8 AS collected,
             COALESCE(b.credit, 0)::float8 AS credit,
             COALESCE(b.booking_bills, 0)::int AS booking_bills
      FROM b FULL JOIN p ON p.method = b.method`;
  }

  /**
   * Products from the list that are now at or under their alert level. A product
   * with sizes or colours keeps its stock on the variant rows, so it is checked
   * per variant; its base row (often 0) is skipped.
   */
  lowStock(scope: Scope, productIds: string[]) {
    if (!productIds.length) return Promise.resolve([] as LowRow[]);
    const shop = scope.shopId ? Prisma.sql`AND ss."shopId" = ${scope.shopId}` : Prisma.empty;
    return this.prisma.$queryRaw<LowRow[]>`
      SELECT ss."productId" AS pid,
             CASE WHEN v.id IS NULL THEN p.name ELSE p.name || ' (' || v.name || ')' END AS name,
             p.unit, ss.stock::float8 AS stock,
             ss."lowStockAlert"::float8 AS alert, sh.name AS shop
      FROM "ShopStock" ss
      JOIN "Product" p ON p.id = ss."productId"
      JOIN "Shop" sh ON sh.id = ss."shopId"
      LEFT JOIN "ProductVariant" v ON v.id = ss."variantId"
      WHERE ss."tenantId" = ${scope.tenantId} AND ss."productId" = ANY(${productIds}::text[])
        AND ss."isActive" = true AND p."isActive" = true
        AND (
          (ss."variantId" IS NULL AND NOT EXISTS (
            SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p.id AND pv."isActive" = true))
          OR (ss."variantId" IS NOT NULL AND v."isActive" = true)
        )
        AND ss.stock <= ss."lowStockAlert" ${shop}
      ORDER BY ss.stock ASC, p.name ASC
      LIMIT 60`;
  }
}
