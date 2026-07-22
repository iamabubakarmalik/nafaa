import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateSupplyDto } from './dto/create-supply.dto';

@Injectable()
export class FarmerSuppliesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateSupplyDto) {
    const farmer = await this.prisma.dairyFarmer.findFirst({ where: { id: dto.farmerId, tenantId: user.tenantId } });
    if (!farmer) throw new NotFoundException('Farmer not found');
    if (!farmer.isActive) throw new BadRequestException('Farmer is inactive');

    const rate = dto.ratePerLiter ?? farmer.ratePerLiter;
    const fatBonus = dto.fatContent && dto.fatContent > 6 ? (dto.fatContent - 6) * farmer.fatBonusRate * dto.quantity : 0;
    const totalAmount = rate * dto.quantity + fatBonus + (dto.otherAdjustment ?? 0);

    return this.prisma.$transaction(async (tx) => {
      const supply = await tx.dairyFarmerSupply.create({
        data: {
          tenantId: user.tenantId,
          farmerId: dto.farmerId,
          supplyDate: dto.supplyDate ? new Date(dto.supplyDate) : new Date(),
          slot: dto.slot ?? 'MORNING',
          quantity: dto.quantity,
          unit: dto.unit ?? 'LITER',
          fatContent: dto.fatContent,
          snfContent: dto.snfContent,
          quality: dto.quality,
          ratePerLiter: rate,
          fatBonus,
          otherAdjustment: dto.otherAdjustment ?? 0,
          totalAmount,
          receivedByStaffId: user.id,
          notes: dto.notes,
        },
      });

      // Update farmer balances + avg quality
      const allSupplies = await tx.dairyFarmerSupply.findMany({ where: { farmerId: dto.farmerId }, take: 30, orderBy: { supplyDate: 'desc' } });
      const withFat = allSupplies.filter((s) => s.fatContent);
      const withSnf = allSupplies.filter((s) => s.snfContent);
      const avgFat = withFat.length > 0 ? withFat.reduce((s, x) => s + (x.fatContent ?? 0), 0) / withFat.length : null;
      const avgSnf = withSnf.length > 0 ? withSnf.reduce((s, x) => s + (x.snfContent ?? 0), 0) / withSnf.length : null;

      await tx.dairyFarmer.update({
        where: { id: dto.farmerId },
        data: {
          currentBalance: { increment: totalAmount },
          totalSupplied: { increment: dto.quantity },
          lastSupplyDate: new Date(),
          avgFatContent: avgFat,
          avgSnfContent: avgSnf,
        },
      });

      return supply;
    });
  }

  async list(user: AuthenticatedUser, params: { farmerId?: string; from?: string; to?: string; slot?: string; quality?: string }) {
    return this.prisma.dairyFarmerSupply.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.farmerId && { farmerId: params.farmerId }),
        ...(params.slot && { slot: params.slot as any }),
        ...(params.quality && { quality: params.quality as any }),
        ...(params.from || params.to ? {
          supplyDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      include: { farmer: true },
      orderBy: { supplyDate: 'desc' },
      take: 200,
    });
  }

  async byFarmer(user: AuthenticatedUser, farmerId: string, params: { from?: string; to?: string }) {
    return this.prisma.dairyFarmerSupply.findMany({
      where: {
        tenantId: user.tenantId,
        farmerId,
        ...(params.from || params.to ? {
          supplyDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { supplyDate: 'desc' },
    });
  }

  async markPaid(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.dairyFarmerSupply.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Supply not found');
    return this.prisma.dairyFarmerSupply.update({
      where: { id },
      data: { isPaid: true, paidAt: new Date() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.dairyFarmerSupply.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Supply not found');

    // Reverse balances
    await this.prisma.dairyFarmer.update({
      where: { id: s.farmerId },
      data: {
        currentBalance: { decrement: s.totalAmount },
        totalSupplied: { decrement: s.quantity },
      },
    });
    return this.prisma.dairyFarmerSupply.delete({ where: { id } });
  }

  async dailySummary(user: AuthenticatedUser, date?: string) {
    const d = date ? new Date(date) : new Date();
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);

    const supplies = await this.prisma.dairyFarmerSupply.findMany({
      where: { tenantId: user.tenantId, supplyDate: { gte: start, lte: end } },
      include: { farmer: true },
    });

    const morning = supplies.filter((s) => s.slot === 'MORNING');
    const evening = supplies.filter((s) => s.slot === 'EVENING');

    return {
      date: d.toISOString().split('T')[0],
      totalSupplies: supplies.length,
      totalLiters: supplies.reduce((s, x) => s + x.quantity, 0),
      totalAmount: supplies.reduce((s, x) => s + x.totalAmount, 0),
      morningLiters: morning.reduce((s, x) => s + x.quantity, 0),
      eveningLiters: evening.reduce((s, x) => s + x.quantity, 0),
      farmersCount: new Set(supplies.map((s) => s.farmerId)).size,
      supplies,
    };
  }
}
