/**
 * Money collected in the field (invoice cash at delivery, old-balance
 * recoveries), the office's verification that posts it to the khata, and
 * the recovery list with ageing.
 *
 * A collection stays PENDING until someone with collections.verify checks
 * the money; only then is PAYMENT_RECEIVED written, in the same transaction
 * that marks it VERIFIED. With Settings → recoveryNeedsVerify off, it is
 * posted when recorded.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { refreshSettlements } from '../../../common/helpers/sale-settlement.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateCollectionDto, ListCollectionsDto, RecoveriesQueryDto } from '../dto/field.dto';
import { ageing, EMPTY_AGEING, openDebts, type AgeingBuckets } from '../helpers/credit';
import { readSettings } from '../helpers/pricing-loader';
import {
  CUSTOMER_CARD, checkKey, customerCards, dayRange, postCollection, r2, routeNames, todayKey, userNames,
} from '../distribution.support';

const DAY = 86_400_000;

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  /**
   * Records a collection. The same clientRef is saved once; the second call
   * returns the first with `duplicate: true`.
   */
  async create(user: AuthenticatedUser, dto: CreateCollectionDto, opts: { kind?: 'INVOICE_CASH' | 'RECOVERY'; salesOrderId?: string; autoVerify?: boolean; collectedById?: string } = {}) {
    const tenantId = user.tenantId;
    const clientRef = dto.clientRef?.trim() || null;
    if (clientRef) {
      const seen = await this.prisma.distCollection.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } } });
      if (seen) return { collection: seen, duplicate: true };
    }
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true, routeId: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    let shopId: string | null = null;
    if (dto.saleId) {
      const sale = await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId }, select: { customerId: true, shopId: true } });
      if (!sale || sale.customerId !== customer.id) throw new BadRequestException('Invoice is customer ki nahi');
      shopId = sale.shopId;
      // Money for an invoice that is out on a van is counted once, at settlement, from the delivery report.
      const onVan = await this.prisma.salesOrder.findFirst({
        where: { tenantId, saleId: dto.saleId, loadSheetId: { not: null }, deliveryStatus: null },
        select: { orderNumber: true },
      });
      if (onVan) throw new BadRequestException(`${onVan.orderNumber} load sheet par hai — is ka cash delivery report me likhein, office settlement par ginega`);
    }
    if (dto.loadSheetId) {
      const sheet = await this.prisma.loadSheet.findFirst({ where: { id: dto.loadSheetId, tenantId }, select: { status: true, shopId: true } });
      if (!sheet) throw new BadRequestException('Load sheet nahi mili');
      if (sheet.status === 'SETTLED' || sheet.status === 'CANCELLED') throw new BadRequestException(`Load sheet ${sheet.status} hai`);
      shopId = shopId ?? sheet.shopId;
    }
    if (!shopId && customer.routeId) {
      shopId = (await this.prisma.distRoute.findFirst({ where: { id: customer.routeId, tenantId }, select: { shopId: true } }))?.shopId ?? null;
    }
    if (!shopId) shopId = (await readSettings(this.prisma, tenantId))?.defaultShopId ?? null;

    const now = new Date();
    const collectedAt = dto.collectedAt ? new Date(Math.min(new Date(dto.collectedAt).getTime(), now.getTime())) : now;
    const settings = await readSettings(this.prisma, tenantId);
    const autoVerify = opts.autoVerify ?? settings?.recoveryNeedsVerify === false;
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const c = await tx.distCollection.create({
          data: {
            tenantId, customerId: customer.id, loadSheetId: dto.loadSheetId || null, saleId: dto.saleId || null,
            salesOrderId: opts.salesOrderId ?? null, kind: opts.kind ?? (dto.saleId ? 'INVOICE_CASH' : 'RECOVERY'),
            amount: r2(dto.amount), method: dto.method ?? 'CASH', reference: dto.reference?.trim() || null, note: dto.note?.trim() || null,
            status: 'PENDING', shopId, collectedById: opts.collectedById ?? user.id, collectedAt, clientRef,
            latitude: dto.latitude ?? null, longitude: dto.longitude ?? null,
          },
        });
        if (autoVerify) await postCollection(tx, c, user.id);
        return tx.distCollection.findUniqueOrThrow({ where: { id: c.id } });
      });
      if (row.status === 'VERIFIED') refreshSettlements(this.prisma, tenantId, row.customerId);
      return { collection: row, duplicate: false };
    } catch (e) {
      if (clientRef && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const seen = await this.prisma.distCollection.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } } });
        if (seen) return { collection: seen, duplicate: true };
      }
      throw e;
    }
  }

  /** Collections; a collector without verify sees only their own. */
  async list(user: AuthenticatedUser, q: ListCollectionsDto, onlyMine = false) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const canVerify = hasPermission(user.role, user.permissions, PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY);
    const where: Prisma.DistCollectionWhereInput = {
      tenantId,
      ...(q.status && { status: { in: q.status.split(',').map((s) => s.trim().toUpperCase()) } }),
      ...(q.kind && { kind: q.kind }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.loadSheetId && { loadSheetId: q.loadSheetId }),
      ...(onlyMine || !canVerify ? { collectedById: user.id } : q.collectedById ? { collectedById: q.collectedById } : {}),
    };
    if (q.routeId) {
      const ids = await this.prisma.customer.findMany({ where: { tenantId, routeId: q.routeId }, select: { id: true } });
      where.customerId = { in: ids.map((c) => c.id) };
    }
    if (q.from || q.to) {
      const r = dayRange(clock, q.from ?? q.to, q.to ?? q.from);
      where.collectedAt = { gte: r.gte, lt: r.lt };
    }
    const [total, rows, sums] = await Promise.all([
      this.prisma.distCollection.count({ where }),
      this.prisma.distCollection.findMany({ where, orderBy: { collectedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.distCollection.groupBy({ by: ['status'], where, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const [customers, users, sales] = await Promise.all([
      customerCards(this.prisma, tenantId, rows.map((r) => r.customerId)),
      userNames(this.prisma, tenantId, rows.flatMap((r) => [r.collectedById, r.verifiedById])),
      this.prisma.sale.findMany({ where: { tenantId, id: { in: rows.map((r) => r.saleId).filter((x): x is string => !!x) } }, select: { id: true, saleNumber: true } }),
    ]);
    const saleNo = new Map(sales.map((s) => [s.id, s.saleNumber]));
    return {
      total, page, limit,
      totals: Object.fromEntries(sums.map((s) => [s.status, { count: s._count._all, amount: r2(s._sum.amount ?? 0) }])),
      collections: rows.map((r) => ({
        ...r,
        customer: customers.get(r.customerId) ?? null,
        collectedByName: users.get(r.collectedById) ?? null,
        verifiedByName: r.verifiedById ? users.get(r.verifiedById) ?? null : null,
        saleNumber: r.saleId ? saleNo.get(r.saleId) ?? null : null,
      })),
    };
  }

  /** Verifies pending collections; each one posts to the khata in its own transaction. */
  async verify(user: AuthenticatedUser, ids: string[]) {
    const tenantId = user.tenantId;
    const rows = await this.prisma.distCollection.findMany({ where: { tenantId, id: { in: [...new Set(ids)] } } });
    const results = [];
    const touched = new Set<string>();
    for (const id of new Set(ids)) {
      const c = rows.find((r) => r.id === id);
      if (!c) { results.push({ id, ok: false, error: 'Collection nahi mili' }); continue; }
      if (c.status !== 'PENDING') { results.push({ id, ok: false, status: c.status, error: `Pehle hi ${c.status} hai` }); continue; }
      try {
        const done = await this.prisma.$transaction((tx) => postCollection(tx, c, user.id));
        if (done) touched.add(c.customerId);
        results.push(done ? { id, ok: true, status: 'VERIFIED' } : { id, ok: false, error: 'Kisi aur ne pehle hi verify / reject kar di' });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message ?? 'Verify nahi hui' });
      }
    }
    for (const customerId of touched) refreshSettlements(this.prisma, tenantId, customerId);
    return { results, verified: results.filter((r) => r.ok).length };
  }

  async reject(user: AuthenticatedUser, ids: string[], reason?: string) {
    const tenantId = user.tenantId;
    const results = [];
    for (const id of new Set(ids)) {
      const res = await this.prisma.distCollection.updateMany({
        where: { id, tenantId, status: 'PENDING' },
        data: { status: 'REJECTED', rejectReason: reason?.trim() || null, verifiedById: user.id, verifiedAt: new Date() },
      });
      results.push(res.count ? { id, ok: true, status: 'REJECTED' } : { id, ok: false, error: 'Sirf PENDING collection reject ho sakti hai' });
    }
    return { results, rejected: results.filter((r) => r.ok).length };
  }

  /**
   * Customers who owe money, with ageing (payments settle the oldest credit
   * first), overdue days against their credit days, the last payment and
   * money collected but not yet verified.
   */
  async recoveries(user: AuthenticatedUser, q: RecoveriesQueryDto) {
    const tenantId = user.tenantId;
    const page = q.page ?? 1;
    const limit = q.limit ?? 100;
    const search = q.search?.trim();
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId, balance: { gt: 0.005 },
        ...(q.routeId && { routeId: q.routeId }),
        ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { businessName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }),
      },
      select: CUSTOMER_CARD,
    });
    const rows = await this.recoveryRows(tenantId, customers);
    const filtered = q.overdueOnly ? rows.filter((r) => r.overdue) : rows;
    filtered.sort((a, b) => (b.dueDays ?? -1) - (a.dueDays ?? -1) || b.balance - a.balance);
    const totals = filtered.reduce((t, r) => {
      t.balance = r2(t.balance + r.balance);
      t.pending = r2(t.pending + r.pendingCollected);
      for (const k of Object.keys(t.ageing) as Array<keyof AgeingBuckets>) t.ageing[k] = r2(t.ageing[k] + r.ageing[k]);
      if (r.overdue) { t.overdueCustomers++; t.overdueBalance = r2(t.overdueBalance + r.balance); }
      return t;
    }, { customers: filtered.length, balance: 0, pending: 0, overdueCustomers: 0, overdueBalance: 0, ageing: { ...EMPTY_AGEING } });
    const routes = await routeNames(this.prisma, tenantId, filtered.slice((page - 1) * limit, page * limit).map((r) => r.customer.routeId));
    return {
      total: filtered.length, page, limit, totals,
      customers: filtered.slice((page - 1) * limit, page * limit).map((r) => ({ ...r, routeName: r.customer.routeId ? routes.get(r.customer.routeId) ?? null : null })),
    };
  }

  /** Printable recovery list of one route, in visit order. */
  async recoverySheet(user: AuthenticatedUser, q: { routeId?: string; date?: string }) {
    const tenantId = user.tenantId;
    if (!q.routeId) throw new BadRequestException('Route chunein');
    const clock = await this.tz.clock(tenantId);
    const route = await this.prisma.distRoute.findFirst({ where: { id: q.routeId, tenantId } });
    if (!route) throw new NotFoundException('Route nahi mila');
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, routeId: route.id, isActive: true, balance: { gt: 0.005 } },
      select: CUSTOMER_CARD, orderBy: [{ routeSeq: 'asc' }, { name: 'asc' }],
    });
    const rows = await this.recoveryRows(tenantId, customers);
    const users = await userNames(this.prisma, tenantId, [route.bookerId, route.deliveryUserId]);
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { shopName: true, shopPhone: true, shopAddress: true } });
    return {
      kind: 'recovery-sheet',
      business: settings,
      date: checkKey(q.date) ?? todayKey(clock),
      route: { id: route.id, name: route.name, code: route.code, area: route.area, bookerName: route.bookerId ? users.get(route.bookerId) ?? null : null, deliveryUserName: route.deliveryUserId ? users.get(route.deliveryUserId) ?? null : null },
      rows,
      totals: {
        customers: rows.length,
        balance: r2(rows.reduce((s, r) => s + r.balance, 0)),
        overdue: r2(rows.filter((r) => r.overdue).reduce((s, r) => s + r.balance, 0)),
        pending: r2(rows.reduce((s, r) => s + r.pendingCollected, 0)),
      },
    };
  }

  private async recoveryRows(tenantId: string, customers: Array<Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_CARD }>>) {
    const ids = customers.map((c) => c.id);
    if (!ids.length) return [];
    const [ledger, pending] = await Promise.all([
      this.prisma.customerLedger.findMany({ where: { tenantId, customerId: { in: ids } }, select: { customerId: true, amount: true, createdAt: true, type: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.distCollection.groupBy({ by: ['customerId'], where: { tenantId, customerId: { in: ids }, status: 'PENDING' }, _sum: { amount: true } }),
    ]);
    const byCustomer = new Map<string, typeof ledger>();
    for (const l of ledger) byCustomer.set(l.customerId, [...(byCustomer.get(l.customerId) ?? []), l]);
    const pend = new Map(pending.map((p) => [p.customerId, r2(p._sum.amount ?? 0)]));
    const now = new Date();
    return customers.map((c) => {
      const entries = byCustomer.get(c.id) ?? [];
      const debts = openDebts(entries);
      const oldest = debts[0]?.at ?? null;
      const dueDays = oldest ? Math.floor((now.getTime() - oldest.getTime()) / DAY) : null;
      const lastPay = [...entries].reverse().find((e) => e.type === 'PAYMENT_RECEIVED');
      return {
        customer: c,
        balance: r2(c.balance),
        ageing: ageing(debts, now),
        oldestDueAt: oldest,
        dueDays,
        creditDays: c.creditDays ?? null,
        overdue: !!c.creditDays && dueDays != null && dueDays > c.creditDays,
        lastPaymentAt: lastPay?.createdAt ?? null,
        lastPaymentAmount: lastPay ? r2(-lastPay.amount) : null,
        pendingCollected: pend.get(c.id) ?? 0,
      };
    });
  }
}
