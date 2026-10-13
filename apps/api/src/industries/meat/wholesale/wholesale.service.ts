import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { cleanInput, parseDay } from '../meat-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Fields the account form may set. The customer link, number and running
 * totals are owned by the server (a body could otherwise move an account
 * to another shop's customer).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
function accountFields(dto: any) {
  const { customerId: _c, accountNumber: _n, currentBalance: _b, totalOutstanding: _o, totalPurchases: _p, totalOrders: _t, ...rest } = cleanInput(dto);
  return rest;
}

@Injectable()
export class WholesaleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.meatWholesaleAccount.findUnique({ where: { customerId: dto.customerId } });
    if (existing) throw new BadRequestException('Wholesale account already exists for this customer');

    const count = await this.prisma.meatWholesaleAccount.count({ where: { tenantId: user.tenantId } });
    const accountNumber = 'WS-' + String(count + 1).padStart(5, '0');

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.meatWholesaleAccount.create({
        data: {
          ...accountFields(dto),
          customerId: customer.id,
          tenantId: user.tenantId,
          accountNumber,
          contractStart: dto.contractStart ? new Date(dto.contractStart) : null,
          contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : null,
        },
      });
      await this.syncCreditLimit(tx, customer.id, dto.creditLimit);
      return account;
    });
  }

  /** The counter checks udhaar against the customer's limit, so keep it the same as the account's. */
  private async syncCreditLimit(tx: any, customerId: string, creditLimit: unknown) {
    if (creditLimit === undefined || creditLimit === null || creditLimit === '') return;
    const limit = Number(creditLimit);
    if (!Number.isFinite(limit) || limit < 0) return;
    await tx.customer.update({ where: { id: customerId }, data: { creditLimit: limit } });
  }

  /**
   * Udhaar and purchases live on the customer's khata, where every counter
   * bill lands. The copies on the account were never updated, so the
   * Wholesale page showed 0 outstanding for buyers who did owe.
   */
  private async withKhata<T extends { customerId: string; currentBalance: number; totalOutstanding: number; totalPurchases: number; totalOrders: number }>(
    tenantId: string,
    rows: T[],
  ): Promise<T[]> {
    if (!rows.length) return rows;
    const ids = rows.map((r) => r.customerId);
    const [customers, bills] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, balance: true, totalSpent: true } }),
      this.prisma.sale.groupBy({ by: ['customerId'], where: { tenantId, customerId: { in: ids }, status: { not: 'VOIDED' } }, _count: { _all: true } }),
    ]);
    const byId = new Map(customers.map((c) => [c.id, c]));
    const count = new Map(bills.map((b) => [b.customerId as string, b._count._all]));
    return rows.map((r) => {
      const c = byId.get(r.customerId);
      if (!c) return r;
      const owed = Math.max(c.balance, 0);
      return { ...r, currentBalance: owed, totalOutstanding: owed, totalPurchases: c.totalSpent, totalOrders: count.get(r.customerId) ?? 0 };
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; search?: string }) {
    const rows = await this.prisma.meatWholesaleAccount.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { accountNumber: { contains: params.search, mode: 'insensitive' } },
            { businessName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return this.withKhata(user.tenantId, rows);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return (await this.withKhata(user.tenantId, [a]))[0];
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { customerId, tenantId: user.tenantId } });
    return a ? (await this.withKhata(user.tenantId, [a]))[0] : null;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.meatWholesaleAccount.update({
        where: { id },
        data: {
          ...accountFields(dto),
          contractStart: dto.contractStart ? new Date(dto.contractStart) : undefined,
          contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : undefined,
        },
      });
      await this.syncCreditLimit(tx, a.customerId, dto.creditLimit);
      return updated;
    });
  }

  async recordPurchase(user: AuthenticatedUser, id: string, amount: number) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.meatWholesaleAccount.update({
      where: { id },
      data: {
        totalPurchases: a.totalPurchases + amount,
        totalOrders: a.totalOrders + 1,
        currentBalance: a.currentBalance + amount,
        totalOutstanding: a.totalOutstanding + amount,
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account not found');
    return this.prisma.meatWholesaleAccount.update({
      where: { id },
      data: {
        currentBalance: Math.max(a.currentBalance - amount, 0),
        totalOutstanding: Math.max(a.totalOutstanding - amount, 0),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.meatWholesaleAccount.update({ where: { id }, data: { isActive: false } });
  }
}
