import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async addEntry(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.agriFarmerLedger.count({ where: { tenantId: user.tenantId } });
    const entryNumber = 'LDG-' + new Date().getFullYear() + '-' + String(count + 1).padStart(6, '0');

    // Calculate running balance
    const last = await this.prisma.agriFarmerLedger.findFirst({
      where: { tenantId: user.tenantId, farmerId: dto.farmerId },
      orderBy: { entryDate: 'desc' },
    });
    const lastBalance = last?.balance ?? 0;
    const debit = Number(dto.debit) || 0;
    const credit = Number(dto.credit) || 0;
    const newBalance = lastBalance + debit - credit;

    return this.prisma.agriFarmerLedger.create({
      data: {
        tenantId: user.tenantId,
        entryNumber,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        entryType: dto.entryType,
        description: dto.description,
        reference: dto.reference,
        debit,
        credit,
        balance: newBalance,
        farmerId: dto.farmerId,
        saleId: dto.saleId,
        paymentId: dto.paymentId,
        createdById: user.id,
      },
    });
  }

  async byFarmer(user: AuthenticatedUser, farmerId: string, params?: { from?: string; to?: string }) {
    return this.prisma.agriFarmerLedger.findMany({
      where: {
        tenantId: user.tenantId,
        farmerId,
        ...(params?.from || params?.to ? {
          entryDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { entryDate: 'desc' },
    });
  }

  async summary(user: AuthenticatedUser, farmerId: string) {
    const [totalDebit, totalCredit, lastEntry] = await Promise.all([
      this.prisma.agriFarmerLedger.aggregate({
        where: { tenantId: user.tenantId, farmerId },
        _sum: { debit: true },
      }),
      this.prisma.agriFarmerLedger.aggregate({
        where: { tenantId: user.tenantId, farmerId },
        _sum: { credit: true },
      }),
      this.prisma.agriFarmerLedger.findFirst({
        where: { tenantId: user.tenantId, farmerId },
        orderBy: { entryDate: 'desc' },
      }),
    ]);
    return {
      totalDebit: totalDebit._sum.debit ?? 0,
      totalCredit: totalCredit._sum.credit ?? 0,
      currentBalance: lastEntry?.balance ?? 0,
      lastEntryDate: lastEntry?.entryDate,
    };
  }
}
