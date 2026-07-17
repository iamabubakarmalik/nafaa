import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class LiveAnimalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.tagNumber) {
      const count = await this.prisma.meatLiveAnimal.count({ where: { tenantId: user.tenantId } });
      dto.tagNumber = 'ANM-' + String(count + 1).padStart(5, '0');
    }
    const dup = await this.prisma.meatLiveAnimal.findFirst({ where: { tenantId: user.tenantId, tagNumber: dto.tagNumber } });
    if (dup) throw new BadRequestException('Tag number already exists');

    return this.prisma.meatLiveAnimal.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
      },
    });
  }

  async list(user: AuthenticatedUser, params: { animalType?: string; isSlaughtered?: boolean; isSold?: boolean; search?: string }) {
    return this.prisma.meatLiveAnimal.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.animalType && { animalType: params.animalType as any }),
        ...(params.isSlaughtered !== undefined && { isSlaughtered: params.isSlaughtered }),
        ...(params.isSold !== undefined && { isSold: params.isSold }),
        ...(params.search && {
          OR: [
            { tagNumber: { contains: params.search, mode: 'insensitive' } },
            { breed: { contains: params.search, mode: 'insensitive' } },
            { vendorName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.meatLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    return a;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const a = await this.prisma.meatLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    return this.prisma.meatLiveAnimal.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
    });
  }

  async addFeedCost(user: AuthenticatedUser, id: string, days: number, costPerDay: number) {
    const a = await this.prisma.meatLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    return this.prisma.meatLiveAnimal.update({
      where: { id },
      data: {
        daysHeld: a.daysHeld + days,
        totalFeedCost: a.totalFeedCost + (days * costPerDay),
        dailyFeedCost: costPerDay,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.meatLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    return this.prisma.meatLiveAnimal.update({ where: { id }, data: { isActive: false } });
  }

  async summary(user: AuthenticatedUser) {
    const [byType, totalCost, aliveCount] = await Promise.all([
      this.prisma.meatLiveAnimal.groupBy({
        by: ['animalType'],
        where: { tenantId: user.tenantId, isActive: true, isSlaughtered: false },
        _count: { _all: true },
        _sum: { weightKg: true },
      }),
      this.prisma.meatLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, isActive: true, isSlaughtered: false },
        _sum: { purchasePrice: true, totalFeedCost: true },
      }),
      this.prisma.meatLiveAnimal.count({
        where: { tenantId: user.tenantId, isActive: true, isSlaughtered: false },
      }),
    ]);
    return { byType, totalCost, aliveCount };
  }
}
