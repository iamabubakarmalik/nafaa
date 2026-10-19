/**
 * Alteration tickets: a garment handed in for fitting (bought here or
 * elsewhere), the work, money before delivery (held on khata) and the bill
 * when it is handed back. Free alterations close with no bill.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GarmentAlterationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateAlterationDto, UpdateAlterationDto } from './dto/create-alteration.dto';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import {
  DAY_MS, findBill, garmentClock, opt, ownCustomer, ownProduct, paging, parseDay, payStatus, personNames, r2, withNextNumber,
} from '../common/garments-common';

type Db = Prisma.TransactionClient;
const CLOSED: GarmentAlterationStatus[] = ['DELIVERED', 'CANCELLED'];
const VIEWS = ['active', 'today', 'late', 'ready', 'unpaid', 'done', 'all'] as const;
type View = (typeof VIEWS)[number];
const due = (t: { charges: number; paidAmount: number }) => r2(Math.max(Number(t.charges) - Number(t.paidAmount), 0));

export interface AlterationQuery { view?: string; page?: string; limit?: string; search?: string; from?: string; to?: string; priority?: string; type?: string; customerId?: string }

@Injectable()
export class AlterationsService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  private get db() { return this.prisma as unknown as Db; }

  /** Links must belong to this shop: customer, the bill it came from, the product. */
  private async checkLinks(user: AuthenticatedUser, dto: { customerId?: string; saleId?: string; productId?: string; variantId?: string }) {
    const customer = await ownCustomer(this.db, user, opt(dto.customerId));
    if (opt(dto.saleId)) {
      const sale = await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId: user.tenantId }, select: { id: true } });
      if (!sale) throw new NotFoundException('Bill nahi mila');
    }
    if (opt(dto.productId)) await ownProduct(this.db, user, dto.productId!, opt(dto.variantId));
    return customer;
  }

  async create(user: AuthenticatedUser, dto: CreateAlterationDto, activeShopId?: string | null) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const customer = await this.checkLinks(user, dto);
    const name = opt(dto.customerName) ?? customer?.name;
    const charges = r2(dto.charges ?? 0);
    const advance = r2(dto.advanceAmount ?? 0);
    if (advance > charges + 0.01) throw new BadRequestException(`Advance charges (Rs ${charges}) se zyada nahi ho sakta`);
    if (advance > 0 && !name) throw new BadRequestException('Advance ke liye customer ka naam likhein');
    const shopId = await resolveIndustryShopId(this.db, user, dto.shopId || activeShopId);

    const ticket = await withNextNumber(
      async (prefix) => (await this.prisma.garmentAlterationTicket.findFirst({
        where: { tenantId: user.tenantId, ticketNumber: { startsWith: prefix } },
        orderBy: { ticketNumber: 'desc' }, select: { ticketNumber: true },
      }))?.ticketNumber,
      `ALT-${clock.year()}-`,
      (ticketNumber) => this.prisma.$transaction(async (tx) => {
        const t = await tx.garmentAlterationTicket.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            ticketNumber,
            customerId: customer?.id ?? null,
            saleId: opt(dto.saleId),
            productId: opt(dto.productId),
            variantId: opt(dto.variantId),
            customerName: name,
            customerPhone: opt(dto.customerPhone) ?? customer?.phone ?? undefined,
            garmentDescription: dto.garmentDescription.trim(),
            alterationType: dto.alterationType.trim(),
            alterationDetails: opt(dto.alterationDetails),
            priority: dto.priority ?? 'NORMAL',
            promisedDate: parseDay(clock, dto.promisedDate),
            tailorId: opt(dto.tailorId),
            charges,
            beforeImageUrls: dto.beforeImageUrls ?? [],
            notes: opt(dto.notes),
          },
        });
        if (advance > 0) await this.takeAdvance(tx, user, t, advance, dto.advanceMethod);
        return t;
      }),
    );
    return this.getOne(user, ticket.id);
  }

  async list(user: AuthenticatedUser, params: { status?: string; priority?: string; customerId?: string; tailorId?: string; search?: string }) {
    return this.prisma.garmentAlterationTicket.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as GarmentAlterationStatus }),
        ...(params.priority && { priority: params.priority as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.tailorId && { tailorId: params.tailorId }),
        ...this.searchWhere(params.search),
      },
      orderBy: [{ priority: 'desc' }, { promisedDate: 'asc' }],
      take: 200,
    });
  }

  private searchWhere(search?: string): Prisma.GarmentAlterationTicketWhereInput {
    const s = search?.trim();
    if (!s) return {};
    return {
      OR: [
        { ticketNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { customerPhone: { contains: s } },
        { garmentDescription: { contains: s, mode: 'insensitive' } },
        { alterationType: { contains: s, mode: 'insensitive' } },
      ],
    };
  }

  /** One page of tickets for a view, with counts per view and money of the view. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: AlterationQuery) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const view: View = VIEWS.includes(q.view as View) ? (q.view as View) : 'active';
    const { page, limit } = paging(q);
    const range = clock.range(q.from, q.to);
    const base: Prisma.GarmentAlterationTicketWhereInput = {
      tenantId: user.tenantId,
      AND: [scope.whereLoose, this.searchWhere(q.search)],
      ...(q.priority && { priority: q.priority as never }),
      ...(q.type && { alterationType: { equals: q.type, mode: 'insensitive' } }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(range && { receivedAt: range }),
    };
    const open = await this.prisma.garmentAlterationTicket.findMany({
      where: { ...base, status: { notIn: CLOSED } },
      orderBy: [{ promisedDate: { sort: 'asc', nulls: 'last' } }, { receivedAt: 'asc' }],
      take: 2000,
    });
    const today = clock.today();
    const views: Record<Exclude<View, 'done' | 'all'>, typeof open> = {
      active: open,
      today: open.filter((t) => t.promisedDate && t.promisedDate >= today.gte && t.promisedDate < today.lt),
      late: open.filter((t) => t.promisedDate && t.promisedDate < today.gte && t.status !== 'READY'),
      ready: open.filter((t) => t.status === 'READY'),
      unpaid: open.filter((t) => due(t) > 0.5),
    };
    const closedWhere: Prisma.GarmentAlterationTicketWhereInput = { ...base, status: { in: CLOSED } };
    const [doneCount, allCount] = await Promise.all([
      this.prisma.garmentAlterationTicket.count({ where: closedWhere }),
      this.prisma.garmentAlterationTicket.count({ where: base }),
    ]);
    const counts = { active: open.length, today: views.today.length, late: views.late.length, ready: views.ready.length, unpaid: views.unpaid.length, done: doneCount, all: allCount };
    let items: typeof open;
    let total: number;
    if (view === 'done' || view === 'all') {
      [items, total] = await Promise.all([
        this.prisma.garmentAlterationTicket.findMany({ where: view === 'done' ? closedWhere : base, orderBy: { receivedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        Promise.resolve(view === 'done' ? doneCount : allCount),
      ]);
    } else {
      total = views[view].length;
      items = views[view].slice((page - 1) * limit, page * limit);
    }
    const names = await personNames(this.db, user.tenantId, items.map((t) => t.tailorId));
    const shown = view === 'done' || view === 'all' ? null : views[view];
    return {
      items: items.map((t) => ({ ...t, tailorName: t.tailorId ? names.get(t.tailorId) ?? null : null })),
      total, page, pages: Math.max(Math.ceil(total / limit), 1), counts,
      totals: shown ? { value: r2(shown.reduce((s, t) => s + t.charges, 0)), due: r2(shown.reduce((s, t) => s + due(t), 0)) } : null,
    };
  }

  /** Open-ticket numbers and the period's work by alteration type. */
  async summary(user: AuthenticatedUser, scope: ShopScope, params: { from?: string; to?: string }) {
    const clock = await garmentClock(this.tz, user.tenantId);
    const todayKey = clock.keyOf(new Date());
    const period = clock.range(params.from, params.to) ?? clock.range(`${todayKey.slice(0, 7)}-01`, todayKey)!;
    const scoped: Prisma.GarmentAlterationTicketWhereInput = { tenantId: user.tenantId, ...scope.whereLoose };
    const [open, delivered, received] = await Promise.all([
      this.prisma.garmentAlterationTicket.findMany({ where: { ...scoped, status: { notIn: CLOSED } }, select: { status: true, promisedDate: true, charges: true, paidAmount: true }, take: 5000 }),
      this.prisma.garmentAlterationTicket.findMany({ where: { ...scoped, status: 'DELIVERED', deliveredAt: { gte: period.gte, lt: period.lt } }, select: { charges: true, alterationType: true, deliveredAt: true, promisedDate: true, receivedAt: true, saleId: true }, take: 5000 }),
      this.prisma.garmentAlterationTicket.count({ where: { ...scoped, receivedAt: { gte: period.gte, lt: period.lt } } }),
    ]);
    const today = clock.today();
    const types = new Map<string, { type: string; count: number; value: number }>();
    for (const t of delivered) {
      const key = t.alterationType.trim().toLowerCase();
      const row = types.get(key) ?? { type: t.alterationType.trim(), count: 0, value: 0 };
      row.count += 1; row.value = r2(row.value + t.charges);
      types.set(key, row);
    }
    const withPromise = delivered.filter((t) => t.promisedDate);
    const onTime = withPromise.filter((t) => t.deliveredAt && t.deliveredAt.getTime() < t.promisedDate!.getTime() + DAY_MS).length;
    return {
      open: {
        count: open.length,
        value: r2(open.reduce((s, t) => s + t.charges, 0)),
        due: r2(open.reduce((s, t) => s + due(t), 0)),
        today: open.filter((t) => t.promisedDate && t.promisedDate >= today.gte && t.promisedDate < today.lt).length,
        late: open.filter((t) => t.promisedDate && t.promisedDate < today.gte && t.status !== 'READY').length,
        ready: open.filter((t) => t.status === 'READY').length,
      },
      period: {
        from: clock.keyOf(period.gte), to: clock.keyOf(new Date(period.lt.getTime() - 1)),
        received,
        delivered: delivered.length,
        value: r2(delivered.reduce((s, t) => s + t.charges, 0)),
        free: delivered.filter((t) => !(t.charges > 0)).length,
        fromOwnSales: delivered.filter((t) => t.saleId).length,
        onTimePct: withPromise.length ? Math.round((onTime / withPromise.length) * 100) : null,
        types: [...types.values()].sort((a, b) => b.count - a.count),
      },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket nahi mila');
    const [bill, fromSale, names] = await Promise.all([
      findBill(this.db, user.tenantId, t.ticketNumber),
      t.saleId ? this.prisma.sale.findFirst({ where: { id: t.saleId, tenantId: user.tenantId }, select: { id: true, saleNumber: true, createdAt: true } }) : null,
      personNames(this.db, user.tenantId, [t.tailorId]),
    ]);
    return { ...t, bill, fromSale, tailorName: t.tailorId ? names.get(t.tailorId) ?? null : null };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateAlterationDto) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket nahi mila');
    if (CLOSED.includes(t.status)) throw new BadRequestException(`${t.ticketNumber} band ho chuka — badla nahi ja sakta`);
    const clock = await garmentClock(this.tz, user.tenantId);
    await this.checkLinks(user, dto);
    if (dto.customerId !== undefined && (opt(dto.customerId) ?? null) !== t.customerId && t.paidAmount > 0) {
      throw new BadRequestException('Advance mil chuka hai — customer nahi badla ja sakta');
    }
    if (dto.charges !== undefined && r2(dto.charges) + 0.01 < t.paidAmount) {
      throw new BadRequestException(`Rs ${r2(t.paidAmount)} pehle mil chuke — charges is se kam nahi ho sakte`);
    }
    const charges = dto.charges !== undefined ? r2(dto.charges) : t.charges;
    await this.prisma.garmentAlterationTicket.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined && { customerId: opt(dto.customerId) ?? null }),
        ...(dto.saleId !== undefined && { saleId: opt(dto.saleId) ?? null }),
        ...(dto.productId !== undefined && { productId: opt(dto.productId) ?? null, variantId: opt(dto.variantId) ?? null }),
        ...(dto.customerName !== undefined && { customerName: opt(dto.customerName) ?? null }),
        ...(dto.customerPhone !== undefined && { customerPhone: opt(dto.customerPhone) ?? null }),
        ...(dto.garmentDescription !== undefined && { garmentDescription: dto.garmentDescription.trim() }),
        ...(dto.alterationType !== undefined && { alterationType: dto.alterationType.trim() }),
        ...(dto.alterationDetails !== undefined && { alterationDetails: opt(dto.alterationDetails) ?? null }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.promisedDate !== undefined && { promisedDate: parseDay(clock, dto.promisedDate) }),
        ...(dto.tailorId !== undefined && { tailorId: opt(dto.tailorId) ?? null }),
        ...(dto.beforeImageUrls && { beforeImageUrls: dto.beforeImageUrls }),
        ...(dto.notes !== undefined && { notes: opt(dto.notes) ?? null }),
        charges,
        paymentStatus: payStatus(t.paidAmount, charges),
      },
    });
    return this.getOne(user, id);
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    status: GarmentAlterationStatus,
    afterImageUrls?: string[],
    paymentMethod?: string,
    paidNow?: number,
    reason?: string,
  ) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket nahi mila');
    if (CLOSED.includes(t.status) && status !== t.status) {
      throw new BadRequestException(`${t.ticketNumber} pehle hi ${t.status === 'DELIVERED' ? 'deliver' : 'cancel'} ho chuka hai`);
    }
    if (status === t.status) return this.getOne(user, id);
    const patch: Prisma.GarmentAlterationTicketUpdateInput = { status };
    const now = new Date();
    if (status === 'READY') patch.readyAt = now;
    if (status === 'DELIVERED') patch.deliveredAt = now;
    if (status === 'CANCELLED' && opt(reason)) patch.notes = [t.notes, `Cancel: ${reason!.trim()}`].filter(Boolean).join('\n');
    if (afterImageUrls?.length) patch.afterImageUrls = [...(t.afterImageUrls ?? []), ...afterImageUrls];

    if (status !== 'DELIVERED') {
      await this.prisma.garmentAlterationTicket.update({ where: { id }, data: patch });
      return this.getOne(user, id);
    }

    // The alteration charge is earned on delivery and booked as a sale;
    // money taken earlier is already on the customer's khata.
    const total = r2(t.charges);
    const advance = r2(t.paidAmount);
    const balance = r2(Math.max(total - advance, 0));
    const takenNow = r2(Math.max(paidNow ?? balance, 0));
    if (takenNow > balance + 0.01) throw new BadRequestException(balance > 0 ? `Baqi sirf Rs ${balance} hai` : 'Poori amount mil chuki hai');
    const stillOwed = r2(balance - takenNow);

    await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, t.shopId);
      let customerId = t.customerId;
      if (!customerId && stillOwed > 0) {
        if (!t.customerName?.trim()) {
          throw new BadRequestException(`Rs ${stillOwed} baqi hai — poori amount lein, ya udhaar ke liye customer ka naam likhein`);
        }
        customerId = await ensureCustomer(tx, user, { name: t.customerName, phone: t.customerPhone, shopId });
      }
      if (total > 0) {
        const legacyPaid = r2(Math.max(advance - (await paidOnKhata(tx, user.tenantId, t.ticketNumber)), 0));
        await postIndustrySale(tx, user, {
          saleNumber: t.ticketNumber,
          sourceRef: t.ticketNumber,
          shopId,
          customerId,
          lines: [{ label: `Alteration: ${t.garmentDescription} (${t.alterationType})`, amount: total }],
          paidAmount: r2(takenNow + legacyPaid),
          paymentMethod,
        });
      }
      const paid = r2(advance + takenNow);
      await tx.garmentAlterationTicket.update({
        where: { id },
        data: { ...patch, shopId, customerId, paidAmount: paid, paymentStatus: payStatus(paid, total) },
      });
    });
    return this.getOne(user, id);
  }

  private async takeAdvance(
    tx: Db, user: AuthenticatedUser,
    t: { id: string; ticketNumber: string; shopId: string | null; customerId: string | null; customerName: string | null; customerPhone: string | null; paidAmount: number; charges: number },
    amount: number, paymentMethod?: string,
  ) {
    const shopId = await resolveIndustryShopId(tx, user, t.shopId);
    const customerId = await ensureCustomer(tx, user, { customerId: t.customerId, name: t.customerName, phone: t.customerPhone, shopId });
    await recordKhataPayment(tx, user, {
      customerId, shopId, amount, reference: t.ticketNumber, note: `Alteration advance ${t.ticketNumber}`, method: paymentMethod,
    });
    const paid = r2(Number(t.paidAmount) + amount);
    return tx.garmentAlterationTicket.update({
      where: { id: t.id },
      data: { paidAmount: paid, paymentStatus: payStatus(paid, Number(t.charges)), customerId, shopId },
    });
  }

  /** Advance before delivery, held on khata. Method left out is cash. */
  async recordPayment(user: AuthenticatedUser, id: string, amount: number, paymentMethod?: string) {
    const t = await this.prisma.garmentAlterationTicket.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Ticket nahi mila');
    if (CLOSED.includes(t.status)) {
      throw new BadRequestException(t.status === 'DELIVERED'
        ? 'Ticket deliver ho chuka — baqi amount customer ke khate se wasool karein'
        : 'Cancel shuda ticket par payment nahi li ja sakti');
    }
    const left = due(t);
    if (amount > left + 0.01) throw new BadRequestException(left > 0 ? `Baqi sirf Rs ${left} hai` : 'Poori amount mil chuki hai');
    await this.prisma.$transaction((tx) => this.takeAdvance(tx, user, t, r2(amount), paymentMethod));
    return this.getOne(user, id);
  }
}
