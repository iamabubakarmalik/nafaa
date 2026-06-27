import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateReturnDto } from './dto/create-return.dto';
import { NotificationsService } from '../notifications/notifications.service';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ════════════════════════════════════════════════════════
  // HELPER — Parse carpet roll info from sale item note
  // ════════════════════════════════════════════════════════

  private parseCarpetNote(note?: string | null): {
    isRollCut: boolean;
    isCutPiece: boolean;
    rollNumber?: string;
    pieceCode?: string;
    widthFt?: number;
    lengthFt?: number;
    lengthInch?: number;
  } {
    if (!note) return { isRollCut: false, isCutPiece: false };

    // "Cut from CR-2026-0001: 12ft x 10ft 6in = 120 sqft"
    const rollMatch = note.match(
      /Cut from ([\w-]+):\s*([\d.]+)\s*ft\s*[xX×]\s*([\d.]+)\s*ft(?:\s+([\d.]+)\s*in)?/,
    );
    if (rollMatch) {
      return {
        isRollCut: true,
        isCutPiece: false,
        rollNumber: rollMatch[1],
        widthFt: Number(rollMatch[2]),
        lengthFt: Number(rollMatch[3]),
        lengthInch: rollMatch[4] ? Number(rollMatch[4]) : 0,
      };
    }

    // "Cut piece CP-2026-0001 • 4ft x 6ft"
    const cutMatch = note.match(
      /Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+)\s*ft\s*[xX×]\s*([\d.]+)\s*ft)?/,
    );
    if (cutMatch) {
      return {
        isRollCut: false,
        isCutPiece: true,
        pieceCode: cutMatch[1],
        widthFt: cutMatch[2] ? Number(cutMatch[2]) : undefined,
        lengthFt: cutMatch[3] ? Number(cutMatch[3]) : undefined,
      };
    }

    return { isRollCut: false, isCutPiece: false };
  }

  // ════════════════════════════════════════════════════════
  // HELPER — Sync ShopStock for carpet items
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
        tenantId, shopId, productId, variantId,
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
        tenantId, shopId, productId, variantId,
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
          tenantId, shopId, productId, variantId,
          stock: grandTotal,
          isActive: true,
        },
      });
    }

    // Sync global stock
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
  // HELPER — Generate cut piece code
  // ════════════════════════════════════════════════════════

  private async generateCutPieceCode(tx: any, tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CP-${year}-`;
    const last = await tx.carpetCutPiece.findFirst({
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
  // CREATE RETURN
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateReturnDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, tenantId: user.tenantId },
      include: {
        items: { include: { product: true, variantLink: true } },
        customer: true,
      },
    });

    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'VOIDED') throw new BadRequestException('Sale is voided');
    if (sale.status === 'FULLY_RETURNED') {
      throw new BadRequestException('Already fully returned');
    }

    const itemMap = new Map(sale.items.map((i: any) => [i.id, i]));
    let refundAmount = 0;

    const normalizedItems = dto.items.map((item) => {
      const saleItem: any = itemMap.get(item.saleItemId);
      if (!saleItem) throw new NotFoundException('Sale item not found');

      const remaining = saleItem.quantity - saleItem.returnedQty;
      if (item.quantity > remaining + 0.001) {
        throw new BadRequestException(
          `Cannot return ${item.quantity}, only ${remaining} available for return`,
        );
      }

      const lineRefund = saleItem.price * item.quantity;
      refundAmount += lineRefund;

      const isCarpet = CARPET_UNITS.has(saleItem.product.unit);
      const carpetInfo = isCarpet ? this.parseCarpetNote(saleItem.note) : null;

      return {
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        variantId: saleItem.variantLink?.variantId ?? null,
        quantity: item.quantity,
        refundPrice: saleItem.price,
        total: lineRefund,
        // Carpet context
        isCarpet,
        carpetInfo,
        saleItemNote: saleItem.note,
        // User options
        createCutPiece: item.createCutPiece ?? true,
        cutPieceCondition: item.cutPieceCondition ?? 'Good',
        isDamaged: item.isDamaged ?? false,
        cutPieceWidthFt: item.cutPieceWidthFt,
        cutPieceLengthFt: item.cutPieceLengthFt,
        cutPieceNotes: item.cutPieceNotes,
      };
    });

    const returnNumber = `RET-${Date.now().toString().slice(-8)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.saleReturn.create({
        data: {
          tenantId: user.tenantId,
          saleId: sale.id,
          createdById: user.id,
          returnNumber,
          reason: dto.reason,
          notes: dto.notes,
          refundAmount,
          refundMethod: dto.refundMethod,
          items: {
            create: normalizedItems.map((i) => ({
              saleItemId: i.saleItemId,
              productId: i.productId,
              quantity: i.quantity,
              refundPrice: i.refundPrice,
              total: i.total,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          sale: { include: { customer: true } },
        },
      });

      const createdCutPieces: string[] = [];

      // Process each returned item
      for (const item of normalizedItems) {
        // Update sale item returnedQty
        await tx.saleItem.update({
          where: { id: item.saleItemId },
          data: { returnedQty: { increment: item.quantity } },
        });

        // ─── CARPET PATH ─────────────────────────────────────
        if (item.isCarpet && item.carpetInfo?.isRollCut && item.createCutPiece) {
          // Calculate cut piece dimensions
          const originalWidthFt = item.carpetInfo.widthFt ?? 0;
          const originalLengthFt = item.carpetInfo.lengthFt ?? 0;

          // Default width = original cut width
          const widthFt = item.cutPieceWidthFt ?? originalWidthFt;

          // Default length: derive from returned quantity (sqft) / width
          let lengthFt = item.cutPieceLengthFt;
          if (!lengthFt && widthFt > 0) {
            lengthFt = Number((item.quantity / widthFt).toFixed(2));
          }
          lengthFt = lengthFt ?? originalLengthFt;

          const totalSqft = Number((widthFt * lengthFt).toFixed(2));

          // Determine cost (from sale's cost record)
          const saleItemFull: any = itemMap.get(item.saleItemId);
          const costPerSqft = saleItemFull.costPrice && item.quantity > 0
            ? Number(saleItemFull.costPrice)
            : 0;
          const costAmount = Number((costPerSqft * totalSqft).toFixed(2));

          // Discount price for returned cut pieces (80% of original sale price)
          const salePrice = item.isDamaged
            ? 0
            : Number((item.refundPrice * 0.8).toFixed(2));

          const pieceCode = await this.generateCutPieceCode(tx, user.tenantId);

          const noteText = item.cutPieceNotes
            ?? `Returned from sale ${sale.saleNumber}${item.carpetInfo.rollNumber ? ` (originally cut from ${item.carpetInfo.rollNumber})` : ''}`;

          // Try to find source roll for back-link
          let sourceRollId: string | undefined;
          if (item.carpetInfo.rollNumber) {
            const sourceRoll = await tx.carpetRoll.findFirst({
              where: {
                tenantId: user.tenantId,
                rollNumber: item.carpetInfo.rollNumber,
              },
              select: { id: true },
            });
            if (sourceRoll) sourceRollId = sourceRoll.id;
          }

          // Split length into ft + inch for storage
          const lengthFtFloor = Math.floor(lengthFt);
          const lengthInchPart = Math.round((lengthFt - lengthFtFloor) * 12 * 100) / 100;

          const piece = await tx.carpetCutPiece.create({
            data: {
              tenantId: user.tenantId,
              shopId: sale.shopId,
              productId: item.productId,
              variantId: item.variantId ?? undefined,
              sourceRollId,
              sourceType: 'CUSTOMER_RETURN',
              pieceCode,
              widthFt,
              widthInch: 0,
              lengthFt: lengthFtFloor,
              lengthInch: lengthInchPart,
              totalSqft,
              costAmount,
              salePrice,
              status: item.isDamaged ? 'DAMAGED' : 'AVAILABLE',
              condition: item.isDamaged ? 'Damaged' : (item.cutPieceCondition ?? 'Good'),
              notes: noteText,
              createdById: user.id,
            },
          });

          createdCutPieces.push(piece.pieceCode);

          // Sync ShopStock at this sale's shop
          await this.syncShopStockForCarpet(
            tx,
            user.tenantId,
            sale.shopId,
            item.productId,
            item.variantId,
          );

          // Audit movement
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'RETURN_IN',
              quantity: item.quantity,
              balanceAfter: 0,
              reference: returnNumber,
              note: `Carpet return → cut piece ${pieceCode}${item.isDamaged ? ' (DAMAGED)' : ''}`,
            },
          });

          continue;
        }

        // ─── CARPET BUT NO CUT PIECE — just audit (rare) ─────
        if (item.isCarpet && !item.createCutPiece) {
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'RETURN_IN',
              quantity: item.quantity,
              balanceAfter: 0,
              reference: returnNumber,
              note: `Carpet return (no cut piece created — manual adjustment)`,
            },
          });
          continue;
        }

        // ─── STANDARD PATH — restore product stock ───────────
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        // Restore ShopStock if sale had shop
        if (sale.shopId) {
          const existingShopStock = await tx.shopStock.findFirst({
            where: {
              shopId: sale.shopId,
              productId: item.productId,
              variantId: item.variantId,
            },
          });
          if (existingShopStock) {
            await tx.shopStock.update({
              where: { id: existingShopStock.id },
              data: { stock: { increment: item.quantity } },
            });
          } else {
            await tx.shopStock.create({
              data: {
                tenantId: user.tenantId,
                shopId: sale.shopId,
                productId: item.productId,
                variantId: item.variantId,
                stock: item.quantity,
                isActive: true,
              },
            });
          }
        }

        // Restore variant stock if applicable
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'RETURN_IN',
            quantity: item.quantity,
            balanceAfter: product.stock,
            reference: returnNumber,
            note: 'Sale return',
          },
        });
      }

      // ─── Update sale refundedAmount + status ───────────────
      const totalRefunded = sale.refundedAmount + refundAmount;
      const allItems = await tx.saleItem.findMany({
        where: { saleId: sale.id },
      });
      const fullyReturned = allItems.every(
        (i: any) => i.returnedQty >= i.quantity - 0.001,
      );

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          refundedAmount: totalRefunded,
          status: fullyReturned ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED',
        },
      });

      // ─── Customer ledger ───────────────────────────────────
      if (sale.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: sale.customerId },
        });
        if (customer && sale.creditAmount > 0 && customer.balance > 0) {
          const reduceCredit = Math.min(refundAmount, customer.balance);
          const newBalance = customer.balance - reduceCredit;

          await tx.customer.update({
            where: { id: customer.id },
            data: { balance: newBalance },
          });

          await tx.customerLedger.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              createdById: user.id,
              type: 'REFUND',
              amount: -reduceCredit,
              balanceAfter: newBalance,
              reference: returnNumber,
              note: 'Refund applied to credit',
            },
          });
        }
      }

      // ─── Cash register adjustment ──────────────────────────
      if (dto.refundMethod === 'CASH' && sale.cashRegisterId) {
        const register = await tx.cashRegister.findFirst({
          where: { id: sale.cashRegisterId, status: 'OPEN' },
        });
        if (register) {
          await tx.cashRegister.update({
            where: { id: register.id },
            data: {
              expectedBalance: { decrement: refundAmount },
              totalCashOut: { increment: refundAmount },
            },
          });
          await tx.cashTransaction.create({
            data: {
              tenantId: user.tenantId,
              cashRegisterId: register.id,
              createdById: user.id,
              type: 'REFUND',
              amount: refundAmount,
              reason: `Refund for ${sale.saleNumber}`,
              reference: returnNumber,
            },
          });
        }
      }

      return { ...created, createdCutPieces };
    });

    const cutPiecesText =
      result.createdCutPieces.length > 0
        ? ` • ${result.createdCutPieces.length} cut piece(s) created`
        : '';

    await this.notifications.create({
      tenantId: user.tenantId,
      type: 'RETURN_PROCESSED',
      title: 'Return Processed',
      message: `${returnNumber}: Rs ${refundAmount.toFixed(0)} refunded${cutPiecesText}`,
      link: '/returns',
    });

    return result;
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL
  // ════════════════════════════════════════════════════════

  list(user: AuthenticatedUser) {
    return this.prisma.saleReturn.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { returnedAt: 'desc' },
      take: 50,
      include: {
        sale: { include: { customer: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const ret = await this.prisma.saleReturn.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        sale: { include: { customer: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });
    if (!ret) throw new NotFoundException('Return not found');
    return ret;
  }
}
