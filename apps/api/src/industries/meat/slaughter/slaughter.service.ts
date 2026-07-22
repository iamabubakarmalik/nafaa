import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class SlaughterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.meatSlaughterLog.count({ where: { tenantId: user.tenantId } });
    const slaughterNumber = 'SL-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    return this.prisma.$transaction(async (tx) => {
      const yieldPct = dto.dressedWeightKg && dto.liveWeightKg
        ? (dto.dressedWeightKg / dto.liveWeightKg) * 100
        : null;

      const log = await tx.meatSlaughterLog.create({
        data: {
          tenantId: user.tenantId,
          slaughterNumber,
          ...dto,
          slaughterDate: dto.slaughterDate ? new Date(dto.slaughterDate) : new Date(),
          yieldPct,
          createdById: user.id,
        },
      });

      // Mark live animal as slaughtered
      if (dto.liveAnimalId) {
        await tx.meatLiveAnimal.update({
          where: { id: dto.liveAnimalId },
          data: {
            isSlaughtered: true,
            slaughteredAt: new Date(),
            slaughterMethod: dto.slaughterMethod,
            slaughterCertBy: dto.slaughteredBy,
            slaughterWeightKg: dto.liveWeightKg,
            meatYieldKg: dto.dressedWeightKg,
            yieldPct,
          },
        });
      }

      return log;
    });
  }

  async list(user: AuthenticatedUser, params: { animalType?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.meatSlaughterLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.animalType && { animalType: params.animalType as any }),
        ...(params.from || params.to ? {
          slaughterDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { slaughterNumber: { contains: params.search, mode: 'insensitive' } },
            { animalTag: { contains: params.search, mode: 'insensitive' } },
            { slaughteredBy: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { slaughterDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.meatSlaughterLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Log not found');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const s = await this.prisma.meatSlaughterLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Log not found');
    return this.prisma.meatSlaughterLog.update({
      where: { id },
      data: {
        ...dto,
        slaughterDate: dto.slaughterDate ? new Date(dto.slaughterDate) : undefined,
      },
    });
  }

  async halalCompliance(user: AuthenticatedUser, from?: string, to?: string) {
    const where: any = { tenantId: user.tenantId };
    if (from || to) {
      where.slaughterDate = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const [total, halal, withCert, withVet] = await Promise.all([
      this.prisma.meatSlaughterLog.count({ where }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, isHalal: true } }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, halalCertNumber: { not: null } } }),
      this.prisma.meatSlaughterLog.count({ where: { ...where, vetInspection: true } }),
    ]);

    return {
      total,
      halal,
      halalPct: total > 0 ? (halal / total) * 100 : 0,
      withCert,
      certPct: total > 0 ? (withCert / total) * 100 : 0,
      withVet,
      vetPct: total > 0 ? (withVet / total) * 100 : 0,
    };
  }
}
