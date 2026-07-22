import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertInteractionDto } from './dto/upsert-interaction.dto';

@Injectable()
export class DrugInteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertInteractionDto) {
    if (dto.saltAId === dto.saltBId) throw new BadRequestException('Salts must differ');

    // Normalize order — always smaller ID first
    const [a, b] = [dto.saltAId, dto.saltBId].sort();

    const existing = await this.prisma.drugInteraction.findFirst({ where: { saltAId: a, saltBId: b } });
    if (existing) throw new BadRequestException('Interaction already exists');

    return this.prisma.drugInteraction.create({
      data: {
        tenantId: user.tenantId,
        saltAId: a,
        saltBId: b,
        severity: dto.severity,
        description: dto.description,
        clinicalEffect: dto.clinicalEffect,
        management: dto.management,
        isActive: dto.isActive ?? true,
      },
      include: { saltA: true, saltB: true },
    });
  }

  async list(user: AuthenticatedUser, params: { severity?: string; saltId?: string }) {
    return this.prisma.drugInteraction.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.severity && { severity: params.severity }),
        ...(params.saltId && { OR: [{ saltAId: params.saltId }, { saltBId: params.saltId }] }),
      },
      include: { saltA: true, saltB: true },
      orderBy: { severity: 'desc' },
    });
  }

  async check(user: AuthenticatedUser, saltIds: string[]) {
    if (saltIds.length < 2) return { interactions: [], hasWarnings: false };

    // Get all pairs
    const interactions = await this.prisma.drugInteraction.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: saltIds.flatMap((a) =>
          saltIds.filter((b) => b !== a).map((b) => ({
            saltAId: a < b ? a : b,
            saltBId: a < b ? b : a,
          })),
        ),
      },
      include: { saltA: true, saltB: true },
    });

    // Deduplicate
    const seen = new Set<string>();
    const unique = interactions.filter((i) => {
      const key = i.saltAId + ':' + i.saltBId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      interactions: unique,
      hasWarnings: unique.length > 0,
      hasMajor: unique.some((i) => ['MAJOR', 'CONTRAINDICATED'].includes(i.severity)),
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertInteractionDto) {
    const i = await this.prisma.drugInteraction.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Interaction not found');
    return this.prisma.drugInteraction.update({
      where: { id },
      data: {
        severity: dto.severity,
        description: dto.description,
        clinicalEffect: dto.clinicalEffect,
        management: dto.management,
        isActive: dto.isActive,
      },
      include: { saltA: true, saltB: true },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.drugInteraction.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Interaction not found');
    return this.prisma.drugInteraction.delete({ where: { id } });
  }
}
