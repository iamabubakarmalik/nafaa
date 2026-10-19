/**
 * Made-to-order jewelry. The cash advance sits on the customer's khata.
 * Old gold given as advance is bought into metal stock at its karat rate
 * (less kaat) and counted as trade-in on the delivery bill. Gold issued to
 * the karigar leaves metal stock and comes back as the piece, wastage and
 * any raw metal returned. Delivery is the sale.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JewelryCategory, JewelryMetalType, JewelryOrderStatus, JewelryPurity, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService as CoreSalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope } from '../../../common/shop-scope';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { PURITY_FACTOR, metalTypeForPurity, postMetalEntry } from '../common/metal-ledger';
import { issueToKarigar, receiveFromKarigar } from '../common/karigar-metal';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const r3 = (v: number) => Math.round((Number(v) || 0) * 1000) / 1000;

/** Fields a client may set on create/update. */
const EDITABLE = [
  'customerName', 'customerPhone', 'customerEmail', 'category', 'metalType', 'purity', 'style',
  'designDescription', 'referenceImageUrls', 'hasGemstones', 'gemstonesRequired', 'hasEngraving', 'engravingText',
  'designedBy', 'assignedKarigarId', 'assignedKarigarName', 'hallmarkNumber', 'certificateNumber', 'internalNotes',
] as const;
const pick = (dto: any) => Object.fromEntries(EDITABLE.filter((k) => dto?.[k] !== undefined).map((k) => [k, dto[k] === '' ? null : dto[k]]));

const OPEN: JewelryOrderStatus[] = ['DRAFT', 'QUOTED', 'CONFIRMED', 'DESIGNING', 'METAL_ISSUED', 'IN_PRODUCTION', 'POLISHING', 'QUALITY_CHECK', 'HALLMARKING', 'READY', 'ON_HOLD'];
const IN_WORK: JewelryOrderStatus[] = ['DESIGNING', 'METAL_ISSUED', 'IN_PRODUCTION', 'POLISHING', 'QUALITY_CHECK', 'HALLMARKING'];
const VIEWS = ['active', 'today', 'late', 'work', 'ready', 'unpaid', 'done', 'all'] as const;
export type OrderView = (typeof VIEWS)[number];

const isEnum = <T extends Record<string, string>>(e: T, v: unknown): v is T[keyof T] => typeof v === 'string' && Object.values(e).includes(v);

type Order = Prisma.JewelryCustomOrderGetPayload<object>;

@Injectable()
export class CustomOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coreSales: CoreSalesService,
  ) {}

  private validate(dto: any, creating: boolean) {
    if (creating || dto.customerName !== undefined) {
      if (!String(dto.customerName ?? '').trim()) throw new BadRequestException('Customer ka naam likhein');
    }
    if (creating || dto.customerPhone !== undefined) {
      if (!/^[\d+\-\s]{7,20}$/.test(String(dto.customerPhone ?? '').trim())) throw new BadRequestException('Customer ka sahi phone number likhein');
    }
    if (creating || dto.designDescription !== undefined) {
      if (!String(dto.designDescription ?? '').trim()) throw new BadRequestException('Design ki details likhein');
    }
    if (dto.category !== undefined && !isEnum(JewelryCategory, dto.category)) throw new BadRequestException('Zewar ki type ghalat hai');
    if (dto.metalType !== undefined && !isEnum(JewelryMetalType, dto.metalType)) throw new BadRequestException('Metal ghalat hai');
    if (dto.purity !== undefined && !isEnum(JewelryPurity, dto.purity)) throw new BadRequestException('Karat ghalat hai');
    for (const k of ['expectedGrossWeight', 'expectedNetWeight', 'expectedMakingCharges', 'estimatedPrice', 'finalPrice', 'advancePayment']) {
      if (dto[k] !== undefined && dto[k] !== null && dto[k] !== '' && !(Number(dto[k]) >= 0)) throw new BadRequestException('Wazan aur amount sahi likhein');
    }
    if (dto.promisedDate && Number.isNaN(new Date(dto.promisedDate).getTime())) throw new BadRequestException('Dene ki tareekh ghalat hai');
  }

  private async karigarName(tenantId: string, id?: string | null) {
    if (!id) return null;
    const k = await this.prisma.jewelryKarigar.findFirst({ where: { id, tenantId }, select: { fullName: true } });
    if (!k) throw new BadRequestException('Karigar nahi mila');
    return k.fullName;
  }

  async create(user: AuthenticatedUser, dto: any) {
    this.validate(dto, true);
    const advance = r2(Math.max(Number(dto.advancePayment) || 0, 0));
    const karigarName = await this.karigarName(user.tenantId, dto.assignedKarigarId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-order-no:${user.tenantId}`}))::text`;
      const count = await tx.jewelryCustomOrder.count({ where: { tenantId: user.tenantId } });
      const orderNumber = 'JCO-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');
      // The advance is cash in hand today: it sits on the customer's khata
      // and is used up by the bill made on delivery.
      let customerId: string | null = dto.customerId || null;
      if (advance > 0) {
        const shopId = await resolveIndustryShopId(tx, user, null);
        customerId = await ensureCustomer(tx, user, { customerId, name: dto.customerName, phone: dto.customerPhone, shopId });
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advance, reference: orderNumber, note: `Zewar order advance ${orderNumber}`, method: dto.paymentMethod,
        });
      }
      return tx.jewelryCustomOrder.create({
        data: {
          tenantId: user.tenantId,
          ...pick(dto),
          category: dto.category ?? 'OTHER',
          metalType: dto.metalType ?? 'GOLD',
          purity: dto.purity ?? 'KARAT_22',
          designDescription: String(dto.designDescription).trim(),
          customerName: String(dto.customerName).trim(),
          customerPhone: String(dto.customerPhone).trim(),
          customerId,
          assignedKarigarId: dto.assignedKarigarId || null,
          assignedKarigarName: karigarName,
          orderNumber,
          status: ['DRAFT', 'QUOTED', 'CONFIRMED'].includes(dto.status) ? dto.status : 'CONFIRMED',
          orderDate: new Date(),
          promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : null,
          expectedGrossWeight: Number(dto.expectedGrossWeight) || 0,
          expectedNetWeight: dto.expectedNetWeight ? Number(dto.expectedNetWeight) : null,
          expectedMakingCharges: dto.expectedMakingCharges ? Number(dto.expectedMakingCharges) : null,
          advancePayment: advance,
          estimatedPrice: Number(dto.estimatedPrice) || 0,
          paidAmount: advance,
          paymentStatus: advance > 0 ? 'ADVANCE_PAID' : 'UNPAID',
          createdById: user.id,
        } as Prisma.JewelryCustomOrderUncheckedCreateInput,
      });
    });
  }

  /** Old gold given toward each order: grams and value, from the exchange records. */
  private async goldFor(tenantId: string, ids: string[]) {
    if (!ids.length) return new Map<string, { grams: number; value: number; count: number }>();
    const rows = await this.prisma.jewelryExchange.groupBy({
      by: ['usedAgainstOrderId'],
      where: { tenantId, usedAgainstOrderId: { in: ids }, purpose: 'ORDER' },
      _sum: { netWeight: true, netValue: true },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.usedAgainstOrderId as string, { grams: r3(r._sum.netWeight ?? 0), value: r2(r._sum.netValue ?? 0), count: r._count._all }]));
  }

  private viewWhere(view: OrderView): Prisma.JewelryCustomOrderWhereInput {
    const today = startOfDayTz(new Date());
    switch (view) {
      case 'active': return { status: { in: OPEN } };
      case 'today': return { status: { in: OPEN }, promisedDate: { gte: today, lte: endOfDayTz(new Date()) } };
      case 'late': return { status: { in: OPEN }, promisedDate: { lt: today } };
      case 'work': return { status: { in: IN_WORK } };
      case 'ready': return { status: 'READY' };
      // Price set and money still to come (checked again per row below).
      case 'unpaid': return { status: { in: OPEN }, paymentStatus: { not: 'PAID' } };
      case 'done': return { status: { in: ['DELIVERED', 'CANCELLED'] } };
      default: return {};
    }
  }

  async page(user: AuthenticatedUser, q: { view?: string; search?: string; karigarId?: string; from?: string; to?: string; page?: number; limit?: number; sort?: string }) {
    const view: OrderView = (VIEWS as readonly string[]).includes(q.view ?? '') ? (q.view as OrderView) : 'active';
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const search = q.search?.trim();
    const base: Prisma.JewelryCustomOrderWhereInput = {
      tenantId: user.tenantId,
      ...(q.karigarId && { assignedKarigarId: q.karigarId }),
      ...(q.from || q.to ? { orderDate: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { designDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const where = { ...base, ...this.viewWhere(view) };
    const orderBy: Prisma.JewelryCustomOrderOrderByWithRelationInput[] = q.sort === 'recent'
      ? [{ orderDate: 'desc' }]
      : q.sort === 'amount' ? [{ estimatedPrice: 'desc' }] : [{ promisedDate: { sort: 'asc', nulls: 'last' } }, { orderDate: 'desc' }];
    const [total, items, sums, ...counts] = await Promise.all([
      this.prisma.jewelryCustomOrder.count({ where }),
      this.prisma.jewelryCustomOrder.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.jewelryCustomOrder.aggregate({ where, _sum: { estimatedPrice: true, finalPrice: true, paidAmount: true } }),
      ...VIEWS.map((v) => this.prisma.jewelryCustomOrder.count({ where: { ...base, ...this.viewWhere(v) } })),
    ]);
    const gold = await this.goldFor(user.tenantId, items.map((o) => o.id));
    return {
      view, page, limit, total, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(VIEWS.map((v, i) => [v, counts[i]])) as Record<OrderView, number>,
      totals: { value: r2(sums._sum.finalPrice ?? sums._sum.estimatedPrice ?? 0), paid: r2(sums._sum.paidAmount ?? 0) },
      items: items.map((o) => this.withGold(o, gold.get(o.id))),
    };
  }

  private withGold(o: Order, g?: { grams: number; value: number; count: number }) {
    const price = r2(o.finalPrice ?? o.estimatedPrice);
    const goldValue = g?.value ?? 0;
    return { ...o, goldAdvance: g ?? { grams: 0, value: 0, count: 0 }, due: r2(Math.max(price - o.paidAmount - goldValue, 0)) };
  }

  /** Open orders at a glance for the page header. */
  async summary(user: AuthenticatedUser) {
    const count = (view: OrderView) => this.prisma.jewelryCustomOrder.count({ where: { tenantId: user.tenantId, ...this.viewWhere(view) } });
    const [active, today, late, ready, work, money] = await Promise.all([
      count('active'), count('today'), count('late'), count('ready'), count('work'),
      this.prisma.jewelryCustomOrder.aggregate({
        where: { tenantId: user.tenantId, status: { in: OPEN } },
        _sum: { estimatedPrice: true, paidAmount: true, expectedGrossWeight: true },
      }),
    ]);
    return {
      active, today, late, ready, work,
      value: r2(money._sum.estimatedPrice ?? 0),
      advance: r2(money._sum.paidAmount ?? 0),
      grams: r3(money._sum.expectedGrossWeight ?? 0),
    };
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; karigarId?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.jewelryCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && isEnum(JewelryOrderStatus, params.status) && { status: params.status }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.karigarId && { assignedKarigarId: params.karigarId }),
        ...(params.from || params.to ? {
          orderDate: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) },
        } : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { orderDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.jewelryCustomOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Order nahi mila');
    return o;
  }

  private open(o: Order) {
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') throw new BadRequestException('Deliver ya cancel hua order badla nahi ja sakta');
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const o = await this.getOne(user, id);
    this.open(o);
    this.validate(dto, false);
    const karigarName = dto.assignedKarigarId !== undefined ? await this.karigarName(user.tenantId, dto.assignedKarigarId) : undefined;
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: {
        ...pick(dto),
        ...(karigarName !== undefined && { assignedKarigarName: karigarName, assignedKarigarId: dto.assignedKarigarId || null }),
        promisedDate: dto.promisedDate !== undefined ? (dto.promisedDate ? new Date(dto.promisedDate) : null) : undefined,
        finalPrice: dto.finalPrice !== undefined ? (dto.finalPrice === null || dto.finalPrice === '' ? null : Number(dto.finalPrice)) : undefined,
        estimatedPrice: dto.estimatedPrice !== undefined ? Number(dto.estimatedPrice) || 0 : undefined,
        expectedGrossWeight: dto.expectedGrossWeight !== undefined ? Number(dto.expectedGrossWeight) || 0 : undefined,
        expectedNetWeight: dto.expectedNetWeight !== undefined ? (dto.expectedNetWeight ? Number(dto.expectedNetWeight) : null) : undefined,
        expectedMakingCharges: dto.expectedMakingCharges !== undefined ? (dto.expectedMakingCharges ? Number(dto.expectedMakingCharges) : null) : undefined,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, status: string, reason?: string, managerPin?: string) {
    const o = await this.getOne(user, id);
    this.open(o);
    if (!isEnum(JewelryOrderStatus, status)) throw new BadRequestException('Order ki halat ghalat hai');
    if (status === 'DELIVERED') return this.deliver(user, scope, o, managerPin);
    if (status === 'CANCELLED' && !String(reason ?? '').trim()) throw new BadRequestException('Cancel karne ki wajah likhein');
    const patch: Prisma.JewelryCustomOrderUpdateInput = { status };
    const now = new Date();
    switch (status) {
      case 'DESIGNING': patch.designStartedAt = now; break;
      case 'IN_PRODUCTION': patch.productionStartedAt = now; break;
      case 'POLISHING': patch.polishingStartedAt = now; break;
      case 'QUALITY_CHECK': patch.qualityCheckedAt = now; break;
      case 'HALLMARKING': patch.hallmarkedAt = now; break;
      case 'READY': patch.readyAt = now; break;
      // Cash advance stays on the customer's khata as their money; gold stays as their credit there too.
      case 'CANCELLED': patch.cancellationReason = reason; break;
    }
    return this.prisma.jewelryCustomOrder.update({ where: { id }, data: patch });
  }

  /**
   * Delivery is the sale. The cash advance on khata is used up by the bill;
   * old gold given toward the order is counted as trade-in; the rest goes on
   * khata as udhaar.
   */
  private async deliver(user: AuthenticatedUser, scope: ShopScope, o: Order, managerPin?: string) {
    const price = r2(o.finalPrice ?? o.estimatedPrice);
    if (price <= 0) throw new BadRequestException('Deliver se pehle order ki final qeemat likhein');
    const gold = (await this.goldFor(user.tenantId, [o.id])).get(o.id);
    const cost = await this.pieceCost(user.tenantId, o);
    const label = `Order zewar ${o.orderNumber}: ${o.designDescription.slice(0, 60)}${o.metalReceivedGrams ? ` (${o.metalReceivedGrams}g)` : ''}`;

    // Claim the order first so a double click cannot make two bills.
    const claimed = await this.prisma.jewelryCustomOrder.updateMany({
      where: { id: o.id, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    if (!claimed.count) throw new BadRequestException('Yeh order pehle hi deliver ho chuka hai');

    try {
      if (gold && gold.value > 0) {
        const goldPaid = r2(Math.min(gold.value, price));
        const shopId = await resolveIndustryShopId(this.prisma as unknown as Prisma.TransactionClient, user, null);
        const customerId = o.customerId || (price > goldPaid
          ? await ensureCustomer(this.prisma as unknown as Prisma.TransactionClient, user, { name: o.customerName, phone: o.customerPhone, shopId })
          : null);
        const sale: any = await this.coreSales.create(user, scope, {
          customerId: customerId ?? undefined,
          paymentMethod: 'CASH',
          paidAmount: goldPaid,
          payments: [{ method: 'TRADE_IN', amount: goldPaid, note: `Customer ka sona ${gold.grams}g (${o.orderNumber})` }],
          managerPin,
          note: o.orderNumber,
          items: [],
          serviceCharges: [{ type: 'CUSTOM', label, amount: price, cost }],
        } as any, undefined, { tradeInChecked: true });
        return this.prisma.jewelryCustomOrder.update({
          where: { id: o.id },
          data: {
            customerId, finalPrice: price,
            paymentStatus: o.paidAmount + goldPaid >= price - 0.01 ? 'PAID' : 'PARTIAL',
            internalNotes: [o.internalNotes, `Bill ${sale.saleNumber}`].filter(Boolean).join(' · '),
          },
        });
      }
      return await this.prisma.$transaction(async (tx) => {
        const shopId = await resolveIndustryShopId(tx, user, null);
        // Advances taken before khata posting existed count as paid with this bill.
        const legacyPaid = r2(Math.max(o.paidAmount - (await paidOnKhata(tx, user.tenantId, o.orderNumber)), 0));
        let customerId = o.customerId;
        if (!customerId && price > legacyPaid) {
          customerId = await ensureCustomer(tx, user, { name: o.customerName, phone: o.customerPhone, shopId });
        }
        const sale = await postIndustrySale(tx, user, {
          saleNumber: o.orderNumber, sourceRef: o.orderNumber, shopId, customerId,
          lines: [{ label, amount: price, cost }],
          paidAmount: Math.min(legacyPaid, price),
          paymentMethod: 'CASH',
        });
        return tx.jewelryCustomOrder.update({
          where: { id: o.id },
          data: {
            customerId, finalPrice: price,
            paymentStatus: o.paidAmount >= price - 0.01 ? 'PAID' : 'PARTIAL',
            internalNotes: [o.internalNotes, `Bill ${sale.saleNumber}`].filter(Boolean).join(' · '),
          },
        });
      });
    } catch (err) {
      await this.prisma.jewelryCustomOrder.update({ where: { id: o.id }, data: { status: o.status, deliveredAt: null } });
      throw err;
    }
  }

  /**
   * What the piece cost the shop: gold that went into it (piece weight plus
   * wastage) at today's buying rate of its karat, and the karigar's labour.
   * Zero when no gold was given out through the order.
   */
  private async pieceCost(tenantId: string, o: Order) {
    const used = r3((o.metalReceivedGrams ?? 0) + (o.wastageGrams ?? 0)) || r3(o.metalIssuedGrams ?? 0);
    if (!(used > 0)) return 0;
    const [rate, k] = await Promise.all([
      this.prisma.jewelryMetalRate.findFirst({ where: { tenantId, metalType: o.metalType, purity: o.purity, isActive: true }, orderBy: { effectiveDate: 'desc' } }),
      o.assignedKarigarId ? this.prisma.jewelryKarigar.findFirst({ where: { id: o.assignedKarigarId, tenantId }, select: { perGramRate: true, fixedRatePerPiece: true } }) : null,
    ]);
    const metal = used * (rate ? rate.buyRate || rate.ratePerGram : 0);
    const labour = k ? (k.perGramRate ?? 0) * (o.metalReceivedGrams ?? used) + (k.fixedRatePerPiece ?? 0) : 0;
    return r2(metal + labour);
  }

  /** Old gold the customer hands over toward the order, bought in at today's karat rate less kaat. */
  async goldAdvance(user: AuthenticatedUser, id: string, dto: { grams: number; purity: JewelryPurity; deductionPct?: number; value?: number; testedBy?: string; notes?: string }) {
    const o = await this.getOne(user, id);
    this.open(o);
    const grams = r3(Number(dto.grams) || 0);
    if (!(grams > 0)) throw new BadRequestException('Sone ka wazan likhein');
    if (!isEnum(JewelryPurity, dto.purity)) throw new BadRequestException('Karat chunein');
    const metalType = metalTypeForPurity(dto.purity);
    const rate = await this.prisma.jewelryMetalRate.findFirst({
      where: { tenantId: user.tenantId, metalType, purity: dto.purity, isActive: true },
      orderBy: { effectiveDate: 'desc' },
    });
    const perGram = rate ? rate.buyRate || rate.ratePerGram : 0;
    const pct = Math.min(Math.max(Number(dto.deductionPct) || 0, 0), 50);
    const full = r2(grams * perGram);
    const value = dto.value != null && Number(dto.value) >= 0 ? r2(Number(dto.value)) : r2(full * (1 - pct / 100));
    if (!(value > 0)) throw new BadRequestException('Is karat ka aaj ka rate set nahi — Metal rates me rate likhein ya qeemat khud likhein');

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-exchange-no:${user.tenantId}`}))::text`;
      const count = await tx.jewelryExchange.count({ where: { tenantId: user.tenantId } });
      const exchangeNumber = 'JEX-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');
      const ex = await tx.jewelryExchange.create({
        data: {
          tenantId: user.tenantId, exchangeNumber,
          exchangeType: metalType === 'SILVER' ? 'OLD_SILVER_EXCHANGE' : 'OLD_GOLD_EXCHANGE',
          customerId: o.customerId, customerName: o.customerName, customerPhone: o.customerPhone,
          itemDescription: `Order ${o.orderNumber} ke liye customer ka sona`,
          metalType, claimedPurity: dto.purity, testedPurity: dto.purity,
          grossWeight: grams, netWeight: grams, fineGoldEquivalent: r3(grams * (PURITY_FACTOR[dto.purity] ?? 1)),
          ratePerGram: r2(value / grams), grossValue: Math.max(full, value), deductions: r2(Math.max(full - value, 0)), netValue: value,
          usedAgainstOrderId: o.id, purpose: 'ORDER', testedBy: dto.testedBy || null, notes: dto.notes || null,
          createdById: user.id,
        },
      });
      await postMetalEntry(tx, user.tenantId, user.id, {
        entryType: 'EXCHANGE_IN', metalType, purity: dto.purity, grams, ratePerGram: r2(value / grams),
        reference: o.orderNumber, source: o.customerName, exchangeId: ex.id, notes: `Order ${o.orderNumber} ka advance sona`,
      });
      return ex;
    });
  }

  /** Gold handed to the order's karigar: out of metal stock, onto the karigar. */
  async issueMetal(user: AuthenticatedUser, id: string, dto: { grams: number; purity?: JewelryPurity; karigarId?: string }) {
    const o = await this.getOne(user, id);
    this.open(o);
    const karigarId = dto.karigarId || o.assignedKarigarId;
    if (!karigarId) throw new BadRequestException('Pehle order par karigar chunein');
    const purity = dto.purity && isEnum(JewelryPurity, dto.purity) ? dto.purity : o.purity;
    const grams = r3(Number(dto.grams) || 0);
    return this.prisma.$transaction(async (tx) => {
      const k = await issueToKarigar(tx, user.tenantId, user.id, { karigarId, grams, purity, reference: o.orderNumber, notes: `Order ${o.orderNumber}` });
      return tx.jewelryCustomOrder.update({
        where: { id },
        data: {
          metalIssuedGrams: r3((o.metalIssuedGrams ?? 0) + grams), metalIssuedDate: new Date(),
          assignedKarigarId: k.id, assignedKarigarName: k.fullName,
          ...(['DRAFT', 'QUOTED', 'CONFIRMED', 'DESIGNING'].includes(o.status) && { status: 'METAL_ISSUED' as const }),
        },
      });
    });
  }

  /** The piece back from the karigar: its weight, the wastage allowed and any gold left over. */
  async receiveMetal(user: AuthenticatedUser, id: string, dto: { receivedGrams: number; wastageGrams?: number; returnedGrams?: number }) {
    const o = await this.getOne(user, id);
    this.open(o);
    if (!o.assignedKarigarId) throw new BadRequestException('Is order par koi karigar nahi');
    const piece = r3(Number(dto.receivedGrams) || 0);
    if (!(piece > 0)) throw new BadRequestException('Bane hue zewar ka wazan likhein');
    const wastage = r3(Number(dto.wastageGrams) || 0);
    const back = r3(Number(dto.returnedGrams) || 0);
    return this.prisma.$transaction(async (tx) => {
      await receiveFromKarigar(tx, user.tenantId, user.id, {
        karigarId: o.assignedKarigarId!, pieceGrams: piece, wastageGrams: wastage, returnedGrams: back,
        purity: o.purity, reference: o.orderNumber, notes: `Order ${o.orderNumber}`,
      });
      return tx.jewelryCustomOrder.update({
        where: { id },
        data: {
          metalReceivedGrams: r3((o.metalReceivedGrams ?? 0) + piece), metalReceivedDate: new Date(),
          wastageGrams: r3((o.wastageGrams ?? 0) + wastage),
          ...(IN_WORK.includes(o.status) && { status: 'QUALITY_CHECK' as const, qualityCheckedAt: new Date() }),
        },
      });
    });
  }

  async approveDesign(user: AuthenticatedUser, id: string, designUrl: string) {
    const o = await this.getOne(user, id);
    this.open(o);
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: { approvedDesignUrl: designUrl || null, designApprovedAt: new Date() },
    });
  }

  /** Payment before delivery, held on khata. Method left out is cash. */
  async addPayment(user: AuthenticatedUser, id: string, amount: number, paymentMethod?: string) {
    const o = await this.getOne(user, id);
    const amt = r2(Number(amount) || 0);
    if (amt <= 0) throw new BadRequestException('Amount sahi likhein');
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') {
      throw new BadRequestException('Order band hai — baqi amount customer ke Khata se wasool karein');
    }
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, null);
      const customerId = await ensureCustomer(tx, user, { customerId: o.customerId, name: o.customerName, phone: o.customerPhone, shopId });
      await recordKhataPayment(tx, user, { customerId, shopId, amount: amt, reference: o.orderNumber, note: `Zewar order advance ${o.orderNumber}`, method: paymentMethod });
      const newPaid = r2(o.paidAmount + amt);
      const target = o.finalPrice ?? o.estimatedPrice;
      const paymentStatus = target && newPaid >= target - 0.01 ? 'PAID' : 'PARTIAL';
      return tx.jewelryCustomOrder.update({ where: { id }, data: { paidAmount: newPaid, paymentStatus, customerId } });
    });
  }

  async rate(user: AuthenticatedUser, id: string, rating: number, feedback?: string) {
    await this.getOne(user, id);
    const stars = Math.round(Number(rating));
    if (!(stars >= 1 && stars <= 5)) throw new BadRequestException('Rating 1 se 5 tak');
    return this.prisma.jewelryCustomOrder.update({
      where: { id },
      data: { customerRating: stars, customerFeedback: feedback },
    });
  }
}
