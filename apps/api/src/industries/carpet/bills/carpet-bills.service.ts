/**
 * Carpet lines on bills.
 *
 * The counter writes each roll cut or piece sale as a bill line whose note
 * names the roll and size ("Cut from CR-2026-0003: 9ft × 12ft = 108.00 sqft")
 * or the piece ("Cut piece CP-2026-0011 • 4ft × 6ft"). The shared sale takes
 * no shelf stock for these lines; settling the bill does the stock work:
 *
 * - Roll line: the length is cut off the roll (leftover strip kept as a
 *   piece unless marked waste) and the line's cost becomes the roll's real
 *   cost for what left the roll.
 * - Piece line: the piece is marked sold and the line's cost becomes the
 *   piece's cost.
 *
 * Settling is safe to repeat (a line already cut or sold is skipped), so the
 * POS settles right after the bill and the rolls page settles bills that
 * were made offline or from bookings.
 *
 * A voided bill gives the stock back: a roll line goes back onto its roll
 * (or becomes a returned piece when a leftover strip was already made), a
 * piece goes back on sale. After a return the shelf stock mirror is rebuilt.
 */

import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { CarpetCutPieceStatus, CarpetRollStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { calcSqft, parseCarpetNote, r2, realFt, splitFt, syncCarpetStock } from '../common/carpet-stock';
import { cutRoll, nextPieceCode } from '../common/roll-cut';

type Db = Prisma.TransactionClient;

const CARPET_NOTE: Prisma.SaleItemWhereInput[] = [{ note: { startsWith: 'Cut from ' } }, { note: { startsWith: 'Cut piece ' } }];
const LEFTOVER_TAG = /· tukra (\S+)$/;

export interface LineResult { saleItemId: string; note: string; ok: boolean; message: string }

@Injectable()
export class CarpetBillsService implements OnModuleInit {
  private readonly log = new Logger(CarpetBillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handleVoid(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided carpet bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn((tenantId, saleId) => this.handleReturn(tenantId, saleId).catch((e) => {
      this.log.warn(`Returned carpet bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  // ─── Settle a bill ──────────────────────────────────────

  async settle(user: AuthenticatedUser, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId: user.tenantId },
      select: {
        id: true, tenantId: true, saleNumber: true, shopId: true, status: true,
        items: { where: { OR: CARPET_NOTE }, select: { id: true, productId: true, quantity: true, returnedQty: true, costPrice: true, note: true } },
      },
    });
    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (sale.status === 'VOIDED') return { saleId: sale.id, saleNumber: sale.saleNumber, settled: 0, skipped: 0, lines: [] as LineResult[] };

    const lines: LineResult[] = [];
    let settled = 0;
    let skipped = 0;
    for (const item of sale.items) {
      const note = item.note ?? '';
      // A line returned in full has nothing left to take from stock.
      if (item.returnedQty >= item.quantity - 0.01) { skipped += 1; continue; }
      try {
        const done = await this.prisma.$transaction((tx) => this.settleLine(tx, user.id, sale, item));
        if (done) { settled += 1; lines.push({ saleItemId: item.id, note, ok: true, message: done }); } else skipped += 1;
      } catch (e) {
        lines.push({ saleItemId: item.id, note, ok: false, message: (e as Error).message });
      }
    }
    return { saleId: sale.id, saleNumber: sale.saleNumber, settled, skipped, lines };
  }

  /** Returns a short message when the line was settled now, or null when it already was. */
  private async settleLine(
    tx: Db,
    userId: string,
    sale: { id: string; tenantId: string; saleNumber: string; shopId: string | null },
    item: { id: string; productId: string | null; quantity: number; costPrice: number; note: string | null },
  ): Promise<string | null> {
    const parsed = parseCarpetNote(item.note);
    if (!parsed) return null;

    if (parsed.kind === 'roll') {
      const done = await tx.carpetRollMovement.findFirst({ where: { saleItemId: item.id, type: 'CUT_FOR_SALE' }, select: { id: true } });
      if (done) return null;
      const roll = await tx.carpetRoll.findFirst({ where: { tenantId: sale.tenantId, rollNumber: parsed.rollNumber } });
      if (!roll) throw new BadRequestException(`Roll ${parsed.rollNumber} nahi mila`);
      if (roll.productId !== item.productId) throw new BadRequestException(`Roll ${roll.rollNumber} is bill line ke product ka nahi`);
      if (sale.shopId && roll.shopId && roll.shopId !== sale.shopId) throw new BadRequestException(`Roll ${roll.rollNumber} doosri branch me hai`);

      const res = await cutRoll(tx, userId, roll, {
        lengthFt: parsed.lengthFt,
        lengthInch: parsed.lengthInch,
        customerWidthFt: Math.min(parsed.widthReal, realFt(roll.widthFt, roll.widthInch)),
        createLeftoverPiece: parsed.keepLeftover,
        saleId: sale.id,
        saleItemId: item.id,
        note: `Bill ${sale.saleNumber}${parsed.keepLeftover ? '' : ' · bacha tukra waste'}`,
      });
      if (res.leftoverPiece) {
        await tx.carpetRollMovement.updateMany({
          where: { saleItemId: item.id, type: 'CUT_FOR_SALE' },
          data: { note: `Bill ${sale.saleNumber} · tukra ${res.leftoverPiece.pieceCode}` },
        });
      }
      // What left the roll for this customer: the full cut, less any strip kept as a piece.
      const keptSqft = res.leftoverPiece ? Number(res.leftoverPiece.totalSqft) : 0;
      const usedCost = Number(roll.costPerSqft) * Math.max(res.cutSqft - keptSqft, 0);
      await this.setLineCost(tx, sale.id, item, usedCost);
      return `${roll.rollNumber} se ${res.cutLengthFt}ft${res.cutLengthInch ? ` ${res.cutLengthInch}in` : ''} kata`;
    }

    const piece = await tx.carpetCutPiece.findFirst({ where: { tenantId: sale.tenantId, pieceCode: parsed.pieceCode } });
    if (!piece) throw new BadRequestException(`Piece ${parsed.pieceCode} nahi mila`);
    if (piece.saleItemId === item.id) return null;
    if (piece.productId !== item.productId) throw new BadRequestException(`Piece ${piece.pieceCode} is bill line ke product ka nahi`);
    if (piece.status !== CarpetCutPieceStatus.AVAILABLE && piece.status !== CarpetCutPieceStatus.RESERVED) {
      throw new BadRequestException(`Piece ${piece.pieceCode} ${piece.status === 'SOLD' ? 'pehle hi bik chuka' : 'damage'} hai`);
    }
    if (sale.shopId && piece.shopId && piece.shopId !== sale.shopId) throw new BadRequestException(`Piece ${piece.pieceCode} doosri branch me hai`);
    await tx.carpetCutPiece.update({
      where: { id: piece.id },
      data: { status: CarpetCutPieceStatus.SOLD, saleItemId: item.id, soldAt: new Date() },
    });
    await syncCarpetStock(tx, piece.tenantId, piece.shopId, piece.productId, piece.variantId ?? null);
    await this.setLineCost(tx, sale.id, item, Number(piece.costAmount));
    return `Piece ${piece.pieceCode} bika`;
  }

  /** Puts the real carpet cost on the line and moves the bill's cost by the same difference. */
  private async setLineCost(tx: Db, saleId: string, item: { id: string; quantity: number; costPrice: number }, lineCost: number) {
    if (!(lineCost > 0) || !(item.quantity > 0)) return;
    const unit = r2(lineCost / item.quantity);
    const diff = r2((unit - Number(item.costPrice)) * item.quantity);
    if (Math.abs(diff) < 0.01) return;
    await tx.saleItem.update({ where: { id: item.id }, data: { costPrice: unit } });
    const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { costOfGoods: true } });
    await tx.sale.update({ where: { id: saleId }, data: { costOfGoods: r2(Number(sale?.costOfGoods ?? 0) + diff) } });
  }

  /** Bills with carpet lines that are not cut or sold from stock yet (offline bills, bookings). */
  async unsettled(user: AuthenticatedUser, shopId?: string) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        OR: CARPET_NOTE,
        sale: { tenantId: user.tenantId, status: { not: 'VOIDED' }, ...(shopId && { shopId }) },
      },
      orderBy: { sale: { createdAt: 'desc' } },
      take: 500,
      select: { id: true, note: true, quantity: true, returnedQty: true, total: true, sale: { select: { id: true, saleNumber: true, createdAt: true, customer: { select: { name: true } } } } },
    });
    if (!items.length) return [];
    const ids = items.map((i) => i.id);
    const [moves, pieces] = await Promise.all([
      this.prisma.carpetRollMovement.findMany({ where: { saleItemId: { in: ids }, type: 'CUT_FOR_SALE' }, select: { saleItemId: true } }),
      this.prisma.carpetCutPiece.findMany({ where: { tenantId: user.tenantId, saleItemId: { in: ids } }, select: { saleItemId: true } }),
    ]);
    const done = new Set([...moves, ...pieces].map((x) => x.saleItemId));
    const bySale = new Map<string, { saleId: string; saleNumber: string; createdAt: Date; customerName: string | null; lines: Array<{ saleItemId: string; note: string; quantity: number; total: number }> }>();
    for (const i of items) {
      if (done.has(i.id) || i.returnedQty >= i.quantity - 0.01) continue;
      const row = bySale.get(i.sale.id) ?? { saleId: i.sale.id, saleNumber: i.sale.saleNumber, createdAt: i.sale.createdAt, customerName: i.sale.customer?.name ?? null, lines: [] };
      row.lines.push({ saleItemId: i.id, note: i.note ?? '', quantity: i.quantity, total: i.total });
      bySale.set(i.sale.id, row);
    }
    return [...bySale.values()];
  }

  /** Carpet lines of the given bills with whether each is already cut / sold from stock (sales history chips). */
  async lines(user: AuthenticatedUser, saleIds: string[]) {
    if (!saleIds.length) return {};
    const items = await this.prisma.saleItem.findMany({
      where: { saleId: { in: saleIds.slice(0, 200) }, OR: CARPET_NOTE, sale: { tenantId: user.tenantId } },
      select: { id: true, saleId: true, note: true, quantity: true, returnedQty: true },
    });
    const ids = items.map((i) => i.id);
    const [moves, pieces] = await Promise.all([
      this.prisma.carpetRollMovement.findMany({ where: { saleItemId: { in: ids }, type: 'CUT_FOR_SALE' }, select: { saleItemId: true } }),
      this.prisma.carpetCutPiece.findMany({ where: { tenantId: user.tenantId, saleItemId: { in: ids } }, select: { saleItemId: true } }),
    ]);
    const done = new Set([...moves, ...pieces].map((x) => x.saleItemId));
    const out: Record<string, Array<{ saleItemId: string; note: string; quantity: number; settled: boolean }>> = {};
    for (const i of items) (out[i.saleId] ??= []).push({ saleItemId: i.id, note: i.note ?? '', quantity: i.quantity, settled: done.has(i.id) || i.returnedQty >= i.quantity - 0.01 });
    return out;
  }

  // ─── Void and return ────────────────────────────────────

  async handleVoid(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId, status: 'VOIDED' },
      select: { id: true, saleNumber: true, items: { where: { OR: CARPET_NOTE }, select: { id: true, note: true, quantity: true, costPrice: true } } },
    });
    if (!sale?.items.length) return;
    for (const item of sale.items) {
      await this.prisma.$transaction((tx) => this.giveBack(tx, tenantId, sale.saleNumber, item));
    }
  }

  private async giveBack(tx: Db, tenantId: string, saleNumber: string, item: { id: string; note: string | null; quantity: number; costPrice: number }) {
    const parsed = parseCarpetNote(item.note);
    if (!parsed) return;

    if (parsed.kind === 'piece') {
      const piece = await tx.carpetCutPiece.findFirst({ where: { tenantId, saleItemId: item.id, status: CarpetCutPieceStatus.SOLD } });
      if (!piece) return;
      await tx.carpetCutPiece.update({
        where: { id: piece.id },
        data: { status: CarpetCutPieceStatus.AVAILABLE, saleItemId: null, soldAt: null, notes: [piece.notes, `Bill ${saleNumber} void — wapas stock me`].filter(Boolean).join(' — ') },
      });
      await syncCarpetStock(tx, tenantId, piece.shopId, piece.productId, piece.variantId ?? null);
      return;
    }

    const cut = await tx.carpetRollMovement.findFirst({ where: { tenantId, saleItemId: item.id, type: 'CUT_FOR_SALE' }, include: { roll: true } });
    if (!cut) return;
    const already = await tx.carpetRollMovement.findFirst({ where: { tenantId, saleItemId: item.id, type: 'VOID_RETURN' }, select: { id: true } });
    if (already) return;
    const roll = cut.roll;
    const cutLength = Math.abs(cut.lengthFt);
    const leftoverCode = LEFTOVER_TAG.exec(cut.note ?? '')?.[1];
    const rollOpen = roll.status === CarpetRollStatus.ACTIVE || roll.status === CarpetRollStatus.RESERVED || roll.status === CarpetRollStatus.FINISHED;

    if (!leftoverCode && rollOpen) {
      // Nothing was split off: the length goes back onto the roll.
      const back = realFt(roll.remainingLengthFt, roll.remainingLengthInch) + cutLength;
      const rest = splitFt(back);
      const sqft = calcSqft(roll.widthFt, roll.widthInch, rest.ft, rest.inch);
      const updated = await tx.carpetRoll.update({
        where: { id: roll.id },
        data: {
          remainingLengthFt: rest.ft, remainingLengthInch: rest.inch, remainingSqft: sqft,
          ...(roll.status === CarpetRollStatus.FINISHED && { status: CarpetRollStatus.ACTIVE, finishedAt: null }),
        },
      });
      await tx.carpetRollMovement.create({
        data: {
          rollId: roll.id, tenantId, type: 'VOID_RETURN', lengthFt: cutLength, sqft: Math.abs(cut.sqft),
          balanceLengthAfter: back, balanceSqftAfter: sqft, reference: cut.saleId, saleId: cut.saleId, saleItemId: item.id,
          note: `Bill ${saleNumber} void — lambai roll me wapas`,
        },
      });
      await syncCarpetStock(tx, tenantId, updated.shopId, updated.productId, updated.variantId ?? null);
      return;
    }

    // A strip was already split off (or the roll is closed): the customer's piece comes back as its own piece.
    const parsedWidth = Math.min(parsed.widthReal, realFt(roll.widthFt, roll.widthInch));
    const w = splitFt(parsedWidth);
    const totalSqft = r2(parsedWidth * cutLength);
    const piece = await tx.carpetCutPiece.create({
      data: {
        tenantId, shopId: roll.shopId, productId: roll.productId, variantId: roll.variantId, sourceRollId: roll.id,
        sourceType: 'CUSTOMER_RETURN', pieceCode: await nextPieceCode(tx, tenantId),
        widthFt: w.ft, widthInch: w.inch, lengthFt: parsed.lengthFt, lengthInch: parsed.lengthInch, totalSqft,
        costAmount: r2(Number(item.costPrice) * item.quantity),
        salePrice: r2(Number(roll.salePricePerSqft) * totalSqft),
        condition: 'Good', notes: `Bill ${saleNumber} void — roll ${roll.rollNumber} ka kata hissa`,
      },
    });
    await tx.carpetRollMovement.create({
      data: {
        rollId: roll.id, tenantId, type: 'VOID_RETURN', lengthFt: 0, sqft: 0,
        balanceLengthAfter: realFt(roll.remainingLengthFt, roll.remainingLengthInch), balanceSqftAfter: roll.remainingSqft,
        reference: cut.saleId, saleId: cut.saleId, saleItemId: item.id,
        note: `Bill ${saleNumber} void — kata hissa piece ${piece.pieceCode} bana`,
      },
    });
    await syncCarpetStock(tx, tenantId, roll.shopId, roll.productId, roll.variantId ?? null);
  }

  /**
   * After a return: a piece line returned in full goes back on sale, and the
   * shelf stock mirror of every carpet product on the bill is rebuilt (the
   * shared return may have added shelf stock for these lines).
   */
  async handleReturn(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      select: {
        saleNumber: true, shopId: true,
        items: { where: { OR: CARPET_NOTE }, select: { id: true, note: true, quantity: true, returnedQty: true, productId: true } },
      },
    });
    if (!sale?.items.length) return;
    await this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const parsed = parseCarpetNote(item.note);
        if (parsed?.kind !== 'piece' || item.returnedQty < item.quantity - 0.01) continue;
        const piece = await tx.carpetCutPiece.findFirst({ where: { tenantId, saleItemId: item.id, status: CarpetCutPieceStatus.SOLD } });
        if (!piece) continue;
        await tx.carpetCutPiece.update({
          where: { id: piece.id },
          data: { status: CarpetCutPieceStatus.AVAILABLE, saleItemId: null, soldAt: null, notes: [piece.notes, `Bill ${sale.saleNumber} se wapas aaya`].filter(Boolean).join(' — ') },
        });
      }
      // Every variant of each product in the branch, since a roll's variant is not on the bill line.
      const productIds = [...new Set(sale.items.map((i) => i.productId).filter((x): x is string => !!x))];
      const rows = sale.shopId ? await tx.shopStock.findMany({ where: { shopId: sale.shopId, productId: { in: productIds } }, select: { productId: true, variantId: true } }) : [];
      const keys = new Map<string, { productId: string; variantId: string | null }>();
      for (const p of productIds) keys.set(`${p}:`, { productId: p, variantId: null });
      for (const r of rows) keys.set(`${r.productId}:${r.variantId ?? ''}`, { productId: r.productId, variantId: r.variantId });
      for (const k of keys.values()) await syncCarpetStock(tx, tenantId, sale.shopId, k.productId, k.variantId);
    });
  }
}
