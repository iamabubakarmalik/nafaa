import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { NotificationsService } from '../notifications/notifications.service';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
  }

  // ════════════════════════════════════════════════════════
  // CREATE TRANSFER
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateTransferDto) {
    if (dto.fromShopId === dto.toShopId) {
      throw new BadRequestException('Source aur destination shop same nahi ho sakte');
    }

    const [fromShop, toShop] = await Promise.all([
      this.prisma.shop.findFirst({ where: { id: dto.fromShopId, tenantId: user.tenantId } }),
      this.prisma.shop.findFirst({ where: { id: dto.toShopId, tenantId: user.tenantId } }),
    ]);
    if (!fromShop || !toShop) throw new NotFoundException('Shop not found');

    // ─── Validate items + detect carpet rolls ──────────────
    const itemsWithMeta: Array<any> = [];
    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId: user.tenantId },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      const isCarpet = CARPET_UNITS.has(product.unit);

      // ─── CARPET PATH — validate roll ─────────────────────
      if (isCarpet) {
        if (!item.carpetRollId) {
          throw new BadRequestException(
            `${product.name}: Carpet products mein roll select karna zaroori hai`,
          );
        }

        const roll = await this.prisma.carpetRoll.findFirst({
          where: {
            id: item.carpetRollId,
            tenantId: user.tenantId,
            shopId: dto.fromShopId,
          },
        });

        if (!roll) {
          throw new BadRequestException(
            `Roll ${item.carpetRollId} ${fromShop.name} mein nahi mila`,
          );
        }

        if (roll.status !== 'ACTIVE') {
          throw new BadRequestException(
            `Roll ${roll.rollNumber} is ${roll.status} — cannot transfer`,
          );
        }

        if (roll.remainingLengthFt <= 0) {
          throw new BadRequestException(
            `Roll ${roll.rollNumber} is empty — cannot transfer`,
          );
        }

        itemsWithMeta.push({
          ...item,
          isCarpet: true,
          product,
          roll,
        });
        continue;
      }

      // ─── STANDARD PATH — check ShopStock ──────────────────
      const variantId = item.variantId ?? null;
      const sourceStock = await this.prisma.shopStock.findFirst({
        where: {
          shopId: dto.fromShopId,
          productId: item.productId,
          variantId,
        },
      });

      if (!sourceStock || sourceStock.stock < item.quantity) {
        throw new BadRequestException(
          `${product.name} insufficient at ${fromShop.name}. Available: ${sourceStock?.stock ?? 0}`,
        );
      }

      itemsWithMeta.push({
        ...item,
        isCarpet: false,
        product,
        roll: null,
      });
    }

    const transferNumber = `TR-${Date.now().toString().slice(-8)}`;

    // ─── Atomic transaction ────────────────────────────────
    const transfer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          tenantId: user.tenantId,
          fromShopId: dto.fromShopId,
          toShopId: dto.toShopId,
          createdById: user.id,
          transferNumber,
          status: 'IN_TRANSIT',
          notes: dto.notes,
          transferredAt: new Date(),
          items: {
            create: itemsWithMeta.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              carpetRollId: item.carpetRollId ?? null,
              quantity: item.quantity,
              notes: item.notes,
            })),
          },
        },
        include: {
          fromShop: true,
          toShop: true,
          items: { include: { product: true, carpetRoll: true } },
        },
      });

      // ─── Process each item ─────────────────────────────────
      for (const item of itemsWithMeta) {
        if (item.isCarpet && item.roll) {
          // ─── CARPET: Mark roll as TRANSFERRED (don't move shop yet) ──
          // Roll will be re-shop'd on receive. For now mark status.
          await tx.carpetRoll.update({
            where: { id: item.roll.id },
            data: { status: 'TRANSFERRED' },
          });

          // Movement log on the roll
          await tx.carpetRollMovement.create({
            data: {
              rollId: item.roll.id,
              tenantId: user.tenantId,
              type: 'TRANSFER',
              lengthFt: 0, // length unchanged — just shop change
              sqft: 0,
              balanceLengthAfter: Number(item.roll.remainingLengthFt),
              balanceSqftAfter: Number(item.roll.remainingSqft),
              reference: transferNumber,
              note: `Transfer out to ${toShop.name}`,
              createdById: user.id,
            },
          });

          // Sync ShopStock at source (carpet roll no longer counts)
          await this.syncShopStockForCarpet(
            tx,
            user.tenantId,
            dto.fromShopId,
            item.productId,
            item.variantId ?? item.roll.variantId ?? null,
          );

          // Audit movement at product level
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'TRANSFER_OUT',
              quantity: -item.quantity,
              balanceAfter: 0,
              reference: transferNumber,
              note: `Roll ${item.roll.rollNumber} transfer to ${toShop.name}`,
            },
          });

          continue;
        }

        // ─── STANDARD: Decrement source ShopStock ────────────
        const variantId = item.variantId ?? null;
        const existingSource = await tx.shopStock.findFirst({
          where: {
            shopId: dto.fromShopId,
            productId: item.productId,
            variantId,
          },
        });
        if (!existingSource) {
          throw new BadRequestException('Source stock missing — refresh and retry');
        }
        await tx.shopStock.update({
          where: { id: existingSource.id },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'TRANSFER_OUT',
            quantity: -item.quantity,
            balanceAfter: existingSource.stock - item.quantity,
            reference: transferNumber,
            note: `Transfer to ${toShop.name}`,
          },
        });
      }

      return created;
    });

    await this.notifications.create({
      tenantId: user.tenantId,
      type: 'INFO',
      title: 'Stock Transfer Created',
      message: `${transferNumber}: ${fromShop.name} → ${toShop.name}`,
      link: '/transfers',
    });

    return transfer;
  }

  // ════════════════════════════════════════════════════════
  // RECEIVE TRANSFER
  // ════════════════════════════════════════════════════════

  async receive(user: AuthenticatedUser, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        items: { include: { carpetRoll: true, product: true } },
        fromShop: true,
        toShop: true,
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Transfer is not in transit');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
        include: {
          fromShop: true,
          toShop: true,
          items: { include: { product: true, carpetRoll: true } },
        },
      });

      for (const item of transfer.items) {
        if (item.carpetRollId && item.carpetRoll) {
          // ─── CARPET: Move roll to destination shop ───────────
          await tx.carpetRoll.update({
            where: { id: item.carpetRollId },
            data: {
              shopId: transfer.toShopId,
              status: 'ACTIVE', // restore active
            },
          });

          // Movement log
          await tx.carpetRollMovement.create({
            data: {
              rollId: item.carpetRollId,
              tenantId: user.tenantId,
              type: 'TRANSFER',
              lengthFt: 0,
              sqft: 0,
              balanceLengthAfter: Number(item.carpetRoll.remainingLengthFt),
              balanceSqftAfter: Number(item.carpetRoll.remainingSqft),
              reference: transfer.transferNumber,
              note: `Received at ${transfer.toShop.name} from ${transfer.fromShop.name}`,
              createdById: user.id,
            },
          });

          // Sync ShopStock at destination (carpet roll now counts here)
          await this.syncShopStockForCarpet(
            tx,
            user.tenantId,
            transfer.toShopId,
            item.productId,
            item.variantId ?? item.carpetRoll.variantId ?? null,
          );

          // Audit at product level
          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'TRANSFER_IN',
              quantity: item.quantity,
              balanceAfter: 0,
              reference: transfer.transferNumber,
              note: `Roll ${item.carpetRoll.rollNumber} received from ${transfer.fromShop.name}`,
            },
          });

          continue;
        }

        // ─── STANDARD: Increment destination ShopStock ───────
        const variantId = item.variantId ?? null;
        const existing = await tx.shopStock.findFirst({
          where: {
            shopId: transfer.toShopId,
            productId: item.productId,
            variantId,
          },
        });

        if (existing) {
          await tx.shopStock.update({
            where: { id: existing.id },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.shopStock.create({
            data: {
              tenantId: user.tenantId,
              shopId: transfer.toShopId,
              productId: item.productId,
              variantId,
              stock: item.quantity,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId: user.tenantId,
            productId: item.productId,
            type: 'TRANSFER_IN',
            quantity: item.quantity,
            balanceAfter: 0,
            reference: transfer.transferNumber,
            note: `Received from ${transfer.fromShop.name}`,
          },
        });
      }

      return updated;
    });
  }

  // ════════════════════════════════════════════════════════
  // CANCEL TRANSFER
  // ════════════════════════════════════════════════════════

  async cancel(user: AuthenticatedUser, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        items: { include: { carpetRoll: true } },
        fromShop: true,
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status === 'RECEIVED') {
      throw new BadRequestException('Received transfer cancel nahi kar sakte');
    }
    if (transfer.status === 'CANCELLED') {
      throw new BadRequestException('Already cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockTransfer.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (transfer.status === 'IN_TRANSIT') {
        for (const item of transfer.items) {
          if (item.carpetRollId && item.carpetRoll) {
            // ─── CARPET: Restore roll status to ACTIVE at source ──
            await tx.carpetRoll.update({
              where: { id: item.carpetRollId },
              data: { status: 'ACTIVE' },
            });

            await tx.carpetRollMovement.create({
              data: {
                rollId: item.carpetRollId,
                tenantId: user.tenantId,
                type: 'TRANSFER',
                lengthFt: 0,
                sqft: 0,
                balanceLengthAfter: Number(item.carpetRoll.remainingLengthFt),
                balanceSqftAfter: Number(item.carpetRoll.remainingSqft),
                reference: transfer.transferNumber,
                note: 'Transfer cancelled — restored to source',
                createdById: user.id,
              },
            });

            await this.syncShopStockForCarpet(
              tx,
              user.tenantId,
              transfer.fromShopId,
              item.productId,
              item.variantId ?? item.carpetRoll.variantId ?? null,
            );

            continue;
          }

          // ─── STANDARD: Return stock to source ─────────────
          const variantId = item.variantId ?? null;
          const existing = await tx.shopStock.findFirst({
            where: {
              shopId: transfer.fromShopId,
              productId: item.productId,
              variantId,
            },
          });
          if (existing) {
            await tx.shopStock.update({
              where: { id: existing.id },
              data: { stock: { increment: item.quantity } },
            });
          } else {
            await tx.shopStock.create({
              data: {
                tenantId: user.tenantId,
                shopId: transfer.fromShopId,
                productId: item.productId,
                variantId,
                stock: item.quantity,
              },
            });
          }

          await tx.stockMovement.create({
            data: {
              tenantId: user.tenantId,
              productId: item.productId,
              type: 'TRANSFER_IN',
              quantity: item.quantity,
              balanceAfter: 0,
              reference: transfer.transferNumber,
              note: 'Transfer cancelled — returned to source',
            },
          });
        }
      }

      return updated;
    });
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL
  // ════════════════════════════════════════════════════════

  list(user: AuthenticatedUser) {
    return this.prisma.stockTransfer.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromShop: true,
        toShop: true,
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, unit: true } },
            carpetRoll: { select: { id: true, rollNumber: true, remainingSqft: true } },
          },
        },
      },
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        fromShop: true,
        toShop: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            product: true,
            carpetRoll: {
              include: {
                variant: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }
}
