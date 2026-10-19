/**
 * Raw metal by karat: purchases, opening stock and corrections entered by
 * hand; karigar issue/receive and old gold come from their own screens.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { JewelryMetalType, JewelryPurity, Prisma } from '@prisma/client';
import { METAL_IN_TYPES, metalBalance, postMetalEntry } from '../common/metal-ledger';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/** Entry types a person may add by hand. */
const MANUAL = ['PURCHASE', 'OPENING', 'ADJUSTMENT', 'SALE'];

@Injectable()
export class MetalStockService {
  constructor(private readonly prisma: PrismaService) {}

  async addEntry(user: AuthenticatedUser, dto: any) {
    if (!MANUAL.includes(dto?.entryType)) throw new BadRequestException('Entry ki type chunein (Purchase, Opening, Kami, Sale)');
    if (!(Object.values(JewelryMetalType) as string[]).includes(dto?.metalType)) throw new BadRequestException('Metal chunein');
    if (!(Object.values(JewelryPurity) as string[]).includes(dto?.purity)) throw new BadRequestException('Karat chunein');
    const grams = Math.round((Number(dto.grams) || 0) * 1000) / 1000;
    if (grams <= 0) throw new BadRequestException('Grams zero se zyada hon');
    if (dto.ratePerGram != null && dto.ratePerGram !== '' && !(Number(dto.ratePerGram) >= 0)) throw new BadRequestException('Rate sahi likhein');
    if (!METAL_IN_TYPES.includes(dto.entryType)) {
      const have = await metalBalance(this.prisma, user.tenantId, dto.metalType, dto.purity);
      if (grams > have + 0.001) throw new BadRequestException(`Stock me sirf ${Math.round(have * 1000) / 1000}g hai`);
    }
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

  async page(user: AuthenticatedUser, q: { metalType?: string; purity?: string; entryType?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) {
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const search = q.search?.trim();
    const where: Prisma.JewelryMetalStockWhereInput = {
      tenantId: user.tenantId,
      ...(q.metalType && (Object.values(JewelryMetalType) as string[]).includes(q.metalType) && { metalType: q.metalType as JewelryMetalType }),
      ...(q.purity && (Object.values(JewelryPurity) as string[]).includes(q.purity) && { purity: q.purity as JewelryPurity }),
      ...(q.entryType && { entryType: q.entryType }),
      ...(q.from || q.to ? { entryDate: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
      ...(search && {
        OR: [
          { entryNumber: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
          { source: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [total, items, byType] = await Promise.all([
      this.prisma.jewelryMetalStock.count({ where }),
      this.prisma.jewelryMetalStock.findMany({ where, orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.jewelryMetalStock.groupBy({ by: ['entryType'], where, _sum: { grams: true } }),
    ]);
    const inGrams = byType.filter((r) => METAL_IN_TYPES.includes(r.entryType)).reduce((s, r) => s + (r._sum.grams ?? 0), 0);
    const outGrams = byType.filter((r) => !METAL_IN_TYPES.includes(r.entryType)).reduce((s, r) => s + (r._sum.grams ?? 0), 0);
    const r3 = (n: number) => Math.round(n * 1000) / 1000;
    return { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1), items, totals: { in: r3(inGrams), out: r3(outGrams) } };
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
