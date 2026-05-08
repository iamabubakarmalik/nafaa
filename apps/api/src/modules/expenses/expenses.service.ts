import { Injectable, NotFoundException } from '@nestjs/common';
import { startOfDay, startOfMonth } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateExpenseDto) {
    if (dto.categoryId) {
      const cat = await this.prisma.expenseCategory.findFirst({
        where: { id: dto.categoryId, tenantId: user.tenantId },
      });
      if (!cat) throw new NotFoundException('Expense category not found');
    }

    const expenseNumber = `EXP-${Date.now().toString().slice(-8)}`;

    return this.prisma.expense.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.id,
        categoryId: dto.categoryId,
        expenseNumber,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        status: 'PAID',
      },
      include: { category: true },
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.expense.findMany({
      where: { tenantId: user.tenantId },
      include: { category: true },
      orderBy: { expenseDate: 'desc' },
      take: 100,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!expense) throw new NotFoundException('Expense not found');

    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted successfully' };
  }

  async summary(user: AuthenticatedUser) {
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [todayAgg, monthAgg, totalAgg, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'PAID',
          expenseDate: { gte: todayStart },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId: user.tenantId,
          status: 'PAID',
          expenseDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { tenantId: user.tenantId, status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { tenantId: user.tenantId, status: 'PAID' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      todayExpenses: todayAgg._sum.amount ?? 0,
      todayCount: todayAgg._count._all ?? 0,
      monthExpenses: monthAgg._sum.amount ?? 0,
      totalExpenses: totalAgg._sum.amount ?? 0,
      byCategory,
    };
  }
}
