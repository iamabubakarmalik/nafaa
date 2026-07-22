import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertMetalRateDto } from './dto/upsert-metal-rate.dto';

@Injectable()
export class MetalRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertMetalRateDto) {
    // Deactivate previous rates for same metal+purity
    await this.prisma.jewelryMetalRate.updateMany({
      where: { tenantId: user.tenantId, metalType: dto.metalType, purity: dto.purity, isActive: true },
      data: { isActive: false },
    });

    // Auto-calculate tola (1 tola = 11.664 grams)
    const ratePerTola = dto.ratePerTola ?? dto.ratePerGram * 11.664;

    return this.prisma.jewelryMetalRate.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        ratePerTola,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
        createdById: user.id,
      },
    });
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
        ...dto,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
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
