import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class KarigarsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.karigarNumber) {
      const count = await this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId } });
      dto.karigarNumber = 'KR-' + String(count + 1).padStart(4, '0');
    }
    return this.prisma.jewelryKarigar.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        yearsExperience: dto.yearsExperience ? Number(dto.yearsExperience) : null,
        hourlyRate: dto.hourlyRate ? Number(dto.hourlyRate) : null,
        perGramRate: dto.perGramRate ? Number(dto.perGramRate) : null,
        fixedRatePerPiece: dto.fixedRatePerPiece ? Number(dto.fixedRatePerPiece) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { skillLevel?: string; isActive?: boolean; isInHouse?: boolean; search?: string }) {
    return this.prisma.jewelryKarigar.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.skillLevel && { skillLevel: params.skillLevel }),
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        ...(params.isInHouse !== undefined && { isInHouse: params.isInHouse }),
        ...(params.search && {
          OR: [
            { karigarNumber: { contains: params.search, mode: 'insensitive' } },
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { cnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const k = await this.prisma.jewelryKarigar.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!k) throw new NotFoundException('Karigar not found');
    return k;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.jewelryKarigar.update({
      where: { id },
      data: {
        ...dto,
        yearsExperience: dto.yearsExperience !== undefined ? Number(dto.yearsExperience) : undefined,
        hourlyRate: dto.hourlyRate !== undefined ? Number(dto.hourlyRate) : undefined,
        perGramRate: dto.perGramRate !== undefined ? Number(dto.perGramRate) : undefined,
      },
    });
  }

  async issueMetal(user: AuthenticatedUser, id: string, grams: number) {
    const k = await this.prisma.jewelryKarigar.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!k) throw new NotFoundException('Karigar not found');
    return this.prisma.jewelryKarigar.update({
      where: { id },
      data: {
        metalIssuedGrams: k.metalIssuedGrams + grams,
        outstandingGrams: k.outstandingGrams + grams,
      },
    });
  }

  async receiveMetal(user: AuthenticatedUser, id: string, receivedGrams: number, wastageGrams: number) {
    const k = await this.prisma.jewelryKarigar.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!k) throw new NotFoundException('Karigar not found');
    return this.prisma.jewelryKarigar.update({
      where: { id },
      data: {
        metalReturnedGrams: k.metalReturnedGrams + receivedGrams,
        wastageGrams: k.wastageGrams + wastageGrams,
        outstandingGrams: Math.max(k.outstandingGrams - (receivedGrams + wastageGrams), 0),
      },
    });
  }

  async recordOrder(user: AuthenticatedUser, id: string, earnings: number) {
    const k = await this.prisma.jewelryKarigar.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!k) throw new NotFoundException('Karigar not found');
    return this.prisma.jewelryKarigar.update({
      where: { id },
      data: {
        totalOrders: k.totalOrders + 1,
        completedOrders: k.completedOrders + 1,
        totalEarnings: k.totalEarnings + earnings,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.jewelryKarigar.update({ where: { id }, data: { isActive: false } });
  }

  async summary(user: AuthenticatedUser) {
    const [total, inHouse, external, totalOutstanding] = await Promise.all([
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true, isInHouse: true } }),
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true, isInHouse: false } }),
      this.prisma.jewelryKarigar.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { outstandingGrams: true, totalEarnings: true },
      }),
    ]);
    return { total, inHouse, external, totalOutstanding: totalOutstanding._sum };
  }
}
