import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BulkCreateTopupDto, CreateTopupDto, SellTopupDto } from './dto/create-topup.dto';

@Injectable()
export class DigitalTopupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateNumber(user: AuthenticatedUser) {
    const count = await this.prisma.gamingDigitalTopup.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    return `TOP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(user: AuthenticatedUser, dto: CreateTopupDto) {
    const topupNumber = await this.generateNumber(user);
    return this.prisma.gamingDigitalTopup.create({
      data: {
        tenantId: user.tenantId,
        topupNumber,
        ...dto,
        denominationCurrency: dto.denominationCurrency ?? 'USD',
        profit: dto.sellingPrice - dto.costPrice,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });
  }

  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateTopupDto) {
    const created: any[] = [];
    for (const card of dto.cards) {
      const topupNumber = await this.generateNumber(user);
      const t = await this.prisma.gamingDigitalTopup.create({
        data: {
          tenantId: user.tenantId,
          topupNumber,
          provider: dto.provider,
          topupType: dto.topupType,
          denominationValue: dto.denominationValue,
          costPrice: dto.costPrice,
          sellingPrice: dto.sellingPrice,
          profit: dto.sellingPrice - dto.costPrice,
          cardCode: card.cardCode,
          cardPin: card.cardPin,
          cardSerial: card.cardSerial,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          supplierRef: dto.supplierRef,
        },
      });
      created.push(t);
    }
    return { created: created.length, items: created };
  }

  async list(user: AuthenticatedUser, params: { provider?: string; redeemed?: boolean; available?: boolean; search?: string }) {
    return this.prisma.gamingDigitalTopup.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.provider && { provider: params.provider as any }),
        ...(params.redeemed !== undefined && { isRedeemed: params.redeemed }),
        ...(params.available === true && { isRedeemed: false, soldAt: null }),
        ...(params.search && {
          OR: [
            { topupNumber: { contains: params.search, mode: 'insensitive' } },
            { cardSerial: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async availableInventory(user: AuthenticatedUser) {
    const all = await this.prisma.gamingDigitalTopup.findMany({
      where: { tenantId: user.tenantId, isRedeemed: false, soldAt: null },
    });

    const grouped: Record<string, { provider: string; topupType: string; denomination: number; count: number; sellingPrice: number }> = {};
    all.forEach((t) => {
      const key = `${t.provider}|${t.topupType}|${t.denominationValue}`;
      if (!grouped[key]) {
        grouped[key] = { provider: t.provider, topupType: t.topupType, denomination: t.denominationValue, count: 0, sellingPrice: t.sellingPrice };
      }
      grouped[key].count += 1;
    });
    return Object.values(grouped);
  }

  async getOne(user: AuthenticatedUser, id: string, revealCard = false) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Topup not found');
    if (!revealCard && !t.isRedeemed && !t.soldAt) {
      return { ...t, cardCode: t.cardCode ? '••••••••' : null, cardPin: t.cardPin ? '••••' : null };
    }
    return t;
  }

  async sell(user: AuthenticatedUser, id: string, dto: SellTopupDto) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Topup not found');
    if (t.soldAt) throw new BadRequestException('Already sold');
    if (t.isRedeemed) throw new BadRequestException('Already redeemed');

    const sellingPrice = dto.actualSellingPrice ?? t.sellingPrice;
    return this.prisma.gamingDigitalTopup.update({
      where: { id },
      data: {
        soldAt: new Date(),
        soldToCustomerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveredVia: dto.deliveredVia,
        deliveryReference: dto.deliveryReference,
        sellingPrice,
        profit: sellingPrice - t.costPrice,
      },
    });
  }

  async markRedeemed(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Topup not found');
    return this.prisma.gamingDigitalTopup.update({
      where: { id },
      data: { isRedeemed: true, redeemedAt: new Date() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingDigitalTopup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Topup not found');
    if (t.soldAt) throw new BadRequestException('Cannot delete sold topup');
    return this.prisma.gamingDigitalTopup.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [totalCards, available, sold, redeemed] = await Promise.all([
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: user.tenantId } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: user.tenantId, soldAt: null, isRedeemed: false } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: user.tenantId, soldAt: { not: null } } }),
      this.prisma.gamingDigitalTopup.count({ where: { tenantId: user.tenantId, isRedeemed: true } }),
    ]);

    const revenue = await this.prisma.gamingDigitalTopup.aggregate({
      where: { tenantId: user.tenantId, soldAt: { not: null } },
      _sum: { sellingPrice: true, profit: true },
    });

    return {
      totalCards, available, sold, redeemed,
      totalRevenue: revenue._sum.sellingPrice ?? 0,
      totalProfit: revenue._sum.profit ?? 0,
    };
  }
}
