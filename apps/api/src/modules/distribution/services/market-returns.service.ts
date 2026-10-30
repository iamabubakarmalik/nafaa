/**
 * Market returns: goods a retailer hands back on the route (expired,
 * damaged, unsold). The booker or van salesman records them (PENDING); the
 * office approves them when the goods reach the godown.
 *
 * Approving posts, per line:
 *   1. Against the customer's own invoices first (newest bill with goods of
 *      that item still unreturned), through ReturnsService, so the bill,
 *      stock, batches, khata and profit follow the counter's return rules.
 *      Good stock goes back on the shelf; damaged / expired goods come back
 *      and go out as damage (a write-off). Money the khata could not absorb
 *      stays with the customer as an advance (a REFUND row on the khata,
 *      never cash out of a drawer).
 *   2. Whatever no invoice covers (goods bought before Nafaa): stock comes
 *      in, damaged / expired goods are written off as a stock adjustment
 *      (LOSS), and the value is credited to the khata as an ADJUSTMENT.
 *
 * Claimable lines (damaged / expired goods of a principal's brand by
 * default) are picked up later by claims.service at cost.
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { refreshSettlements } from '../../../common/helpers/sale-settlement.helper';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { ShopScope, applyStockDelta } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ReturnsService } from '../../sales/returns/returns.service';
import { tidyCustomerBalance } from '../../sales/returns/returns.helpers';
import { StockAdjustmentsService } from '../../inventory/stock-adjustments/stock-adjustments.service';
import { MARKET_RETURN_STATUSES } from '../distribution.constants';
import { CreateMarketReturnDto, ListMarketReturnsDto, MarketReturnLineDto } from '../dto/phase2.dto';
import { listPrice } from '../helpers/pricing';
import { loadCatalog, pricingFor, readSettings } from '../helpers/pricing-loader';
import { customerCards, dayRange, nextNumber, parseWhen, r2, r4, routeNames, shopNames, userNames } from '../distribution.support';
import { principalOfProducts } from './principals.service';

const EPS = 0.0001;

type ReturnWithItems = Prisma.DistMarketReturnGetPayload<{ include: { items: true } }>;

@Injectable()
export class MarketReturnsService {
  private readonly logger = new Logger(MarketReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly returns: ReturnsService,
    private readonly adjustments: StockAdjustmentsService,
  ) {}

  private can(user: AuthenticatedUser, p: string) {
    return hasPermission(user.role, user.permissions, p as never);
  }

  /* ───────────── record ───────────── */

  /** Records a market return (PENDING). The same clientRef is saved once. */
  async create(user: AuthenticatedUser, dto: CreateMarketReturnDto, opts: { vanSessionId?: string | null; shopId?: string | null } = {}) {
    const tenantId = user.tenantId;
    const clientRef = dto.clientRef?.trim() || null;
    if (clientRef) {
      const seen = await this.prisma.distMarketReturn.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } }, select: { id: true } });
      if (seen) return { marketReturn: await this.get(user, seen.id), duplicate: true };
    }
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true, routeId: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');

    let shopId = opts.shopId ?? null;
    let vanSessionId = opts.vanSessionId ?? null;
    if (!shopId && dto.vanId) {
      const van = await this.prisma.distVan.findFirst({ where: { id: dto.vanId, tenantId }, select: { shopId: true, id: true } });
      if (!van) throw new BadRequestException('Van nahi mili');
      shopId = van.shopId;
      vanSessionId = (await this.prisma.distVanSession.findFirst({ where: { tenantId, vanId: van.id, status: 'OPEN' }, select: { id: true } }))?.id ?? null;
    }
    if (!shopId && dto.shopId) {
      const s = await this.prisma.shop.findFirst({ where: { id: dto.shopId, tenantId, isActive: true }, select: { id: true } });
      if (!s) throw new BadRequestException('Godown nahi mila');
      shopId = s.id;
    }
    if (!shopId && customer.routeId) shopId = (await this.prisma.distRoute.findFirst({ where: { id: customer.routeId, tenantId }, select: { shopId: true } }))?.shopId ?? null;
    if (!shopId) shopId = (await readSettings(this.prisma, tenantId))?.defaultShopId ?? null;

    const lines = await this.priceLines(user, customer.id, dto.items);
    const clock = await this.tz.clock(tenantId);
    const now = new Date();
    const collectedAt = dto.collectedAt ? new Date(Math.min(new Date(dto.collectedAt).getTime(), now.getTime())) : now;
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const number = await nextNumber(tx, tenantId, 'return');
        const row = await tx.distMarketReturn.create({
          data: {
            tenantId, number, clientRef, customerId: customer.id, routeId: customer.routeId, shopId, vanSessionId,
            collectedById: user.id, collectedAt, status: 'PENDING', totalValue: r2(lines.reduce((s, l) => s + l.value, 0)),
            note: dto.note?.trim() || null, latitude: dto.latitude ?? null, longitude: dto.longitude ?? null,
            items: {
              create: lines.map((l, i) => ({
                productId: l.productId, variantId: l.variantId, unitId: l.unitId, unitName: l.unitName, conversionRate: l.conversionRate,
                qty: l.qty, baseQty: l.baseQty, rate: l.rate, value: l.value, costValue: l.costValue, condition: l.condition,
                reason: l.reason, batchNo: l.batchNo, expiryDate: parseWhen(l.expiryDate, clock), claimable: l.claimable, supplierId: l.supplierId, sortOrder: i,
              })),
            },
          },
          select: { id: true },
        });
        return row.id;
      });
      if (dto.approve) {
        if (!this.can(user, PERMISSIONS.DISTRIBUTION_RETURNS_APPROVE)) throw new ForbiddenException('Return approve karne ki permission nahi (returns.approve)');
        const res = await this.approve(user, [id], dto.managerPin);
        if (!res.results[0]?.ok) throw new BadRequestException(res.results[0]?.error ?? 'Approve nahi hua');
      }
      return { marketReturn: await this.get(user, id), duplicate: false };
    } catch (e) {
      if (clientRef && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const seen = await this.prisma.distMarketReturn.findUnique({ where: { tenantId_clientRef: { tenantId, clientRef } }, select: { id: true } });
        if (seen) return { marketReturn: await this.get(user, seen.id), duplicate: true };
      }
      throw e;
    }
  }

  /**
   * Credit rate of each line: the price on the customer's latest invoice of
   * that item (after its discounts), else their price list. A typed rate is
   * kept only for someone who can approve returns.
   */
  private async priceLines(user: AuthenticatedUser, customerId: string, items: MarketReturnLineDto[]) {
    const tenantId = user.tenantId;
    const productIds = items.map((i) => i.productId);
    const { catalog, list, tier } = await pricingFor(this.prisma, tenantId, { customerId, productIds });
    const principals = await principalOfProducts(this.prisma, tenantId, productIds);
    const lastLines = await this.prisma.saleItem.findMany({
      where: { productId: { in: productIds }, price: { gt: 0 }, sale: { tenantId, customerId, status: { not: 'VOIDED' } } },
      select: { productId: true, quantity: true, total: true, variantLink: { select: { variantId: true } } },
      orderBy: { createdAt: 'desc' }, take: 500,
    });
    const canRate = this.can(user, PERMISSIONS.DISTRIBUTION_RETURNS_APPROVE);
    return items.map((it) => {
      const product = catalog.products.get(it.productId) ?? null;
      if (!product) throw new BadRequestException('Item nahi mila ya band hai');
      const variant = it.variantId ? catalog.variants.get(it.variantId) ?? null : null;
      if (it.variantId && (!variant || variant.productId !== product.id)) throw new BadRequestException(`${product.name}: size/variant nahi mila`);
      const unit = it.unitId ? catalog.units.get(it.unitId) ?? null : null;
      if (it.unitId && (!unit || unit.productId !== product.id)) throw new BadRequestException(`${product.name}: pack nahi mila`);
      const rate = unit ? Number(unit.conversionRate) || 1 : 1;
      const baseQty = r4(it.qty * rate);
      const last = lastLines.find((l) => l.productId === product.id && (l.variantLink?.variantId ?? null) === (variant?.id ?? null) && l.quantity > 0);
      const fromInvoice = last ? last.total / last.quantity : null;
      const fromList = listPrice({ product, variant, unit: null, list, tier }).price;
      const perBase = canRate && it.rate != null ? it.rate / rate : fromInvoice ?? fromList;
      const cost = Number(variant?.costPrice) || Number(product.costPrice) || 0;
      const supplierId = it.supplierId || principals.get(product.id) || null;
      const condition = it.condition;
      return {
        productId: product.id, variantId: variant?.id ?? null, unitId: unit?.id ?? null, unitName: unit?.unitName ?? null, conversionRate: rate,
        qty: r4(it.qty), baseQty, rate: r4(perBase), value: r2(perBase * baseQty), costValue: r2(cost * baseQty), condition,
        reason: it.reason?.trim() || null, batchNo: it.batchNo?.trim() || null, expiryDate: it.expiryDate ?? null,
        claimable: it.claimable ?? (condition !== 'GOOD' && !!supplierId), supplierId,
      };
    });
  }

  /* ───────────── approve / reject ───────────── */

  async approve(user: AuthenticatedUser, ids: string[], managerPin?: string) {
    const results: Array<{ id: string; number: string | null; ok: boolean; status?: string; credited?: number; error?: string; needsPin?: boolean }> = [];
    for (const id of [...new Set(ids)]) {
      const mr = await this.prisma.distMarketReturn.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
      if (!mr) { results.push({ id, number: null, ok: false, error: 'Return nahi mili' }); continue; }
      if (mr.status !== 'PENDING') { results.push({ id, number: mr.number, ok: false, status: mr.status, error: `Pehle hi ${mr.status} hai` }); continue; }
      const claim = await this.prisma.distMarketReturn.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED', approvedById: user.id, approvedAt: new Date() } });
      if (!claim.count) { results.push({ id, number: mr.number, ok: false, error: 'Kisi aur ne abhi badla' }); continue; }
      try {
        const credited = await this.post(user, mr, managerPin);
        results.push({ id, number: mr.number, ok: true, status: 'APPROVED', credited });
      } catch (e: any) {
        const posted = await this.prisma.distMarketReturn.findUnique({ where: { id }, select: { saleReturnIds: true, ledgerId: true } });
        const nothingDone = !posted?.saleReturnIds.length && !posted?.ledgerId;
        if (nothingDone) await this.prisma.distMarketReturn.update({ where: { id }, data: { status: 'PENDING', approvedById: null, approvedAt: null } });
        else await this.prisma.distMarketReturn.update({ where: { id }, data: { note: [mr.note, `Adhoora: ${e?.message ?? 'masla'}`].filter(Boolean).join(' · ').slice(0, 500) } });
        const msg = e?.message ?? 'Approve nahi hua';
        results.push({ id, number: mr.number, ok: false, status: nothingDone ? 'PENDING' : 'APPROVED', error: msg, ...(/PIN/i.test(msg) && { needsPin: true }) });
      }
    }
    return { results, approved: results.filter((r) => r.ok).length, needsPin: results.some((r) => r.needsPin) };
  }

  async reject(user: AuthenticatedUser, ids: string[], reason?: string) {
    const results = [];
    for (const id of [...new Set(ids)]) {
      const done = await this.prisma.distMarketReturn.updateMany({
        where: { id, tenantId: user.tenantId, status: 'PENDING' },
        data: { status: 'REJECTED', rejectReason: reason?.trim() || null, approvedById: user.id, approvedAt: new Date() },
      });
      results.push(done.count ? { id, ok: true, status: 'REJECTED' } : { id, ok: false, error: 'Sirf PENDING return reject hoti hai' });
    }
    return { results, rejected: results.filter((r) => r.ok).length };
  }

  /** Posts an approved return: invoices first, the rest on its own. Returns the amount credited. */
  private async post(user: AuthenticatedUser, mr: ReturnWithItems, managerPin?: string): Promise<number> {
    const tenantId = user.tenantId;
    const plan = await this.matchInvoices(tenantId, mr);
    let credited = 0;
    const saleReturnIds: string[] = [];

    // 1. Against invoices, one return per bill.
    for (const { saleId, lines } of plan.bySale.values()) {
      const ret = await this.returns.create(user, new ShopScope(null, true), {
        saleId, refundMethod: 'CASH', managerPin, notes: `Market return ${mr.number}`,
        reason: `Market return ${mr.number}`,
        items: lines.map((l) => ({ saleItemId: l.saleItemId, quantity: l.qty, restock: l.condition === 'GOOD' })),
      } as never) as { id: string; returnNumber: string; refundAmount: number; payout?: number; khataAmount?: number; repeated?: boolean };
      // The counter's repeat guard hands back a return made seconds ago; within this approval that means two equal lines.
      if (ret.repeated && saleReturnIds.includes(ret.id)) throw new BadRequestException('Ek hi bill ki do barabar wapsi — 20 second baad dobara approve karein');
      saleReturnIds.push(ret.id);
      await this.prisma.distMarketReturn.update({ where: { id: mr.id }, data: { saleReturnIds: { push: ret.id } } });
      credited = r2(credited + Number(ret.refundAmount || 0));
      const payout = r2(Number(ret.payout ?? 0));
      if (payout > 0 && !ret.repeated) await this.keepAsAdvance(user, mr, ret.returnNumber, payout);
    }

    // 2. Goods no invoice covers.
    const loose = mr.items.map((it) => ({ it, qty: r4(it.baseQty - (plan.matched.get(it.id) ?? 0)) })).filter((x) => x.qty > EPS);
    if (loose.length) {
      if (!mr.shopId) throw new BadRequestException('Godown chunein — is maal ki koi Invoice nahi mili, stock kahan aaye?');
      const value = r2(loose.reduce((s, x) => s + x.qty * x.it.rate, 0));
      const ledgerId = await this.prisma.$transaction(async (tx) => {
        for (const x of loose) {
          await applyStockDelta({
            tx, tenantId, shopId: mr.shopId!, productId: x.it.productId, variantId: x.it.variantId, delta: x.qty,
            movementType: 'RETURN_IN', reference: mr.number, note: `Market return ${mr.number} (bina invoice)`, userId: user.id,
            unitCost: x.it.baseQty > 0 ? x.it.costValue / x.it.baseQty : null,
          });
        }
        if (!(value > 0)) return null;
        const { balance: raw } = await tx.customer.update({ where: { id: mr.customerId }, data: { balance: { decrement: value } }, select: { balance: true } });
        const balance = await tidyCustomerBalance(tx, mr.customerId, raw);
        const row = await tx.customerLedger.create({
          data: {
            tenantId, customerId: mr.customerId, shopId: mr.shopId, createdById: user.id, type: 'ADJUSTMENT', amount: -value, balanceAfter: balance,
            reference: mr.number, note: `Market return ${mr.number} — maal wapas (bina invoice)`,
          },
          select: { id: true },
        });
        await tx.distMarketReturn.update({ where: { id: mr.id }, data: { ledgerId: row.id } });
        return row.id;
      });
      credited = r2(credited + (ledgerId ? value : 0));
      // Damaged or expired goods go straight out as a loss on the Adjustments page.
      const writeOff = loose.filter((x) => x.it.condition !== 'GOOD');
      for (const code of ['DAMAGE', 'EXPIRY'] as const) {
        const rows = writeOff.filter((x) => (code === 'EXPIRY') === (x.it.condition === 'EXPIRED'));
        if (!rows.length) continue;
        await this.adjustments.batch(user, new ShopScope(null, true), {
          shopId: mr.shopId, reason: `Market return ${mr.number}`, reasonCode: code, note: 'Retailer se wapas aaya, bechne layak nahi',
          items: rows.map((x) => ({ productId: x.it.productId, variantId: x.it.variantId ?? undefined, type: 'DAMAGE', quantity: x.qty })),
        } as never);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const it of mr.items) await tx.distMarketReturnItem.update({ where: { id: it.id }, data: { matchedQty: r4(plan.matched.get(it.id) ?? 0) } });
      await tx.distMarketReturn.update({ where: { id: mr.id }, data: { creditedAmount: credited } });
    });
    refreshSettlements(this.prisma, tenantId, mr.customerId);
    return credited;
  }

  /** Splits each line over the customer's invoices, newest first, by what is still unreturned on them. */
  private async matchInvoices(tenantId: string, mr: ReturnWithItems) {
    const productIds = [...new Set(mr.items.map((i) => i.productId))];
    const saleLines = await this.prisma.saleItem.findMany({
      where: {
        productId: { in: productIds }, price: { gt: 0 },
        sale: { tenantId, customerId: mr.customerId, status: { notIn: ['VOIDED', 'FULLY_RETURNED'] } },
      },
      select: { id: true, saleId: true, productId: true, quantity: true, returnedQty: true, variantLink: { select: { variantId: true } }, sale: { select: { soldAt: true } } },
      orderBy: { sale: { soldAt: 'desc' } },
      take: 2000,
    });
    const left = new Map(saleLines.map((l) => [l.id, r4(l.quantity - l.returnedQty)]));
    const bySale = new Map<string, { saleId: string; lines: Array<{ saleItemId: string; qty: number; condition: string }> }>();
    const matched = new Map<string, number>();
    for (const it of mr.items) {
      let need = it.baseQty;
      for (const l of saleLines) {
        if (need <= EPS) break;
        if (l.productId !== it.productId || (l.variantLink?.variantId ?? null) !== (it.variantId ?? null)) continue;
        const free = left.get(l.id) ?? 0;
        if (free <= EPS) continue;
        const take = r4(Math.min(free, need));
        left.set(l.id, r4(free - take));
        need = r4(need - take);
        // One return per bill and condition: a return names each bill line once, with one restock choice.
        const key = `${l.saleId}|${it.condition}`;
        const group = bySale.get(key) ?? { saleId: l.saleId, lines: [] };
        const same = group.lines.find((x) => x.saleItemId === l.id);
        if (same) same.qty = r4(same.qty + take);
        else group.lines.push({ saleItemId: l.id, qty: take, condition: it.condition });
        bySale.set(key, group);
        matched.set(it.id, r4((matched.get(it.id) ?? 0) + take));
      }
    }
    return { bySale, matched };
  }

  /** The part of a bill's refund the khata could not take stays with the customer as an advance. */
  private async keepAsAdvance(user: AuthenticatedUser, mr: ReturnWithItems, returnNumber: string, payout: number) {
    const tenantId = user.tenantId;
    await this.prisma.$transaction(async (tx) => {
      const { balance: raw } = await tx.customer.update({ where: { id: mr.customerId }, data: { balance: { decrement: payout } }, select: { balance: true } });
      const balance = await tidyCustomerBalance(tx, mr.customerId, raw);
      await tx.customerLedger.create({
        data: {
          tenantId, customerId: mr.customerId, shopId: mr.shopId, createdById: user.id, type: 'REFUND', amount: -payout, balanceAfter: balance,
          reference: returnNumber, note: `Market return ${mr.number} — advance (khate me jama)`,
        },
      });
      // No cash left a drawer: drop the refund's audit row if one was written.
      await tx.cashTransaction.deleteMany({ where: { tenantId, type: 'REFUND', reference: returnNumber } });
    });
  }

  /* ───────────── read ───────────── */

  async list(user: AuthenticatedUser, q: ListMarketReturnsDto) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const seesAll = this.can(user, PERMISSIONS.DISTRIBUTION_RETURNS_APPROVE) || this.can(user, PERMISSIONS.DISTRIBUTION_ORDERS_VIEW);
    const statuses = (q.status ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => (MARKET_RETURN_STATUSES as readonly string[]).includes(s));
    const where: Prisma.DistMarketReturnWhereInput = {
      tenantId,
      ...(statuses.length && { status: { in: statuses } }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.routeId && { routeId: q.routeId }),
      ...(!seesAll ? { collectedById: user.id } : q.collectedById ? { collectedById: q.collectedById } : {}),
    };
    if (q.from || q.to) {
      const r = dayRange(clock, q.from ?? q.to, q.to ?? q.from);
      where.collectedAt = { gte: r.gte, lt: r.lt };
    }
    const [total, rows, sums] = await Promise.all([
      this.prisma.distMarketReturn.count({ where }),
      this.prisma.distMarketReturn.findMany({ where, orderBy: { collectedAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { _count: { select: { items: true } } } }),
      this.prisma.distMarketReturn.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { totalValue: true, creditedAmount: true } }),
    ]);
    const [customers, users, routes, shops] = await Promise.all([
      customerCards(this.prisma, tenantId, rows.map((r) => r.customerId)),
      userNames(this.prisma, tenantId, rows.flatMap((r) => [r.collectedById, r.approvedById])),
      routeNames(this.prisma, tenantId, rows.map((r) => r.routeId)),
      shopNames(this.prisma, tenantId, rows.map((r) => r.shopId)),
    ]);
    return {
      total, page, limit,
      totals: Object.fromEntries(sums.map((s) => [s.status, { count: s._count._all, value: r2(s._sum.totalValue ?? 0), credited: r2(s._sum.creditedAmount ?? 0) }])),
      returns: rows.map(({ _count, ...r }) => ({
        ...r, itemCount: _count.items,
        customer: customers.get(r.customerId) ?? null,
        collectedByName: users.get(r.collectedById) ?? null,
        approvedByName: r.approvedById ? users.get(r.approvedById) ?? null : null,
        routeName: r.routeId ? routes.get(r.routeId) ?? null : null,
        shopName: r.shopId ? shops.get(r.shopId) ?? null : null,
      })),
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const mr = await this.prisma.distMarketReturn.findFirst({ where: { id, tenantId }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
    if (!mr) throw new NotFoundException('Return nahi mili');
    const seesAll = this.can(user, PERMISSIONS.DISTRIBUTION_RETURNS_APPROVE) || this.can(user, PERMISSIONS.DISTRIBUTION_ORDERS_VIEW);
    if (!seesAll && mr.collectedById !== user.id) throw new NotFoundException('Return nahi mili');
    const productIds = mr.items.map((i) => i.productId);
    const [products, suppliers, customers, users, shops, saleReturns] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, unit: true, sku: true } }),
      this.prisma.supplier.findMany({ where: { tenantId, id: { in: mr.items.map((i) => i.supplierId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
      customerCards(this.prisma, tenantId, [mr.customerId]),
      userNames(this.prisma, tenantId, [mr.collectedById, mr.approvedById]),
      shopNames(this.prisma, tenantId, [mr.shopId]),
      mr.saleReturnIds.length
        ? this.prisma.saleReturn.findMany({ where: { tenantId, id: { in: mr.saleReturnIds } }, select: { id: true, returnNumber: true, refundAmount: true, sale: { select: { saleNumber: true } } } })
        : [],
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const sMap = new Map(suppliers.map((s) => [s.id, s.name]));
    return {
      ...mr,
      customer: customers.get(mr.customerId) ?? null,
      collectedByName: users.get(mr.collectedById) ?? null,
      approvedByName: mr.approvedById ? users.get(mr.approvedById) ?? null : null,
      shopName: mr.shopId ? shops.get(mr.shopId) ?? null : null,
      saleReturns: saleReturns.map((r) => ({ id: r.id, returnNumber: r.returnNumber, refundAmount: r.refundAmount, saleNumber: r.sale.saleNumber })),
      items: mr.items.map((i) => ({
        ...i, productName: pMap.get(i.productId)?.name ?? null, sku: pMap.get(i.productId)?.sku ?? null, baseUnit: pMap.get(i.productId)?.unit ?? 'pcs',
        supplierName: i.supplierId ? sMap.get(i.supplierId) ?? null : null,
      })),
    };
  }

  /** Price check for the form: rate, value and principal of each line, saving nothing. */
  async preview(user: AuthenticatedUser, dto: { customerId: string; items: MarketReturnLineDto[] }) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const lines = await this.priceLines(user, customer.id, dto.items);
    const catalog = await loadCatalog(this.prisma, user.tenantId, lines.map((l) => l.productId));
    return {
      lines: lines.map((l) => ({ ...l, productName: catalog.products.get(l.productId)?.name ?? null })),
      total: r2(lines.reduce((s, l) => s + l.value, 0)),
    };
  }
}
