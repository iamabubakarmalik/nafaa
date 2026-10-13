import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { differenceInDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertCreditAccountDto } from './dto/upsert-credit-account.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import { loadKhata, withKhata } from '../common/customer-khata';

@Injectable()
export class CreditAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Accounts with live khata figures for the ones linked to a customer. */
  private async live<T extends { customerId: string | null; currentBalance: number; creditLimit: number; status: string }>(tenantId: string, accounts: T[]) {
    const khata = await loadKhata(this.prisma, tenantId, accounts.map((a) => a.customerId).filter((id): id is string => !!id));
    return accounts.map((a) => withKhata(a, khata));
  }

  /**
   * The form sends "" when no customer is picked. `customerId` is unique across
   * all shops, so a stored "" blocked every later unlinked account (500).
   */
  private async cleanLinks(user: AuthenticatedUser, dto: UpsertCreditAccountDto, accountId?: string) {
    const customerId = dto.customerId?.trim() || null;
    if (customerId) {
      const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!customer) throw new NotFoundException('Customer nahi mila');
      const existing = await this.prisma.hardwareCreditAccount.findFirst({
        where: { customerId, ...(accountId && { id: { not: accountId } }) },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Is customer ka credit account pehle se bana hua hai');
    }
    return { ...dto, customerId, shopId: dto.shopId?.trim() || null };
  }

  async create(user: AuthenticatedUser, input: UpsertCreditAccountDto) {
    const dto = await this.cleanLinks(user, input);

    const prefix = `KHT-${new Date().getFullYear()}-`;
    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.hardwareCreditAccount.findMany({
        where: { tenantId: user.tenantId, accountNumber: { startsWith: prefix } },
        select: { accountNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((a) => a.accountNumber),
      create: (accountNumber) => this.prisma.hardwareCreditAccount.create({
        data: {
          tenantId: user.tenantId,
          accountNumber,
          ...dto,
          openedByStaffId: user.id,
        },
      }),
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; search?: string; hasBalance?: boolean; overdue?: boolean }) {
    const rows = await this.prisma.hardwareCreditAccount.findMany({
      where: {
        tenantId: user.tenantId,
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
      take: 500,
    });
    // Balance, aging and status come from the khata, so filter and sort after the overlay.
    return (await this.live(user.tenantId, rows))
      .filter((a) => !params.status || a.status === params.status)
      .filter((a) => !params.hasBalance || a.currentBalance > 0)
      .filter((a) => !params.overdue || a.ageOver90Days > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance || a.customerName.localeCompare(b.customerName))
      .slice(0, 200);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');

    const recentTransactions = await this.prisma.hardwareCreditTransaction.findMany({
      where: { accountId: id },
      orderBy: { transactionDate: 'desc' },
      take: 50,
    });

    const [live] = await this.live(user.tenantId, [a]);
    return { ...live, recentTransactions };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCreditAccountDto) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.hardwareCreditAccount.update({ where: { id }, data: await this.cleanLinks(user, dto, id) });
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
    const found = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!found) throw new NotFoundException('Account not found');
    const [a] = await this.live(user.tenantId, [found]);
    if (a.currentBalance > 0.01) throw new BadRequestException('Udhaar baqi hai — pehle receiving karein, phir khata band karein');
    return this.prisma.hardwareCreditAccount.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date(), notes: ((a.notes || '') + '\nClosed: ' + (reason || '')).trim() },
    });
  }

  async recalculateAging(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.hardwareCreditAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    // Linked accounts are aged live from the khata on every read.
    if (a.customerId) return (await this.live(user.tenantId, [a]))[0];

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
    const rows = await this.prisma.hardwareCreditAccount.findMany({
      where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'OVERDUE'] } },
    });
    const accounts = (await this.live(user.tenantId, rows)).filter((a) => a.currentBalance > 0);

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
