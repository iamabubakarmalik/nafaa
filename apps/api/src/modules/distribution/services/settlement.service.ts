/**
 * Load sheet settlement: when the van comes back, each invoice is marked
 * delivered, partly delivered or returned, and the cash is counted.
 *
 *   1. Goods that came back go through ReturnsService against the invoice,
 *      so stock, batches and the khata follow the same rules as a counter
 *      return. The invoice is a credit bill, so the return lowers the khata
 *      instead of paying cash out.
 *   2. Cash taken against the invoice is recorded and posted to the khata
 *      at once (the person settling has counted it).
 *   3. Recoveries the van brought back are recorded; they post now only
 *      when verified here (needs collections.verify) or when the settings
 *      do not ask for verification.
 *   4. Expected cash (cash-method money of the trip) minus the cash handed in
 *      is the short (positive) or excess (negative).
 *
 * Invoices can be settled over several calls; the sheet is SETTLED when the
 * last invoice is done and the handed-in cash is known. Each invoice is
 * settled once.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { refreshSettlements } from '../../../common/helpers/sale-settlement.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ReturnsService } from '../../sales/returns/returns.service';
import { SettleLoadSheetDto, SettleOrderDto } from '../dto/field.dto';
import { readSettings } from '../helpers/pricing-loader';
import { postCollection, r2, r4, returnPlan, userNames, type ReturnLineInput } from '../distribution.support';
import { LoadSheetsService } from './load-sheets.service';
import { CollectionsService } from './collections.service';

type SheetOrder = Prisma.SalesOrderGetPayload<{ include: { items: true } }>;
type DeliveryReport = Prisma.DistDeliveryReportGetPayload<object>;

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly returns: ReturnsService,
    private readonly sheets: LoadSheetsService,
    private readonly collections: CollectionsService,
  ) {}

  /** What settling this sheet looks like now: each invoice, its value per base unit, money so far. */
  async preview(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const sheet = await this.sheets.get(user, id);
    const orders = await this.prisma.salesOrder.findMany({ where: { tenantId, loadSheetId: id }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
    const productIds = [...new Set(orders.flatMap((o) => o.items.flatMap((i) => [i.productId, ...(i.freeProductId ? [i.freeProductId] : [])])))];
    const [products, collections, reports] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, unit: true } }),
      this.prisma.distCollection.findMany({ where: { tenantId, loadSheetId: id, status: { not: 'REJECTED' } } }),
      this.prisma.distDeliveryReport.findMany({ where: { tenantId, salesOrderId: { in: orders.map((o) => o.id) } } }),
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const card = new Map(sheet.orders.map((o) => [o.id, o]));
    const reportOf = new Map(reports.map((r) => [r.salesOrderId, r]));
    // Same order as the sheet and the delivery app: route visit order.
    const pos = new Map(sheet.orders.map((o, i) => [o.id, i]));
    orders.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
    const reporters = await userNames(this.prisma, tenantId, reports.map((r) => r.reportedById));
    const collectors = await userNames(this.prisma, tenantId, collections.map((c) => c.collectedById));
    return {
      sheet: { ...sheet, orders: undefined },
      orders: orders.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, saleId: o.saleId, saleNumber: card.get(o.id)?.saleNumber ?? null,
        customer: card.get(o.id)?.customer ?? null, total: o.total, status: o.status, deliveryStatus: o.deliveryStatus,
        cashCollected: o.cashCollected, returnsValue: o.returnsValue, settled: !!o.deliveryStatus,
        items: o.items.map((i) => ({
          id: i.id, productId: i.productId, productName: pMap.get(i.productId)?.name ?? null, baseUnit: pMap.get(i.productId)?.unit ?? 'pcs',
          unitName: i.unitName, conversionRate: i.conversionRate, qty: i.qty, baseQty: i.baseQty, total: i.total,
          netPerBase: i.baseQty > 0 ? r4(i.total / i.baseQty) : 0,
          freeBaseQty: i.freeBaseQty, freeProductId: i.freeProductId,
          freeProductName: i.freeProductId ? pMap.get(i.freeProductId)?.name ?? null : null,
          deliveredBaseQty: i.deliveredBaseQty, deliveredFreeQty: i.deliveredFreeQty,
        })),
        report: reportOf.has(o.id) ? this.reportView(reportOf.get(o.id)!, reporters) : null,
      })),
      collections: collections.map((c) => ({ ...c, collectedByName: collectors.get(c.collectedById) ?? null })),
      deliveryReport: this.reportSummary(reports, orders.length, reporters),
      money: this.money(collections, sheet.handedIn),
    };
  }

  async settle(user: AuthenticatedUser, id: string, dto: SettleLoadSheetDto) {
    const tenantId = user.tenantId;
    const sheet = await this.sheets.sheet(tenantId, id);
    if (sheet.status !== 'OPEN' && sheet.status !== 'DISPATCHED') throw new BadRequestException(`${sheet.status} load sheet settle nahi ho sakti`);
    const settings = await readSettings(this.prisma, tenantId);
    const canVerify = hasPermission(user.role, user.permissions, PERMISSIONS.DISTRIBUTION_COLLECTIONS_VERIFY);
    if (dto.verifyRecoveries && !canVerify) throw new BadRequestException('Recovery verify karne ki permission nahi (collections.verify)');

    const orders = await this.prisma.salesOrder.findMany({ where: { tenantId, loadSheetId: id }, include: { items: true } });
    const byId = new Map(orders.map((o) => [o.id, o]));
    const results: Array<{ orderId: string; orderNumber: string | null; ok: boolean; status?: string; returnsValue?: number; error?: string }> = [];
    const touched = new Set<string>();

    for (const s of dto.orders) {
      const order = byId.get(s.orderId);
      if (!order) { results.push({ orderId: s.orderId, orderNumber: null, ok: false, error: 'Order is load sheet par nahi' }); continue; }
      try {
        const res = await this.settleOrder(user, sheet, order, s, dto.managerPin);
        touched.add(order.customerId);
        results.push({ orderId: order.id, orderNumber: order.orderNumber, ok: true, status: res.status, returnsValue: res.returnsValue });
      } catch (e: any) {
        results.push({ orderId: order.id, orderNumber: order.orderNumber, ok: false, error: e?.message ?? 'Settle nahi hua' });
      }
    }

    const recoveries = [];
    for (const r of dto.recoveries ?? []) {
      try {
        const { collection } = await this.collections.create(
          user,
          { customerId: r.customerId, amount: r.amount, method: r.method, reference: r.reference, loadSheetId: id, note: 'Load sheet recovery' },
          { kind: 'RECOVERY', autoVerify: !!dto.verifyRecoveries || settings?.recoveryNeedsVerify === false, collectedById: sheet.deliveryUserId ?? user.id },
        );
        recoveries.push({ customerId: r.customerId, ok: true, id: collection.id, status: collection.status });
        if (collection.status === 'VERIFIED') touched.add(r.customerId);
      } catch (e: any) {
        recoveries.push({ customerId: r.customerId, ok: false, error: e?.message ?? 'Recovery save nahi hui' });
      }
    }
    // Recoveries recorded on the van's phone against this sheet, verified here when asked.
    if (dto.verifyRecoveries) {
      const pending = await this.prisma.distCollection.findMany({ where: { tenantId, loadSheetId: id, status: 'PENDING' } });
      for (const c of pending) {
        if (await this.prisma.$transaction((tx) => postCollection(tx, c, user.id))) touched.add(c.customerId);
      }
    }

    const sheetAfter = await this.closeIfDone(user, id, dto.handedIn, dto.note);
    for (const customerId of touched) refreshSettlements(this.prisma, tenantId, customerId);
    return { results, recoveries, sheet: sheetAfter };
  }

  private async settleOrder(user: AuthenticatedUser, sheet: { id: string; deliveryUserId: string | null }, order: SheetOrder, s: SettleOrderDto, managerPin?: string) {
    if (order.deliveryStatus) throw new BadRequestException(`Order ${order.orderNumber} pehle hi settle ho chuka (${order.deliveryStatus})`);
    if (!order.saleId) throw new BadRequestException(`Order ${order.orderNumber} ki Invoice nahi bani`);
    const outcome = s.outcome as 'DELIVERED' | 'PARTIAL' | 'RETURNED';
    const cash = r2(s.cashCollected ?? 0);
    // What comes back, per order line, in base units.
    const back = returnPlan(order, outcome, cash, s.lines);

    // 1. Returns against the invoice.
    let returnsValue = 0;
    let returnId: string | null = null;
    const returnItems: Array<{ saleItemId: string; quantity: number; restock: boolean }> = [];
    for (const it of order.items) {
      const b = back.get(it.id);
      if (!b) continue;
      if (b.paid > 0) {
        if (!it.saleItemId) throw new BadRequestException(`${order.orderNumber}: Invoice line nahi mili`);
        returnItems.push({ saleItemId: it.saleItemId, quantity: b.paid, restock: !b.damaged });
      }
      if (b.free > 0) {
        if (!it.freeSaleItemId) throw new BadRequestException(`${order.orderNumber}: free maal ki Invoice line nahi mili`);
        returnItems.push({ saleItemId: it.freeSaleItemId, quantity: b.free, restock: !b.damaged });
      }
    }
    if (returnItems.length) {
      // A return already made for this order (an earlier try that failed after it) is reused, not made again.
      const tag = `Settlement ${order.orderNumber}`;
      const earlier = await this.prisma.saleReturn.findFirst({ where: { tenantId: order.tenantId, saleId: order.saleId, notes: tag }, select: { id: true, refundAmount: true } });
      const ret = earlier ?? await this.returns.create(user, new ShopScope(null, true), {
        saleId: order.saleId, refundMethod: 'CASH', items: returnItems, managerPin, notes: tag,
        reason: s.returnReason?.trim() || (outcome === 'RETURNED' ? 'Delivery nahi hui — maal wapas' : 'Delivery par kuch maal wapas'),
      } as never);
      returnsValue = r2(Number((ret as { refundAmount?: number }).refundAmount ?? 0));
      returnId = (ret as { id?: string }).id ?? null;
    }

    // 2. Invoice cash, posted now, and the order's outcome, together.
    const status = outcome;
    await this.prisma.$transaction(async (tx) => {
      if (cash > 0) {
        const c = await tx.distCollection.create({
          data: {
            tenantId: order.tenantId, customerId: order.customerId, loadSheetId: sheet.id, saleId: order.saleId, salesOrderId: order.id,
            kind: 'INVOICE_CASH', amount: cash, method: s.method ?? 'CASH', status: 'PENDING', shopId: order.shopId,
            collectedById: sheet.deliveryUserId ?? user.id, note: 'Delivery par payment',
          },
        });
        await postCollection(tx, c, user.id);
      }
      for (const it of order.items) {
        const b = back.get(it.id);
        await tx.salesOrderItem.update({
          where: { id: it.id },
          data: { deliveredBaseQty: r4(it.baseQty - (b?.paid ?? 0)), deliveredFreeQty: r4(it.freeBaseQty - (b?.free ?? 0)) },
        });
      }
      const done = await tx.salesOrder.updateMany({
        where: { id: order.id, deliveryStatus: null },
        data: {
          status, deliveryStatus: outcome, deliveredAt: new Date(), cashCollected: cash, returnsValue, returnId,
          returnReason: s.returnReason?.trim() || null,
        },
      });
      if (!done.count) throw new BadRequestException(`Order ${order.orderNumber} pehle hi settle ho chuka`);
      // The delivery man's report is closed: USED when the office kept it, CHANGED when it did not.
      const report = await tx.distDeliveryReport.findUnique({ where: { tenantId_salesOrderId: { tenantId: order.tenantId, salesOrderId: order.id } } });
      if (report && report.status === 'PENDING') {
        const same = this.sameAsReport(order, report, outcome, cash, s.method ?? 'CASH', back);
        await tx.distDeliveryReport.update({ where: { id: report.id }, data: { status: same ? 'USED' : 'CHANGED', settledAt: new Date() } });
      }
    });
    return { status, returnsValue };
  }

  private reportView(r: DeliveryReport, names: Map<string, string>) {
    return {
      id: r.id, outcome: r.outcome, lines: (r.lines as ReturnLineInput[] | null) ?? [], cashCollected: r.cashCollected, method: r.method,
      returnReason: r.returnReason, note: r.note, reportedAt: r.reportedAt, reportedById: r.reportedById,
      reportedByName: names.get(r.reportedById) ?? null, latitude: r.latitude, longitude: r.longitude, status: r.status,
    };
  }

  /** Sheet-level view of the phone reports, for the office's "Delivery wale ki report" box. */
  private reportSummary(reports: DeliveryReport[], invoices: number, names: Map<string, string>) {
    if (!reports.length) return null;
    const last = reports.reduce((a, b) => (a.reportedAt > b.reportedAt ? a : b));
    const count = (o: string) => reports.filter((r) => r.outcome === o).length;
    return {
      invoices, reported: reports.length, pending: reports.filter((r) => r.status === 'PENDING').length,
      delivered: count('DELIVERED'), partial: count('PARTIAL'), returned: count('RETURNED'),
      cash: r2(reports.filter((r) => r.method === 'CASH').reduce((s, r) => s + r.cashCollected, 0)),
      otherMoney: r2(reports.filter((r) => r.method !== 'CASH').reduce((s, r) => s + r.cashCollected, 0)),
      reportedByName: names.get(last.reportedById) ?? null, lastReportedAt: last.reportedAt,
    };
  }

  /** True when the office settled the invoice exactly as the delivery man reported it. */
  private sameAsReport(order: SheetOrder, r: DeliveryReport, outcome: string, cash: number, method: string, back: Map<string, { paid: number; free: number; damaged: boolean }>) {
    if (r.outcome !== outcome || r2(r.cashCollected) !== cash || (cash > 0 && r.method !== method)) return false;
    let reported: Map<string, { paid: number; free: number; damaged: boolean }>;
    try { reported = returnPlan(order, r.outcome, r.cashCollected, (r.lines as ReturnLineInput[] | null) ?? undefined); } catch { return false; }
    if (reported.size !== back.size) return false;
    for (const [id, b] of back) {
      const x = reported.get(id);
      if (!x || x.paid !== b.paid || x.free !== b.free || x.damaged !== b.damaged) return false;
    }
    return true;
  }

  private money(collections: Array<{ kind: string; method: string; amount: number; status: string }>, handedIn: number | null) {
    const live = collections.filter((c) => c.status !== 'REJECTED');
    const sum = (f: (c: (typeof live)[number]) => boolean) => r2(live.filter(f).reduce((s, c) => s + c.amount, 0));
    const expectedCash = sum((c) => c.method === 'CASH');
    return {
      invoiceCollected: sum((c) => c.kind === 'INVOICE_CASH'),
      recoveries: sum((c) => c.kind === 'RECOVERY'),
      recoveriesPending: sum((c) => c.kind === 'RECOVERY' && c.status === 'PENDING'),
      expectedCash,
      handedIn,
      short: handedIn == null ? null : r2(expectedCash - handedIn),
    };
  }

  /** Recomputes the sheet's money; SETTLED once every invoice is settled and the cash handed in is known. */
  private async closeIfDone(user: AuthenticatedUser, id: string, handedIn?: number, note?: string) {
    const tenantId = user.tenantId;
    await this.prisma.$transaction(async (tx) => {
      const sheet = await tx.loadSheet.findUniqueOrThrow({ where: { id } });
      const [orders, collections] = await Promise.all([
        tx.salesOrder.findMany({ where: { tenantId, loadSheetId: id }, select: { deliveryStatus: true, returnsValue: true } }),
        tx.distCollection.findMany({ where: { tenantId, loadSheetId: id, status: { not: 'REJECTED' } }, select: { kind: true, method: true, amount: true, status: true } }),
      ]);
      const hand = handedIn ?? sheet.handedIn;
      const m = this.money(collections, hand ?? null);
      const allDone = orders.length > 0 && orders.every((o) => !!o.deliveryStatus);
      await tx.loadSheet.update({
        where: { id },
        data: {
          collectedCash: m.invoiceCollected, recoveryCash: m.recoveries, expectedCash: m.expectedCash,
          returnsValue: r2(orders.reduce((s, o) => s + o.returnsValue, 0)),
          ...(handedIn != null && { handedIn }),
          shortAmount: m.short ?? 0,
          ...(note && { note: note.trim() }),
          ...(allDone && hand != null && sheet.status !== 'SETTLED' && { status: 'SETTLED', settledById: user.id, settledAt: new Date() }),
        },
      });
    });
    return this.sheets.get(user, id);
  }
}
