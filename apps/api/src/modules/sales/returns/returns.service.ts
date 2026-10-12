/**
 * Sale returns: goods from a bill come back, the money goes back, and the
 * bill, stock, khata, points and cash drawer follow in one transaction.
 *
 * Money rules:
 * - A line is refunded at what the customer actually paid for it: its own
 *   line discount and its share of the bill discount are taken off.
 * - On a credit bill the refund first clears what is still owed on that bill
 *   (khata); only the rest is paid out.
 * - The bill row is locked while a return is written, so two counters (or a
 *   double click) can never return the same goods twice.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FbrService } from '../../../integrations/fbr/fbr.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope, applyStockDelta, assertShopAccess } from '../../../common/shop-scope';
import { CreateReturnDto } from './dto/create-return.dto';
import { requireManagerPin } from '../../../common/helpers/manager-pin.helper';
import { NotificationsService } from '../../notifications/notifications.service';
import { ReturnsRecordsService } from './returns-records.service';
import { PIN_APPROVAL_ACTION, r2, r3 } from './returns.helpers';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const EPS = 0.001;
/** The same request again within this time returns the first return instead of a second one. */
const REPEAT_WINDOW_MS = 20_000;

const DETAIL_INCLUDE = {
  sale: { include: { customer: true } },
  createdBy: { select: { id: true, fullName: true } },
  items: { include: { product: true } },
  shop: { select: { id: true, name: true, isMain: true } },
} as const;

type SaleWithItems = {
  subtotal: number;
  discount: number;
  items: Array<{ id: string; quantity: number; price: number; total: number }>;
};

/**
 * Refund for one unit of each line: the line's own price after its line
 * discount, less its share of the bill discount. Also returns the goods value
 * of the whole bill, which caps all refunds on it.
 */
function refundRates(sale: SaleWithItems) {
  const net = (i: SaleWithItems['items'][number]) => Number(i.total ?? i.price * i.quantity);
  const lines = sale.items.reduce((s, i) => s + net(i), 0);
  const lineDiscount = sale.items.reduce((s, i) => s + Math.max(0, i.price * i.quantity - net(i)), 0);
  const billDiscount = Math.max(0, Number(sale.discount ?? 0) - lineDiscount);
  const factor = lines > 0 ? Math.min(1, Math.max(0, (lines - billDiscount) / lines)) : 1;
  const unit = new Map(sale.items.map((i) => [i.id, i.quantity > 0 ? (net(i) / i.quantity) * factor : i.price * factor]));
  return { unit, goodsValue: Math.max(0, lines - billDiscount) };
}

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly fbr: FbrService,
    private readonly records: ReturnsRecordsService,
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

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateReturnDto) {
    const tenantId = user.tenantId;
    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, tenantId, ...scope.where },
      include: { items: { include: { product: true, variantLink: true } } },
    });

    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (!sale.shopId) {
      throw new BadRequestException(
        'Is sale par koi shop darj nahi — return safely process nahi ho sakta',
      );
    }
    const shopId = sale.shopId;
    assertShopAccess(user, shopId, 'Wapsi');
    if (sale.status === 'VOIDED') throw new BadRequestException('Yeh bill void ho chuka hai — wapsi nahi ho sakti');
    if (sale.status === 'FULLY_RETURNED') throw new BadRequestException('Is bill ka saara maal pehle hi wapas ho chuka');

    const rules = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { requirePinForRefund: true, managerPin: true },
    });
    if (rules?.requirePinForRefund) await requireManagerPin(this.prisma, user, dto.managerPin, 'Wapsi');
    const pinApproved = !!rules?.requirePinForRefund && !!rules.managerPin;

    const itemMap = new Map(sale.items.map((i) => [i.id, i]));
    const seen = new Set<string>();
    for (const it of dto.items) {
      if (seen.has(it.saleItemId)) throw new BadRequestException('Ek hi cheez do dafa chuni gayi hai');
      seen.add(it.saleItemId);
      const si = itemMap.get(it.saleItemId);
      if (!si) throw new NotFoundException('Yeh cheez is bill ki nahi');
      if (!si.productId || !si.product) {
        throw new BadRequestException('Purane (used) phone ki wapsi Used phones ke page se karein');
      }
    }

    const rates = refundRates(sale);
    const returnNumber = `RET-${Date.now().toString().slice(-8)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // One return per bill at a time; the second waits and then sees the first.
      await tx.$queryRaw`SELECT id FROM "Sale" WHERE id = ${sale.id} FOR UPDATE`;

      const recent = await tx.saleReturn.findFirst({
        where: { tenantId, saleId: sale.id, createdById: user.id, returnedAt: { gte: new Date(Date.now() - REPEAT_WINDOW_MS) } },
        orderBy: { returnedAt: 'desc' },
        include: DETAIL_INCLUDE,
      });
      if (recent && sameLines(recent.items, dto.items)) {
        return { ...recent, createdCutPieces: [] as string[], repeated: true };
      }

      const current = await tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        select: { status: true, refundedAmount: true, items: { select: { id: true, quantity: true, returnedQty: true } } },
      });
      if (current.status === 'VOIDED' || current.status === 'FULLY_RETURNED') {
        throw new BadRequestException('Is bill ka maal pehle hi wapas ho chuka ya bill void hai');
      }
      const fresh = new Map(current.items.map((i) => [i.id, i]));

      const lines = dto.items.map((it) => {
        const si = itemMap.get(it.saleItemId)!;
        const f = fresh.get(si.id)!;
        const remaining = f.quantity - f.returnedQty;
        if (it.quantity > remaining + EPS) {
          throw new BadRequestException(
            `${si.product!.name}: sirf ${r3(Math.max(0, remaining))} ${si.product!.unit} wapas ho sakta hai`,
          );
        }
        const unit = rates.unit.get(si.id) ?? si.price;
        const isCarpet = CARPET_UNITS.has(si.product!.unit);
        const restock = it.restock !== false;
        return {
          saleItemId: si.id,
          productId: si.productId!,
          productName: si.product!.name,
          variantId: si.variantLink?.variantId ?? null,
          quantity: it.quantity,
          refundPrice: r2(unit),
          total: r2(unit * it.quantity),
          unitCost: Number(si.costPrice) || null,
          restock,
          isCarpet,
          carpetInfo: isCarpet ? this.parseCarpetNote(si.note) : null,
          costPrice: Number(si.costPrice) || 0,
          createCutPiece: it.createCutPiece ?? true,
          cutPieceCondition: it.cutPieceCondition ?? 'Good',
          isDamaged: (it.isDamaged ?? false) || !restock,
          cutPieceWidthFt: it.cutPieceWidthFt,
          cutPieceLengthFt: it.cutPieceLengthFt,
          cutPieceNotes: it.cutPieceNotes,
        };
      });

      // Never refund more than the goods on the bill were worth.
      const asked = r2(lines.reduce((s, l) => s + l.total, 0));
      const left = r2(Math.max(0, rates.goodsValue - Number(current.refundedAmount ?? 0)));
      const refundAmount = Math.min(asked, left);
      if (refundAmount < asked && asked > 0) {
        const k = refundAmount / asked;
        for (const l of lines) { l.total = r2(l.total * k); l.refundPrice = r2(l.refundPrice * k); }
      }

      const created = await tx.saleReturn.create({
        data: {
          tenantId,
          // Goods come back to the counter that sold them.
          shopId,
          saleId: sale.id,
          createdById: user.id,
          returnNumber,
          reason: dto.reason?.trim() || null,
          notes: dto.notes?.trim() || null,
          refundAmount,
          refundMethod: dto.refundMethod,
          items: {
            create: lines.map((l) => ({
              saleItemId: l.saleItemId,
              productId: l.productId,
              quantity: l.quantity,
              refundPrice: l.refundPrice,
              total: l.total,
            })),
          },
        },
        include: DETAIL_INCLUDE,
      });

      const createdCutPieces: string[] = [];

      for (const item of lines) {
        await tx.saleItem.update({
          where: { id: item.saleItemId },
          data: { returnedQty: { increment: item.quantity } },
        });

        // ─── CARPET PATH ─────────────────────────────────────
        if (item.isCarpet && item.carpetInfo?.isRollCut && item.createCutPiece) {
          const originalWidthFt = item.carpetInfo.widthFt ?? 0;
          const originalLengthFt = item.carpetInfo.lengthFt ?? 0;
          const widthFt = item.cutPieceWidthFt ?? originalWidthFt;
          let lengthFt = item.cutPieceLengthFt;
          if (!lengthFt && widthFt > 0) lengthFt = Number((item.quantity / widthFt).toFixed(2));
          lengthFt = lengthFt ?? originalLengthFt;
          const totalSqft = Number((widthFt * lengthFt).toFixed(2));
          const costAmount = Number((item.costPrice * totalSqft).toFixed(2));
          // Returned cut pieces are priced at 80% of the original rate.
          const salePrice = item.isDamaged ? 0 : Number((item.refundPrice * 0.8).toFixed(2));
          const pieceCode = await this.generateCutPieceCode(tx, tenantId);
          const noteText = item.cutPieceNotes
            ?? `Returned from sale ${sale.saleNumber}${item.carpetInfo.rollNumber ? ` (originally cut from ${item.carpetInfo.rollNumber})` : ''}`;

          let sourceRollId: string | undefined;
          if (item.carpetInfo.rollNumber) {
            const sourceRoll = await tx.carpetRoll.findFirst({
              where: { tenantId, rollNumber: item.carpetInfo.rollNumber },
              select: { id: true },
            });
            if (sourceRoll) sourceRollId = sourceRoll.id;
          }

          const lengthFtFloor = Math.floor(lengthFt);
          const lengthInchPart = Math.round((lengthFt - lengthFtFloor) * 12 * 100) / 100;

          const piece = await tx.carpetCutPiece.create({
            data: {
              tenantId,
              shopId,
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

          await this.syncShopStockForCarpet(tx, tenantId, shopId, item.productId, item.variantId);
          await this.carpetAudit(tx, user, shopId, item, returnNumber,
            `Carpet return → cut piece ${pieceCode}${item.isDamaged ? ' (DAMAGED)' : ''}`, item.isDamaged);
          continue;
        }

        // ─── CARPET BUT NO CUT PIECE — audit only ─────────────
        if (item.isCarpet && !item.createCutPiece) {
          await this.carpetAudit(tx, user, shopId, item, returnNumber, 'Carpet return (no cut piece created — manual adjustment)', true);
          continue;
        }

        // ─── STANDARD PATH — back on the selling branch's shelf ──
        await applyStockDelta({
          tx,
          tenantId,
          shopId,
          productId: item.productId,
          variantId: item.variantId,
          delta: item.quantity,
          movementType: 'RETURN_IN',
          reference: returnNumber,
          note: 'Sale return',
          userId: user.id,
          unitCost: item.unitCost,
        });
        // Not fit to sell: it came back in and goes straight out as damaged,
        // so the loss shows on the Adjustments page with its cost.
        if (!item.restock) {
          await applyStockDelta({
            tx,
            tenantId,
            shopId,
            productId: item.productId,
            variantId: item.variantId,
            delta: -item.quantity,
            movementType: 'DAMAGE',
            reference: returnNumber,
            note: `Wapsi par kharab nikla — ${sale.saleNumber}`,
            userId: user.id,
            unitCost: item.unitCost,
          });
        }
        await this.releaseTrackedUnits(tx, tenantId, shopId, item.saleItemId, item.quantity, item.restock, returnNumber);
      }

      // ─── Bill status and refunded total ───────────────────
      const after = await tx.saleItem.findMany({ where: { saleId: sale.id }, select: { quantity: true, returnedQty: true } });
      const fullyReturned = after.every((i) => i.returnedQty >= i.quantity - EPS);
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          refundedAmount: { increment: refundAmount },
          status: fullyReturned ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED',
        },
      });

      // ─── Khata: clear what is still owed on this bill first ──
      let khataAmount = 0;
      if (sale.customerId && sale.creditAmount > 0 && refundAmount > 0) {
        const earlier = await tx.saleReturn.findMany({
          where: { saleId: sale.id, id: { not: created.id } },
          select: { returnNumber: true },
        });
        const cleared = earlier.length
          ? await tx.customerLedger.aggregate({
            where: { tenantId, customerId: sale.customerId, type: 'REFUND', reference: { in: earlier.map((e) => e.returnNumber) } },
            _sum: { amount: true },
          })
          : null;
        const owedOnBill = Math.max(0, sale.creditAmount + Number(cleared?._sum.amount ?? 0));
        const customer = await tx.customer.findUnique({ where: { id: sale.customerId }, select: { id: true, balance: true } });
        if (customer) {
          khataAmount = r2(Math.min(refundAmount, owedOnBill, Math.max(0, customer.balance)));
          if (khataAmount > 0) {
            const { balance: newBalance } = await tx.customer.update({
              where: { id: customer.id },
              data: { balance: { decrement: khataAmount } },
              select: { balance: true },
            });
            await tx.customerLedger.create({
              data: {
                tenantId,
                // The sale's branch, so that branch's khata goes down too.
                shopId,
                customerId: customer.id,
                createdById: user.id,
                type: 'REFUND',
                amount: -khataAmount,
                balanceAfter: newBalance,
                reference: returnNumber,
                note: `Maal wapas — bill ${sale.saleNumber}`,
              },
            });
          }
        }
      }
      const payout = r2(refundAmount - khataAmount);

      // ─── Points and spend ──────────────────────────────────
      // Returned goods take back their share of the points earned on the bill.
      if (sale.customerId && sale.total > 0) {
        const c = await tx.customer.findUnique({ where: { id: sale.customerId }, select: { loyaltyPoints: true } });
        if (c) {
          const share = Math.floor(Number(sale.loyaltyEarned ?? 0) * Math.min(1, refundAmount / sale.total));
          const back = Math.min(share, c.loyaltyPoints);
          const { loyaltyPoints } = await tx.customer.update({
            where: { id: sale.customerId },
            data: { loyaltyPoints: { decrement: back }, totalSpent: { decrement: refundAmount } },
            select: { loyaltyPoints: true },
          });
          if (back > 0) {
            await tx.loyaltyTransaction.create({
              data: {
                tenantId, customerId: sale.customerId, type: 'ADJUSTMENT', shopId, saleId: sale.id,
                points: -back, balanceAfter: loyaltyPoints, reference: returnNumber, note: 'Maal wapas — points wapas liye',
              },
            });
          }
        }
      }

      // ─── Cash drawer ───────────────────────────────────────
      // The drawer that pays the cash is the one open now at the branch, not
      // the one that took the sale (it may be closed). The register's live
      // figures count cash returns from SaleReturn, so only the audit row is
      // written here; touching its totals would count the refund twice.
      if (dto.refundMethod === 'CASH' && payout > 0) {
        const register = await tx.cashRegister.findFirst({
          where: { tenantId, shopId, status: 'OPEN' },
          orderBy: { openedAt: 'desc' },
          select: { id: true },
        });
        if (register) {
          await tx.cashTransaction.create({
            data: {
              tenantId,
              cashRegisterId: register.id,
              createdById: user.id,
              type: 'REFUND',
              amount: payout,
              reason: `Refund for ${sale.saleNumber}`,
              reference: returnNumber,
            },
          });
        }
      }

      if (pinApproved) {
        await tx.activityLog.create({
          data: {
            tenantId, userId: user.id, action: PIN_APPROVAL_ACTION, entityType: 'SaleReturn', entityId: created.id,
            description: `Wapsi ${returnNumber} malik ke PIN se manzoor`,
          },
        });
      }

      return { ...created, createdCutPieces, khataAmount, payout, repeated: false };
    });

    if (result.repeated) return result;

    const cutPiecesText =
      result.createdCutPieces.length > 0
        ? ` • ${result.createdCutPieces.length} cut piece(s) created`
        : '';

    await this.notifications.create({
      tenantId,
      type: 'RETURN_PROCESSED',
      title: 'Return Processed',
      message: `${returnNumber}: Rs ${result.refundAmount.toFixed(0)} refunded${cutPiecesText}`,
      link: '/returns',
    });

    void this.fbr.submitCreditNote(tenantId, result.id).catch(() => undefined);
    return result;
  }

  /** Audit rows for carpet returns; carpet stock itself lives in rolls and cut pieces. */
  private async carpetAudit(
    tx: any, user: AuthenticatedUser, shopId: string,
    item: { productId: string; variantId: string | null; quantity: number },
    reference: string, note: string, writtenOff: boolean,
  ) {
    const base = { tenantId: user.tenantId, shopId, productId: item.productId, variantId: item.variantId, reference, createdById: user.id, balanceAfter: 0 };
    await tx.stockMovement.create({ data: { ...base, type: 'RETURN_IN', quantity: item.quantity, note } });
    if (writtenOff) {
      await tx.stockMovement.create({ data: { ...base, type: 'DAMAGE', quantity: -item.quantity, note: 'Wapsi — bechne layak nahi' } });
    }
  }

  /** IMEI and serial units on the line go back in stock, or are marked faulty. */
  private async releaseTrackedUnits(
    tx: any, tenantId: string, shopId: string, saleItemId: string, quantity: number, restock: boolean, reference: string,
  ) {
    const [imei, serial] = await Promise.all([
      tx.productImei.findFirst({ where: { tenantId, saleItemId }, select: { id: true, notes: true } }),
      tx.electronicsSerialTracking.findFirst({ where: { tenantId, saleItemId }, select: { id: true, notes: true } }),
    ]);
    if ((imei || serial) && quantity < 1 - EPS) {
      throw new BadRequestException('IMEI ya serial wala unit poora hi wapas hota hai');
    }
    const stamp = (notes: string | null) => [notes, `Wapsi ${reference}${restock ? '' : ' (kharab)'}`].filter(Boolean).join('\n');
    // saleItemId is kept so the unit can still be traced to the bill until it is sold again.
    if (imei) {
      await tx.productImei.update({
        where: { id: imei.id },
        data: { status: restock ? 'IN_STOCK' : 'DAMAGED', shopId, soldAt: null, soldPrice: null, notes: stamp(imei.notes) },
      });
    }
    if (serial) {
      await tx.electronicsSerialTracking.update({
        where: { id: serial.id },
        data: { status: restock ? 'IN_STOCK' : 'DEFECTIVE', shopId, soldAt: null, soldPrice: null, notes: stamp(serial.notes) },
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL
  // ════════════════════════════════════════════════════════

  /** Latest 50 returns; the mobile app reads this list. */
  list(user: AuthenticatedUser, scope: ShopScope) {
    return this.prisma.saleReturn.findMany({
      where: { tenantId: user.tenantId, ...scope.whereLoose },
      orderBy: { returnedAt: 'desc' },
      take: 50,
      include: {
        sale: { include: { customer: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
        shop: { select: { id: true, name: true, isMain: true } },
      },
    });
  }

  async findOne(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const ret = await this.prisma.saleReturn.findFirst({
      where: { id, tenantId: user.tenantId, ...scope.whereLoose },
      include: DETAIL_INCLUDE,
    });
    if (!ret) throw new NotFoundException('Return not found');
    const extra = await this.records.extras(user.tenantId, [ret]);
    const x = extra.get(ret.id)!;
    return {
      ...ret,
      khataAmount: x.khataAmount,
      payout: r2(ret.refundAmount - x.khataAmount),
      approvedBy: x.approvedBy,
      items: ret.items.map((i) => ({ ...i, ...x.items.get(i.id) })),
    };
  }
}

/** True when a recent return has exactly these lines and quantities. */
function sameLines(prev: Array<{ saleItemId: string; quantity: number }>, next: Array<{ saleItemId: string; quantity: number }>) {
  if (prev.length !== next.length) return false;
  const want = new Map(next.map((n) => [n.saleItemId, n.quantity]));
  return prev.every((p) => want.has(p.saleItemId) && Math.abs(want.get(p.saleItemId)! - p.quantity) < EPS);
}
