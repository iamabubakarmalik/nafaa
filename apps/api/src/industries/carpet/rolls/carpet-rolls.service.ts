/**
 * Carpet rolls: opening and purchased rolls, cuts, adjustments, damage and
 * finishing. Every change that moves length writes a roll movement and
 * rewrites the product's shelf stock (syncCarpetStock). Rolls are never
 * deleted: a wrong entry is closed with a REMOVED movement.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CarpetRollStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { CreateCarpetRollDto } from './dto/create-carpet-roll.dto';
import { UpdateCarpetRollDto } from './dto/update-carpet-roll.dto';
import { QueryRollsDto } from './dto/query-rolls.dto';
import { CutRollDto } from './dto/cut-roll.dto';
import { AdjustRollDto } from './dto/adjust-roll.dto';
import { BulkImportApplyRow, BulkImportRollRow } from './dto/bulk-import.dto';
import { nextCode } from '../common/next-code';
import { ROLL_UNITS, calcSqft, codeYear, r2, realFt, splitFt, syncCarpetStock } from '../common/carpet-stock';
import { cutRoll } from '../common/roll-cut';

const MAX_IMPORT_ROWS = 1000;

@Injectable()
export class CarpetRollsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as unknown as Prisma.TransactionClient;
  }

  private async generateRollNumber(tenantId: string): Promise<string> {
    return nextCode(async (prefix) => (await this.prisma.carpetRoll.findMany({
      where: { tenantId, rollNumber: { startsWith: prefix } },
      select: { rollNumber: true }, orderBy: { createdAt: 'desc' }, take: 500,
    })).map((r) => r.rollNumber), `CR-${codeYear()}-`);
  }

  private sync(tx: Prisma.TransactionClient, roll: { tenantId: string; shopId: string | null; productId: string; variantId: string | null }) {
    return syncCarpetStock(tx, roll.tenantId, roll.shopId, roll.productId, roll.variantId ?? null);
  }

  // ─── Create ─────────────────────────────────────────────

  async create(user: AuthenticatedUser, dto: CreateCarpetRollDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (!ROLL_UNITS.includes(product.unit.toLowerCase())) {
      throw new BadRequestException(`${product.name} ${product.unit} me bikta hai — roll sirf sqft, sq meter, sq gaz ya running ft / meter wale product ka banta hai`);
    }
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({ where: { id: dto.variantId, productId: dto.productId } });
      if (!variant) throw new NotFoundException('Rang / design nahi mila');
    }
    if (dto.status && dto.status !== CarpetRollStatus.ACTIVE && dto.status !== CarpetRollStatus.RESERVED) {
      throw new BadRequestException('Naya roll sirf Active ya Reserved ho sakta hai');
    }
    const shopId = await resolveIndustryShopId(this.db, user, dto.shopId);

    let rollNumber = dto.rollNumber?.trim();
    if (rollNumber) {
      const exists = await this.prisma.carpetRoll.findFirst({ where: { tenantId: user.tenantId, rollNumber } });
      if (exists) throw new ConflictException(`Roll number "${rollNumber}" pehle se hai`);
    } else {
      rollNumber = await this.generateRollNumber(user.tenantId);
    }

    const originalLengthInch = dto.originalLengthInch ?? 0;
    const remainingLengthFt = dto.remainingLengthFt ?? dto.originalLengthFt;
    const remainingLengthInch = dto.remainingLengthInch ?? (dto.remainingLengthFt == null ? originalLengthInch : 0);
    const original = realFt(dto.originalLengthFt, originalLengthInch);
    const remaining = realFt(remainingLengthFt, remainingLengthInch);
    if (original <= 0) throw new BadRequestException('Roll ki lambai likhein');
    if (remaining > original + 0.001) throw new BadRequestException('Bachi lambai asal lambai se zyada nahi ho sakti');

    const originalSqft = calcSqft(dto.widthFt, dto.widthInch ?? 0, dto.originalLengthFt, originalLengthInch);
    const remainingSqft = calcSqft(dto.widthFt, dto.widthInch ?? 0, remainingLengthFt, remainingLengthInch);

    const roll = await this.prisma.$transaction(async (tx) => {
      const created = await tx.carpetRoll.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: dto.productId,
          variantId: dto.variantId,
          rollNumber: rollNumber!,
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
      await tx.carpetRollMovement.create({
        data: {
          rollId: created.id,
          tenantId: user.tenantId,
          type: 'OPENING',
          lengthFt: remaining,
          sqft: remainingSqft,
          balanceLengthAfter: remaining,
          balanceSqftAfter: remainingSqft,
          note: `Opening entry: ${rollNumber}`,
          createdById: user.id,
        },
      });
      await this.sync(tx, created);
      return created;
    });

    return this.findOne(user, roll.id);
  }

  /** Several rolls at once (product setup); each row succeeds or fails on its own. */
  async bulkOpening(user: AuthenticatedUser, rolls: CreateCarpetRollDto[]) {
    const results: any[] = [];
    const errors: any[] = [];
    for (let i = 0; i < rolls.length; i++) {
      try {
        results.push({ index: i, success: true, roll: await this.create(user, rolls[i]) });
      } catch (err: any) {
        errors.push({ index: i, error: err?.message ?? 'Unknown error' });
      }
    }
    return { totalSubmitted: rolls.length, successCount: results.length, errorCount: errors.length, results, errors };
  }

  // ─── Read ───────────────────────────────────────────────

  async findAll(user: AuthenticatedUser, query: QueryRollsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const where: Prisma.CarpetRollWhereInput = { tenantId: user.tenantId };

    if (query.search) {
      where.OR = [
        { rollNumber: { contains: query.search, mode: 'insensitive' } },
        { designCode: { contains: query.search, mode: 'insensitive' } },
        { rackNumber: { contains: query.search, mode: 'insensitive' } },
        { product: { name: { contains: query.search, mode: 'insensitive' } } },
        { variant: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    if (query.productId) where.productId = query.productId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.shopId) where.shopId = query.shopId;
    if (query.status) where.status = query.status;
    if (query.inStockOnly === 'true') {
      where.status = CarpetRollStatus.ACTIVE;
      where.remainingSqft = { gt: 0 };
    }
    if (query.lowFt != null) {
      where.status = CarpetRollStatus.ACTIVE;
      where.remainingLengthFt = { lte: query.lowFt };
      where.remainingSqft = { gt: 0 };
    }

    const [items, total] = await Promise.all([
      this.prisma.carpetRoll.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
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

    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Counts and stock value for the rolls page header, for one branch or all. */
  async stats(user: AuthenticatedUser, shopId?: string, lowFt = 10) {
    const base: Prisma.CarpetRollWhereInput = { tenantId: user.tenantId, ...(shopId && { shopId }) };
    const [active, byStatus, low, pieces] = await Promise.all([
      this.prisma.carpetRoll.findMany({
        where: { ...base, status: CarpetRollStatus.ACTIVE, remainingSqft: { gt: 0 } },
        select: { remainingSqft: true, remainingLengthFt: true, remainingLengthInch: true, costPerSqft: true, salePricePerSqft: true },
      }),
      this.prisma.carpetRoll.groupBy({ by: ['status'], where: base, _count: true }),
      this.prisma.carpetRoll.count({ where: { ...base, status: CarpetRollStatus.ACTIVE, remainingSqft: { gt: 0 }, remainingLengthFt: { lte: lowFt } } }),
      this.prisma.carpetCutPiece.aggregate({
        where: { tenantId: user.tenantId, ...(shopId && { shopId }), status: 'AVAILABLE' },
        _count: true, _sum: { totalSqft: true, costAmount: true },
      }),
    ]);
    const count = (s: CarpetRollStatus) => byStatus.find((b) => b.status === s)?._count ?? 0;
    return {
      counts: {
        all: byStatus.reduce((s, b) => s + b._count, 0),
        active: count('ACTIVE'),
        reserved: count('RESERVED'),
        finished: count('FINISHED'),
        damaged: count('DAMAGED'),
        transferred: count('TRANSFERRED'),
        low,
      },
      inStockRolls: active.length,
      sqft: r2(active.reduce((s, r) => s + Number(r.remainingSqft), 0)),
      lengthFt: r2(active.reduce((s, r) => s + realFt(r.remainingLengthFt, r.remainingLengthInch), 0)),
      costValue: r2(active.reduce((s, r) => s + Number(r.remainingSqft) * Number(r.costPerSqft), 0)),
      saleValue: r2(active.reduce((s, r) => s + Number(r.remainingSqft) * Number(r.salePricePerSqft), 0)),
      pieces: { count: pieces._count, sqft: r2(Number(pieces._sum.totalSqft ?? 0)), cost: r2(Number(pieces._sum.costAmount ?? 0)) },
    };
  }

  async summary(user: AuthenticatedUser, shopId?: string) {
    const rolls = await this.prisma.carpetRoll.findMany({
      where: { tenantId: user.tenantId, status: CarpetRollStatus.ACTIVE, remainingSqft: { gt: 0 }, ...(shopId && { shopId }) },
      select: {
        productId: true, variantId: true, remainingLengthFt: true, remainingLengthInch: true, remainingSqft: true,
        product: { select: { name: true } }, variant: { select: { name: true, color: true } },
      },
    });
    const grouped: Record<string, any> = {};
    for (const r of rolls) {
      const key = `${r.productId}:${r.variantId ?? 'none'}`;
      grouped[key] ??= {
        productId: r.productId, variantId: r.variantId, productName: r.product.name,
        variantName: r.variant?.name ?? null, variantColor: r.variant?.color ?? null,
        totalSqft: 0, totalLengthFt: 0, rollCount: 0,
      };
      grouped[key].totalSqft = r2(grouped[key].totalSqft + Number(r.remainingSqft));
      grouped[key].totalLengthFt = r2(grouped[key].totalLengthFt + realFt(r.remainingLengthFt, r.remainingLengthInch));
      grouped[key].rollCount += 1;
    }
    return Object.values(grouped).sort((a: any, b: any) => b.totalSqft - a.totalSqft);
  }

  async lowRemaining(user: AuthenticatedUser, thresholdFt = 10) {
    return this.prisma.carpetRoll.findMany({
      where: { tenantId: user.tenantId, status: CarpetRollStatus.ACTIVE, remainingSqft: { gt: 0 }, remainingLengthFt: { lte: thresholdFt } },
      orderBy: { remainingLengthFt: 'asc' },
      include: {
        product: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true, color: true } },
        shop: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const roll = await this.prisma.carpetRoll.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        variant: true,
        shop: { select: { id: true, name: true } },
        cutPieces: { orderBy: { createdAt: 'desc' } },
        movements: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!roll) throw new NotFoundException('Roll nahi mila');
    return roll;
  }

  // ─── Edit ───────────────────────────────────────────────

  /**
   * Details and rates. Size can be corrected only while nothing has been cut;
   * length changes after that go through adjust, so each one is recorded.
   */
  async update(user: AuthenticatedUser, id: string, dto: UpdateCarpetRollDto) {
    const existing = await this.findOne(user, id);
    if (dto.productId && dto.productId !== existing.productId) throw new BadRequestException('Roll ka product badla nahi ja sakta');
    if (dto.shopId && dto.shopId !== existing.shopId) throw new BadRequestException('Doosri branch me bhejne ke liye Transfer karein');

    if (dto.rollNumber && dto.rollNumber !== existing.rollNumber) {
      const exists = await this.prisma.carpetRoll.findFirst({ where: { tenantId: user.tenantId, rollNumber: dto.rollNumber, NOT: { id } } });
      if (exists) throw new ConflictException('Ye roll number pehle se hai');
    }

    const sizeChange = ['widthFt', 'widthInch', 'originalLengthFt', 'originalLengthInch', 'remainingLengthFt', 'remainingLengthInch']
      .some((k) => (dto as any)[k] != null && Number((dto as any)[k]) !== Number((existing as any)[k]));
    const usedMoves = existing.movements.filter((m) => m.type !== 'OPENING').length;
    if (sizeChange && usedMoves > 0) {
      throw new BadRequestException('Is roll se kaata ja chuka hai — size ab nahi badal sakta. Lambai ke liye "Adjust" karein');
    }

    if (dto.status && dto.status !== existing.status) {
      const allowed = new Set<CarpetRollStatus>([CarpetRollStatus.ACTIVE, CarpetRollStatus.RESERVED]);
      if (!allowed.has(dto.status) || !(allowed.has(existing.status) || existing.status === CarpetRollStatus.DAMAGED)) {
        throw new BadRequestException('Status yahan se sirf Active / Reserved hota hai');
      }
    }
    if (dto.variantId && dto.variantId !== existing.variantId) {
      const v = await this.prisma.productVariant.findFirst({ where: { id: dto.variantId, productId: existing.productId } });
      if (!v) throw new NotFoundException('Rang / design nahi mila');
    }

    const widthFt = dto.widthFt ?? existing.widthFt;
    const widthInch = dto.widthInch ?? existing.widthInch;
    const originalLengthFt = dto.originalLengthFt ?? existing.originalLengthFt;
    const originalLengthInch = dto.originalLengthInch ?? existing.originalLengthInch;
    // Before any cut the roll is whole: the remaining length follows the original.
    const remainingLengthFt = sizeChange ? (dto.remainingLengthFt ?? originalLengthFt) : existing.remainingLengthFt;
    const remainingLengthInch = sizeChange ? (dto.remainingLengthInch ?? originalLengthInch) : existing.remainingLengthInch;
    if (realFt(originalLengthFt, originalLengthInch) <= 0) throw new BadRequestException('Roll ki lambai likhein');

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.carpetRoll.update({
        where: { id },
        data: {
          rollNumber: dto.rollNumber,
          designCode: dto.designCode,
          variantId: dto.variantId,
          widthFt, widthInch, originalLengthFt, originalLengthInch, remainingLengthFt, remainingLengthInch,
          originalSqft: calcSqft(widthFt, widthInch, originalLengthFt, originalLengthInch),
          remainingSqft: calcSqft(widthFt, widthInch, remainingLengthFt, remainingLengthInch),
          costPerSqft: dto.costPerSqft,
          salePricePerSqft: dto.salePricePerSqft,
          wholesalePricePerSqft: dto.wholesalePricePerSqft,
          supplierId: dto.supplierId,
          rackNumber: dto.rackNumber,
          notes: dto.notes,
          quality: dto.quality,
          pile: dto.pile,
          status: dto.status,
        },
      });
      if (sizeChange) {
        const remaining = realFt(remainingLengthFt, remainingLengthInch);
        await tx.carpetRollMovement.updateMany({
          where: { rollId: id, type: 'OPENING' },
          data: { lengthFt: remaining, sqft: updated.remainingSqft, balanceLengthAfter: remaining, balanceSqftAfter: updated.remainingSqft },
        });
      }
      await this.sync(tx, updated);
      if (existing.variantId !== updated.variantId) await this.sync(tx, existing);
    });

    return this.findOne(user, id);
  }

  // ─── Stock moves ────────────────────────────────────────

  async cut(user: AuthenticatedUser, id: string, dto: CutRollDto) {
    const roll = await this.prisma.carpetRoll.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!roll) throw new NotFoundException('Roll nahi mila');
    return this.prisma.$transaction((tx) => cutRoll(tx, user.id, roll, dto));
  }

  async adjust(user: AuthenticatedUser, id: string, dto: AdjustRollDto) {
    const roll = await this.findOne(user, id);
    if (roll.status === CarpetRollStatus.TRANSFERRED) throw new BadRequestException('Transfer hua roll adjust nahi hota');

    // The sign of the feet (or of the inches when feet are 0) applies to the whole change: -5ft 6in is -5.5ft.
    const inch = Number(dto.lengthDeltaInch || 0);
    const sign = dto.lengthDeltaFt < 0 || (dto.lengthDeltaFt === 0 && inch < 0) ? -1 : 1;
    if (Math.abs(inch) >= 12) throw new BadRequestException('Inch 12 se kam likhein');
    const delta = sign * realFt(Math.abs(dto.lengthDeltaFt), Math.abs(inch));
    if (Math.abs(delta) < 0.001) throw new BadRequestException('Kitni lambai kam / zyada karni hai likhein');
    const current = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
    const next = current + delta;
    if (next < -0.001) throw new BadRequestException('Itni lambai roll me nahi hai');

    const rest = splitFt(next);
    const newSqft = calcSqft(roll.widthFt, roll.widthInch, rest.ft, rest.inch);
    const deltaSqft = r2(newSqft - Number(roll.remainingSqft));

    await this.prisma.$transaction(async (tx) => {
      const status = next <= 0.01
        ? CarpetRollStatus.FINISHED
        : roll.status === CarpetRollStatus.FINISHED ? CarpetRollStatus.ACTIVE : undefined;
      const updated = await tx.carpetRoll.update({
        where: { id },
        data: {
          remainingLengthFt: rest.ft,
          remainingLengthInch: rest.inch,
          remainingSqft: newSqft,
          ...(status && { status, finishedAt: status === CarpetRollStatus.FINISHED ? new Date() : null }),
        },
      });
      await tx.carpetRollMovement.create({
        data: {
          rollId: id, tenantId: user.tenantId, type: 'ADJUSTMENT',
          lengthFt: delta, sqft: deltaSqft, balanceLengthAfter: next, balanceSqftAfter: newSqft,
          note: `${dto.reason}${dto.note ? ` — ${dto.note}` : ''}`, createdById: user.id,
        },
      });
      await this.sync(tx, updated);
    });

    return this.findOne(user, id);
  }

  async markDamaged(user: AuthenticatedUser, id: string, reason?: string) {
    const roll = await this.findOne(user, id);
    if (roll.status !== CarpetRollStatus.ACTIVE && roll.status !== CarpetRollStatus.RESERVED) {
      throw new BadRequestException('Sirf chalu roll damage mark hota hai');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.carpetRoll.update({ where: { id }, data: { status: CarpetRollStatus.DAMAGED } });
      await tx.carpetRollMovement.create({
        data: {
          rollId: id, tenantId: user.tenantId, type: 'DAMAGE', lengthFt: 0, sqft: 0,
          balanceLengthAfter: realFt(roll.remainingLengthFt, roll.remainingLengthInch), balanceSqftAfter: roll.remainingSqft,
          note: reason?.trim() || 'Damage mark kiya', createdById: user.id,
        },
      });
      await this.sync(tx, roll);
    });
    return this.findOne(user, id);
  }

  /** Closes a roll. Any length still on it is written off as waste, with a movement. */
  async markFinished(user: AuthenticatedUser, id: string, reason?: string) {
    const roll = await this.findOne(user, id);
    if (roll.status === CarpetRollStatus.FINISHED || roll.status === CarpetRollStatus.TRANSFERRED) {
      throw new BadRequestException(`Roll pehle se ${roll.status === 'FINISHED' ? 'khatam' : 'transfer'} hai`);
    }
    return this.prisma.$transaction(async (tx) => {
      const left = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
      const updated = await tx.carpetRoll.update({
        where: { id },
        data: { status: CarpetRollStatus.FINISHED, finishedAt: new Date(), remainingLengthFt: 0, remainingLengthInch: 0, remainingSqft: 0 },
      });
      if (left > 0.001) {
        await tx.carpetRollMovement.create({
          data: {
            rollId: id, tenantId: user.tenantId, type: 'WASTE', lengthFt: -left, sqft: -Number(roll.remainingSqft),
            balanceLengthAfter: 0, balanceSqftAfter: 0, note: reason?.trim() || 'Roll khatam — bacha hissa waste', createdById: user.id,
          },
        });
      }
      await this.sync(tx, roll);
      return updated;
    });
  }

  /**
   * A roll entered by mistake is closed, never deleted: its length leaves
   * stock with a REMOVED movement and its history stays.
   */
  async remove(user: AuthenticatedUser, id: string) {
    const roll = await this.findOne(user, id);
    const salesCount = roll.movements.filter((m) => m.type === 'CUT_FOR_SALE').length;
    if (roll.status === CarpetRollStatus.FINISHED) {
      return { message: 'Roll pehle se band hai', softDeleted: true, salesCount };
    }
    await this.prisma.$transaction(async (tx) => {
      const left = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
      await tx.carpetRoll.update({
        where: { id },
        data: { status: CarpetRollStatus.FINISHED, finishedAt: new Date(), remainingLengthFt: 0, remainingLengthInch: 0, remainingSqft: 0 },
      });
      await tx.carpetRollMovement.create({
        data: {
          rollId: id, tenantId: user.tenantId, type: 'REMOVED', lengthFt: -left, sqft: -Number(roll.remainingSqft),
          balanceLengthAfter: 0, balanceSqftAfter: 0, note: 'Roll stock se hataya', createdById: user.id,
        },
      });
      await this.sync(tx, roll);
    });
    return { message: 'Roll stock se hata diya (record baqi hai)', softDeleted: true, salesCount };
  }

  // ─── Bulk import ────────────────────────────────────────

  /** Checks import rows against products, variants and existing roll numbers. */
  async bulkImportPreview(user: AuthenticatedUser, rows: BulkImportRollRow[], shopId?: string) {
    if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException(`Ek dafa me ${MAX_IMPORT_ROWS} rolls tak`);
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true, unit: { in: ROLL_UNITS } },
      include: { variants: { where: { isActive: true } } },
    });
    const productMap = new Map(products.map((p) => [p.name.toLowerCase().trim(), p]));
    const existing = new Set((await this.prisma.carpetRoll.findMany({ where: { tenantId: user.tenantId }, select: { rollNumber: true } })).map((r) => r.rollNumber));
    const seen = new Set<string>();

    const previewRows = rows.map((row, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const product = productMap.get((row.productName || '').toLowerCase().trim());
      let variant: (typeof products)[number]['variants'][number] | null = null;
      if (!product) errors.push(`Product "${row.productName}" nahi mila (sqft, sq meter, sq gaz ya running ft / meter wala product chahiye)`);
      else if (row.variantName) {
        variant = product.variants.find((v) => v.name.toLowerCase().trim() === row.variantName!.toLowerCase().trim()) ?? null;
        if (!variant) errors.push(`"${row.variantName}" ${product.name} me nahi mila`);
      }
      const rn = row.rollNumber?.trim();
      if (rn && existing.has(rn)) errors.push(`Roll number "${rn}" pehle se hai`);
      if (rn && seen.has(rn)) errors.push(`Roll number "${rn}" file me do dafa hai`);
      if (rn) seen.add(rn);
      if (!(row.widthFt > 0)) errors.push('Chaurai (ft) likhein');
      if (!(realFt(row.lengthFt, row.lengthInch ?? 0) > 0)) errors.push('Lambai (ft) likhein');
      if ((row.widthInch ?? 0) >= 12 || (row.lengthInch ?? 0) >= 12) errors.push('Inch 12 se kam likhein');
      if (!(Number(row.costPerSqft) > 0)) warnings.push('Cost nahi likhi — 0 lagegi');
      if (!(Number(row.salePricePerSqft) > 0)) warnings.push('Sale rate nahi likha — 0 lagega');

      const totalSqft = calcSqft(row.widthFt || 0, row.widthInch ?? 0, row.lengthFt || 0, row.lengthInch ?? 0);
      return {
        index: idx + 1,
        productName: row.productName,
        variantName: row.variantName,
        productId: product?.id,
        variantId: variant?.id,
        rollNumber: rn || '(khud banega)',
        designCode: row.designCode,
        widthFt: row.widthFt,
        widthInch: row.widthInch ?? 0,
        lengthFt: row.lengthFt,
        lengthInch: row.lengthInch ?? 0,
        totalSqft,
        costPerSqft: row.costPerSqft ?? 0,
        salePricePerSqft: row.salePricePerSqft ?? 0,
        totalCost: r2(totalSqft * (row.costPerSqft ?? 0)),
        totalSaleValue: r2(totalSqft * (row.salePricePerSqft ?? 0)),
        rackNumber: row.rackNumber,
        notes: row.notes,
        quality: row.quality,
        pile: row.pile,
        valid: errors.length === 0,
        errors,
        warnings,
      };
    });

    const valid = previewRows.filter((r) => r.valid);
    return {
      shopId,
      totalRows: previewRows.length,
      validCount: valid.length,
      invalidCount: previewRows.length - valid.length,
      totalSqftToImport: r2(valid.reduce((s, r) => s + r.totalSqft, 0)),
      totalCostToImport: r2(valid.reduce((s, r) => s + r.totalCost, 0)),
      totalSaleValueToImport: r2(valid.reduce((s, r) => s + r.totalSaleValue, 0)),
      rows: previewRows,
    };
  }

  /** Creates opening rolls for checked rows; each row succeeds or fails on its own. */
  async bulkImportApply(user: AuthenticatedUser, rows: BulkImportApplyRow[], shopId?: string) {
    if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException(`Ek dafa me ${MAX_IMPORT_ROWS} rolls tak`);
    const results: Array<{ index: number; success: boolean; rollNumber?: string; error?: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const created = await this.create(user, {
          productId: row.productId,
          variantId: row.variantId,
          shopId,
          rollNumber: row.rollNumber && row.rollNumber !== '(khud banega)' ? row.rollNumber : undefined,
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
        results.push({ index: i + 1, success: true, rollNumber: created.rollNumber });
      } catch (err: any) {
        results.push({ index: i + 1, success: false, error: err?.message ?? 'Unknown error' });
      }
    }
    return {
      totalSubmitted: rows.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      results,
    };
  }

  // ─── Per-product totals (products list, POS) ────────────

  async productSummary(user: AuthenticatedUser, productIds?: string[]) {
    const ids = productIds?.length ? { productId: { in: productIds } } : {};
    const rolls = await this.prisma.carpetRoll.findMany({
      where: { tenantId: user.tenantId, status: CarpetRollStatus.ACTIVE, remainingSqft: { gt: 0 }, ...ids },
      select: { productId: true, remainingLengthFt: true, remainingLengthInch: true, remainingSqft: true, salePricePerSqft: true },
    });
    const grouped = new Map<string, { productId: string; totalSqft: number; totalLengthFt: number; rollCount: number; sum: number; minSalePrice: number; maxSalePrice: number }>();
    for (const r of rolls) {
      const g = grouped.get(r.productId) ?? { productId: r.productId, totalSqft: 0, totalLengthFt: 0, rollCount: 0, sum: 0, minSalePrice: Number.MAX_VALUE, maxSalePrice: 0 };
      g.totalSqft += Number(r.remainingSqft);
      g.totalLengthFt += realFt(r.remainingLengthFt, r.remainingLengthInch);
      g.rollCount += 1;
      g.sum += Number(r.salePricePerSqft);
      g.minSalePrice = Math.min(g.minSalePrice, Number(r.salePricePerSqft));
      g.maxSalePrice = Math.max(g.maxSalePrice, Number(r.salePricePerSqft));
      grouped.set(r.productId, g);
    }
    const pieces = await this.prisma.carpetCutPiece.groupBy({
      by: ['productId'],
      where: { tenantId: user.tenantId, status: 'AVAILABLE', ...ids },
      _count: true,
      _sum: { totalSqft: true },
    });
    const pieceMap = new Map(pieces.map((p) => [p.productId, { count: p._count, sqft: Number(p._sum.totalSqft ?? 0) }]));
    // Products with only remnants left still show up.
    for (const p of pieces) {
      if (!grouped.has(p.productId)) grouped.set(p.productId, { productId: p.productId, totalSqft: 0, totalLengthFt: 0, rollCount: 0, sum: 0, minSalePrice: 0, maxSalePrice: 0 });
    }
    return [...grouped.values()].map(({ sum, ...g }) => ({
      ...g,
      totalSqft: r2(g.totalSqft),
      totalLengthFt: r2(g.totalLengthFt),
      avgSalePrice: g.rollCount > 0 ? r2(sum / g.rollCount) : 0,
      minSalePrice: g.minSalePrice === Number.MAX_VALUE ? 0 : g.minSalePrice,
      cutPiecesCount: pieceMap.get(g.productId)?.count ?? 0,
      cutPiecesSqft: r2(pieceMap.get(g.productId)?.sqft ?? 0),
    }));
  }
}
