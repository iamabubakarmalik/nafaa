import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PauseDeliveryDto, UpsertCustomerDto } from './dto/upsert-customer.dto';

@Injectable()
export class DairyCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertCustomerDto) {
    const count = await this.prisma.dairyCustomer.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const customerNumber = `DC-${year}-${String(count + 1).padStart(4, '0')}`;

    const customer = await this.prisma.dairyCustomer.create({
      data: { tenantId: user.tenantId, customerNumber, ...dto },
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
      where: { dairyCustomerId: id },
      orderBy: { deliveryDate: 'desc' },
      take: 30,
    });

    const bills = await this.prisma.dairyMonthlyBill.findMany({
      where: { dairyCustomerId: id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    });

    return { ...c, recentDeliveries, bills };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCustomerDto) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');
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
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.dairyCustomer.update({
      where: { id },
      data: {
        currentBalance: { decrement: dto.amount },
        totalPayments: { increment: dto.amount },
        lastPaymentDate: new Date(),
      },
    });
  }

  async pauseDelivery(user: AuthenticatedUser, id: string, dto: PauseDeliveryDto) {
    const c = await this.prisma.dairyCustomer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Customer not found');

    return this.prisma.dairyCustomer.update({
      where: { id },
      data: {
        pausedFrom: new Date(dto.pausedFrom),
        pausedTo: new Date(dto.pausedTo),
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
