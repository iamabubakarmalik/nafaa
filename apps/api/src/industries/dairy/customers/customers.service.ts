import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { dayEnd, dayStart, drawerCash } from '../dairy-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PauseDeliveryDto, UpsertCustomerDto } from './dto/upsert-customer.dto';

@Injectable()
export class DairyCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** A route or core customer from another shop must never be linked. */
  private async checkLinks(tenantId: string, dto: UpsertCustomerDto) {
    if (dto.routeId) {
      const r = await this.prisma.dairyRoute.findFirst({ where: { id: dto.routeId, tenantId }, select: { id: true } });
      if (!r) throw new BadRequestException('Route nahi mila');
    }
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId }, select: { id: true } });
      if (!c) throw new BadRequestException('Customer nahi mila');
    }
  }

  async create(user: AuthenticatedUser, dto: UpsertCustomerDto) {
    await this.checkLinks(user.tenantId, dto);
    const count = await this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const customerNumber = `DC-${year}-${String(count + 1).padStart(4, '0')}`;

    // Advance paid at sign-up is money held for the customer: it starts the khata in credit.
    const advance = Math.max(Number(dto.advancePayment) || 0, 0);
    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dairyCustomer.create({
        data: {
          tenantId: user.tenantId, customerNumber, ...dto,
          ...(advance > 0 && { currentBalance: -advance, totalPayments: advance, lastPaymentDate: new Date() }),
        },
      });
      if (advance > 0) {
        await drawerCash(tx, user, {
          direction: 'IN', amount: advance, reason: `Doodh advance: ${created.name} (${customerNumber})`, reference: customerNumber,
        });
      }
      return created;
    });

    if (dto.routeId) {
      await this.recalculateRouteStats(dto.routeId);
    }

    return customer;
  }

  async list(user: AuthenticatedUser, params: { routeId?: string; status?: string; search?: string; area?: string }) {
    return this.prisma.dairyCustomer.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.routeId && { routeId: params.routeId }),
        ...(params.status && { status: params.status as any }),
        ...(params.area && { area: { contains: params.area, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { customerNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { address: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { route: true },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.dairyCustomer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { route: true },
    });
    if (!c) throw new NotFoundException('Customer not found');

    const recentDeliveries = await this.prisma.dairyDelivery.findMany({
      where: { tenantId: user.tenantId, dairyCustomerId: id },
      orderBy: { deliveryDate: 'desc' },
      take: 30,
    });

    const bills = await this.prisma.dairyMonthlyBill.findMany({
      where: { tenantId: user.tenantId, dairyCustomerId: id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    });

    return { ...c, recentDeliveries, bills };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCustomerDto) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');
    await this.checkLinks(user.tenantId, dto);
    const oldRouteId = c.routeId;
    const updated = await this.prisma.dairyCustomer.update({ where: { id }, data: dto });
    // Recalculate old + new route
    if (oldRouteId) await this.recalculateRouteStats(oldRouteId);
    if (dto.routeId && dto.routeId !== oldRouteId) await this.recalculateRouteStats(dto.routeId);
    return updated;
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: { amount: number; paymentMethod?: string; reference?: string; notes?: string }) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');
    const amount = Number(dto?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dairyCustomer.update({
        where: { id },
        data: {
          currentBalance: { decrement: amount },
          totalPayments: { increment: amount },
          lastPaymentDate: new Date(),
        },
      });
      await drawerCash(tx, user, {
        direction: 'IN', amount, method: dto.paymentMethod,
        reason: `Doodh khata wasooli: ${c.name} (${c.customerNumber})`, reference: dto.reference || c.customerNumber,
      });

      /* Clear the oldest open monthly bills with this money, so the bills
         page does not keep chasing a customer who has already paid. */
      const open = await tx.dairyMonthlyBill.findMany({
        where: { tenantId: user.tenantId, dairyCustomerId: id, isPaid: false, remainingAmount: { gt: 0 } },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      });
      let left = amount;
      for (const bill of open) {
        if (left <= 0.009) break;
        const applied = Math.min(left, bill.remainingAmount);
        const remaining = Math.max(bill.remainingAmount - applied, 0);
        const paid = remaining <= 0.01;
        await tx.dairyMonthlyBill.update({
          where: { id: bill.id },
          data: {
            paidAmount: bill.paidAmount + applied,
            remainingAmount: paid ? 0 : remaining,
            isPaid: paid,
            paidAt: paid ? new Date() : null,
            ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
          },
        });
        left -= applied;
      }
      return updated;
    });
  }

  async pauseDelivery(user: AuthenticatedUser, id: string, dto: PauseDeliveryDto) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');

    return this.prisma.dairyCustomer.update({
      where: { id },
      data: {
        pausedFrom: dayStart(dto.pausedFrom),
        pausedTo: dayEnd(dto.pausedTo),
        status: 'SUSPENDED',
        notes: ((c.notes || '') + '\nPaused: ' + (dto.reason || '')).trim(),
      },
    });
  }

  async resumeDelivery(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');
    return this.prisma.dairyCustomer.update({
      where: { id },
      data: { status: 'ACTIVE', pausedFrom: null, pausedTo: null },
    });
  }

  async close(user: AuthenticatedUser, id: string, reason?: string) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');
    if (c.currentBalance > 0.01) throw new BadRequestException('Cannot close with outstanding balance');
    return this.prisma.dairyCustomer.update({
      where: { id },
      data: { status: 'CLOSED', notes: ((c.notes || '') + '\nClosed: ' + (reason || '')).trim() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.close(user, id);
  }

  private async recalculateRouteStats(routeId: string) {
    const customers = await this.prisma.dairyCustomer.findMany({
      where: { routeId, status: 'ACTIVE' },
    });
    const totalCustomers = customers.length;
    const totalDailyLiters = customers.reduce((s, c) => s + c.morningQuantity + c.eveningQuantity, 0);
    await this.prisma.dairyRoute.update({
      where: { id: routeId },
      data: { totalCustomers, totalDailyLiters },
    });
  }

  async withOutstandingBalance(user: AuthenticatedUser) {
    return this.prisma.dairyCustomer.findMany({
      where: { tenantId: user.tenantId, currentBalance: { gt: 0 }, status: 'ACTIVE' },
      include: { route: true },
      orderBy: { currentBalance: 'desc' },
      take: 100,
    });
  }

  async summary(user: AuthenticatedUser) {
    const [total, active, suspended, outstandingAgg] = await Promise.all([
      this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId } }),
      this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId, status: 'SUSPENDED' } }),
      this.prisma.dairyCustomer.aggregate({
        where: { tenantId: user.tenantId, currentBalance: { gt: 0 } },
        _sum: { currentBalance: true },
        _count: { _all: true },
      }),
    ]);

    return {
      totalCustomers: total,
      activeCustomers: active,
      suspendedCustomers: suspended,
      outstandingAmount: outstandingAgg._sum.currentBalance ?? 0,
      customersWithBalance: outstandingAgg._count._all,
    };
  }
}
