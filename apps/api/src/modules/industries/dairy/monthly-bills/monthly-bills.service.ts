import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MonthlyBillsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateBill(user: AuthenticatedUser, dto: { dairyCustomerId: string; month: number; year: number }) {
    const customer = await this.prisma.dairyCustomer.findFirst({ where: { id: dto.dairyCustomerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Check if bill exists
    const existing = await this.prisma.dairyMonthlyBill.findFirst({
      where: { dairyCustomerId: dto.dairyCustomerId, month: dto.month, year: dto.year },
    });
    if (existing) throw new BadRequestException(`Bill for ${dto.month}/${dto.year} already exists`);

    const startDate = new Date(dto.year, dto.month - 1, 1);
    const endDate = new Date(dto.year, dto.month, 0, 23, 59, 59, 999);

    // Aggregate deliveries
    const deliveries = await this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        dairyCustomerId: dto.dairyCustomerId,
        status: 'DELIVERED',
        deliveryDate: { gte: startDate, lte: endDate },
      },
    });

    const totalLiters = deliveries.reduce((s, d) => s + d.deliveredQty, 0);
    const totalAmount = deliveries.reduce((s, d) => s + d.totalAmount, 0);

    const count = await this.prisma.dairyMonthlyBill.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const billNumber = `BILL-${year}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.dairyMonthlyBill.create({
      data: {
        tenantId: user.tenantId,
        dairyCustomerId: dto.dairyCustomerId,
        billNumber,
        month: dto.month,
        year: dto.year,
        cycleStartDate: startDate,
        cycleEndDate: endDate,
        totalLiters,
        totalDeliveries: deliveries.length,
        totalAmount,
        remainingAmount: totalAmount,
        openingBalance: customer.currentBalance - totalAmount,
        closingBalance: customer.currentBalance,
        handledById: user.id,
      },
    });
  }

  async generateBulkBills(user: AuthenticatedUser, month: number, year: number) {
    const customers = await this.prisma.dairyCustomer.findMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE' },
    });

    const results = [];
    for (const c of customers) {
      try {
        const bill = await this.generateBill(user, { dairyCustomerId: c.id, month, year });
        results.push({ customerId: c.id, billNumber: bill.billNumber, status: 'success' });
      } catch (e: any) {
        results.push({ customerId: c.id, status: 'skipped', reason: e?.message });
      }
    }

    return { total: customers.length, generated: results.filter((r) => r.status === 'success').length, results };
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; month?: number; year?: number; isPaid?: boolean }) {
    return this.prisma.dairyMonthlyBill.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { dairyCustomerId: params.customerId }),
        ...(params.month !== undefined && { month: params.month }),
        ...(params.year !== undefined && { year: params.year }),
        ...(params.isPaid !== undefined && { isPaid: params.isPaid }),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.dairyMonthlyBill.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bill not found');
    const customer = await this.prisma.dairyCustomer.findUnique({ where: { id: b.dairyCustomerId } });
    const deliveries = await this.prisma.dairyDelivery.findMany({
      where: {
        dairyCustomerId: b.dairyCustomerId,
        status: 'DELIVERED',
        deliveryDate: { gte: b.cycleStartDate, lte: b.cycleEndDate },
      },
      orderBy: { deliveryDate: 'asc' },
    });
    return { ...b, customer, deliveries };
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: { amount: number; paymentMethod?: string; reference?: string }) {
    const b = await this.prisma.dairyMonthlyBill.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bill not found');
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    const newPaid = b.paidAmount + dto.amount;
    const newRemaining = Math.max(b.totalAmount - newPaid, 0);
    const isFullyPaid = newRemaining <= 0.01;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dairyMonthlyBill.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          isPaid: isFullyPaid,
          paidAt: isFullyPaid ? new Date() : null,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.reference,
        },
      });

      await tx.dairyCustomer.update({
        where: { id: b.dairyCustomerId },
        data: {
          currentBalance: { decrement: dto.amount },
          totalPayments: { increment: dto.amount },
          lastPaymentDate: new Date(),
        },
      });

      return updated;
    });
  }

  async markSent(user: AuthenticatedUser, id: string) {
    return this.prisma.dairyMonthlyBill.update({
      where: { id },
      data: { sentToCustomer: true, sentAt: new Date() },
    });
  }
}
