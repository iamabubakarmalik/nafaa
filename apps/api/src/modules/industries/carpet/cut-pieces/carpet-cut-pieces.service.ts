import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, CarpetCutPieceStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateCutPieceDto } from './dto/create-cut-piece.dto';
import { UpdateCutPieceDto } from './dto/update-cut-piece.dto';
import { QueryCutPiecesDto } from './dto/query-cut-pieces.dto';

@Injectable()
export class CarpetCutPiecesService {
  constructor(private readonly prisma: PrismaService) {}
  // ════════════════════════════════════════════════════════
  // SHOP STOCK SYNC
  // ════════════════════════════════════════════════════════

  private async syncShopStockForCarpet(
    tx: any,
    tenantId: string,
    shopId: string | null,
    productId: string,
    variantId: string | null,
  ): Promise<void> {
    if (!shopId) return;

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


  private calcSqft(widthFt: number, widthInch: number, lengthFt: number, lengthInch: number): number {
    const w = Number(widthFt) + Number(widthInch || 0) / 12;
    const l = Number(lengthFt) + Number(lengthInch || 0) / 12;
    return Number((w * l).toFixed(2));
  }

  private async generateCode(tenantId: string): Promise<string> {
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

  async create(user: AuthenticatedUser, dto: CreateCutPieceDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId },
      });
      if (!variant) throw new NotFoundException('Variant not found');
    }

    if (dto.sourceRollId) {
      const roll = await this.prisma.carpetRoll.findFirst({
        where: { id: dto.sourceRollId, tenantId: user.tenantId },
      });
      if (!roll) throw new NotFoundException('Source roll not found');
    }

    let pieceCode = dto.pieceCode?.trim();
    if (pieceCode) {
      const exists = await this.prisma.carpetCutPiece.findFirst({
        where: { tenantId: user.tenantId, pieceCode },
      });
      if (exists) throw new ConflictException(`Piece code "${pieceCode}" already exists`);
    } else {
      pieceCode = await this.generateCode(user.tenantId);
    }

    const totalSqft = this.calcSqft(
      dto.widthFt,
      dto.widthInch ?? 0,
      dto.lengthFt,
      dto.lengthInch ?? 0,
    );

    const shopId = dto.shopId ?? user.shopId ?? null;

    const piece = await this.prisma.$transaction(async (tx) => {
      const created = await tx.carpetCutPiece.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: dto.productId,
          variantId: dto.variantId,
          sourceRollId: dto.sourceRollId,
          sourceType: dto.sourceType ?? 'MANUAL',
          pieceCode,
          widthFt: dto.widthFt,
          widthInch: dto.widthInch ?? 0,
          lengthFt: dto.lengthFt,
          lengthInch: dto.lengthInch ?? 0,
          totalSqft,
          costAmount: dto.costAmount ?? 0,
          salePrice: dto.salePrice ?? 0,
          pricePerSqft: dto.pricePerSqft,
          status: dto.status ?? CarpetCutPieceStatus.AVAILABLE,
          condition: dto.condition ?? 'Good',
          rackNumber: dto.rackNumber,
          notes: dto.notes,
          createdById: user.id,
        },
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, name: true, color: true } },
          sourceRoll: { select: { id: true, rollNumber: true } },
          shop: { select: { id: true, name: true } },
        },
      });

      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        shopId,
        dto.productId,
        dto.variantId ?? null,
      );

      return created;
    });

    return piece;
  }

  async findAll(user: AuthenticatedUser, query: QueryCutPiecesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CarpetCutPieceWhereInput = { tenantId: user.tenantId };

    if (query.search) {
      where.OR = [
        { pieceCode: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.productId) where.productId = query.productId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.shopId) where.shopId = query.shopId;
    if (query.sourceRollId) where.sourceRollId = query.sourceRollId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.carpetCutPiece.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true } },
          variant: { select: { id: true, name: true, color: true, colorHex: true } },
          sourceRoll: { select: { id: true, rollNumber: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
      this.prisma.carpetCutPiece.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async available(user: AuthenticatedUser, shopId?: string) {
    const where: Prisma.CarpetCutPieceWhereInput = {
      tenantId: user.tenantId,
      status: CarpetCutPieceStatus.AVAILABLE,
    };
    if (shopId) where.shopId = shopId;

    return this.prisma.carpetCutPiece.findMany({
      where,
      orderBy: [{ totalSqft: 'desc' }],
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const piece = await this.prisma.carpetCutPiece.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: true,
        variant: true,
        sourceRoll: { select: { id: true, rollNumber: true, designCode: true } },
        shop: { select: { id: true, name: true } },
      },
    });
    if (!piece) throw new NotFoundException('Cut piece not found');
    return piece;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCutPieceDto) {
    const existing = await this.findOne(user, id);

    if (dto.pieceCode && dto.pieceCode !== existing.pieceCode) {
      const exists = await this.prisma.carpetCutPiece.findFirst({
        where: { tenantId: user.tenantId, pieceCode: dto.pieceCode, NOT: { id } },
      });
      if (exists) throw new ConflictException('Piece code already exists');
    }

    const widthFt = dto.widthFt ?? existing.widthFt;
    const widthInch = dto.widthInch ?? existing.widthInch;
    const lengthFt = dto.lengthFt ?? existing.lengthFt;
    const lengthInch = dto.lengthInch ?? existing.lengthInch;
    const totalSqft = this.calcSqft(widthFt, widthInch, lengthFt, lengthInch);

    await this.prisma.carpetCutPiece.update({
      where: { id },
      data: { ...dto, totalSqft },
    });

    return this.findOne(user, id);
  }

  async markSold(user: AuthenticatedUser, id: string, saleItemId?: string) {
    const piece = await this.findOne(user, id);
    if (piece.status === CarpetCutPieceStatus.SOLD) {
      throw new BadRequestException('Already sold');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.carpetCutPiece.update({
        where: { id },
        data: {
          status: CarpetCutPieceStatus.SOLD,
          saleItemId,
          soldAt: new Date(),
        },
      });

      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        piece.shopId,
        piece.productId,
        piece.variantId ?? null,
      );

      return result;
    });

    return updated;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const piece = await this.findOne(user, id);
    if (piece.status === CarpetCutPieceStatus.SOLD) {
      throw new BadRequestException('Cannot delete sold cut piece');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.carpetCutPiece.delete({ where: { id } });
      await this.syncShopStockForCarpet(
        tx,
        user.tenantId,
        piece.shopId,
        piece.productId,
        piece.variantId ?? null,
      );
    });

    return { message: 'Cut piece deleted' };
  }
}
