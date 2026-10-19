import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertMetalRateDto } from './dto/upsert-metal-rate.dto';

const TOLA = 11.664;
const RATE_FIELDS = ['ratePerGram', 'ratePerTola', 'ratePerOunce', 'buyRate', 'sellRate', 'source', 'notes'] as const;
const pick = (dto: Partial<UpsertMetalRateDto>) =>
  Object.fromEntries(RATE_FIELDS.filter((k) => dto[k] !== undefined).map((k) => [k, dto[k]]));

@Injectable()
export class MetalRatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** A new rate replaces the active one for the same metal and karat; old rates stay as history. */
  async create(user: AuthenticatedUser, dto: UpsertMetalRateDto) {
    if (dto.buyRate && dto.buyRate > dto.ratePerGram * 1.2) throw new BadRequestException('Khareed rate bechne ke rate se bohat zyada hai — check karein');
    return this.prisma.$transaction(async (tx) => {
      await tx.jewelryMetalRate.updateMany({
        where: { tenantId: user.tenantId, metalType: dto.metalType, purity: dto.purity, isActive: true },
        data: { isActive: false },
      });
      return tx.jewelryMetalRate.create({
        data: {
          tenantId: user.tenantId,
          ...dto,
          ratePerGram: Math.round(dto.ratePerGram * 100) / 100,
          // 1 tola = 11.664 grams
          ratePerTola: dto.ratePerTola ?? Math.round(dto.ratePerGram * TOLA * 100) / 100,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
          createdById: user.id,
        },
      });
    });
  }

  async createMany(user: AuthenticatedUser, rates: UpsertMetalRateDto[]) {
    const out = [];
    for (const r of rates) out.push(await this.create(user, r));
    return out;
  }

  async currentRates(user: AuthenticatedUser) {
    return this.prisma.jewelryMetalRate.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: [{ metalType: 'asc' }, { purity: 'asc' }],
    });
  }

  async history(user: AuthenticatedUser, params: { metalType?: string; purity?: string; from?: string; to?: string; limit?: number }) {
    return this.prisma.jewelryMetalRate.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.metalType && { metalType: params.metalType as any }),
        ...(params.purity && { purity: params.purity as any }),
        ...(params.from || params.to ? {
          effectiveDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { effectiveDate: 'desc' },
      take: params.limit ?? 100,
    });
  }

  async getCurrentRate(user: AuthenticatedUser, metalType: string, purity: string) {
    return this.prisma.jewelryMetalRate.findFirst({
      where: {
        tenantId: user.tenantId,
        metalType: metalType as any,
        purity: purity as any,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<UpsertMetalRateDto>) {
    const rate = await this.prisma.jewelryMetalRate.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rate) throw new NotFoundException('Rate not found');
    return this.prisma.jewelryMetalRate.update({
      where: { id },
      data: {
        ...pick(dto),
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const rate = await this.prisma.jewelryMetalRate.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!rate) throw new NotFoundException('Rate not found');
    return this.prisma.jewelryMetalRate.update({ where: { id }, data: { isActive: false } });
  }

  async priceMovement(user: AuthenticatedUser, metalType: string, purity: string, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const rates = await this.prisma.jewelryMetalRate.findMany({
      where: {
        tenantId: user.tenantId,
        metalType: metalType as any,
        purity: purity as any,
        effectiveDate: { gte: cutoff },
      },
      orderBy: { effectiveDate: 'asc' },
    });
    if (rates.length < 2) return { movement: 0, movementPct: 0, rates };
    const first = rates[0].ratePerGram;
    const last = rates[rates.length - 1].ratePerGram;
    return {
      movement: last - first,
      movementPct: ((last - first) / first) * 100,
      rates,
      oldest: first,
      latest: last,
    };
  }
}
