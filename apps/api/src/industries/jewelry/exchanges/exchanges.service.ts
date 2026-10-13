import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PURITY_FACTOR, postMetalEntry } from '../common/metal-ledger';
import { payFromDrawer } from '../common/drawer';

const PURITY_MAP = PURITY_FACTOR;

/** Exchange types where metal physically comes into the shop. */
const METAL_IN = ['OLD_GOLD_EXCHANGE', 'OLD_SILVER_EXCHANGE', 'BROKEN_JEWELRY', 'PURE_METAL_DEPOSIT', 'COIN_EXCHANGE', 'MELT_AND_REMAKE'];

@Injectable()
export class ExchangesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.jewelryExchange.count({ where: { tenantId: user.tenantId } });
    const exchangeNumber = 'JEX-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    // Auto-calculate fine gold/silver equivalent
    const grossWeight = Number(dto.grossWeight) || 0;
    const stoneWeight = Number(dto.stoneWeight) || 0;
    const netWeight = dto.netWeight ? Number(dto.netWeight) : grossWeight - stoneWeight;
    const testedPurity = dto.testedPurity ?? dto.claimedPurity;
    const purityFactor = PURITY_MAP[testedPurity] ?? 1;
    const fineGoldEquivalent = netWeight * purityFactor;

    const ratePerGram = Number(dto.ratePerGram) || 0;
    const grossValue = fineGoldEquivalent * ratePerGram;
    const deductions = Number(dto.deductions) || 0;
    const meltingCharges = Number(dto.meltingCharges) || 0;
    const testingCharges = Number(dto.testingCharges) || 0;
    const netValue = Math.max(grossValue - deductions - meltingCharges - testingCharges, 0);

    const { id: _id, tenantId: _t, exchangeNumber: _n, createdById: _c, paidInCash, ...fields } = dto ?? {};
    const exchange = await this.prisma.jewelryExchange.create({
      data: {
        tenantId: user.tenantId,
        ...fields,
        exchangeNumber,
        exchangeDate: dto.exchangeDate ? new Date(dto.exchangeDate) : new Date(),
        grossWeight,
        netWeight,
        stoneWeight,
        fineGoldEquivalent,
        ratePerGram,
        grossValue,
        deductions,
        netValue,
        meltingCharges,
        testingCharges,
        createdById: user.id,
      },
    });

    // Old metal taken in goes into the metal stock ledger.
    if (METAL_IN.includes(exchange.exchangeType) && netWeight > 0) {
      await postMetalEntry(this.prisma, user.tenantId, user.id, {
        entryType: 'EXCHANGE_IN',
        metalType: exchange.metalType,
        purity: exchange.testedPurity ?? exchange.claimedPurity,
        grams: netWeight,
        ratePerGram: netWeight > 0 ? netValue / netWeight : null,
        reference: exchangeNumber,
        source: exchange.customerName,
        exchangeId: exchange.id,
        notes: exchange.itemDescription,
      });
    }

    // Old metal bought for cash: the money leaves the drawer.
    if (paidInCash === true && netValue > 0) {
      const paid = await payFromDrawer(this.prisma, {
        tenantId: user.tenantId, userId: user.id, shopId: user.shopId, amount: Math.round(netValue * 100) / 100,
        reason: `Purana zewar khareeda ${exchangeNumber}`, note: exchange.customerName, reference: `jewelry-exchange:${exchangeNumber}`,
      });
      return { ...exchange, paidFromDrawer: paid };
    }
    return exchange;
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; exchangeType?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.jewelryExchange.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.exchangeType && { exchangeType: params.exchangeType as any }),
        ...(params.from || params.to ? {
          exchangeDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { exchangeNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { customerCnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: { exchangeDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const e = await this.prisma.jewelryExchange.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Exchange not found');
    return e;
  }

  async linkToSale(user: AuthenticatedUser, id: string, saleId: string) {
    await this.getOne(user, id);
    return this.prisma.jewelryExchange.update({ where: { id }, data: { saleId } });
  }

  async summary(user: AuthenticatedUser, from?: string, to?: string) {
    const where: any = { tenantId: user.tenantId };
    if (from || to) {
      where.exchangeDate = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const [total, byType, totalValue] = await Promise.all([
      this.prisma.jewelryExchange.count({ where }),
      this.prisma.jewelryExchange.groupBy({
        by: ['exchangeType'],
        where,
        _count: { _all: true },
        _sum: { fineGoldEquivalent: true, netValue: true },
      }),
      this.prisma.jewelryExchange.aggregate({
        where,
        _sum: { fineGoldEquivalent: true, netValue: true, grossWeight: true },
      }),
    ]);
    return { total, byType, totals: totalValue._sum };
  }
}
