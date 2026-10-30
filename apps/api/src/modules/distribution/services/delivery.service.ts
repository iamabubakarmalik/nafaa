/**
 * The delivery man's phone: his dispatched load sheets with every invoice
 * and line, and the sync that records what happened on the trip.
 *
 * A report per invoice (delivered, partly returned, returned; money taken)
 * is only a record. It moves no stock and posts no money. The office opens
 * the settlement screen, which fills itself from the report, checks it and
 * settles; the cash is counted there, once. Recoveries taken on the trip are
 * normal field collections against the sheet (PENDING until verified), so
 * the settlement's expected cash counts them once as well.
 */

import { BadRequestException, ForbiddenException, HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { DeliveryRecoveryDto, DeliveryReportDto, DeliverySyncDto } from '../dto/field.dto';
import { r2, r4, returnPlan, routeNames, shopNames, todayKey, type ReturnLineInput } from '../distribution.support';
import { CollectionsService } from './collections.service';
import type { SyncStatus } from './booker.service';

export interface DeliverySyncResult {
  kind: 'report' | 'recovery';
  clientRef: string | null;
  status: SyncStatus;
  id?: string;
  /** Roman Urdu reason (conflict, error). */
  reason?: string;
  warnings?: string[];
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly collections: CollectionsService,
  ) {}

  /** The caller's DISPATCHED load sheets, invoices in route order, with lines and any report already sent. */
  async today(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const canSeeBalance = hasPermission(user.role, user.permissions, PERMISSIONS.KHATA_VIEW);
    const sheets = await this.prisma.loadSheet.findMany({
      where: { tenantId, deliveryUserId: user.id, status: 'DISPATCHED' },
      orderBy: [{ date: 'asc' }, { number: 'asc' }],
    });
    const sheetIds = sheets.map((s) => s.id);
    const orders = sheetIds.length
      ? await this.prisma.salesOrder.findMany({ where: { tenantId, loadSheetId: { in: sheetIds } }, include: { items: { orderBy: { sortOrder: 'asc' } } } })
      : [];
    const items = orders.flatMap((o) => o.items);
    const productIds = [...new Set(items.flatMap((i) => [i.productId, ...(i.freeProductId ? [i.freeProductId] : [])]))];
    const variantIds = [...new Set(items.map((i) => i.variantId).filter((x): x is string => !!x))];
    const [products, variants, customers, sales, reports, recoveries, shops, routes] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, unit: true } }),
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, name: true } }) : [],
      this.prisma.customer.findMany({
        where: { tenantId, id: { in: [...new Set(orders.map((o) => o.customerId))] } },
        select: { id: true, name: true, businessName: true, phone: true, address: true, area: true, city: true, latitude: true, longitude: true, routeSeq: true, balance: true },
      }),
      this.prisma.sale.findMany({ where: { tenantId, id: { in: orders.map((o) => o.saleId).filter((x): x is string => !!x) } }, select: { id: true, saleNumber: true } }),
      this.prisma.distDeliveryReport.findMany({ where: { tenantId, salesOrderId: { in: orders.map((o) => o.id) } } }),
      sheetIds.length
        ? this.prisma.distCollection.findMany({
            where: { tenantId, loadSheetId: { in: sheetIds }, kind: 'RECOVERY', collectedById: user.id, status: { not: 'REJECTED' } },
            orderBy: { collectedAt: 'asc' },
          })
        : [],
      shopNames(this.prisma, tenantId, sheets.map((s) => s.shopId)),
      routeNames(this.prisma, tenantId, sheets.map((s) => s.routeId)),
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const vMap = new Map(variants.map((v) => [v.id, v.name]));
    const cMap = new Map(customers.map((c) => [c.id, c]));
    const saleNo = new Map(sales.map((s) => [s.id, s.saleNumber]));
    const rMap = new Map(reports.map((r) => [r.salesOrderId, r]));

    return {
      serverTime: new Date().toISOString(),
      today: todayKey(clock),
      me: {
        id: user.id,
        canCollect: hasPermission(user.role, user.permissions, PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT),
        canSeeBalance,
      },
      sheets: sheets.map((sheet) => {
        const mine = orders
          .filter((o) => o.loadSheetId === sheet.id)
          .sort((a, b) => (cMap.get(a.customerId)?.routeSeq ?? 9999) - (cMap.get(b.customerId)?.routeSeq ?? 9999) || a.orderNumber.localeCompare(b.orderNumber));
        return {
          id: sheet.id, number: sheet.number, date: sheet.date, status: sheet.status, dispatchedAt: sheet.dispatchedAt,
          shopName: sheet.shopId ? shops.get(sheet.shopId) ?? null : null, routeName: sheet.routeId ? routes.get(sheet.routeId) ?? null : null,
          driverName: sheet.driverName, vehicleNo: sheet.vehicleNo, note: sheet.note, invoiceCount: sheet.invoiceCount, totalValue: sheet.totalValue,
          invoices: mine.map((o, idx) => {
            const c = cMap.get(o.customerId);
            const r = rMap.get(o.id);
            return {
              orderId: o.id, orderNumber: o.orderNumber, saleId: o.saleId, saleNumber: o.saleId ? saleNo.get(o.saleId) ?? null : null,
              stop: idx + 1, total: o.total, status: o.status, settled: !!o.deliveryStatus, deliveryStatus: o.deliveryStatus,
              customer: c
                ? {
                    id: c.id, name: c.name, businessName: c.businessName, phone: c.phone, address: c.address, area: c.area, city: c.city,
                    latitude: c.latitude, longitude: c.longitude, ...(canSeeBalance && { balance: r2(c.balance) }),
                  }
                : null,
              lines: o.items.map((i) => {
                const p = pMap.get(i.productId);
                return {
                  orderItemId: i.id, productId: i.productId, name: p?.name ?? null, variantName: i.variantId ? vMap.get(i.variantId) ?? null : null,
                  baseUnit: p?.unit || 'pcs', unitName: i.unitName, conversionRate: i.conversionRate, qty: i.qty, baseQty: i.baseQty, total: i.total,
                  netPerBase: i.baseQty > 0 ? r4(i.total / i.baseQty) : 0, freeBaseQty: i.freeBaseQty, freeProductId: i.freeProductId,
                  freeProductName: i.freeProductId ? pMap.get(i.freeProductId)?.name ?? null : null,
                };
              }),
              report: r
                ? {
                    id: r.id, clientRef: r.clientRef, outcome: r.outcome, lines: (r.lines as ReturnLineInput[] | null) ?? [], cashCollected: r.cashCollected,
                    method: r.method, returnReason: r.returnReason, note: r.note, reportedAt: r.reportedAt, status: r.status,
                  }
                : null,
            };
          }),
          recoveries: recoveries
            .filter((c) => c.loadSheetId === sheet.id)
            .map((c) => ({ id: c.id, clientRef: c.clientRef, customerId: c.customerId, amount: c.amount, method: c.method, status: c.status, collectedAt: c.collectedAt })),
        };
      }),
    };
  }

  /** Reports first, then recoveries; every item answers on its own and one failure never stops the rest. */
  async sync(user: AuthenticatedUser, dto: DeliverySyncDto) {
    const results: DeliverySyncResult[] = [];
    for (const r of dto.reports ?? []) results.push(await this.one('report', r.clientRef, () => this.saveReport(user, r)));
    for (const c of dto.recoveries ?? []) results.push(await this.one('recovery', c.clientRef, () => this.saveRecovery(user, c)));
    const count = (s: SyncStatus) => results.filter((r) => r.status === s).length;
    return {
      serverTime: new Date().toISOString(),
      results,
      counts: { ok: count('ok'), duplicate: count('duplicate'), conflict: count('conflict'), error: count('error') },
    };
  }

  /** Staff who can use the delivery app, for the load sheet and route pickers. */
  async staff(user: AuthenticatedUser) {
    const rows = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, fullName: true, role: true, phone: true, permissions: true },
      orderBy: { fullName: 'asc' },
    });
    const order = { STAFF: 0, CASHIER: 1, MANAGER: 2, OWNER: 3, SUPER_ADMIN: 4 } as Record<string, number>;
    return rows
      .filter((u) => hasPermission(u.role, u.permissions, PERMISSIONS.DISTRIBUTION_DELIVERY_REPORT))
      .sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9) || a.fullName.localeCompare(b.fullName))
      .map((u) => ({ id: u.id, fullName: u.fullName, role: u.role, phone: u.phone }));
  }

  private async saveReport(user: AuthenticatedUser, r: DeliveryReportDto): Promise<Omit<DeliverySyncResult, 'kind' | 'clientRef'>> {
    const tenantId = user.tenantId;
    const clientRef = r.clientRef.trim();
    const seen = await this.prisma.distDeliveryReport.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } }, select: { id: true } });
    if (seen) return { status: 'duplicate', id: seen.id };

    const order = await this.prisma.salesOrder.findFirst({ where: { id: r.orderId, tenantId }, include: { items: true } });
    if (!order) throw new NotFoundException('Invoice nahi mili');
    const sheet = order.loadSheetId ? await this.prisma.loadSheet.findFirst({ where: { id: order.loadSheetId, tenantId } }) : null;
    if (!sheet || sheet.deliveryUserId !== user.id) throw new ForbiddenException(`${order.orderNumber} aap ki load sheet par nahi`);
    if (order.deliveryStatus) throw new BadRequestException(`${order.orderNumber}: office ne settle kar diya — report ab nahi badal sakti`);
    if (sheet.status !== 'DISPATCHED') throw new BadRequestException(`Load sheet ${sheet.number} ${sheet.status} hai`);

    const cash = r2(r.cashCollected ?? 0);
    const back = returnPlan(order, r.outcome, cash, r.lines);
    const lines = r.outcome === 'PARTIAL'
      ? [...back.entries()].map(([orderItemId, b]) => ({ orderItemId, returnBaseQty: b.paid, returnFreeQty: b.free, damaged: b.damaged }))
      : null;
    const now = new Date();
    const reportedAt = r.reportedAt ? new Date(Math.min(new Date(r.reportedAt).getTime(), now.getTime())) : now;

    const existing = await this.prisma.distDeliveryReport.findUnique({ where: { tenantId_salesOrderId: { tenantId, salesOrderId: order.id } } });
    // An older report that arrives after a newer one (a retried batch) is ignored.
    if (existing && existing.reportedAt > reportedAt) return { status: 'duplicate', id: existing.id, warnings: ['Is Invoice ki nayi report pehle se save hai'] };

    const data = {
      loadSheetId: sheet.id, reportedById: user.id, outcome: r.outcome, lines: lines ?? Prisma.DbNull, cashCollected: cash,
      method: cash > 0 ? r.method ?? 'CASH' : 'CASH', returnReason: r.returnReason?.trim() || null, note: r.note?.trim() || null,
      reportedAt, latitude: r.latitude ?? null, longitude: r.longitude ?? null, accuracyM: r.accuracyM ?? null, clientRef, status: 'PENDING',
    };
    try {
      const row = await this.prisma.distDeliveryReport.upsert({
        where: { tenantId_salesOrderId: { tenantId, salesOrderId: order.id } },
        create: { tenantId, salesOrderId: order.id, ...data },
        update: data,
        select: { id: true },
      });
      return { status: 'ok', id: row.id };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await this.prisma.distDeliveryReport.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } }, select: { id: true } });
        if (again) return { status: 'duplicate', id: again.id };
      }
      throw e;
    }
  }

  private async saveRecovery(user: AuthenticatedUser, c: DeliveryRecoveryDto): Promise<Omit<DeliverySyncResult, 'kind' | 'clientRef'>> {
    if (!hasPermission(user.role, user.permissions, PERMISSIONS.DISTRIBUTION_COLLECTIONS_COLLECT)) {
      throw new ForbiddenException('Recovery likhne ki permission nahi (collections.collect)');
    }
    const tenantId = user.tenantId;
    const seen = await this.prisma.distCollection.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef: c.clientRef.trim() } }, select: { id: true } });
    if (seen) return { status: 'duplicate', id: seen.id };
    const sheet = await this.prisma.loadSheet.findFirst({ where: { id: c.loadSheetId, tenantId }, select: { deliveryUserId: true, status: true, number: true } });
    if (!sheet || sheet.deliveryUserId !== user.id) throw new ForbiddenException('Ye load sheet aap ki nahi');
    if (sheet.status !== 'DISPATCHED') throw new BadRequestException(`Load sheet ${sheet.number} ${sheet.status} hai`);
    const res = await this.collections.create(
      user,
      {
        clientRef: c.clientRef, customerId: c.customerId, amount: c.amount, method: c.method, reference: c.reference,
        bankName: c.bankName, chequeNo: c.chequeNo, chequeDate: c.chequeDate,
        note: c.note?.trim() || 'Recovery (delivery)', loadSheetId: c.loadSheetId, collectedAt: c.collectedAt,
        latitude: c.latitude, longitude: c.longitude,
      },
      { kind: 'RECOVERY' },
    );
    return { status: res.duplicate ? 'duplicate' : 'ok', id: res.collection.id };
  }

  private async one(kind: DeliverySyncResult['kind'], clientRef: string | undefined, run: () => Promise<Omit<DeliverySyncResult, 'kind' | 'clientRef'>>): Promise<DeliverySyncResult> {
    const ref = clientRef?.trim() || null;
    if (!ref) return { kind, clientRef: null, status: 'conflict', reason: 'clientRef nahi hai — app update karein' };
    try {
      return { kind, clientRef: ref, ...(await run()) };
    } catch (e) {
      if (e instanceof HttpException && e.getStatus() < 500) {
        const body = e.getResponse() as { message?: string | string[] } | string;
        const msg = typeof body === 'string' ? body : Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? e.message;
        return { kind, clientRef: ref, status: 'conflict', reason: msg };
      }
      this.logger.warn(`Delivery sync ${kind} ${ref} failed: ${(e as Error)?.message}`);
      return { kind, clientRef: ref, status: 'error', reason: 'Server par masla — thori der baad dobara sync karein' };
    }
  }
}
