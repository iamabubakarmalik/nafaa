/**
 * Karigars (carpenters) of the workshop: their jobs, workload and pay.
 * Pay handed over from the drawer is an expense tagged with the karigar's
 * code, so the day book, cash register and profit report see it. A karigar
 * is switched off, never deleted.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { endOfDayTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { toPaymentMethod } from '../../_shared/industry-sale.helper';
import { PayCarpenterDto, UpsertCarpenterDto } from './dto/upsert-carpenter.dto';

const PAY_CATEGORY = { name: 'Karigar payment', icon: '🪚', color: '#a16207' };
/** Karigar expenses carry his code in the title. */
const payTag = (code: string) => `[${code}]`;
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

@Injectable()
export class CarpentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
  ) {}

  async create(user: AuthenticatedUser, dto: UpsertCarpenterDto) {
    const dup = await this.prisma.furnitureCarpenter.findFirst({
      where: { tenantId: user.tenantId, employeeCode: dto.employeeCode },
    });
    if (dup) throw new BadRequestException(`Code "${dto.employeeCode}" pehle se kisi aur karigar ka hai`);
    return this.prisma.furnitureCarpenter.create({ data: { tenantId: user.tenantId, ...dto, name: dto.name.trim(), employeeCode: dto.employeeCode.trim() } });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; workshop?: string; search?: string }) {
    return this.prisma.furnitureCarpenter.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.workshop && { workshopLocation: { contains: params.workshop, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { employeeCode: { contains: params.search, mode: 'insensitive' } },
            { cnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Karigar nahi mila');

    const [activeOrders, recentCompleted, payments, paidMonth] = await Promise.all([
      this.prisma.furnitureCustomOrder.findMany({
        where: { tenantId: user.tenantId, carpenterId: id, status: { in: ['QUOTATION', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'READY_FOR_DELIVERY'] } },
        orderBy: { expectedDeliveryDate: 'asc' },
      }),
      this.prisma.furnitureCustomOrder.findMany({
        where: { tenantId: user.tenantId, carpenterId: id, status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED', 'ASSEMBLED', 'COMPLETED'] } },
        orderBy: { actualDeliveryDate: { sort: 'desc', nulls: 'last' } },
        take: 10,
      }),
      this.prisma.expense.findMany({
        where: { tenantId: user.tenantId, title: { contains: payTag(c.employeeCode) }, status: { not: 'CANCELLED' } },
        select: { id: true, expenseNumber: true, title: true, description: true, amount: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.expense.aggregate({
        where: { tenantId: user.tenantId, title: { contains: payTag(c.employeeCode) }, status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonthTz() } },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...c, activeOrders, recentCompleted,
      payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      paidThisMonth: r2(Number(paidMonth._sum.amount ?? 0)),
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCarpenterDto) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Karigar nahi mila');
    if (dto.employeeCode && dto.employeeCode.trim() !== c.employeeCode) {
      throw new BadRequestException('Karigar ka code nahi badalta — us se payments jurti hain');
    }
    return this.prisma.furnitureCarpenter.update({ where: { id }, data: { ...dto, employeeCode: c.employeeCode, name: dto.name?.trim() || c.name } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Karigar nahi mila');
    return this.prisma.furnitureCarpenter.update({ where: { id }, data: { isActive: false } });
  }

  async workload(user: AuthenticatedUser, id: string, from: string, to: string) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Karigar nahi mila');

    const start = startOfDayTz(from ? new Date(from) : new Date());
    const end = endOfDayTz(to ? new Date(to) : new Date());
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Dates sahi likhein');

    const orders = await this.prisma.furnitureCustomOrder.findMany({
      where: {
        tenantId: user.tenantId,
        carpenterId: id,
        productionStartDate: { gte: start, lte: end },
      },
      orderBy: { expectedDeliveryDate: 'asc' },
    });

    return {
      carpenter: c,
      orders,
      totals: {
        total: orders.length,
        active: orders.filter((o) => ['IN_PRODUCTION', 'DEPOSIT_PAID'].includes(o.status)).length,
        completed: orders.filter((o) => o.status === 'COMPLETED').length,
        revenue: orders.reduce((s, o) => s + (o.finalPrice ?? o.quotedPrice), 0),
      },
    };
  }

  async topPerformers(user: AuthenticatedUser, limit = 10) {
    return this.prisma.furnitureCarpenter.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }

  /** Pay handed to a karigar from the drawer (wage, per-job rate or advance), saved as an expense. */
  async pay(user: AuthenticatedUser, scope: ShopScope, id: string, dto: PayCarpenterDto) {
    const c = await this.prisma.furnitureCarpenter.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Karigar nahi mila');
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount likhein');
    let orderNumber = '';
    if (dto.orderId) {
      const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { id: dto.orderId, tenantId: user.tenantId }, select: { orderNumber: true } });
      if (!o) throw new NotFoundException('Order nahi mila');
      orderNumber = o.orderNumber;
    }
    const expense = await this.expenses.create(user, scope, {
      title: `Karigar ${payTag(c.employeeCode)}: ${c.name}${orderNumber ? ` — ${orderNumber}` : ''}`.slice(0, 120),
      description: dto.note?.trim().slice(0, 500) || undefined,
      amount,
      paymentMethod: toPaymentMethod(dto.paymentMethod),
      status: 'PAID',
      categoryId: await this.payCategory(user.tenantId),
    } as Parameters<ExpensesService['create']>[2]);
    return { id: expense.id, expenseNumber: expense.expenseNumber, amount: Number(expense.amount) };
  }

  private async payCategory(tenantId: string) {
    const made = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: PAY_CATEGORY.name } },
      update: {},
      create: { tenantId, ...PAY_CATEGORY },
      select: { id: true },
    });
    return made.id;
  }
}
