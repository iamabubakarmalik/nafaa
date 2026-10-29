/**
 * Load sheets: invoices loaded on one vehicle, with the goods to pick
 * totalled per item in cartons plus pieces (free goods shown apart).
 * Orders on a sheet are LOADED; cancelling an open sheet puts them back to
 * INVOICED. Settlement is in settlement.service.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateLoadSheetDto, ListLoadSheetsDto, UpdateLoadSheetDto } from '../dto/field.dto';
import { splitPacks } from '../helpers/logistics';
import {
  assertUser, customerCards, dayRange, dayStart, nextNumber, parseWhen, r2, r4, routeNames, shopNames, todayKey, userNames,
} from '../distribution.support';

@Injectable()
export class LoadSheetsService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  async list(user: AuthenticatedUser, q: ListLoadSheetsDto) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const where: Prisma.LoadSheetWhereInput = {
      tenantId,
      ...(q.status && { status: { in: q.status.split(',').map((s) => s.trim().toUpperCase()) } }),
      ...(q.deliveryUserId && { deliveryUserId: q.deliveryUserId === 'me' ? user.id : q.deliveryUserId }),
    };
    if (q.from || q.to) {
      const r = dayRange(clock, q.from ?? q.to, q.to ?? q.from);
      where.date = { gte: r.gte, lt: r.lt };
    }
    const [total, rows] = await Promise.all([
      this.prisma.loadSheet.count({ where }),
      this.prisma.loadSheet.findMany({ where, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
    ]);
    const [users, shops, routes] = await Promise.all([
      userNames(this.prisma, tenantId, rows.flatMap((r) => [r.deliveryUserId, r.settledById])),
      shopNames(this.prisma, tenantId, rows.map((r) => r.shopId)),
      routeNames(this.prisma, tenantId, rows.map((r) => r.routeId)),
    ]);
    return {
      total, page, limit,
      sheets: rows.map((r) => ({
        ...r,
        deliveryUserName: r.deliveryUserId ? users.get(r.deliveryUserId) ?? null : null,
        settledByName: r.settledById ? users.get(r.settledById) ?? null : null,
        shopName: r.shopId ? shops.get(r.shopId) ?? null : null,
        routeName: r.routeId ? routes.get(r.routeId) ?? null : null,
      })),
    };
  }

  /** Makes a sheet from invoiced orders of one godown that are on no other sheet. */
  async create(user: AuthenticatedUser, dto: CreateLoadSheetDto) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    if (dto.deliveryUserId) await assertUser(this.prisma, tenantId, dto.deliveryUserId, 'Delivery user');
    const orders = await this.checkLoadable(tenantId, dto.orderIds, null);
    const shopIds = [...new Set(orders.map((o) => o.shopId))];
    if (shopIds.length > 1) throw new BadRequestException('Ek load sheet me ek hi godown ke Orders aa sakte hain');
    const key = dto.date ? dto.date : todayKey(clock);
    const date = parseWhen(key, clock) ?? dayStart(todayKey(clock), clock);
    const routeIds = [...new Set(orders.map((o) => o.routeId).filter(Boolean))];

    const id = await this.prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, tenantId, 'loadSheet');
      const sheet = await tx.loadSheet.create({
        data: {
          tenantId, number, date, shopId: shopIds[0] ?? null,
          routeId: dto.routeId || (routeIds.length === 1 ? routeIds[0] : null),
          deliveryUserId: dto.deliveryUserId || null, driverName: dto.driverName?.trim() || null,
          vehicleNo: dto.vehicleNo?.trim() || null, note: dto.note?.trim() || null, createdById: user.id,
        },
        select: { id: true },
      });
      const moved = await tx.salesOrder.updateMany({
        where: { tenantId, id: { in: orders.map((o) => o.id) }, status: 'INVOICED', loadSheetId: null },
        data: { status: 'LOADED', loadSheetId: sheet.id },
      });
      if (moved.count !== orders.length) throw new BadRequestException('Kuch Orders abhi doosri load sheet par chale gaye — dobara koshish karein');
      await this.refreshTotals(tx, tenantId, sheet.id);
      return sheet.id;
    });
    return this.get(user, id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateLoadSheetDto) {
    const tenantId = user.tenantId;
    const sheet = await this.sheet(tenantId, id);
    if (sheet.status === 'SETTLED' || sheet.status === 'CANCELLED') throw new BadRequestException(`${sheet.status} load sheet badli nahi ja sakti`);
    if (dto.deliveryUserId) await assertUser(this.prisma, tenantId, dto.deliveryUserId, 'Delivery user');
    await this.prisma.loadSheet.update({
      where: { id },
      data: {
        ...(dto.deliveryUserId !== undefined && { deliveryUserId: dto.deliveryUserId || null }),
        ...(dto.driverName !== undefined && { driverName: dto.driverName?.trim() || null }),
        ...(dto.vehicleNo !== undefined && { vehicleNo: dto.vehicleNo?.trim() || null }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
      },
    });
    return this.get(user, id);
  }

  async addOrders(user: AuthenticatedUser, id: string, orderIds: string[]) {
    const tenantId = user.tenantId;
    const sheet = await this.sheet(tenantId, id);
    if (sheet.status !== 'OPEN') throw new BadRequestException('Sirf OPEN load sheet me Orders jor sakte hain');
    const orders = await this.checkLoadable(tenantId, orderIds, sheet.shopId);
    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.salesOrder.updateMany({
        where: { tenantId, id: { in: orders.map((o) => o.id) }, status: 'INVOICED', loadSheetId: null },
        data: { status: 'LOADED', loadSheetId: id },
      });
      if (moved.count !== orders.length) throw new BadRequestException('Kuch Orders abhi doosri load sheet par chale gaye — dobara koshish karein');
      await this.refreshTotals(tx, tenantId, id);
    });
    return this.get(user, id);
  }

  async removeOrder(user: AuthenticatedUser, id: string, orderId: string) {
    const tenantId = user.tenantId;
    const sheet = await this.sheet(tenantId, id);
    if (sheet.status !== 'OPEN') throw new BadRequestException('Sirf OPEN load sheet se Order hata sakte hain');
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.salesOrder.updateMany({ where: { tenantId, id: orderId, loadSheetId: id, status: 'LOADED' }, data: { status: 'INVOICED', loadSheetId: null } });
      if (!res.count) throw new NotFoundException('Order is load sheet par nahi');
      await this.refreshTotals(tx, tenantId, id);
    });
    return this.get(user, id);
  }

  async dispatch(user: AuthenticatedUser, id: string) {
    const sheet = await this.sheet(user.tenantId, id);
    if (sheet.status !== 'OPEN') throw new BadRequestException(`${sheet.status} load sheet dispatch nahi ho sakti`);
    if (!sheet.invoiceCount) throw new BadRequestException('Load sheet khali hai');
    await this.prisma.loadSheet.update({ where: { id }, data: { status: 'DISPATCHED', dispatchedAt: new Date() } });
    return this.get(user, id);
  }

  /** Cancels an open (not yet dispatched) sheet; its orders go back to INVOICED. */
  async cancel(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const sheet = await this.sheet(tenantId, id);
    if (sheet.status !== 'OPEN') throw new BadRequestException('Sirf OPEN load sheet cancel ho sakti hai');
    await this.prisma.$transaction(async (tx) => {
      await tx.salesOrder.updateMany({ where: { tenantId, loadSheetId: id, status: 'LOADED' }, data: { status: 'INVOICED', loadSheetId: null } });
      await tx.loadSheet.update({ where: { id }, data: { status: 'CANCELLED', invoiceCount: 0, totalValue: 0 } });
    });
    return this.get(user, id);
  }

  /** The sheet with its invoices and goods to pick. */
  async get(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const sheet = await this.sheet(tenantId, id);
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, loadSheetId: id },
      include: { items: true },
      orderBy: [{ routeId: 'asc' }, { orderNumber: 'asc' }],
    });
    const [customers, users, shops, routes, sales] = await Promise.all([
      customerCards(this.prisma, tenantId, orders.map((o) => o.customerId)),
      userNames(this.prisma, tenantId, [sheet.deliveryUserId, sheet.settledById, sheet.createdById, ...orders.map((o) => o.bookedById)]),
      shopNames(this.prisma, tenantId, [sheet.shopId]),
      routeNames(this.prisma, tenantId, [sheet.routeId, ...orders.map((o) => o.routeId)]),
      this.prisma.sale.findMany({ where: { tenantId, id: { in: orders.map((o) => o.saleId).filter((x): x is string => !!x) } }, select: { id: true, saleNumber: true } }),
    ]);
    const saleNo = new Map(sales.map((s) => [s.id, s.saleNumber]));
    // Customers sorted by route visit order, so the driver's list follows the road.
    const sorted = [...orders].sort((a, b) =>
      (customers.get(a.customerId)?.routeSeq ?? 9999) - (customers.get(b.customerId)?.routeSeq ?? 9999) || a.orderNumber.localeCompare(b.orderNumber));
    const goods = await this.goods(tenantId, orders.flatMap((o) => o.items));
    return {
      ...sheet,
      deliveryUserName: sheet.deliveryUserId ? users.get(sheet.deliveryUserId) ?? null : null,
      settledByName: sheet.settledById ? users.get(sheet.settledById) ?? null : null,
      createdByName: sheet.createdById ? users.get(sheet.createdById) ?? null : null,
      shopName: sheet.shopId ? shops.get(sheet.shopId) ?? null : null,
      routeName: sheet.routeId ? routes.get(sheet.routeId) ?? null : null,
      orders: sorted.map(({ items, ...o }) => ({
        ...o,
        itemCount: items.length,
        customer: customers.get(o.customerId) ?? null,
        bookedByName: users.get(o.bookedById) ?? null,
        routeName: o.routeId ? routes.get(o.routeId) ?? null : null,
        saleNumber: o.saleId ? saleNo.get(o.saleId) ?? null : null,
      })),
      ...goods,
    };
  }

  /**
   * Goods to pick per item and variant: paid quantity and free quantity
   * apart, each in base units and as biggest pack + loose.
   */
  async goods(tenantId: string, items: Array<{ productId: string; variantId: string | null; baseQty: number; freeBaseQty: number; freeProductId: string | null; total: number }>) {
    type Row = { productId: string; variantId: string | null; baseQty: number; value: number };
    const paid = new Map<string, Row>();
    const free = new Map<string, Row>();
    for (const it of items) {
      const k = `${it.productId}|${it.variantId ?? ''}`;
      const p = paid.get(k) ?? { productId: it.productId, variantId: it.variantId, baseQty: 0, value: 0 };
      p.baseQty = r4(p.baseQty + it.baseQty);
      p.value = r2(p.value + it.total);
      paid.set(k, p);
      if (it.freeBaseQty > 0) {
        const pid = it.freeProductId ?? it.productId;
        const fv = it.freeProductId && it.freeProductId !== it.productId ? null : it.variantId;
        const fk = `${pid}|${fv ?? ''}`;
        const f = free.get(fk) ?? { productId: pid, variantId: fv, baseQty: 0, value: 0 };
        f.baseQty = r4(f.baseQty + it.freeBaseQty);
        free.set(fk, f);
      }
    }
    const ids = [...new Set([...paid.values(), ...free.values()].map((r) => r.productId))];
    const [products, variants, units] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, name: true, sku: true, unit: true, costPrice: true } }),
      this.prisma.productVariant.findMany({ where: { productId: { in: ids } }, select: { id: true, name: true } }),
      this.prisma.productUnit.findMany({ where: { tenantId, productId: { in: ids }, isActive: true }, select: { productId: true, variantId: true, unitName: true, conversionRate: true } }),
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const vMap = new Map(variants.map((v) => [v.id, v.name]));
    const shape = (r: Row) => {
      const p = pMap.get(r.productId);
      const packs = units.filter((u) => u.productId === r.productId && (!u.variantId || u.variantId === r.variantId));
      const split = splitPacks(r.baseQty, packs, p?.unit || 'pcs');
      return {
        productId: r.productId, variantId: r.variantId, name: p?.name ?? null, sku: p?.sku ?? null,
        variantName: r.variantId ? vMap.get(r.variantId) ?? null : null, baseUnit: p?.unit || 'pcs',
        baseQty: r.baseQty, packName: split.packName, packSize: split.packSize, packs: split.packs, loose: split.loose, text: split.text,
        value: r.value,
      };
    };
    const byName = (a: { name: string | null }, b: { name: string | null }) => (a.name ?? '').localeCompare(b.name ?? '');
    const paidRows = [...paid.values()].map(shape).sort(byName);
    const freeRows = [...free.values()].map(shape).sort(byName).map(({ value: _v, ...r }) => r);
    return {
      goods: paidRows,
      freeGoods: freeRows,
      goodsTotals: {
        lines: paidRows.length,
        baseQty: r4(paidRows.reduce((s, r) => s + r.baseQty, 0)),
        packs: paidRows.reduce((s, r) => s + r.packs, 0),
        value: r2(paidRows.reduce((s, r) => s + r.value, 0)),
        freeBaseQty: r4(freeRows.reduce((s, r) => s + r.baseQty, 0)),
      },
    };
  }

  async sheet(tenantId: string, id: string) {
    const sheet = await this.prisma.loadSheet.findFirst({ where: { id, tenantId } });
    if (!sheet) throw new NotFoundException('Load sheet nahi mili');
    return sheet;
  }

  async refreshTotals(tx: Prisma.TransactionClient, tenantId: string, id: string) {
    const agg = await tx.salesOrder.aggregate({ where: { tenantId, loadSheetId: id }, _count: { _all: true }, _sum: { total: true } });
    await tx.loadSheet.update({ where: { id }, data: { invoiceCount: agg._count._all, totalValue: r2(agg._sum.total ?? 0) } });
  }

  private async checkLoadable(tenantId: string, ids: string[], shopId: string | null) {
    const unique = [...new Set(ids)];
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, id: { in: unique } },
      select: { id: true, orderNumber: true, status: true, loadSheetId: true, shopId: true, routeId: true },
    });
    if (orders.length !== unique.length) throw new BadRequestException('Kuch Orders nahi mile');
    const bad = orders.find((o) => o.status !== 'INVOICED' || o.loadSheetId);
    if (bad) throw new BadRequestException(`Order ${bad.orderNumber} (${bad.status}) load nahi ho sakta — sirf INVOICED Orders jo kisi sheet par na hon`);
    if (shopId && orders.some((o) => o.shopId !== shopId)) throw new BadRequestException('Is load sheet ke godown ke Orders hi jor sakte hain');
    return orders;
  }
}
