/**
 * Read side of sale returns: the filtered record with totals for the whole
 * filter, analytics by reason, product, staff, day and refund method, the
 * bill finder for a new return, and the per-return extras (khata part,
 * what went back on the shelf, IMEIs, who approved).
 *
 * Periods are business days in the shop's own time zone.
 */

import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { businessDayKey } from '../../../common/helpers/business-time.helper';
import { periodRange } from '../../inventory/taxonomy/taxonomy.helper';
import { ListReturnsDto } from './dto/list-returns.dto';
import { PIN_APPROVAL_ACTION, r2, r3 } from './returns.helpers';

const KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
/** Keeps `IN (...)` lists well under the database's parameter limit. */
const CHUNK = 5000;

const ROW_INCLUDE = {
  sale: {
    select: {
      id: true, saleNumber: true, soldAt: true, total: true, paymentMethod: true, status: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  },
  createdBy: { select: { id: true, fullName: true } },
  shop: { select: { id: true, name: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, unit: true, sku: true } },
      saleItem: { select: { quantity: true, variantLink: { select: { variant: { select: { name: true } } } } } },
    },
  },
} satisfies Prisma.SaleReturnInclude;

type Row = Prisma.SaleReturnGetPayload<{ include: typeof ROW_INCLUDE }>;

export interface ItemExtras { restockedQty: number; writtenOffQty: number; units: string[] }
export interface ReturnExtras { khataAmount: number; approvedBy: string | null; items: Map<string, ItemExtras> }

const chunks = <T>(list: T[]) => Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) => list.slice(i * CHUNK, (i + 1) * CHUNK));

@Injectable()
export class ReturnsRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /* ───────────────────────── filters ───────────────────────── */

  private async range(tenantId: string, from?: string, to?: string) {
    if (from && to && KEY.test(from) && KEY.test(to)) return periodRange(this.tz, tenantId, from, to);
    return undefined;
  }

  /** Sale lines whose IMEI or serial matches the text. */
  private async linesByUnit(tenantId: string, code: string): Promise<string[]> {
    if (code.length < 4) return [];
    const like = { contains: code, mode: 'insensitive' as const };
    const [imeis, serials] = await Promise.all([
      this.prisma.productImei.findMany({
        where: { tenantId, saleItemId: { not: null }, OR: [{ imei1: like }, { imei2: like }, { serialNumber: like }] },
        select: { saleItemId: true }, take: 50,
      }),
      this.prisma.electronicsSerialTracking.findMany({
        where: { tenantId, saleItemId: { not: null }, OR: [{ serialNumber: like }, { imei: like }, { imei2: like }] },
        select: { saleItemId: true }, take: 50,
      }),
    ]);
    return [...imeis, ...serials].map((x) => x.saleItemId!).filter(Boolean);
  }

  private async where(user: AuthenticatedUser, scope: ShopScope, q: ListReturnsDto): Promise<Prisma.SaleReturnWhereInput> {
    const returnedAt = await this.range(user.tenantId, q.from, q.to);
    const s = q.search?.trim();
    const and: Prisma.SaleReturnWhereInput[] = [];
    if (s) {
      const like = { contains: s, mode: 'insensitive' as const };
      const units = await this.linesByUnit(user.tenantId, s);
      and.push({
        OR: [
          { returnNumber: like }, { reason: like }, { notes: like },
          { sale: { saleNumber: like } },
          { sale: { customer: { OR: [{ name: like }, { phone: like }] } } },
          { items: { some: { product: { OR: [{ name: like }, { sku: like }, { barcode: like }] } } } },
          ...(units.length ? [{ items: { some: { saleItemId: { in: units } } } }] : []),
        ],
      });
    }
    if (q.reason) {
      and.push(q.reason === 'none'
        ? { OR: [{ reason: null }, { reason: '' }] }
        : { reason: { equals: q.reason, mode: 'insensitive' } });
    }
    return {
      tenantId: user.tenantId,
      ...scope.whereLoose,
      ...(returnedAt && { returnedAt }),
      ...(q.method && { refundMethod: q.method }),
      ...(q.staffId && { createdById: q.staffId }),
      ...(and.length && { AND: and }),
    };
  }

  /* ───────────────────────── extras ───────────────────────── */

  /** Khata part, approval, and per line: what went back on the shelf and the IMEIs/serials. */
  async extras(
    tenantId: string,
    rows: Array<{ id: string; returnNumber: string; items: Array<{ id: string; saleItemId: string; productId: string; quantity: number }> }>,
  ): Promise<Map<string, ReturnExtras>> {
    const numbers = rows.map((r) => r.returnNumber);
    const lineIds = rows.flatMap((r) => r.items.map((i) => i.saleItemId));
    const [damage, ledger, approvals, imeis, serials] = await Promise.all([
      numbers.length ? this.prisma.stockMovement.findMany({
        where: { tenantId, type: 'DAMAGE', reference: { in: numbers } },
        select: { reference: true, productId: true, quantity: true },
      }) : [],
      numbers.length ? this.prisma.customerLedger.findMany({
        where: { tenantId, type: 'REFUND', reference: { in: numbers } },
        select: { reference: true, amount: true },
      }) : [],
      rows.length ? this.prisma.activityLog.findMany({
        where: { tenantId, action: PIN_APPROVAL_ACTION, entityType: 'SaleReturn', entityId: { in: rows.map((r) => r.id) } },
        select: { entityId: true },
      }) : [],
      lineIds.length ? this.prisma.productImei.findMany({ where: { tenantId, saleItemId: { in: lineIds } }, select: { saleItemId: true, imei1: true } }) : [],
      lineIds.length ? this.prisma.electronicsSerialTracking.findMany({ where: { tenantId, saleItemId: { in: lineIds } }, select: { saleItemId: true, serialNumber: true } }) : [],
    ]);

    const off = new Map<string, number>();
    for (const m of damage) off.set(`${m.reference}|${m.productId}`, (off.get(`${m.reference}|${m.productId}`) ?? 0) + Math.abs(m.quantity));
    const khata = new Map<string, number>();
    for (const l of ledger) if (l.reference) khata.set(l.reference, (khata.get(l.reference) ?? 0) - l.amount);
    const approved = new Set(approvals.map((a) => a.entityId));
    const units = new Map<string, string[]>();
    for (const u of [...imeis.map((i) => [i.saleItemId, i.imei1]), ...serials.map((s) => [s.saleItemId, s.serialNumber])]) {
      if (u[0]) units.set(u[0], [...(units.get(u[0]) ?? []), u[1]!]);
    }

    const out = new Map<string, ReturnExtras>();
    for (const r of rows) {
      const items = new Map<string, ItemExtras>();
      for (const i of r.items) {
        const key = `${r.returnNumber}|${i.productId}`;
        const left = off.get(key) ?? 0;
        const writtenOffQty = Math.min(i.quantity, left);
        off.set(key, left - writtenOffQty);
        items.set(i.id, { restockedQty: r3(i.quantity - writtenOffQty), writtenOffQty: r3(writtenOffQty), units: units.get(i.saleItemId) ?? [] });
      }
      out.set(r.id, { khataAmount: r2(khata.get(r.returnNumber) ?? 0), approvedBy: approved.has(r.id) ? 'Malik ka PIN' : null, items });
    }
    return out;
  }

  private shape(r: Row, x: ReturnExtras) {
    const items = r.items.map((i) => {
      const e = x.items.get(i.id)!;
      return {
        id: i.id, saleItemId: i.saleItemId, productId: i.productId,
        name: i.product.name, unit: i.product.unit, sku: i.product.sku,
        variant: i.saleItem?.variantLink?.variant?.name ?? null,
        quantity: i.quantity, soldQty: i.saleItem?.quantity ?? null, refundPrice: i.refundPrice, total: i.total,
        restockedQty: e.restockedQty, writtenOffQty: e.writtenOffQty, units: e.units,
      };
    });
    return {
      id: r.id, returnNumber: r.returnNumber, returnedAt: r.returnedAt, reason: r.reason, notes: r.notes,
      refundAmount: r.refundAmount, refundMethod: r.refundMethod,
      khataAmount: x.khataAmount, payout: r2(r.refundAmount - x.khataAmount), approvedBy: x.approvedBy,
      sale: r.sale, shop: r.shop, createdBy: r.createdBy,
      qty: r3(items.reduce((s, i) => s + i.quantity, 0)),
      restockedQty: r3(items.reduce((s, i) => s + i.restockedQty, 0)),
      writtenOffQty: r3(items.reduce((s, i) => s + i.writtenOffQty, 0)),
      items,
    };
  }

  /* ───────────────────────── totals ───────────────────────── */

  /** Sales of the same period and branch, for the return rate. */
  private async sales(user: AuthenticatedUser, scope: ShopScope, q: ListReturnsDto) {
    const soldAt = await this.range(user.tenantId, q.from, q.to);
    const agg = await this.prisma.sale.aggregate({
      where: { tenantId: user.tenantId, ...scope.where, status: { not: 'VOIDED' }, ...(soldAt && { soldAt }) },
      _sum: { total: true }, _count: { _all: true },
    });
    return { total: r2(Number(agg._sum.total ?? 0)), bills: agg._count._all };
  }

  private async totals(user: AuthenticatedUser, scope: ShopScope, q: ListReturnsDto, where: Prisma.SaleReturnWhereInput) {
    const tenantId = user.tenantId;
    const [agg, qty, keys, sales] = await Promise.all([
      this.prisma.saleReturn.aggregate({ where, _sum: { refundAmount: true }, _count: { _all: true } }),
      this.prisma.saleReturnItem.aggregate({ where: { return: { is: where } }, _sum: { quantity: true } }),
      this.prisma.saleReturn.findMany({ where, select: { returnNumber: true, saleId: true } }),
      this.sales(user, scope, q),
    ]);
    let writtenOff = 0;
    let khata = 0;
    for (const part of chunks(keys.map((k) => k.returnNumber))) {
      const [d, l] = await Promise.all([
        this.prisma.stockMovement.aggregate({ where: { tenantId, type: 'DAMAGE', reference: { in: part } }, _sum: { quantity: true } }),
        this.prisma.customerLedger.aggregate({ where: { tenantId, type: 'REFUND', reference: { in: part } }, _sum: { amount: true } }),
      ]);
      writtenOff += Math.abs(Number(d._sum.quantity ?? 0));
      khata -= Number(l._sum.amount ?? 0);
    }
    const refunded = r2(Number(agg._sum.refundAmount ?? 0));
    const items = r3(Number(qty._sum.quantity ?? 0));
    const bills = new Set(keys.map((k) => k.saleId)).size;
    return {
      count: agg._count._all,
      refunded,
      khata: r2(khata),
      payout: r2(refunded - khata),
      qty: items,
      restockedQty: r3(Math.max(0, items - writtenOff)),
      writtenOffQty: r3(writtenOff),
      bills,
      salesTotal: sales.total,
      salesBills: sales.bills,
      /** Refunded money as a share of sales in the same period and branch. */
      rate: sales.total > 0 ? r2((refunded / sales.total) * 100) : 0,
      /** Bills with a return as a share of all bills. */
      billRate: sales.bills > 0 ? r2((bills / sales.bills) * 100) : 0,
    };
  }

  /* ───────────────────────── record ───────────────────────── */

  async records(user: AuthenticatedUser, scope: ShopScope, q: ListReturnsDto) {
    const where = await this.where(user, scope, q);
    const page = q.page ?? 1;
    const limit = q.limit ?? 30;
    const [total, rows, totals] = await Promise.all([
      this.prisma.saleReturn.count({ where }),
      this.prisma.saleReturn.findMany({ where, orderBy: { returnedAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: ROW_INCLUDE }),
      this.totals(user, scope, q, where),
    ]);
    const extras = await this.extras(user.tenantId, rows);
    return {
      items: rows.map((r) => this.shape(r, extras.get(r.id)!)),
      total, page, pages: Math.max(1, Math.ceil(total / limit)), totals,
    };
  }

  /* ───────────────────────── analytics ───────────────────────── */

  async analytics(user: AuthenticatedUser, scope: ShopScope, q: ListReturnsDto) {
    const tenantId = user.tenantId;
    const filter = { ...q, page: undefined, limit: undefined };
    const where = await this.where(user, scope, filter);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const [rows, totals] = await Promise.all([
      this.prisma.saleReturn.findMany({
        where,
        select: {
          returnedAt: true, reason: true, refundAmount: true, refundMethod: true, createdById: true,
          createdBy: { select: { fullName: true } },
          items: { select: { productId: true, quantity: true, total: true, product: { select: { name: true, unit: true } } } },
        },
      }),
      this.totals(user, scope, filter, where),
    ]);

    type Bucket = { key: string; label: string; count: number; value: number; qty: number };
    const add = (m: Map<string, Bucket>, key: string, label: string, value: number, qty: number, count = 1) => {
      const b = m.get(key) ?? { key, label, count: 0, value: 0, qty: 0 };
      b.count += count; b.value += value; b.qty += qty;
      m.set(key, b);
    };
    const done = (m: Map<string, Bucket>, take = 12) => [...m.values()]
      .map((b) => ({ ...b, value: r2(b.value), qty: r3(b.qty) }))
      .sort((a, b) => b.value - a.value || b.count - a.count)
      .slice(0, take);

    const reasons = new Map<string, Bucket>();
    const methods = new Map<string, Bucket>();
    const staff = new Map<string, Bucket>();
    const products = new Map<string, Bucket & { unit: string }>();
    const days = new Map<string, { key: string; refunded: number; count: number }>();
    for (const r of rows) {
      const qty = r.items.reduce((s, i) => s + i.quantity, 0);
      const reason = r.reason?.trim();
      add(reasons, reason ? reason.toLowerCase() : 'none', reason || 'Wajah nahi likhi', r.refundAmount, qty);
      add(methods, r.refundMethod, r.refundMethod, r.refundAmount, qty);
      add(staff, r.createdById ?? 'none', r.createdBy?.fullName ?? 'Pata nahi', r.refundAmount, qty);
      for (const i of r.items) {
        const p = products.get(i.productId) ?? { key: i.productId, label: i.product.name, unit: i.product.unit, count: 0, value: 0, qty: 0 };
        p.count += 1; p.value += i.total; p.qty += i.quantity;
        products.set(i.productId, p);
      }
      const key = businessDayKey(r.returnedAt, tz, dayStartHour);
      const d = days.get(key) ?? { key, refunded: 0, count: 0 };
      d.refunded += r.refundAmount; d.count += 1;
      days.set(key, d);
    }

    // Each top product's return rate against what sold in the same period and branch.
    const top = [...products.values()].sort((a, b) => b.qty - a.qty || b.value - a.value).slice(0, 10);
    const soldAt = await this.range(tenantId, q.from, q.to);
    const sold = top.length ? await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: top.map((t) => t.key) },
        sale: { tenantId, ...scope.where, status: { not: 'VOIDED' }, ...(soldAt && { soldAt }) },
      },
      _sum: { quantity: true },
    }) : [];
    const soldBy = new Map(sold.map((s) => [s.productId, Number(s._sum.quantity ?? 0)]));

    return {
      totals,
      trend: this.fillDays(days, q.from, q.to).map((d) => ({ ...d, refunded: r2(d.refunded) })),
      byReason: done(reasons),
      byMethod: done(methods).map((m) => ({ ...m, key: m.key as PaymentMethod })),
      byStaff: done(staff),
      byProduct: top.map((t) => {
        const soldQty = soldBy.get(t.key) ?? 0;
        return { ...t, value: r2(t.value), qty: r3(t.qty), soldQty: r3(soldQty), rate: soldQty > 0 ? r2((t.qty / soldQty) * 100) : null };
      }),
    };
  }

  /** Every business day of a short range, with zeros where nothing came back. */
  private fillDays(days: Map<string, { key: string; refunded: number; count: number }>, from?: string, to?: string) {
    if (from && to && KEY.test(from) && KEY.test(to)) {
      const start = Date.parse(`${from}T00:00:00Z`);
      const end = Date.parse(`${to}T00:00:00Z`);
      if (end >= start && (end - start) / DAY <= 92) {
        const out: Array<{ key: string; refunded: number; count: number }> = [];
        for (let t = start; t <= end; t += DAY) {
          const key = new Date(t).toISOString().slice(0, 10);
          out.push(days.get(key) ?? { key, refunded: 0, count: 0 });
        }
        return out;
      }
    }
    return [...days.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  /* ───────────────────────── bill finder ───────────────────────── */

  /** Bills for a new return: by bill number, customer name or phone, or an IMEI/serial on the bill. */
  async findBills(user: AuthenticatedUser, scope: ShopScope, code?: string) {
    const s = code?.trim() ?? '';
    if (s.length < 2) return [];
    const like = { contains: s, mode: 'insensitive' as const };
    const units = await this.linesByUnit(user.tenantId, s);
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.where,
        status: { not: 'VOIDED' },
        OR: [
          { saleNumber: like },
          { customer: { OR: [{ name: like }, { phone: like }] } },
          ...(units.length ? [{ items: { some: { id: { in: units } } } }] : []),
        ],
      },
      orderBy: { soldAt: 'desc' },
      take: 8,
      select: {
        id: true, saleNumber: true, soldAt: true, total: true, status: true,
        customer: { select: { name: true, phone: true } },
        shop: { select: { name: true } },
        items: { select: { quantity: true, returnedQty: true } },
      },
    });
    const exact = s.toLowerCase();
    return sales
      .map(({ items, ...b }) => ({
        ...b,
        lines: items.length,
        returnableQty: r3(items.reduce((t, i) => t + Math.max(0, i.quantity - i.returnedQty), 0)),
        exact: b.saleNumber.toLowerCase() === exact,
      }))
      .sort((a, b) => Number(b.exact) - Number(a.exact));
  }
}
