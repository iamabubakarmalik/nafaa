import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MetalStockService {
  constructor(private readonly prisma: PrismaService) {}

  async addEntry(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.jewelryMetalStock.count({ where: { tenantId: user.tenantId } });
    const entryNumber = 'MS-' + new Date().getFullYear() + '-' + String(count + 1).padStart(6, '0');

    // Get last balance for this metal+purity
    const last = await this.prisma.jewelryMetalStock.findFirst({
      where: {
        tenantId: user.tenantId,
        metalType: dto.metalType,
        purity: dto.purity,
      },
      orderBy: { entryDate: 'desc' },
    });
    const lastBalance = last?.balanceGrams ?? 0;
    const grams = Number(dto.grams) || 0;
    const isCredit = ['PURCHASE', 'RECEIVE', 'RETURN', 'EXCHANGE_IN', 'OPENING'].includes(dto.entryType);
    const newBalance = isCredit ? lastBalance + grams : lastBalance - grams;

    return this.prisma.jewelryMetalStock.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        entryNumber,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        grams,
        balanceGrams: newBalance,
        ratePerGram: dto.ratePerGram ? Number(dto.ratePerGram) : null,
        totalValue: dto.ratePerGram ? Number(dto.ratePerGram) * grams : null,
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { metalType?: string; purity?: string; entryType?: string; from?: string; to?: string; limit?: number }) {
    return this.prisma.jewelryMetalStock.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.metalType && { metalType: params.metalType as any }),
        ...(params.purity && { purity: params.purity as any }),
        ...(params.entryType && { entryType: params.entryType }),
        ...(params.from || params.to ? {
          entryDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { entryDate: 'desc' },
      take: params.limit ?? 200,
    });
  }

  async currentBalance(user: AuthenticatedUser) {
    const metalTypes: any[] = ['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'ROSE_GOLD', 'WHITE_GOLD'];
    const purities: any[] = ['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'KARAT_14', 'SILVER_999', 'SILVER_925'];

    const balances: any[] = [];
    for (const mt of metalTypes) {
      for (const p of purities) {
        const last = await this.prisma.jewelryMetalStock.findFirst({
          where: { tenantId: user.tenantId, metalType: mt, purity: p },
          orderBy: { entryDate: 'desc' },
        });
        if (last && last.balanceGrams > 0) {
          balances.push({
            metalType: mt,
            purity: p,
            balanceGrams: last.balanceGrams,
            lastEntryDate: last.entryDate,
          });
        }
      }
    }
    return balances;
  }

  async summary(user: AuthenticatedUser, from?: string, to?: string) {
    const where: any = { tenantId: user.tenantId };
    if (from || to) {
      where.entryDate = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }
    return this.prisma.jewelryMetalStock.groupBy({
      by: ['metalType', 'purity', 'entryType'],
      where,
      _sum: { grams: true, totalValue: true },
      _count: { _all: true },
    });
  }
}
