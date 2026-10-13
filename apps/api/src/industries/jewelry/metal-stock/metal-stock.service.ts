import { BadRequestException, Injectable } from '@nestjs/common';
import { METAL_IN_TYPES, postMetalEntry } from '../common/metal-ledger';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class MetalStockService {
  constructor(private readonly prisma: PrismaService) {}

  async addEntry(user: AuthenticatedUser, dto: any) {
    if (!dto?.metalType || !dto?.purity || !dto?.entryType) throw new BadRequestException('Metal, purity aur entry type zaroori hain');
    const grams = Number(dto.grams) || 0;
    if (grams <= 0) throw new BadRequestException('Grams zero se zyada hon');
    return postMetalEntry(this.prisma, user.tenantId, user.id, {
      entryType: dto.entryType,
      metalType: dto.metalType,
      purity: dto.purity,
      grams,
      entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
      ratePerGram: dto.ratePerGram ? Number(dto.ratePerGram) : null,
      source: dto.source || null,
      reference: dto.reference || null,
      karigarId: dto.karigarId || null,
      notes: dto.notes || null,
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

  /** Balance per metal and purity, summed over every entry. */
  async currentBalance(user: AuthenticatedUser) {
    const rows = await this.prisma.jewelryMetalStock.groupBy({
      by: ['metalType', 'purity', 'entryType'],
      where: { tenantId: user.tenantId },
      _sum: { grams: true },
      _max: { entryDate: true },
    });
    const map = new Map<string, { metalType: string; purity: string; balanceGrams: number; lastEntryDate: Date | null }>();
    for (const r of rows) {
      const key = `${r.metalType}_${r.purity}`;
      const cur = map.get(key) ?? { metalType: r.metalType, purity: r.purity, balanceGrams: 0, lastEntryDate: null };
      cur.balanceGrams += (METAL_IN_TYPES.includes(r.entryType) ? 1 : -1) * (r._sum.grams ?? 0);
      const last = r._max.entryDate;
      if (last && (!cur.lastEntryDate || last > cur.lastEntryDate)) cur.lastEntryDate = last;
      map.set(key, cur);
    }
    return [...map.values()]
      .map((b) => ({ ...b, balanceGrams: Math.round(b.balanceGrams * 1000) / 1000 }))
      .filter((b) => Math.abs(b.balanceGrams) > 0.0005);
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
