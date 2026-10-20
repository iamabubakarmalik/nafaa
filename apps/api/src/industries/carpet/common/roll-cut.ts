/**
 * Cutting a length off a roll, used by the roll page and by bill settlement.
 *
 * A roll is cut across its full width. When the customer takes less than
 * the full width, the strip beside the cut becomes a LEFTOVER cut piece
 * (cost at the roll's rate, priced at 80% of the roll rate) unless the
 * counter marked it as waste.
 */

import { BadRequestException } from '@nestjs/common';
import { CarpetRoll, CarpetRollStatus, Prisma } from '@prisma/client';
import { nextCode } from './next-code';
import { calcSqft, codeYear, r2, realFt, splitFt, syncCarpetStock } from './carpet-stock';

type Db = Prisma.TransactionClient;

export async function nextPieceCode(db: Db, tenantId: string): Promise<string> {
  return nextCode(async (prefix) => (await db.carpetCutPiece.findMany({
    where: { tenantId, pieceCode: { startsWith: prefix } },
    select: { pieceCode: true }, orderBy: { createdAt: 'desc' }, take: 500,
  })).map((p) => p.pieceCode), `CP-${codeYear()}-`);
}

export interface CutInput {
  lengthFt: number;
  lengthInch?: number;
  /** Width the customer takes; the full roll width when left out. */
  customerWidthFt?: number;
  createLeftoverPiece?: boolean;
  saleId?: string;
  saleItemId?: string;
  note?: string;
}

export async function cutRoll(db: Db, userId: string, roll: CarpetRoll, input: CutInput) {
  if (roll.status !== CarpetRollStatus.ACTIVE && roll.status !== CarpetRollStatus.RESERVED) {
    throw new BadRequestException(`Roll ${roll.rollNumber} ${roll.status} hai, is se kaata nahi ja sakta`);
  }
  const lengthInch = Number(input.lengthInch ?? 0);
  if (lengthInch >= 12) throw new BadRequestException('Inch 12 se kam likhein');
  const cutLength = realFt(input.lengthFt, lengthInch);
  if (cutLength <= 0) throw new BadRequestException('Kitni lambai kaatni hai likhein');

  const available = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
  if (cutLength > available + 0.001) {
    throw new BadRequestException(
      `Roll ${roll.rollNumber} me sirf ${roll.remainingLengthFt}ft ${roll.remainingLengthInch}in bacha hai, ${input.lengthFt}ft ${lengthInch}in nahi kat sakta`,
    );
  }
  const fullWidth = realFt(roll.widthFt, roll.widthInch);
  const customerWidth = input.customerWidthFt ?? fullWidth;
  if (customerWidth > fullWidth + 0.001) {
    throw new BadRequestException(`Customer ki chaurai ${customerWidth}ft roll ki chaurai ${r2(fullWidth)}ft se zyada hai`);
  }

  const cutSqft = calcSqft(roll.widthFt, roll.widthInch, input.lengthFt, lengthInch);
  const left = Math.max(available - cutLength, 0);
  const rest = splitFt(left);
  const remainingSqft = calcSqft(roll.widthFt, roll.widthInch, rest.ft, rest.inch);
  const finished = left <= 0.01;

  const updated = await db.carpetRoll.update({
    where: { id: roll.id },
    data: {
      remainingLengthFt: rest.ft,
      remainingLengthInch: rest.inch,
      remainingSqft,
      ...(finished ? { status: CarpetRollStatus.FINISHED, finishedAt: new Date() } : {}),
    },
  });

  await db.carpetRollMovement.create({
    data: {
      rollId: roll.id,
      tenantId: roll.tenantId,
      type: 'CUT_FOR_SALE',
      lengthFt: -cutLength,
      sqft: -cutSqft,
      balanceLengthAfter: left,
      balanceSqftAfter: remainingSqft,
      reference: input.saleId,
      saleId: input.saleId,
      saleItemId: input.saleItemId,
      note: input.note ?? `Cut ${input.lengthFt}ft${lengthInch ? ` ${lengthInch}in` : ''} × ${r2(customerWidth)}ft`,
      createdById: userId,
    },
  });

  let leftoverPiece = null;
  const widthDiff = r2(fullWidth - customerWidth);
  if ((input.createLeftoverPiece ?? true) && widthDiff > 0.1) {
    const w = splitFt(widthDiff);
    const leftoverSqft = r2(widthDiff * cutLength);
    leftoverPiece = await db.carpetCutPiece.create({
      data: {
        tenantId: roll.tenantId,
        shopId: roll.shopId,
        productId: roll.productId,
        variantId: roll.variantId,
        sourceRollId: roll.id,
        sourceType: 'LEFTOVER',
        pieceCode: await nextPieceCode(db, roll.tenantId),
        widthFt: w.ft,
        widthInch: w.inch,
        lengthFt: input.lengthFt,
        lengthInch,
        totalSqft: leftoverSqft,
        costAmount: r2(Number(roll.costPerSqft) * leftoverSqft),
        salePrice: r2(Number(roll.salePricePerSqft) * leftoverSqft * 0.8),
        condition: 'Good',
        notes: `Roll ${roll.rollNumber} ka bacha tukra`,
        createdById: userId,
      },
    });
  }

  await syncCarpetStock(db, roll.tenantId, roll.shopId, roll.productId, roll.variantId ?? null);

  return {
    success: true,
    cutLengthFt: input.lengthFt,
    cutLengthInch: lengthInch,
    cutLengthReal: cutLength,
    cutSqft,
    remainingLengthFt: rest.ft,
    remainingLengthInch: rest.inch,
    remainingSqft,
    rollStatus: updated.status,
    leftoverPiece,
  };
}
