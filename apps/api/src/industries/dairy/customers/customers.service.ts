/**
 * Home delivery customers: daily quantity, route, rate, pauses. Money lives
 * on the shared customer khata (linked on first use): deliveries post as
 * khata bills, and advances and payments taken here are khata payments, so
 * Khata, day book and cash register show the same figures. The dairy row's
 * own balance is a copy for customers not linked yet; reads show the khata.
 */
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DairyKhataStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { hasPermission } from '../../../common/constants/permissions.constants';
import { recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import {
  cleanInput, dayEnd, dayStart, khataBalances, linkKhata, nextNumbered, r2, settleBills, shopYear, withLiveBalance,
} from '../dairy-common';
import { CustomerPaymentDto, PauseDeliveryDto, UpdateCustomerDto, UpsertCustomerDto } from './dto/upsert-customer.dto';

type Tab = 'all' | 'active' | 'paused' | 'owing' | 'closed';

@Injectable()
export class DairyCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** A route or khata customer from another shop must never be linked, nor one already linked. */
  private async checkLinks(tenantId: string, dto: UpdateCustomerDto, selfId?: string) {
    if (dto.routeId) {
      const r = await this.prisma.dairyRoute.findFirst({ where: { id: dto.routeId, tenantId }, select: { id: true } });
      if (!r) throw new BadRequestException('Route nahi mila');
    }
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true } });
      if (!c) throw new BadRequestException('Customer nahi mila');
      const other = await this.prisma.dairyCustomer.findFirst({ where: { customerId: dto.customerId, ...(selfId && { id: { not: selfId } }) }, select: { name: true } });
      if (other) throw new BadRequestException(`Ye khata pehle se ${other.name} ki delivery se jura hai`);
    }
    if ((dto.morningQuantity ?? 0) < 0 || (dto.eveningQuantity ?? 0) < 0) throw new BadRequestException('Quantity manfi nahi ho sakti');
    if (dto.customRate != null && dto.customRate < 0) throw new BadRequestException('Rate manfi nahi ho sakta');
  }

  /**
   * Request body without money columns and status; balances only move
   * through payments and deliveries, status through pause / close.
   */
  private fields(dto: UpdateCustomerDto) {
    const { advancePayment: _a, advanceMethod: _m, status: _s, ...rest } = cleanInput(dto) as UpdateCustomerDto;
    return {
      ...rest,
      routeId: rest.routeId || null,
      customerId: rest.customerId || null,
      ...(rest.startDate !== undefined && { startDate: dayStart(rest.startDate) }),
    } as Omit<UpdateCustomerDto, 'advancePayment' | 'advanceMethod' | 'startDate' | 'status'> & { startDate?: Date };
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: UpsertCustomerDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Customer ka naam likhein');
    await this.checkLinks(user.tenantId, dto);
    const advance = r2(Math.max(Number(dto.advancePayment) || 0, 0));
    if (advance > 0 && !hasPermission(user.role, user.permissions, 'khata.manage')) {
      throw new ForbiddenException('Advance lene ke liye "Khata manage" ki permission chahiye — advance khali chhor kar customer banayein');
    }
    const prefix = `DC-${shopYear()}-`;

    const customer = await nextNumbered(
      () => this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId, customerNumber: { startsWith: prefix } } }),
      prefix, 4,
      (customerNumber) => this.prisma.$transaction(async (tx) => {
        const created = await tx.dairyCustomer.create({
          data: { ...this.fields(dto), name: dto.name.trim(), tenantId: user.tenantId, customerNumber, advancePayment: advance },
        });
        if (advance > 0) {
          const route = created.routeId ? await tx.dairyRoute.findUnique({ where: { id: created.routeId }, select: { shopId: true } }) : null;
          const shopId = await resolveIndustryShopId(tx, user, route?.shopId ?? scope.shopId);
          const customerId = await linkKhata(tx, user, created.id, shopId);
          await recordKhataPayment(tx, user, {
            customerId, shopId, amount: advance, method: dto.advanceMethod,
            reference: customerNumber, note: `Doodh delivery advance: ${created.name} (${customerNumber})`,
          });
          return tx.dairyCustomer.update({
            where: { id: created.id },
            data: { currentBalance: -advance, totalPayments: advance, lastPaymentDate: new Date() },
          });
        }
        return created;
      }),
    );

    if (customer.routeId) await this.recalculateRouteStats(user.tenantId, customer.routeId);
    return customer;
  }

  async list(
    user: AuthenticatedUser,
    params: { routeId?: string; status?: string; search?: string; area?: string; tab?: string; page?: number; limit?: number },
  ) {
    const search = params.search?.trim();
    const where: Prisma.DairyCustomerWhereInput = {
      tenantId: user.tenantId,
      ...(params.routeId && { routeId: params.routeId === 'none' ? null : params.routeId }),
      ...(params.status && params.status in DairyKhataStatus && { status: params.status as DairyKhataStatus }),
      ...(params.area && { area: { contains: params.area, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { customerNumber: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { address: { contains: search, mode: 'insensitive' } },
          { area: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const rows = await this.prisma.dairyCustomer.findMany({
      where,
      include: { route: true },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      take: 2000,
    });
    const live = await khataBalances(this.prisma, user.tenantId, rows.map((r) => r.customerId));
    const all = rows.map((r) => withLiveBalance(r, live));

    // Without a page the old shape (a plain list) is kept for existing callers.
    if (!params.page) return all.slice(0, 300);

    const tab = (params.tab ?? 'active') as Tab;
    const match = (c: (typeof all)[number]) => (
      tab === 'all' ? true
        : tab === 'active' ? c.status === 'ACTIVE'
          : tab === 'paused' ? c.status === 'SUSPENDED'
            : tab === 'owing' ? c.currentBalance > 0.009 && c.status !== 'CLOSED'
              : c.status === 'CLOSED' || c.status === 'DEFAULTED');
    const counts = {
      all: all.length,
      active: all.filter((c) => c.status === 'ACTIVE').length,
      paused: all.filter((c) => c.status === 'SUSPENDED').length,
      owing: all.filter((c) => c.currentBalance > 0.009 && c.status !== 'CLOSED').length,
      closed: all.filter((c) => c.status === 'CLOSED' || c.status === 'DEFAULTED').length,
    };
    const open = all.filter((c) => c.status !== 'CLOSED');
    const totals = {
      dailyLiters: r2(open.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + c.morningQuantity + c.eveningQuantity, 0)),
      owed: r2(open.reduce((s, c) => s + Math.max(c.currentBalance, 0), 0)),
      advance: r2(open.reduce((s, c) => s + Math.max(-c.currentBalance, 0), 0)),
      unlinked: open.filter((c) => !c.khataLinked).length,
    };
    const filtered = all.filter(match);
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    return { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, limit, counts, totals };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId }, include: { route: true } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    await settleBills(this.prisma, user.tenantId, id);

    const [recentDeliveries, bills, live] = await Promise.all([
      this.prisma.dairyDelivery.findMany({ where: { tenantId: user.tenantId, dairyCustomerId: id }, orderBy: [{ deliveryDate: 'desc' }, { slot: 'asc' }], take: 62 }),
      this.prisma.dairyMonthlyBill.findMany({ where: { tenantId: user.tenantId, dairyCustomerId: id }, orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 }),
      khataBalances(this.prisma, user.tenantId, [c.customerId]),
    ]);
    return { ...withLiveBalance(c, live), recentDeliveries, bills };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCustomerDto) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Customer ka naam likhein');
    await this.checkLinks(user.tenantId, dto, id);
    if (c.customerId && dto.customerId !== undefined && (dto.customerId || null) !== c.customerId) {
      throw new BadRequestException('Khata ek dafa jur jaye to badla nahi ja sakta — hisaab usi khate me hai');
    }
    const { customerId: _keep, ...data } = this.fields(dto);
    const updated = await this.prisma.dairyCustomer.update({
      where: { id },
      data: { ...data, ...(dto.name !== undefined && { name: dto.name.trim() }), ...(!c.customerId && dto.customerId && { customerId: dto.customerId }) },
    });
    if (c.routeId) await this.recalculateRouteStats(user.tenantId, c.routeId);
    if (updated.routeId && updated.routeId !== c.routeId) await this.recalculateRouteStats(user.tenantId, updated.routeId);
    return updated;
  }

  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: CustomerPaymentDto) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId }, include: { route: { select: { shopId: true } } } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    const amount = r2(Number(dto?.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount sahi likhein');

    await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, c.route?.shopId ?? scope.shopId);
      const customerId = await linkKhata(tx, user, c.id, shopId);
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, method: dto.paymentMethod,
        reference: dto.reference?.trim() || c.customerNumber,
        note: dto.notes?.trim() || `Doodh khata: ${c.name} (${c.customerNumber})`,
      });
      await tx.dairyCustomer.update({
        where: { id },
        data: { currentBalance: { decrement: amount }, totalPayments: { increment: amount }, lastPaymentDate: new Date() },
      });
      await settleBills(tx, user.tenantId, id);
    });
    return this.getOne(user, id);
  }

  async pauseDelivery(user: AuthenticatedUser, id: string, dto: PauseDeliveryDto) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    if (c.status === 'CLOSED') throw new BadRequestException('Band khate ki delivery roki nahi ja sakti');
    const from = dayStart(dto.pausedFrom);
    const to = dayEnd(dto.pausedTo);
    if (to < from) throw new BadRequestException('"Kab tak" ki tareekh "kab se" ke baad honi chahiye');

    const updated = await this.prisma.dairyCustomer.update({
      where: { id },
      data: {
        pausedFrom: from,
        pausedTo: to,
        status: 'SUSPENDED',
        notes: [c.notes, `Delivery band: ${dto.reason?.trim() || 'wajah nahi likhi'}`].filter(Boolean).join('\n'),
      },
    });
    // Sheets already made for the paused days drop the pending entries.
    await this.prisma.dairyDelivery.updateMany({
      where: { tenantId: user.tenantId, dairyCustomerId: id, status: 'SCHEDULED', deliveryDate: { gte: from, lte: to } },
      data: { status: 'CANCELLED', skipReason: 'Delivery band (pause)' },
    });
    if (c.routeId) await this.recalculateRouteStats(user.tenantId, c.routeId);
    return updated;
  }

  async resumeDelivery(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    if (c.status === 'CLOSED') throw new BadRequestException('Band khata pehle dobara kholein');
    const updated = await this.prisma.dairyCustomer.update({ where: { id }, data: { status: 'ACTIVE', pausedFrom: null, pausedTo: null } });
    if (c.routeId) await this.recalculateRouteStats(user.tenantId, c.routeId);
    return updated;
  }

  async close(user: AuthenticatedUser, id: string, reason?: string) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    const live = withLiveBalance(c, await khataBalances(this.prisma, user.tenantId, [c.customerId]));
    if (live.currentBalance > 0.01) throw new BadRequestException(`Rs ${Math.round(live.currentBalance)} baqi hain — pehle hisaab saaf karein`);
    const updated = await this.prisma.dairyCustomer.update({
      where: { id },
      data: { status: 'CLOSED', notes: [c.notes, `Khata band: ${reason?.trim() || 'wajah nahi likhi'}`].filter(Boolean).join('\n') },
    });
    await this.prisma.dairyDelivery.updateMany({
      where: { tenantId: user.tenantId, dairyCustomerId: id, status: 'SCHEDULED' },
      data: { status: 'CANCELLED', skipReason: 'Khata band' },
    });
    if (c.routeId) await this.recalculateRouteStats(user.tenantId, c.routeId);
    return updated;
  }

  async reopen(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer nahi mila');
    if (c.status !== 'CLOSED') return c;
    const updated = await this.prisma.dairyCustomer.update({ where: { id }, data: { status: 'ACTIVE', pausedFrom: null, pausedTo: null } });
    if (c.routeId) await this.recalculateRouteStats(user.tenantId, c.routeId);
    return updated;
  }

  private async recalculateRouteStats(tenantId: string, routeId: string) {
    const customers = await this.prisma.dairyCustomer.findMany({ where: { tenantId, routeId, status: 'ACTIVE' }, select: { morningQuantity: true, eveningQuantity: true } });
    await this.prisma.dairyRoute.updateMany({
      where: { id: routeId, tenantId },
      data: { totalCustomers: customers.length, totalDailyLiters: r2(customers.reduce((s, c) => s + c.morningQuantity + c.eveningQuantity, 0)) },
    });
  }

  private async liveAll(tenantId: string) {
    const rows = await this.prisma.dairyCustomer.findMany({ where: { tenantId }, include: { route: true } });
    const live = await khataBalances(this.prisma, tenantId, rows.map((r) => r.customerId));
    return rows.map((r) => withLiveBalance(r, live));
  }

  async withOutstandingBalance(user: AuthenticatedUser) {
    return (await this.liveAll(user.tenantId))
      .filter((c) => c.currentBalance > 0.009 && c.status !== 'CLOSED')
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 100);
  }

  async summary(user: AuthenticatedUser) {
    const all = await this.liveAll(user.tenantId);
    const owing = all.filter((c) => c.currentBalance > 0.009);
    return {
      totalCustomers: all.length,
      activeCustomers: all.filter((c) => c.status === 'ACTIVE').length,
      suspendedCustomers: all.filter((c) => c.status === 'SUSPENDED').length,
      outstandingAmount: r2(owing.reduce((s, c) => s + c.currentBalance, 0)),
      customersWithBalance: owing.length,
    };
  }
}
