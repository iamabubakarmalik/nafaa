/**
 * Principal claims: what a company owes the distributor back for its
 * claimable schemes and for damaged or expired goods taken back from the
 * market, gathered per principal and period.
 *
 *   - Scheme lines: settled invoices (invoiced in the period) whose line used
 *     a claimable scheme of this principal. Rupees off are claimed for what
 *     was delivered (returned goods take their share back); free goods are
 *     claimed at cost for what was delivered.
 *   - Market returns: approved return lines marked claimable for this
 *     principal, at cost.
 *
 * Making a claim stamps each line with the claim id, so nothing is claimed
 * twice; cancelling a claim frees its lines again. Money received is
 * written as other income (category SCHEME_CLAIM) through IncomeService:
 * set off on the supplier khata, into the drawer or into a money account.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { IncomeService } from '../../finance/income/income.service';
import { CLAIM_STATUSES, INVOICED_STATUSES } from '../distribution.constants';
import { CreateClaimDto, ListClaimsDto, ReceiveClaimDto, SubmitClaimDto } from '../dto/phase2.dto';
import { customerCards, dayRange, nextNumber, r2, r4, userNames } from '../distribution.support';
import { DistributionPrintService } from './print.service';

export interface ClaimLine {
  kind: 'SCHEME' | 'RETURN';
  /** SalesOrderItem id (SCHEME) or DistMarketReturnItem id (RETURN). */
  refId: string;
  docId: string;
  docNumber: string;
  invoiceNumber: string | null;
  date: string;
  customerId: string;
  customerName: string | null;
  productId: string;
  productName: string | null;
  schemeId: string | null;
  schemeName: string | null;
  /** Paid goods delivered (SCHEME) or taken back (RETURN), base units. */
  qty: number;
  discount: number;
  freeQty: number;
  freeProductName: string | null;
  freeValue: number;
  condition: string | null;
  returnValue: number;
  total: number;
}

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly income: IncomeService,
    private readonly print: DistributionPrintService,
  ) {}

  /* ───────────── what is waiting to be claimed ───────────── */

  /** Unclaimed lines of one principal (or every principal) in a period. */
  async unclaimed(tenantId: string, range: { gte: Date; lt: Date }, supplierId?: string): Promise<Array<ClaimLine & { supplierId: string }>> {
    const schemes = await this.prisma.tradeScheme.findMany({
      where: { tenantId, isClaimable: true, supplierId: supplierId ? supplierId : { not: null } },
      select: { id: true, name: true, supplierId: true },
    });
    const sMap = new Map(schemes.map((s) => [s.id, s]));
    const [items, returns] = await Promise.all([
      schemes.length
        ? this.prisma.salesOrderItem.findMany({
          where: {
            schemeId: { in: schemes.map((s) => s.id) }, claimId: null,
            salesOrder: { tenantId, status: { in: INVOICED_STATUSES }, deliveryStatus: { not: null }, invoicedAt: { gte: range.gte, lt: range.lt } },
          },
          include: { salesOrder: { select: { id: true, orderNumber: true, saleId: true, customerId: true, invoicedAt: true } } },
        })
        : [],
      this.prisma.distMarketReturnItem.findMany({
        where: {
          claimable: true, claimId: null, supplierId: supplierId ? supplierId : { not: null },
          marketReturn: { tenantId, status: 'APPROVED', approvedAt: { gte: range.gte, lt: range.lt } },
        },
        include: { marketReturn: { select: { id: true, number: true, customerId: true, approvedAt: true } } },
      }),
    ]);
    const productIds = [...new Set([...items.flatMap((i) => [i.productId, i.freeProductId ?? i.productId]), ...returns.map((r) => r.productId)])];
    const freeSaleIds = items.map((i) => i.freeSaleItemId).filter((x): x is string => !!x);
    const [products, freeLines, sales, customers] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, costPrice: true } }),
      freeSaleIds.length ? this.prisma.saleItem.findMany({ where: { id: { in: freeSaleIds } }, select: { id: true, costPrice: true } }) : [],
      this.prisma.sale.findMany({ where: { tenantId, id: { in: items.map((i) => i.salesOrder.saleId).filter((x): x is string => !!x) } }, select: { id: true, saleNumber: true } }),
      customerCards(this.prisma, tenantId, [...items.map((i) => i.salesOrder.customerId), ...returns.map((r) => r.marketReturn.customerId)]),
    ]);
    const pMap = new Map(products.map((p) => [p.id, p]));
    const costOfFree = new Map(freeLines.map((l) => [l.id, Number(l.costPrice) || 0]));
    const saleNo = new Map(sales.map((s) => [s.id, s.saleNumber]));
    const name = (id: string) => { const c = customers.get(id); return c ? c.businessName || c.name : null; };

    const out: Array<ClaimLine & { supplierId: string }> = [];
    for (const i of items) {
      const scheme = sMap.get(i.schemeId!);
      if (!scheme?.supplierId) continue;
      const share = i.baseQty > 0 ? Math.min(1, Math.max(0, (i.deliveredBaseQty ?? i.baseQty) / i.baseQty)) : 0;
      const freeQty = r4(i.deliveredFreeQty ?? i.freeBaseQty);
      const freePid = i.freeProductId ?? i.productId;
      const unitCost = (i.freeSaleItemId && costOfFree.get(i.freeSaleItemId)) || Number(pMap.get(freePid)?.costPrice) || 0;
      const discount = r2(i.schemeDiscount * share);
      const freeValue = r2(freeQty * unitCost);
      if (!(discount > 0) && !(freeValue > 0)) continue;
      out.push({
        supplierId: scheme.supplierId, kind: 'SCHEME', refId: i.id, docId: i.salesOrder.id, docNumber: i.salesOrder.orderNumber,
        invoiceNumber: i.salesOrder.saleId ? saleNo.get(i.salesOrder.saleId) ?? null : null,
        date: (i.salesOrder.invoicedAt ?? new Date()).toISOString(), customerId: i.salesOrder.customerId, customerName: name(i.salesOrder.customerId),
        productId: i.productId, productName: pMap.get(i.productId)?.name ?? null, schemeId: scheme.id, schemeName: scheme.name,
        qty: r4(i.deliveredBaseQty ?? i.baseQty), discount, freeQty, freeProductName: freeQty > 0 ? pMap.get(freePid)?.name ?? null : null, freeValue,
        condition: null, returnValue: 0, total: r2(discount + freeValue),
      });
    }
    for (const r of returns) {
      if (!r.supplierId) continue;
      const value = r2(r.costValue);
      if (!(value > 0)) continue;
      out.push({
        supplierId: r.supplierId, kind: 'RETURN', refId: r.id, docId: r.marketReturn.id, docNumber: r.marketReturn.number, invoiceNumber: null,
        date: (r.marketReturn.approvedAt ?? new Date()).toISOString(), customerId: r.marketReturn.customerId, customerName: name(r.marketReturn.customerId),
        productId: r.productId, productName: pMap.get(r.productId)?.name ?? null, schemeId: null, schemeName: null,
        qty: r.baseQty, discount: 0, freeQty: 0, freeProductName: null, freeValue: 0, condition: r.condition, returnValue: value, total: value,
      });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Totals waiting per principal for a period (default: this month). */
  async pending(user: AuthenticatedUser, q: { from?: string; to?: string }) {
    const tenantId = user.tenantId;
    const clock = await this.tz.clock(tenantId);
    const range = dayRange(clock, q.from, q.to);
    const lines = await this.unclaimed(tenantId, range);
    const by = new Map<string, { schemeDiscount: number; freeGoodsValue: number; returnsValue: number; total: number; lines: number }>();
    for (const l of lines) {
      const g = by.get(l.supplierId) ?? { schemeDiscount: 0, freeGoodsValue: 0, returnsValue: 0, total: 0, lines: 0 };
      g.schemeDiscount = r2(g.schemeDiscount + l.discount);
      g.freeGoodsValue = r2(g.freeGoodsValue + l.freeValue);
      g.returnsValue = r2(g.returnsValue + l.returnValue);
      g.total = r2(g.total + l.total);
      g.lines++;
      by.set(l.supplierId, g);
    }
    const suppliers = await this.prisma.supplier.findMany({ where: { tenantId, id: { in: [...by.keys()] } }, select: { id: true, name: true } });
    const sName = new Map(suppliers.map((s) => [s.id, s.name]));
    const principals = [...by.entries()].map(([supplierId, g]) => ({ supplierId, supplierName: sName.get(supplierId) ?? null, ...g })).sort((a, b) => b.total - a.total);
    const open = await this.prisma.distClaim.aggregate({ where: { tenantId, status: { in: ['DRAFT', 'SUBMITTED'] } }, _count: { _all: true }, _sum: { total: true, receivedAmount: true } });
    return {
      from: range.from, to: range.to, principals,
      total: r2(principals.reduce((s, p) => s + p.total, 0)),
      openClaims: { count: open._count._all, total: r2(open._sum.total ?? 0), received: r2(open._sum.receivedAmount ?? 0) },
    };
  }

  /** The lines a claim would carry, without saving anything. */
  async preview(user: AuthenticatedUser, q: { supplierId?: string; from?: string; to?: string }) {
    if (!q.supplierId) throw new BadRequestException('Principal (supplier) chunein');
    const clock = await this.tz.clock(user.tenantId);
    const range = dayRange(clock, q.from, q.to);
    const lines = await this.unclaimed(user.tenantId, range, q.supplierId);
    return { from: range.from, to: range.to, supplierId: q.supplierId, ...this.sum(lines), lines };
  }

  private sum(lines: ClaimLine[]) {
    return {
      schemeDiscount: r2(lines.reduce((s, l) => s + l.discount, 0)),
      freeGoodsValue: r2(lines.reduce((s, l) => s + l.freeValue, 0)),
      returnsValue: r2(lines.reduce((s, l) => s + l.returnValue, 0)),
      total: r2(lines.reduce((s, l) => s + l.total, 0)),
    };
  }

  /* ───────────── claims ───────────── */

  async create(user: AuthenticatedUser, dto: CreateClaimDto) {
    const tenantId = user.tenantId;
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true, name: true } });
    if (!supplier) throw new NotFoundException('Principal (supplier) nahi mila');
    const clock = await this.tz.clock(tenantId);
    const range = dayRange(clock, dto.from, dto.to);
    const lines = (await this.unclaimed(tenantId, range, supplier.id)).map(({ supplierId: _s, ...l }) => l);
    if (!lines.length) throw new BadRequestException('Is period me is principal ka claim karne ko kuch nahi');
    const totals = this.sum(lines);
    const id = await this.prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, tenantId, 'claim');
      const claim = await tx.distClaim.create({
        data: {
          tenantId, number, supplierId: supplier.id, fromKey: range.from, toKey: range.to, status: 'DRAFT', ...totals,
          lines: lines as unknown as Prisma.InputJsonValue, note: dto.note?.trim() || null, createdById: user.id,
        },
        select: { id: true },
      });
      const schemeIds = lines.filter((l) => l.kind === 'SCHEME').map((l) => l.refId);
      const returnIds = lines.filter((l) => l.kind === 'RETURN').map((l) => l.refId);
      const a = schemeIds.length ? await tx.salesOrderItem.updateMany({ where: { id: { in: schemeIds }, claimId: null }, data: { claimId: claim.id } }) : { count: 0 };
      const b = returnIds.length ? await tx.distMarketReturnItem.updateMany({ where: { id: { in: returnIds }, claimId: null }, data: { claimId: claim.id } }) : { count: 0 };
      if (a.count !== schemeIds.length || b.count !== returnIds.length) throw new BadRequestException('Kuch lines abhi kisi aur claim me chali gayin — dobara banayein');
      return claim.id;
    });
    return this.get(user, id);
  }

  async list(user: AuthenticatedUser, q: ListClaimsDto) {
    const tenantId = user.tenantId;
    const statuses = (q.status ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => (CLAIM_STATUSES as readonly string[]).includes(s));
    const rows = await this.prisma.distClaim.findMany({
      where: { tenantId, ...(statuses.length && { status: { in: statuses } }), ...(q.supplierId && { supplierId: q.supplierId }) },
      orderBy: { createdAt: 'desc' }, take: 200,
      select: { id: true, number: true, supplierId: true, fromKey: true, toKey: true, status: true, schemeDiscount: true, freeGoodsValue: true, returnsValue: true, total: true, reference: true, submittedAt: true, receivedAmount: true, receivedAt: true, note: true, createdAt: true },
    });
    const suppliers = await this.prisma.supplier.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.supplierId))] } }, select: { id: true, name: true } });
    const sName = new Map(suppliers.map((s) => [s.id, s.name]));
    return { claims: rows.map((r) => ({ ...r, supplierName: sName.get(r.supplierId) ?? null, balance: r2(r.total - r.receivedAmount) })) };
  }

  /** One claim with its lines, the principal and the business block (the printed statement). */
  async get(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const claim = await this.prisma.distClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException('Claim nahi mila');
    const [supplier, business, users, incomes] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: claim.supplierId, tenantId }, select: { id: true, name: true, phone: true, address: true, ntn: true, contactPerson: true } }),
      this.print.business(tenantId),
      userNames(this.prisma, tenantId, [claim.createdById, claim.submittedById]),
      claim.incomeIds.length
        ? this.prisma.otherIncome.findMany({ where: { tenantId, id: { in: claim.incomeIds } }, select: { id: true, incomeNumber: true, amount: true, incomeDate: true, receivedVia: true } })
        : [],
    ]);
    return {
      kind: 'claim-statement',
      business,
      claim: {
        ...claim, lines: (claim.lines as unknown as ClaimLine[] | null) ?? [], balance: r2(claim.total - claim.receivedAmount),
        createdByName: claim.createdById ? users.get(claim.createdById) ?? null : null,
        submittedByName: claim.submittedById ? users.get(claim.submittedById) ?? null : null,
      },
      supplier,
      receipts: incomes,
    };
  }

  async submit(user: AuthenticatedUser, id: string, dto: SubmitClaimDto) {
    const done = await this.prisma.distClaim.updateMany({
      where: { id, tenantId: user.tenantId, status: 'DRAFT' },
      data: { status: 'SUBMITTED', submittedAt: new Date(), submittedById: user.id, reference: dto.reference?.trim() || null, ...(dto.note && { note: dto.note.trim() }) },
    });
    if (!done.count) throw new BadRequestException('Sirf DRAFT claim submit hota hai');
    return this.get(user, id);
  }

  /** Records money the principal paid; the claim is RECEIVED once paid in full. */
  async receive(user: AuthenticatedUser, id: string, dto: ReceiveClaimDto) {
    const tenantId = user.tenantId;
    const claim = await this.prisma.distClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException('Claim nahi mila');
    if (claim.status !== 'DRAFT' && claim.status !== 'SUBMITTED') throw new BadRequestException(`Claim ${claim.status} hai`);
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount likhein');
    const income = await this.income.create(user, new ShopScope(null, true), {
      title: `Claim ${claim.number}`.slice(0, 120), amount, category: 'SCHEME_CLAIM', supplierId: claim.supplierId,
      receivedVia: dto.receivedVia, moneyAccountId: dto.moneyAccountId, shopId: dto.shopId, incomeDate: dto.date,
      note: [dto.note?.trim(), `${claim.fromKey} se ${claim.toKey}`].filter(Boolean).join(' · '),
    } as never);
    const received = r2(claim.receivedAmount + amount);
    await this.prisma.distClaim.update({
      where: { id },
      data: {
        receivedAmount: received, receivedAt: new Date(), incomeIds: { push: (income as { id: string }).id },
        status: received >= claim.total - 0.5 ? 'RECEIVED' : 'SUBMITTED',
        ...(claim.status === 'DRAFT' && { submittedAt: new Date(), submittedById: user.id }),
      },
    });
    return this.get(user, id);
  }

  /** Cancels a claim not yet paid; its lines can be claimed again. */
  async cancel(user: AuthenticatedUser, id: string) {
    const tenantId = user.tenantId;
    const claim = await this.prisma.distClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException('Claim nahi mila');
    if (claim.receivedAmount > 0) throw new BadRequestException('Is claim par paisa aa chuka — cancel nahi ho sakta');
    if (claim.status === 'CANCELLED') return this.get(user, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.distClaim.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.salesOrderItem.updateMany({ where: { claimId: id }, data: { claimId: null } });
      await tx.distMarketReturnItem.updateMany({ where: { claimId: id }, data: { claimId: null } });
    });
    return this.get(user, id);
  }

  /** Open claims and unclaimed value per principal, for the AI tool and the dashboard. */
  async outstanding(user: AuthenticatedUser) {
    const pending = await this.pending(user, {});
    const open = await this.list(user, { status: 'DRAFT,SUBMITTED' });
    return { unclaimedThisMonth: pending, openClaims: open.claims };
  }
}
