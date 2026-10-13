import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertFarmerDto } from './dto/upsert-farmer.dto';
import { drawerCash } from '../dairy-common';

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

    const amount = Number(dto?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dairyFarmer.update({
        where: { id },
        data: {
          currentBalance: { decrement: amount },
          totalPaid: { increment: amount },
          lastPaymentDate: new Date(),
        },
      });
      await drawerCash(tx, user, {
        direction: 'OUT', amount, method: dto.paymentMethod,
        reason: `Kissan ko doodh ki raqam: ${f.name} (${f.farmerNumber})`, reference: dto.reference || f.farmerNumber,
      });

      /* Settle the oldest collection slips that all payments so far fully
         cover, so the supplies list shows the same picture as the balance.
         The balance already moved above; slips only change flags. */
      const [open, paidSlips] = await Promise.all([
        tx.dairyFarmerSupply.findMany({
          where: { tenantId: user.tenantId, farmerId: id, isPaid: false },
          orderBy: { supplyDate: 'asc' },
          select: { id: true, totalAmount: true },
        }),
        tx.dairyFarmerSupply.aggregate({
          where: { tenantId: user.tenantId, farmerId: id, isPaid: true },
          _sum: { totalAmount: true },
        }),
      ]);
      let left = updated.totalPaid - (paidSlips._sum.totalAmount ?? 0) + 0.01;
      const settled: string[] = [];
      for (const slip of open) {
        if (slip.totalAmount > left) break;
        left -= slip.totalAmount;
        settled.push(slip.id);
      }
      if (settled.length) {
        await tx.dairyFarmerSupply.updateMany({ where: { id: { in: settled } }, data: { isPaid: true, paidAt: new Date() } });
      }
      return updated;
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
