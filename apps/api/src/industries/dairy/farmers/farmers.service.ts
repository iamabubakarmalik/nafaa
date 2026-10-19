import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { cleanInput, drawerCash, nextNumbered, r2, shopYear } from '../dairy-common';
import { LIVE_SLIP } from '../farmer-supplies/farmer-supplies.service';
import { FarmerPaymentDto, UpdateFarmerDto, UpsertFarmerDto } from './dto/upsert-farmer.dto';


@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  private check(dto: UpdateFarmerDto) {
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Gawale ka naam likhein');
    if ((dto.ratePerLiter ?? 0) < 0 || (dto.fatBonusRate ?? 0) < 0) throw new BadRequestException('Rate manfi nahi ho sakta');
  }

  async create(user: AuthenticatedUser, dto: UpsertFarmerDto) {
    this.check(dto);
    const prefix = `FRM-${shopYear()}-`;
    return nextNumbered(
      () => this.prisma.dairyFarmer.count({ where: { tenantId: user.tenantId, farmerNumber: { startsWith: prefix } } }),
      prefix, 4,
      (farmerNumber) => this.prisma.dairyFarmer.create({ data: { ...cleanInput(dto), name: dto.name.trim(), tenantId: user.tenantId, farmerNumber } }),
    );
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
    if (!f) throw new NotFoundException('Gawala nahi mila');

    const recentSupplies = await this.prisma.dairyFarmerSupply.findMany({
      where: { farmerId: id, tenantId: user.tenantId },
      orderBy: { supplyDate: 'desc' },
      take: 60,
    });
    // Cash paid from the drawer (account payments and single slips); bank payments have no row yet.
    const cashPayments = await this.prisma.cashTransaction.findMany({
      where: { tenantId: user.tenantId, type: 'CASH_OUT', reference: { in: [f.farmerNumber, ...recentSupplies.map((s) => s.id)] } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, amount: true, reason: true, createdAt: true },
    });

    return { ...f, recentSupplies, cashPayments };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateFarmerDto) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');
    this.check(dto);
    return this.prisma.dairyFarmer.update({ where: { id }, data: { ...cleanInput(dto), ...(dto.name !== undefined && { name: dto.name.trim() }) } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');
    return this.prisma.dairyFarmer.update({ where: { id }, data: { isActive: false } });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: FarmerPaymentDto) {
    const f = await this.prisma.dairyFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Gawala nahi mila');

    const amount = r2(Number(dto?.amount));
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Amount sahi likhein');

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
        reason: `Gawale ko doodh ka payment: ${f.name} (${f.farmerNumber})${dto.reference?.trim() ? ` · ${dto.reference.trim()}` : ''}${dto.notes?.trim() ? ` — ${dto.notes.trim()}` : ''}`,
        reference: f.farmerNumber,
      });

      /* Settle the oldest collection slips that all payments so far fully
         cover, so the supplies list shows the same picture as the balance.
         The balance already moved above; slips only change flags. */
      const [open, paidSlips] = await Promise.all([
        tx.dairyFarmerSupply.findMany({
          where: { tenantId: user.tenantId, farmerId: id, isPaid: false, totalAmount: { gt: 0 }, ...LIVE_SLIP },
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
