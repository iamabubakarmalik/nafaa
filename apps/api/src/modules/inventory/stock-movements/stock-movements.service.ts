/**
 * Stock movements: the ledger of every unit that came in or went out —
 * sales, purchases, returns, adjustments and transfers — with filters,
 * running balance per branch, cost value, and analytics on what moves.
 */

import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { tzParts } from '../../../common/helpers/business-time.helper';
import { periodRange } from '../taxonomy/taxonomy.helper';
import { ListMovementsDto, MOVEMENT_TYPES } from './dto/list-movements.dto';

const r2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class StockMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ListMovementsDto): Promise<Prisma.StockMovementWhereInput> {
    // A single product's history shows all time unless a period is asked for.
    const range = q.productId && !q.from ? undefined : await periodRange(this.tz, user.tenantId, q.from, q.to);
    const types = (q.type ?? '').split(',').map((t) => t.trim()).filter((t): t is StockMovementType => (MOVEMENT_TYPES as readonly string[]).includes(t));
    const s = q.search?.trim();
    return {
      tenantId: user.tenantId,
      // Untagged history from before branches existed stays visible.
      ...scope.whereLoose,
      ...(range && { createdAt: range }),
      ...(types.length && { type: { in: types } }),
      ...(q.direction === 'in' && { quantity: { gt: 0 } }),
      ...(q.direction === 'out' && { quantity: { lt: 0 } }),
      ...(q.productId && { productId: q.productId }),
      ...(q.userId && { createdById: q.userId }),
      ...(s && {
        AND: [{
          OR: [
            { product: { name: { contains: s, mode: 'insensitive' as const } } },
            { product: { sku: { contains: s, mode: 'insensitive' as const } } },
            { product: { barcode: { contains: s } } },
            { reference: { contains: s, mode: 'insensitive' as const } },
            { note: { contains: s, mode: 'insensitive' as const } },
          ],
        }],
      }),
    };
  }

  async list(user: AuthenticatedUser, scope: ShopScope, q: ListMovementsDto = {}) {
    const where = await this.where(user, scope, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const [rows, total, sums] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, costPrice: true } },
          shop: { select: { id: true, name: true, isMain: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.groupBy({ by: ['type'], where, _sum: { quantity: true }, _count: { _all: true } }),
    ]);
    const items = await this.decorate(rows);
    const qIn = sums.reduce((s, g) => s + Math.max(0, Number(g._sum.quantity ?? 0)), 0);
    const qOut = sums.reduce((s, g) => s + Math.min(0, Number(g._sum.quantity ?? 0)), 0);
    return {
      items, total, page, pages: Math.max(1, Math.ceil(total / limit)),
      totals: {
        count: total, qtyIn: r2(qIn), qtyOut: r2(-qOut),
        byType: sums.map((g) => ({ type: g.type, count: g._count._all, qty: r2(Number(g._sum.quantity ?? 0)) })),
      },
    };
  }

  /** Adds variant name, who did it and the rupee value of each row. */
  private async decorate<T extends { variantId: string | null; createdById: string | null; quantity: number; unitCost: number | null; product: { costPrice: number } }>(rows: T[]) {
    const vIds = [...new Set(rows.map((r) => r.variantId).filter(Boolean) as string[])];
    const uIds = [...new Set(rows.map((r) => r.createdById).filter(Boolean) as string[])];
    const [variants, users] = await Promise.all([
      vIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: vIds } }, select: { id: true, name: true } }) : [],
      uIds.length ? this.prisma.user.findMany({ where: { id: { in: uIds } }, select: { id: true, fullName: true } }) : [],
    ]);
    return rows.map((r) => {
      const cost = r.unitCost ?? Number(r.product.costPrice) ?? 0;
      return {
        ...r,
        variant: variants.find((v) => v.id === r.variantId) ?? null,
        createdBy: users.find((u) => u.id === r.createdById) ?? null,
        value: r2(r.quantity * cost),
      };
    });
  }

  /** Flow by type and day, top movers, who moved stock, and value in/out. */
  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListMovementsDto = {}) {
    const where = await this.where(user, scope, { ...q, productId: q.productId, page: undefined, limit: undefined });
    const { tz } = await this.tz.clock(user.tenantId);
    const rows = await this.prisma.stockMovement.findMany({
      where,
      select: { type: true, quantity: true, unitCost: true, createdAt: true, productId: true, createdById: true, product: { select: { name: true, unit: true, costPrice: true } } },
      take: 50_000,
    });
    const val = (r: typeof rows[number]) => r.quantity * (r.unitCost ?? Number(r.product.costPrice) ?? 0);
    const byType = new Map<string, { type: string; count: number; qty: number; value: number }>();
    const days = new Map<string, { key: string; in: number; out: number }>();
    const movers = new Map<string, { name: string; unit: string; in: number; out: number; value: number }>();
    const people = new Map<string, { id: string; count: number; value: number }>();
    for (const r of rows) {
      const v = val(r);
      const t = byType.get(r.type) ?? { type: r.type, count: 0, qty: 0, value: 0 };
      t.count++; t.qty += r.quantity; t.value += v; byType.set(r.type, t);
      const p = tzParts(r.createdAt, tz);
      const k = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      const d = days.get(k) ?? { key: k, in: 0, out: 0 };
      if (v >= 0) d.in += v; else d.out -= v;
      days.set(k, d);
      const m = movers.get(r.productId) ?? { name: r.product.name, unit: r.product.unit, in: 0, out: 0, value: 0 };
      if (r.quantity > 0) m.in += r.quantity; else m.out -= r.quantity;
      m.value += Math.abs(v); movers.set(r.productId, m);
      if (r.createdById) {
        const g = people.get(r.createdById) ?? { id: r.createdById, count: 0, value: 0 };
        g.count++; g.value += Math.abs(v); people.set(r.createdById, g);
      }
    }
    const users = people.size ? await this.prisma.user.findMany({ where: { id: { in: [...people.keys()] } }, select: { id: true, fullName: true } }) : [];
    const inV = rows.reduce((s, r) => s + Math.max(0, val(r)), 0);
    const outV = rows.reduce((s, r) => s + Math.min(0, val(r)), 0);
    return {
      totals: { count: rows.length, valueIn: r2(inV), valueOut: r2(-outV), net: r2(inV + outV) },
      byType: [...byType.values()].map((t) => ({ ...t, qty: r2(t.qty), value: r2(t.value) })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
      trend: [...days.values()].sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({ ...d, in: r2(d.in), out: r2(d.out) })),
      topMovers: [...movers.values()].sort((a, b) => b.value - a.value).slice(0, 10).map((m) => ({ ...m, in: r2(m.in), out: r2(m.out), value: r2(m.value) })),
      byPerson: [...people.values()].sort((a, b) => b.count - a.count).slice(0, 8)
        .map((p) => ({ name: users.find((u) => u.id === p.id)?.fullName ?? '—', count: p.count, value: r2(p.value) })),
    };
  }

  /** People who have moved stock, for the filter. */
  people(user: AuthenticatedUser) {
    return this.prisma.user.findMany({ where: { tenantId: user.tenantId, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } });
  }
}
