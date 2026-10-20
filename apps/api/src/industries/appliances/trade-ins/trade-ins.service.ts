/**
 * Old appliances a customer hands in when buying a new one (an old AC,
 * fridge or washing machine). The agreed value comes off the new bill as a
 * trade-in payment (code ATI-…). The unit stays in the shop until it is sold
 * on, scrapped, or given back to the customer.
 *
 * - A counter bill's trade-ins are linked to it when the register is next
 *   read; a voided bill frees them for another bill (see the void listener).
 * - Selling the unit on posts its own bill numbered by the code, with the
 *   trade-in value as its cost, so the profit report shows the gain or loss.
 *   Voiding that bill puts the unit back in the shop.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ApplianceTradeInStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { nextInSequence, r2, yearPrefix } from '../common/appliance-common';
import { billJob } from '../common/books';
import { CreateApplianceTradeInDto, ListTradeInsQuery, SellTradeInDto, SetTradeInStatusDto, UpdateApplianceTradeInDto } from './dto/trade-in.dto';

const STATUSES: ApplianceTradeInStatus[] = ['HELD', 'SOLD', 'SCRAPPED', 'RETURNED'];

/** "Purana AC 1.5 ton (Gree)": the unit's name, with "Purana" in front unless already there. */
const tradeInLabel = (t: { description: string; brand?: string | null }) =>
  `${/^purana\b/i.test(t.description) ? '' : 'Purana '}${t.description}${t.brand ? ` (${t.brand})` : ''}`;

/** Trade-ins of this branch, plus those with no branch. */
const inBranch = (shopId: string | null): Prisma.ApplianceTradeInWhereInput =>
  (shopId ? { OR: [{ shopId }, { shopId: null }] } : {});

@Injectable()
export class ApplianceTradeInsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The customer hands in an old unit at the counter. */
  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateApplianceTradeInDto) {
    const description = dto.description.trim();
    if (description.length < 2) throw new BadRequestException('Purane saman ka naam likhein (maslan: purana AC 1.5 ton)');
    const customerId = dto.customerId
      ? (await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } }))?.id
      : null;
    if (dto.customerId && !customerId) throw new NotFoundException('Customer nahi mila');
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);
    const prefix = yearPrefix('ATI');
    for (let attempt = 0; attempt < 3; attempt++) {
      const last = await this.prisma.applianceTradeIn.findFirst({
        where: { tenantId: user.tenantId, code: { startsWith: prefix } }, orderBy: { code: 'desc' }, select: { code: true },
      });
      try {
        return await this.prisma.applianceTradeIn.create({
          data: {
            tenantId: user.tenantId, shopId, code: nextInSequence(prefix, last?.code), description,
            brand: dto.brand?.trim() || null, model: dto.model?.trim() || null, condition: dto.condition ?? null,
            value: r2(dto.value), customerId, createdById: user.id,
          },
        });
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new BadRequestException('Code nahi bana — dobara koshish karein');
  }

  /** Paged list for one status, with count and value per status. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: ListTradeInsQuery) {
    await this.syncUsed(user.tenantId);
    const limit = q.limit ?? 30;
    const page = q.page ?? 1;
    const s = q.search?.trim();
    const base: Prisma.ApplianceTradeInWhereInput = {
      tenantId: user.tenantId,
      AND: [
        inBranch(scope.shopId),
        s ? { OR: [{ code: { contains: s, mode: 'insensitive' } }, { description: { contains: s, mode: 'insensitive' } }, { brand: { contains: s, mode: 'insensitive' } }, { model: { contains: s, mode: 'insensitive' } }] } : {},
      ],
    };
    const view = q.view ?? 'HELD';
    const where = view === 'all' ? base : { ...base, status: view };
    const [items, total, groups] = await Promise.all([
      this.prisma.applianceTradeIn.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.applianceTradeIn.count({ where }),
      this.prisma.applianceTradeIn.groupBy({ by: ['status'], where: base, _count: { _all: true }, _sum: { value: true } }),
    ]);
    const saleIds = [...new Set(items.map((t) => t.saleId).filter((x): x is string => !!x))];
    const customerIds = [...new Set(items.map((t) => t.customerId).filter((x): x is string => !!x))];
    const codes = items.filter((t) => t.status === 'SOLD').map((t) => t.code);
    const [sales, customers, resales] = await Promise.all([
      saleIds.length ? this.prisma.sale.findMany({ where: { tenantId: user.tenantId, id: { in: saleIds } }, select: { id: true, saleNumber: true, status: true } }) : [],
      customerIds.length ? this.prisma.customer.findMany({ where: { tenantId: user.tenantId, id: { in: customerIds } }, select: { id: true, name: true, phone: true } }) : [],
      codes.length ? this.prisma.sale.findMany({ where: { tenantId: user.tenantId, sourceRef: { in: codes }, status: { not: 'VOIDED' } }, select: { id: true, saleNumber: true, sourceRef: true, total: true, createdAt: true } }) : [],
    ]);
    const saleById = new Map(sales.map((x) => [x.id, x]));
    const customerById = new Map(customers.map((x) => [x.id, x]));
    const resaleByCode = new Map(resales.map((x) => [x.sourceRef, x]));
    const counts = Object.fromEntries(STATUSES.map((st) => {
      const g = groups.find((x) => x.status === st);
      return [st, { count: g?._count._all ?? 0, value: r2(g?._sum.value ?? 0) }];
    })) as Record<ApplianceTradeInStatus, { count: number; value: number }>;
    return {
      items: items.map((t) => ({
        ...t,
        sale: t.saleId ? saleById.get(t.saleId) ?? null : null,
        customer: t.customerId ? customerById.get(t.customerId) ?? null : null,
        resale: t.status === 'SOLD' ? resaleByCode.get(t.code) ?? null : null,
      })),
      total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1),
      counts: { ...counts, all: { count: STATUSES.reduce((n, st) => n + counts[st].count, 0), value: r2(STATUSES.reduce((n, st) => n + counts[st].value, 0)) } },
    };
  }

  /** Units in the shop and not on a live bill: what the counter can take as a trade-in. */
  async counter(user: AuthenticatedUser, scope: ShopScope) {
    await this.syncUsed(user.tenantId);
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope);
    const open = await this.prisma.applianceTradeIn.findMany({
      where: { tenantId: user.tenantId, status: 'HELD', saleId: null, ...inBranch(shopId) },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    return open.map((t) => ({ code: t.code, label: tradeInLabel(t), value: t.value }));
  }

  /** Corrects a unit that is still in the shop and not on a bill. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateApplianceTradeInDto) {
    const t = await this.free(user, id, 'badla');
    return this.prisma.applianceTradeIn.update({
      where: { id: t.id },
      data: {
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.brand !== undefined && { brand: dto.brand.trim() || null }),
        ...(dto.model !== undefined && { model: dto.model.trim() || null }),
        ...(dto.condition !== undefined && { condition: dto.condition }),
        ...(dto.value !== undefined && { value: r2(dto.value) }),
      },
    });
  }

  /**
   * Scrapped, given back to the customer, or back in the shop. A unit on a
   * live bill stays in the shop; a sold unit comes back only by voiding its
   * sale bill.
   */
  async setStatus(user: AuthenticatedUser, id: string, dto: SetTradeInStatusDto) {
    await this.syncUsed(user.tenantId);
    const t = await this.prisma.applianceTradeIn.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Purana saman nahi mila');
    if (t.status === dto.status) return t;
    if (t.status === 'SOLD') throw new BadRequestException('Bika hua saman wapas laane ke liye us ka bill Sales se void karein');
    if (dto.status === 'RETURNED' && t.saleId) throw new BadRequestException(`Ye saman bill ${await this.saleNumber(t.saleId)} me trade-in laga hai — pehle wo bill void karein`);
    return this.prisma.applianceTradeIn.update({ where: { id: t.id }, data: { status: dto.status } });
  }

  /**
   * Sells the unit on, paid in full: a bill numbered by the trade-in code
   * (ATI-2026-0001, then -2 after a void) with the trade-in value as cost.
   * Only a unit the shop actually took on a live bill can be sold.
   */
  async sell(user: AuthenticatedUser, id: string, dto: SellTradeInDto) {
    await this.syncUsed(user.tenantId);
    const t = await this.prisma.applianceTradeIn.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Purana saman nahi mila');
    if (t.status !== 'HELD') throw new BadRequestException('Sirf dukaan me para saman bikta hai');
    if (!t.saleId) throw new BadRequestException('Ye saman abhi kisi bill par trade-in nahi laga — pehle naye bill me Trade-in chunein');
    const price = r2(dto.price);
    const buyer = dto.buyer?.trim();
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.applianceTradeIn.updateMany({ where: { id: t.id, status: 'HELD' }, data: { status: 'SOLD' } });
      if (!claimed.count) throw new BadRequestException('Ye saman abhi bik chuka hai');
      const bill = await billJob(tx, user, { number: t.code }, [{
        label: `${tradeInLabel(t)} ${t.code}${buyer ? ` — ${buyer}` : ''}`, amount: price, cost: r2(t.value),
      }], price, dto.paymentMethod);
      return { tradeIn: { ...t, status: 'SOLD' as const }, saleId: bill?.id ?? null, saleNumber: bill?.saleNumber ?? null };
    });
  }

  /** A unit still in the shop and not on any live bill. */
  private async free(user: AuthenticatedUser, id: string, action: string) {
    await this.syncUsed(user.tenantId);
    const t = await this.prisma.applianceTradeIn.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Purana saman nahi mila');
    if (t.status !== 'HELD') throw new BadRequestException(`Sirf dukaan me para saman ${action} ja sakta hai`);
    if (t.saleId) throw new BadRequestException(`Ye saman bill ${await this.saleNumber(t.saleId)} me lag chuka hai — ab ${action} nahi ja sakta`);
    return t;
  }

  private async saleNumber(saleId: string) {
    return (await this.prisma.sale.findUnique({ where: { id: saleId }, select: { saleNumber: true } }))?.saleNumber ?? '';
  }

  /** Links held units that a live counter bill took as a trade-in to that bill and its customer. */
  private async syncUsed(tenantId: string) {
    const open = await this.prisma.applianceTradeIn.findMany({ where: { tenantId, saleId: null, status: 'HELD' }, select: { id: true, code: true, customerId: true }, take: 500 });
    if (!open.length) return;
    const used = await this.prisma.salePayment.findMany({
      where: { tenantId, method: 'TRADE_IN', reference: { in: open.map((t) => t.code) }, sale: { status: { not: 'VOIDED' } } },
      select: { reference: true, saleId: true, sale: { select: { customerId: true } } },
    });
    for (const p of used) {
      const t = open.find((x) => x.code === p.reference);
      if (!t) continue;
      await this.prisma.applianceTradeIn.updateMany({
        where: { id: t.id, saleId: null },
        data: { saleId: p.saleId, ...(!t.customerId && p.sale.customerId && { customerId: p.sale.customerId }) },
      });
    }
  }
}
