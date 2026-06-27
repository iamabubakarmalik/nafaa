import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, CarpetRollStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateCarpetRollDto } from './dto/create-carpet-roll.dto';
import { UpdateCarpetRollDto } from './dto/update-carpet-roll.dto';
import { QueryRollsDto } from './dto/query-rolls.dto';
import { CutRollDto } from './dto/cut-roll.dto';
import { AdjustRollDto } from './dto/adjust-roll.dto';

@Injectable()
export class CarpetRollsService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════

  private calcSqft(
    widthFt: number,
    widthInch: number,
    lengthFt: number,
    lengthInch: number = 0,
  ): number {
    const totalWidth = Number(widthFt) + Number(widthInch || 0) / 12;
    const totalLength = Number(lengthFt) + Number(lengthInch || 0) / 12;
    return Number((totalWidth * totalLength).toFixed(2));
  }

  private async generateRollNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CR-${year}-`;

    const last = await this.prisma.carpetRoll.findFirst({
      where: { tenantId, rollNumber: { startsWith: prefix } },
      orderBy: { rollNumber: 'desc' },
      select: { rollNumber: true },
    });

    let next = 1;
    if (last?.rollNumber) {
      const parts = last.rollNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) next = lastNum + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  private async generateCutPieceCode(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CP-${year}-`;
    const last = await this.prisma.carpetCutPiece.findFirst({
      where: { tenantId, pieceCode: { startsWith: prefix } },
      orderBy: { pieceCode: 'desc' },
      select: { pieceCode: true },
    });
    let next = 1;
    if (last?.pieceCode) {
      const parts = last.pieceCode.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) next = lastNum + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
  }


  // ════════════════════════════════════════════════════════
  // SHOP STOCK SYNC HELPERS
  // ════════════════════════════════════════════════════════

  /**
   * Sync ShopStock for a carpet product+variant at a specific shop.
   * Recalculates total available sqft from all ACTIVE rolls + AVAILABLE cut pieces.
   *
   * Called after: roll create/cut/adjust/status-change, cut piece create/sold/delete.
   */
  private async syncShopStockForCarpet(
    tx: any,
    tenantId: string,
    shopId: string | null,
    productId: string,
    variantId: string | null,
  ): Promise<void> {
    if (!shopId) return;

    // Sum active rolls
    const rolls = await tx.carpetRoll.findMany({
      where: {
        tenantId,
        shopId,
        productId,
        variantId,
        status: 'ACTIVE',
        remainingLengthFt: { gt: 0 },
      },
      select: { remainingSqft: true },
    });
    const totalRollSqft = rolls.reduce(
      (sum: number, r: any) => sum + Number(r.remainingSqft),
      0,
    );

    // Sum available cut pieces
    const pieces = await tx.carpetCutPiece.findMany({
      where: {
        tenantId,
        shopId,
        productId,
        variantId,
        status: 'AVAILABLE',
      },
      select: { totalSqft: true },
    });
    const totalCutSqft = pieces.reduce(
      (sum: number, p: any) => sum + Number(p.totalSqft),
      0,
    );

    const grandTotal = Number((totalRollSqft + totalCutSqft).toFixed(2));

    // Upsert ShopStock
    const existing = await tx.shopStock.findFirst({
      where: { shopId, productId, variantId: variantId ?? null },
    });

    if (existing) {
      await tx.shopStock.update({
        where: { id: existing.id },
        data: { stock: grandTotal },
      });
    } else if (grandTotal > 0) {
      await tx.shopStock.create({
        data: {
          tenantId,
          shopId,
          productId,
          variantId,
          stock: grandTotal,
          isActive: true,
        },
      });
    }

    // Also sync global stock (sum across all shops for this product+variant)
    const allShopStocks = await tx.shopStock.findMany({
      where: { tenantId, productId, variantId: variantId ?? null },
      select: { stock: true },
    });
    const globalTotal = allShopStocks.reduce(
      (sum: number, s: any) => sum + Number(s.stock),
      0,
    );

    if (variantId) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: globalTotal },
      });
    }
    await tx.product.update({
      where: { id: productId },
      data: { stock: globalTotal },
    });
  }

  // ════════════════════════════════════════════════════════
  // CREATE
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateCarpetRollDto) {
    // 1) Product check
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // 2) Variant check (optional)
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId },
      });
      if (!variant) throw new NotFoundException('Variant not found');
    }

    // 3) Shop check (optional, fallback to user's shop)
    const shopId = dto.shopId ?? user.shopId ?? null;
    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, tenantId: user.tenantId },
      });
      if (!shop) throw new NotFoundException('Shop not found');
    }

    // 4) Roll number — auto or manual
    let rollNumber = dto.rollNumber?.trim();
    if (rollNumber) {
      const exists = await this.prisma.carpetRoll.findFirst({
        where: { tenantId: user.tenantId, rollNumber },
      });
      if (exists) throw new ConflictException(`Roll number "${rollNumber}" already exists`);
    } else {
      rollNumber = await this.generateRollNumber(user.tenantId);
    }

    // 5) Calculate sqft (with both width and length inches)
    const remainingLengthFt = dto.remainingLengthFt ?? dto.originalLengthFt;
    const originalLengthInch = dto.originalLengthInch ?? 0;
    const remainingLengthInch = dto.remainingLengthInch ?? originalLengthInch;

    const originalSqft = this.calcSqft(
      dto.widthFt,
      dto.widthInch ?? 0,
      dto.originalLengthFt,
      originalLengthInch,
    );
    const remainingSqft = this.calcSqft(
      dto.widthFt,
      dto.widthInch ?? 0,
      remainingLengthFt,
      remainingLengthInch,
    );

    // 6) Create roll + opening movement (atomic)
    const roll = await this.prisma.$transaction(async (tx) => {
      const created = await tx.carpetRoll.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: dto.productId,
          variantId: dto.variantId,
          rollNumber,
          designCode: dto.designCode,
          widthFt: dto.widthFt,
          widthInch: dto.widthInch ?? 0,
          originalLengthFt: dto.originalLengthFt,
          originalLengthInch,
          remainingLengthFt,
          remainingLengthInch,
          originalSqft,
          remainingSqft,
          costPerSqft: dto.costPerSqft ?? 0,
          salePricePerSqft: dto.salePricePerSqft ?? 0,
          wholesalePricePerSqft: dto.wholesalePricePerSqft,
          status: dto.status ?? CarpetRollStatus.ACTIVE,
          sourceType: dto.sourceType ?? 'OPENING_STOCK',
          purchaseId: dto.purchaseId,
          purchaseItemId: dto.purchaseItemId,
          supplierId: dto.supplierId,
          rackNumber: dto.rackNumber,
          notes: dto.notes,
          quality: dto.quality,
          pile: dto.pile,
          createdById: user.id,
        },
      });

      const realRemainingLength = remainingLengthFt + remainingLengthInch / 12;
      await tx.carpetRollMovement.create({
        data: {
          rollId: created.id,
          tenantId: user.tenantId,
          type: 'OPENING',
          lengthFt: realRemainingLength,
          sqft: remainingSqft,
          balanceLengthAfter: realRemainingLength,
          balanceSqftAfter: remainingSqft,
          note: `Opening entry: ${rollNumber}`,
          createdById: user.id,
        },
      });

      // ─── Sync ShopStock ────────────────────────────────────
      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        shopId,
        dto.productId,
        dto.variantId ?? null,
      );

      return created;
    });

    return this.findOne(user, roll.id);
  }

  // ════════════════════════════════════════════════════════
  // BULK OPENING (for shop onboarding)
  // ════════════════════════════════════════════════════════

  async bulkOpening(user: AuthenticatedUser, rolls: CreateCarpetRollDto[]) {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rolls.length; i++) {
      try {
        const created = await this.create(user, rolls[i]);
        results.push({ index: i, success: true, roll: created });
      } catch (err: any) {
        errors.push({ index: i, error: err.message ?? 'Unknown error' });
      }
    }

    return {
      totalSubmitted: rolls.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors,
    };
  }

  // ════════════════════════════════════════════════════════
  // FIND ALL
  // ════════════════════════════════════════════════════════

  async findAll(user: AuthenticatedUser, query: QueryRollsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CarpetRollWhereInput = { tenantId: user.tenantId };

    if (query.search) {
      where.OR = [
        { rollNumber: { contains: query.search, mode: 'insensitive' } },
        { designCode: { contains: query.search, mode: 'insensitive' } },
        { rackNumber: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.productId) where.productId = query.productId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.shopId) where.shopId = query.shopId;
    if (query.status) where.status = query.status;

    if (query.inStockOnly === 'true') {
      where.status = CarpetRollStatus.ACTIVE;
      where.remainingLengthFt = { gt: 0 };
    }

    const [items, total] = await Promise.all([
      this.prisma.carpetRoll.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, unit: true } },
          variant: { select: { id: true, name: true, color: true, colorHex: true } },
          shop: { select: { id: true, name: true } },
          _count: { select: { cutPieces: true, movements: true } },
        },
      }),
      this.prisma.carpetRoll.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ════════════════════════════════════════════════════════
  // SUMMARY — variant-wise totals
  // ════════════════════════════════════════════════════════

  async summary(user: AuthenticatedUser, shopId?: string) {
    const where: Prisma.CarpetRollWhereInput = {
      tenantId: user.tenantId,
      status: CarpetRollStatus.ACTIVE,
      remainingLengthFt: { gt: 0 },
    };
    if (shopId) where.shopId = shopId;

    const rolls = await this.prisma.carpetRoll.findMany({
      where,
      select: {
        productId: true,
        variantId: true,
        remainingLengthFt: true,
        remainingSqft: true,
        product: { select: { name: true } },
        variant: { select: { name: true, color: true } },
      },
    });

    const grouped: Record<string, any> = {};
    for (const r of rolls) {
      const key = `${r.productId}:${r.variantId ?? 'none'}`;
      if (!grouped[key]) {
        grouped[key] = {
          productId: r.productId,
          variantId: r.variantId,
          productName: r.product.name,
          variantName: r.variant?.name ?? null,
          variantColor: r.variant?.color ?? null,
          totalSqft: 0,
          totalLengthFt: 0,
          rollCount: 0,
        };
      }
      grouped[key].totalSqft += Number(r.remainingSqft);
      grouped[key].totalLengthFt += Number(r.remainingLengthFt);
      grouped[key].rollCount += 1;
    }

    return Object.values(grouped).sort((a: any, b: any) => b.totalSqft - a.totalSqft);
  }

  // ════════════════════════════════════════════════════════
  // LOW REMAINING
  // ════════════════════════════════════════════════════════

  async lowRemaining(user: AuthenticatedUser, thresholdFt = 10) {
    return this.prisma.carpetRoll.findMany({
      where: {
        tenantId: user.tenantId,
        status: CarpetRollStatus.ACTIVE,
        remainingLengthFt: { gt: 0, lte: thresholdFt },
      },
      orderBy: { remainingLengthFt: 'asc' },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
        shop: { select: { id: true, name: true } },
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // FIND ONE
  // ════════════════════════════════════════════════════════

  async findOne(user: AuthenticatedUser, id: string) {
    const roll = await this.prisma.carpetRoll.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: true,
        shop: { select: { id: true, name: true } },
        cutPieces: {
          where: { status: { not: 'SOLD' } },
          orderBy: { createdAt: 'desc' },
        },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!roll) throw new NotFoundException('Roll not found');
    return roll;
  }

  // ════════════════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════════════════

  async update(user: AuthenticatedUser, id: string, dto: UpdateCarpetRollDto) {
    const existing = await this.findOne(user, id);

    // Roll number conflict check
    if (dto.rollNumber && dto.rollNumber !== existing.rollNumber) {
      const exists = await this.prisma.carpetRoll.findFirst({
        where: { tenantId: user.tenantId, rollNumber: dto.rollNumber, NOT: { id } },
      });
      if (exists) throw new ConflictException('Roll number already exists');
    }

    // Recalculate sqft if dimensions changed (with inches support)
    const widthFt = dto.widthFt ?? existing.widthFt;
    const widthInch = dto.widthInch ?? existing.widthInch;
    const originalLengthFt = dto.originalLengthFt ?? existing.originalLengthFt;
    const originalLengthInch = dto.originalLengthInch ?? existing.originalLengthInch;
    const remainingLengthFt = dto.remainingLengthFt ?? existing.remainingLengthFt;
    const remainingLengthInch = dto.remainingLengthInch ?? existing.remainingLengthInch;

    const originalSqft = this.calcSqft(widthFt, widthInch, originalLengthFt, originalLengthInch);
    const remainingSqft = this.calcSqft(widthFt, widthInch, remainingLengthFt, remainingLengthInch);

    await this.prisma.carpetRoll.update({
      where: { id },
      data: {
        ...dto,
        originalSqft,
        remainingSqft,
      },
    });

    return this.findOne(user, id);
  }

  // ════════════════════════════════════════════════════════
  // CUT FROM ROLL (POS sale)
  // ════════════════════════════════════════════════════════

  async cut(user: AuthenticatedUser, id: string, dto: CutRollDto) {
    const roll = await this.prisma.carpetRoll.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!roll) throw new NotFoundException('Roll not found');

    if (roll.status !== CarpetRollStatus.ACTIVE) {
      throw new BadRequestException(`Roll is ${roll.status}, cannot cut`);
    }

    const requestedCut = dto.lengthFt + (dto.lengthInch ?? 0) / 12;
    const availableReal = Number(roll.remainingLengthFt) + Number(roll.remainingLengthInch) / 12;
    if (requestedCut > availableReal) {
      throw new BadRequestException(
        `Only ${roll.remainingLengthFt}ft ${roll.remainingLengthInch}in remaining, cannot cut ${dto.lengthFt}ft ${dto.lengthInch ?? 0}in`,
      );
    }

    const rollFullWidth = Number(roll.widthFt) + Number(roll.widthInch) / 12;
    const customerWidth = dto.customerWidthFt ?? rollFullWidth;

    if (customerWidth > rollFullWidth) {
      throw new BadRequestException(
        `Customer width ${customerWidth}ft exceeds roll width ${rollFullWidth}ft`,
      );
    }

    // Cut length can include inches too (e.g. 10ft 6in)
    const cutLengthInch = dto.lengthInch ?? 0;
    const cutSqft = this.calcSqft(roll.widthFt, roll.widthInch, dto.lengthFt, cutLengthInch);

    // Convert everything to real decimal for arithmetic
    const cutLengthReal = dto.lengthFt + cutLengthInch / 12;
    const currentRemainingReal = Number(roll.remainingLengthFt) + Number(roll.remainingLengthInch) / 12;
    const newRemainingReal = currentRemainingReal - cutLengthReal;

    // Split back into feet + inches for storage
    const newRemainingFt = Math.floor(newRemainingReal);
    const newRemainingInch = Math.round((newRemainingReal - newRemainingFt) * 12 * 100) / 100;

    const newRemaining = newRemainingFt; // For compatibility with existing code
    const newRemainingSqft = this.calcSqft(roll.widthFt, roll.widthInch, newRemainingFt, newRemainingInch);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Update roll
      const updatedRoll = await tx.carpetRoll.update({
        where: { id },
        data: {
          remainingLengthFt: newRemainingFt,
          remainingLengthInch: newRemainingInch,
          remainingSqft: newRemainingSqft,
          ...(newRemainingReal <= 0.01
            ? { status: CarpetRollStatus.FINISHED, finishedAt: new Date() }
            : {}),
        },
      });

      // 2) Movement log
      await tx.carpetRollMovement.create({
        data: {
          rollId: id,
          tenantId: user.tenantId,
          type: 'CUT_FOR_SALE',
          lengthFt: -cutLengthReal,
          sqft: -cutSqft,
          balanceLengthAfter: newRemainingReal,
          balanceSqftAfter: newRemainingSqft,
          reference: dto.saleId,
          saleId: dto.saleId,
          saleItemId: dto.saleItemId,
          note: dto.note ?? `Cut ${dto.lengthFt}ft × ${customerWidth}ft`,
          createdById: user.id,
        },
      });

      // 3) Leftover cut piece (if customer width < roll width)
      let leftoverPiece = null;
      const widthDiff = rollFullWidth - customerWidth;
      const createLeftover = dto.createLeftoverPiece ?? true;

      if (createLeftover && widthDiff > 0.1 && dto.lengthFt > 0) {
        const pieceCode = await this.generateCutPieceCode(user.tenantId);
        const leftoverSqft = Number((widthDiff * dto.lengthFt).toFixed(2));

        leftoverPiece = await tx.carpetCutPiece.create({
          data: {
            tenantId: user.tenantId,
            shopId: roll.shopId,
            productId: roll.productId,
            variantId: roll.variantId,
            sourceRollId: roll.id,
            sourceType: 'LEFTOVER',
            pieceCode,
            widthFt: widthDiff,
            widthInch: 0,
            lengthFt: dto.lengthFt,
            lengthInch: 0,
            totalSqft: leftoverSqft,
            costAmount: Number(roll.costPerSqft) * leftoverSqft,
            salePrice: Number(roll.salePricePerSqft) * leftoverSqft * 0.8, // 20% discount default
            condition: 'Good',
            notes: `Leftover from roll ${roll.rollNumber}`,
            createdById: user.id,
          },
        });
      }

      // ─── Sync ShopStock after cut ─────────────────────────
      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        roll.shopId,
        roll.productId,
        roll.variantId ?? null,
      );

      return { roll: updatedRoll, leftoverPiece };
    });

    return {
      success: true,
      cutLengthFt: dto.lengthFt,
      cutLengthInch: cutLengthInch,
      cutLengthReal,
      cutSqft,
      remainingLengthFt: newRemainingFt,
      remainingLengthInch: newRemainingInch,
      remainingSqft: newRemainingSqft,
      rollStatus: result.roll.status,
      leftoverPiece: result.leftoverPiece,
    };
  }

  // ════════════════════════════════════════════════════════
  // ADJUST (manual +/- with reason)
  // ════════════════════════════════════════════════════════

  async adjust(user: AuthenticatedUser, id: string, dto: AdjustRollDto) {
    const roll = await this.findOne(user, id);

    // Support delta as ft + inch
    const deltaInch = Number(dto.lengthDeltaInch || 0);
    const deltaReal = Number(dto.lengthDeltaFt) + deltaInch / 12;

    const currentReal = Number(roll.remainingLengthFt) + Number(roll.remainingLengthInch || 0) / 12;
    const newReal = currentReal + deltaReal;

    if (newReal < -0.001) {
      throw new BadRequestException('Adjustment would make remaining length negative');
    }

    // Split back into ft + inch for storage
    const newLengthFt = Math.max(Math.floor(newReal), 0);
    const newLengthInch = Math.max(Math.round((newReal - newLengthFt) * 12 * 100) / 100, 0);

    const newSqft = this.calcSqft(roll.widthFt, roll.widthInch, newLengthFt, newLengthInch);
    const oldSqft = Number(roll.remainingSqft);
    const deltaSqft = Number((newSqft - oldSqft).toFixed(2));

    await this.prisma.$transaction(async (tx) => {
      await tx.carpetRoll.update({
        where: { id },
        data: {
          remainingLengthFt: newLengthFt,
          remainingLengthInch: newLengthInch,
          remainingSqft: newSqft,
          ...(newReal <= 0.01
            ? { status: CarpetRollStatus.FINISHED, finishedAt: new Date() }
            : {}),
        },
      });

      await tx.carpetRollMovement.create({
        data: {
          rollId: id,
          tenantId: user.tenantId,
          type: 'ADJUSTMENT',
          lengthFt: deltaReal,
          sqft: deltaSqft,
          balanceLengthAfter: newReal,
          balanceSqftAfter: newSqft,
          note: `${dto.reason}${dto.note ? ' — ' + dto.note : ''}`,
          createdById: user.id,
        },
      });

      // ─── Sync ShopStock after adjust ──────────────────────
      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        roll.shopId,
        roll.productId,
        roll.variantId ?? null,
      );
    });

    return this.findOne(user, id);
  }

  // ════════════════════════════════════════════════════════
  // STATUS HELPERS
  // ════════════════════════════════════════════════════════

  async markDamaged(user: AuthenticatedUser, id: string, reason?: string) {
    const roll = await this.findOne(user, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.carpetRoll.update({
        where: { id },
        data: { status: CarpetRollStatus.DAMAGED },
      });
      await tx.carpetRollMovement.create({
        data: {
          rollId: id,
          tenantId: user.tenantId,
          type: 'DAMAGE',
          lengthFt: 0,
          sqft: 0,
          balanceLengthAfter: roll.remainingLengthFt,
          balanceSqftAfter: roll.remainingSqft,
          note: reason ?? 'Marked as damaged',
          createdById: user.id,
        },
      });

      // ─── Sync ShopStock after damage ───────────────────────
      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        roll.shopId,
        roll.productId,
        roll.variantId ?? null,
      );
    });
    return this.findOne(user, id);
  }

  async markFinished(user: AuthenticatedUser, id: string) {
    const roll = await this.findOne(user, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.carpetRoll.update({
        where: { id },
        data: {
          status: CarpetRollStatus.FINISHED,
          finishedAt: new Date(),
        },
      });

      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        roll.shopId,
        roll.productId,
        roll.variantId ?? null,
      );

      return result;
    });

    return updated;
  }



  // ════════════════════════════════════════════════════════
  // BULK IMPORT — Preview & Apply (with validation)
  // ════════════════════════════════════════════════════════

  /**
   * Preview imported rows — validates products/variants exist, checks for duplicate
   * roll numbers, returns enriched rows ready for confirmation.
   */
  async bulkImportPreview(
    user: AuthenticatedUser,
    rows: Array<{
      productName: string;
      variantName?: string;
      rollNumber?: string;
      designCode?: string;
      widthFt: number;
      widthInch?: number;
      lengthFt: number;
      lengthInch?: number;
      costPerSqft?: number;
      salePricePerSqft?: number;
      rackNumber?: string;
      notes?: string;
      quality?: string;
      pile?: string;
    }>,
    shopId?: string,
  ) {
    // Load all carpet-like products for tenant
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        unit: { in: ['sqft', 'sqm', 'sqyd'] },
      },
      include: {
        variants: { where: { isActive: true } },
      },
    });

    const productMap = new Map<string, typeof products[number]>();
    for (const p of products) {
      productMap.set(p.name.toLowerCase().trim(), p);
    }

    // Existing roll numbers
    const existingRolls = await this.prisma.carpetRoll.findMany({
      where: { tenantId: user.tenantId },
      select: { rollNumber: true },
    });
    const existingRollSet = new Set(existingRolls.map((r) => r.rollNumber));

    const previewRows = rows.map((row, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const product = productMap.get((row.productName || '').toLowerCase().trim());
      let variant = null;

      if (!product) {
        errors.push(`Product "${row.productName}" not found`);
      } else if (row.variantName) {
        variant =
          product.variants.find(
            (v) => v.name.toLowerCase().trim() === row.variantName!.toLowerCase().trim(),
          ) ?? null;
        if (!variant) {
          errors.push(`Variant "${row.variantName}" not found in ${product.name}`);
        }
      }

      if (row.rollNumber && existingRollSet.has(row.rollNumber)) {
        errors.push(`Roll number "${row.rollNumber}" already exists`);
      }

      if (!row.widthFt || row.widthFt <= 0) {
        errors.push('Width is required (in feet)');
      }
      if (!row.lengthFt || row.lengthFt <= 0) {
        errors.push('Length is required (in feet)');
      }

      const fullWidth = Number(row.widthFt) + Number(row.widthInch || 0) / 12;
      const fullLength = Number(row.lengthFt || 0) + Number(row.lengthInch || 0) / 12;
      const totalSqft = fullWidth * fullLength;

      if (!row.costPerSqft || row.costPerSqft <= 0) {
        warnings.push('Cost per sqft not set — defaults to 0');
      }
      if (!row.salePricePerSqft || row.salePricePerSqft <= 0) {
        warnings.push('Sale price per sqft not set — defaults to 0');
      }

      return {
        index: idx + 1,
        productName: row.productName,
        variantName: row.variantName,
        productId: product?.id,
        variantId: variant?.id,
        rollNumber: row.rollNumber || '(auto-generated)',
        designCode: row.designCode,
        widthFt: row.widthFt,
        widthInch: row.widthInch ?? 0,
        lengthFt: row.lengthFt,
        lengthInch: row.lengthInch ?? 0,
        totalSqft: Number(totalSqft.toFixed(2)),
        costPerSqft: row.costPerSqft ?? 0,
        salePricePerSqft: row.salePricePerSqft ?? 0,
        totalCost: Number((totalSqft * (row.costPerSqft ?? 0)).toFixed(2)),
        totalSaleValue: Number((totalSqft * (row.salePricePerSqft ?? 0)).toFixed(2)),
        rackNumber: row.rackNumber,
        notes: row.notes,
        quality: row.quality,
        pile: row.pile,
        valid: errors.length === 0,
        errors,
        warnings,
      };
    });

    const validCount = previewRows.filter((r) => r.valid).length;
    const invalidCount = previewRows.length - validCount;

    return {
      shopId,
      totalRows: previewRows.length,
      validCount,
      invalidCount,
      totalSqftToImport: Number(
        previewRows
          .filter((r) => r.valid)
          .reduce((s, r) => s + r.totalSqft, 0)
          .toFixed(2),
      ),
      totalCostToImport: Number(
        previewRows
          .filter((r) => r.valid)
          .reduce((s, r) => s + r.totalCost, 0)
          .toFixed(2),
      ),
      totalSaleValueToImport: Number(
        previewRows
          .filter((r) => r.valid)
          .reduce((s, r) => s + r.totalSaleValue, 0)
          .toFixed(2),
      ),
      rows: previewRows,
    };
  }

  /**
   * Apply bulk import — creates rolls for all VALID rows.
   * Invalid rows are skipped and returned with errors.
   */
  async bulkImportApply(
    user: AuthenticatedUser,
    rows: Array<{
      productId?: string;
      variantId?: string;
      rollNumber?: string;
      designCode?: string;
      widthFt: number;
      widthInch?: number;
      lengthFt: number;
      lengthInch?: number;
      costPerSqft?: number;
      salePricePerSqft?: number;
      rackNumber?: string;
      notes?: string;
      quality?: string;
      pile?: string;
    }>,
    shopId?: string,
  ) {
    const results: Array<{
      index: number;
      success: boolean;
      rollNumber?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.productId) {
          results.push({ index: i + 1, success: false, error: 'Product missing' });
          continue;
        }
        const created = await this.create(user, {
          productId: row.productId,
          variantId: row.variantId,
          shopId,
          rollNumber: row.rollNumber,
          designCode: row.designCode,
          widthFt: row.widthFt,
          widthInch: row.widthInch,
          originalLengthFt: row.lengthFt,
          originalLengthInch: row.lengthInch ?? 0,
          costPerSqft: row.costPerSqft,
          salePricePerSqft: row.salePricePerSqft,
          rackNumber: row.rackNumber,
          notes: row.notes,
          quality: row.quality,
          pile: row.pile,
          sourceType: 'OPENING_STOCK',
        });
        results.push({
          index: i + 1,
          success: true,
          rollNumber: created.rollNumber,
        });
      } catch (err: any) {
        results.push({
          index: i + 1,
          success: false,
          error: err?.message ?? 'Unknown error',
        });
      }
    }

    return {
      totalSubmitted: rows.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      results,
    };
  }

  // ════════════════════════════════════════════════════════
  // PRODUCT-WISE SUMMARY (for products list integration)
  // ════════════════════════════════════════════════════════

  async productSummary(user: AuthenticatedUser, productIds?: string[]) {
    const where: Prisma.CarpetRollWhereInput = {
      tenantId: user.tenantId,
      status: CarpetRollStatus.ACTIVE,
      remainingLengthFt: { gt: 0 },
    };

    if (productIds && productIds.length > 0) {
      where.productId = { in: productIds };
    }

    const rolls = await this.prisma.carpetRoll.findMany({
      where,
      select: {
        productId: true,
        remainingLengthFt: true,
        remainingSqft: true,
        salePricePerSqft: true,
      },
    });

    // Group by productId
    const grouped: Record<string, {
      productId: string;
      totalSqft: number;
      totalLengthFt: number;
      rollCount: number;
      avgSalePrice: number;
      minSalePrice: number;
      maxSalePrice: number;
    }> = {};

    for (const r of rolls) {
      if (!grouped[r.productId]) {
        grouped[r.productId] = {
          productId: r.productId,
          totalSqft: 0,
          totalLengthFt: 0,
          rollCount: 0,
          avgSalePrice: 0,
          minSalePrice: Number.MAX_VALUE,
          maxSalePrice: 0,
        };
      }
      const g = grouped[r.productId];
      g.totalSqft += Number(r.remainingSqft);
      g.totalLengthFt += Number(r.remainingLengthFt);
      g.rollCount += 1;
      g.avgSalePrice += Number(r.salePricePerSqft);
      g.minSalePrice = Math.min(g.minSalePrice, Number(r.salePricePerSqft));
      g.maxSalePrice = Math.max(g.maxSalePrice, Number(r.salePricePerSqft));
    }

    // Calculate average and finalize
    const result = Object.values(grouped).map((g) => ({
      ...g,
      avgSalePrice: g.rollCount > 0 ? g.avgSalePrice / g.rollCount : 0,
      minSalePrice: g.minSalePrice === Number.MAX_VALUE ? 0 : g.minSalePrice,
    }));

    // Also include cut pieces count
    const cutPiecesGrouped = await this.prisma.carpetCutPiece.groupBy({
      by: ['productId'],
      where: {
        tenantId: user.tenantId,
        status: 'AVAILABLE',
        ...(productIds && productIds.length > 0
          ? { productId: { in: productIds } }
          : {}),
      },
      _count: true,
      _sum: { totalSqft: true },
    });

    const cutPiecesMap = new Map(
      cutPiecesGrouped.map((cp) => [
        cp.productId,
        { count: cp._count, totalSqft: Number(cp._sum.totalSqft ?? 0) },
      ]),
    );

    return result.map((r) => ({
      ...r,
      cutPiecesCount: cutPiecesMap.get(r.productId)?.count ?? 0,
      cutPiecesSqft: cutPiecesMap.get(r.productId)?.totalSqft ?? 0,
    }));
  }

  // ════════════════════════════════════════════════════════
  // DELETE
  // ════════════════════════════════════════════════════════

  async remove(user: AuthenticatedUser, id: string) {
    const roll = await this.findOne(user, id);

    const saleMovements = await this.prisma.carpetRollMovement.count({
      where: { rollId: id, type: 'CUT_FOR_SALE' },
    });

    if (saleMovements > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.carpetRoll.update({
          where: { id },
          data: { status: CarpetRollStatus.FINISHED },
        });
        await this.syncShopStockForCarpet(
          tx,
          user.tenantId,
          roll.shopId,
          roll.productId,
          roll.variantId ?? null,
        );
      });
      return {
        message: 'Roll marked finished (has sales history — cannot hard delete)',
        softDeleted: true,
        salesCount: saleMovements,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.carpetRoll.delete({ where: { id } });
      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        roll.shopId,
        roll.productId,
        roll.variantId ?? null,
      );
    });

    return { message: 'Roll deleted successfully', softDeleted: false };
  }
}
