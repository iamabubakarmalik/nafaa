import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { drawerCash, monthRange } from '../dairy-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class MonthlyBillsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateBill(user: AuthenticatedUser, dto: { dairyCustomerId: string; month: number; year: number }) {
    const customer = await this.prisma.dairyCustomer.findFirst({ where: { id: dto.dairyCustomerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const month = Number(dto.month);
    const year = Number(dto.year);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
      throw new BadRequestException('Mahina aur saal sahi chunein');
    }

    // Check if bill exists
    const existing = await this.prisma.dairyMonthlyBill.findFirst({
      where: { tenantId: user.tenantId, dairyCustomerId: dto.dairyCustomerId, month, year },
    });
    if (existing) throw new BadRequestException(`Bill for ${month}/${year} already exists`);

    // Month edges on shop time, not server (UTC) time.
    const { start: startDate, end: endDate } = monthRange(year, month);

    // Aggregate deliveries
    const deliveries = await this.prisma.dairyDelivery.findMany({
      where: {
        tenantId: user.tenantId,
        dairyCustomerId: dto.dairyCustomerId,
        status: 'DELIVERED',
        deliveryDate: { gte: startDate, lte: endDate },
      },
    });

    // An empty bill only clutters the list and the customer's WhatsApp.
    if (deliveries.length === 0) throw new BadRequestException(`${month}/${year} me is customer ki koi delivery nahi`);

    const totalLiters = deliveries.reduce((s, d) => s + d.deliveredQty, 0);
    const totalAmount = deliveries.reduce((s, d) => s + d.totalAmount, 0);

    /* Balance at the end of this month: today's balance minus anything
       delivered after the month closed. */
    const later = await this.prisma.dairyDelivery.aggregate({
      where: { tenantId: user.tenantId, dairyCustomerId: dto.dairyCustomerId, status: 'DELIVERED', deliveryDate: { gt: endDate } },
      _sum: { totalAmount: true },
    });
    const closingBalance = customer.currentBalance - (later._sum.totalAmount ?? 0);

    /* Money already paid (an advance, or khata payments made before this
       bill existed) settles the bill up front. What is still owed on older
       open bills is kept for them, so the same rupee is not counted twice. */
    const olderOpen = await this.prisma.dairyMonthlyBill.aggregate({
      where: { tenantId: user.tenantId, dairyCustomerId: dto.dairyCustomerId, isPaid: false },
      _sum: { remainingAmount: true },
    });
    const owedForThis = Math.max(closingBalance - (olderOpen._sum.remainingAmount ?? 0), 0);
    const remainingAmount = Math.round(Math.min(totalAmount, owedForThis) * 100) / 100;
    const settledUpFront = Math.round((totalAmount - remainingAmount) * 100) / 100;

    const count = await this.prisma.dairyMonthlyBill.count({ where: { tenantId: user.tenantId } });
    const billNumber = `BILL-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.dairyMonthlyBill.create({
      data: {
        tenantId: user.tenantId,
        dairyCustomerId: dto.dairyCustomerId,
        billNumber,
        month,
        year,
        cycleStartDate: startDate,
        cycleEndDate: endDate,
        totalLiters,
        totalDeliveries: deliveries.length,
        totalAmount,
        paidAmount: settledUpFront,
        remainingAmount,
        isPaid: remainingAmount <= 0.01 && totalAmount > 0,
        ...(remainingAmount <= 0.01 && totalAmount > 0 && { paidAt: new Date() }),
        openingBalance: closingBalance - totalAmount,
        closingBalance,
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
        tenantId: user.tenantId,
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
    const amount = Number(dto?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount must be positive');
    if (amount > b.remainingAmount + 0.01) {
      throw new BadRequestException(`Is bill par sirf Rs ${Math.round(b.remainingAmount)} baqi hain — zyada raqam customer ke khate me "payment" se lein`);
    }
    dto = { ...dto, amount };

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

      await drawerCash(tx, user, {
        direction: 'IN', amount: dto.amount, method: dto.paymentMethod,
        reason: `Doodh bill wasooli: ${b.billNumber}`, reference: dto.reference || b.billNumber,
      });

      return updated;
    });
  }

  async markSent(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.dairyMonthlyBill.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!b) throw new NotFoundException('Bill not found');
    return this.prisma.dairyMonthlyBill.update({
      where: { id },
      data: { sentToCustomer: true, sentAt: new Date() },
    });
  }
}
