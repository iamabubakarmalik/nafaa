/**
 * The e-commerce part of the morning summary: yesterday's online orders and
 * sales, parcels returned (RTO), COD still with couriers, ads spend and ROAS,
 * and profit after ads. Only for shops with an online channel; each figure
 * only for people allowed to see it.
 *
 *   orders, sales     orders received yesterday (test orders left out); sales
 *                     are their live bills (business-math), returned parcels 0
 *   RTO               parcels marked returned yesterday
 *   COD with couriers delivered COD orders not paid out yet, as on the COD page
 *   ads, ROAS         yesterday's ads spend; online sales ÷ spend
 *   profit after ads  orders' profit after selling costs − ads spend
 */

import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { shopDue } from '../../integrations/online-orders/shop-due';
import { onlineOrdersMoney } from './online-economics';
import { roas } from './ads/ads-math';

const CHANNEL_TYPES = ['WOOCOMMERCE', 'SHOPIFY', 'DARAZ', 'CUSTOM_WEBSITE', 'FOODPANDA'] as const;
const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
const r2 = (v: number) => Math.round(v * 100) / 100;
const money = (v: number) => `Rs ${Math.round(v).toLocaleString('en-PK')}`;

/** Live (not test) orders of the branch matching `cond`; metadata without a `test` key counts as live. */
async function countOrders(prisma: PrismaService, tenantId: string, shopId: string | null, cond: Prisma.Sql) {
  const rows = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(*)::int AS n FROM channel_orders
    WHERE "tenantId" = ${tenantId} AND ${cond}
      ${shopId ? Prisma.sql`AND ("shopId" = ${shopId} OR "shopId" IS NULL)` : Prisma.empty}
      AND NOT COALESCE(metadata -> 'test' = 'true'::jsonb, false)`;
  return Number(rows[0]?.n ?? 0);
}

export interface EcommerceBlock {
  orders: number;
  sales: number;
  rto: number;
  codWithCouriers: number | null;
  codOrders: number | null;
  adsSpend: number | null;
  roas: number | null;
  profitAfterAds: number | null;
  /** Short WhatsApp-ready text of this block. */
  text: string;
}

export async function ecommerceBlock(
  prisma: PrismaService,
  q: {
    tenantId: string; shopId: string | null; day: string; dayText?: string; window: { gte: Date; lt: Date }; tz: string; dayStartHour: number;
    can: { orders: boolean; ads: boolean; profit: boolean }; shopName: string;
  },
): Promise<EcommerceBlock | null> {
  if (!q.can.orders && !q.can.ads) return null;
  const channels = await prisma.integration.count({ where: { tenantId: q.tenantId, type: { in: [...CHANNEL_TYPES] }, status: { not: 'PENDING' } } });
  if (!channels) return null;
  const branch = q.shopId ? { OR: [{ shopId: q.shopId }, { shopId: null }] } : {};

  const [orders, billed, rto, cod, ads] = await Promise.all([
    countOrders(prisma, q.tenantId, q.shopId, Prisma.sql`"receivedAt" >= ${q.window.gte} AND "receivedAt" < ${q.window.lt}`),
    onlineOrdersMoney(prisma, { tenantId: q.tenantId, shopId: q.shopId, range: q.window, tz: q.tz, dayStartHour: q.dayStartHour }),
    countOrders(prisma, q.tenantId, q.shopId, Prisma.sql`"returnedAt" >= ${q.window.gte} AND "returnedAt" < ${q.window.lt} AND "orderStatus" = 'RETURNED'`),
    q.can.orders
      ? prisma.channelOrder.findMany({
        where: {
          tenantId: q.tenantId, ...branch, nafaaSaleId: { not: null }, orderStatus: 'DELIVERED', paymentStatus: { not: 'PAID' },
          metadata: { path: ['cod'], equals: true },
        },
        select: { total: true, metadata: true, orderStatus: true },
        take: 5000,
      })
      : Promise.resolve([]),
    q.can.ads ? prisma.adSpend.aggregate({ where: { tenantId: q.tenantId, day: q.day, ...(q.shopId && { shopId: q.shopId }) }, _sum: { amount: true } }) : Promise.resolve(null),
  ]);
  const sales = r2(billed.reduce((s, o) => s + o.sale, 0));
  const profit = r2(billed.reduce((s, o) => s + o.profit, 0));
  const spend = ads ? r2(Number(ads._sum.amount ?? 0)) : null;
  const codRows = cod.filter((o) => !CLOSED.includes(o.orderStatus));
  const codValue = q.can.orders ? r2(codRows.reduce((s, o) => s + shopDue(o), 0)) : null;
  if (!orders && !spend && !(codValue && codValue > 0)) return null;

  const block: EcommerceBlock = {
    orders: q.can.orders ? orders : 0,
    sales: q.can.orders ? sales : 0,
    rto: q.can.orders ? rto : 0,
    codWithCouriers: codValue,
    codOrders: q.can.orders ? codRows.length : null,
    adsSpend: spend,
    roas: spend !== null && q.can.orders ? roas(sales, spend) : null,
    profitAfterAds: q.can.profit && q.can.orders ? r2(profit - (spend ?? 0)) : null,
    text: '',
  };
  const lines = [`🛒 Online — kal (${q.dayText ?? q.day}) · ${q.shopName}`];
  if (q.can.orders) {
    lines.push(`• Orders: ${orders} · Sale ${money(sales)}`);
    lines.push(`• RTO (wapas aaye): ${rto}`);
    if (codValue !== null) lines.push(`• COD courier ke paas: ${money(codValue)} (${codRows.length} orders)`);
  }
  if (spend !== null) lines.push(`• Ads: ${money(spend)}${block.roas !== null ? ` · ROAS ${block.roas}x` : ''}`);
  if (block.profitAfterAds !== null) lines.push(`• Ads ke baad Profit: ${money(block.profitAfterAds)}`);
  block.text = lines.join('\n');
  return block;
}
