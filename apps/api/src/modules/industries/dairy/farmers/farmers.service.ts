import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertFarmerDto } from './dto/upsert-farmer.dto';

@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertFarmerDto) {
    const count = await this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const farmerNumber = `FRM-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.dairyFarmer.create({
      data: { tenantId: user.tenantId, farmerNumber, ...dto },
    });
  }

  async list(user: AuthenticatedUser, params: { search?: string; village?: string; active?: boolean }) {
    return this.prisma.dairyFarmer.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.village && { village: { contains: params.village, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { farmerNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { cnic: { contains: params.search } },
            { village: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');

    const recentSupplies = await this.prisma.dairyFarmerSupply.findMany({
      where: { farmerId: id },
      orderBy: { supplyDate: 'desc' },
      take: 30,
    });

    return { ...f, recentSupplies };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertFarmerDto) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.dairyFarmer.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.dairyFarmer.update({ where: { id }, data: { isActive: false } });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: { amount: number; paymentMethod?: string; reference?: string; notes?: string }) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');

    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.dairyFarmer.update({
      where: { id },
      data: {
        currentBalance: { decrement: dto.amount },
        totalPaid: { increment: dto.amount },
        lastPaymentDate: new Date(),
      },
    });
  }

  async summary(user: AuthenticatedUser) {
    const [total, active, aggBalance, aggSupplied] = await Promise.all([
      this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId } }),
      this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.dairyFarmer.aggregate({ where: { tenantId: user.tenantId, currentBalance: { gt: 0 } }, _sum: { currentBalance: true } }),
      this.prisma.dairyFarmer.aggregate({ where: { tenantId: user.tenantId }, _sum: { totalSupplied: true, totalPaid: true } }),
    ]);

    return {
      totalFarmers: total,
      activeFarmers: active,
      totalPayable: aggBalance._sum.currentBalance ?? 0,
      lifetimeSupplied: aggSupplied._sum.totalSupplied ?? 0,
      lifetimePaid: aggSupplied._sum.totalPaid ?? 0,
    };
  }
}
