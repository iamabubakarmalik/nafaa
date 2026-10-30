/**
 * Monthly targets for bookers, routes, brands and principals (any mix; a
 * target with none of them is for the whole business), by value or by
 * quantity.
 *
 * Achievement counts invoices made in the month (business time), net of
 * goods that came back at settlement: each line counts for its delivered
 * share. Value is the line's net rupees; quantity is base units, shown in
 * the target's pack (Carton) for products that have that pack.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { INVOICED_STATUSES } from '../distribution.constants';
import { CopyTargetsDto, SaveTargetDto, TargetsQueryDto, UpdateTargetDto } from '../dto/phase2.dto';
import { dayStart, r2, r4, routeNames, shiftKey, todayKey, userNames } from '../distribution.support';
import { principalOfProducts } from './principals.service';

type Target = Prisma.DistTargetGetPayload<object>;

/** Days of a YYYY-MM month and its first / last day keys. */
export function monthKeys(period: string) {
  const [y, m] = period.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${period}-01`, last: `${period}-${String(days).padStart(2, '0')}`, days };
}

/** How far through the month a day is (1 = month over). */
export function monthPace(period: string, today: string) {
  const { first, last, days } = monthKeys(period);
  if (today < first) return 0;
  if (today > last) return 1;
  return Number(today.slice(8, 10)) / days;
}

@Injectable()
export class TargetsService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  private async check(tenantId: string, dto: Partial<SaveTargetDto>) {
    if (dto.userId && !(await this.prisma.user.findFirst({ where: { id: dto.userId, tenantId }, select: { id: true } }))) throw new BadRequestException('Booker nahi mila');
    if (dto.routeId && !(await this.prisma.distRoute.findFirst({ where: { id: dto.routeId, tenantId }, select: { id: true } }))) throw new BadRequestException('Route nahi mila');
    if (dto.brandId && !(await this.prisma.brand.findFirst({ where: { id: dto.brandId, tenantId }, select: { id: true } }))) throw new BadRequestException('Brand nahi mila');
    if (dto.supplierId && !(await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true } }))) throw new BadRequestException('Principal nahi mila');
  }

  async create(user: AuthenticatedUser, dto: SaveTargetDto) {
    await this.check(user.tenantId, dto);
    const twin = await this.prisma.distTarget.findFirst({
      where: { tenantId: user.tenantId, period: dto.period, userId: dto.userId || null, routeId: dto.routeId || null, brandId: dto.brandId || null, supplierId: dto.supplierId || null, metric: dto.metric },
      select: { id: true },
    });
    if (twin) throw new BadRequestException('Is mahine ka ye target pehle se hai — usay badlein');
    const row = await this.prisma.distTarget.create({
      data: {
        tenantId: user.tenantId, period: dto.period, userId: dto.userId || null, routeId: dto.routeId || null, brandId: dto.brandId || null,
        supplierId: dto.supplierId || null, metric: dto.metric, target: dto.target, unitName: dto.metric === 'QTY' ? dto.unitName?.trim() || null : null,
        note: dto.note?.trim() || null, createdById: user.id,
      },
    });
    return row;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTargetDto) {
    const old = await this.prisma.distTarget.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!old) throw new NotFoundException('Target nahi mila');
    await this.check(user.tenantId, dto);
    const pick = <K extends keyof UpdateTargetDto>(key: K) => (dto[key] !== undefined ? (dto[key] as unknown) || null : undefined);
    return this.prisma.distTarget.update({
      where: { id },
      data: {
        ...(dto.period && { period: dto.period }), userId: pick('userId') as string | null | undefined, routeId: pick('routeId') as string | null | undefined,
        brandId: pick('brandId') as string | null | undefined, supplierId: pick('supplierId') as string | null | undefined,
        ...(dto.metric && { metric: dto.metric }), ...(dto.target != null && { target: dto.target }),
        ...(dto.unitName !== undefined && { unitName: dto.unitName?.trim() || null }), ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const done = await this.prisma.distTarget.deleteMany({ where: { id, tenantId: user.tenantId } });
    if (!done.count) throw new NotFoundException('Target nahi mila');
    return { deleted: true };
  }

  /** Copies one month's targets into another that has none of the same kind. */
  async copy(user: AuthenticatedUser, dto: CopyTargetsDto) {
    const tenantId = user.tenantId;
    const [from, there] = await Promise.all([
      this.prisma.distTarget.findMany({ where: { tenantId, period: dto.from } }),
      this.prisma.distTarget.findMany({ where: { tenantId, period: dto.to } }),
    ]);
    const key = (t: Target) => [t.userId, t.routeId, t.brandId, t.supplierId, t.metric].join('|');
    const have = new Set(there.map(key));
    const add = from.filter((t) => !have.has(key(t)));
    if (add.length) {
      await this.prisma.distTarget.createMany({
        data: add.map((t) => ({ tenantId, period: dto.to, userId: t.userId, routeId: t.routeId, brandId: t.brandId, supplierId: t.supplierId, metric: t.metric, target: t.target, unitName: t.unitName, note: t.note, createdById: user.id })),
      });
    }
    return { copied: add.length, skipped: from.length - add.length };
  }

  /** Targets of a month with what has been achieved, the pace and what is needed per day. */
  async list(user: AuthenticatedUser, q: TargetsQueryDto, onlyUser?: string) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const today = todayKey(clock);
    const period = q.period ?? today.slice(0, 7);
    const forUser = onlyUser ?? q.userId;
    const targets = await this.prisma.distTarget.findMany({
      where: { tenantId, period, ...(forUser && { userId: forUser }) },
      orderBy: [{ createdAt: 'asc' }],
    });
    const { first, last, days } = monthKeys(period);
    const pace = monthPace(period, today);
    const daysLeft = today > last ? 0 : today < first ? days : days - Number(today.slice(8, 10)) + 1;
    const achieved = targets.length ? await this.achievements(tenantId, targets, { gte: dayStart(first, clock), lt: dayStart(shiftKey(last, 1), clock) }) : new Map<string, number>();

    const [users, routes, brands, suppliers] = await Promise.all([
      userNames(this.prisma, tenantId, targets.map((t) => t.userId)),
      routeNames(this.prisma, tenantId, targets.map((t) => t.routeId)),
      this.prisma.brand.findMany({ where: { tenantId, id: { in: targets.map((t) => t.brandId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
      this.prisma.supplier.findMany({ where: { tenantId, id: { in: targets.map((t) => t.supplierId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
    ]);
    const bName = new Map(brands.map((b) => [b.id, b.name]));
    const sName = new Map(suppliers.map((s) => [s.id, s.name]));
    const rows = targets.map((t) => {
      const got = achieved.get(t.id) ?? 0;
      const expectedByNow = r2(t.target * pace);
      const left = Math.max(0, t.target - got);
      const label = [
        t.userId ? users.get(t.userId) ?? 'Booker' : null, t.routeId ? routes.get(t.routeId) ?? 'Route' : null,
        t.brandId ? bName.get(t.brandId) ?? 'Brand' : null, t.supplierId ? sName.get(t.supplierId) ?? 'Principal' : null,
      ].filter(Boolean).join(' · ') || 'Poora business';
      return {
        ...t, label,
        userName: t.userId ? users.get(t.userId) ?? null : null, routeName: t.routeId ? routes.get(t.routeId) ?? null : null,
        brandName: t.brandId ? bName.get(t.brandId) ?? null : null, supplierName: t.supplierId ? sName.get(t.supplierId) ?? null : null,
        achieved: t.metric === 'VALUE' ? r2(got) : r4(got),
        pct: t.target > 0 ? r2((got / t.target) * 100) : 0,
        expectedByNow, onTrack: got + 0.005 >= expectedByNow,
        remaining: t.metric === 'VALUE' ? r2(left) : r4(left),
        perDayNeeded: daysLeft > 0 ? (t.metric === 'VALUE' ? r2(left / daysLeft) : r4(left / daysLeft)) : 0,
      };
    });
    return { period, today, pace: r2(pace * 100), daysLeft, targets: rows };
  }

  /** Achieved value or quantity for each target in the window. */
  private async achievements(tenantId: string, targets: Target[], range: { gte: Date; lt: Date }): Promise<Map<string, number>> {
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, status: { in: INVOICED_STATUSES }, invoicedAt: { gte: range.gte, lt: range.lt } },
      select: { bookedById: true, routeId: true, items: { select: { productId: true, variantId: true, baseQty: true, total: true, deliveredBaseQty: true } } },
    });
    const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)))];
    const needUnits = targets.some((t) => t.metric === 'QTY' && t.unitName);
    const [products, principals, units] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, brandId: true } }),
      targets.some((t) => t.supplierId) ? principalOfProducts(this.prisma, tenantId, productIds) : Promise.resolve(new Map<string, string>()),
      needUnits ? this.prisma.productUnit.findMany({ where: { tenantId, productId: { in: productIds }, isActive: true }, select: { productId: true, unitName: true, conversionRate: true } }) : Promise.resolve([]),
    ]);
    const brandOf = new Map(products.map((p) => [p.id, p.brandId]));
    const packOf = (productId: string, name: string) =>
      units.find((u) => u.productId === productId && u.unitName.trim().toLowerCase() === name.trim().toLowerCase())?.conversionRate ?? null;
    const out = new Map<string, number>();
    for (const t of targets) {
      let sum = 0;
      for (const o of orders) {
        if (t.userId && o.bookedById !== t.userId) continue;
        if (t.routeId && o.routeId !== t.routeId) continue;
        for (const i of o.items) {
          if (t.brandId && brandOf.get(i.productId) !== t.brandId) continue;
          if (t.supplierId && principals.get(i.productId) !== t.supplierId) continue;
          const share = i.baseQty > 0 ? Math.min(1, Math.max(0, (i.deliveredBaseQty ?? i.baseQty) / i.baseQty)) : 0;
          if (t.metric === 'VALUE') sum += i.total * share;
          else {
            const qty = i.deliveredBaseQty ?? i.baseQty;
            const pack = t.unitName ? packOf(i.productId, t.unitName) : null;
            sum += pack ? qty / pack : qty;
          }
        }
      }
      out.set(t.id, sum);
    }
    return out;
  }
}
