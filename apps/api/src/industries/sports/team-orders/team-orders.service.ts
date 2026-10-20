/**
 * Team and school bulk orders: kits, jerseys and equipment with name /
 * number printing, an advance on the team's khata, and the sale on
 * delivery through the normal sale engine (stock leaves then). A cancelled
 * order's advance can be given back in cash; a voided delivery bill puts
 * the order back to "ready" (see SportsBillVoidService).
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TeamOrderStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz, addDaysTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import {
  ensureCustomer, paidOnKhata, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { nextRunningNumber } from '../common/service-sale.helper';
import { checkRefundPin, khataCustomerOf, paging, r2, refundAdvance, refundedOnKhata, text } from '../common/sports-common';
import { CreateTeamOrderDto, RecordPaymentDto, UpdateTeamOrderDto, UpdateTeamOrderStatusDto } from './dto/create-team-order.dto';

type TeamItem = CreateTeamOrderDto['items'][number];

const ACTIVE = ['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY'] as const;
export const TEAM_VIEWS = ['active', 'quote', 'production', 'ready', 'late', 'unpaid', 'done', 'all'] as const;
export type TeamView = typeof TEAM_VIEWS[number];

/** Players for name / number printing: [{ name, number, size }]. */
function cleanRoster(v: unknown) {
  if (!Array.isArray(v)) return undefined;
  if (v.length > 200) throw new BadRequestException('Zyada se zyada 200 players');
  return v
    .map((p) => ({ name: text(p?.name, 40) ?? '', number: text(p?.number, 4) ?? '', size: text(p?.size, 12) ?? '' }))
    .filter((p) => p.name || p.number);
}

/** Totals of an order from its lines; line totals are recomputed from qty x (rate + printing). */
function orderTotals(items: TeamItem[], discountPct: number, taxAmount: number, shippingCharge: number) {
  if (items.length > 100) throw new BadRequestException('Ek order me zyada se zyada 100 items');
  if (taxAmount < 0 || shippingCharge < 0) throw new BadRequestException('Tax ya delivery manfi nahi ho sakti');
  const clean = items.map((it) => {
    const quantity = Math.max(Math.round(Number(it.quantity) || 0), 0);
    const unitPrice = r2(Math.max(Number(it.unitPrice) || 0, 0));
    const printingPrice = r2(Math.max(Number(it.printingPrice) || 0, 0));
    return {
      productId: String(it.productId), ...(it.variantId ? { variantId: String(it.variantId) } : {}),
      productName: text(it.productName, 120) ?? 'Item', quantity, unitPrice, printingPrice,
      total: r2(quantity * (unitPrice + printingPrice)),
      size: text(it.size, 20), color: text(it.color, 30), customizationNotes: text(it.customizationNotes, 200),
    };
  });
  if (clean.some((it) => it.quantity <= 0)) throw new BadRequestException('Har item ki quantity 1 ya zyada honi chahiye');
  if (discountPct < 0 || discountPct > 100) throw new BadRequestException('Discount 0 se 100% ke beech honi chahiye');
  const totalQuantity = clean.reduce((s, it) => s + it.quantity, 0);
  const subtotal = r2(clean.reduce((s, it) => s + it.total, 0));
  const discountAmount = r2((subtotal * discountPct) / 100);
  const totalAmount = r2(subtotal - discountAmount + (taxAmount || 0) + (shippingCharge || 0));
  return { items: clean, totalQuantity, subtotal, discountAmount, totalAmount };
}

@Injectable()
export class TeamOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  /**
   * Khata account for the team; advances and any unpaid balance are kept
   * there. An order that already took an advance keeps that account even if
   * the contact phone was edited later.
   */
  private async teamCustomer(tx: any, user: AuthenticatedUser, o: { orderNumber?: string; contactPerson: string; teamName: string; contactPhone: string }, shopId: string) {
    const held = o.orderNumber ? await khataCustomerOf(tx, user.tenantId, o.orderNumber) : null;
    if (held) return held;
    return ensureCustomer(tx, user, {
      name: `${o.contactPerson} (${o.teamName})`, phone: o.contactPhone, shopId,
    });
  }

  async create(user: AuthenticatedUser, dto: CreateTeamOrderDto, scope?: ShopScope) {
    if (!dto.items?.length) throw new BadRequestException('Kam az kam ek item zaroori hai');
    await this.checkProducts(user, dto.items);
    const orderNumber = await nextRunningNumber(
      async (prefix) => (await this.prisma.sportsTeamOrder.findFirst({
        where: { tenantId: user.tenantId, orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      }))?.orderNumber,
      `TO-${new Date().getFullYear()}-`,
    );

    const discountPct = dto.discountPct ?? 0;
    const taxAmount = dto.taxAmount ?? 0;
    const shippingCharge = dto.shippingCharge ?? 0;
    const { items, totalQuantity, subtotal, discountAmount, totalAmount } = orderTotals(dto.items, discountPct, taxAmount, shippingCharge);
    const advancePaid = r2(dto.advancePaid ?? 0);
    if (advancePaid > totalAmount + 0.01) throw new BadRequestException('Advance order ki kul amount se zyada nahi ho sakta');
    const roster = cleanRoster(dto.playerNames);
    const balanceAmount = r2(totalAmount - advancePaid);

    return this.prisma.$transaction(async (tx) => {
      if (advancePaid > 0) {
        // The advance is cash in hand today; it waits on the team's khata
        // and is used up by the sale made on delivery.
        const shopId = await resolveIndustryShopId(tx, user, scope?.shopId);
        const customerId = await this.teamCustomer(tx, user, dto, shopId);
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advancePaid, reference: orderNumber, note: `Team order advance ${orderNumber}`, method: dto.paymentMethod,
        });
      }
      return tx.sportsTeamOrder.create({
        data: {
          tenantId: user.tenantId,
          orderNumber,
          teamName: dto.teamName,
          contactPerson: dto.contactPerson,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          organization: dto.organization,
          city: dto.city,
          address: dto.address,
          items: items as any,
          totalQuantity,
          subtotal,
          discountPct,
          discountAmount,
          taxAmount,
          shippingCharge,
          totalAmount,
          hasCustomJerseys: dto.hasCustomJerseys ?? (!!roster?.length || items.some((it) => it.printingPrice > 0)),
          customizationDetails: dto.customizationDetails,
          playerNames: roster as any,
          playerNumbers: roster ? roster.map((p) => p.number) as any : undefined,
          teamLogoUrl: dto.teamLogoUrl,
          advancePaid,
          balanceAmount,
          paymentMethod: dto.paymentMethod,
          expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
          poNumber: dto.poNumber,
          notes: dto.notes,
          internalNotes: dto.internalNotes,
          handledById: user.id,
          status: 'DRAFT',
        },
      });
    });
  }

  /** Every line must point at a product (and size) of this shop. */
  private async checkProducts(user: AuthenticatedUser, items: TeamItem[]) {
    if (items.some((it) => !it?.productId)) throw new BadRequestException('Har item ke liye product chunein');
    const ids = [...new Set(items.map((it) => String(it.productId)))];
    const found = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, variants: { select: { id: true } } } });
    if (found.length !== ids.length) throw new BadRequestException('Order me koi product nahi mila');
    const variantsOf = new Map(found.map((p) => [p.id, new Set(p.variants.map((v) => v.id))]));
    if (items.some((it) => it.variantId && !variantsOf.get(String(it.productId))?.has(String(it.variantId)))) {
      throw new BadRequestException('Size is product ka nahi');
    }
  }

  /**
   * One page of orders for a view, with the count of every view and the
   * money of the matching orders (value, advance taken, still to collect).
   */
  async page(user: AuthenticatedUser, q: { view?: string; page?: string; limit?: string; search?: string; from?: string; to?: string }) {
    const view = (TEAM_VIEWS as readonly string[]).includes(q.view ?? '') ? q.view as TeamView : 'active';
    const { page, limit, skip } = paging(q);
    const today = startOfDayTz();
    const base: Prisma.SportsTeamOrderWhereInput = {
      tenantId: user.tenantId,
      ...(q.from || q.to ? { createdAt: { ...(q.from && { gte: startOfDayTz(new Date(q.from)) }), ...(q.to && { lte: endOfDayTz(new Date(q.to)) }) } } : {}),
      ...(q.search?.trim() && {
        OR: ['orderNumber', 'teamName', 'contactPerson', 'organization', 'poNumber'].map((k) => ({ [k]: { contains: q.search!.trim(), mode: 'insensitive' } }))
          .concat([{ contactPhone: { contains: q.search.trim() } } as any]),
      }),
    };
    const views: Record<TeamView, Prisma.SportsTeamOrderWhereInput> = {
      active: { status: { in: [...ACTIVE] } },
      quote: { status: { in: ['DRAFT', 'QUOTED'] } },
      production: { status: { in: ['CONFIRMED', 'IN_PRODUCTION'] } },
      ready: { status: 'READY' },
      late: { status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY'] }, expectedDeliveryDate: { lt: today } },
      unpaid: { status: { in: [...ACTIVE] }, balanceAmount: { gt: 0.009 } },
      done: { status: { in: ['DELIVERED', 'CANCELLED'] } },
      all: {},
    };
    const where = { AND: [base, views[view]] };
    const [items, total, totals, ...counts] = await Promise.all([
      this.prisma.sportsTeamOrder.findMany({
        where,
        orderBy: view === 'done' || view === 'all' ? [{ createdAt: 'desc' }] : [{ expectedDeliveryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip, take: limit,
      }),
      this.prisma.sportsTeamOrder.count({ where }),
      this.prisma.sportsTeamOrder.aggregate({ where: { AND: [where, { status: { not: 'CANCELLED' } }] }, _sum: { totalAmount: true, advancePaid: true, balanceAmount: true } }),
      ...TEAM_VIEWS.map((v) => this.prisma.sportsTeamOrder.count({ where: { AND: [base, views[v]] } })),
    ]);
    return {
      items, total, page, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(TEAM_VIEWS.map((v, i) => [v, counts[i]])) as Record<TeamView, number>,
      totals: { value: r2(totals._sum.totalAmount ?? 0), advance: r2(totals._sum.advancePaid ?? 0), due: r2(totals._sum.balanceAmount ?? 0) },
    };
  }

  /**
   * Gives back in cash the advance of a cancelled order (khata REFUND line
   * plus a cash-out from the open drawer).
   */
  async refund(user: AuthenticatedUser, id: string, scope?: ShopScope, managerPin?: string) {
    const o = await this.getOne(user, id);
    if (o.status !== 'CANCELLED') throw new BadRequestException('Pehle order cancel karein, phir advance wapas hota hai');
    await checkRefundPin(this.prisma, user, managerPin);
    const shopId = await resolveIndustryShopId(this.prisma as any, user, scope?.shopId);
    const customerId = await this.teamCustomer(this.prisma, user, o, shopId);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.sportsTeamOrder.updateMany({ where: { id, tenantId: user.tenantId, status: 'CANCELLED', updatedAt: o.updatedAt }, data: { updatedAt: new Date() } });
      if (!claimed.count) throw new ConflictException('Order abhi kisi aur ne badla — safha taaza karein');
      const amount = await refundAdvance(tx, user, { reference: o.orderNumber, label: 'Team order', customerId, shopId });
      return tx.sportsTeamOrder.update({
        where: { id },
        data: {
          advancePaid: r2(Math.max(Number(o.advancePaid) - amount, 0)),
          internalNotes: [o.internalNotes, `Advance wapas: Rs ${amount}`].filter(Boolean).join('\n'),
        },
      });
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    hasCustomJerseys?: boolean;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.sportsTeamOrder.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && (Object.values(TeamOrderStatus) as string[]).includes(params.status) && { status: params.status as TeamOrderStatus }),
        ...(params.hasCustomJerseys !== undefined && { hasCustomJerseys: params.hasCustomJerseys }),
        ...(params.from || params.to
          ? {
              createdAt: {
                ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
                ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { orderNumber: { contains: params.search, mode: 'insensitive' } },
            { teamName: { contains: params.search, mode: 'insensitive' } },
            { contactPerson: { contains: params.search, mode: 'insensitive' } },
            { contactPhone: { contains: params.search } },
            { organization: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order nahi mila');
    const [sale, refunded] = await Promise.all([
      this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, sourceRef: o.orderNumber, status: { not: 'VOIDED' } }, select: { id: true, saleNumber: true } }),
      refundedOnKhata(this.prisma, user.tenantId, o.orderNumber),
    ]);
    return { ...o, sale, refunded };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateTeamOrderStatusDto, scope?: ShopScope) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');
    if ((o.status === 'DELIVERED' || o.status === 'CANCELLED') && dto.status !== o.status) {
      throw new BadRequestException(`${o.orderNumber} pehle hi ${o.status === 'DELIVERED' ? 'deliver' : 'cancel'} ho chuka hai`);
    }
    if (o.status === dto.status) return o;

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'QUOTED' && !o.quotedAt) patch.quotedAt = now;
    if (dto.status === 'CONFIRMED' && !o.confirmedAt) patch.confirmedAt = now;
    if (dto.status === 'DELIVERED' && !o.deliveredAt) patch.deliveredAt = now;
    if (dto.notes) patch.internalNotes = ((o.internalNotes || '') + '\n' + dto.notes).trim();

    if (dto.status !== 'DELIVERED') {
      return this.prisma.sportsTeamOrder.update({ where: { id }, data: patch });
    }

    // Delivery is the sale: stock leaves the shop and the income is booked
    // through the normal sale engine. Advances on the team's khata pay for it.
    const total = r2(o.totalAmount);
    const advance = r2(o.advancePaid);
    const due = r2(Math.max(total - advance, 0));
    const takenNow = r2(Math.max(dto.paidNow ?? due, 0));
    const kept = r2(Math.min(takenNow, due));
    const legacyPaid = r2(Math.max(advance - (await paidOnKhata(this.prisma as any, user.tenantId, o.orderNumber)), 0));
    const shopId = await resolveIndustryShopId(this.prisma as any, user, scope?.shopId);
    const needsKhata = advance - legacyPaid > 0.009 || due - kept > 0.009;
    const customerId = needsKhata ? await this.teamCustomer(this.prisma, user, o, shopId) : undefined;
    const lines = await this.saleLines(user, o.items as unknown as TeamItem[]);

    // The order number rides on the sale, so a retried delivery finds the first bill.
    const already = await this.prisma.sale.findFirst({
      where: { tenantId: user.tenantId, sourceRef: o.orderNumber, status: { not: 'VOIDED' } },
      select: { id: true, saleNumber: true },
    });
    const sale: any = already ?? await this.sales.create(user, new ShopScope(shopId, false), {
      shopId,
      customerId,
      paymentMethod: (dto.paymentMethod ?? o.paymentMethod ?? 'CASH') as any,
      paidAmount: r2(kept + legacyPaid),
      discount: r2(o.discountAmount),
      allowCredit: customerId ? true : undefined,
      items: lines,
      serviceCharges: [
        ...(o.taxAmount > 0 ? [{ type: 'OTHER', label: 'Tax', amount: r2(o.taxAmount) }] : []),
        ...(o.shippingCharge > 0 ? [{ type: 'DELIVERY', label: 'Delivery / shipping', amount: r2(o.shippingCharge) }] : []),
      ],
    } as any, { source: 'POS', sourceRef: o.orderNumber });

    const paidTotal = r2(advance + kept);
    return this.prisma.sportsTeamOrder.update({
      where: { id },
      data: {
        ...patch,
        advancePaid: paidTotal,
        balanceAmount: r2(Math.max(total - paidTotal, 0)),
        invoiceUrl: o.invoiceUrl ?? `/sales/${sale.id}`,
        internalNotes: [patch.internalNotes ?? o.internalNotes, `Bill: ${sale.saleNumber}`].filter(Boolean).join('\n'),
      },
    });
  }

  /** Sale lines for the order; a sized product sells the matching size variant. */
  private async saleLines(user: AuthenticatedUser, items: TeamItem[]) {
    const ids = [...new Set(items.map((it) => it.productId))];
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: ids } },
      select: { id: true, name: true, hasVariants: true, variants: { where: { isActive: true }, select: { id: true, name: true, size: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return items.map((it) => {
      const p = byId.get(it.productId);
      if (!p) throw new BadRequestException(`${it.productName || 'Item'}: product ab maujood nahi`);
      let variantId = it.variantId;
      if (!variantId && p.hasVariants && p.variants.length) {
        const size = String(it.size ?? '').trim().toLowerCase();
        const match = size && p.variants.find((v) => (v.size ?? '').toLowerCase() === size || v.name.toLowerCase() === size);
        if (!match) throw new BadRequestException(`${p.name}: size likhein (${p.variants.map((v) => v.size || v.name).join(', ')})`);
        variantId = match.id;
      }
      const printing = r2(Number(it.printingPrice) || 0);
      const extra = [it.size && `Size ${it.size}`, it.color, printing > 0 && `Printing Rs ${printing}/piece`, it.customizationNotes].filter(Boolean).join(' · ');
      return {
        productId: it.productId,
        ...(variantId ? { variantId } : {}),
        quantity: Number(it.quantity),
        priceOverride: r2(Number(it.unitPrice) + printing),
        ...(extra ? { note: extra } : {}),
      };
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTeamOrderDto) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') {
      throw new BadRequestException('Deliver ya cancel shuda order badla nahi ja sakta');
    }
    if (dto.advancePaid !== undefined && Math.abs(r2(dto.advancePaid) - r2(o.advancePaid)) > 0.009) {
      throw new BadRequestException('Advance yahan nahi badalta — "Payment" se amount darj karein');
    }

    // Money fields are kept out; totals are recomputed below.
    const { advancePaid: _a, items: newItems, playerNames, playerNumbers: _n, ...rest } = dto;
    const patch: any = { ...rest };
    if (playerNames !== undefined) {
      const roster = cleanRoster(playerNames) ?? [];
      patch.playerNames = roster;
      patch.playerNumbers = roster.map((p) => p.number);
    }
    if (dto.expectedDeliveryDate) patch.expectedDeliveryDate = new Date(dto.expectedDeliveryDate);

    const items = (newItems ?? (o.items as unknown as TeamItem[]));
    if (newItems) {
      if (!newItems.length) throw new BadRequestException('Kam az kam ek item zaroori hai');
      await this.checkProducts(user, newItems);
    }
    const t = orderTotals(items, dto.discountPct ?? o.discountPct, dto.taxAmount ?? o.taxAmount, dto.shippingCharge ?? o.shippingCharge);
    if (r2(o.advancePaid) > t.totalAmount + 0.01) {
      throw new BadRequestException(`Rs ${r2(o.advancePaid)} advance mil chuka hai — order is se kam nahi ho sakta`);
    }
    Object.assign(patch, {
      items: t.items as any,
      totalQuantity: t.totalQuantity,
      subtotal: t.subtotal,
      discountAmount: t.discountAmount,
      totalAmount: t.totalAmount,
      balanceAmount: r2(t.totalAmount - Number(o.advancePaid || 0)),
    });

    return this.prisma.sportsTeamOrder.update({ where: { id }, data: patch });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: RecordPaymentDto, scope?: ShopScope) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED') {
      throw new BadRequestException(o.status === 'DELIVERED'
        ? 'Order deliver ho chuka — baqi amount team ke khate se wasool karein'
        : 'Cancel shuda order par payment nahi li ja sakti');
    }
    const due = r2(Number(o.totalAmount || 0) - Number(o.advancePaid || 0));
    if (dto.amount > due + 0.01) throw new BadRequestException(due > 0 ? `Baqi sirf Rs ${due} hai` : 'Poori amount mil chuki hai');

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope?.shopId);
      const customerId = await this.teamCustomer(tx, user, o, shopId);
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount: dto.amount, reference: o.orderNumber, note: `Team order advance ${o.orderNumber}`, method: dto.paymentMethod,
      });
      const newAdvance = r2(Number(o.advancePaid || 0) + dto.amount);
      return tx.sportsTeamOrder.update({
        where: { id },
        data: {
          advancePaid: newAdvance,
          balanceAmount: r2(Math.max(Number(o.totalAmount || 0) - newAdvance, 0)),
          paymentMethod: dto.paymentMethod ?? o.paymentMethod,
          internalNotes: dto.notes ? ((o.internalNotes || '') + '\nPayment: ' + dto.notes).trim() : undefined,
        },
      });
    });
  }

  /** Orders are cancelled, never deleted; the advance stays on the team's khata until refunded. */
  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.getOne(user, id);
    if (o.status === 'DELIVERED') throw new BadRequestException('Deliver shuda order cancel nahi hota — bill ki Return karein');
    if (o.status === 'CANCELLED') return o;
    return this.prisma.sportsTeamOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async summary(user: AuthenticatedUser) {
    const [draft, quoted, confirmed, inProduction, ready, delivered] = await Promise.all([
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'DRAFT' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'QUOTED' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'CONFIRMED' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'IN_PRODUCTION' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'READY' } }),
      this.prisma.sportsTeamOrder.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
    ]);

    const totals = await this.prisma.sportsTeamOrder.aggregate({
      where: { tenantId: user.tenantId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true, advancePaid: true, balanceAmount: true },
      _count: { _all: true },
    });

    return {
      counts: { draft, quoted, confirmed, inProduction, ready, delivered },
      totalOrders: totals._count._all,
      totalRevenue: totals._sum.totalAmount ?? 0,
      totalCollected: totals._sum.advancePaid ?? 0,
      totalPending: totals._sum.balanceAmount ?? 0,
    };
  }

  async upcomingDeliveries(user: AuthenticatedUser, days = 14) {
    const now = startOfDayTz();
    const future = endOfDayTz(addDaysTz(now, Math.min(Math.max(days, 1), 90)));

    return this.prisma.sportsTeamOrder.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY'] },
        expectedDeliveryDate: { gte: now, lte: future },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });
  }
}
