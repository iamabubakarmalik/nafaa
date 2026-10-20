/**
 * Farmer ledger, read from the customer khata. The separate agri ledger
 * table was never written by bills or khata payments, so it could not
 * agree with Khata or the reports; entries are now written only by bills
 * and khata payments, and this service shows them in the old shape.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { dayRange } from '../agri-common';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  addEntry() {
    throw new BadRequestException('Khata me entry POS bill ya customer khate ki payment se hoti hai');
  }

  private async customerOf(user: AuthenticatedUser, farmerId: string) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id: farmerId, tenantId: user.tenantId }, select: { customerId: true } });
    if (!f) throw new NotFoundException('Farmer nahi mila');
    return f.customerId;
  }

  async byFarmer(user: AuthenticatedUser, farmerId: string, params?: { from?: string; to?: string }) {
    const customerId = await this.customerOf(user, farmerId);
    if (!customerId) return [];
    const range = dayRange(params?.from, params?.to);
    const rows = await this.prisma.customerLedger.findMany({
      where: { tenantId: user.tenantId, customerId, ...(range && { createdAt: range }) },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map((r) => ({
      id: r.id,
      entryNumber: r.reference ?? r.id.slice(0, 8),
      entryDate: r.createdAt,
      entryType: r.type,
      description: r.note ?? r.type,
      reference: r.reference,
      debit: r.amount > 0 ? r.amount : 0,
      credit: r.amount < 0 ? -r.amount : 0,
      balance: r.balanceAfter,
      farmerId,
      createdAt: r.createdAt,
    }));
  }

  async summary(user: AuthenticatedUser, farmerId: string) {
    const customerId = await this.customerOf(user, farmerId);
    if (!customerId) return { totalDebit: 0, totalCredit: 0, currentBalance: 0, lastEntryDate: null };
    const where = { tenantId: user.tenantId, customerId };
    const [debit, credit, customer, last] = await Promise.all([
      this.prisma.customerLedger.aggregate({ where: { ...where, amount: { gt: 0 } }, _sum: { amount: true } }),
      this.prisma.customerLedger.aggregate({ where: { ...where, amount: { lt: 0 } }, _sum: { amount: true } }),
      this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { balance: true } }),
      this.prisma.customerLedger.findFirst({ where, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);
    return {
      totalDebit: debit._sum.amount ?? 0,
      totalCredit: -(credit._sum.amount ?? 0),
      currentBalance: customer?.balance ?? 0,
      lastEntryDate: last?.createdAt ?? null,
    };
  }
}
