/**
 * Online orders of a period with their money: the bill (net, cost, delivery
 * charge from business-math, so it matches the P&L), the selling costs
 * (courier, COD fee, gateway, packaging, RTO from the online order costs) and
 * the profit after them. Used by the ads report and the morning summary.
 *
 * Orders count by the day they were received; test orders and orders that
 * never got a bill are left out. A returned parcel has a voided bill: no sale
 * and no product cost, only its selling costs.
 */

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KEPT_QTY, LINE_COST, LINE_COST_JOINS, LINE_REVENUE, billMathCte } from '../../common/helpers/business-math.helper';
import { businessDayKey } from '../../common/helpers/business-time.helper';
import { normalizeCostSettings, orderCosts, orderProfit } from '../../integrations/online-orders/order-costs';
import { costOrderOf } from '../../integrations/online-orders/order-costs.service';
import { orderCostsKey } from './price-calculator/courier-adapter';

export interface OnlineOrderMoney {
  id: string;
  integrationId: string;
  channel: string;
  channelType: string;
  day: string;
  saleId: string;
  returned: boolean;
  /** What the customer paid on the live bill (0 for a returned parcel). */
  sale: number;
  cost: number;
  sellingCosts: number;
  /** sale − cost − selling costs. */
  profit: number;
}

export interface ProductLine { saleId: string; productId: string; name: string; revenue: number; cost: number; qty: number }

const r2 = (v: number) => Math.round(v * 100) / 100;

const SELECT = {
  id: true, orderStatus: true, courierCode: true, customerCity: true, integrationId: true, dispatchedAt: true, total: true, metadata: true,
  paymentStatus: true, courierCharge: true, codFee: true, gatewayFee: true, packagingCost: true, rtoCost: true,
  nafaaSaleId: true, receivedAt: true, integration: { select: { displayName: true, type: true } },
} as const;

export async function onlineOrdersMoney(
  prisma: PrismaService,
  q: { tenantId: string; shopId: string | null; range: { gte: Date; lt: Date }; tz: string; dayStartHour: number },
): Promise<OnlineOrderMoney[]> {
  const [settingRow, orders] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: orderCostsKey(q.tenantId) }, select: { value: true } }),
    prisma.channelOrder.findMany({
      where: {
        tenantId: q.tenantId, receivedAt: q.range, nafaaSaleId: { not: null },
        ...(q.shopId && { OR: [{ shopId: q.shopId }, { shopId: null }] }),
      },
      select: SELECT,
      take: 30_000,
    }),
  ]);
  let raw: unknown = null;
  try { raw = settingRow?.value ? JSON.parse(settingRow.value) : null; } catch { raw = null; }
  const settings = normalizeCostSettings(raw, true);
  const live = orders.filter((o) => !(o.metadata as any)?.test);
  const bills = await billParts(prisma, live.map((o) => o.nafaaSaleId!));
  return live.map((o) => {
    const costs = orderCosts(costOrderOf(o), settings);
    const bill = bills.get(o.nafaaSaleId!) ?? null;
    const p = orderProfit(bill, costs);
    return {
      id: o.id, integrationId: o.integrationId, channel: o.integration.displayName, channelType: o.integration.type,
      day: businessDayKey(o.receivedAt, q.tz, q.dayStartHour), saleId: o.nafaaSaleId!, returned: o.orderStatus === 'RETURNED',
      sale: r2(p.sale + p.deliveryCollected), cost: p.cost, sellingCosts: p.sellingCosts, profit: p.profit,
    };
  });
}

/** Bill net, cost and delivery charge of live bills, by sale id. */
async function billParts(prisma: PrismaService, saleIds: string[]) {
  const out = new Map<string, { net: number; cost: number; delivery: number }>();
  const ids = [...new Set(saleIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 2000) {
    const where = Prisma.sql`s.id IN (${Prisma.join(ids.slice(i, i + 2000))}) AND s.status::text <> 'VOIDED'`;
    const rows = await prisma.$queryRaw<Array<{ id: string; net: number; cost: number; delivery: number }>>`
      WITH ${billMathCte(where)}
      SELECT s.id, (s.total - s."refundedAmount")::float8 AS net, bm.cost::float8 AS cost, s."serviceCharges"::float8 AS delivery
      FROM "Sale" s JOIN bm ON bm.id = s.id
      WHERE ${where}`;
    for (const r of rows) out.set(r.id, { net: Number(r.net) || 0, cost: Number(r.cost) || 0, delivery: Number(r.delivery) || 0 });
  }
  return out;
}

/** Each live bill's lines by product: revenue after discounts and refunds, cost and quantity kept. */
export async function billProductLines(prisma: PrismaService, saleIds: string[]): Promise<ProductLine[]> {
  const out: ProductLine[] = [];
  const ids = [...new Set(saleIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += 2000) {
    const where = Prisma.sql`s.id IN (${Prisma.join(ids.slice(i, i + 2000))}) AND s.status::text <> 'VOIDED'`;
    const rows = await prisma.$queryRaw<Array<{ sale: string; product: string; name: string; revenue: number; cost: number; qty: number }>>`
      WITH ${billMathCte(where)}
      SELECT si."saleId" AS sale, COALESCE(si."productId", si.id) AS product, COALESCE(MAX(bm_p.name), 'Item') AS name,
        COALESCE(SUM(${LINE_REVENUE}), 0)::float8 AS revenue, COALESCE(SUM(${LINE_COST}), 0)::float8 AS cost, COALESCE(SUM(${KEPT_QTY}), 0)::float8 AS qty
      FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN bm ON bm.id = s.id
      ${LINE_COST_JOINS}
      WHERE ${where}
      GROUP BY 1, 2`;
    for (const r of rows) out.push({ saleId: r.sale, productId: r.product, name: r.name, revenue: Number(r.revenue) || 0, cost: Number(r.cost) || 0, qty: Number(r.qty) || 0 });
  }
  return out;
}
