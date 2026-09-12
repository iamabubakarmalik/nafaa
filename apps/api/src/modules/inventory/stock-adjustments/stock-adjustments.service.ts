import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  ShopScope,
  applyStockDelta,
  readShopStock,
  recacheProductStock,
  resolveWriteShopId,
} from '../../../common/shop-scope';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@Injectable()
export class StockAdjustmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    scope: ShopScope,
    dto: CreateAdjustmentDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Stock is corrected in one branch's books, never "everywhere at once".
    const shopId = await resolveWriteShopId(
      this.prisma,
      user.tenantId,
      scope,
      dto.shopId,
    );

    if (dto.carpetRollId) return this.adjustCarpetRoll(user, shopId, dto, product);
    if (dto.imeiId) return this.adjustImei(user, shopId, dto, product);
    if (dto.variantId) return this.adjustVariant(user, shopId, dto, product);
    return this.adjustSimpleProduct(user, shopId, dto, product);
  }


  // ─── SIMPLE PRODUCT ─────────────────────────────────
  private async adjustSimpleProduct(
    user: AuthenticatedUser,
    shopId: string,
    dto: CreateAdjustmentDto,
    product: any,
  ) {
    const isIncrement = dto.type === 'ADJUSTMENT_IN';
    const change = isIncrement ? dto.quantity : -dto.quantity;

    // Checked against *this branch's* shelf, not the tenant-wide total —
    // otherwise one shop could write off stock that is sitting in another.
    if (!isIncrement) {
      const available = await readShopStock(this.prisma, shopId, product.id, null);
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Is shop mein kaafi stock nahi hai. Available: ${available} ${product.unit}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: product.id,
          createdById: user.id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          note: dto.note,
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      await applyStockDelta({
        tx,
        tenantId: user.tenantId,
        shopId,
        productId: product.id,
        variantId: null,
        delta: change,
        movementType: dto.type,
        reference: `ADJ-${adjustment.id.slice(0, 8)}`,
        note: `${dto.reason}${dto.note ? ' — ' + dto.note : ''}`,
      });

      return adjustment;
    });
  }

  // ─── VARIANT ─────────────────────────────────────────
  private async adjustVariant(
    user: AuthenticatedUser,
    shopId: string,
    dto: CreateAdjustmentDto,
    product: any,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.variantId!, product: { tenantId: user.tenantId, id: product.id } },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const isIncrement = dto.type === 'ADJUSTMENT_IN';
    const change = isIncrement ? dto.quantity : -dto.quantity;

    if (!isIncrement) {
      const available = await readShopStock(
        this.prisma,
        shopId,
        product.id,
        variant.id,
      );
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Is shop mein is variant ka kaafi stock nahi hai. Available: ${available} ${variant.unit || product.unit}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: product.id,
          variantId: variant.id,
          createdById: user.id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          note: `[Variant: ${variant.name}] ${dto.note || ''}`.trim(),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          variant: { select: { id: true, name: true, sku: true, color: true, colorHex: true, size: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      await applyStockDelta({
        tx,
        tenantId: user.tenantId,
        shopId,
        productId: product.id,
        variantId: variant.id,
        delta: change,
        movementType: dto.type,
        reference: `ADJ-${adjustment.id.slice(0, 8)}`,
        note: `[${variant.name}] ${dto.reason}${dto.note ? ' — ' + dto.note : ''}`,
      });

      return adjustment;
    });
  }

  // ─── CARPET ROLL ─────────────────────────────────────
  private async adjustCarpetRoll(
    user: AuthenticatedUser,
    fallbackShopId: string,
    dto: CreateAdjustmentDto,
    product: any,
  ) {
    const roll = await this.prisma.carpetRoll.findFirst({
      where: { id: dto.carpetRollId!, tenantId: user.tenantId, productId: product.id },
    });
    if (!roll) throw new NotFoundException('Carpet roll not found');

    // The roll physically sits somewhere — that branch's books move, whichever
    // branch the user happens to be viewing.
    const shopId = roll.shopId ?? fallbackShopId;

    const action = dto.rollAction || 'ADJUST_LENGTH';

    return this.prisma.$transaction(async (tx) => {
      let updatedRoll = roll;
      let stockChange = 0;
      let movementNote = '';

      if (action === 'MARK_DAMAGED') {
        stockChange = -roll.remainingSqft;
        updatedRoll = await tx.carpetRoll.update({
          where: { id: roll.id },
          data: { status: 'DAMAGED' },
        });
        movementNote = `Roll ${roll.rollNumber} marked DAMAGED (${roll.remainingSqft.toFixed(2)} sqft lost)`;
      } else if (action === 'MARK_LOST') {
        stockChange = -roll.remainingSqft;
        updatedRoll = await tx.carpetRoll.update({
          where: { id: roll.id },
          data: { status: 'FINISHED' },
        });
        movementNote = `Roll ${roll.rollNumber} marked LOST (${roll.remainingSqft.toFixed(2)} sqft removed)`;
      } else if (action === 'RESTORE') {
        stockChange = roll.remainingSqft;
        updatedRoll = await tx.carpetRoll.update({
          where: { id: roll.id },
          data: { status: 'ACTIVE' },
        });
        movementNote = `Roll ${roll.rollNumber} restored to ACTIVE`;
      } else {
        const isIncrement = dto.type === 'ADJUSTMENT_IN';
        const lengthFt = dto.lengthFt ?? dto.quantity ?? 0;
        const lengthInch = dto.lengthInch ?? 0;
        const totalLengthFt = lengthFt + lengthInch / 12;
        const changeFt = isIncrement ? totalLengthFt : -totalLengthFt;

        const currentRemFt = roll.remainingLengthFt + roll.remainingLengthInch / 12;
        const newRemainingFt = currentRemFt + changeFt;

        if (newRemainingFt < 0) {
          throw new BadRequestException(
            `Cannot subtract ${totalLengthFt.toFixed(2)}ft. Roll has ${roll.remainingLengthFt}ft ${roll.remainingLengthInch}in remaining.`,
          );
        }

        const width = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
        const newRemainingSqft = newRemainingFt * width;
        stockChange = newRemainingSqft - roll.remainingSqft;

        const newFt = Math.floor(newRemainingFt);
        const newInch = Math.round((newRemainingFt - newFt) * 12 * 100) / 100;

        updatedRoll = await tx.carpetRoll.update({
          where: { id: roll.id },
          data: {
            remainingLengthFt: newFt,
            remainingLengthInch: newInch,
            remainingSqft: newRemainingSqft,
            status: newRemainingSqft <= 0 ? 'FINISHED' : roll.status,
          },
        });

        movementNote = `Roll ${roll.rollNumber}: ${changeFt > 0 ? '+' : ''}${changeFt.toFixed(2)}ft (${stockChange > 0 ? '+' : ''}${stockChange.toFixed(2)} sqft)`;
      }

      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: product.id,
          carpetRollId: roll.id,
          createdById: user.id,
          type: dto.type,
          quantity: Math.abs(stockChange),
          reason: dto.reason,
          note: `[Roll: ${roll.rollNumber}] ${action} — ${dto.note || ''}`.trim(),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          carpetRoll: {
            select: {
              id: true, rollNumber: true, status: true,
              remainingSqft: true, remainingLengthFt: true, remainingLengthInch: true,
              widthFt: true, widthInch: true,
            },
          },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      const widthReal = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
      await tx.carpetRollMovement.create({
        data: {
          rollId: roll.id,
          tenantId: user.tenantId,
          type: dto.type === 'DAMAGE' ? 'DAMAGE' : 'ADJUSTMENT',
          lengthFt: widthReal > 0 ? stockChange / widthReal : 0,
          sqft: stockChange,
          balanceLengthAfter: updatedRoll.remainingLengthFt + updatedRoll.remainingLengthInch / 12,
          balanceSqftAfter: updatedRoll.remainingSqft,
          reference: `ADJ-${adjustment.id.slice(0, 8)}`,
          note: movementNote,
          createdById: user.id,
        },
      });

      await applyStockDelta({
        tx,
        tenantId: user.tenantId,
        shopId,
        productId: product.id,
        variantId: null,
        delta: stockChange,
        movementType: dto.type,
        reference: `ADJ-${adjustment.id.slice(0, 8)}`,
        note: `${movementNote}${dto.reason ? ' — ' + dto.reason : ''}`,
      });

      return adjustment;
    });
  }

  // ─── IMEI ────────────────────────────────────────────
  private async adjustImei(
    user: AuthenticatedUser,
    fallbackShopId: string,
    dto: CreateAdjustmentDto,
    product: any,
  ) {
    const imei = await this.prisma.productImei.findFirst({
      where: { id: dto.imeiId!, tenantId: user.tenantId, productId: product.id },
    });
    if (!imei) throw new NotFoundException('IMEI not found');

    if (imei.status === 'SOLD') {
      throw new BadRequestException(`IMEI ${imei.imei1} is already SOLD — cannot adjust`);
    }

    // A handset lives at one branch; that is the branch whose count changes.
    const shopId = imei.shopId ?? fallbackShopId;

    return this.prisma.$transaction(async (tx) => {
      let newStatus: 'IN_STOCK' | 'DAMAGED' | 'LOST' | 'RETURNED' = imei.status as any;
      let stockChange = 0;

      if (dto.type === 'DAMAGE') {
        if (imei.status === 'IN_STOCK') stockChange = -1;
        newStatus = 'DAMAGED';
      } else if (dto.type === 'LOSS') {
        if (imei.status === 'IN_STOCK') stockChange = -1;
        newStatus = 'LOST';
      } else if (dto.type === 'ADJUSTMENT_IN') {
        if (imei.status !== 'IN_STOCK') stockChange = 1;
        newStatus = 'IN_STOCK';
      } else if (dto.type === 'ADJUSTMENT_OUT') {
        if (imei.status === 'IN_STOCK') stockChange = -1;
        newStatus = 'LOST';
      }

      await tx.productImei.update({ where: { id: imei.id }, data: { status: newStatus } });

      const inStockCount = await tx.productImei.count({
        where: { tenantId: user.tenantId, productId: product.id, status: 'IN_STOCK' },
      });

      // Serialised stock is counted, not incremented — so set the branch row to
      // the live count and let recacheProductStock roll the totals back up.
      await this.syncImeiShopStock(
        tx,
        user.tenantId,
        shopId,
        product.id,
        imei.variantId,
      );

      const adjustment = await tx.stockAdjustment.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          productId: product.id,
          variantId: imei.variantId,
          imeiId: imei.id,
          createdById: user.id,
          type: dto.type,
          quantity: 1,
          reason: dto.reason,
          note: `[IMEI: ${imei.imei1}] ${imei.status} → ${newStatus} — ${dto.note || ''}`.trim(),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          variant: { select: { id: true, name: true } },
          imei: { select: { id: true, imei1: true, imei2: true, status: true, color: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      if (stockChange !== 0) {
        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            productId: product.id,
            type: dto.type,
            quantity: stockChange,
            balanceAfter: inStockCount,
            reference: `ADJ-${adjustment.id.slice(0, 8)}`,
            note: `IMEI ${imei.imei1}: ${imei.status} → ${newStatus} — ${dto.reason}`,
          },
        });
      }

      return adjustment;
    });
  }

  /**
   * Recount a branch's serialised stock straight from the IMEI table, then
   * re-derive the product/variant totals from every branch.
   */
  private async syncImeiShopStock(
    tx: any,
    tenantId: string,
    shopId: string,
    productId: string,
    variantId: string | null,
  ): Promise<void> {
    const count = await tx.productImei.count({
      where: {
        tenantId,
        productId,
        shopId,
        status: 'IN_STOCK',
        ...(variantId ? { variantId } : {}),
      },
    });

    const existing = await tx.shopStock.findFirst({
      where: { shopId, productId, variantId },
      select: { id: true },
    });

    if (existing) {
      await tx.shopStock.update({
        where: { id: existing.id },
        data: { stock: count },
      });
    } else {
      await tx.shopStock.create({
        data: { tenantId, shopId, productId, variantId, stock: count, isActive: true },
      });
    }

    await recacheProductStock(tx, productId, variantId);
  }

  // ─── LIST ────────────────────────────────────────────
  list(user: AuthenticatedUser, scope: ShopScope) {
    return this.prisma.stockAdjustment.findMany({
      where: { tenantId: user.tenantId, ...scope.whereLoose },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        variant: { select: { id: true, name: true, color: true, colorHex: true, size: true } },
        carpetRoll: {
          select: {
            id: true, rollNumber: true, status: true,
            remainingSqft: true, widthFt: true, widthInch: true,
          },
        },
        imei: { select: { id: true, imei1: true, status: true, color: true } },
        createdBy: { select: { id: true, fullName: true } },
        shop: { select: { id: true, name: true, isMain: true } },
      },
      take: 200,
    });
  }

  // ─── OPTIONS ENDPOINT ────────────────────────────────
  // Returns variants + rolls + IMEIs for a product to power the adjustment picker
  async getAdjustmentOptions(user: AuthenticatedUser, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: {
        id: true, name: true, unit: true, stock: true, sku: true,
        hasVariants: true, lowStockAlert: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const [variants, carpetRolls, imeis] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { productId, isActive: true },
        select: {
          id: true, name: true, sku: true, color: true, colorHex: true, size: true,
          stock: true, unit: true, imageUrl: true,
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.carpetRoll.findMany({
        where: { productId, tenantId: user.tenantId, status: { in: ['ACTIVE', 'DAMAGED', 'RESERVED'] } },
        select: {
          id: true, rollNumber: true, designCode: true, status: true,
          widthFt: true, widthInch: true,
          remainingLengthFt: true, remainingLengthInch: true, remainingSqft: true,
          originalSqft: true, salePricePerSqft: true, rackNumber: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productImei.findMany({
        where: { productId, tenantId: user.tenantId, status: { in: ['IN_STOCK', 'DAMAGED', 'RETURNED'] } },
        select: {
          id: true, imei1: true, imei2: true, status: true, color: true,
          costPrice: true, warrantyMonths: true,
          variant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    return { product, variants, carpetRolls, imeis };
  }
}
