import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { startOfDay } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CashTransactionDto } from './dto/cash-transaction.dto';

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(user: AuthenticatedUser) {
    const open = await this.prisma.cashRegister.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'OPEN',
      },
      include: {
        openedBy: { select: { id: true, fullName: true } },
        shop: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    return open;
  }

  async open(user: AuthenticatedUser, dto: OpenRegisterDto) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN' },
    });
    if (existing) {
      throw new BadRequestException('Pehle se ek register open hai. Pehle close karein.');
    }

    const registerNumber = `CR-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.create({
        data: {
          tenantId: user.tenantId,
          shopId: dto.shopId,
          openedById: user.id,
          registerNumber,
          openingBalance: dto.openingBalance,
          expectedBalance: dto.openingBalance,
          notes: dto.notes,
          status: 'OPEN',
        },
      });

      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: 'OPENING',
          amount: dto.openingBalance,
          reason: 'Register opened',
          note: dto.notes,
        },
      });

      return register;
    });
  }

  async addTransaction(user: AuthenticatedUser, dto: CashTransactionDto) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN' },
    });
    if (!register) throw new BadRequestException('Koi register open nahi hai');

    return this.prisma.$transaction(async (tx) => {
      const change = dto.type === 'CASH_IN' ? dto.amount : -dto.amount;
      const newExpected = register.expectedBalance + change;

      await tx.cashRegister.update({
        where: { id: register.id },
        data: {
          expectedBalance: newExpected,
          totalCashIn: { increment: dto.type === 'CASH_IN' ? dto.amount : 0 },
          totalCashOut: { increment: dto.type === 'CASH_OUT' ? dto.amount : 0 },
        },
      });

      const txn = await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: dto.type,
          amount: dto.amount,
          reason: dto.reason,
          note: dto.note,
        },
      });

      return txn;
    });
  }

  async close(user: AuthenticatedUser, dto: CloseRegisterDto) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN' },
    });
    if (!register) throw new BadRequestException('Koi register open nahi hai');

    // Calculate sales during this register session (cash sales only)
    const cashSales = await this.prisma.sale.aggregate({
      where: {
        tenantId: user.tenantId,
        status: 'COMPLETED',
        paymentMethod: 'CASH',
        soldAt: { gte: register.openedAt },
      },
      _sum: { paidAmount: true },
    });

    const totalCashSales = cashSales._sum.paidAmount ?? 0;

    // Calculate cash expenses during this session
    const cashExpenses = await this.prisma.expense.aggregate({
      where: {
        tenantId: user.tenantId,
        paymentMethod: 'CASH',
        status: 'PAID',
        expenseDate: { gte: register.openedAt },
      },
      _sum: { amount: true },
    });

    const totalCashExpenses = cashExpenses._sum.amount ?? 0;

    const expectedFinal =
      register.openingBalance +
      totalCashSales +
      register.totalCashIn -
      register.totalCashOut -
      totalCashExpenses;

    const difference = dto.closingBalance - expectedFinal;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cashRegister.update({
        where: { id: register.id },
        data: {
          status: 'CLOSED',
          closedById: user.id,
          closingBalance: dto.closingBalance,
          expectedBalance: expectedFinal,
          difference,
          totalSales: totalCashSales,
          totalExpenses: totalCashExpenses,
          closedAt: new Date(),
          notes: dto.notes ?? register.notes,
        },
      });

      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId,
          cashRegisterId: register.id,
          createdById: user.id,
          type: 'CLOSING',
          amount: dto.closingBalance,
          reason: 'Register closed',
          note: `Difference: ${difference}`,
        },
      });

      return updated;
    });
  }

  async history(user: AuthenticatedUser) {
    return this.prisma.cashRegister.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { openedAt: 'desc' },
      take: 30,
      include: {
        openedBy: { select: { id: true, fullName: true } },
        closedBy: { select: { id: true, fullName: true } },
        shop: true,
      },
    });
  }
}
