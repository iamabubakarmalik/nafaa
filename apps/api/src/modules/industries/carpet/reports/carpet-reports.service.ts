import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class CarpetReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // OVERVIEW DASHBOARD
  // ════════════════════════════════════════════════════════

  async overview(user: AuthenticatedUser, shopId?: string) {
    const where: Prisma.CarpetRollWhereInput = {
      tenantId: user.tenantId,
      ...(shopId && { shopId }),
    };

    const [
      activeRolls,
      finishedRolls,
      damagedRolls,
      availableCutPieces,
      soldCutPieces,
    ] = await Promise.all([
      this.prisma.carpetRoll.findMany({
        where: { ...where, status: 'ACTIVE', remainingLengthFt: { gt: 0 } },
        select: {
          remainingSqft: true,
          originalSqft: true,
          costPerSqft: true,
          salePricePerSqft: true,
        },
      }),
      this.prisma.carpetRoll.count({
        where: { ...where, status: 'FINISHED' },
      }),
      this.prisma.carpetRoll.count({
        where: { ...where, status: 'DAMAGED' },
      }),
      this.prisma.carpetCutPiece.findMany({
        where: {
          tenantId: user.tenantId,
          ...(shopId && { shopId }),
          status: 'AVAILABLE',
        },
        select: { totalSqft: true, costAmount: true, salePrice: true },
      }),
      this.prisma.carpetCutPiece.count({
        where: {
          tenantId: user.tenantId,
          ...(shopId && { shopId }),
          status: 'SOLD',
        },
      }),
    ]);

    const totalSqftAvailable = activeRolls.reduce(
      (s, r) => s + Number(r.remainingSqft),
      0,
    );
    const totalStockCost = activeRolls.reduce(
      (s, r) => s + Number(r.remainingSqft) * Number(r.costPerSqft),
      0,
    );
    const totalStockSaleValue = activeRolls.reduce(
      (s, r) => s + Number(r.remainingSqft) * Number(r.salePricePerSqft),
      0,
    );

    const cutPiecesSqft = availableCutPieces.reduce(
      (s, p) => s + Number(p.totalSqft),
      0,
    );
    const cutPiecesCost = availableCutPieces.reduce(
      (s, p) => s + Number(p.costAmount),
      0,
    );
    const cutPiecesSaleValue = availableCutPieces.reduce(
      (s, p) => s + Number(p.salePrice),
      0,
    );

    return {
      activeRollCount: activeRolls.length,
      finishedRollCount: finishedRolls,
      damagedRollCount: damagedRolls,
      cutPieceAvailableCount: availableCutPieces.length,
      cutPieceSoldCount: soldCutPieces,
      totalSqftAvailable: Number(totalSqftAvailable.toFixed(2)),
      cutPiecesSqft: Number(cutPiecesSqft.toFixed(2)),
      grandTotalSqft: Number((totalSqftAvailable + cutPiecesSqft).toFixed(2)),
      totalStockCost: Number(totalStockCost.toFixed(2)),
      totalStockSaleValue: Number(totalStockSaleValue.toFixed(2)),
      potentialProfit: Number((totalStockSaleValue - totalStockCost).toFixed(2)),
      cutPiecesCost: Number(cutPiecesCost.toFixed(2)),
      cutPiecesSaleValue: Number(cutPiecesSaleValue.toFixed(2)),
    };
  }

  // ════════════════════════════════════════════════════════
  // ROLL PROFIT REPORT
  // ════════════════════════════════════════════════════════

  async rollProfitReport(user: AuthenticatedUser, shopId?: string) {
    const rolls = await this.prisma.carpetRoll.findMany({
      where: {
        tenantId: user.tenantId,
        ...(shopId && { shopId }),
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
        shop: { select: { id: true, name: true } },
        movements: {
          where: { type: 'CUT_FOR_SALE' },
          select: { lengthFt: true, sqft: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rolls.map((roll) => {
      const soldLengthFt = roll.movements.reduce(
        (s, m) => s + Math.abs(Number(m.lengthFt)),
        0,
      );
      const soldSqft = roll.movements.reduce(
        (s, m) => s + Math.abs(Number(m.sqft)),
        0,
      );
      const revenue = soldSqft * Number(roll.salePricePerSqft);
      const cost = soldSqft * Number(roll.costPerSqft);
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const usagePercent =
        roll.originalLengthFt > 0
          ? (soldLengthFt / Number(roll.originalLengthFt)) * 100
          : 0;

      const lastSaleDate =
        roll.movements.length > 0
          ? roll.movements
              .map((m) => m.createdAt)
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null;

      return {
        id: roll.id,
        rollNumber: roll.rollNumber,
        productName: roll.product.name,
        variantName: roll.variant?.name ?? null,
        variantColor: roll.variant?.color ?? null,
        shopName: roll.shop?.name ?? null,
        status: roll.status,
        originalLengthFt: Number(roll.originalLengthFt),
        remainingLengthFt: Number(roll.remainingLengthFt),
        originalSqft: Number(roll.originalSqft),
        remainingSqft: Number(roll.remainingSqft),
        costPerSqft: Number(roll.costPerSqft),
        salePricePerSqft: Number(roll.salePricePerSqft),
        soldLengthFt: Number(soldLengthFt.toFixed(2)),
        soldSqft: Number(soldSqft.toFixed(2)),
        revenue: Number(revenue.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(2)),
        usagePercent: Number(usagePercent.toFixed(2)),
        salesCount: roll.movements.length,
        receivedAt: roll.receivedAt,
        lastSaleDate,
      };
    });
  }

  // ════════════════════════════════════════════════════════
  // SLOW-MOVING ROLLS
  // ════════════════════════════════════════════════════════

  async slowMovingRolls(
    user: AuthenticatedUser,
    daysThreshold = 30,
    shopId?: string,
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const rolls = await this.prisma.carpetRoll.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        remainingLengthFt: { gt: 0 },
        receivedAt: { lte: cutoffDate },
        ...(shopId && { shopId }),
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
        shop: { select: { id: true, name: true } },
        movements: {
          where: { type: 'CUT_FOR_SALE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return rolls
      .map((roll) => {
        const lastSale = roll.movements[0]?.createdAt;
        const referenceDate = lastSale ?? roll.receivedAt;
        const daysSinceLastActivity = Math.floor(
          (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          id: roll.id,
          rollNumber: roll.rollNumber,
          productName: roll.product.name,
          variantName: roll.variant?.name ?? null,
          shopName: roll.shop?.name ?? null,
          remainingLengthFt: Number(roll.remainingLengthFt),
          remainingSqft: Number(roll.remainingSqft),
          costPerSqft: Number(roll.costPerSqft),
          stockValueCost: Number(
            (Number(roll.remainingSqft) * Number(roll.costPerSqft)).toFixed(2),
          ),
          stockValueSale: Number(
            (Number(roll.remainingSqft) * Number(roll.salePricePerSqft)).toFixed(2),
          ),
          receivedAt: roll.receivedAt,
          lastSaleDate: lastSale,
          daysSinceLastActivity,
        };
      })
      .filter((r) => r.daysSinceLastActivity >= daysThreshold)
      .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);
  }

  // ════════════════════════════════════════════════════════
  // TODAY'S CUTS SUMMARY
  // ════════════════════════════════════════════════════════

  async todaysCuts(user: AuthenticatedUser, shopId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const movements = await this.prisma.carpetRollMovement.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'CUT_FOR_SALE',
        createdAt: { gte: startOfDay },
      },
      include: {
        roll: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true, color: true } },
            shop: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = shopId
      ? movements.filter((m) => m.roll.shopId === shopId)
      : movements;

    const totalSqft = filtered.reduce((s, m) => s + Math.abs(Number(m.sqft)), 0);
    const totalLengthFt = filtered.reduce(
      (s, m) => s + Math.abs(Number(m.lengthFt)),
      0,
    );

    return {
      cutCount: filtered.length,
      totalSqftSold: Number(totalSqft.toFixed(2)),
      totalLengthSoldFt: Number(totalLengthFt.toFixed(2)),
      cuts: filtered.map((m) => ({
        id: m.id,
        rollNumber: m.roll.rollNumber,
        productName: m.roll.product.name,
        variantName: m.roll.variant?.name ?? null,
        variantColor: m.roll.variant?.color ?? null,
        shopName: m.roll.shop?.name ?? null,
        lengthFt: Math.abs(Number(m.lengthFt)),
        sqft: Math.abs(Number(m.sqft)),
        note: m.note,
        saleId: m.saleId,
        createdAt: m.createdAt,
      })),
    };
  }

  // ════════════════════════════════════════════════════════
  // TOP SELLING DESIGNS
  // ════════════════════════════════════════════════════════

  async topSellingDesigns(
    user: AuthenticatedUser,
    days = 30,
    shopId?: string,
  ) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const movements = await this.prisma.carpetRollMovement.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'CUT_FOR_SALE',
        createdAt: { gte: cutoffDate },
      },
      include: {
        roll: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    const filtered = shopId
      ? movements.filter((m) => m.roll.shopId === shopId)
      : movements;

    const grouped: Record<
      string,
      {
        productId: string;
        variantId: string | null;
        productName: string;
        variantName: string | null;
        variantColor: string | null;
        totalSqft: number;
        totalLengthFt: number;
        salesCount: number;
        revenue: number;
      }
    > = {};

    for (const m of filtered) {
      const key = `${m.roll.productId}:${m.roll.variantId ?? 'none'}`;
      if (!grouped[key]) {
        grouped[key] = {
          productId: m.roll.productId,
          variantId: m.roll.variantId,
          productName: m.roll.product.name,
          variantName: m.roll.variant?.name ?? null,
          variantColor: m.roll.variant?.color ?? null,
          totalSqft: 0,
          totalLengthFt: 0,
          salesCount: 0,
          revenue: 0,
        };
      }
      const sqftSold = Math.abs(Number(m.sqft));
      grouped[key].totalSqft += sqftSold;
      grouped[key].totalLengthFt += Math.abs(Number(m.lengthFt));
      grouped[key].salesCount += 1;
      grouped[key].revenue += sqftSold * Number(m.roll.salePricePerSqft);
    }

    return Object.values(grouped)
      .map((g) => ({
        ...g,
        totalSqft: Number(g.totalSqft.toFixed(2)),
        totalLengthFt: Number(g.totalLengthFt.toFixed(2)),
        revenue: Number(g.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.totalSqft - a.totalSqft);
  }

  // ════════════════════════════════════════════════════════
  // WASTAGE / CUT PIECES REPORT
  // ════════════════════════════════════════════════════════

  async cutPiecesReport(user: AuthenticatedUser, shopId?: string) {
    const pieces = await this.prisma.carpetCutPiece.findMany({
      where: {
        tenantId: user.tenantId,
        ...(shopId && { shopId }),
      },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
        sourceRoll: { select: { id: true, rollNumber: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const available = pieces.filter((p) => p.status === 'AVAILABLE');
    const sold = pieces.filter((p) => p.status === 'SOLD');
    const damaged = pieces.filter((p) => p.status === 'DAMAGED');

    const availableValue = available.reduce(
      (s, p) => s + Number(p.salePrice),
      0,
    );
    const availableCost = available.reduce(
      (s, p) => s + Number(p.costAmount),
      0,
    );
    const soldRevenue = sold.reduce((s, p) => s + Number(p.salePrice), 0);

    return {
      totalCount: pieces.length,
      availableCount: available.length,
      soldCount: sold.length,
      damagedCount: damaged.length,
      availableSqft: Number(
        available.reduce((s, p) => s + Number(p.totalSqft), 0).toFixed(2),
      ),
      availableValue: Number(availableValue.toFixed(2)),
      availableCost: Number(availableCost.toFixed(2)),
      potentialProfit: Number((availableValue - availableCost).toFixed(2)),
      soldRevenue: Number(soldRevenue.toFixed(2)),
      pieces: pieces.map((p) => ({
        id: p.id,
        pieceCode: p.pieceCode,
        productName: p.product.name,
        variantName: p.variant?.name ?? null,
        variantColor: p.variant?.color ?? null,
        shopName: p.shop?.name ?? null,
        sourceRoll: p.sourceRoll?.rollNumber ?? null,
        widthFt: Number(p.widthFt),
        lengthFt: Number(p.lengthFt),
        totalSqft: Number(p.totalSqft),
        costAmount: Number(p.costAmount),
        salePrice: Number(p.salePrice),
        status: p.status,
        condition: p.condition,
        createdAt: p.createdAt,
        soldAt: p.soldAt,
      })),
    };
  }
}
