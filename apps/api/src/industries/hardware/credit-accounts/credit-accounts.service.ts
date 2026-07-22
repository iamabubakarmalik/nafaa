import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { differenceInDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertCreditAccountDto } from './dto/upsert-credit-account.dto';

@Injectable()
export class CreditAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertCreditAccountDto) {
    if (dto.customerId) {
      const existing = await this.prisma.hardwareCreditAccount.findFirst({
        where: { tenantId: user.tenantId, customerId: dto.customerId },
      });
      if (existing) throw new BadRequestException('Customer already has a credit account');
    }

    const count = await this.prisma.hardwareCreditAccount.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const accountNumber = `KHT-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.hardwareCreditAccount.create({
      data: {
        tenantId: user.tenantId,
        accountNumber,
        ...dto,
        openedByStaffId: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; search?: string; hasBalance?: boolean; overdue?: boolean }) {
    return this.prisma.hardwareCreditAccount.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.hasBalance && { currentBalance: { gt: 0 } }),
        ...(params.overdue && { ageOver90Days: { gt: 0 } }),
        ...(params.search && {
          OR: [
            { accountNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { businessName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { customerCnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ currentBalance: 'desc' }, { customerName: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');

    const recentTransactions = await this.prisma.hardwareCreditTransaction.findMany({
      where: { accountId: id },
      orderBy: { transactionDate: 'desc' },
      take: 50,
    });

    return { ...a, recentTransactions };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCreditAccountDto) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.hardwareCreditAccount.update({ where: { id }, data: dto });
  }

  async suspend(user: AuthenticatedUser, id: string, reason?: string) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.hardwareCreditAccount.update({
      where: { id },
      data: { status: 'SUSPENDED', notes: ((a.notes || '') + '\nSuspended: ' + (reason || 'No reason')).trim() },
    });
  }

  async reactivate(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.hardwareCreditAccount.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async close(user: AuthenticatedUser, id: string, reason?: string) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    if (a.currentBalance > 0.01) throw new BadRequestException('Cannot close account with outstanding balance');
    return this.prisma.hardwareCreditAccount.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date(), notes: ((a.notes || '') + '\nClosed: ' + (reason || '')).trim() },
    });
  }

  async recalculateAging(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');

    const transactions = await this.prisma.hardwareCreditTransaction.findMany({
      where: { accountId: id, transactionType: 'SALE' },
      orderBy: { transactionDate: 'asc' },
    });

    const now = new Date();
    let age0To30 = 0, age31To60 = 0, age61To90 = 0, ageOver90 = 0;

    // Simple aging: unpaid sales bucketed by age
    let remaining = a.currentBalance;
    for (const tx of transactions.reverse()) {
      if (remaining <= 0) break;
      const age = differenceInDays(now, new Date(tx.transactionDate));
      const amount = Math.min(tx.amount, remaining);
      if (age <= 30) age0To30 += amount;
      else if (age <= 60) age31To60 += amount;
      else if (age <= 90) age61To90 += amount;
      else ageOver90 += amount;
      remaining -= amount;
    }

    return this.prisma.hardwareCreditAccount.update({
      where: { id },
      data: {
        age0To30Days: age0To30,
        age31To60Days: age31To60,
        age61To90Days: age61To90,
        ageOver90Days: ageOver90,
      },
    });
  }

  async agingReport(user: AuthenticatedUser) {
    const accounts = await this.prisma.hardwareCreditAccount.findMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', currentBalance: { gt: 0 } },
    });

    const totals = accounts.reduce(
      (acc, a) => ({
        totalOutstanding: acc.totalOutstanding + a.currentBalance,
        age0To30: acc.age0To30 + a.age0To30Days,
        age31To60: acc.age31To60 + a.age31To60Days,
        age61To90: acc.age61To90 + a.age61To90Days,
        ageOver90: acc.ageOver90 + a.ageOver90Days,
      }),
      { totalOutstanding: 0, age0To30: 0, age31To60: 0, age61To90: 0, ageOver90: 0 },
    );

    const worst = accounts
      .filter((a) => a.ageOver90Days > 0)
      .sort((a, b) => b.ageOver90Days - a.ageOver90Days)
      .slice(0, 20);

    return { ...totals, accountsCount: accounts.length, worstOffenders: worst };
  }
}
