import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class FreshnessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    return this.prisma.bakeryFreshnessLog.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        productId: dto.productId,
        productName: dto.productName,
        batchNumber: dto.batchNumber,
        productionDate: new Date(dto.productionDate),
        bestBefore: new Date(dto.bestBefore),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        initialQty: dto.initialQty,
        currentQty: dto.currentQty ?? dto.initialQty,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; productId?: string }) {
    return this.prisma.bakeryFreshnessLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.productId && { productId: params.productId }),
      },
      orderBy: { bestBefore: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const log = await this.prisma.bakeryFreshnessLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!log) throw new NotFoundException('Log not found');
    return log;
  }

  async recordSale(user: AuthenticatedUser, id: string, qty: number) {
    const log = await this.prisma.bakeryFreshnessLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!log) throw new NotFoundException('Log not found');
    if (log.currentQty < qty) throw new BadRequestException('Not enough stock');
    return this.prisma.bakeryFreshnessLog.update({
      where: { id },
      data: {
        soldQty: log.soldQty + qty,
        currentQty: log.currentQty - qty,
      },
    });
  }

  async discard(user: AuthenticatedUser, id: string, qty: number, reason: string) {
    const log = await this.prisma.bakeryFreshnessLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!log) throw new NotFoundException('Log not found');
    return this.prisma.bakeryFreshnessLog.update({
      where: { id },
      data: {
        wastedQty: log.wastedQty + qty,
        currentQty: Math.max(log.currentQty - qty, 0),
        status: log.currentQty - qty <= 0 ? 'DISCARDED' : log.status,
        discardedAt: new Date(),
        discardReason: reason,
      },
    });
  }

  async discount(user: AuthenticatedUser, id: string, qty: number) {
    const log = await this.prisma.bakeryFreshnessLog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!log) throw new NotFoundException('Log not found');
    return this.prisma.bakeryFreshnessLog.update({
      where: { id },
      data: {
        discountedQty: log.discountedQty + qty,
      },
    });
  }

  async runExpiryCheck(user: AuthenticatedUser) {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 1);

    const logs = await this.prisma.bakeryFreshnessLog.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['FRESH', 'DAY_OLD', 'NEAR_EXPIRY'] },
      },
    });

    let expired = 0;
    let nearExpiry = 0;
    let dayOld = 0;

    for (const log of logs) {
      let newStatus: any = log.status;

      if (log.bestBefore < now) {
        newStatus = 'EXPIRED';
        expired++;
      } else if (log.bestBefore < soon) {
        newStatus = 'NEAR_EXPIRY';
        nearExpiry++;
      } else {
        const hoursSinceProduction = (now.getTime() - log.productionDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceProduction > 24 && log.status === 'FRESH') {
          newStatus = 'DAY_OLD';
          dayOld++;
        }
      }

      if (newStatus !== log.status) {
        await this.prisma.bakeryFreshnessLog.update({
          where: { id: log.id },
          data: { status: newStatus },
        });
      }
    }

    return { checked: logs.length, expired, nearExpiry, dayOld };
  }

  async summary(user: AuthenticatedUser) {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 1);

    const [fresh, dayOld, nearExpiry, expired, todayWaste] = await Promise.all([
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'FRESH' } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'DAY_OLD' } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'NEAR_EXPIRY' } }),
      this.prisma.bakeryFreshnessLog.count({ where: { tenantId: user.tenantId, status: 'EXPIRED' } }),
      this.prisma.bakeryFreshnessLog.aggregate({
        where: {
          tenantId: user.tenantId,
          discardedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { wastedQty: true },
      }),
    ]);

    return { fresh, dayOld, nearExpiry, expired, todayWasteQty: todayWaste._sum.wastedQty ?? 0 };
  }
}
