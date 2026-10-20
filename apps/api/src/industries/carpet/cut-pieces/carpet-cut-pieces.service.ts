/**
 * Cut pieces: remnants left beside a roll cut, customer returns, pieces
 * from a damaged roll and pieces entered by hand. Sold pieces stay on
 * record; a piece taken out of stock becomes DAMAGED (written off), never
 * deleted. Every stock change rewrites the product's shelf stock.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CarpetCutPieceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { CreateCutPieceDto } from './dto/create-cut-piece.dto';
import { UpdateCutPieceDto } from './dto/update-cut-piece.dto';
import { QueryCutPiecesDto } from './dto/query-cut-pieces.dto';
import { ROLL_UNITS, calcSqft, r2, syncCarpetStock } from '../common/carpet-stock';
import { nextPieceCode } from '../common/roll-cut';

const IN_STOCK = new Set<CarpetCutPieceStatus>([CarpetCutPieceStatus.AVAILABLE, CarpetCutPieceStatus.RESERVED]);

@Injectable()
export class CarpetCutPiecesService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as unknown as Prisma.TransactionClient;
  }

  private sync(tx: Prisma.TransactionClient, p: { tenantId: string; shopId: string | null; productId: string; variantId: string | null }) {
    return syncCarpetStock(tx, p.tenantId, p.shopId, p.productId, p.variantId ?? null);
  }

  async create(user: AuthenticatedUser, dto: CreateCutPieceDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (!ROLL_UNITS.includes(product.unit.toLowerCase())) {
      throw new BadRequestException(`${product.name} ${product.unit} me bikta hai — tukra sirf sqft, sq meter, sq gaz ya running ft / meter wale product ka banta hai`);
    }
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({ where: { id: dto.variantId, productId: dto.productId } });
      if (!variant) throw new NotFoundException('Rang / design nahi mila');
    }
    if (dto.sourceRollId) {
      const roll = await this.prisma.carpetRoll.findFirst({ where: { id: dto.sourceRollId, tenantId: user.tenantId } });
      if (!roll) throw new NotFoundException('Roll nahi mila');
      if (roll.productId !== dto.productId) throw new BadRequestException(`Roll ${roll.rollNumber} is product ka nahi`);
    }
    if (dto.status === CarpetCutPieceStatus.SOLD) throw new BadRequestException('Naya piece Sold nahi ho sakta');

    const totalSqft = calcSqft(dto.widthFt, dto.widthInch ?? 0, dto.lengthFt, dto.lengthInch ?? 0);
    if (totalSqft <= 0) throw new BadRequestException('Piece ki lambai aur chaurai likhein');

    let pieceCode = dto.pieceCode?.trim();
    if (pieceCode) {
      const exists = await this.prisma.carpetCutPiece.findFirst({ where: { tenantId: user.tenantId, pieceCode } });
      if (exists) throw new ConflictException(`Piece code "${pieceCode}" pehle se hai`);
    } else {
      pieceCode = await nextPieceCode(this.db, user.tenantId);
    }
    const shopId = await resolveIndustryShopId(this.db, user, dto.shopId);

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.carpetCutPiece.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: dto.productId,
          variantId: dto.variantId,
          sourceRollId: dto.sourceRollId,
          sourceType: dto.sourceType ?? 'MANUAL',
          pieceCode: pieceCode!,
          widthFt: dto.widthFt,
          widthInch: dto.widthInch ?? 0,
          lengthFt: dto.lengthFt,
          lengthInch: dto.lengthInch ?? 0,
          totalSqft,
          costAmount: dto.costAmount ?? 0,
          salePrice: dto.salePrice ?? (dto.pricePerSqft ? r2(dto.pricePerSqft * totalSqft) : 0),
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
      await this.sync(tx, created);
      return created;
    });
  }

  async findAll(user: AuthenticatedUser, query: QueryCutPiecesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const where: Prisma.CarpetCutPieceWhereInput = { tenantId: user.tenantId };
    if (query.search) {
      where.OR = [
        { pieceCode: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
        { variant: { name: { contains: query.search, mode: 'insensitive' } } },
        { sourceRoll: { rollNumber: { contains: query.search, mode: 'insensitive' } } },
        { rackNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.productId) where.productId = query.productId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.shopId) where.shopId = query.shopId;
    if (query.sourceRollId) where.sourceRollId = query.sourceRollId;
    if (query.status) where.status = query.status;
    if (query.sourceType) where.sourceType = query.sourceType;

    const [items, total] = await Promise.all([
      this.prisma.carpetCutPiece.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
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
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Counts and value per status for the cut pieces page header. */
  async stats(user: AuthenticatedUser, shopId?: string) {
    const rows = await this.prisma.carpetCutPiece.groupBy({
      by: ['status'],
      where: { tenantId: user.tenantId, ...(shopId && { shopId }) },
      _count: true,
      _sum: { totalSqft: true, costAmount: true, salePrice: true },
    });
    const of = (s: CarpetCutPieceStatus) => rows.find((r) => r.status === s);
    const pack = (s: CarpetCutPieceStatus) => ({
      count: of(s)?._count ?? 0,
      sqft: r2(Number(of(s)?._sum.totalSqft ?? 0)),
      cost: r2(Number(of(s)?._sum.costAmount ?? 0)),
      value: r2(Number(of(s)?._sum.salePrice ?? 0)),
    });
    return {
      all: rows.reduce((s, r) => s + r._count, 0),
      available: pack('AVAILABLE'),
      reserved: pack('RESERVED'),
      sold: pack('SOLD'),
      damaged: pack('DAMAGED'),
    };
  }

  async available(user: AuthenticatedUser, shopId?: string) {
    return this.prisma.carpetCutPiece.findMany({
      where: { tenantId: user.tenantId, status: CarpetCutPieceStatus.AVAILABLE, ...(shopId && { shopId }) },
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
    if (!piece) throw new NotFoundException('Cut piece nahi mila');
    return piece;
  }

  /**
   * Size, price, place and notes. A sold piece stays as sold; status here
   * moves only between Available, Reserved and Damaged.
   */
  async update(user: AuthenticatedUser, id: string, dto: UpdateCutPieceDto) {
    const existing = await this.findOne(user, id);
    if (existing.status === CarpetCutPieceStatus.SOLD) throw new BadRequestException('Bika hua piece badla nahi ja sakta');
    if (dto.productId && dto.productId !== existing.productId) throw new BadRequestException('Piece ka product badla nahi ja sakta');
    if (dto.shopId && dto.shopId !== existing.shopId) throw new BadRequestException('Doosri branch me bhejne ke liye Transfer karein');
    if (dto.status === CarpetCutPieceStatus.SOLD) throw new BadRequestException('Piece bill se bikta hai, yahan se nahi');

    if (dto.pieceCode && dto.pieceCode !== existing.pieceCode) {
      const exists = await this.prisma.carpetCutPiece.findFirst({ where: { tenantId: user.tenantId, pieceCode: dto.pieceCode, NOT: { id } } });
      if (exists) throw new ConflictException('Ye piece code pehle se hai');
    }
    if (dto.variantId && dto.variantId !== existing.variantId) {
      const v = await this.prisma.productVariant.findFirst({ where: { id: dto.variantId, productId: existing.productId } });
      if (!v) throw new NotFoundException('Rang / design nahi mila');
    }

    const widthFt = dto.widthFt ?? existing.widthFt;
    const widthInch = dto.widthInch ?? existing.widthInch;
    const lengthFt = dto.lengthFt ?? existing.lengthFt;
    const lengthInch = dto.lengthInch ?? existing.lengthInch;
    const totalSqft = calcSqft(widthFt, widthInch, lengthFt, lengthInch);
    if (totalSqft <= 0) throw new BadRequestException('Piece ki lambai aur chaurai likhein');

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.carpetCutPiece.update({
        where: { id },
        data: {
          pieceCode: dto.pieceCode,
          variantId: dto.variantId,
          widthFt, widthInch, lengthFt, lengthInch, totalSqft,
          costAmount: dto.costAmount,
          salePrice: dto.salePrice,
          pricePerSqft: dto.pricePerSqft,
          status: dto.status,
          condition: dto.condition,
          rackNumber: dto.rackNumber,
          notes: dto.notes,
        },
      });
      await this.sync(tx, updated);
      if (existing.variantId !== updated.variantId) await this.sync(tx, existing);
    });
    return this.findOne(user, id);
  }

  /** Marks a piece sold outside the counter flow (bills settle pieces themselves). */
  async markSold(user: AuthenticatedUser, id: string, saleItemId?: string) {
    const piece = await this.findOne(user, id);
    if (!IN_STOCK.has(piece.status)) throw new BadRequestException(piece.status === 'SOLD' ? 'Ye piece pehle hi bik chuka hai' : 'Damage piece becha nahi ja sakta');
    if (saleItemId) {
      const item = await this.prisma.saleItem.findFirst({ where: { id: saleItemId, sale: { tenantId: user.tenantId } }, select: { id: true } });
      if (!item) throw new NotFoundException('Bill ki line nahi mili');
    }
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.carpetCutPiece.update({
        where: { id },
        data: { status: CarpetCutPieceStatus.SOLD, saleItemId, soldAt: new Date() },
      });
      await this.sync(tx, piece);
      return result;
    });
  }

  /** Takes a piece out of stock as written off (damaged). Sold pieces stay as they are. */
  async remove(user: AuthenticatedUser, id: string) {
    const piece = await this.findOne(user, id);
    if (piece.status === CarpetCutPieceStatus.SOLD) throw new BadRequestException('Bika hua piece hataya nahi ja sakta');
    if (piece.status === CarpetCutPieceStatus.DAMAGED) return { message: 'Piece pehle se stock se bahar hai' };
    await this.prisma.$transaction(async (tx) => {
      await tx.carpetCutPiece.update({
        where: { id },
        data: { status: CarpetCutPieceStatus.DAMAGED, notes: [piece.notes, 'Stock se hataya'].filter(Boolean).join(' — ') },
      });
      await this.sync(tx, piece);
    });
    return { message: 'Piece stock se hata diya (record baqi hai)' };
  }
}
