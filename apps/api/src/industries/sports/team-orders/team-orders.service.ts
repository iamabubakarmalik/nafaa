import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import {
  ensureCustomer, paidOnKhata, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { nextRunningNumber } from '../common/service-sale.helper';
import { CreateTeamOrderDto, RecordPaymentDto, UpdateTeamOrderDto, UpdateTeamOrderStatusDto } from './dto/create-team-order.dto';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

type TeamItem = CreateTeamOrderDto['items'][number];

/** Totals of an order from its lines; line totals are recomputed from qty x price. */
function orderTotals(items: TeamItem[], discountPct: number, taxAmount: number, shippingCharge: number) {
  const clean = items.map((it) => {
    const quantity = Math.max(Math.round(Number(it.quantity) || 0), 0);
    const unitPrice = r2(Math.max(Number(it.unitPrice) || 0, 0));
    return { ...it, quantity, unitPrice, total: r2(quantity * unitPrice) };
  });
  if (clean.some((it) => it.quantity <= 0)) throw new BadRequestException('Har item ki tadaad 1 ya zyada honi chahiye');
  if (discountPct < 0 || discountPct > 100) throw new BadRequestException('Chhoot 0 se 100% ke beech honi chahiye');
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

  /** Khata account for the team; advances and any unpaid balance are kept there. */
  private teamCustomer(tx: any, user: AuthenticatedUser, o: { contactPerson: string; teamName: string; contactPhone: string }, shopId: string) {
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
    if (advancePaid > totalAmount + 0.01) throw new BadRequestException('Advance order ki kul raqam se zyada nahi ho sakta');
    const balanceAmount = r2(totalAmount - advancePaid);

    return this.prisma.$transaction(async (tx) => {
      if (advancePaid > 0) {
        // The advance is cash in hand today; it waits on the team's khata
        // and is used up by the sale made on delivery.
        const shopId = await resolveIndustryShopId(tx, user, scope?.shopId);
        const customerId = await this.teamCustomer(tx, user, dto, shopId);
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advancePaid, reference: orderNumber, note: `Team order advance ${orderNumber}`,
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
          hasCustomJerseys: dto.hasCustomJerseys ?? false,
          customizationDetails: dto.customizationDetails,
          playerNames: dto.playerNames,
          playerNumbers: dto.playerNumbers,
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

  /** Every line must point at a product of this shop. */
  private async checkProducts(user: AuthenticatedUser, items: TeamItem[]) {
    if (items.some((it) => !it?.productId)) throw new BadRequestException('Har item ke liye product chunein');
    const ids = [...new Set(items.map((it) => it.productId))];
    const found = await this.prisma.product.count({ where: { tenantId: user.tenantId, id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('Order me koi product nahi mila');
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
        ...(params.status && { status: params.status as any }),
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
    if (!o) throw new NotFoundException('Team order not found');
    return o;
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
      paidAmount: r2(takenNow + legacyPaid),
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
      const extra = [it.size && `Size ${it.size}`, it.color, it.customizationNotes].filter(Boolean).join(' · ');
      return {
        productId: it.productId,
        ...(variantId ? { variantId } : {}),
        quantity: Number(it.quantity),
        priceOverride: r2(it.unitPrice),
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
      throw new BadRequestException('Advance yahan nahi badalta — "Payment" se raqam darj karein');
    }

    // Money fields are kept out; totals are recomputed below.
    const { advancePaid: _a, items: newItems, ...rest } = dto;
    const patch: any = { ...rest };
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
        ? 'Order deliver ho chuka — baqi raqam team ke khate se wasool karein'
        : 'Cancel shuda order par payment nahi li ja sakti');
    }
    const due = r2(Number(o.totalAmount || 0) - Number(o.advancePaid || 0));
    if (dto.amount > due + 0.01) throw new BadRequestException(due > 0 ? `Baqi sirf Rs ${due} hai` : 'Poori raqam mil chuki hai');

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope?.shopId);
      const customerId = await this.teamCustomer(tx, user, o, shopId);
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount: dto.amount, reference: o.orderNumber, note: `Team order advance ${o.orderNumber}`,
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

  async remove(user: AuthenticatedUser, id: string) {
    const o = await this.prisma.sportsTeamOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!o) throw new NotFoundException('Team order not found');
    if (o.status === 'DELIVERED') {
      throw new BadRequestException('Deliver shuda order mitaya nahi ja sakta');
    }
    if (Number(o.advancePaid || 0) > 0) {
      throw new BadRequestException('Is order par paise liye ja chuke hain — mitane ke bajaye Cancel karein');
    }
    return this.prisma.sportsTeamOrder.delete({ where: { id } });
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
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

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
