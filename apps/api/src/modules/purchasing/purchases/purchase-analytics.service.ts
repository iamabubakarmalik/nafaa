/**
 * Purchase analytics for a period (business days): totals against the
 * previous period of the same length, the trend by day or month, spend by
 * supplier, category and item, how it was paid, which units things were
 * bought in, items whose cost went up, returns, open orders and the
 * weekday pattern. Values are what was received, with discount, freight
 * and tax spread over the lines.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { safeDayStart, tzParts, zonedToUtc } from '../../../common/helpers/business-time.helper';

const DAY = 86_400_000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;
const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PurchaseAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async analytics(user: AuthenticatedUser, scope: ShopScope, from?: string, to?: string) {
    const tenantId = user.tenantId;
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const h = safeDayStart(dayStartHour);
    const at = (key: string) => { const [y, m, d] = key.split('-').map(Number); return zonedToUtc(y, m, d, h, 0, 0, tz); };
    const keyOf = (d: Date) => { const p = tzParts(new Date(d.getTime() - h * 3_600_000), tz); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; };

    const now = new Date();
    const toKey = to && KEY.test(to) ? to : keyOf(now);
    const fromKey = from && KEY.test(from) ? from : keyOf(new Date(now.getTime() - 29 * DAY));
    const gte = at(fromKey);
    const lt = new Date(at(toKey).getTime() + DAY);
    const span = lt.getTime() - gte.getTime();
    const prev = { gte: new Date(gte.getTime() - span), lt: gte };
    const live = { tenantId, ...scope.where, status: { in: ['RECEIVED', 'PARTIAL'] as Array<'RECEIVED' | 'PARTIAL'> } };

    const [bills, prevAgg, open, returns] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { ...live, purchasedAt: { gte, lt } },
        select: {
          id: true, purchasedAt: true, subtotal: true, total: true, receivedValue: true, paidAmount: true, returnedAmount: true, paymentMethod: true,
          supplier: { select: { id: true, name: true } },
          items: {
            select: {
              itemName: true, productId: true, ingredientId: true, unitName: true, conversionRate: true, quantity: true, costPrice: true, total: true,
              baseQuantity: true, receivedQty: true, product: { select: { unit: true, category: { select: { name: true, color: true } } } }, ingredient: { select: { unit: true, category: true } },
            },
          },
        },
        orderBy: { purchasedAt: 'asc' },
      }),
      this.prisma.purchase.aggregate({ where: { ...live, purchasedAt: prev }, _sum: { receivedValue: true, paidAmount: true }, _count: { _all: true } }),
      this.prisma.purchase.findMany({
        where: { tenantId, ...scope.where, status: { in: ['PENDING', 'PARTIAL'] } },
        select: { id: true, purchaseNumber: true, total: true, receivedValue: true, expectedAt: true, purchasedAt: true, supplier: { select: { name: true } } },
        orderBy: { purchasedAt: 'asc' },
      }),
      this.prisma.purchaseReturn.findMany({ where: { tenantId, ...(scope.shopId && { shopId: scope.shopId }), createdAt: { gte, lt } }, select: { total: true, reason: true } }),
    ]);

    // Totals
    const value = r2(bills.reduce((s, b) => s + b.receivedValue, 0));
    const paid = r2(bills.reduce((s, b) => s + b.paidAmount, 0));
    const prevValue = Number(prevAgg._sum.receivedValue ?? 0);

    // Trend: by day up to two months, else by month
    const byMonth = span > 62 * DAY;
    const buckets = new Map<string, { key: string; value: number; paid: number; bills: number }>();
    if (!byMonth) for (let t = gte.getTime(); t < lt.getTime(); t += DAY) { const k = keyOf(new Date(t + h * 3_600_000)); buckets.set(k, { key: k, value: 0, paid: 0, bills: 0 }); }
    const weekday = Array.from({ length: 7 }, (_, i) => ({ day: i, value: 0, bills: 0 }));

    const suppliers = new Map<string, { id: string; name: string; value: number; paid: number; bills: number }>();
    const categories = new Map<string, { name: string; color: string | null; value: number }>();
    const items = new Map<string, { name: string; unit: string; value: number; qty: number; bills: number; first: number; last: number; raw: boolean }>();
    const methods = new Map<string, { method: string; value: number; bills: number }>();
    const units = new Map<string, { unit: string; lines: number; value: number }>();

    for (const b of bills) {
      const k = keyOf(b.purchasedAt);
      const bk = byMonth ? k.slice(0, 7) : k;
      const row = buckets.get(bk) ?? { key: bk, value: 0, paid: 0, bills: 0 };
      row.value += b.receivedValue; row.paid += b.paidAmount; row.bills++;
      buckets.set(bk, row);
      const wd = new Date(`${k}T12:00:00Z`).getUTCDay();
      weekday[wd].value += b.receivedValue; weekday[wd].bills++;

      const s = suppliers.get(b.supplier.id) ?? { id: b.supplier.id, name: b.supplier.name, value: 0, paid: 0, bills: 0 };
      s.value += b.receivedValue; s.paid += b.paidAmount; s.bills++;
      suppliers.set(b.supplier.id, s);

      const m = methods.get(b.paymentMethod) ?? { method: b.paymentMethod, value: 0, bills: 0 };
      m.value += b.paidAmount; m.bills++;
      methods.set(b.paymentMethod, m);

      // Lines carry their share of discount, freight and tax.
      const factor = b.subtotal > 0 ? b.total / b.subtotal : 1;
      for (const it of b.items) {
        const share = it.baseQuantity > 0 ? it.receivedQty / it.baseQuantity : 1;
        const v = it.total * factor * share;
        if (v <= 0) continue;
        const cat = it.product?.category?.name ?? it.ingredient?.category ?? 'Bina category';
        const c = categories.get(cat) ?? { name: cat, color: it.product?.category?.color ?? null, value: 0 };
        c.value += v; categories.set(cat, c);

        const baseCost = (it.costPrice / (it.conversionRate || 1)) * factor;
        const ik = it.productId ?? (it.ingredientId ? `i:${it.ingredientId}` : it.itemName);
        const i = items.get(ik) ?? { name: it.itemName, unit: it.product?.unit ?? it.ingredient?.unit ?? 'pcs', value: 0, qty: 0, bills: 0, first: baseCost, last: baseCost, raw: !!it.ingredientId };
        i.value += v; i.qty += it.receivedQty; i.bills++; i.last = baseCost;
        items.set(ik, i);

        const u = units.get(it.unitName) ?? { unit: it.unitName, lines: 0, value: 0 };
        u.lines++; u.value += v; units.set(it.unitName, u);
      }
    }

    const label = (k: string) => (byMonth
      ? new Date(`${k}-15T12:00:00Z`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })
      : new Date(`${k}T12:00:00Z`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }));
    const itemList = [...items.values()];
    const today = Date.now();

    return {
      range: { from: fromKey, to: toKey, byMonth },
      totals: {
        value, paid, credit: r2(Math.max(value - paid, 0)),
        returned: r2(returns.reduce((s, x) => s + x.total, 0)),
        bills: bills.length,
        avgBill: bills.length ? r2(value / bills.length) : 0,
        suppliers: suppliers.size,
        items: items.size,
        prevValue: r2(prevValue), prevBills: prevAgg._count._all,
        growth: prevValue > 0 ? r2(((value - prevValue) / prevValue) * 100) : value > 0 ? 100 : 0,
      },
      trend: [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)).map((b) => ({ ...b, label: label(b.key), value: r2(b.value), paid: r2(b.paid) })),
      weekday: weekday.map((w) => ({ ...w, value: r2(w.value) })),
      suppliers: [...suppliers.values()].sort((a, b) => b.value - a.value).slice(0, 10).map((s) => ({ ...s, value: r2(s.value), paid: r2(s.paid), share: value ? r2((s.value / value) * 100) : 0 })),
      categories: [...categories.values()].sort((a, b) => b.value - a.value).slice(0, 10).map((c) => ({ ...c, value: r2(c.value) })),
      items: itemList.sort((a, b) => b.value - a.value).slice(0, 15).map((i) => ({ ...i, value: r2(i.value), qty: r2(i.qty), avgCost: i.qty ? r2(i.value / i.qty) : 0 })),
      costRises: itemList.filter((i) => i.bills > 1 && i.first > 0 && i.last > i.first * 1.02)
        .map((i) => ({ name: i.name, unit: i.unit, first: r2(i.first), last: r2(i.last), change: r2(((i.last - i.first) / i.first) * 100) }))
        .sort((a, b) => b.change - a.change).slice(0, 8),
      payments: [...methods.values()].map((m) => ({ ...m, value: r2(m.value) })).sort((a, b) => b.value - a.value),
      units: [...units.values()].map((u) => ({ ...u, value: r2(u.value) })).sort((a, b) => b.value - a.value),
      returns: { count: returns.length, total: r2(returns.reduce((s, x) => s + x.total, 0)) },
      openOrders: {
        count: open.length,
        value: r2(open.reduce((s, o) => s + (o.total - o.receivedValue), 0)),
        late: open.filter((o) => o.expectedAt && o.expectedAt.getTime() < today).length,
        list: open.slice(0, 6).map((o) => ({ id: o.id, number: o.purchaseNumber, supplier: o.supplier.name, value: r2(o.total - o.receivedValue), expectedAt: o.expectedAt, late: !!o.expectedAt && o.expectedAt.getTime() < today })),
      },
    };
  }
}
