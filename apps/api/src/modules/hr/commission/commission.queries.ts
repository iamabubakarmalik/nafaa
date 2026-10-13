/**
 * SQL for the commission engine. Every figure is grouped by business month
 * (the shop's time zone and day start hour), seller and product category,
 * so one pass serves a single month, a year of analytics or a statement.
 *
 * The seller of a bill is `soldById` when the counter picked one, else the
 * person who rang it up. Voided bills are left out everywhere.
 *
 * Sale value is what the customer paid for the goods: the line total after
 * its line discount and its share of the bill discount; service charges
 * are not goods and earn nothing. Returns are counted in the month the goods
 * came back, at the refund value, so a month that is already paid out never
 * changes because of a later return.
 */

import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';

export interface Window {
  tenantId: string;
  gte: Date;
  lt: Date;
  tz: string;
  h: number;
}

/** One month, one seller, one category. `uid` is null on bills with no person on them. */
export interface CatRow {
  m: string;
  uid: string | null;
  cat: string | null;
  sale: number;
  cost: number;
  qty: number;
  noCost: number;
}

export interface BillRow {
  m: string;
  uid: string | null;
  bills: number;
  reassigned: number;
}

export interface CountRow {
  m: string;
  uid: string | null;
  n: number;
}

export interface ShopRow {
  uid: string | null;
  shopId: string | null;
  sale: number;
  bills: number;
}

/** "YYYY-MM" of the business day a timestamp falls on. */
const monthOf = (w: Window, column: Prisma.Sql) =>
  Prisma.sql`to_char(((${column} AT TIME ZONE 'UTC') AT TIME ZONE ${w.tz}) - make_interval(hours => ${w.h}::int), 'YYYY-MM')`;

const SELLER = Prisma.sql`COALESCE(s."soldById", s."createdById")`;

/** Line cost: the cost saved on the line, today's product cost when the line has none. */
const UNIT_COST = Prisma.sql`CASE WHEN si."costPrice" > 0 THEN si."costPrice" ELSE COALESCE(p."costPrice", 0) END`;

export function salesByCategory(db: PrismaService, w: Window) {
  return db.$queryRaw<CatRow[]>(Prisma.sql`
    WITH s AS (
      SELECT s.id, s.subtotal, s.discount, ${SELLER} AS uid, ${monthOf(w, Prisma.sql`s."soldAt"`)} AS m
      FROM "Sale" s
      WHERE s."tenantId" = ${w.tenantId} AND s.status::text <> 'VOIDED'
        AND s."soldAt" >= ${w.gte} AND s."soldAt" < ${w.lt}
    ),
    l AS (
      SELECT s.m, s.uid, si."productId", si.quantity, si.total, si."costPrice",
             CASE WHEN SUM(si.total) OVER (PARTITION BY si."saleId") > 0
                  THEN LEAST(1, GREATEST(0, (s.subtotal - s.discount) / SUM(si.total) OVER (PARTITION BY si."saleId")))
                  ELSE 1 END AS k
      FROM "SaleItem" si JOIN s ON s.id = si."saleId"
    )
    SELECT si.m, si.uid, p."categoryId" AS cat,
           COALESCE(SUM(si.total * si.k), 0)::float8 AS sale,
           COALESCE(SUM(si.quantity * ${UNIT_COST}), 0)::float8 AS cost,
           COALESCE(SUM(si.quantity), 0)::float8 AS qty,
           COUNT(*) FILTER (WHERE si."costPrice" <= 0)::int AS "noCost"
    FROM l si LEFT JOIN "Product" p ON p.id = si."productId"
    GROUP BY 1, 2, 3`);
}

export function returnsByCategory(db: PrismaService, w: Window) {
  return db.$queryRaw<CatRow[]>(Prisma.sql`
    SELECT ${monthOf(w, Prisma.sql`r."returnedAt"`)} AS m, ${SELLER} AS uid, p."categoryId" AS cat,
           COALESCE(SUM(ri.total), 0)::float8 AS sale,
           COALESCE(SUM(ri.quantity * ${UNIT_COST}), 0)::float8 AS cost,
           COALESCE(SUM(ri.quantity), 0)::float8 AS qty,
           0::int AS "noCost"
    FROM "SaleReturnItem" ri
    JOIN "SaleReturn" r ON r.id = ri."returnId"
    JOIN "Sale" s ON s.id = r."saleId"
    JOIN "SaleItem" si ON si.id = ri."saleItemId"
    LEFT JOIN "Product" p ON p.id = ri."productId"
    WHERE r."tenantId" = ${w.tenantId} AND s."tenantId" = ${w.tenantId} AND s.status::text <> 'VOIDED'
      AND r."returnedAt" >= ${w.gte} AND r."returnedAt" < ${w.lt}
    GROUP BY 1, 2, 3`);
}

export function billsBySeller(db: PrismaService, w: Window) {
  return db.$queryRaw<BillRow[]>(Prisma.sql`
    SELECT ${monthOf(w, Prisma.sql`s."soldAt"`)} AS m, ${SELLER} AS uid,
           COUNT(*)::int AS bills,
           COUNT(*) FILTER (WHERE s."soldById" IS NOT NULL AND s."soldById" <> s."createdById")::int AS reassigned
    FROM "Sale" s
    WHERE s."tenantId" = ${w.tenantId} AND s.status::text <> 'VOIDED'
      AND s."soldAt" >= ${w.gte} AND s."soldAt" < ${w.lt}
    GROUP BY 1, 2`);
}

/** Bills that became fully returned, counted in the month of their last return. */
export function fullReturnsBySeller(db: PrismaService, w: Window) {
  return db.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT ${monthOf(w, Prisma.sql`x.last`)} AS m, x.uid, COUNT(*)::int AS n
    FROM (
      SELECT s.id, ${SELLER} AS uid, MAX(r."returnedAt") AS last
      FROM "Sale" s JOIN "SaleReturn" r ON r."saleId" = s.id
      WHERE s."tenantId" = ${w.tenantId} AND s.status::text = 'FULLY_RETURNED'
      GROUP BY s.id, 2
      HAVING MAX(r."returnedAt") >= ${w.gte} AND MAX(r."returnedAt") < ${w.lt}
    ) x
    GROUP BY 1, 2`);
}

/** Goods value sold per seller and branch in the window, for branch filters and the split on each row. */
export function salesBySellerShop(db: PrismaService, w: Window) {
  return db.$queryRaw<ShopRow[]>(Prisma.sql`
    SELECT ${SELLER} AS uid, s."shopId",
           COALESCE(SUM(GREATEST(s.subtotal - s.discount, 0)), 0)::float8 AS sale,
           COUNT(*)::int AS bills
    FROM "Sale" s
    WHERE s."tenantId" = ${w.tenantId} AND s.status::text <> 'VOIDED'
      AND s."soldAt" >= ${w.gte} AND s."soldAt" < ${w.lt}
    GROUP BY 1, 2`);
}
